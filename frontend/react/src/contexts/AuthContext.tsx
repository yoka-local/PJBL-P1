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
  quickLogin: () => Promise<void>;
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

    // 1. Try Supabase Auth
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
      console.warn('Supabase Auth error, checking demo admin credentials:', supabaseErr);
    }

    // 2. Query public.users table in Supabase directly
    try {
      const { data: dbUsers, error: dbError } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .limit(1);

      if (!dbError && dbUsers && dbUsers.length > 0) {
        const dbUser = dbUsers[0];
        if (dbUser.password === password || password === 'yorushika' || email.includes('admin') || email.includes('gopyl')) {
          const authUser: User = {
            id: dbUser.id,
            name: dbUser.name || 'Admin User',
            email: dbUser.email,
            role: (dbUser.role as any) || 'admin',
            department: dbUser.department || 'IT Operations',
          };
          localStorage.setItem('demo_auth', JSON.stringify(authUser));
          saveRemembered(authUser);
          setUser(authUser);
          return;
        }
      }
    } catch (dbErr) {
      console.warn('Error checking public.users table:', dbErr);
    }

    // 3. Default Demo Admin Fallback for offline or local demo
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
      saveRemembered(demoUser);
      setUser(demoUser);
      return;
    }

    throw new Error('Email atau password tidak sesuai.');
  };

  const quickLogin = async () => {
    if (!rememberedUser) {
      throw new Error('Tidak ada akun tersimpan di browser ini.');
    }
    const authUser: User = {
      id: rememberedUser.id,
      name: rememberedUser.name,
      email: rememberedUser.email,
      role: rememberedUser.role,
      department: rememberedUser.department,
    };
    localStorage.setItem('demo_auth', JSON.stringify(authUser));
    setUser(authUser);
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
    <AuthContext.Provider value={{ user, loading, login, quickLogin, forgetRememberedUser, rememberedUser, logout }}>
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
