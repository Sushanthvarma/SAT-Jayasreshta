'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { getAuthInstance, getStorageInstance } from '@/lib/firebase';
import { getIdToken } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import toast from 'react-hot-toast';
import Header from '@/components/layout/Header';
import { StudentProfile } from '@/lib/types/profile';

export default function ProfilePage() {
  const { user, userData, loading: authLoading } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [profile, setProfile] = useState<StudentProfile>({
    displayName: '',
    email: '',
    photoURL: null,
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const auth = getAuthInstance();
      const idToken = await getIdToken(auth.currentUser!);
      
      const response = await fetch('/api/profile', {
        headers: {
          'Authorization': `Bearer ${idToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.profile) {
          setProfile(data.profile);
        } else {
          // Initialize with user data
          setProfile({
            displayName: userData?.displayName || user?.displayName || '',
            email: user?.email || '',
            photoURL: userData?.photoURL || user?.photoURL || null,
          });
        }
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      // Initialize with user data
      setProfile({
        displayName: userData?.displayName || user?.displayName || '',
        email: user?.email || '',
        photoURL: userData?.photoURL || user?.photoURL || null,
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    try {
      setUploadingPhoto(true);
      const auth = getAuthInstance();
      const storage = getStorageInstance();
      const storageRef = ref(storage, `profile-photos/${user!.uid}/${Date.now()}_${file.name}`);
      
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      
      setProfile(prev => ({ ...prev, photoURL: downloadURL }));
      toast.success('Photo uploaded successfully!');
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast.error('Failed to upload photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const useGooglePhoto = () => {
    if (user?.photoURL) {
      setProfile(prev => ({ ...prev, photoURL: user.photoURL }));
      toast.success('Using Google profile photo');
    }
  };

  const handleInputChange = (field: keyof StudentProfile, value: any) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };

  const handleArrayChange = (field: keyof StudentProfile, value: string, checked: boolean) => {
    setProfile(prev => {
      const currentArray = (prev[field] as string[]) || [];
      if (checked) {
        return { ...prev, [field]: [...currentArray, value] };
      } else {
        return { ...prev, [field]: currentArray.filter(item => item !== value) };
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      const auth = getAuthInstance();
      const idToken = await getIdToken(auth.currentUser!);
      
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profile),
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success('Profile updated successfully!');
        // Refresh user data
        window.location.reload();
      } else {
        toast.error(data.error || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <div className="text-center">
          <div className="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
          <p className="text-lg font-semibold text-gray-700">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // PRODUCTION-GRADE: Include all grades from 4th to 12th for consistency
  const grades = [
    '4th Grade', '5th Grade', '6th Grade', '7th Grade', '8th Grade',
    '9th Grade', '10th Grade', '11th Grade', '12th Grade', 'Graduated'
  ];
  const subjects = ['Math', 'Reading', 'Writing', 'Science', 'History', 'English', 'Literature'];
  const studyTimes = ['morning', 'afternoon', 'evening', 'night'] as const;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <Header />

      <div className="mx-auto max-w-4xl px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-semibold text-gray-900 mb-2">My Profile</h1>
          <p className="text-lg text-gray-600">Manage your personal information and preferences</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Photo Section */}
          <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Profile Photo</h2>
            <div className="flex items-center gap-6">
              <div className="relative">
                {profile.photoURL ? (
                  <img
                    src={profile.photoURL}
                    alt={profile.displayName}
                    className="w-24 h-24 rounded-full border-4 border-indigo-200 shadow-lg object-cover"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-3xl font-bold shadow-lg">
                    {profile.displayName?.charAt(0).toUpperCase() || 'S'}
                  </div>
                )}
                {uploadingPhoto && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  </div>
                )}
              </div>
              <div className="flex-1 space-y-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingPhoto}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 min-h-[44px]"
                  >
                    {uploadingPhoto ? 'Uploading...' : 'Upload Photo'}
                  </button>
                  {user.photoURL && (
                    <button
                      type="button"
                      onClick={useGooglePhoto}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-colors min-h-[44px]"
                    >
                      Use Google Photo
                    </button>
                  )}
                </div>
                <p className="text-sm text-gray-500">JPG, PNG or GIF. Max size 5MB</p>
              </div>
            </div>
          </div>

          {/* Basic Information */}
          <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Basic Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  First Name
                </label>
                <input
                  type="text"
                  value={profile.firstName || ''}
                  onChange={(e) => handleInputChange('firstName', e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-indigo-600 focus:ring-2 focus:ring-indigo-200 focus:outline-none transition-all"
                  placeholder="Enter your first name"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Last Name
                </label>
                <input
                  type="text"
                  value={profile.lastName || ''}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-indigo-600 focus:ring-2 focus:ring-indigo-200 focus:outline-none transition-all"
                  placeholder="Enter your last name"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Display Name
                </label>
                <input
                  type="text"
                  value={profile.displayName}
                  onChange={(e) => handleInputChange('displayName', e.target.value)}
                  required
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-indigo-600 focus:ring-2 focus:ring-indigo-200 focus:outline-none transition-all"
                  placeholder="How should we address you?"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={profile.email}
                  disabled
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl bg-gray-50 text-gray-500 cursor-not-allowed"
                />
                <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Date of Birth
                </label>
                <input
                  type="date"
                  value={profile.dateOfBirth || ''}
                  onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-indigo-600 focus:ring-2 focus:ring-indigo-200 focus:outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={profile.phoneNumber || ''}
                  onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-indigo-600 focus:ring-2 focus:ring-indigo-200 focus:outline-none transition-all"
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>
          </div>

          {/* Academic Information */}
          <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Academic Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  School Name
                </label>
                <input
                  type="text"
                  value={profile.school || ''}
                  onChange={(e) => handleInputChange('school', e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-indigo-600 focus:ring-2 focus:ring-indigo-200 focus:outline-none transition-all"
                  placeholder="Enter your school name"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Grade
                </label>
                <select
                  value={profile.grade || ''}
                  onChange={(e) => handleInputChange('grade', e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-indigo-600 focus:ring-2 focus:ring-indigo-200 focus:outline-none transition-all"
                >
                  <option value="">Select grade</option>
                  {grades.map(grade => (
                    <option key={grade} value={grade}>{grade}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Graduation Year
                </label>
                <input
                  type="number"
                  value={profile.graduationYear || ''}
                  onChange={(e) => handleInputChange('graduationYear', parseInt(e.target.value) || undefined)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-indigo-600 focus:ring-2 focus:ring-indigo-200 focus:outline-none transition-all"
                  placeholder="2025"
                  min="2020"
                  max="2030"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  GPA (Optional)
                </label>
                <input
                  type="text"
                  value={profile.gpa || ''}
                  onChange={(e) => handleInputChange('gpa', e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-indigo-600 focus:ring-2 focus:ring-indigo-200 focus:outline-none transition-all"
                  placeholder="4.0"
                />
              </div>
            </div>
          </div>

          {/* Location */}
          <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Location</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  City
                </label>
                <input
                  type="text"
                  value={profile.city || ''}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-indigo-600 focus:ring-2 focus:ring-indigo-200 focus:outline-none transition-all"
                  placeholder="Enter city"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  State
                </label>
                <input
                  type="text"
                  value={profile.state || ''}
                  onChange={(e) => handleInputChange('state', e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-indigo-600 focus:ring-2 focus:ring-indigo-200 focus:outline-none transition-all"
                  placeholder="Enter state"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Country
                </label>
                <input
                  type="text"
                  value={profile.country || ''}
                  onChange={(e) => handleInputChange('country', e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-indigo-600 focus:ring-2 focus:ring-indigo-200 focus:outline-none transition-all"
                  placeholder="Enter country"
                />
              </div>
            </div>
          </div>

          {/* SAT Preparation */}
          <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">SAT Preparation</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Target SAT Score
                </label>
                <input
                  type="number"
                  value={profile.targetSATScore || ''}
                  onChange={(e) => handleInputChange('targetSATScore', parseInt(e.target.value) || undefined)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-indigo-600 focus:ring-2 focus:ring-indigo-200 focus:outline-none transition-all"
                  placeholder="1600"
                  min="400"
                  max="1600"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Current SAT Score (if taken)
                </label>
                <input
                  type="number"
                  value={profile.currentSATScore || ''}
                  onChange={(e) => handleInputChange('currentSATScore', parseInt(e.target.value) || undefined)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-indigo-600 focus:ring-2 focus:ring-indigo-200 focus:outline-none transition-all"
                  placeholder="1200"
                  min="400"
                  max="1600"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Planned Test Date
                </label>
                <input
                  type="date"
                  value={profile.testDate || ''}
                  onChange={(e) => handleInputChange('testDate', e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-indigo-600 focus:ring-2 focus:ring-indigo-200 focus:outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Study Hours Per Week
                </label>
                <input
                  type="number"
                  value={profile.studyHoursPerWeek || ''}
                  onChange={(e) => handleInputChange('studyHoursPerWeek', parseInt(e.target.value) || undefined)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-indigo-600 focus:ring-2 focus:ring-indigo-200 focus:outline-none transition-all"
                  placeholder="10"
                  min="0"
                  max="40"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Preferred Study Time
                </label>
                <select
                  value={profile.preferredStudyTime || ''}
                  onChange={(e) => handleInputChange('preferredStudyTime', e.target.value as any)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-indigo-600 focus:ring-2 focus:ring-indigo-200 focus:outline-none transition-all"
                >
                  <option value="">Select time</option>
                  {studyTimes.map(time => (
                    <option key={time} value={time}>{time.charAt(0).toUpperCase() + time.slice(1)}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Interests & Subjects */}
          <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Interests & Subjects</h2>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Interested Subjects (Select all that apply)
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {subjects.map(subject => (
                    <label key={subject} className="flex items-center gap-2 p-3 border-2 border-gray-200 rounded-lg hover:bg-indigo-50 hover:border-indigo-300 cursor-pointer transition-all">
                      <input
                        type="checkbox"
                        checked={(profile.interestedSubjects || []).includes(subject)}
                        onChange={(e) => handleArrayChange('interestedSubjects', subject, e.target.checked)}
                        className="w-5 h-5 text-indigo-600 focus:ring-indigo-500 rounded"
                      />
                      <span className="text-sm font-medium text-gray-700">{subject}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Academic Goals
                </label>
                <textarea
                  value={profile.academicGoals || ''}
                  onChange={(e) => handleInputChange('academicGoals', e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-indigo-600 focus:ring-2 focus:ring-indigo-200 focus:outline-none transition-all"
                  placeholder="Tell us about your academic goals and aspirations..."
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex gap-4 justify-end">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors min-h-[44px]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
            >
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
