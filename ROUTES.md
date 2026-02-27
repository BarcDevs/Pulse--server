# HealEase API — Route Map

**Base URL:** `http://localhost:3000`
**API prefix:** `/api/v1`

All responses follow the shape `{ message: string, data: T }`.
Error responses follow `{ message: string, error: string }`.

**Auth** = requires `accessToken` cookie (set by login)
**CSRF** = requires `x-csrf-token` header + `_csrf` cookie (both provided by login)

---

## Server

### `GET /api/status`
> No auth required

**Response `200`**
```json
{ "message": "Server is running", "data": {} }
```

---

## Auth — `/api/v1/auth`

---

### `POST /login`

**Body**
| Field      | Type    | Required | Notes                           |
|------------|---------|----------|---------------------------------|
| `email`    | string  | yes      | Valid `.com` / `.net` email     |
| `password` | string  | yes      | Min 8 chars, letter + digit     |
| `remember` | boolean | no       | Extends session cookie lifetime |

**Response `200`**
```json
{
  "message": "Login successful",
  "data": {
    "token": "eyJhbGci...",
    "_csrf": "csrf-token-string"
  }
}
```
Sets `accessToken` and `_csrf` cookies.

**Errors:** `400` validation · `401` invalid credentials

---

### `POST /signup`

**Body**
| Field       | Type   | Required | Notes                       |
|-------------|--------|----------|-----------------------------|
| `firstName` | string | yes      | Alphanumeric                |
| `lastName`  | string | yes      | Alphanumeric                |
| `username`  | string | no       | Auto-generated if omitted   |
| `email`     | string | yes      | Valid `.com` / `.net` email |
| `password`  | string | yes      | Min 8 chars, letter + digit |

**Response `201`**
```json
{
  "message": "User created successfully",
  "data": {
    "user": {
      "id": "string",
      "firstName": "string",
      "lastName": "string",
      "username": "string",
      "email": "string",
      "role": "USER | ADMIN",
      "image?": "string"
    }
  }
}
```

**Errors:** `400` validation or email already in use

---

### `GET /csrf`
> Auth required

**Response `200`**
```json
{
  "message": "CSRF token generated",
  "data": { "_csrf": "csrf-token-string" }
}
```

**Errors:** `401` not authenticated

---

### `GET /me`
> Auth required

**Response `200`**
```json
{
  "message": "...",
  "data": {
    "user": {
      "id": "string",
      "firstName": "string",
      "lastName": "string",
      "username": "string",
      "email": "string",
      "role": "USER | ADMIN",
      "image?": "string"
    }
  }
}
```

**Errors:** `401` not authenticated

---

### `GET /logout`

**Response `200`**
```json
{ "message": "Logged out successfully", "data": {} }
```
Clears the `accessToken` cookie.

---

### `GET /forget-password/:email`

**Params:** `email` — the account email to send OTP to

**Response `200`**
```json
{ "message": "OTP sent", "data": {} }
```

**Errors:** `400` validation · `404` email not found

---

### `POST /confirm-email`
> CSRF required

**Body**
| Field   | Type   | Required |
|---------|--------|----------|
| `email` | string | yes      |
| `OTP`   | number | yes      |

**Response `201`**
```json
{
  "message": "Email confirmed",
  "data": {
    "user": {
      "id": "string",
      "firstName": "string",
      "lastName": "string",
      "username": "string",
      "email": "string",
      "role": "USER | ADMIN",
      "image?": "string"
    }
  }
}
```

**Errors:** `400` invalid or expired OTP

---

### `PUT /reset-password`
> CSRF required

**Body**
| Field         | Type   | Required | Notes                            |
|---------------|--------|----------|----------------------------------|
| `email`       | string | yes      | Valid `.com` / `.net` email      |
| `newPassword` | string | yes      | Min 8 chars, alphanumeric        |
| `userOTP`     | number | yes      | OTP received via forget-password |

**Response `200`**
```json
{
  "message": "Password reset successfully",
  "data": {
    "user": {
      "id": "string",
      "firstName": "string",
      "lastName": "string",
      "username": "string",
      "email": "string",
      "role": "USER | ADMIN",
      "image?": "string"
    }
  }
}
```

**Errors:** `400` invalid or expired OTP

---

## Forum — `/api/v1/forum`

---

### `GET /posts`

**Query**
| Param      | Type   | Notes                                       |
|------------|--------|---------------------------------------------|
| `limit`    | number | Max 100                                     |
| `page`     | number |                                             |
| `filter`   | string | `newest` · `popular` · `hot` · `unanswered` |
| `search`   | string | Full-text search                            |
| `tag`      | string | Filter by tag name                          |
| `category` | string | Filter by category                          |

**Response `200`**
```json
{
  "message": "N posts found",
  "data": [
    {
      "id": "string",
      "title": "string",
      "body": "string",
      "category": "string",
      "views": 0,
      "votes": {
        "upvotes": 0,
        "downvotes": 0,
        "upvotedBy": ["userId"],
        "downvotedBy": ["userId"]
      },
      "tags": [{ "id": "string", "name": "string" }],
      "replies": []
    }
  ]
}
```

**Errors:** `404` no posts found

---

### `POST /posts`
> Auth + CSRF required

**Body**
| Field      | Type     | Required |
|------------|----------|----------|
| `title`    | string   | yes      |
| `body`     | string   | yes      |
| `category` | string   | yes      |
| `tags`     | string[] | yes      |

**Response `200`**
```json
{
  "message": "Post created successfully",
  "data": {
    "id": "string",
    "title": "string",
    "body": "string",
    "category": "string",
    "views": 0,
    "votes": {
      "upvotes": 0,
      "downvotes": 0,
      "upvotedBy": [],
      "downvotedBy": []
    },
    "tags": [{ "id": "string", "name": "string" }],
    "replies": []
  }
}
```

**Errors:** `400` validation · `401` not authenticated or invalid CSRF

---

### `GET /posts/:postId`

**Response `200`**
```json
{
  "message": "Post <id> found",
  "data": {
    "id": "string",
    "title": "string",
    "body": "string",
    "category": "string",
    "views": 0,
    "votes": {
      "upvotes": 0,
      "downvotes": 0,
      "upvotedBy": ["userId"],
      "downvotedBy": ["userId"]
    },
    "tags": [{ "id": "string", "name": "string" }],
    "replies": [{ "id": "string", "body": "string" }]
  }
}
```

**Errors:** `404` post not found

---

### `PUT /posts/:postId`
> Auth + CSRF required · Owner only

**Body** _(all fields optional)_
| Field      | Type     | Notes                                      |
|------------|----------|--------------------------------------------|
| `title`    | string   |                                            |
| `body`     | string   |                                            |
| `category` | string   |                                            |
| `tags`     | string[] |                                            |
| `vote`     | object   | `{ userId: string, vote: "up" \| "down" }` |

**Response `200`**
```json
{
  "message": "Post <id> updated",
  "data": {
    "id": "string",
    "title": "string",
    "body": "string",
    "category": "string",
    "views": 0,
    "votes": {
      "upvotes": 0,
      "downvotes": 0,
      "upvotedBy": ["userId"],
      "downvotedBy": ["userId"]
    },
    "tags": [{ "id": "string", "name": "string" }],
    "replies": []
  }
}
```

**Errors:** `400` validation · `401` not authenticated or invalid CSRF · `403` not the post owner

---

### `DELETE /posts/:postId`
> Auth + CSRF required · Owner only

**Response `200`**
```json
{ "message": "Post <id> deleted!", "data": {} }
```

**Errors:** `401` not authenticated or invalid CSRF · `403` not the post owner

---

### `GET /posts/:postId/reply`

**Response `200`**
```json
{
  "message": "N Replies for post <id> found",
  "data": [
    {
      "id": "string",
      "body": "string",
      "votes": {
        "upvotes": 0,
        "downvotes": 0,
        "upvotedBy": ["userId"],
        "downvotedBy": ["userId"]
      }
    }
  ]
}
```

**Errors:** `404` no replies found

---

### `POST /posts/:postId/reply`
> Auth + CSRF required

**Body**
| Field  | Type   | Required |
|--------|--------|----------|
| `body` | string | yes      |

**Response `200`**
```json
{
  "message": "Reply created successfully",
  "data": {
    "id": "string",
    "body": "string",
    "votes": {
      "upvotes": 0,
      "downvotes": 0,
      "upvotedBy": [],
      "downvotedBy": []
    }
  }
}
```

**Errors:** `400` validation · `401` not authenticated or invalid CSRF

---

### `PUT /posts/:postId/reply/:replyId`
> Auth + CSRF required · Owner only

**Body** _(all fields optional)_
| Field  | Type   | Notes                                      |
|--------|--------|--------------------------------------------|
| `body` | string |                                            |
| `vote` | object | `{ userId: string, vote: "up" \| "down" }` |

**Response `200`**
```json
{
  "message": "Reply <id> updated",
  "data": {
    "id": "string",
    "body": "string",
    "votes": {
      "upvotes": 0,
      "downvotes": 0,
      "upvotedBy": ["userId"],
      "downvotedBy": ["userId"]
    }
  }
}
```

**Errors:** `400` validation · `401` not authenticated or invalid CSRF · `403` not the reply owner

---

### `DELETE /posts/:postId/reply/:replyId`
> Auth + CSRF required · Owner only

**Response `200`**
```json
{ "message": "Reply <id> deleted", "data": {} }
```

**Errors:** `401` not authenticated or invalid CSRF · `403` not the reply owner

---

### `GET /tags`

**Query**
| Param    | Type   | Notes          |
|----------|--------|----------------|
| `limit`  | number | Max 100        |
| `page`   | number |                |
| `filter` | string | `popular`      |
| `search` | string | Search by name |

**Response `200`**
```json
{
  "message": "N tags found",
  "data": [
    {
      "id": "string",
      "name": "string",
      "description?": "string",
      "posts?": "number",
      "followers?": "number"
    }
  ]
}
```

**Errors:** `404` no tags found

---

### `GET /tags/:tagId`

**Response `200`**
```json
{
  "message": "Tag <id> found",
  "data": {
    "id": "string",
    "name": "string",
    "description?": "string",
    "posts?": "number",
    "followers?": "number"
  }
}
```

**Errors:** `404` tag not found

---

## Check-In — `/api/v1/check-in`

---

### `GET /`
> Auth required

**Query**
| Param   | Type   | Notes   |
|---------|--------|---------|
| `limit` | number | 1 – 100 |

**Response `200`**
```json
{
  "message": "...",
  "data": [
    {
      "id": "string",
      "moodScore": 7,
      "painLevel": 3,
      "activities": ["walking", "stretching"],
      "notes?": "string",
      "insights": [
        { "id": "string", "type": "string", "content": "string" }
      ]
    }
  ]
}
```

**Errors:** `401` not authenticated

---

### `POST /`
> Auth + CSRF required

**Body**
| Field        | Type     | Required | Notes                          |
|--------------|----------|----------|--------------------------------|
| `moodScore`  | number   | yes      | 1 – 10                         |
| `painLevel`  | number   | yes      | 1 – 10                         |
| `activities` | string[] | yes      | Min 1 item, each max 100 chars |
| `notes`      | string   | no       | Max 500 chars                  |

**Response `201`**
```json
{
  "message": "...",
  "data": {
    "id": "string",
    "moodScore": 7,
    "painLevel": 3,
    "activities": ["walking", "stretching"],
    "notes?": "string",
    "insights": [
      { "id": "string", "type": "string", "content": "string" }
    ]
  }
}
```

**Errors:** `400` validation · `401` not authenticated or invalid CSRF

---

### `GET /stats`
> Auth required

**Response `200`**
```json
{
  "message": "...",
  "data": {
    "totalCheckIns": 10,
    "averageMoodScore": 6.5,
    "averagePainLevel": 3.2,
    "topActivities": ["walking", "stretching"],
    "currentStreak": 3,
    "longestStreak": 7
  }
}
```

**Errors:** `401` not authenticated
