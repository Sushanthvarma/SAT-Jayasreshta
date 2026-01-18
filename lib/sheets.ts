import { google } from 'googleapis';

// Initialize Google Sheets API client
function getSheetsClient() {
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  
  if (!privateKey || !process.env.FIREBASE_CLIENT_EMAIL) {
    throw new Error('Missing Google Sheets credentials in .env.local');
  }

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      private_key: privateKey,
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  return google.sheets({ version: 'v4', auth });
}

// Write student progress to Google Sheets
export async function writeProgressToSheet(data: {
  studentId: string;
  studentName: string;
  studentEmail: string;
  testId: string;
  score: number;
  totalQuestions: number;
  completedAt: string;
  timeSpent: number;
}) {
  const sheets = getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  if (!spreadsheetId) {
    throw new Error('GOOGLE_SHEET_ID not configured in .env.local');
  }

  const values = [[
    data.studentId,
    data.studentName,
    data.studentEmail,
    data.testId,
    data.score,
    data.totalQuestions,
    `${((data.score / data.totalQuestions) * 100).toFixed(1)}%`,
    data.completedAt,
    `${Math.round(data.timeSpent / 60)} min`,
  ]];

  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Progress!A:I', // Writes to "Progress" sheet
      valueInputOption: 'USER_ENTERED',
      requestBody: { values },
    });
    
    return { success: true };
  } catch (error) {
    console.error('Error writing to Google Sheets:', error);
    throw error;
  }
}

// Read all progress data (for admin dashboard)
export async function readProgressFromSheet() {
  const sheets = getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  if (!spreadsheetId) {
    throw new Error('GOOGLE_SHEET_ID not configured in .env.local');
  }

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Progress!A2:I', // Skips header row
    });

    return response.data.values || [];
  } catch (error) {
    console.error('Error reading from Google Sheets:', error);
    throw error;
  }
}

// Initialize sheet with headers (run once)
export async function initializeSheet() {
  const sheets = getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  if (!spreadsheetId) {
    throw new Error('GOOGLE_SHEET_ID not configured in .env.local');
  }

  const headers = [[
    'Student ID',
    'Student Name',
    'Email',
    'Test ID',
    'Score',
    'Total Questions',
    'Percentage',
    'Completed At',
    'Time Spent',
  ]];

  try {
    // Check if "Progress" sheet exists
    const sheetMetadata = await sheets.spreadsheets.get({ spreadsheetId });
    const progressSheet = sheetMetadata.data.sheets?.find(
      (sheet) => sheet.properties?.title === 'Progress'
    );

    if (!progressSheet) {
      // Create "Progress" sheet
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [{
            addSheet: {
              properties: { title: 'Progress' }
            }
          }]
        }
      });
    }

    // Write headers
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Progress!A1:I1',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: headers },
    });

    return { success: true, message: 'Sheet initialized with headers' };
  } catch (error) {
    console.error('Error initializing sheet:', error);
    throw error;
  }
}

// Update user login timestamp in Users sheet (for analytics/tracking)
export async function updateUserLogin(email: string, name: string): Promise<void> {
  const sheets = getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  if (!spreadsheetId) {
    throw new Error('GOOGLE_SHEET_ID not configured in .env.local');
  }

  try {
    // Check if "Users" sheet exists
    const sheetMetadata = await sheets.spreadsheets.get({ spreadsheetId });
    let usersSheet = sheetMetadata.data.sheets?.find(
      (sheet) => sheet.properties?.title === 'Users'
    );

    if (!usersSheet) {
      // Create "Users" sheet with headers
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [{
            addSheet: {
              properties: { title: 'Users' }
            }
          }]
        }
      });

      // Write headers
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'Users!A1:C1',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [['Email', 'Name', 'Last Login']]
        },
      });
    }

    // Check if user already exists
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Users!A2:C',
    });

    const rows = response.data.values || [];
    const emailLower = email.toLowerCase().trim();
    const rowIndex = rows.findIndex((row) => row[0]?.toLowerCase().trim() === emailLower);

    const now = new Date().toISOString();

    if (rowIndex >= 0) {
      // Update existing user (update name and last login)
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `Users!B${rowIndex + 2}:C${rowIndex + 2}`, // +2 because we skip header and 0-indexed
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [[name, now]]
        },
      });
    } else {
      // Add new user
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: 'Users!A:C',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [[email, name, now]]
        },
      });
    }
  } catch (error) {
    console.error('Error updating user login:', error);
    // Don't throw - login tracking is not critical
  }
}