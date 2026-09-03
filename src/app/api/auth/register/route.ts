import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getSupabase } from '@/lib/supabase';
import { signSession, SESSION_COOKIE } from '@/lib/jwt';
import { z } from 'zod';

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = registerSchema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json({ error: 'Invalid input', details: result.error }, { status: 400 });
    }
    
    const { name, email, password } = result.data;
    const supabase = getSupabase();
    
    // Check if user exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();
      
    if (existingUser) {
      return NextResponse.json({ error: 'User already exists' }, { status: 409 });
    }
    
    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);
    const userId = crypto.randomUUID();
    
    // Insert user
    const { error } = await supabase
      .from('users')
      .insert({
        id: userId,
        name,
        email,
        password_hash: passwordHash,
        role: 'viewer',
        onboarding_completed: false,
        created_at: new Date().toISOString()
      });

    if (error) {
      console.error('Registration error:', error);
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
    }

    const token = await signSession({ userId, email, role: 'viewer' });

    const response = NextResponse.json({ success: true, message: 'Registered successfully' });

    response.cookies.set({
      name: SESSION_COOKIE,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    });

    return response;
    
  } catch (err) {
    console.error('API /register error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
