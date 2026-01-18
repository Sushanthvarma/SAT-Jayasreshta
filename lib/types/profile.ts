export interface StudentProfile {
  // Basic Info
  displayName: string;
  email: string;
  photoURL: string | null;
  
  // Personal Details
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string; // YYYY-MM-DD format
  phoneNumber?: string;
  
  // Academic Information
  school?: string;
  grade?: string; // e.g., "9th Grade", "10th Grade", "11th Grade", "12th Grade"
  graduationYear?: number;
  gpa?: string;
  
  // Location
  city?: string;
  state?: string;
  country?: string;
  timezone?: string;
  
  // SAT Preparation
  targetSATScore?: number;
  currentSATScore?: number;
  testDate?: string; // Planned SAT test date
  studyHoursPerWeek?: number;
  preferredStudyTime?: 'morning' | 'afternoon' | 'evening' | 'night';
  
  // Interests & Subjects
  interestedSubjects?: string[]; // e.g., ["Math", "Reading", "Writing"]
  favoriteSubjects?: string[];
  strengths?: string[];
  areasToImprove?: string[];
  
  // Goals
  targetColleges?: string[];
  careerInterests?: string[];
  academicGoals?: string;
  
  // Preferences
  notificationPreferences?: {
    email?: boolean;
    testReminders?: boolean;
    progressUpdates?: boolean;
    badgeNotifications?: boolean;
  };
  
  // Metadata
  createdAt?: Date | string;
  updatedAt?: Date | string;
  lastProfileUpdate?: Date | string;
}
