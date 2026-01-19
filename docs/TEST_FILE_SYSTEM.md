# Test File System - Complete Guide

## 🎯 Overview

A plug-and-play file-based test system that automatically scans and imports tests organized by **Standard → Week → Subject**.

## 📁 Folder Structure

```
tests/
├── {standard}/           # Grade level: 4th, 5th, 6th, 7th, 8th, 9th, 10th, 11th, 12th
│   ├── {week}/          # Week: week-1, week-2, week-3, etc.
│   │   ├── {subject}/  # Subject: reading, writing, math, etc.
│   │   │   └── test.json
│   │   └── ...
│   └── ...
└── ...
```

### Example Structure:
```
tests/
├── 9th/
│   ├── week-1/
│   │   ├── reading/
│   │   │   └── test.json
│   │   ├── writing/
│   │   │   └── test.json
│   │   └── math/
│   │       └── test.json
│   └── week-2/
│       └── ...
├── 10th/
│   └── ...
└── 11th/
    └── ...
```

## 📄 Test File Format

Each `test.json` file must follow this structure:

```json
{
  "metadata": {
    "title": "Week 1 - Reading Comprehension (9th Grade)",
    "description": "Reading comprehension practice test",
    "standard": "9th",
    "week": "week-1",
    "subject": "reading",
    "difficulty": "intermediate",
    "version": "1.0.0",
    "tags": ["reading", "comprehension"]
  },
  "sections": [
    {
      "id": "section-1",
      "sectionNumber": 1,
      "name": "Reading Comprehension",
      "subject": "reading",
      "description": "Read passages and answer questions",
      "timeLimit": 1800,
      "order": 1,
      "questions": [
        {
          "id": "q1",
          "questionNumber": 1,
          "type": "multiple-choice",
          "subject": "reading",
          "difficulty": "medium",
          "questionText": "What is the main idea?",
          "passageText": "Passage text here...",
          "options": [
            { "id": "A", "text": "Option A", "isCorrect": false },
            { "id": "B", "text": "Option B", "isCorrect": true },
            { "id": "C", "text": "Option C", "isCorrect": false },
            { "id": "D", "text": "Option D", "isCorrect": false }
          ],
          "correctAnswer": "B",
          "explanation": "Explanation here...",
          "topicTags": ["main-idea"],
          "skillTags": ["analysis"],
          "points": 1,
          "estimatedTime": 90
        }
      ]
    }
  ]
}
```

## 🚀 How to Use

### Step 1: Create Test Files

1. Navigate to `tests/` directory
2. Create folder structure: `{standard}/{week}/{subject}/`
3. Create `test.json` file with test data

### Step 2: Import Tests

**Option A: Via Admin Dashboard (Recommended)**
1. Go to Admin Dashboard
2. Click "📁 Import Tests"
3. View scanned test files
4. Select files to import
5. Configure import options
6. Click "Import Selected"

**Option B: Via API**
```bash
POST /api/admin/tests/import
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "filePaths": ["9th/week-1/reading/test.json"], // Optional: specific files
  "publish": true,
  "activate": true,
  "overwrite": false,
  "skipInvalid": true
}
```

### Step 3: Verify Import

- Tests appear in Admin Dashboard
- Students can see published/active tests
- Tests are organized by standard/week/subject

## 🔍 File Scanning

The system automatically scans the `tests/` directory:

- **Recursive scanning**: Finds all `test.json` files
- **Path extraction**: Extracts standard/week/subject from folder structure
- **Validation**: Validates each file structure
- **Error reporting**: Shows validation errors for invalid files

### Scan API Endpoints

**List all files:**
```
GET /api/admin/tests/scan?mode=list
```

**Organized view:**
```
GET /api/admin/tests/scan?mode=organized
```

**Statistics:**
```
GET /api/admin/tests/scan?mode=stats
```

## ✅ Validation Rules

### Required Fields
- `metadata.title`
- `metadata.description`
- `metadata.standard` (must be: 4th, 5th, 6th, 7th, 8th, 9th, 10th, 11th, 12th)
- `metadata.week` (must match: week-1, week-2, etc.)
- `metadata.subject`
- `metadata.difficulty`
- `sections` (array, at least 1)
- Each section must have `questions` (array, at least 1)

### Question Validation
- `questionText` required
- `correctAnswer` required
- `multiple-choice` must have at least 2 options
- At least one option must be marked `isCorrect: true`

### Path Validation
- Standard must match folder name
- Week must match folder name
- Subject must match folder name

## 🎨 Admin Interface Features

### Test Management Page (`/admin/tests`)

1. **File Scanner**
   - Automatically scans `tests/` directory
   - Shows organized view by Standard/Week/Subject
   - Lists all files with validation status

2. **Import Options**
   - **Publish**: Make tests immediately available
   - **Activate**: Enable tests for students
   - **Overwrite**: Replace existing tests
   - **Skip Invalid**: Skip files with errors

3. **File Selection**
   - Select individual files
   - Select all valid files
   - Clear selection
   - Bulk import

4. **Validation Display**
   - ✓ Valid files (green)
   - ✗ Invalid files (red) with error details
   - File path and metadata display

## 🔧 Technical Details

### File Scanner (`lib/test-importer/file-scanner.ts`)
- Recursively scans directory
- Extracts metadata from path
- Validates file structure
- Returns organized results

### Test Importer (`lib/test-importer/test-importer.ts`)
- Converts JSON to Firestore structure
- Generates unique test IDs
- Saves test and questions
- Handles overwrites

### Test Schema (`lib/test-importer/test-file-schema.ts`)
- TypeScript interfaces
- Validation functions
- Error reporting

## 📊 Test ID Generation

Test IDs are generated from metadata:
```
{standard}-{week}-{subject}
```

Example: `9th-week-1-reading`

## 🛡️ Security

- Admin authentication required
- Role-based access control
- Server-side validation
- File path sanitization

## 🎯 Best Practices

1. **Naming Conventions**
   - Use consistent folder names
   - Always name file `test.json`
   - Follow standard/week/subject structure

2. **File Organization**
   - One test per file
   - Group related tests by week
   - Use descriptive titles

3. **Validation**
   - Test files locally before importing
   - Check for validation errors
   - Fix errors before bulk import

4. **Version Control**
   - Keep test files in version control
   - Use version numbers in metadata
   - Track changes over time

## 🚨 Error Handling

### Common Errors

1. **Missing metadata fields**
   - Solution: Add all required fields

2. **Invalid standard/week format**
   - Solution: Use exact format (9th, week-1)

3. **No correct answer marked**
   - Solution: Mark one option as `isCorrect: true`

4. **Path mismatch**
   - Solution: Ensure folder names match metadata

## 📝 Example Test File

See `tests/example/9th/week-1/reading/test.json` for a complete example.

## 🔄 Workflow

1. **Create test files** in `tests/` directory
2. **Scan files** via Admin Dashboard
3. **Review validation** results
4. **Select files** to import
5. **Configure options** (publish, activate, etc.)
6. **Import tests** to Firestore
7. **Verify** tests appear in system

## ✨ Plug-and-Play Features

- ✅ Automatic file detection
- ✅ Path-based organization
- ✅ Automatic validation
- ✅ Bulk import support
- ✅ Error reporting
- ✅ Overwrite protection
- ✅ Status management

---

**Status: PRODUCTION READY - Scalable, Robust, Plug-and-Play!** 🚀
