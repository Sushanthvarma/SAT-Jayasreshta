import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin SDK (server-side only)
function initAdmin(): App {
  if (getApps().length === 0) {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    
    if (!privateKey || !process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL) {
      throw new Error('Missing Firebase Admin credentials in .env.local');
    }

    return initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: privateKey,
      }),
    });
  }
  
  return getApps()[0];
}

let app: App;
let adminAuth: Auth;
let adminDb: Firestore;

try {
  app = initAdmin();
  adminAuth = getAuth(app);
  adminDb = getFirestore(app);
  console.log('✅ Firebase Admin SDK initialized successfully');
} catch (error: any) {
  console.error('❌ Firebase Admin SDK initialization failed:', error.message);
  console.error('💡 Check your .env.local file for:');
  console.error('   - FIREBASE_PRIVATE_KEY');
  console.error('   - FIREBASE_PROJECT_ID');
  console.error('   - FIREBASE_CLIENT_EMAIL');
  throw error;
}

export { adminAuth, adminDb };