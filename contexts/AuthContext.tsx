'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, onAuthStateChanged, signInWithPopup, signOut as firebaseSignOut, getIdToken } from 'firebase/auth';
import { getAuthInstance, getGoogleProviderInstance } from '@/lib/firebase';
import { useRouter } from 'next/navigation';

interface UserData {
  role: 'student' | 'admin';
  displayName: string;
  email: string;
  photoURL: string | null;
  streak: number;
  badges: string[];
}

interface AuthContextType {
  user: User | null;
  userData: UserData | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  
  // Get Firebase instances - only on client
  const [auth, setAuth] = useState<any>(null);
  const [googleProvider, setGoogleProvider] = useState<any>(null);

  // Initialize Firebase instances on client mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        // Get actual instances by calling the functions
        const authInstance = getAuthInstance();
        const providerInstance = getGoogleProviderInstance();
        
        console.log('🔧 Setting Firebase instances:', {
          authValid: !!authInstance,
          providerValid: !!providerInstance,
          authApp: authInstance?.app?.name,
        });
        
        setAuth(authInstance);
        setGoogleProvider(providerInstance);
      } catch (error) {
        console.error('❌ Error initializing Firebase:', error);
      }
    }
  }, []);

  // Fetch user data from Firestore
  const fetchUserData = async (firebaseUser: User) => {
    try {
      const idToken = await getIdToken(firebaseUser);
      
      // Call our API to get/create user profile
      const response = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText };
        }
        console.error('❌ API Error Response:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
        });
        throw new Error(`Failed to fetch user data: ${errorData.error || response.statusText}`);
      }

      const result = await response.json();
      if (result.success && result.user) {
        setUserData({
          role: result.user.role,
          displayName: result.user.displayName,
          email: result.user.email,
          photoURL: result.user.photoURL,
          streak: result.user.currentStreak || 0,
          badges: result.user.badges || [],
        });
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      setUserData(null);
    }
  };

  // Sign in with Google
  const signInWithGoogle = async () => {
    if (!auth || !googleProvider) {
      console.error('❌ Firebase not initialized. Auth:', !!auth, 'Provider:', !!googleProvider);
      throw new Error('Firebase not initialized. Please wait...');
    }
    
    // Verify auth instance is valid
    try {
      const apiKey = auth?.config?.apiKey || 'MISSING';
      console.log('🔍 Attempting sign-in with:', {
        authType: auth?.constructor?.name,
        providerType: googleProvider?.constructor?.name,
        authApp: auth?.app?.name,
        authConfig: auth?.config ? {
          apiKey: apiKey.length > 20 ? `${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 5)}` : apiKey,
          apiKeyLength: apiKey.length,
          authDomain: auth.config.authDomain,
        } : 'No config',
      });
      
      // Verify API key matches Firebase Console
      if (apiKey !== 'AIzaSyAAsFBhMBvyqqKI76finzT6sNR2hyKbEwE') {
        console.warn('⚠️ API Key mismatch!');
        console.warn('Expected: AIzaSyAAsFBhMBvyqqKI76finzT6sNR2hyKbEwE');
        console.warn(`Got:      ${apiKey}`);
        console.warn('💡 Update .env.local and restart dev server');
      }
      
      const result = await signInWithPopup(auth, googleProvider);
      console.log('✅ Sign-in successful:', result.user.email);
      // User data will be fetched via onAuthStateChanged
      router.push('/student');
    } catch (error: any) {
      console.error('❌ Sign-in error:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      console.error('Full error:', JSON.stringify(error, null, 2));
      
      // Check if it's an API key error
      if (error.code === 'auth/api-key-not-valid') {
        console.error('💡 API Key Error - Check:');
        console.error('   1. Firebase Console → Project Settings → General');
        console.error('   2. Verify Web API Key matches .env.local');
        console.error('   3. Ensure Google Sign-In is enabled in Authentication');
      }
      
      throw error;
    }
  };

  // Sign out
  const signOut = async () => {
    if (!auth) {
      throw new Error('Firebase not initialized');
    }
    try {
      await firebaseSignOut(auth);
      setUserData(null);
      router.push('/login');
    } catch (error: any) {
      console.error('Sign-out error:', error);
      throw error;
    }
  };

  useEffect(() => {
    if (!auth) return; // Wait for auth to be initialized

    // Persist auth state to localStorage for faster loading
    const storedUser = localStorage.getItem('auth_user');
    if (storedUser && !user) {
      try {
        // This is just for initial state, Firebase will verify
        const parsed = JSON.parse(storedUser);
        // Don't set user from localStorage, wait for Firebase verification
      } catch (e) {
        // Ignore localStorage errors
      }
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (firebaseUser) {
        // Save to localStorage
        localStorage.setItem('auth_user', JSON.stringify({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
        }));
        
        // Fetch user data from Firestore
        await fetchUserData(firebaseUser);
      } else {
        // Clear localStorage
        localStorage.removeItem('auth_user');
        setUserData(null);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, [auth]);

  return (
    <AuthContext.Provider
      value={{
        user,
        userData,
        loading,
        signInWithGoogle,
        signOut,
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
