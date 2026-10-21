import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { supabase } from '../supabase';

export interface User {
  id: number | string;
  name: string;
  email: string;
  role: 'admin' | 'worker';
  department?: string;
}

export interface RememberedUser {
  id: number | string;
  name: string;
  email: string;
  role: 'admin' | 'worker';
  department?: string;
  savedAt: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (credentials: any) => Promise<void>;
  forgetRememberedUser: () => void;
  rememberedUser: RememberedUser | null;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [rememberedUser, setRememberedUser] = useState<RememberedUser | null>(() => {
    try {
      const stored = localStorage.getItem('nfckey_remembered_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

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
      } else {
        setUser(null);
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
        setUser(null);
      }
    } catch (err) {
      console.warn('Session check:', err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (credentials: any) => {
    const email = (credentials.email || '').trim().toLowerCase();
    const password = (credentials.password || '').trim();

    if (!email || !password) {
      throw new Error('Email dan password wajib diisi.');
    }

    const saveRemembered = (u: User) => {
      try {
        const item: RememberedUser = {
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          department: u.department,
          savedAt: new Date().toISOString(),
        };
        localStorage.setItem('nfckey_remembered_user', JSON.stringify(item));
        setRememberedUser(item);
      } catch (e) {
        // ignore
      }
    };

    // 1. Check public.users table in Supabase first (Database source of truth)
    try {
      const { data: dbUsers, error: dbError } = await supabase
        .from('users')
        .select('*')
        .ilike('email', email)
        .limit(1);

      if (!dbError && dbUsers && dbUsers.length > 0) {
        const dbUser = dbUsers[0];
        // If password is set in public.users, enforce exact match
        if (dbUser.password) {
          if (dbUser.password !== password) {
            throw new Error('Email atau password salah. Silakan periksa kembali kredensial Anda.');
          }

          // Password matched! Try signing in to Supabase Auth to establish session
          try {
            await supabase.auth.signInWithPassword({ email, password });
          } catch {
            // background session failure is non-fatal
          }

          const authUser: User = {
            id: dbUser.id,
            name: dbUser.name || 'Admin User',
            email: dbUser.email,
            role: (dbUser.role as any) || 'admin',
            department: dbUser.department || 'IT Operations',
          };
          saveRemembered(authUser);
          setUser(authUser);
          return;
        }
      }
    } catch (err: any) {
      if (err.message && err.message.includes('Email atau password salah')) {
        throw err;
      }
      console.warn('Database user check error:', err);
    }

    // 2. Fallback: Authenticate against Supabase Auth directly
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (!error && data?.user) {
        const authUser: User = {
          id: data.user.id,
          name: data.user.user_metadata?.name || data.user.email?.split('@')[0] || 'Administrator',
          email: data.user.email || email,
          role: (data.user.user_metadata?.role as any) || 'admin',
          department: data.user.user_metadata?.department || 'IT Operations',
        };
        saveRemembered(authUser);
        setUser(authUser);
        return;
      }
    } catch (supabaseErr) {
      console.warn('Supabase Auth attempt:', supabaseErr);
    }

    // Strictly reject login if credentials do not match
    throw new Error('Email atau password salah. Silakan periksa kembali kredensial Anda.');
  };

  const forgetRememberedUser = () => {
    try {
      localStorage.removeItem('nfckey_remembered_user');
    } catch (e) {
      // ignore
    }
    setRememberedUser(null);
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
    <AuthContext.Provider value={{ user, loading, login, forgetRememberedUser, rememberedUser, logout }}>
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
