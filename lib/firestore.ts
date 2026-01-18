import { adminDb } from './firebase-admin';
import { getDbInstance } from './firebase';
import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  serverTimestamp,
  Timestamp 
} from 'firebase/firestore';

export type UserRole = 'student' | 'admin';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: Timestamp | Date;
  lastLogin: Timestamp | Date;
  streak: number;
  badges: string[];
  totalTestsCompleted: number;
  avatar?: string;
}

// Create or update user profile in Firestore (client-side)
export async function createUserProfile(
  userId: string,
  email: string,
  name: string,
  role: UserRole = 'student'
): Promise<UserProfile> {
  const db = getDbInstance();
  const userRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    // Update last login
    await updateDoc(userRef, {
      lastLogin: serverTimestamp(),
      name: name, // Update name in case it changed
    });
    
    const data = userSnap.data();
    return {
      id: userId,
      email: data.email,
      name: data.name,
      role: data.role || 'student',
      createdAt: data.createdAt?.toDate() || new Date(),
      lastLogin: new Date(),
      streak: data.streak || 0,
      badges: data.badges || [],
      totalTestsCompleted: data.totalTestsCompleted || 0,
      avatar: data.avatar,
    };
  } else {
    // Create new user profile
    const newUser: Omit<UserProfile, 'id'> = {
      email,
      name,
      role,
      createdAt: new Date(),
      lastLogin: new Date(),
      streak: 0,
      badges: [],
      totalTestsCompleted: 0,
    };

    await setDoc(userRef, {
      ...newUser,
      createdAt: serverTimestamp(),
      lastLogin: serverTimestamp(),
    });

    return {
      id: userId,
      ...newUser,
    };
  }
}

// Get user profile (client-side)
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const db = getDbInstance();
  const userRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    return null;
  }

  const data = userSnap.data();
  return {
    id: userId,
    email: data.email,
    name: data.name,
    role: data.role || 'student',
    createdAt: data.createdAt?.toDate() || new Date(),
    lastLogin: data.lastLogin?.toDate() || new Date(),
    streak: data.streak || 0,
    badges: data.badges || [],
    totalTestsCompleted: data.totalTestsCompleted || 0,
    avatar: data.avatar,
  };
}

// Update user profile (client-side)
export async function updateUserProfile(
  userId: string,
  updates: Partial<Omit<UserProfile, 'id' | 'email' | 'createdAt'>>
): Promise<void> {
  const db = getDbInstance();
  const userRef = doc(db, 'users', userId);
  
  const updateData: any = {};
  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.role !== undefined) updateData.role = updates.role;
  if (updates.streak !== undefined) updateData.streak = updates.streak;
  if (updates.badges !== undefined) updateData.badges = updates.badges;
  if (updates.totalTestsCompleted !== undefined) updateData.totalTestsCompleted = updates.totalTestsCompleted;
  if (updates.avatar !== undefined) updateData.avatar = updates.avatar;

  await updateDoc(userRef, updateData);
}

// Get user profile (server-side, using Admin SDK)
export async function getUserProfileAdmin(userId: string): Promise<UserProfile | null> {
  const userRef = adminDb.collection('users').doc(userId);
  const userSnap = await userRef.get();

  if (!userSnap.exists) {
    return null;
  }

  const data = userSnap.data()!;
  return {
    id: userId,
    email: data.email,
    name: data.name,
    role: data.role || 'student',
    createdAt: (data.createdAt as any)?.toDate() || new Date(),
    lastLogin: (data.lastLogin as any)?.toDate() || new Date(),
    streak: data.streak || 0,
    badges: data.badges || [],
    totalTestsCompleted: data.totalTestsCompleted || 0,
    avatar: data.avatar,
  };
}
