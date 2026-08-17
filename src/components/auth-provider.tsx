"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import type { UserRole } from '@/lib/auth';

export type UserPreferences = {
  primaryGoal?: 'Agriculture & Crop Yield' | 'Water Resource Monitoring' | 'Urban Planning & Development' | 'Wildfire & Disaster Recovery';
  favoriteRegion?: string;
  defaultIndex?: 'NDVI' | 'NDWI' | 'NDBI' | 'NBR';
  organizationType?: 'Government / NASA' | 'Agricultural Enterprise' | 'Academic / Research Institute' | 'Independent Consultant';
};

export type UserProfile = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatarUrl?: string;
  createdAt: string;
  preferences?: UserPreferences;
};

type AuthContextType = {
  user: UserProfile | null;
  loading: boolean;
  signIn: (email: string, role?: UserRole) => Promise<void>;
  signUp: (email: string, name: string, role?: UserRole) => Promise<void>;
  signOut: () => Promise<void>;
  switchRole: (newRole: UserRole) => void;
  updatePreferences: (newPrefs: UserPreferences) => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOCAL_STORAGE_USER_KEY = 'earth_insights_mock_user';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check saved session in local storage / cookies
    const stored = localStorage.getItem(LOCAL_STORAGE_USER_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setUser(parsed);
        setAuthCookies(parsed.id, parsed.role);
      } catch {
        console.error('Failed to parse saved user profile');
      }
    } else {
      // Default dev fallback user if unauthenticated
      const defaultUser: UserProfile = {
        id: 'usr_demo_admin',
        email: 'admin@earthinsights.nasa.gov',
        name: 'Lead Geospatial Admin',
        role: 'admin',
        createdAt: new Date().toISOString(),
        preferences: {
          primaryGoal: 'Agriculture & Crop Yield',
          favoriteRegion: 'Iowa Corn Belt (41.8781, -93.0977)',
          defaultIndex: 'NDVI',
          organizationType: 'Government / NASA',
        },
      };
      setUser(defaultUser);
      localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(defaultUser));
      setAuthCookies(defaultUser.id, defaultUser.role);
    }
    setLoading(false);
  }, []);

  const setAuthCookies = (id: string, role: string) => {
    document.cookie = `earth_insights_user_id=${id}; path=/; max-age=86400`;
    document.cookie = `earth_insights_user_role=${role}; path=/; max-age=86400`;
  };

  const clearAuthCookies = () => {
    document.cookie = `earth_insights_user_id=; path=/; max-age=0`;
    document.cookie = `earth_insights_user_role=; path=/; max-age=0`;
  };

  const signIn = async (email: string, role: UserRole = 'analyst') => {
    setLoading(true);
    const existing = localStorage.getItem(LOCAL_STORAGE_USER_KEY);
    let existingUser: Partial<UserProfile> = {};
    if (existing) {
      try {
        existingUser = JSON.parse(existing);
      } catch {
      }
    }

    const mockUser: UserProfile = {
      id: existingUser.id || `usr_${Math.random().toString(36).substring(2, 9)}`,
      email,
      name: existingUser.name || email.split('@')[0] || 'Explorer',
      role,
      createdAt: existingUser.createdAt || new Date().toISOString(),
      preferences: existingUser.preferences || {
        primaryGoal: 'Agriculture & Crop Yield',
        favoriteRegion: 'Central Valley, California',
        defaultIndex: 'NDVI',
        organizationType: 'Agricultural Enterprise',
      },
    };
    setUser(mockUser);
    localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(mockUser));
    setAuthCookies(mockUser.id, mockUser.role);
    setLoading(false);
  };

  const signUp = async (email: string, name: string, role: UserRole = 'viewer') => {
    setLoading(true);
    const mockUser: UserProfile = {
      id: `usr_${Math.random().toString(36).substring(2, 9)}`,
      email,
      name,
      role,
      createdAt: new Date().toISOString(),
      preferences: {
        primaryGoal: 'Agriculture & Crop Yield',
        defaultIndex: 'NDVI',
      },
    };
    setUser(mockUser);
    localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(mockUser));
    setAuthCookies(mockUser.id, mockUser.role);
    setLoading(false);
  };

  const signOut = async () => {
    setLoading(true);
    setUser(null);
    localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
    clearAuthCookies();
    setLoading(false);
  };

  const switchRole = (newRole: UserRole) => {
    if (!user) return;
    const updated = { ...user, role: newRole };
    setUser(updated);
    localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(updated));
    setAuthCookies(updated.id, updated.role);
  };

  const updatePreferences = (newPrefs: UserPreferences) => {
    if (!user) return;
    const updated = { ...user, preferences: { ...user.preferences, ...newPrefs } };
    setUser(updated);
    localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(updated));
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut, switchRole, updatePreferences }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
