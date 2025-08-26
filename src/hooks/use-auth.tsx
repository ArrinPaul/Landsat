
"use client";

import React, { createContext, useContext, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';
import { useRouter, usePathname } from 'next/navigation';
import type { User } from 'firebase/auth';
import { Loader2 } from 'lucide-react';

interface AuthContextType {
  user: User | null | undefined;
  loading: boolean;
  error?: Error;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const publicRoutes = ['/login', '/'];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, loading, error] = useAuthState(auth);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user && !publicRoutes.includes(pathname)) {
      router.push('/login');
    }
  }, [user, loading, router, pathname]);

  if (loading && !publicRoutes.includes(pathname)) {
    return (
        <div className="flex items-center justify-center h-screen">
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
        </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, loading, error }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
