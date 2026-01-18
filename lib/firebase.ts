import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

// Lazy initialization - only when actually needed on client
let app: FirebaseApp | null = null;
let _auth: Auth | null = null;
let _db: Firestore | null = null;
let _storage: FirebaseStorage | null = null;
let _googleProvider: GoogleAuthProvider | null = null;

function getApp(): FirebaseApp {
  // Only initialize on client-side
  if (typeof window === 'undefined') {
    throw new Error('Firebase can only be initialized on the client side');
  }
  
  if (!app) {
    // Get environment variables - these are injected at build time for client bundle
    // In Next.js, NEXT_PUBLIC_* vars are replaced at build time
    const firebaseConfig = {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
      measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || '',
    };

    // Debug: Log ALL env vars to see what's available
    if (typeof window !== 'undefined') {
      console.log('🔍 Environment Check (client-side):');
      console.log('NEXT_PUBLIC_FIREBASE_API_KEY exists:', !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY);
      console.log('NEXT_PUBLIC_FIREBASE_API_KEY length:', process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.length || 0);
      console.log('NEXT_PUBLIC_FIREBASE_API_KEY value:', process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? `${process.env.NEXT_PUBLIC_FIREBASE_API_KEY.substring(0, 20)}...` : 'MISSING');
      console.log('All NEXT_PUBLIC_ vars:', Object.keys(process.env).filter(k => k.startsWith('NEXT_PUBLIC_')).join(', '));
    }

    // Validate that all required fields are present
    const requiredFields: (keyof typeof firebaseConfig)[] = [
      'apiKey',
      'authDomain',
      'projectId',
      'storageBucket',
      'messagingSenderId',
      'appId',
    ];

    const missingFields = requiredFields.filter(
      (field) => !firebaseConfig[field]
    );

    if (missingFields.length > 0) {
      console.error('❌ Missing Firebase configuration:', missingFields);
      console.error('💡 Make sure your .env.local file has all NEXT_PUBLIC_FIREBASE_* variables');
      console.error('💡 Restart your dev server:    npm installnpm run dev');
      console.error('💡 Current config:', firebaseConfig);
      throw new Error(
        `Missing required Firebase configuration: ${missingFields.join(', ')}. Please check your .env.local file and restart the dev server.`
      );
    }

    // Debug: Log config (without sensitive data)
    console.log('🔧 Firebase Config:', {
      apiKey: firebaseConfig.apiKey ? `${firebaseConfig.apiKey.substring(0, 10)}...` : 'MISSING',
      apiKeyLength: firebaseConfig.apiKey.length,
      authDomain: firebaseConfig.authDomain,
      projectId: firebaseConfig.projectId,
      hasAppId: !!firebaseConfig.appId,
    });

    // Validate API key format (should start with "AIza")
    if (!firebaseConfig.apiKey.startsWith('AIza')) {
      console.error('❌ Invalid API key format. Should start with "AIza"');
      console.error('💡 Current API key starts with:', firebaseConfig.apiKey.substring(0, 10));
      throw new Error('Invalid Firebase API key format');
    }

    // Initialize Firebase
    if (getApps().length === 0) {
      try {
        app = initializeApp(firebaseConfig);
        console.log('✅ Firebase initialized successfully');
      } catch (error: any) {
        console.error('❌ Firebase initialization error:', error);
        console.error('💡 Config used:', {
          apiKey: firebaseConfig.apiKey.substring(0, 10) + '...',
          authDomain: firebaseConfig.authDomain,
          projectId: firebaseConfig.projectId,
        });
        throw error;
      }
    } else {
      app = getApps()[0];
      console.log('✅ Using existing Firebase app');
    }
  }
  return app;
}

// Getter functions - only initialize when called on client
export function getAuthInstance(): Auth {
  if (typeof window === 'undefined') {
    throw new Error('Firebase Auth can only be used on the client side');
  }
  if (!_auth) {
    const appInstance = getApp();
    _auth = getAuth(appInstance);
    console.log('✅ Auth instance created:', {
      appName: appInstance.name,
      authConfig: _auth.config ? {
        apiKey: _auth.config.apiKey?.substring(0, 10) + '...',
        authDomain: _auth.config.authDomain,
      } : 'No config available',
    });
  }
  return _auth;
}

export function getDbInstance(): Firestore {
  if (typeof window === 'undefined') {
    throw new Error('Firestore can only be used on the client side');
  }
  if (!_db) {
    _db = getFirestore(getApp());
  }
  return _db;
}

export function getStorageInstance(): FirebaseStorage {
  if (typeof window === 'undefined') {
    throw new Error('Firebase Storage can only be used on the client side');
  }
  if (!_storage) {
    const appInstance = getApp();
    _storage = getStorage(appInstance);
  }
  return _storage;
}

export function getGoogleProviderInstance(): GoogleAuthProvider {
  if (typeof window === 'undefined') {
    throw new Error('Google Auth Provider can only be used on the client side');
  }
  if (!_googleProvider) {
    // GoogleAuthProvider doesn't need the app instance - it's global
    _googleProvider = new GoogleAuthProvider();
    _googleProvider.setCustomParameters({
      prompt: 'select_account',
    });
    console.log('✅ Google Auth Provider initialized');
  }
  return _googleProvider;
}

// Note: Direct exports removed to prevent server-side initialization
// Use getAuthInstance(), getDbInstance(), getStorageInstance(), getGoogleProviderInstance() instead
