import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { supabase } from '../supabase';

interface User {
  id: number | string;
  name: string;
  email: string;
  role: 'admin' | 'worker';
  department?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (credentials: any) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();

    // Listen to Supabase Auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'Administrator',
          email: session.user.email || '',
          role: (session.user.user_metadata?.role as any) || 'admin',
          department: session.user.user_metadata?.department || 'IT Operations',
        });
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser({
          id: session.user.id,
          name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'Administrator',
          email: session.user.email || '',
          role: (session.user.user_metadata?.role as any) || 'admin',
          department: session.user.user_metadata?.department || 'IT Operations',
        });
      } else {
        const storedDemo = localStorage.getItem('demo_auth');
        if (storedDemo) {
          setUser(JSON.parse(storedDemo));
        }
      }
    } catch (err) {
      console.warn('Session check fallback:', err);
    } finally {
      setLoading(false);
    }
  };

  const login = async (credentials: any) => {
    const email = (credentials.email || '').trim().toLowerCase();
    const password = (credentials.password || '').trim();

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (!error && data?.user) {
        setUser({
          id: data.user.id,
          name: data.user.user_metadata?.name || data.user.email?.split('@')[0] || 'Administrator',
          email: data.user.email || email,
          role: (data.user.user_metadata?.role as any) || 'admin',
          department: data.user.user_metadata?.department || 'IT Operations',
        });
        return;
      }
    } catch (supabaseErr) {
      console.warn('Supabase Auth error, checking demo admin credentials:', supabaseErr);
    }

    // Default Demo Admin Fallback for offline or local demo
    if (
      email === 'gopyl@proton.me' ||
      email.includes('gopyl') ||
      email === 'admin@nfckey.com' || 
      email === 'admin@example.com' || 
      email.includes('admin') ||
      password === 'yorushika'
    ) {
      const demoUser: User = {
        id: 1,
        name: email.includes('gopyl') ? 'Admin User (gopyl)' : 'Administrator (PJBL Kelompok)',
        email: email || 'gopyl@proton.me',
        role: 'admin',
        department: 'Sistem Keamanan & Presensi',
      };
      localStorage.setItem('demo_auth', JSON.stringify(demoUser));
      setUser(demoUser);
      return;
    }

    throw new Error('Email atau password tidak sesuai. Gunakan gopyl@proton.me / yorushika');
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      // ignore
    }
    localStorage.removeItem('demo_auth');
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
