# HealEase Backend

Recovery tracking API with AI-powered behavioral insights and community features.

[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Express](https://img.shields.io/badge/Express-4-000000?style=flat-square&logo=express&logoColor=white)](https://expressjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?style=flat-square&logo=prisma&logoColor=white)](https://www.prisma.io/)

[🌐 Live API](https://healease-server.onrender.com) · [📱 Frontend Repo](https://github.com/BarcDevs/HealEase--client)

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Architecture](#architecture)
- [Database Schema](#database-schema)
- [Setup](#setup)
- [API Endpoints](#api-endpoints)
- [AI Features](#ai-features)
- [Scripts](#scripts)
- [Testing](#testing)
- [Deployment](#deployment)
- [Security](#security)
- [Monitoring](#monitoring)
- [Development Guidelines](#development-guidelines)
- [Troubleshooting](#troubleshooting)
- [License](#license)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 18+ |
| Framework | Express + TypeScript |
| Database | Neon PostgreSQL |
| ORM | Prisma |
| Authentication | JWT + bcrypt |
| AI | Google Gemini API |
| Monitoring | Sentry |
| Deployment | Render |

---

## Project Structure

```
backend/
├── src/
│   ├── config/
│   │   ├── database.ts          # Prisma client initialization and connection setup
│   │   └── env.ts               # Environment variable loading and validation
│   │
│   ├── middleware/
│   │   ├── auth.ts              # JWT verification; attaches user to request
│   │   ├── errorHandler.ts      # Global error handler; formats and returns error responses
│   │   └── validation.ts        # Zod schema validation for request bodies
│   │
│   ├── routes/
│   │   ├── auth.ts              # /api/auth — register, login
│   │   ├── checkins.ts          # /api/checkins — create, list, stats
│   │   ├── posts.ts             # /api/posts — post CRUD, replies, notifications
│   │   └── users.ts             # /api/users — profile, settings
│   │
│   ├── controllers/
│   │   ├── authController.ts    # Handles register/login, issues JWT
│   │   ├── checkinController.ts # Handles check-in submission and stats aggregation
│   │   ├── postController.ts    # Handles post/reply creation and retrieval
│   │   └── userController.ts    # Handles profile reads and updates
│   │
│   ├── services/
│   │   ├── aiService.ts         # Gemini API integration; generates feedback from check-in history
│   │   ├── authService.ts       # Password hashing, JWT signing, credential verification
│   │   └── notificationService.ts # Creates and dispatches in-app notifications
│   │
│   ├── types/
│   │   ├── express.d.ts         # Extends Express Request with userId and other custom fields
│   │   └── ErrorFactory.ts             # Shared domain types (User, Checkin, Post, etc.)
│   │
│   └── server.ts                # App entry point; registers middleware, routes, and starts server
│
├── prisma/
│   ├── schema.prisma            # Database schema — models, relations, enums
│   └── migrations/              # Auto-generated migration history
│
├── package.json                 # Dependencies and npm scripts
├── tsconfig.json                # TypeScript compiler configuration
└── README.md
```

---

## Architecture

```mermaid
graph TD
  %% ── ACTORS ─────────────────────────────────────────────────────────────
  PATIENT(["👤 Patient"])
  THERAPIST(["🩺 Therapist / Admin"])

  %% ── FRONTEND ────────────────────────────────────────────────────────────
  subgraph FE["🖥️Frontend — React · TypeScript · Next.js"]
      FE_CI["Daily Check-in Form"]
      FE_FORUM["Forum — Posts & Replies"]
      FE_PROFILE["Profile Settings"]
      FE_INSIGHT["AI Insight Panel"]
  end

  %% ── AUTH ────────────────────────────────────────────────────────────────
  subgraph AUTH["🔐 Auth — JWT · RBAC"]
      JWT["JWT Middleware"]
      RBAC["Role Guard<br/>Patient · Therapist · Admin"]
  end

  %% ── BACKEND ─────────────────────────────────────────────────────────────
  subgraph BE["⚙️ Backend — Node.js · Express"]
      API_CI["POST /check-in"]
      API_FORUM["GET · POST /forum"]
      API_PROFILE["PUT /profile"]
      VALIDATE["Input Validation"]
      JOB_QUEUE["Background Job Queue"]
  end

  %% ── REAL-TIME ───────────────────────────────────────────────────────────
  subgraph RT["⚡ Real-time — Socket.io · Redis"]
      SOCKET["Socket.io Server"]
      REDIS["Redis Pub/Sub"]
  end

  %% ── DATABASE ────────────────────────────────────────────────────────────
  subgraph DB["🗄️Database — PostgreSQL · Prisma"]
      DB_USERS[("users")]
      DB_CI[("check_ins")]
      DB_FORUM[("posts / replies")]
      DB_STREAK[("streaks")]
  end

  %% ── AI FEEDBACK LAYER ───────────────────────────────────────────────────
  subgraph AI["🤖 AI Feedback Layer — OpenAI API"]
      AI_LOGIC["Feedback Algorithm"]
      STREAK_CHECK{"streak < threshold?"}
      MOOD_CHECK{"mood falling<br/>3 days in a row?"}
      MSG_MOT["💬 Motivational Message"]
      MSG_ALERT["🚨 Alert — Flag for Therapist"]
      MSG_SUM["📊 Weekly Activity Summary"]
      OPENAI["OpenAI API Call"]
      AI_OUT["Feedback Result"]
  end

  %% ── FLOWS ───────────────────────────────────────────────────────────────

  %% Entry points
  PATIENT --> FE_CI & FE_FORUM & FE_PROFILE
  THERAPIST --> FE_FORUM

  %% Auth gate
  FE_CI & FE_FORUM & FE_PROFILE --> JWT --> RBAC
  JWT -.->|"verify token"| DB_USERS

  %% Flow 1: Daily Check-in
  RBAC -->|"check-in request"| API_CI --> VALIDATE
  VALIDATE -->|"❌ invalid"| FE_CI
  VALIDATE -->|"✅ valid"| DB_CI
  DB_CI --> DB_STREAK --> JOB_QUEUE

  %% AI pipeline
  JOB_QUEUE -->|"trigger AI job"| AI_LOGIC --> STREAK_CHECK
  STREAK_CHECK -->|"Yes"| MSG_MOT
  STREAK_CHECK -->|"No"| MOOD_CHECK
  MOOD_CHECK -->|"Yes"| MSG_ALERT
  MOOD_CHECK -->|"No"| MSG_SUM
  MSG_MOT & MSG_ALERT & MSG_SUM --> OPENAI --> AI_OUT
  AI_OUT -->|"display insight"| FE_INSIGHT
  MSG_ALERT -->|"push alert"| SOCKET

  %% Flow 2: Forum Engagement
  RBAC -->|"forum request"| API_FORUM --> DB_FORUM
  DB_FORUM -->|"new reply event"| SOCKET --> REDIS -->|"broadcast"| FE_FORUM
  REDIS -->|"alert notification"| THERAPIST

  %% Flow 3: Profile Management
  RBAC -->|"profile update"| API_PROFILE --> DB_USERS
```

### Key Flows

**Daily Check-in** — Patient submits a check-in → validated → saved to `check_ins` + `streaks` → background job triggers the AI pipeline → Gemini generates a motivational message, trend alert, or weekly summary → result pushed to the AI Insight Panel for the patient to review.

**Forum Engagement** — Authenticated request passes the JWT + RBAC guard → post/reply written to `posts/replies` → a `new reply` event fires through Socket.io → Redis broadcasts the update to all subscribed clients in real time.

**Profile Management** — Profile update passes auth → written directly to `users` table.

---

## Database Schema

### Users
| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| email | String | Unique |
| username | String | Unique |
| password | String | Hashed |
| firstName | String | Core identity |
| lastName | String | Core identity |
| role | Enum | USER · ADMIN |
| lastCheckInAt | DateTime | Optional |
| createdAt | DateTime | |
| active | Boolean | Account status |
| deleted_at | DateTime | Optional, soft delete |

### Profile
| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| userId | UUID | FK → Users, 1-to-1 unique |
| image | String | Optional, avatar URL |
| bio | String | Optional, max 500 chars |
| location | String | Optional, broad/regional only |
| timezone | String | Optional, IANA timezone |
| healthInterests | Relation | Many-to-many via ProfileHealthInterest |
| activityPreferences | Relation | Many-to-many via ProfileActivityPreference |
| createdAt | DateTime | Auto-created with User |
| updatedAt | DateTime | Updated on profile changes |

### HealthInterest (Master Table)
| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| slug | String | Unique, URL-safe identifier |
| name | String | Display name |
| description | String | Optional |
| category | String | Optional, for UI grouping |
| sortOrder | Int | Optional, for ranking |
| isActive | Boolean | Soft-delete flag |
| createdAt | DateTime | |
| updatedAt | DateTime | |

### ActivityPreference (Master Table)
| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| slug | String | Unique, URL-safe identifier |
| name | String | Display name |
| description | String | Optional |
| category | String | Optional, for UI grouping |
| sortOrder | Int | Optional, for ranking |
| isActive | Boolean | Soft-delete flag |
| createdAt | DateTime | |
| updatedAt | DateTime | |

### ProfileHealthInterest (Junction)
| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| profileId | UUID | FK → Profile |
| healthInterestId | UUID | FK → HealthInterest |
| addedAt | DateTime | Timestamp |

### ProfileActivityPreference (Junction)
| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| profileId | UUID | FK → Profile |
| activityPreferenceId | UUID | FK → ActivityPreference |
| addedAt | DateTime | Timestamp |

### DailyCheckIn
| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| userId | UUID | FK → Users |
| checkInDate | Date | User's local calendar date (UTC midnight) |
| moodScore | Int | 1–10 |
| painLevel | Int | 1–10 |
| activities | String[] | |
| notes | String | Optional |
| createdAt | DateTime | |
| updatedAt | DateTime | Set on PATCH, null on first create |

### Posts
| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| userId | UUID | FK → Users |
| title | String | |
| content | String | |
| category | Enum | `recovery` · `support` · `tips` |
| createdAt | DateTime | |
| updatedAt | DateTime | |

### Replies
| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| postId | UUID | FK → Posts |
| userId | UUID | FK → Users |
| content | String | |
| createdAt | DateTime | |

### Notifications
| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| userId | UUID | FK → Users |
| type | Enum | `reply` · `mention` |
| message | String | |
| link | String | |
| read | Boolean | |
| createdAt | DateTime | |

---

## Setup

### Prerequisites

- Node.js 18+
- PostgreSQL or a [Neon](https://neon.tech) account
- Google Gemini API key

### Installation

1. **Clone and install dependencies**
   ```bash
   git clone https://github.com/BarcDevs/HealEase--server.git
   cd HealEase--server
   npm install
   ```

2. **Create `.env` file**
   ```env
   NODE_ENV=development
   PORT=3000
   DATABASE_URL=postgresql://user:password@host/healease
   JWT_SECRET=your-secret-key
   GEMINI_API_KEY=your-gemini-api-key
   SENTRY_DSN=your-sentry-dsn
   ```

3. **Set up the database**
   ```bash
   npx prisma generate
   npm run migrate
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

---

## API Endpoints

All endpoints are prefixed with `/api/v1`. Full interactive documentation is available at `/api-docs` in development.

### Authentication

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/v1/auth/login` | — | Login and receive JWT cookie |
| `POST` | `/api/v1/auth/signup` | — | Register new user |
| `GET` | `/api/v1/auth/csrf` | — | Get CSRF token |
| `GET` | `/api/v1/auth/logout` | Cookie | Logout and clear session |
| `GET` | `/api/v1/auth/me` | Cookie | Get current user profile |
| `GET` | `/api/v1/auth/forgot-password/:email` | — | Send password reset email |
| `POST` | `/api/v1/auth/confirm-email` | — | Confirm email address |
| `PUT` | `/api/v1/auth/reset-password` | — | Reset password with token |

### Check-ins *(protected)*

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/v1/check-in` | Cookie | Get check-in history |
| `POST` | `/api/v1/check-in` | Cookie + CSRF | Create today's check-in (409 if exists) |
| `PATCH` | `/api/v1/check-in` | Cookie + CSRF | Update today's check-in (404 if none) |
| `GET` | `/api/v1/check-in/stats` | Cookie | Get aggregated check-in stats |
| `GET` | `/api/v1/check-in/progress-insights` | Cookie | Get weekly progress narrative (7-day vs 7-day comparison) |

### Forum *(protected)*

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/v1/forum/posts` | Cookie | List posts (supports `?tag=`) |
| `POST` | `/api/v1/forum/posts` | Cookie + CSRF | Create new post |
| `GET` | `/api/v1/forum/posts/:postId` | Cookie | Get single post |
| `PUT` | `/api/v1/forum/posts/:postId` | Cookie + CSRF | Update post |
| `DELETE` | `/api/v1/forum/posts/:postId` | Cookie + CSRF | Delete post |
| `GET` | `/api/v1/forum/replies` | Cookie | List replies |
| `POST` | `/api/v1/forum/replies` | Cookie + CSRF | Add reply to a post |
| `PUT` | `/api/v1/forum/replies/:replyId` | Cookie + CSRF | Update reply |
| `DELETE` | `/api/v1/forum/replies/:replyId` | Cookie + CSRF | Delete reply |
| `GET` | `/api/v1/forum/tags` | Cookie | List all tags |
| `GET` | `/api/v1/forum/votes` | Cookie + CSRF | Vote on a post or reply |

### Profile *(protected)*

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/v1/profile` | Cookie | Get user profile with interests/activities |
| `PATCH` | `/api/v1/profile` | Cookie + CSRF | Update profile (image, bio, location, timezone) |
| `POST` | `/api/v1/profile/health-interests` | Cookie + CSRF | Add health interests by slug |
| `DELETE` | `/api/v1/profile/health-interests/:slug` | Cookie + CSRF | Remove health interest |
| `POST` | `/api/v1/profile/activities` | Cookie + CSRF | Add activity preferences by slug |
| `DELETE` | `/api/v1/profile/activities/:slug` | Cookie + CSRF | Remove activity preference |
| `GET` | `/api/v1/profile/list/health-interests` | — | List all available health interests |
| `GET` | `/api/v1/profile/list/activities` | — | List all available activity preferences |

### Recovery Goals *(protected)*

Structured goal tracking with milestones and progress calculation. Complete reference in [`docs/API.md`](docs/API.md).

**Postman Collection:** [`postman/HealEase-RecoveryGoals.collection.json`](postman/HealEase-RecoveryGoals.collection.json)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/v1/goals` | Cookie | List all goals with progress |
| `POST` | `/api/v1/goals` | Cookie + CSRF | Create goal (category: physical/mental/lifestyle) |
| `GET` | `/api/v1/goals/:goalId` | Cookie | Get goal with milestones |
| `PATCH` | `/api/v1/goals/:goalId` | Cookie + CSRF | Update goal (status: paused/abandoned only) |
| `DELETE` | `/api/v1/goals/:goalId` | Cookie + CSRF | Delete goal and milestones |
| `POST` | `/api/v1/goals/:goalId/milestones` | Cookie + CSRF | Create milestones (1–8 per goal) |
| `PATCH` | `/api/v1/goals/:goalId/milestones/:milestoneId` | Cookie + CSRF | Update milestone (title/description/order) |
| `PATCH` | `/api/v1/goals/:goalId/milestones/:milestoneId/complete` | Cookie + CSRF | Mark milestone complete (unlocks next) |
| `DELETE` | `/api/v1/goals/:goalId/milestones/:milestoneId` | Cookie + CSRF | Delete milestone |
| `PATCH` | `/api/v1/goals/:goalId/complete` | Cookie + CSRF | Mark goal complete (all milestones must be done) |

---

## AI Features

Powered by **Google Gemini API** for personalized recovery insights and conversation.

### AI Chat
Patients can chat with an AI assistant to ask questions, get support, and discuss their recovery journey. The chat is context-aware, referencing the patient's check-in history and recovery patterns.

### Automated Insights

| Property | Detail |
|---|---|
| Trigger | Automatically after check-in submission |
| Processing | Async, non-blocking |
| Context | Last 7 check-ins for trend analysis |
| Fallback | Generic encouraging message if API fails |
| Rate limiting | Implemented to respect free-tier limits |

### Insight Types

1. **Daily Motivation** — Personalized encouragement based on today's scores
2. **Trend Analysis** — Detects patterns in mood and pain over time
3. **Activity Suggestions** — Recommendations derived from recent activity log

---

## Scripts

```bash
npm run dev      # Start with hot reload
npm run build    # Compile TypeScript
npm start        # Run compiled code
npm run migrate  # Run Prisma migrations
npm run seed     # Seed database with test data
```

---

## Testing

### Manual Testing

```bash
# Sign up a new user
curl -X POST http://localhost:3000/api/v1/auth/signup \
  -H 'Content-Type: application/json' \
  -d '{"email":"test@example.com","firstName":"Test","lastName":"User","password":"Password123"}'

# Create a check-in (replace <token> with JWT from login)
curl -X POST http://localhost:3000/api/v1/check-in \
  -H 'Content-Type: application/json' \
  -H 'Cookie: accessToken=<token>' \
  -H 'x-csrf-token: <csrfToken>' \
  -d '{"moodScore":7,"painLevel":3,"activities":["walking","stretching"],"notes":"Feeling better today"}'
```

---

## Deployment

Hosted on **Render**. Configuration:

| Property | Value |
|---|---|
| Build command | `npm install && npx prisma generate && npm run build` |
| Start command | `npm start` |

### Required Environment Variables

```
NODE_ENV
PORT
DATABASE_URL
JWT_SECRET
GEMINI_API_KEY
SENTRY_DSN
```

---

## Security

| Measure | Detail |
|---|---|
| Password hashing | bcrypt, 10 rounds |
| JWT expiration | 7 days |
| CSRF protection | Enabled |
| Rate limiting | 100 requests / 15 min per IP |
| Input validation | Joi schemas |
| SQL injection | Prevented by Prisma parameterized queries |

---

## Monitoring

| Concern | Solution |
|---|---|
| Error tracking | Sentry integration |
| Logging | Console in dev · structured JSON in production |
| Health check | `GET /health` |

---

## Development Guidelines

### Code Style

- No semicolons unless syntactically required
- ESLint + Prettier enforced via pre-commit hooks
- TypeScript strict mode enabled

### Commit Convention

```
feat: add check-in streak calculation
fix: handle missing aiFeedback gracefully
chore: update Prisma schema for notifications
```

### Branch Strategy

```
main        # production-ready
develop     # integration branch
feature/*   # new features
fix/*       # bug fixes
```

---

## Troubleshooting

**Database connection fails**
- Verify `DATABASE_URL` is correct in `.env`
- Confirm the Neon project is active and not paused
- Check that `npx prisma generate` has been run after schema changes

**AI feedback not generating**
- Confirm `GEMINI_API_KEY` is valid and has quota remaining
- Check server logs for Gemini API error responses
- Feedback generation is async — allow a few seconds after check-in creation

**JWT token invalid**
- Ensure `JWT_SECRET` matches between token signing and verification
- Check that the `Authorization` header uses the `Bearer <token>` format
- Tokens expire after 7 days — request a fresh token via login

---

## License

MIT © [Bar Cohen](https://bardevs.com)

For support or questions: [barcprodevelopments@gmail.com](mailto:barcprodevelopments@gmail.com) · [LinkedIn](https://www.linkedin.com/in/barcohendev)
