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
│   │   ├── database.ts
│   │   └── env.ts
│   ├── middleware/
│   │   ├── auth.ts
│   │   ├── errorHandler.ts
│   │   └── validation.ts
│   ├── routes/
│   │   ├── auth.ts
│   │   ├── checkins.ts
│   │   ├── posts.ts
│   │   └── users.ts
│   ├── controllers/
│   │   ├── authController.ts
│   │   ├── checkinController.ts
│   │   ├── postController.ts
│   │   └── userController.ts
│   ├── services/
│   │   ├── aiService.ts
│   │   ├── authService.ts
│   │   └── notificationService.ts
│   ├── types/
│   │   ├── express.d.ts
│   │   └── index.ts
│   └── server.ts
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── package.json
├── tsconfig.json
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

**Daily Check-in** — Patient submits a check-in → validated → saved to `check_ins` + `streaks` → background job triggers the AI pipeline → Gemini generates a motivational message, trend alert, or weekly summary → result pushed to the AI Insight Panel. If a mood-decline pattern is detected, a real-time alert is also pushed to the therapist via Socket.io.

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
| passwordHash | String | |
| fullName | String | |
| notificationsEnabled | Boolean | |
| createdAt | DateTime | |
| updatedAt | DateTime | |

### Checkins
| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| userId | UUID | FK → Users |
| moodScore | Int | 1–10 |
| painLevel | Int | 1–10 |
| activities | String[] | |
| notes | String | Optional |
| aiFeedback | String | Optional, generated async |
| createdAt | DateTime | |

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

### Authentication

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Create new user |
| `POST` | `/api/auth/login` | Login and get JWT token |

### Check-ins *(protected)*

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/checkins` | Create daily check-in |
| `GET` | `/api/checkins` | Get user's check-ins (supports `?limit=`) |
| `GET` | `/api/checkins/stats` | Get aggregated stats |

### Forum Posts *(protected)*

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/posts` | Create new post |
| `GET` | `/api/posts` | List posts (supports `?category=`) |
| `GET` | `/api/posts/:id` | Get single post with replies |
| `POST` | `/api/posts/:id/replies` | Add reply to post |

### Users *(protected)*

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/users/me` | Get current user profile |
| `PATCH` | `/api/users/me` | Update profile |
| `PATCH` | `/api/users/me/settings` | Update notification preferences |

### Notifications *(protected)*

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/notifications` | Get user notifications |
| `PATCH` | `/api/notifications/:id/read` | Mark notification as read |

---

## AI Features

Powered by **Google Gemini API** for personalized recovery insights.

### How It Works

| Property | Detail |
|---|---|
| Trigger | Automatically after check-in submission |
| Processing | Async, non-blocking |
| Context | Last 7 check-ins for trend analysis |
| Fallback | Generic encouraging message if API fails |
| Rate limiting | Implemented to respect free-tier limits |

### Feedback Types

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
# Register a new user
curl -X POST http://localhost:3000/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"test@example.com","username":"testuser","password":"Password123","fullName":"Test User"}'

# Create a check-in (replace <token> with JWT from login)
curl -X POST http://localhost:3000/api/checkins \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <token>' \
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
| Input validation | Zod schemas |
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

- Arrow functions exclusively — never `function` declarations
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
