# Leaderboard API Documentation

## Overview
The Leaderboard API provides comprehensive ranking data for students based on their problem-solving performance. It supports filtering by time periods, cities, and batch years.

## Base URL
```
http://localhost:5000/api/admin/leaderboard
```

## Authentication
All endpoints require authentication with admin role:
```
Authorization: Bearer <your-jwt-token>
```

---

## 🚀 API Endpoint

### POST Leaderboard (Request Body)
**Endpoint**: `POST /api/admin/leaderboard`

**Description**: Retrieve leaderboard data using JSON request body

#### Request Body
```json
{
  "type": "all",           // optional: "all", "weekly", "monthly"
  "city": "all",           // optional: "all", "bangalore", "noida", "pune", "lucknow"
  "year": 2024             // optional: 2024, 2025, 2026
}
```

#### Example Requests
```bash
# Using curl
curl -X POST http://localhost:5000/api/admin/leaderboard \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "type": "weekly",
    "city": "bangalore",
    "year": 2024
  }'

# All-time leaderboard
curl -X POST http://localhost:5000/api/admin/leaderboard \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{}'

# Monthly leaderboard for Noida
curl -X POST http://localhost:5000/api/admin/leaderboard \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "type": "monthly",
    "city": "noida"
  }'
```

---

## 📊 Response Format

### Success Response
```json
{
  "success": true,
  "data": [
    {
      "global_rank": 1,
      "city_rank": 1,
      "student_id": 15,
      "name": "Ayush Chaurasiya",
      "username": "ayush_dev",
      "city_name": "Bangalore",
      "year": 2024,
      "hard_completion": 66.67,
      "medium_completion": 100,
      "easy_completion": 100,
      "score": 195,
      "max_streak": 1,
      "total_solved": 16
    }
  ]
}
```

### Response Fields
| Field | Type | Description |
|-------|------|-------------|
| `global_rank` | integer | Overall ranking across all students |
| `city_rank` | integer | Ranking within the student's city |
| `student_id` | integer | Unique student identifier |
| `name` | string | Student's full name |
| `username` | string | Student's username |
| `city_name` | string | Student's city (from City table) |
| `year` | integer | Batch year (from Batch table) |
| `hard_completion` | float | Percentage of hard questions solved |
| `medium_completion` | float | Percentage of medium questions solved |
| `easy_completion` | float | Percentage of easy questions solved |
| `score` | integer | Total score calculated from solved problems |
| `max_streak` | integer | Maximum consecutive days of solving |
| `total_solved` | integer | Total number of problems solved |

---

## 🔍 Filter Details

### Time Period Filters
- **`all`** (default): Shows all-time performance data
- **`weekly`**: Shows performance from current week (Monday to today)
- **`monthly`**: Shows performance from current month (1st to today)

### City Filters
- **`all`** (default): Includes students from all cities
- **`bangalore`**: Only students from Bangalore
- **`noida`**: Only students from Noida
- **`pune`**: Only students from Pune
- **`lucknow`**: Only students from Lucknow

### Year Filters
- **No year specified**: Includes all batch years
- **`2024`**: Only students from 2024 batches
- **`2025`**: Only students from 2025 batches
- **`2026`**: Only students from 2026 batches

---

## 📈 Score Calculation

The score is calculated based on **completion percentage** of assigned problems:
- **Hard problems**: (hard_solved/hard_assigned) × 20 points
- **Medium problems**: (medium_solved/medium_assigned) × 15 points
- **Easy problems**: (easy_solved/easy_assigned) × 10 points

```
Total Score = (hard_solved/hard_assigned × 20) + 
              (medium_solved/medium_assigned × 15) + 
              (easy_solved/easy_assigned × 10)
```

### Example Calculation
If a student has:
- **Hard**: 8 solved out of 10 assigned → 8/10 × 20 = 16 points
- **Medium**: 12 solved out of 15 assigned → 12/15 × 15 = 12 points  
- **Easy**: 20 solved out of 20 assigned → 20/20 × 10 = 10 points
- **Total Score**: 16 + 12 + 10 = 38 points

### Time-Based Scoring
- **Weekly**: Score calculated from completion percentage of problems solved this week only
- **Monthly**: Score calculated from completion percentage of problems solved this month only
- **All-time**: Score calculated from completion percentage of all problems ever solved

### Fair Ranking System
The completion-based scoring ensures:
- **Fair comparison**: Students with similar completion ratios get similar scores
- **Difficulty weighting**: Hard problems have higher weight (20pts) than medium (15pts) and easy (10pts)
- **Assignment context**: Score reflects performance relative to assigned problems, not just raw counts

---

## 🎯 Completion Percentage Calculation

Completion percentages are calculated as:
```
Completion % = (solved_count / assigned_count) × 100
```

**Fallback Logic**: If no questions are assigned to a student's batch, the system uses the total available questions in the database as the denominator.

---

## 📋 Ranking Logic

### Global Ranking
Students are ranked globally by:
1. Score (descending)
2. Hard completion (descending)
3. Medium completion (descending)
4. Easy completion (descending)
5. Max streak (descending)
6. Total solved (descending)

### City Ranking
Students are ranked within their city using the same criteria as global ranking.

---

## 🚨 Error Handling

### Common Error Responses

#### 401 Unauthorized
```json
{
  "success": false,
  "message": "Authentication required"
}
```

#### 403 Forbidden
```json
{
  "success": false,
  "message": "Admin access required"
}
```

#### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Database connection failed"
}
```

---

## 🔧 Usage Examples

### Example 1: Top 10 Bangalore Students (2024)
```bash
POST /api/admin/leaderboard
{
  "city": "bangalore",
  "year": 2024
}
```

### Example 2: This Week's Top Performers
```bash
POST /api/admin/leaderboard
{
  "type": "weekly",
  "city": "all"
}
```

### Example 3: Monthly Leaders in Noida
```bash
POST /api/admin/leaderboard
{
  "type": "monthly",
  "city": "noida"
}
```

### Example 4: All-time Champions
```bash
POST /api/admin/leaderboard
{}
```

### Example 5: Combined Filters
```bash
POST /api/admin/leaderboard
{
  "type": "monthly",
  "city": "bangalore",
  "year": 2024
}
```

---

## 📊 Database Schema

### Key Tables Used
- **Student**: Student information
- **Batch**: Batch details (year, city_id)
- **City**: City information
- **StudentProgress**: Problem-solving records
- **Question**: Problem details (difficulty level)
- **Leaderboard**: Pre-calculated statistics

### Joins Used
```sql
Student s
JOIN Batch b ON b.id = s.batch_id
JOIN City c ON c.id = s.city_id
JOIN Leaderboard l ON l.student_id = s.id
LEFT JOIN student_solves ss ON ss.student_id = s.id
```

---

## 🚀 Performance Considerations

- **Limit**: Results are limited to top 100 students
- **Indexes**: Ensure indexes on `student_id`, `batch_id`, `city_id`, `solved_at`
- **Caching**: Consider caching frequently accessed leaderboards
- **Real-time**: Scores are calculated in real-time for accuracy

---

## 📝 Notes

- The API automatically falls back to all-time data if no data exists for the specified year
- City and year names are case-sensitive
- The API respects batch year filtering, not the year when problems were solved
- All timestamps are in UTC
- Rankings are recalculated on each request for accuracy

---

## 🔄 Related Endpoints

### Recalculate Leaderboard
**Endpoint**: `POST /api/admin/leaderboard/recalculate`

**Description**: Manually trigger leaderboard recalculation

```bash
POST /api/admin/leaderboard/recalculate
```

**Response**:
```json
{
  "success": true,
  "message": "Leaderboard recalculated successfully"
}
```

---

*Last Updated: March 2026*
