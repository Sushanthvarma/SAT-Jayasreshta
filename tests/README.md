# Test Files Directory Structure

## 📁 Folder Organization

Tests are organized in the following structure:

```
tests/
├── {standard}/           # Grade level (e.g., "9th", "10th", "11th", "12th")
│   ├── {week}/          # Week number (e.g., "week-1", "week-2")
│   │   ├── {subject}/   # Subject (e.g., "reading", "writing", "math")
│   │   │   └── test.json # Test file
│   │   └── ...
│   └── ...
└── ...
```

### Examples:
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

Each `test.json` file should follow this structure:

```json
{
  "metadata": {
    "title": "Week 1 - Reading Comprehension",
    "description": "Reading comprehension practice for 9th grade, week 1",
    "standard": "9th",
    "week": "week-1",
    "subject": "reading",
    "difficulty": "intermediate",
    "version": "1.0.0"
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
          "questionText": "What is the main idea of the passage?",
          "passageText": "This is a sample reading passage...",
          "options": [
            { "id": "A", "text": "Option A text", "isCorrect": false },
            { "id": "B", "text": "Option B text", "isCorrect": true },
            { "id": "C", "text": "Option C text", "isCorrect": false },
            { "id": "D", "text": "Option D text", "isCorrect": false }
          ],
          "correctAnswer": "B",
          "explanation": "The main idea is...",
          "topicTags": ["main-idea", "reading-comprehension"],
          "skillTags": ["analysis", "inference"],
          "points": 1,
          "estimatedTime": 90
        }
      ]
    }
  ]
}
```

## 🚀 How to Add Tests

1. **Create the folder structure:**
   ```
   tests/9th/week-1/reading/
   ```

2. **Create test.json file** with the test data

3. **Run the import:**
   - Via Admin Dashboard: Go to Admin → Test Management → Import Tests
   - Via API: `POST /api/admin/tests/import`

4. **Tests are automatically scanned and imported!**

## ✅ Validation

Tests are automatically validated for:
- Required fields
- Question structure
- Answer correctness
- Timing consistency
- Section organization

## 📝 Naming Conventions

- **Standard**: `9th`, `10th`, `11th`, `12th`
- **Week**: `week-1`, `week-2`, `week-3`, etc.
- **Subject**: `reading`, `writing`, `math`, `math-calculator`, `math-no-calculator`
- **File**: Always name it `test.json`
