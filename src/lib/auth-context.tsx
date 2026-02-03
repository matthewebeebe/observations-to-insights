'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
} from 'firebase/auth';
import { auth } from './firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isConfigured: boolean;
  signInWithGoogle: () => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const isConfigured = auth !== null;

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }

    // Timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      console.log('Auth timeout - forcing loading to false');
      setLoading(false);
    }, 3000);

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      clearTimeout(timeout);
      console.log('Auth state changed:', user?.email || 'no user');
      setUser(user);
      setLoading(false);
    });

    return () => {
      clearTimeout(timeout);
      unsubscribe();
    };
  }, []);

  const signInWithGoogle = () => {
    if (!auth) {
      console.error('Firebase auth is not configured');
      return;
    }
    const provider = new GoogleAuthProvider();

    signInWithPopup(auth, provider)
      .then((result) => {
        console.log('Sign in successful:', result.user.email);

        // Notify app owner of sign-in (fire-and-forget)
        fetch('/api/notify-signin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userName: result.user.displayName,
            userEmail: result.user.email,
          }),
        }).catch((err) => console.error('Sign-in notification failed:', err));
      })
      .catch((error) => {
        console.error('Sign in error:', error.code, error.message);
        if (error.code !== 'auth/popup-closed-by-user') {
          alert(`Sign in failed: ${error.code}`);
        }
      });
  };

  const signOut = async () => {
    if (!auth) {
      console.error('Firebase auth is not configured');
      return;
    }
    await firebaseSignOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, loading, isConfigured, signInWithGoogle, signOut }}>
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
