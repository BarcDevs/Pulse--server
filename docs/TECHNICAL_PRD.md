> **Sync reminder**: On every update to this file, re-sync to [Notion](https://www.notion.so/Pulse-technical-PRD-3599e15469d280aa940cd64b53b46d38) via:
> ```bash
> ~/.local/bin/notion-update 3599e15469d280aa940cd64b53b46d38 write "$(cat docs/TECHNICAL_PRD.md)"
> ```

# Pulse — Technical Product Requirements

**Version**: 0.9 POC
**Last Updated**: 2026-05-30
**Owner**: @BarcDevs
**Repository**: Full-stack — server (`Pulse--server`) + client (`Pulse--client`)
**Notion**: [Technical PRD — Pulse](https://www.notion.so/Pulse-technical-PRD-3599e15469d280aa940cd64b53b46d38)

---

## Executive Summary

Pulse is a recovery support platform for patients transitioning from hospital or clinical care back home. The core value proposition is providing structure, visibility, and emotional support during recovery through daily check-ins, trend analytics, and community connection.

The platform centers on a single daily check-in ritual designed to encourage consistency and generate meaningful trend data for supportive insights.

---

## Product Vision

Recovery requires structure and visibility to maintain momentum.

Patients leaving clinical care face a critical gap: the loss of daily medical oversight and structured routine. Between appointments, motivation declines, progress becomes invisible, and recovery drifts without reinforcement.

Pulse fills this gap by creating:
1. A daily behavioral anchor (the check-in ritual)
2. Objective visibility into personal trends (charts and analytics)
3. Early detection of disengagement (pattern analysis)
4. Emotional support from a community of peers (forum and interaction)

---

## Problem Definition

### Current State
Patients transitioning from hospital/clinical care lack:
- **Structure**: No daily reinforcement of recovery goals
- **Visibility**: Progress is invisible day-to-day; hard to feel momentum
- **Support**: Limited emotional connection during vulnerable recovery phases
- **Early Warning**: No way to detect when engagement or progress is declining

### Desired State
Patients have:
- Daily accountability through a structured check-in ritual
- Clear visualization of personal recovery trends
- Early detection system to identify motivation drops
- Connection with others experiencing similar journeys

---

## Target Users

**Primary**: Patients (18+) recently discharged from hospital/clinical care
- Post-surgical recovery
- Post-hospitalization recovery from acute illness or mental health episodes
- Chronic condition management during recovery transitions

---

## Core User Flows

### Flow 1: Logged-Out User
```
Landing Page → Sign Up / Log In → Email verification → Home
```

### Flow 2: Check-In (Logged In)
```
Home (CTA: "Check In Today") → /check-in/new → Form → Submit → Dashboard/Overview
```

### Flow 3: Check-In Form Fields
- Mood score (1-10 slider)
- Pain level (1-10 slider)
- Activities (multi-select with recent suggestions)
- Notes (optional text area)

### Flow 4: Check-In Submission Behavior
```
1. User submits form
2. Client sends POST /api/v1/check-in
3. Server upserts: creates new check-in (201) or updates today's existing one (200)
4. On success: Redirect to check-in dashboard
```

No 409 conflict handling needed — the API handles same-day updates transparently.

### Flow 5: Dashboard
```
Check-In Overview → Mood/Pain Charts → Check-In History → Community Forum
```

---

## Check-In Model & Constraints

### Rule: One Primary Check-In Per Day
- Users can create one check-in per calendar day
- If submitted multiple times same day, the entry is updated (not duplicated)
- Timezone-aware (user's local timezone)

### Backend Behavior

**POST /api/v1/check-in**
- Upserts today's check-in: creates if none exists, updates if already submitted today
- Request body: `{ moodScore, painLevel, activities, notes }`
- Response (201): new check-in created — `{ message: string, data: CheckIn }`
- Response (200): existing check-in updated — `{ message: string, data: CheckIn }`

**PATCH /api/v1/check-in**
- Explicitly updates today's check-in (partial update, at least one field required)
- Returns 404 if no check-in exists for today — use POST to create
- Request body: `{ moodScore?, painLevel?, activities?, notes? }`
- Response (200): `{ message: string, data: CheckIn }`

**GET /api/v1/check-in**
- Fetches check-ins (optionally filtered by date range)
- Returns array of check-ins with insights included
- Query params: `?from=DATE&to=DATE`
- Response (200): `{ message: string, data: CheckIn[] }`

**GET /api/v1/check-in/stats**
- Aggregate statistics for dashboard
- Returns mood/pain averages, streak data, etc.
- Response (200): `{ message: string, data: Stats }`

### Check-In Data Structure

```typescript
{
  id: string
  userId: string
  checkInDate: Date          // Date only, not time
  moodScore: number          // 1-10
  painLevel: number          // 1-10
  activities: string[]       // Array of activity names
  notes?: string
  createdAt: Date
  updatedAt: Date
  insights?: Insight[]       // AI-generated insights
}
```

---

## Feature Specifications

### 1. Daily Check-In Form
- Mood scale: 1-10 slider
- Pain level: 1-10 slider
- Activities: Multi-select with quick-action suggestions (derived client-side from recent history)
- Notes: Optional text field (up to 1000 characters)
- Smart save: POST upserts (creates or updates same-day entry); use PATCH for explicit partial update
- Form validation with error feedback

### 2. Activity Suggestions (Client-Side)
Activities are suggested based on recent history:

**Algorithm**:
```
1. Fetch user's last 14 days of check-ins via GET /api/v1/check-in
2. Aggregate all activities across those check-ins
3. Count frequency for each activity
4. Rank by frequency (most common first)
5. Display top 5-7 as quick-action chips
6. Allow custom activity entry
```

**Implementation**: Derived on the client from GET /api/v1/check-in response, not from a dedicated suggestions endpoint.

### 3. Dashboard & Charts
- Check-in stats summary (streak, averages, total check-ins)
- Line chart: mood score over time (default: last 30 days)
- Line chart: pain level over time
- Check-in history list with expandable entries
- Progress insights section (7-day comparison with trend label)
- Recovery goals widget (active goals, milestone progress)

### 4. AI Insights

Two distinct AI insight surfaces:

**Per-Check-In Insights** — generated immediately after each check-in submission:
- `mood_drop_alert`: Latest 3 mood scores strictly decreasing — early disengagement signal
- `motivational`: Streak < 2 days — encouragement for new or inconsistent users
- `weekly_summary`: ≥ 5 check-ins AND streak ≥ 2 — progress summary for established habit

**Daily Observation** — cached AI-phrased observation, refreshed once per day:
- `activity_consistency`: ≥ 3 of last 5 check-ins include at least one activity
- `pain_improvement`: Average pain last 5 check-ins < average pain previous 5 check-ins
- `better_days_pattern`: ≥ 3 of last 5 check-ins have mood ≥ 7 AND pain ≤ 4
- `mood_stability`: Mood range ≤ 2 across last 5 check-ins
- `streak_consistency`: Current streak ≥ 5 consecutive days
- `checkin_consistency`: ≥ 10 lifetime check-ins (engagement fallback)

**Constraints**:
- Insights are explicitly labeled as AI-assisted and supportive, not medical advice
- Generated from aggregate patterns, not individual data points
- AI generation falls back to static templates if Gemini API fails
- Clearly distinguished from clinical guidance

### 5. Check-In History
Timeline view of past check-ins:
- Date, mood, pain, activities summary
- Expandable to view full entry
- Filterable by date range

### 6. User Profiles
Profiles include:
- Bio (up to 500 characters)
- Location (broad region, no coordinates)
- Timezone (IANA format; defaults to `Asia/Jerusalem` if unset; used for check-in date resolution and daily observation cache expiry)
- Image (avatar URL)
- Health interests (many-to-many junction; backend-supported; emerging personalization)
- Activity preferences (many-to-many junction; backend-supported; emerging personalization)

Profile is a separate entity from User — auto-created on signup. Identity fields (name, role) stay on User; presentation fields (bio, image, timezone) live on Profile.

**Planned fields (not yet API-supported)**: `dateOfBirth`, `recoveryType`, `careProvider` — client UI has placeholders pending server additions.

**Note**: Health interest and activity preference personalization is backend-supported but not yet fully surfaced in current client UX.

### 7. Community Forum
- Post creation (title, body, optional tags)
- Nested replies
- Voting per post/reply
- User profiles visible on posts
- Tag-based filtering
- Post/reply editing and deletion (by author or admin)

---

## System Architecture

### High-Level Data Flow
```
React Frontend (Next.js App Router + TanStack Query)
    ↓
React Context (Auth state) + TanStack Query (Server state)
    ↓
Axios API Client (with CSRF interceptor)
    ↓
Express Backend (/api/v1 routes)
    ↓
PostgreSQL (via Prisma ORM)
    ↓
Google AI API (for insight generation)
```

### Frontend Architecture
- **Framework**: Next.js 16 with App Router (file-based routing with layout groups)
- **State**: React Context (auth state) + TanStack Query (server state caching)
- **UI**: React 19 with shadcn/ui components and Radix UI
- **Styling**: TailwindCSS 4 + custom CSS variables
- **Forms**: react-hook-form + Zod validation
- **API Client**: Centralized Axios instance with automatic CSRF interceptor
- **Analytics**: Sentry for error tracking

### Backend Architecture
- **Server**: Express.js with middleware (auth, validation, error handling)
- **Database**: PostgreSQL with Prisma ORM
- **Auth**: JWT in HTTP-only cookies + CSRF tokens
- **Async Jobs**: Planned (not yet implemented); future for insight generation pipeline
- **Caching**: Session/token caching via Redis (future optimization)

---

## Data Model Overview

### Core Entities

**User** (identity + auth)
```
id, email, hashedPassword, firstName, lastName, username, googleId?,
role, createdAt, active, deleted_at
```

**Profile** (presentation + personalization — 1-to-1 with User, auto-created on signup)
```
id, userId, image?, bio?, location?, timezone (IANA, defaults to Asia/Jerusalem),
theme, language, lastCheckInAt?
```

**CheckIn**
```
id, userId, checkInDate (DATE only, not datetime), moodScore (1-10),
painLevel (1-10), activities (string[]), notes?, createdAt, updatedAt?
```
Unique constraint: `userId + checkInDate` — one check-in per user per calendar day.

**Insight** (per-check-in AI insight)
```
id, userId, checkInId, type (mood_drop_alert | motivational | weekly_summary),
content, generatedAt
```

**DailyObservation** (cached daily AI observation — separate from per-check-in insights)
```
id, userId, type (activity_consistency | pain_improvement | better_days_pattern |
mood_stability | streak_consistency | checkin_consistency),
observation, supportiveDescription, icon, generatedAt, expiresAt
```

**RecoveryGoal**
```
id, profileId, title, description?, category (physical | mental | lifestyle),
isPrimary, status (active | paused | completed | abandoned),
targetDate?, progress (0–1), createdAt, updatedAt
```

**GoalMilestone**
```
id, goalId, title, description?, order, status (active | locked | completed),
completedAt?, createdAt, updatedAt
```

**Post** (forum)
```
id, userId, title, body, category, tags (string[]), views, createdAt, updatedAt
```

**Reply** (forum)
```
id, postId, userId, body, createdAt, updatedAt
```

**PostLike / ReplyLike** (forum engagement)
```
userId, postId/replyId
```

**Tag** (forum)
```
id, slug, label (en, he?), description?
```

**HealthInterest** (master list)
```
id, slug, name, category, sortOrder, isActive, createdAt, updatedAt
```

**ProfileHealthInterest** (junction table)
```
profileId, healthInterestId
```

**ActivityPreference** (master list)
```
id, slug, name, category, sortOrder, isActive, createdAt, updatedAt
```

**ProfileActivityPreference** (junction table)
```
profileId, activityPreferenceId
```

---

## API Interaction Model

### Base URL & Response Format

```
Base URL: http://localhost:3000
API Prefix: /api/v1
```

**Success Response**:
```json
{
  "message": "Operation successful",
  "data": { /* typed response */ }
}
```

**Error Response**:
```json
{
  "message": "User-friendly error message",
  "error": "error_code_or_description"
}
```

### Auth Endpoints — /api/v1/auth

**POST /login** — `{ email, password, remember? }` → 200 User + sets cookies

**POST /signup** — `{ email, password, firstName, lastName, username? }` → 201 User

**GET /google** — Redirect to Google OAuth consent screen (no auth required)

**GET /google/callback** — OAuth code exchange; finds/creates user; sets cookies; redirects to client

**GET /refresh** — Regenerate CSRF token → 200 `{ _csrf }`

**GET /me** — Current user + profile → 200 User

**GET /logout** — Clear cookies → 200

**GET /forgot-password/:email** — Send OTP to email → 200 (always, to prevent enumeration)

**POST /confirm-email** — `{ email, OTP }` → 201 User (confirms OTP, activates account)

**POST /change-email** — Auth + CSRF — `{ newEmail, password }` → 200, sends OTP to new address

**POST /confirm-email-change** — Auth + CSRF — `{ OTP }` → 200, atomically updates email

**PUT /reset-password** — `{ email, newPassword, userOTP }` → 200 User

### Check-In Endpoints — /api/v1/check-in

**POST /** — Upsert today's check-in
```
Request: { moodScore: 1-10, painLevel: 1-10, activities: string[], notes?: string }
Response 201: new check-in created
Response 200: existing check-in updated (already submitted today)
```

**PATCH /** — Partial update on today's check-in (at least one field required)
```
Request: { moodScore?, painLevel?, activities?, notes? }
Response 200: updated CheckIn
Response 404: no check-in for today (use POST to create)
```

**GET /** — Fetch check-ins (auth required)
```
Query: ?limit=N (1-100)
Response 200: CheckIn[] with insights[]
```

**GET /stats** — Aggregate stats
```
Response 200: { totalCheckIns, averageMoodScore, averagePainLevel, topActivities, currentStreak, longestStreak }
```

**GET /progress-insights** — AI-phrased 7-day vs previous-7-day comparison
```
Response 200: { summary, trend (improving|declining|stable|mixed), highlights, period, metadata }
Cached 10 minutes per time window. Falls back to static template if AI fails.
```

### Users Endpoints — /api/v1/users

**PATCH /me** — Update identity fields (auth + CSRF)
```
Request: { firstName?, lastName?, username? }
Response 200: User
Note: bio, location, image, timezone are Profile fields — use PATCH /profile instead
```

**PATCH /password** — Change password (auth + CSRF)
```
Request: { currentPassword, newPassword }
Response 200: User
```

### Profile Endpoints — /api/v1/profile

**GET /**
```
Response 200: { message, data: Profile }
```

**PATCH /**
```
Request: { bio?, location?, timezone?, image? }
Response 200: { message, data: Profile }
```

**POST /health-interests**
```
Request: { healthInterestSlugs: string[] }
Response 200: { message, data: Profile }
```

**DELETE /health-interests/:slug**
```
Response 200: { message }
```

**POST /activities**
```
Request: { activityPreferenceSlugs: string[] }
Response 200: { message, data: Profile }
```

**DELETE /activities/:slug**
```
Response 200: { message }
```

**GET /list/health-interests**
```
Response 200: { message, data: HealthInterest[] }
```

**GET /list/activities**
```
Response 200: { message, data: ActivityPreference[] }
```

### Insight Endpoints — /api/v1/insight

**GET /observation** — Daily AI observation (auth required, no CSRF)
```
Response 200: { title, type, observation, supportiveDescription, icon } or null
Cached until midnight in user's timezone. Fallback to static template if Gemini fails.
Detection types (priority order): activity_consistency, pain_improvement,
  better_days_pattern, mood_stability, streak_consistency, checkin_consistency
```

### Recovery Goal Endpoints — /api/v1/recovery-goals

**POST /** — Create goal (auth + CSRF) — `{ title, category, description?, targetDate?, isPrimary? }` → 201 Goal

**GET /** — List all goals, optionally filtered by status → 200 Goal[]

**GET /stats** — Aggregate stats: completion rates, streaks, category breakdown → 200

**GET /:goalId** — Single goal with all milestones → 200 `{ goal, milestones[] }`

**PATCH /:goalId** — Update goal fields or status (auth + CSRF) → 200 Goal

**DELETE /:goalId** — Delete goal + all milestones (auth + CSRF, cascading) → 200

**POST /:goalId/milestones** — Create milestones in bulk (auth + CSRF), 1-8 per goal → 201 Milestone[]

**PATCH /:goalId/milestones/:milestoneId** — Update milestone title/description/order → 200

**DELETE /:goalId/milestones/:milestoneId** — Delete milestone (goal must be active) → 200

**PATCH /:goalId/milestones/:milestoneId/complete** — Mark milestone complete; auto-advances next → 200

**PATCH /:goalId/complete** — Manually complete goal (all milestones must be complete) → 200

### Forum Endpoints — /api/v1/forum

**GET /posts** — `?limit&page&filter&search&tag&category` → 200 Post[]

**POST /posts** — Auth + CSRF — `{ title, body, category, tags }` → 200 Post

**GET /posts/categories** — Distinct categories with post counts → 200

**GET /posts/saved** — Auth — Current user's saved posts → 200 Post[]

**GET /posts/:postId** → 200 Post with replies

**PUT /posts/:postId** — Auth + CSRF, owner only — `{ title?, body?, category?, tags? }` → 200

**DELETE /posts/:postId** — Auth + CSRF, owner only → 200

**POST /posts/:postId/like** — Auth + CSRF — Toggle like/unlike → 200 `{ liked, likes }`

**POST /posts/:postId/save** — Auth + CSRF — Toggle save/unsave → 200 `{ saved }`

**GET /posts/:postId/replies** → 200 Reply[]

**POST /posts/:postId/replies** — Auth + CSRF — `{ body }` → 200 Reply

**PUT /posts/:postId/replies/:replyId** — Auth + CSRF, owner only → 200

**DELETE /posts/:postId/replies/:replyId** — Auth + CSRF, owner only → 200

**POST /posts/:postId/replies/:replyId/like** — Auth + CSRF — Toggle like → 200 `{ liked, likes }`

**GET /tags** — `?limit&page&filter&search` → 200 Tag[]

**GET /tags/:tagId** → 200 Tag

**POST /tags/unknown** — Auth + CSRF — Report unknown tag name (upserts attempt count) → 200

**GET /tags/unknown** — Auth + Admin — All unknown tag attempts sorted by count → 200

**GET /recommendations** — Auth — Pre-computed post recommendations based on latest check-in → 200 `{ status, isStale, posts[], generatedAt, basedOnCheckInId }`

---

## AI Insight Pipeline (High Level)

### Two Pipelines

**Per-Check-In Pipeline**
```
1. User submits check-in → POST /api/v1/check-in
2. After upsert committed, fetch last N check-ins for user
3. decideInsightType() evaluates mood trend, streak, check-in count
4. Determine type: mood_drop_alert | motivational | weekly_summary
5. Generate AI-phrased content via Gemini, store in Insight table
6. Return insight with check-in response
```

**Daily Observation Pipeline**
```
1. GET /api/v1/insight/observation (on-demand, first call each day)
2. Fetch last 30 days of check-ins
3. Run detection rules in priority order (6 types)
4. If pattern detected: generate AI observation via Gemini
5. Cache result until midnight in user's timezone
6. Return typed observation or null if no pattern detected
```

### Progress Insights (separate, comparison-based)
```
GET /api/v1/check-in/progress-insights
Compare last 7 days vs previous 7 days across mood, pain, activity
Generate AI narrative via Gemini; cached 10 minutes per time window
Fallback to deterministic template if AI fails
```

### Constraints
- All AI generation via Google Gemini API (not OpenAI)
- Insights are labeled "AI-assisted" and supportive, not medical diagnosis
- No individual identifiable data sent externally — aggregated patterns only
- All pipelines have static fallback templates when Gemini is unavailable
- Insights are explicitly not a substitute for clinical guidance

---

## Metrics for Success

**Engagement**
- Daily Active Users (DAU)
- Check-in completion rate (% of registered users with check-in today)
- Consecutive check-in streak distribution

**Retention**
- 7-day retention rate
- 30-day retention rate
- Churn rate (users inactive >14 days)

**Community**
- Forum posts per week
- Forum engagement (replies, votes)
- Unique forum users per week

**Platform Health**
- API response time (p95 < 200ms)
- Error rate (target < 0.5%)
- TypeScript type safety (100% strict)

---

## Non-Goals (Current Phase)

- Medical diagnosis or clinical decision support
- Integration with electronic health records (EHR)
- Mobile native apps (responsive web for now)
- Medication tracking
- Integration with wearables or health devices
- Third-party data imports
- Therapist or physician dashboards (future product expansion)

**Explicitly deferred AI behaviors** (require data maturity + medical/legal review before building):
- Recommendation engines and predictive suggestions
- Adaptive wellness coaching
- Intervention and proactive guidance systems
- Emotional diagnosis
- Personalized recovery plans
- Conversational coaching loops

**Deferred (not current phase):**
- Real-time direct messaging (Socket.io — Phase 2)
- AI Chat (client stub exists; backend and full client implementation deferred to scaling)

---

## Future Roadmap

### Shipped (post-POC)
- Google OAuth sign-in — server fully implemented; client has redirect flow (wired up)
- Recovery goals + milestone tracking — full CRUD on server + client
- Daily AI observation endpoint — server implemented; client integrated (behind `insights` feature flag)
- Progress insights — 7-day comparison endpoint on server
- Forum: likes, saves, categories, search, unknown tag reporting, recommendations
- Email change flow (OTP-based)
- Profile settings: bio, location, timezone, health interests, activity preferences

### In Progress / Feature-Flagged
- **Daily Reflection card** — dashboard card powered by `GET /insight/observation`; already live on dashboard
- **AI Insights page** (`insights: false` on client) — separate full insights page; real data fetching deferred to scaling
- **AI Chat** (`chat: false` on client) — page stub exists; real API implementation deferred to scaling
- **Notifications** (`notifications: false` on client) — UI shell exists (header bell, settings page with push/AI insights/milestone toggles); no backend implementation yet; scaling-deferred

### Phase 2: Enhanced Community (Planned)
- Direct messaging between users (Socket.io)
- Care circles (group recovery support with permission-based access)
- Moderation and safety controls

### Phase 3: Notifications & Reminders (In-flight → production)
- Push notifications for check-in reminders
- Weekly progress summaries via email
- Alerts on mood/pain threshold changes

### Phase 4: Scaling Features (Client-Deferred)
- **Profile completeness**: `dateOfBirth`, `recoveryType`, `careProvider` fields (server API not yet supporting)
- **Profile level system**: gamification/progress level badge on profile card (server changes needed)
- **Profile image upload**: camera button present on client, hidden behind flag; needs upload API
- **Mentors**: sidebar mentor card is mocked; needs mentor matching API
- **Share Progress**: share check-in/goal progress externally
- **Backfill check-ins**: allow users to log up to 3 past check-ins on onboarding
- **Post translation**: translate forum posts/comments to user's language
- **Reply-to-reply notifications**: notify user when their reply gets a reply
- **Anonymized data sharing**: privacy toggle for contributing anonymized data
- **AI tag normalization**: map typos/variations to canonical tags using `POST /forum/tags/unknown` data
- **AI trend labels**: replace hardcoded trend labels with AI-generated descriptions

### Phase 5: Care Partner Portal (Future)
- Family members can view progress (with consent)
- Secure messaging with patient
- Guidance and support resources

### Phase 6: Async Job Pipeline (Future Infrastructure)
- Bull queue for background insight generation
- Redis caching for improved performance
- Scheduled daily insight batches by timezone

---

## Risks & Assumptions

### Risks
1. **User Adoption**: Recovery is individualized; check-in frequency may vary widely
   - Mitigation: Gentle reminders, community encouragement, emphasize consistency in onboarding

2. **Data Privacy**: Health data requires strict security and compliance
   - Mitigation: Encryption at rest/transit, clear privacy policy, HIPAA-readiness roadmap

3. **AI Accuracy**: Insights must be meaningful and non-harmful
   - Mitigation: Extensive testing, explicit "supportive not medical" framing, human review

4. **Regulatory Compliance**: Healthcare regulations vary by jurisdiction
   - Mitigation: Legal review, clear terms of service, no medical claims

5. **Churn During Recovery**: Patients may complete recovery and leave
   - Mitigation: Design for natural lifecycle; focus on retention during active recovery phase

### Assumptions
1. Users will check in consistently (consistency supports trend accuracy)
2. AI insights will be perceived as helpful and supportive
3. Community interaction reduces isolation (peer support value)
4. Daily trends are sufficient for pattern detection
5. Timezone handling is critical (users may travel during recovery)
6. Server-side upsert for same-day check-in is the right UX default; client sends POST unconditionally

---

## Technical Decisions

1. **One Check-In Per Day**: Enforces consistency, prevents data noise, simplifies trend analysis
2. **Server-Side Upsert for Check-In**: POST /check-in creates or silently updates same-day entry; client needs no 409 handling logic
3. **User/Profile Split**: Identity fields (name, email, role) in User; personalization fields (bio, image, timezone) in Profile — clean auth/presentation separation
4. **Aggregated AI Data**: Privacy-first; no individual identifiers sent externally
5. **Google OAuth via State Cookie**: State parameter generated server-side, stored in httpOnly cookie — prevents CSRF on OAuth callback without client involvement
6. **Asia/Jerusalem Timezone Default**: Avoids UTC-midnight edge cases for UTC+ users (the primary audience); still overridable per user
7. **TanStack Query for Server State**: Caching, invalidation, and real-time updates without boilerplate
8. **Zod + react-hook-form**: Type-safe form validation with clear error messages
9. **PostgreSQL + Prisma**: Type-safe database access, strong schema guarantees
10. **Axios Centralized Instance**: CSRF protection auto-injected, interceptor-based auth refresh

---

## Deployment & Operations

### Current Deployment
- **Frontend**: Render (Node.js / Express static serving)
- **Backend**: Render (Node.js runtime)
- **Database**: PostgreSQL on Render (production) / local (development)
- Automatic builds on main branch push

### Future Production Infrastructure
- **Frontend**: AWS S3 + CloudFront (CDN)
- **Backend**: AWS ECS / Lambda
- **Database**: AWS RDS PostgreSQL
- **Monitoring**: CloudWatch, Sentry

### Development Workflow
- Branch per feature/fix
- Pull requests for code review
- Automated tests run on PR
- Merge to main triggers production deploy

---

## Documentation & Resources

- Backend: [README.md](../README.md)
- API Reference: [docs/API.md](./API.md)
- Code Standards: [CLAUDE.md](../CLAUDE.md) · [CORE_RULES.md](../CORE_RULES.md)
- Folder Structure: [docs/STRUCTURE.md](./STRUCTURE.md)
- Notion (this doc): [Technical PRD — Pulse](https://www.notion.so/Pulse-technical-PRD-3599e15469d280aa940cd64b53b46d38)
