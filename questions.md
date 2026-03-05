# Admin Questions Analytics API Documentation

## Endpoint

```http
GET /api/admin/questions
```

This endpoint returns analytics and details about **questions assigned by admins to classes**.
It only counts questions that have been **assigned to batches through classes**, not the entire question bank.

The API supports filtering by **city**, **batch**, and **year**.

---

# Query Parameters (Filters)

All filters are optional.

| Parameter | Type   | Description                    |
| --------- | ------ | ------------------------------ |
| city      | string | Filter questions by city slug  |
| batch     | string | Filter questions by batch slug |
| year      | number | Filter questions by batch year |

---

# Example Requests

### Get all assigned questions

```http
GET /api/admin/questions
```

---

### Filter by city

```http
GET /api/admin/questions?city=noida
```

---

### Filter by batch

```http
GET /api/admin/questions?batch=sot-2024
```

---

### Filter by year

```http
GET /api/admin/questions?year=2024
```

---

### Multiple filters

```http
GET /api/admin/questions?city=noida&year=2024
```

---

# Response Structure

```json
{
  "totalQuestions": number,
  "analytics": {
    "platforms": {},
    "difficulty": {},
    "type": {}
  },
  "questions": []
}
```

---

# 1. Total Questions

Represents the total number of questions assigned by admins to classes based on applied filters.

Example:

```json
{
  "totalQuestions": 120
}
```

---

# 2. Platform Analytics

Shows how many assigned questions belong to each platform.

Example:

```json
{
  "platforms": {
    "leetcode": 80,
    "gfg": 40
  }
}
```

Fields:

| Field    | Description                       |
| -------- | --------------------------------- |
| leetcode | Total assigned LeetCode questions |
| gfg      | Total assigned GFG questions      |

---

# 3. Difficulty Analytics

Shows distribution of assigned questions by difficulty level.

Example:

```json
{
  "difficulty": {
    "easy": 50,
    "medium": 40,
    "hard": 30
  }
}
```

Fields:

| Field  | Description                     |
| ------ | ------------------------------- |
| easy   | Total easy questions assigned   |
| medium | Total medium questions assigned |
| hard   | Total hard questions assigned   |

---

# 4. Question Type Analytics

Shows distribution of assigned questions by type.

Example:

```json
{
  "type": {
    "homework": 70,
    "classwork": 50
  }
}
```

Fields:

| Field     | Description                     |
| --------- | ------------------------------- |
| homework  | Questions assigned as homework  |
| classwork | Questions assigned as classwork |

---

# 5. Questions List

Returns detailed information about the assigned questions.

Example:

```json
{
  "questions": [
    {
      "id": 1,
      "question_name": "Two Sum",
      "platform": "LEETCODE",
      "level": "EASY",
      "type": "HOMEWORK",
      "topic": {
        "topic_name": "Arrays"
      }
    }
  ]
}
```

Fields:

| Field            | Description                          |
| ---------------- | ------------------------------------ |
| id               | Question ID                          |
| question_name    | Name of the question                 |
| platform         | Platform where question belongs      |
| level            | Difficulty level                     |
| type             | Question type (HOMEWORK / CLASSWORK) |
| topic.topic_name | Topic to which the question belongs  |

---

# Error Responses

## Invalid City

```json
{
  "error": "Invalid city"
}
```

Occurs when a city slug that does not exist in the database is provided.

---

## Invalid Batch

```json
{
  "error": "Invalid batch"
}
```

Occurs when a batch slug that does not exist in the database is provided.

---

## Invalid Year

```json
{
  "error": "Year must be a number"
}
```

Occurs when the year filter is not a valid number.

---

## Batch Not Found

```json
{
  "error": "Batch not found"
}
```

Occurs when filters result in no matching batches.

---

## Internal Server Error

```json
{
  "error": "Failed to fetch assigned questions"
}
```

Occurs if an unexpected error happens during query execution.

---

# Notes

1. Only **questions assigned to classes by admins** are included in this API.
2. Questions that exist in the **global question bank but are not assigned to classes are not counted**.
3. Multiple filters can be used together.
4. If no filters are applied, the API returns analytics for **all assigned questions across all cities and batches**.

---

# Example Full Response

```json
{
  "totalQuestions": 120,
  "analytics": {
    "platforms": {
      "leetcode": 80,
      "gfg": 40
    },
    "difficulty": {
      "easy": 50,
      "medium": 40,
      "hard": 30
    },
    "type": {
      "homework": 70,
      "classwork": 50
    }
  },
  "questions": []
}
```
