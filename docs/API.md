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

### `GET /google`
> No auth required

Initiates the Google OAuth sign-in flow. Generates a state parameter, stores it in an httpOnly cookie (10-minute expiry), and redirects to Google's authorization page.

**Response `302`** - Redirects to Google OAuth consent screen

---

### `GET /google/callback`
> No auth required - Called by Google after user authorization

Validates the state parameter against the stored cookie, exchanges the authorization code for tokens, finds or creates the user account, and sets auth cookies.

**Query Parameters**
| Param   | Type   | Notes                              |
|---------|--------|------------------------------------|
| `code`  | string | Authorization code from Google     |
| `state` | string | State parameter for CSRF protection |

**Response `302`** - Redirects to `CLIENT_URL` with `accessToken` and `_csrf` cookies set

**Errors:** `401` invalid state, missing code, unverified email, or authentication failure

---

### `GET /refresh`
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
      "createdAt": "ISO 8601 date",
      "active": "boolean",
      "profile?": {
        "image": "string | null",
        "timezone": "string | null",
        "theme": "light | dark",
        "language": "string",
        "lastCheckInAt": "ISO 8601 date | null"
      }
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

### `GET /forgot-password/:email`
> Rate limited: 5 requests per 15 minutes

**Params:** `email` — the account email to send OTP to

**Response `200`**
```json
{
  "message": "If the email exists, we sent you an OTP",
  "data": { "OTP": null }
}
```

**Dev Mode:** OTP returned in response for testing (null in production)

**Errors:** `400` validation error

**Security Note:** Returns 200 for both existent and non-existent emails to prevent user enumeration

---

### `POST /confirm-email`
> Rate limited: 5 requests per 15 minutes

**Body**
| Field   | Type   | Required | Notes                              |
|---------|--------|----------|-----------------------------------|
| `email` | string | yes      | Valid `.com` / `.net` email        |
| `OTP`   | number | yes      | 6-digit OTP from forgot-password   |

**Response `201`**
```json
{
  "message": "Email confirmed successfully",
  "data": {
    "user": {
      "id": "string",
      "firstName": "string",
      "lastName": "string",
      "username": "string",
      "email": "string",
      "role": "USER | ADMIN"
    }
  }
}
```

**Errors:** `400` invalid or expired OTP

**Security Note:** CSRF not required (stateless OTP validation)

---

### `PUT /reset-password`
> Rate limited: 5 requests per 15 minutes

**Body**
| Field         | Type   | Required | Notes                                        |
|---------------|--------|----------|----------------------------------------------|
| `email`       | string | yes      | Valid `.com` / `.net` email                  |
| `newPassword` | string | yes      | Min 8 chars, requires letter + digit (special chars allowed) |
| `userOTP`     | number | yes      | 6-digit OTP from forgot-password             |

**Response `200`**
```json
{
  "message": "Password has changed successfully",
  "data": {
    "user": {
      "id": "string",
      "firstName": "string",
      "lastName": "string",
      "username": "string",
      "email": "string",
      "role": "USER | ADMIN"
    }
  }
}
```

**Errors:** `400` invalid or expired OTP

**Security Note:** CSRF not required (stateless OTP validation) · Returns 200 for both existent and non-existent emails to prevent user enumeration

---

## Users — `/api/v1/users`

---

### `PATCH /me`
> Auth + CSRF required

**Body** _(all fields optional)_
| Field       | Type   | Notes                       |
|-------------|--------|----------------------------|
| `firstName` | string | Min 1, max 100 chars        |
| `lastName`  | string | Min 1, max 100 chars        |
| `username`  | string | Min 3, max 30 alphanumeric  |

**Response `200`**
```json
{
  "message": "User updated successfully",
  "data": {
    "user": {
      "id": "string",
      "firstName": "string",
      "lastName": "string",
      "username": "string",
      "role": "USER | ADMIN"
    }
  }
}
```

**Errors:** `400` validation · `401` not authenticated · `409` email/username already in use

---

### `PATCH /password`
> Auth + CSRF required

**Body**
| Field             | Type   | Required | Notes                        |
|-------------------|--------|----------|------------------------------|
| `currentPassword` | string | yes      | User's current password      |
| `newPassword`     | string | yes      | Min 8 chars, letter + digit  |

**Response `200`**
```json
{
  "message": "Password updated successfully",
  "data": {
    "user": {
      "id": "string",
      "firstName": "string",
      "lastName": "string",
      "username": "string",
      "email": "string",
      "role": "USER | ADMIN"
    }
  }
}
```

**Errors:** `400` validation · `401` invalid current password or not authenticated

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
        "upvotedBy": ["userId"]
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
      "upvotedBy": []
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
      "upvotedBy": ["userId"]
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
      "upvotedBy": ["userId"]
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

### `GET /posts/:postId/replies`

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
        "upvotedBy": ["userId"]
      }
    }
  ]
}
```

**Errors:** `404` no replies found

---

### `POST /posts/:postId/replies`
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
      "upvotedBy": []
    }
  }
}
```

**Errors:** `400` validation · `401` not authenticated or invalid CSRF

---

### `PUT /posts/:postId/replies/:replyId`
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
      "upvotedBy": ["userId"]
    }
  }
}
```

**Errors:** `400` validation · `401` not authenticated or invalid CSRF · `403` not the reply owner

---

### `DELETE /posts/:postId/replies/:replyId`
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
      "userId": "string",
      "checkInDate": "ISO 8601 date",
      "moodScore": 7,
      "painLevel": 3,
      "activities": ["walking", "stretching"],
      "notes?": "string",
      "createdAt": "ISO 8601 date",
      "updatedAt?": "ISO 8601 date | null",
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
> Auth + CSRF required · Creates or updates today's check-in (idempotent). Falls back to update if check-in already exists.

**Body**
| Field        | Type     | Required | Notes                          |
|--------------|----------|----------|--------------------------------|
| `moodScore`  | number   | yes      | 1 – 10                         |
| `painLevel`  | number   | yes      | 1 – 10                         |
| `activities` | string[] | yes      | Min 1 item, each max 100 chars |
| `notes`      | string   | no       | Max 500 chars                  |

**Response `201` (new check-in created)**
```json
{
  "message": "Check-in created successfully",
  "data": {
    "id": "string",
    "userId": "string",
    "checkInDate": "ISO 8601 date",
    "moodScore": 7,
    "painLevel": 3,
    "activities": ["walking", "stretching"],
    "notes?": "string",
    "createdAt": "ISO 8601 date",
    "updatedAt": null,
    "insights": [
      { "id": "string", "type": "string", "content": "string" }
    ]
  }
}
```

**Response `200` (existing check-in updated)**
```json
{
  "message": "Check-in updated successfully",
  "data": {
    "id": "string",
    "userId": "string",
    "checkInDate": "ISO 8601 date",
    "moodScore": 7,
    "painLevel": 3,
    "activities": ["walking", "stretching"],
    "notes?": "string",
    "createdAt": "ISO 8601 date",
    "updatedAt": "ISO 8601 date",
    "insights": [
      { "id": "string", "type": "string", "content": "string" }
    ]
  }
}
```

**Errors:** `400` validation · `401` not authenticated or invalid CSRF

---

### `PATCH /`
> Auth + CSRF required · Updates today's check-in. Returns `404` if none exists — use `POST` to create.

**Body** (at least one field required)
| Field        | Type     | Required | Notes                          |
|--------------|----------|----------|--------------------------------|
| `moodScore`  | number   | no       | 1 – 10                         |
| `painLevel`  | number   | no       | 1 – 10                         |
| `activities` | string[] | no       | Min 1 item, each max 100 chars |
| `notes`      | string   | no       | Max 500 chars, nullable        |

**Response `200`**
```json
{
  "message": "...",
  "data": {
    "id": "string",
    "userId": "string",
    "checkInDate": "ISO 8601 date",
    "moodScore": 9,
    "painLevel": 3,
    "activities": ["walking", "meditation"],
    "notes?": "string",
    "createdAt": "ISO 8601 date",
    "updatedAt": "ISO 8601 date",
    "insights": [
      { "id": "string", "type": "string", "content": "string" }
    ]
  }
}
```

**Errors:** `400` validation · `401` not authenticated or invalid CSRF · `404` no check-in found for today

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

---

### `GET /progress-insights`
> Auth required · No CSRF needed (read-only)

Generates a human-readable summary of recovery progress by comparing the last 7 days against the previous 7 days. Includes trend classification, metric deltas, and highlights.

**Response `200`**
```json
{
  "message": "Progress insights generated",
  "data": {
    "summary": "Your mood improved this week, averaging 8.0 compared to 6.0. Activity consistency increased to 80%.",
    "trend": "improving",
    "highlights": {
      "improvements": ["mood improvement", "pain reduction"],
      "regressions": []
    },
    "period": {
      "currentStart": "ISO 8601 date",
      "currentEnd": "ISO 8601 date",
      "previousStart": "ISO 8601 date",
      "previousEnd": "ISO 8601 date"
    },
    "metadata": {
      "moodDelta": 2,
      "painDelta": -1.5,
      "activityConsistency": 0.8
    }
  }
}
```

**Response fields**
| Field | Type | Notes |
|-------|------|-------|
| `summary` | string | 2–4 sentence narrative (AI-generated or fallback) |
| `trend` | string | One of: `improving`, `declining`, `stable`, `mixed` |
| `highlights.improvements` | string[] | Metrics that improved (empty if stable/declining) |
| `highlights.regressions` | string[] | Metrics that declined (empty if stable/improving) |
| `period.currentStart` | ISO 8601 | Start of last 7 days |
| `period.currentEnd` | ISO 8601 | End of last 7 days |
| `period.previousStart` | ISO 8601 | Start of previous 7 days |
| `period.previousEnd` | ISO 8601 | End of previous 7 days |
| `metadata.moodDelta` | number | Mood change (current vs previous avg) |
| `metadata.painDelta` | number | Pain change (current vs previous avg, negative = improvement) |
| `metadata.activityConsistency` | number | Ratio of active days to total days (0–1) |

**Behavior**

- **Trend classification:** Based on changes across mood, pain, and activity:
  - `improving` — 2+ metrics improved
  - `declining` — 2+ metrics declined
  - `stable` — all deltas within stable range (±0.25)
  - `mixed` — conflicting metrics
- **Insufficient data:** If user has < 2 check-ins in current period, returns fallback insight with trend `stable` and message "Not enough data yet to detect trends. Keep checking in to unlock insights."
- **Caching:** Results cached for 10 minutes per unique time window to avoid redundant AI calls. Cache invalidates automatically on new check-in.
- **AI failure:** If summary generation fails, returns deterministic fallback summary instead of error.

**Errors:** `401` not authenticated

**Examples**

**Improving trend:**
```json
{
  "trend": "improving",
  "summary": "Your mood improved this week, averaging 8.0 compared to 6.0. Activity consistency increased to 80%.",
  "highlights": { "improvements": ["mood improvement", "activity increase"], "regressions": [] }
}
```

**Declining trend:**
```json
{
  "trend": "declining",
  "summary": "Your mood declined this week to 5.0 from 7.0. Pain levels increased slightly.",
  "highlights": { "improvements": [], "regressions": ["mood decline", "pain increase"] }
}
```

**Stable trend:**
```json
{
  "trend": "stable",
  "summary": "Your recovery remains stable this week. Mood averaged 7.0, consistent with the previous period.",
  "highlights": { "improvements": [], "regressions": [] }
}
```

**Mixed trend:**
```json
{
  "trend": "mixed",
  "summary": "Your recovery shows mixed signals this week. Mood improved to 8.0 while pain increased slightly.",
  "highlights": { "improvements": ["mood improvement"], "regressions": ["pain increase"] }
}
```

---

## Profile — `/api/v1/profile`

---

### `GET /`
> Auth required

Retrieve the current user's profile with interests and activities.

**Response `200`**
```json
{
  "message": "Profile retrieved successfully",
  "data": {
    "id": "profile-123",
    "userId": "user-123",
    "image": "https://example.com/avatar.jpg",
    "bio": "Health recovery journey",
    "location": "San Francisco, CA",
    "timezone": "America/Los_Angeles",
    "healthInterests": [
      { "id": "hi-1", "slug": "mental-health", "name": "Mental Health", "category": "Wellness" }
    ],
    "activityPreferences": [
      { "id": "ap-1", "slug": "meditation", "name": "Meditation", "category": "Mindfulness" }
    ],
    "createdAt": "ISO 8601 date",
    "updatedAt": "ISO 8601 date"
  }
}
```

**Errors:** `401` not authenticated

---

### `PATCH /`
> Auth required + CSRF token

Update user profile presentation and preferences.

**Body**
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `image` | string / null | no | Avatar URL or null to clear |
| `bio` | string / null | no | Max 500 chars, null to clear |
| `location` | string / null | no | Broad region (no coordinates), null to clear |
| `timezone` | string / null | no | IANA timezone (e.g., "America/New_York"), null for UTC |

**Example Request**
```json
{
  "bio": "Recovery advocate & meditation enthusiast",
  "timezone": "America/Denver"
}
```

**Response `200`**
```json
{
  "message": "Profile updated successfully",
  "data": { /* profile object */ }
}
```

**Errors:** `400` invalid timezone · `401` not authenticated or invalid CSRF

---

### `POST /health-interests`
> Auth required + CSRF token

Add health interests to the user's profile.

**Body**
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `slugs` | string[] | yes | Array of interest slugs (e.g., ["mental-health", "stress-management"]) |

**Example Request**
```json
{
  "slugs": ["mental-health", "stress-management"]
}
```

**Response `200`**
```json
{
  "message": "Health interests added successfully",
  "data": { /* updated profile object */ }
}
```

**Errors:** `400` invalid slug · `401` not authenticated or invalid CSRF · `404` interest not found

---

### `DELETE /health-interests/:slug`
> Auth required + CSRF token

Remove a health interest from the user's profile.

**Path Parameters**
| Param | Type | Notes |
|-------|------|-------|
| `slug` | string | Interest slug (e.g., "mental-health") |

**Response `200`**
```json
{
  "message": "Health interest removed successfully",
  "data": { /* updated profile object */ }
}
```

**Errors:** `401` not authenticated or invalid CSRF · `404` interest not found

---

### `POST /activities`
> Auth required + CSRF token

Add activity preferences to the user's profile.

**Body**
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `slugs` | string[] | yes | Array of activity slugs (e.g., ["meditation", "yoga"]) |

**Example Request**
```json
{
  "slugs": ["meditation", "yoga", "walking"]
}
```

**Response `200`**
```json
{
  "message": "Activity preferences added successfully",
  "data": { /* updated profile object */ }
}
```

**Errors:** `400` invalid slug · `401` not authenticated or invalid CSRF · `404` activity not found

---

### `DELETE /activities/:slug`
> Auth required + CSRF token

Remove an activity preference from the user's profile.

**Path Parameters**
| Param | Type | Notes |
|-------|------|-------|
| `slug` | string | Activity slug (e.g., "meditation") |

**Response `200`**
```json
{
  "message": "Activity preference removed successfully",
  "data": { /* updated profile object */ }
}
```

**Errors:** `401` not authenticated or invalid CSRF · `404` activity not found

---

### `GET /list/health-interests`
> No auth required

List all available health interests for the platform.

**Query Parameters (Optional)**
| Param | Type | Notes |
|-------|------|-------|
| N/A | - | - |

**Response `200`**
```json
{
  "message": "10 health interests available",
  "data": [
    {
      "id": "hi-1",
      "slug": "mental-health",
      "name": "Mental Health",
      "category": "Wellness",
      "sortOrder": 1,
      "description": "Psychological wellbeing and mental health support"
    },
    {
      "id": "hi-2",
      "slug": "physical-therapy",
      "name": "Physical Therapy",
      "category": "Recovery",
      "sortOrder": 2
    }
  ]
}
```

**Errors:** None (always returns 200)

---

### `GET /list/activities`
> No auth required

List all available activity preferences for the platform.

**Response `200`**
```json
{
  "message": "15 activity preferences available",
  "data": [
    {
      "id": "ap-1",
      "slug": "meditation",
      "name": "Meditation",
      "category": "Mindfulness",
      "sortOrder": 1,
      "description": "Mindfulness and meditation practices"
    },
    {
      "id": "ap-2",
      "slug": "yoga",
      "name": "Yoga",
      "category": "Physical",
      "sortOrder": 2
    }
  ]
}
```

**Errors:** None (always returns 200)

---

## Recovery Goals — `/api/v1/recovery-goals`

---

### `POST /`
> Auth + CSRF required

Create a new recovery goal for the current user.

**Body**
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `title` | string | yes | Max 150 chars |
| `description` | string | no | Max 1000 chars |
| `category` | string | yes | `physical` · `mental` · `lifestyle` |
| `targetDate` | string | no | ISO 8601 date string |
| `isPrimary` | boolean | no | Default: `false` · Only one per user |

**Response `201`**
```json
{
  "message": "Goal created successfully",
  "data": {
    "id": "clh1234567890abcdef",
    "profileId": "profile-123",
    "title": "Build a consistent sleep schedule",
    "description": "Establish a regular sleep routine for better recovery",
    "category": "lifestyle",
    "isPrimary": true,
    "status": "active",
    "targetDate": "2026-07-23",
    "progress": 0,
    "createdAt": "2026-04-08T10:00:00Z",
    "updatedAt": "2026-04-08T10:00:00Z"
  }
}
```

**Errors:** `400` validation · `401` not authenticated or invalid CSRF · `409` if `isPrimary=true` and primary goal already exists

---

### `GET /`
> Auth required

Retrieve all recovery goals for the current user with progress calculated.

**Response `200`**
```json
{
  "message": "Goals retrieved successfully",
  "data": [
    {
      "id": "clh1234567890abcdef",
      "profileId": "profile-123",
      "title": "Build a consistent sleep schedule",
      "description": "Establish a regular sleep routine",
      "category": "lifestyle",
      "isPrimary": true,
      "status": "active",
      "targetDate": "2026-07-23",
      "progress": 0.5,
      "createdAt": "2026-04-08T10:00:00Z",
      "updatedAt": "2026-04-08T10:00:00Z"
    }
  ]
}
```

**Errors:** `401` not authenticated

---

### `GET /stats`
> Auth required

Retrieve aggregated statistics for all recovery goals and milestones for the current user. Supports optional filtering by date range and category.

**Query Parameters** _(all optional)_
| Param | Type | Notes |
|-------|------|-------|
| `fromDate` | string | ISO 8601 date-time (e.g., `2026-01-01T00:00:00Z`) — filter stats from this date |
| `toDate` | string | ISO 8601 date-time (e.g., `2026-12-31T23:59:59Z`) — filter stats until this date |
| `category` | string | `PHYSICAL` · `MENTAL` · `LIFESTYLE` — filter goals by category (milestones inherit via goal relation) |

**Response `200`**
```json
{
  "message": "Stats retrieved successfully",
  "data": {
    "goals": {
      "totalCreated": 12,
      "completed": 3,
      "completionRate": 0.25,
      "streak": 5,
      "active": 6,
      "paused": 2,
      "byCategory": {
        "PHYSICAL": 5,
        "MENTAL": 4,
        "LIFESTYLE": 3
      }
    },
    "milestones": {
      "totalCreated": 32,
      "completed": 8,
      "completionRate": 0.25,
      "streak": 5,
      "active": 12,
      "paused": 10
    }
  }
}
```

**Fields**
| Field | Type | Notes |
|-------|------|-------|
| `totalCreated` | number | Total goals or milestones created (unfiltered by status) |
| `completed` | number | Count of completed goals or milestones |
| `completionRate` | number | Ratio of completed to totalCreated (0.00–1.00), 0 if totalCreated is 0 |
| `streak` | number | Consecutive calendar days with ≥1 completion event (goal OR milestone combined) |
| `active` | number | Count of active/locked (non-completed, non-paused) items |
| `paused` | number | Count of paused or abandoned items |
| `byCategory` | object | _(goals only)_ Count of goals per category (PHYSICAL, MENTAL, LIFESTYLE) |

**Errors:** `401` not authenticated

---

### `GET /:goalId`
> Auth required

Retrieve a single recovery goal with all its milestones and progress.

**Path Parameters**
| Param | Type | Notes |
|-------|------|-------|
| `goalId` | string | The goal ID |

**Response `200`**
```json
{
  "message": "Goal retrieved successfully",
  "data": {
    "goal": {
      "id": "clh1234567890abcdef",
      "profileId": "profile-123",
      "title": "Build a consistent sleep schedule",
      "description": "Establish a regular sleep routine",
      "category": "lifestyle",
      "isPrimary": true,
      "status": "active",
      "targetDate": "2026-07-23",
      "progress": 0.5,
      "createdAt": "2026-04-08T10:00:00Z",
      "updatedAt": "2026-04-08T10:00:00Z"
    },
    "milestones": [
      {
        "id": "mil1234567890abcdef",
        "goalId": "clh1234567890abcdef",
        "title": "No screens 1 hour before bed",
        "description": "Reduce blue light exposure",
        "order": 1,
        "status": "active",
        "completedAt": null,
        "createdAt": "2026-04-08T10:05:00Z",
        "updatedAt": "2026-04-08T10:05:00Z"
      }
    ]
  }
}
```

**Errors:** `401` not authenticated · `404` goal not found

---

### `PATCH /:goalId`
> Auth + CSRF required · Owner only

Update a recovery goal. Cannot modify milestones on non-active goals.

**Path Parameters**
| Param | Type | Notes |
|-------|------|-------|
| `goalId` | string | The goal ID |

**Body** _(all fields optional)_
| Field | Type | Notes |
|-------|------|-------|
| `title` | string | Max 150 chars |
| `description` | string | Max 1000 chars |
| `status` | string | `active` · `paused` · `abandoned` (completed is auto-managed by milestones) |
| `targetDate` | string | ISO 8601 date string, null to clear |
| `isPrimary` | boolean | Setting to `true` clears `isPrimary` from all other user goals |

**Response `200`**
```json
{
  "message": "Goal updated successfully",
  "data": {
    "id": "clh1234567890abcdef",
    "profileId": "profile-123",
    "title": "Updated title",
    "description": "Updated description",
    "category": "lifestyle",
    "isPrimary": true,
    "status": "paused",
    "targetDate": "2026-08-23",
    "progress": 0.5,
    "createdAt": "2026-04-08T10:00:00Z",
    "updatedAt": "2026-04-08T10:15:00Z"
  }
}
```

**Errors:** `400` validation · `401` not authenticated or invalid CSRF · `404` goal not found

---

### `DELETE /:goalId`
> Auth + CSRF required · Owner only

Delete a recovery goal and all its milestones (cascading delete).

**Path Parameters**
| Param | Type | Notes |
|-------|------|-------|
| `goalId` | string | The goal ID |

**Response `200`**
```json
{
  "message": "Goal deleted successfully",
  "data": null
}
```

**Errors:** `401` not authenticated or invalid CSRF · `404` goal not found

---

### `POST /:goalId/milestones`
> Auth + CSRF required

Create milestones for a goal. First milestone is `active`, rest are `locked`. Goal must be active.

**Path Parameters**
| Param | Type | Notes |
|-------|------|-------|
| `goalId` | string | The goal ID |

**Body**
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `milestones` | array | yes | 1-8 items, see structure below |
| `milestones[].title` | string | yes | Max 150 chars |
| `milestones[].description` | string | no | Max 1000 chars |
| `milestones[].order` | number | yes | Positive integer, unique per goal |

**Response `201`**
```json
{
  "message": "Milestones created successfully",
  "data": [
    {
      "id": "mil1234567890abcdef",
      "goalId": "clh1234567890abcdef",
      "title": "Establish bedtime routine",
      "description": "Set consistent sleep times",
      "order": 1,
      "status": "active",
      "completedAt": null,
      "createdAt": "2026-04-08T10:05:00Z",
      "updatedAt": "2026-04-08T10:05:00Z"
    }
  ]
}
```

**Errors:** `400` validation · `401` not authenticated or invalid CSRF · `404` goal not found · `409` goal not active or max 8 milestones exceeded

---

### `PATCH /:goalId/milestones/:milestoneId`
> Auth + CSRF required · Owner only

Update a milestone (title, description, order). Cannot modify completed milestones. Goal must be active.

**Path Parameters**
| Param | Type | Notes |
|-------|------|-------|
| `goalId` | string | The goal ID |
| `milestoneId` | string | The milestone ID |

**Body** _(all fields optional)_
| Field | Type | Notes |
|-------|------|-------|
| `title` | string | Max 150 chars |
| `description` | string | Max 1000 chars, null to clear |
| `order` | number | Positive integer, must be unique per goal |

**Response `200`**
```json
{
  "message": "Milestone updated successfully",
  "data": {
    "id": "mil1234567890abcdef",
    "goalId": "clh1234567890abcdef",
    "title": "Updated title",
    "description": "Updated description",
    "order": 2,
    "status": "locked",
    "completedAt": null,
    "createdAt": "2026-04-08T10:05:00Z",
    "updatedAt": "2026-04-08T10:15:00Z"
  }
}
```

**Errors:** `400` validation · `401` not authenticated or invalid CSRF · `404` milestone not found · `409` goal not active or milestone already completed

---

### `DELETE /:goalId/milestones/:milestoneId`
> Auth + CSRF required · Owner only

Delete a milestone from a goal. Goal must be active.

**Path Parameters**
| Param | Type | Notes |
|-------|------|-------|
| `goalId` | string | The goal ID |
| `milestoneId` | string | The milestone ID |

**Response `200`**
```json
{
  "message": "Milestone deleted successfully",
  "data": null
}
```

**Errors:** `401` not authenticated or invalid CSRF · `404` milestone not found · `409` goal not active

---

### `PATCH /:goalId/milestones/:milestoneId/complete`
> Auth + CSRF required

Mark a milestone as completed and automatically advance the next milestone to `active`. Last completed milestone completes the goal. Idempotent: completing an already-completed milestone succeeds without duplicate advancement.

**Path Parameters**
| Param | Type | Notes |
|-------|------|-------|
| `goalId` | string | The goal ID |
| `milestoneId` | string | The milestone ID |

**Response `200`**
```json
{
  "message": "Milestone completed successfully",
  "data": null
}
```

**Errors:** `401` not authenticated or invalid CSRF · `404` milestone or goal not found · `409` goal not active or milestone is locked

---

### `PATCH /:goalId/complete`
> Auth + CSRF required

Manually mark a goal as completed. Goal must be active and all milestones must be completed.

**Path Parameters**
| Param | Type | Notes |
|-------|------|-------|
| `goalId` | string | The goal ID |

**Response `200`**
```json
{
  "message": "Goal completed successfully",
  "data": {
    "id": "clh1234567890abcdef",
    "profileId": "profile-123",
    "title": "Build a consistent sleep schedule",
    "description": "Establish a regular sleep routine",
    "category": "lifestyle",
    "isPrimary": true,
    "status": "completed",
    "targetDate": "2026-07-23",
    "progress": 1,
    "createdAt": "2026-04-08T10:00:00Z",
    "updatedAt": "2026-04-08T10:30:00Z"
  }
}
```

**Errors:** `401` not authenticated or invalid CSRF · `404` goal not found · `409` goal not active, has no milestones, or has incomplete milestones
