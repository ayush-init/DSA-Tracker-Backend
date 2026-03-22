  # DSA Tracker - Admin API Routes Documentation

  ## Overview

  This document provides comprehensive documentation for all admin API endpoints in the DSA Tracker backend. The API supports full CRUD operations for managing cities, batches, topics, questions, classes, and students with advanced features including file uploads and progress tracking.

  ## Base URL

  ```
  http://localhost:5000/api/admin
  ```

  ## Authentication

  All admin routes require:
  - **Authentication Token**: Bearer token in Authorization header
  - **Admin Role**: User must have ADMIN, TEACHER, or SUPERADMIN role
  - **Role-Based Access**: Some endpoints require higher privileges (TEACHER+ or SUPERADMIN)

  ```http
  Authorization: Bearer <access_token>
  ```

  ---

  ## 🏙️ Cities Management

  ### Get All Cities
  ```http
  GET /api/admin/cities
  ```

  **Response:**
  ```json
  [
    {
      "id": 1,
      "city_name": "Bangalore",
      "created_at": "2024-01-01T00:00:00.000Z"
    }
  ]
  ```

  ---

  ## 📦 Batches Management

  ### Get All Batches
  ```http
  GET /api/admin/batches
  ```

  **Response:**
  ```json
  [
    {
      "id": 1,
      "batch_name": "Batch-2024-1",
      "year": 2024,
      "city_id": 1,
      "slug": "batch-2024-1",
      "created_at": "2024-01-01T00:00:00.000Z",
      "city": {
        "id": 1,
        "city_name": "Bangalore"
      }
    }
  ]
  ```

  ### Create Batch
  ```http
  POST /api/admin/batches
  ```

  **Request Body:**
  ```json
  {
    "batch_name": "Batch-2024-2",
    "year": 2024,
    "city_id": 1
  }
  ```

  **Response:**
  ```json
  {
    "message": "Batch created successfully",
    "batch": {
      "id": 2,
      "batch_name": "Batch-2024-2",
      "year": 2024,
      "city_id": 1,
      "slug": "batch-2024-2",
      "created_at": "2024-01-01T00:00:00.000Z"
    }
  }
  ```

  ---

  ## 🎯 Topics Management (NEW: Photo Upload Feature)

  ### Get All Topics
  ```http
  GET /api/admin/topics
  ```

  **Response:**
  ```json
  [
    {
      "id": 1,
      "topic_name": "Arrays",
      "slug": "arrays",
      "description": "Learn array data structures",
      "photo_url": "https://s3.amazonaws.com/bucket/topics/topic-1-1640995200000.jpg",
      "order": 0,
      "created_at": "2024-01-01T00:00:00.000Z",
      "updated_at": "2024-01-01T00:00:00.000Z"
    }
  ]
  ```

  ### Create Topic (WITH PHOTO)
  ```http
  POST /api/admin/topics
  Content-Type: multipart/form-data
  ```

  **Request Body (Form Data):**
  ```
  topic_name: "Arrays"
  photo: [image file] (optional, max 5MB, jpg/png/webp/gif)
  ```

  **Response:**
  ```json
  {
    "message": "Topic created successfully",
    "topic": {
      "id": 1,
      "topic_name": "Arrays",
      "slug": "arrays",
      "description": null,
      "photo_url": "https://s3.amazonaws.com/bucket/topics/topic-1-1640995200000.jpg",
      "order": 0,
      "created_at": "2024-01-01T00:00:00.000Z",
      "updated_at": "2024-01-01T00:00:00.000Z"
    }
  }
  ```

  ### Update Topic (WITH PHOTO)
  ```http
  PATCH /api/admin/topics/:id
  Content-Type: multipart/form-data
  ```

  **Request Body (Form Data):**
  ```
  topic_name: "Advanced Arrays" (optional)
  photo: [new image file] (optional)
  removePhoto: "true" (optional, removes existing photo)
  ```

  **Response:**
  ```json
  {
    "message": "Topic updated successfully",
    "topic": {
      "id": 1,
      "topic_name": "Advanced Arrays",
      "slug": "advanced-arrays",
      "description": null,
      "photo_url": "https://s3.amazonaws.com/bucket/topics/topic-1-1640995300000.jpg",
      "order": 0,
      "updated_at": "2024-01-01T00:05:00.000Z"
    }
  }
  ```

  ### Delete Topic
  ```http
  DELETE /api/admin/topics/:id
  ```

  **Response:**
  ```json
  {
    "message": "Topic deleted successfully"
  }
  ```

  **Note:** Automatically deletes the associated photo from S3.

  ### Get Topics for Batch
  ```http
  GET /api/admin/:batchSlug/topics
  ```

  **Response:**
  ```json
  [
    {
      "id": 1,
      "topic_name": "Arrays",
      "slug": "arrays",
      "photo_url": "https://s3.amazonaws.com/bucket/topics/topic-1-1640995200000.jpg",
      "classCount": 5,
      "questionCount": 25
    }
  ]
  ```

  ---

  ## ❓ Questions Management

  ### Get All Questions
  ```http
  GET /api/admin/questions
  ```

  **Query Parameters:**
  - `topic_id` (optional): Filter by topic
  - `difficulty` (optional): Filter by difficulty (easy, medium, hard)
  - `page` (optional): Pagination page number
  - `limit` (optional): Items per page

  **Response:**
  ```json
  {
    "questions": [
      {
        "id": 1,
        "question_name": "Two Sum",
        "question_link": "https://leetcode.com/problems/two-sum/",
        "difficulty": "Easy",
        "topic_id": 1,
        "topic": {
          "id": 1,
          "topic_name": "Arrays",
          "slug": "arrays"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 50,
      "pages": 5
    }
  }
  ```

  ### Create Question
  ```http
  POST /api/admin/questions
  ```

  **Request Body:**
  ```json
  {
    "question_name": "Two Sum",
    "question_link": "https://leetcode.com/problems/two-sum/",
    "difficulty": "Easy",
    "topic_id": 1
  }
  ```

  **Response:**
  ```json
  {
    "message": "Question created successfully",
    "question": {
      "id": 1,
      "question_name": "Two Sum",
      "question_link": "https://leetcode.com/problems/two-sum/",
      "difficulty": "Easy",
      "topic_id": 1,
      "created_at": "2024-01-01T00:00:00.000Z"
    }
  }
  ```

  ### Update Question
  ```http
  PATCH /api/admin/questions/:id
  ```

  **Request Body:**
  ```json
  {
    "question_name": "Two Sum Updated",
    "difficulty": "Medium"
  }
  ```

  ### Delete Question
  ```http
  DELETE /api/admin/questions/:id
  ```

  ### Bulk Upload Questions
  ```http
  POST /api/admin/questions/bulk-upload
  Content-Type: multipart/form-data
  ```

  **Request Body (Form Data):**
  ```
  file: [CSV file with columns: question_name, question_link, difficulty, topic_name]
  ```

  **CSV Format:**
  ```csv
  question_name,question_link,difficulty,topic_name
  Two Sum,https://leetcode.com/problems/two-sum/,Easy,Arrays
  Three Sum,https://leetcode.com/problems/three-sum/,Medium,Arrays
  ```

  ---

  ## 📚 Classes Management

  ### Get Classes by Topic
  ```http
  GET /api/admin/:batchSlug/topics/:topicSlug/classes
  ```

  **Response:**
  ```json
  [
    {
      "id": 1,
      "class_name": "Arrays Basics",
      "slug": "arrays-basics",
      "duration_minutes": 60,
      "description": "Introduction to arrays",
      "topic_id": 1,
      "batch_id": 1,
      "created_at": "2024-01-01T00:00:00.000Z",
      "questionCount": 10
    }
  ]
  ```

  ### Create Class in Topic
  ```http
  POST /api/admin/:batchSlug/topics/:topicSlug/classes
  ```

  **Request Body:**
  ```json
  {
    "class_name": "Arrays Advanced",
    "duration_minutes": 90,
    "description": "Advanced array concepts"
  }
  ```

  **Response:**
  ```json
  {
    "message": "Class created successfully",
    "class": {
      "id": 2,
      "class_name": "Arrays Advanced",
      "slug": "arrays-advanced",
      "duration_minutes": 90,
      "description": "Advanced array concepts",
      "topic_id": 1,
      "batch_id": 1,
      "created_at": "2024-01-01T00:00:00.000Z"
    }
  }
  ```

  ### Get Single Class
  ```http
  GET /api/admin/:batchSlug/topics/:topicSlug/classes/:classSlug
  ```

  **Response:**
  ```json
  {
    "id": 1,
    "class_name": "Arrays Basics",
    "slug": "arrays-basics",
    "duration_minutes": 60,
    "description": "Introduction to arrays",
    "topic": {
      "id": 1,
      "topic_name": "Arrays",
      "slug": "arrays",
      "photo_url": "https://s3.amazonaws.com/bucket/topics/topic-1-1640995200000.jpg"
    },
    "questions": [
      {
        "id": 1,
        "question_name": "Two Sum",
        "question_link": "https://leetcode.com/problems/two-sum/",
        "difficulty": "Easy"
      }
    ]
  }
  ```

  ### Update Class
  ```http
  PATCH /api/admin/:batchSlug/topics/:topicSlug/classes/:classSlug
  ```

  **Request Body:**
  ```json
  {
    "class_name": "Arrays Basics Updated",
    "duration_minutes": 75
  }
  ```

  ### Delete Class
  ```http
  DELETE /api/admin/:batchSlug/topics/:topicSlug/classes/:classSlug
  ```

  ---

  ## 🔗 Question Assignment Management

  ### Assign Questions to Class
  ```http
  POST /api/admin/:batchSlug/topics/:topicSlug/classes/:classSlug/questions
  ```

  **Request Body:**
  ```json
  {
    "questionIds": [1, 2, 3, 4, 5]
  }
  ```

  **Response:**
  ```json
  {
    "message": "Questions assigned to class successfully",
    "assigned": 5
  }
  ```

  ### Get Assigned Questions of Class
  ```http
  GET /api/admin/:batchSlug/topics/:topicSlug/classes/:classSlug/questions
  ```

  **Response:**
  ```json
  [
    {
      "id": 1,
      "question_name": "Two Sum",
      "question_link": "https://leetcode.com/problems/two-sum/",
      "difficulty": "Easy",
      "assigned_at": "2024-01-01T00:00:00.000Z"
    }
  ]
  ```

  ### Remove Question from Class
  ```http
  DELETE /api/admin/:batchSlug/topics/:topicSlug/classes/:classSlug/questions/:questionId
  ```

  **Response:**
  ```json
  {
    "message": "Question removed from class successfully"
  }
  ```

  ---

  ## 👥 Students Management

  ### Get All Students
  ```http
  GET /api/admin/students
  ```

  **Query Parameters:**
  - `batch_id` (optional): Filter by batch
  - `city_id` (optional): Filter by city
  - `search` (optional): Search by name or email
  - `page` (optional): Pagination page
  - `limit` (optional): Items per page

  **Response:**
  ```json
  {
    "students": [
      {
        "id": 1,
        "name": "John Doe",
        "email": "john@example.com",
        "username": "johndoe",
        "enrollment_id": "EN2024001",
        "leetcode_id": "johndoe",
        "gfg_id": "johndoe_gfg",
        "github": "johndoe-dev",
        "linkedin": "linkedin.com/in/johndoe",
        "profile_image_url": "https://s3.amazonaws.com/bucket/profiles/student-1.jpg",
        "batch": {
          "id": 1,
          "batch_name": "Batch-2024-1",
          "slug": "batch-2024-1"
        },
        "city": {
          "id": 1,
          "city_name": "Bangalore"
        },
        "stats": {
          "totalSolved": 25,
          "easySolved": 15,
          "mediumSolved": 8,
          "hardSolved": 2
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 50,
      "pages": 5
    }
  }
  ```

  ### Create Student
  ```http
  POST /api/admin/students
  ```

  **Request Body:**
  ```json
  {
    "name": "Jane Smith",
    "email": "jane@example.com",
    "username": "janesmith",
    "password": "securePassword123",
    "enrollment_id": "EN2024002",
    "batch_id": 1,
    "leetcode_id": "janesmith",
    "gfg_id": "janesmith_gfg"
  }
  ```

  **Response:**
  ```json
  {
    "message": "Student created successfully",
    "student": {
      "id": 2,
      "name": "Jane Smith",
      "email": "jane@example.com",
      "username": "janesmith",
      "enrollment_id": "EN2024002",
      "batch_id": 1,
      "created_at": "2024-01-01T00:00:00.000Z"
    }
  }
  ```

  ### Update Student
  ```http
  PATCH /api/admin/students/:id
  ```

  **Request Body:**
  ```json
  {
    "name": "Jane Smith Updated",
    "batch_id": 2,
    "leetcode_id": "janesmith_new"
  }
  ```

  ### Delete Student
  ```http
  DELETE /api/admin/students/:id
  ```

  ### Get Student Report
  ```http
  GET /api/admin/students/:username
  ```

  **Response:**
  ```json
  {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "username": "johndoe",
    "batch": {
      "id": 1,
      "batch_name": "Batch-2024-1",
      "slug": "batch-2024-1"
    },
    "city": {
      "id": 1,
      "city_name": "Bangalore"
    },
    "progress": [
      {
        "topic": {
          "id": 1,
          "topic_name": "Arrays",
          "slug": "arrays",
          "photo_url": "https://s3.amazonaws.com/bucket/topics/topic-1-1640995200000.jpg"
        },
        "totalQuestions": 25,
        "solvedQuestions": 20,
        "completionPercentage": 80
      }
    ],
    "stats": {
      "totalSolved": 45,
      "easySolved": 25,
      "mediumSolved": 15,
      "hardSolved": 5,
      "overallProgress": 75.5
    }
  }
  ```

  ### Add Student Progress
  ```http
  POST /api/admin/students/progress
  ```

  **Request Body:**
  ```json
  {
    "student_id": 1,
    "question_id": 1,
    "solved_at": "2024-01-01T10:00:00.000Z"
  }
  ```

  ### Bulk Student Upload
  ```http
  POST /api/admin/bulk-operations
  Content-Type: multipart/form-data
  ```

  **Request Body (Form Data):**
  ```
  file: [CSV file with student data]
  ```

  **CSV Format:**
  ```csv
  name,email,username,password,enrollment_id,batch_name,city_name,leetcode_id,gfg_id
  John Doe,john@example.com,johndoe,password123,EN2024001,Batch-2024-1,Bangalore,johndoe,johndoe_gfg
  ```

  ---

  ## 📊 Statistics & Reports

  ### Get Admin Statistics
  ```http
  POST /api/admin/stats
  ```

  **Request Body:**
  ```json
  {
    "batch_id": 1,
    "city_id": 1
  }
  ```

  **Response:**
  ```json
  {
    "overview": {
      "totalStudents": 50,
      "totalQuestions": 200,
      "averageProgress": 65.5,
      "activeToday": 12
    },
    "topics": [
      {
        "id": 1,
        "topic_name": "Arrays",
        "slug": "arrays",
        "photo_url": "https://s3.amazonaws.com/bucket/topics/topic-1-1640995200000.jpg",
        "totalQuestions": 25,
        "averageCompletion": 78.5
      }
    ],
    "batchStats": {
      "totalBatches": 3,
      "activeBatches": 2,
      "averageBatchSize": 25
    }
  }
  ```

  ### Download Batch Report
  ```http
  POST /api/admin/student/reportdownload
  ```

  **Request Body:**
  ```json
  {
    "batch_id": 1,
    "format": "csv"
  }
  ```

  **Response:** CSV file download

  ### Get Leaderboard
  ```http
  POST /api/admin/leaderboard
  ```

  **Request Body:**
  ```json
  {
    "batch_id": 1,
    "limit": 10,
    "sortBy": "totalSolved"
  }
  ```

  **Response:**
  ```json
  {
    "leaderboard": [
      {
        "rank": 1,
        "student": {
          "id": 1,
          "name": "John Doe",
          "username": "johndoe",
          "profile_image_url": "https://s3.amazonaws.com/bucket/profiles/student-1.jpg"
        },
        "stats": {
          "totalSolved": 89,
          "easySolved": 45,
          "mediumSolved": 30,
          "hardSolved": 14,
          "score": 1250
        }
      }
    ]
  }
  ```

  ---

  ## 🔧 Utility Endpoints

  ### Manual Sync
  ```http
  POST /api/admin/students/sync/:id
  ```

  **Response:**
  ```json
  {
    "message": "Student progress synced successfully",
    "updatedQuestions": 5,
    "newSolved": 2
  }
  ```

  ### Test LeetCode Integration
  ```http
  GET /api/admin/test/leetcode/:username
  ```

  **Response:**
  ```json
  {
    "username": "johndoe",
    "totalSolved": 89,
    "easySolved": 45,
    "mediumSolved": 30,
    "hardSolved": 14,
    "ranking": 125000,
    "status": "success"
  }
  ```

  ### Test GFG Integration
  ```http
  GET /api/admin/test/gfg/:username
  ```

  **Response:**
  ```json
  {
    "username": "johndoe_gfg",
    "totalSolved": 156,
    "schoolProblemsSolved": 89,
    "codingScore": 1250,
    "status": "success"
  }
  ```

  ---

  ## 🚨 Error Responses

  All endpoints return consistent error responses:

  ```json
  {
    "error": "Error message description"
  }
  ```

  **Common HTTP Status Codes:**
  - `200` - Success
  - `201` - Created
  - `400` - Bad Request
  - `401` - Unauthorized
  - `403` - Forbidden
  - `404` - Not Found
  - `500` - Internal Server Error

  ---

  ## 📝 File Upload Guidelines

  ### Photo Upload for Topics
  - **Supported Formats**: jpg, jpeg, png, webp, gif
  - **Maximum Size**: 5MB
  - **Storage**: AWS S3 in `topics/` folder
  - **Naming**: `topic-{id}-{timestamp}.{extension}`

  ### CSV Upload Guidelines
  - **Encoding**: UTF-8
  - **Headers**: Required as specified in examples
  - **Data Validation**: Automatic validation and error reporting

  ---

  ## 🔒 Role-Based Access Control

  | Endpoint | Required Role |
  |----------|---------------|
  | Cities (GET) | ADMIN+ |
  | Batches (GET) | ADMIN+ |
  | Batches (POST) | TEACHER+ |
  | Topics (GET) | ADMIN+ |
  | Topics (POST/PATCH/DELETE) | TEACHER+ |
  | Questions (GET) | ADMIN+ |
  | Questions (POST/PATCH/DELETE) | TEACHER+ |
  | Classes (GET) | ADMIN+ |
  | Classes (POST/PATCH/DELETE) | TEACHER+ |
  | Students (GET) | ADMIN+ |
  | Students (POST/PATCH/DELETE) | TEACHER+ |
  | Statistics | ADMIN+ |
  | Leaderboard | ADMIN+ |

  ---

  ## 📱 Frontend Integration Examples

  ### React Component Example for Topic with Photo
  ```tsx
  interface Topic {
    id: number;
    topic_name: string;
    slug: string;
    photo_url?: string;
    description?: string;
  }

  const TopicCard: React.FC<{ topic: Topic }> = ({ topic }) => {
    return (
      <div className="topic-card">
        {topic.photo_url && (
          <img 
            src={topic.photo_url} 
            alt={topic.topic_name}
            className="topic-photo"
            onError={(e) => {
              e.currentTarget.src = '/default-topic.jpg';
            }}
          />
        )}
        <div className="topic-content">
          <h3>{topic.topic_name}</h3>
          {topic.description && (
            <p>{topic.description}</p>
          )}
        </div>
      </div>
    );
  };
  ```

  ### File Upload Example
  ```tsx
  const CreateTopicForm: React.FC = () => {
    const [formData, setFormData] = useState({
      topic_name: '',
      description: ''
    });
    const [photo, setPhoto] = useState<File | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      
      const formDataToSend = new FormData();
      formDataToSend.append('topic_name', formData.topic_name);
      if (photo) {
        formDataToSend.append('photo', photo);
      }

      try {
        const response = await fetch('/api/admin/topics', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formDataToSend
        });
        
        const result = await response.json();
        console.log('Topic created:', result);
      } catch (error) {
        console.error('Error creating topic:', error);
      }
    };

    return (
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={formData.topic_name}
          onChange={(e) => setFormData({...formData, topic_name: e.target.value})}
          placeholder="Topic Name"
          required
        />
        
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setPhoto(e.target.files?.[0] || null)}
        />
        
        <button type="submit">Create Topic</button>
      </form>
    );
  };
  ```

  ---

  ## 🚀 Performance Tips

  1. **Pagination**: Use pagination for large datasets
  2. **Caching**: Cache topic and question data client-side
  3. **Image Optimization**: Compress images before upload
  4. **Batch Operations**: Use bulk endpoints for multiple operations
  5. **Lazy Loading**: Load images on demand for better performance

  ---

  ## 📅 Version History

  - **v2.0.0** - Added topic photo upload feature
  - **v1.5.0** - Enhanced student progress tracking
  - **v1.0.0** - Initial API implementation

  ---

  This documentation provides a comprehensive guide for integrating with the DSA Tracker Admin API. For any questions or support, refer to the backend development team.
