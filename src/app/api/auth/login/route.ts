import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getSupabase } from '@/lib/supabase';
import { signSession, SESSION_COOKIE } from '@/lib/jwt';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = loginSchema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }
    
    const { email, password } = result.data;
    const supabase = getSupabase();
    
    // Get user
    const { data: user } = await supabase
      .from('users')
      .select('id, email, password_hash, role, disabled')
      .eq('email', email)
      .single();

    if (!user || !user.password_hash) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    if (user.disabled) {
      return NextResponse.json({ error: 'This account has been disabled' }, { status: 403 });
    }

    await supabase.from('users').update({ last_login_at: new Date().toISOString() }).eq('id', user.id);

    const token = await signSession({ userId: user.id, email: user.email, role: user.role });

    const response = NextResponse.json({ success: true, message: 'Logged in successfully' });

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
    console.error('API /login error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
