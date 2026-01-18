'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, onAuthStateChanged, getIdToken } from 'firebase/auth';
import { getAuthInstance } from './firebase';
import { UserProfile, getUserProfile, createUserProfile } from './firestore';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  error: string | null;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshProfile = async () => {
    if (!user) {
      setUserProfile(null);
      return;
    }

    try {
      setError(null);
      let profile = await getUserProfile(user.uid);

      // If profile doesn't exist, create it
      if (!profile && user.email && user.displayName) {
        profile = await createUserProfile(
          user.uid,
          user.email,
          user.displayName,
          'student'
        );
      }

      setUserProfile(profile);
    } catch (err: any) {
      console.error('Error fetching user profile:', err);
      setError(err.message);
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    try {
      const auth = getAuthInstance();
      const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        setUser(firebaseUser);
        
        if (firebaseUser) {
          await refreshProfile();
        } else {
          setUserProfile(null);
        }
        
        setLoading(false);
      });

      return () => unsubscribe();
    } catch (error) {
      console.error('Error initializing auth:', error);
      setLoading(false);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        loading,
        error,
        refreshProfile,
      }}
    >
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
