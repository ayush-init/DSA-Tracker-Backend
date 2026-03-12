# Leaderboard API Documentation

## Overview
The Leaderboard API provides comprehensive ranking data for students based on their problem-solving performance. It supports filtering by time periods, cities, and batch years with **time-based ranking system**.

## 🏆 Time-Based Ranking System

### **How Rankings Work:**

1. **Global Rank**: Ranking among students from the **same batch year** across all cities
   - Example: Global rank #1 for 2024 means #1 among ALL 2024 batch students (Bangalore + Noida + Pune + Lucknow)

2. **City Rank**: Ranking among students from the **same city AND same batch year**
   - Example: Bangalore rank #1 for 2024 means #1 among Bangalore 2024 batch students only

3. **Student-Batch Relationship**: Each student belongs to exactly one batch, and each batch has one year
   - Rankings are calculated per year, not across all years
   - This ensures fair comparison within the same cohort

## ⏰ Time-Based Filters

### **Available Time Periods:**

1. **All-Time** (`type: "all"`)
   - Considers all problem-solving activity since student joined
   - Best for overall performance assessment
   - Default filter when no type specified

2. **Weekly** (`type: "weekly"`)
   - Only considers problems solved in the current week (Sunday to Saturday)
   - Great for tracking recent performance and momentum
   - Resets every Sunday

3. **Monthly** (`type: "monthly"`)
   - Only considers problems solved in the current month
   - Good for monthly challenges and progress tracking
   - Resets on the 1st of each month

### **How Time-Based Rankings Work:**

For each time period, the system maintains separate rankings:
- `weekly_global_rank` and `weekly_city_rank`
- `monthly_global_rank` and `monthly_city_rank`  
- `alltime_global_rank` and `alltime_city_rank`

**Example**: A student might be:
- #5 globally in weekly rankings
- #12 globally in monthly rankings
- #8 globally in all-time rankings

---

## 🚀 API Endpoints

### Admin Leaderboard API
**Endpoint**: `POST /api/admin/leaderboard?page=1&limit=20&search=username`

**Description**: Retrieve leaderboard data with pagination and search functionality

#### Request Body
```json
{
  "type": "all",           // optional: "all", "weekly", "monthly"
  "city": "all",           // optional: "all", "bangalore", "noida", "pune", "lucknow"
  "year": 2024             // optional: 2024, 2025, 2026
}
```

#### Query Parameters
```bash
?page=1&limit=20&search=username
```

#### Response Format
```json
{
  "success": true,
  "page": 1,
  "limit": 20,
  "total": 150,
  "totalPages": 8,
  "leaderboard": [
    {
      "student_id": 123,
      "name": "John Doe",
      "username": "johndoe",
      "email": "john@example.com",
      "city_name": "Bangalore",
      "batch_year": 2024,
      "hard_solved": 12,
      "medium_solved": 18,
      "easy_solved": 15,
      "total_solved": 45,
      "hard_completion": 85.5,
      "medium_completion": 72.3,
      "easy_completion": 90.0,
      "score": 38.5,
      "current_streak": 7,
      "max_streak": 15,
      "global_rank": 1,
      "city_rank": 1,
      "last_calculated": "2026-03-12T18:30:00.000Z"
    }
  ]
}
```

### Student Leaderboard API
**Endpoint**: `POST /api/students/leaderboard?username=search_term`

**Description**: Get top 10 students + logged-in student's personal rank

#### Request Body
```json
{
  "type": "all",
  "city": "all", 
  "year": 2024
}
```

#### Response Format
```json
{
  "success": true,
  "top10": [...],           // Top 10 students for filters
  "yourRank": {             // Logged-in student's rank
    "global_rank": 5,
    "city_rank": 2,
    "student_details": {...},
    "rank_statistics": {...},
    "problem_solving_stats": {...}
  },
  "message": null,
  "filters": {
    "city": "all",
    "year": 2024,
    "type": "all"
  }
}
```

---

## 📊 Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `global_rank` | integer | Ranking within same year across all cities |
| `city_rank` | integer | Ranking within same year and same city |
| `student_id` | integer | Unique student identifier |
| `name` | string | Student's full name |
| `username` | string | Student's username |
| `city_name` | string | Student's city (from City table) |
| `year` | integer | Batch year (from Batch table) |
| `hard_completion` | float | Percentage of hard questions solved |
| `medium_completion` | float | Percentage of medium questions solved |
| `easy_completion` | float | Percentage of easy questions solved |
| `score` | float | **Dynamically calculated** score (not stored in DB) |
| `max_streak` | integer | Maximum consecutive days of solving |
| `total_solved` | integer | Total number of problems solved |

---

## 📈 Dynamic Score Calculation

The score is **calculated on-the-fly** based on completion percentage of assigned problems:

### **Score Formula:**
```
Score = (hard_solved/hard_assigned × 20) + 
        (medium_solved/medium_assigned × 15) + 
        (easy_solved/easy_assigned × 10)
```

### **Example Calculation:**
If a student has:
- **Hard**: 8 solved out of 10 assigned → 8/10 × 20 = 16 points
- **Medium**: 12 solved out of 15 assigned → 12/15 × 15 = 12 points  
- **Easy**: 20 solved out of 20 assigned → 20/20 × 10 = 10 points
- **Total Score**: 16 + 12 + 10 = 38 points

### **Time-Based Scoring:**
- **Weekly**: Score calculated from problems solved this week only
- **Monthly**: Score calculated from problems solved this month only
- **All-time**: Score calculated from all problems ever solved

### **Fair Ranking System:**
The completion-based scoring ensures:
- **Fair comparison**: Students with similar completion ratios get similar scores
- **Difficulty weighting**: Hard problems have higher weight (20pts) than medium (15pts) and easy (10pts)
- **Batch context**: Score reflects performance relative to assigned questions, not raw counts
- **Year-wise fairness**: Students are only compared within their batch year

---

## 🎯 Completion Percentage Calculation

Completion percentages are calculated as:
```
Completion % = (solved_count / assigned_count) × 100
```

**Fallback Logic**: If no questions are assigned to a student's batch, the system uses the total available questions in the database as the denominator.

---

## � Streak Calculation Logic

### **How Streaks Are Calculated:**

#### **Max Streak:**
- **Definition**: Total number of distinct days the student has solved at least one problem
- **Calculation**: `COUNT(DISTINCT DATE(sync_at))` from StudentProgress table (only counts days with actual solves)
- **Purpose**: Shows overall consistency and long-term engagement
- **Important**: Only counts days when student actually solved problems (not days with 0 assigned questions)

#### **Current Streak:**
- **Definition**: Number of days with problem solving activity in the last 30 days
- **Calculation**: Count distinct days with solves in the past 30 days
- **Purpose**: Shows recent activity and current momentum
- **Important**: Only counts days when student actually solved problems

#### **Student Profile Streak Data:**
- **Source**: Pre-calculated from Leaderboard table (not calculated on-demand)
- **Performance**: Much faster than real-time calculation
- **Accuracy**: Uses the same logic as leaderboard sync
- **Update Frequency**: Refreshed every 4 hours via cron job

#### **Streak Ranking Importance:**
- **5th Tie-breaker**: After score, hard%, medium%, and easy%
- **Motivational**: Encourages consistent daily problem-solving
- **Engagement Metric**: Shows student dedication and consistency

#### **Example Streak Calculation:**
```
Student Activity (Last 7 Days):
Mon: 3 problems  → Streak: 1
Tue: 2 problems  → Streak: 2  
Wed: 0 problems  → Streak: 0 (broken)
Thu: 1 problem   → Streak: 1
Fri: 2 problems  → Streak: 2
Sat: Weekend      → Streak: 2 (unchanged)
Sun: Weekend      → Streak: 2 (unchanged)

Result: Current Streak = 2, Max Streak = 3 (from Mon-Tue)
```

---

## � Ranking Logic

### **Year-Wise Global Ranking**
Students are ranked within their batch year by:
1. **Score** (descending) - Primary ranking factor
2. **Hard completion** (descending)
3. **Medium completion** (descending)
4. **Easy completion** (descending)
5. **Max streak** (descending)
6. **Total solved** (descending)

### **Year-Wise City Ranking**
Students are ranked within their city and batch year using the same criteria as global ranking.

### **Tie-Breaking Example:**
If two students have the same score:
- Student with higher hard completion % ranks higher
- If still tied, student with higher medium completion % ranks higher
- And so on through the tie-breaking criteria

---

## 🔍 Filter Details

### **Time Period Filters**
- **`all`** (default): Shows all-time performance data
- **`weekly`**: Shows performance from current week (Monday to today)
- **`monthly`**: Shows performance from current month (1st to today)

### **City Filters**
- **`all`** (default): Includes students from all cities
- **`bangalore`**: Only students from Bangalore
- **`noida`**: Only students from Noida
- **`pune`**: Only students from Pune
- **`lucknow`**: Only students from Lucknow

### **Year Filters**
- **No year specified**: Includes all batch years
- **`2024`**: Only students from 2024 batches
- **`2025`**: Only students from 2025 batches
- **`2026`**: Only students from 2026 batches

---

## 🚨 Student Year Validation

When students request leaderboard data for a different year than their batch:

```json
{
  "success": true,
  "top10": [...],
  "yourRank": null,
  "message": "Student belongs to 2025 batch, but 2024 data requested",
  "filters": {...}
}
```

---

## 🔧 Usage Examples

### **Admin API Examples:**

#### Get paginated leaderboard with search
```bash
POST /api/admin/leaderboard?page=1&limit=20&search=ayush
{
  "city": "bangalore",
  "year": 2024,
  "type": "all"
}
```

#### Get weekly leaderboard for Noida
```bash
POST /api/admin/leaderboard?page=1&limit=10
{
  "type": "weekly",
  "city": "noida"
}
```

#### Get all-time leaders across all cities
```bash
POST /api/admin/leaderboard?page=1&limit=50
{
  "city": "all",
  "year": "all",
  "type": "all"
}
```

### **Student API Examples:**

#### Get student's rank in their batch year
```bash
POST /api/students/leaderboard
{
  "city": "all",
  "year": 2024,
  "type": "all"
}
```

#### Search for specific username in student view
```bash
POST /api/students/leaderboard?username=ayush_dev
{
  "city": "bangalore",
  "year": 2024
}
```

---

## 📊 Database Architecture

### **Key Tables Used:**
- **Student**: Student information and batch assignment
- **Batch**: Batch details (year, city_id, assigned question counts)
- **City**: City information
- **StudentProgress**: Problem-solving records with sync timestamps
- **Question**: Problem details (difficulty level)
- **Leaderboard**: Pre-calculated statistics (year-wise rankings stored)

### **Year-Wise Storage:**
The Leaderboard table stores rankings calculated per batch year:
```sql
-- Each student has one entry per year with year-specific rankings
student_id | global_rank | city_rank | batch_year
---------------------------------------------------
15         | 1            | 1         | 2024
15         | 5            | 2         | 2025
```

### **SQL Joins Used:**
```sql
Student s
JOIN Batch b ON b.id = s.batch_id
JOIN City c ON c.id = s.city_id
JOIN Leaderboard l ON l.student_id = s.id
LEFT JOIN student_solves ss ON ss.student_id = s.id
```

---

## 🚀 Performance Features

- **Year-wise partitioning**: Rankings calculated per year for better performance
- **Dynamic scoring**: Score calculated on-demand (no storage overhead)
- **Pagination support**: Admin API supports efficient pagination
- **Search functionality**: Username and name search in admin API
- **Cached calculations**: Leaderboard sync runs periodically for performance
- **Indexes**: Optimized indexes on `student_id`, `batch_id`, `city_id`, `global_rank`, `city_rank`

---

## 🚨 Error Handling

### **Common Error Responses**

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

#### 404 Not Found (Student API)
```json
{
  "success": false,
  "message": "Student not found"
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

## 📝 Important Notes

- **Year-wise rankings**: Students are only compared within their batch year
- **Dynamic scoring**: Scores are calculated in real-time, not stored in database
- **Batch assignment**: Each student belongs to exactly one batch for the duration
- **Fair comparison**: Percentage-based scoring ensures fairness across different batch sizes
- **Time-based filters**: Affect which StudentProgress records are included in calculations
- **City and year names**: Case-sensitive matching
- **All timestamps**: Stored and processed in UTC
- **Rank recalculation**: Rankings are updated periodically via cron jobs

---

## 🔄 System Architecture

### **Sync Process:**
1. **StudentProgress** → Raw problem-solving data
2. **Batch Table** → Assigned question counts per batch
3. **Leaderboard Sync** → Calculate year-wise rankings and store
4. **API Requests** → Read cached data + calculate dynamic scores

### **Data Flow:**
```
Student Progress → Year-wise Ranking → Cached Leaderboard → API Response + Dynamic Score
```

---

## 🛠️ Technical Implementation

### **Score Calculation (On-demand):**
```sql
-- Score calculated dynamically in API queries
ROUND(
  (hard_solved::numeric / NULLIF(hard_assigned,0) * 20) +
  (medium_solved::numeric / NULLIF(medium_assigned,0) * 15) +
  (easy_solved::numeric / NULLIF(easy_assigned,0) * 10), 2
) AS score
```

### **Streak Calculation SQL:**
```sql
-- Leaderboard Sync Streak Calculation
streak_data AS (
  SELECT 
    student_id,
    -- Max streak: Count distinct days with activity
    COUNT(DISTINCT DATE(sp.sync_at)) as max_streak,
    -- Current streak: Days with activity in last 30 days
    (
      SELECT COUNT(DISTINCT DATE(sp2.sync_at))
      FROM "StudentProgress" sp2
      WHERE sp2.student_id = sp.student_id
      AND sp2.sync_at >= DATE(NOW() - INTERVAL '30 days')
    ) as current_streak
  FROM "StudentProgress" sp
  GROUP BY student_id
)
```

### **Student Profile Streak Data (Optimized):**
```sql
-- Get streak data directly from leaderboard table
SELECT 
  current_streak,
  max_streak,
  last_calculated
FROM "Leaderboard" 
WHERE student_id = ${studentId}
```

**Performance Benefits:**
- ⚡ **Fast**: No complex calculations on API calls
- 🔄 **Consistent**: Same data used in leaderboard rankings
- 📊 **Pre-calculated**: Updated every 4 hours via sync job
- 🎯 **Accurate**: Based on actual problem-solving days only

### **Year-wise Ranking SQL:**
```sql
-- Global rank within same year
ROW_NUMBER() OVER (
  PARTITION BY batch_year
  ORDER BY calculated_score DESC, hard_completion DESC, ...
) AS global_rank

-- City rank within same year and city
ROW_NUMBER() OVER (
  PARTITION BY batch_year, city_name
  ORDER BY calculated_score DESC, hard_completion DESC, ...
) AS city_rank
```

---

*Last Updated: March 2026*
*Features: Year-wise ranking system, dynamic score calculation, pagination, search functionality*
