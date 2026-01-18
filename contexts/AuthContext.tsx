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
  refreshProfile: () => Promise<void>;
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
        let errorText = '';
        let errorData: any = {};
        
        try {
          errorText = await response.text();
          if (errorText) {
            try {
              errorData = JSON.parse(errorText);
            } catch {
              errorData = { error: errorText || `HTTP ${response.status}: ${response.statusText}` };
            }
          } else {
            errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
          }
        } catch (parseError) {
          errorData = { error: `Failed to parse error response: ${response.status} ${response.statusText}` };
        }
        
        // Check if it's a Firestore API not enabled error
        const errorMessage = errorData.error || errorText || '';
        const isFirestoreError = errorMessage.includes('PERMISSION_DENIED') || 
                                 errorMessage.includes('Cloud Firestore API has not been used') ||
                                 errorMessage.includes('Firestore API');
        
        if (isFirestoreError) {
          console.warn('⚠️ Firestore API not enabled. Using Firebase Auth data only.');
          console.warn('💡 Enable Firestore API: https://console.developers.google.com/apis/api/firestore.googleapis.com/overview?project=sat-mock-test-platform');
          
          // Fallback to Firebase Auth data
          const displayName = firebaseUser.displayName || 
                            (firebaseUser.email ? firebaseUser.email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Student');
          setUserData({
            role: 'student',
            displayName: displayName,
            email: firebaseUser.email || '',
            photoURL: firebaseUser.photoURL || null,
            streak: 0,
            badges: [],
          });
          return; // Don't throw error, just use fallback
        }
        
        // Log error for debugging
        console.error('❌ API Error Response:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
          errorText: errorText || 'No error text',
        });
        
        // For other errors, still use fallback but log the error
        const displayName = firebaseUser.displayName || 
                          (firebaseUser.email ? firebaseUser.email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Student');
        setUserData({
          role: 'student',
          displayName: displayName,
          email: firebaseUser.email || '',
          photoURL: firebaseUser.photoURL || null,
          streak: 0,
          badges: [],
        });
        return; // Don't throw error, use fallback
      }

      const result = await response.json();
      if (result.success && result.user) {
        // Use name from API, or fallback to Firebase user's displayName, or email username
        const displayName = result.user.displayName || 
                            firebaseUser.displayName || 
                            (firebaseUser.email ? firebaseUser.email.split('@')[0] : 'Student');
        const photoURL = result.user.photoURL || firebaseUser.photoURL || null;
        
        setUserData({
          role: result.user.role,
          displayName: displayName,
          email: result.user.email || firebaseUser.email || '',
          photoURL: photoURL,
          streak: result.user.currentStreak || 0,
          badges: result.user.badges || [],
        });
      } else if (firebaseUser) {
        // Fallback: use Firebase user data if API fails
        const displayName = firebaseUser.displayName || 
                            (firebaseUser.email ? firebaseUser.email.split('@')[0] : 'Student');
        setUserData({
          role: 'student',
          displayName: displayName,
          email: firebaseUser.email || '',
          photoURL: firebaseUser.photoURL || null,
          streak: 0,
          badges: [],
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

  // Refresh user profile (force refresh from Firestore)
  const refreshProfile = async () => {
    if (user) {
      console.log('🔄 Refreshing user profile...');
      // Force refresh by getting a new token and fetching fresh data
      try {
        const newToken = await getIdToken(user, true); // Force refresh token
        const response = await fetch('/api/auth/google', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken: newToken }),
        });
        
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.user) {
            setUserData({
              role: result.user.role,
              displayName: result.user.displayName || user.displayName || user.email?.split('@')[0] || 'Student',
              email: result.user.email || user.email || '',
              photoURL: result.user.photoURL || user.photoURL || null,
              streak: result.user.currentStreak || 0,
              badges: result.user.badges || [],
              xp: result.user.xp || 0,
              level: result.user.level || 1,
              totalTestsCompleted: result.user.totalTestsCompleted || 0,
            });
            console.log('✅ Profile refreshed. New role:', result.user.role);
            return; // Success
          }
        }
        // Fallback to regular fetch if refresh fails
        console.warn('⚠️ Refresh failed, using regular fetch');
        await fetchUserData(user);
      } catch (error) {
        console.error('Error refreshing profile:', error);
        // Fallback to regular fetch
        await fetchUserData(user);
      }
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
