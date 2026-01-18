import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { StudentProfile } from '@/lib/types/profile';

// GET - Fetch user profile
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    const userId = decodedToken.uid;

    const userRef = adminDb.collection('users').doc(userId);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      return NextResponse.json({
        success: false,
        error: 'User not found',
      }, { status: 404 });
    }

    const userData = userSnap.data()!;
    
    // Extract profile data
    const profile: StudentProfile = {
      displayName: userData.displayName || decodedToken.name || 'Student',
      email: userData.email || decodedToken.email || '',
      photoURL: userData.photoURL || decodedToken.picture || null,
      firstName: userData.firstName,
      lastName: userData.lastName,
      dateOfBirth: userData.dateOfBirth,
      phoneNumber: userData.phoneNumber,
      school: userData.school,
      grade: userData.grade,
      graduationYear: userData.graduationYear,
      gpa: userData.gpa,
      city: userData.city,
      state: userData.state,
      country: userData.country,
      timezone: userData.timezone,
      targetSATScore: userData.targetSATScore,
      currentSATScore: userData.currentSATScore,
      testDate: userData.testDate,
      studyHoursPerWeek: userData.studyHoursPerWeek,
      preferredStudyTime: userData.preferredStudyTime,
      interestedSubjects: userData.interestedSubjects || [],
      favoriteSubjects: userData.favoriteSubjects || [],
      strengths: userData.strengths || [],
      areasToImprove: userData.areasToImprove || [],
      targetColleges: userData.targetColleges || [],
      careerInterests: userData.careerInterests || [],
      academicGoals: userData.academicGoals,
      notificationPreferences: userData.notificationPreferences || {},
      emailPreferences: userData.emailPreferences || {
        weeklyReport: true,
        encouragementEmails: true,
        achievementEmails: true,
        reminderEmails: true,
        newsletter: true,
        parentMonthlyReport: true,
      },
    };

    return NextResponse.json({
      success: true,
      profile,
    });
  } catch (error: any) {
    console.error('Error fetching profile:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}

// PUT - Update user profile
export async function PUT(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    const userId = decodedToken.uid;

    const profileData: StudentProfile = await req.json();

    const userRef = adminDb.collection('users').doc(userId);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      return NextResponse.json({
        success: false,
        error: 'User not found',
      }, { status: 404 });
    }

    // Prepare update data
    const updateData: any = {
      updatedAt: FieldValue.serverTimestamp(),
      lastProfileUpdate: FieldValue.serverTimestamp(),
    };

    // Add optional fields if provided
    if (profileData.displayName !== undefined) updateData.displayName = profileData.displayName;
    if (profileData.photoURL !== undefined) updateData.photoURL = profileData.photoURL;
    if (profileData.firstName !== undefined) updateData.firstName = profileData.firstName;
    if (profileData.lastName !== undefined) updateData.lastName = profileData.lastName;
    if (profileData.dateOfBirth !== undefined) updateData.dateOfBirth = profileData.dateOfBirth;
    if (profileData.phoneNumber !== undefined) updateData.phoneNumber = profileData.phoneNumber;
    if (profileData.school !== undefined) updateData.school = profileData.school;
    if (profileData.grade !== undefined) updateData.grade = profileData.grade;
    if (profileData.graduationYear !== undefined) updateData.graduationYear = profileData.graduationYear;
    if (profileData.gpa !== undefined) updateData.gpa = profileData.gpa;
    if (profileData.city !== undefined) updateData.city = profileData.city;
    if (profileData.state !== undefined) updateData.state = profileData.state;
    if (profileData.country !== undefined) updateData.country = profileData.country;
    if (profileData.timezone !== undefined) updateData.timezone = profileData.timezone;
    if (profileData.targetSATScore !== undefined) updateData.targetSATScore = profileData.targetSATScore;
    if (profileData.currentSATScore !== undefined) updateData.currentSATScore = profileData.currentSATScore;
    if (profileData.testDate !== undefined) updateData.testDate = profileData.testDate;
    if (profileData.studyHoursPerWeek !== undefined) updateData.studyHoursPerWeek = profileData.studyHoursPerWeek;
    if (profileData.preferredStudyTime !== undefined) updateData.preferredStudyTime = profileData.preferredStudyTime;
    if (profileData.interestedSubjects !== undefined) updateData.interestedSubjects = profileData.interestedSubjects;
    if (profileData.favoriteSubjects !== undefined) updateData.favoriteSubjects = profileData.favoriteSubjects;
    if (profileData.strengths !== undefined) updateData.strengths = profileData.strengths;
    if (profileData.areasToImprove !== undefined) updateData.areasToImprove = profileData.areasToImprove;
    if (profileData.targetColleges !== undefined) updateData.targetColleges = profileData.targetColleges;
    if (profileData.careerInterests !== undefined) updateData.careerInterests = profileData.careerInterests;
    if (profileData.academicGoals !== undefined) updateData.academicGoals = profileData.academicGoals;
    if (profileData.notificationPreferences !== undefined) updateData.notificationPreferences = profileData.notificationPreferences;
    if (profileData.emailPreferences !== undefined) updateData.emailPreferences = profileData.emailPreferences;

    await userRef.update(updateData);

    // Also update displayName in Firebase Auth if changed
    if (profileData.displayName && profileData.displayName !== decodedToken.name) {
      try {
        await adminAuth.updateUser(userId, {
          displayName: profileData.displayName,
        });
      } catch (error) {
        console.error('Error updating Firebase Auth displayName:', error);
        // Continue even if this fails
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
    });
  } catch (error: any) {
    console.error('Error updating profile:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update profile' },
      { status: 500 }
    );
  }
}
