# Admin Dashboard API Documentation

## Endpoint

```
GET /api/admin/dashboard
```

This endpoint provides aggregated analytics data for the Admin Dashboard of the DSA Tracker platform.

It returns information about:

* system overview
* assigned questions
* student solved analytics
* city level statistics
* batch level statistics

---

# Query Parameters (Filters)

All filters are optional.

| Parameter | Type   | Description                         |
| --------- | ------ | ----------------------------------- |
| city      | string | Filter dashboard data by city slug  |
| batch     | string | Filter dashboard data by batch slug |
| year      | number | Filter dashboard data by batch year |

---

# Example Requests

### Get complete dashboard

```
GET /api/admin/dashboard
```

---

### Filter by city

```
GET /api/admin/dashboard?city=noida
```

---

### Filter by batch

```
GET /api/admin/dashboard?batch=sot-2024
```

---

### Filter by year

```
GET /api/admin/dashboard?year=2024
```

---

### Multiple filters

```
GET /api/admin/dashboard?city=noida&year=2024
```

---

# Response Structure

```
{
  overview: {},
  assignedQuestions: {},
  solvedQuestions: {},
  cityStats: [],
  batchStats: []
}
```

---

# 1. Overview Section

Provides system level statistics.

Example:

```
{
  "overview": {
    "totalCities": 4,
    "totalStudents": 120,
    "totalAssignedQuestions": 540
  }
}
```

Fields:

| Field                  | Description                                   |
| ---------------------- | --------------------------------------------- |
| totalCities            | Total number of cities in the system          |
| totalStudents          | Total students registered                     |
| totalAssignedQuestions | Total questions assigned by admins to classes |

Note:
This value counts only **questions assigned to classes**, not the full question bank.

---

# 2. Assigned Questions Analytics

Shows analytics for questions assigned by admins.

Example:

```
{
  "assignedQuestions": {
    "platforms": {
      "leetcode": 320,
      "gfg": 220
    },
    "difficulty": {
      "easy": 200,
      "medium": 250,
      "hard": 90
    },
    "type": {
      "homework": 300,
      "classwork": 240
    }
  }
}
```

Fields:

### Platforms

| Field    | Description                       |
| -------- | --------------------------------- |
| leetcode | Total assigned LeetCode questions |
| gfg      | Total assigned GFG questions      |

---

### Difficulty

| Field  | Description                     |
| ------ | ------------------------------- |
| easy   | Total assigned easy questions   |
| medium | Total assigned medium questions |
| hard   | Total assigned hard questions   |

---

### Type

| Field     | Description                     |
| --------- | ------------------------------- |
| homework  | Questions assigned as homework  |
| classwork | Questions assigned as classwork |

---

# 3. Solved Questions Analytics

Shows how many questions students solved.

Example:

```
{
  "solvedQuestions": {
    "leetcode": {
      "easy": 50,
      "medium": 30,
      "hard": 10
    },
    "gfg": {
      "easy": 120,
      "medium": 80,
      "hard": 40
    }
  }
}
```

Fields:

### LeetCode

| Field  | Description            |
| ------ | ---------------------- |
| easy   | Easy problems solved   |
| medium | Medium problems solved |
| hard   | Hard problems solved   |

---

### GFG

| Field  | Description            |
| ------ | ---------------------- |
| easy   | Easy problems solved   |
| medium | Medium problems solved |
| hard   | Hard problems solved   |

---

# 4. City Statistics

Shows analytics grouped by city.

Example:

```
{
  "cityStats": [
    {
      "city": "Noida",
      "totalBatches": 3,
      "totalStudents": 40
    },
    {
      "city": "Bangalore",
      "totalBatches": 2,
      "totalStudents": 30
    }
  ]
}
```

Fields:

| Field         | Description                |
| ------------- | -------------------------- |
| city          | City name                  |
| totalBatches  | Total batches in the city  |
| totalStudents | Total students in the city |

---

# 5. Batch Statistics

Shows analytics grouped by batch.

Example:

```
{
  "batchStats": [
    {
      "batch": "SOT",
      "year": 2024,
      "city": "Noida",
      "totalStudents": 25
    }
  ]
}
```

Fields:

| Field         | Description             |
| ------------- | ----------------------- |
| batch         | Batch name              |
| year          | Batch year              |
| city          | City name               |
| totalStudents | Total students in batch |

---

# Error Responses

### Internal Server Error

```
Status: 500
```

```
{
  "error": "Dashboard data fetch failed"
}
```

Possible reasons:

* database connection error
* invalid query filters
* internal server error

---

# Notes

1. This dashboard only counts **questions assigned by admins to classes**.
2. Questions present in the global question bank are **not included unless assigned**.
3. The API supports multiple filters simultaneously.
4. All analytics are calculated dynamically from the database.

---

# Example Full Response

```
{
  "overview": {
    "totalCities": 4,
    "totalStudents": 120,
    "totalAssignedQuestions": 540
  },
  "assignedQuestions": {
    "platforms": {
      "leetcode": 320,
      "gfg": 220
    },
    "difficulty": {
      "easy": 200,
      "medium": 250,
      "hard": 90
    },
    "type": {
      "homework": 300,
      "classwork": 240
    }
  },
  "solvedQuestions": {
    "leetcode": {
      "easy": 50,
      "medium": 30,
      "hard": 10
    },
    "gfg": {
      "easy": 120,
      "medium": 80,
      "hard": 40
    }
  },
  "cityStats": [],
  "batchStats": []
}
```
