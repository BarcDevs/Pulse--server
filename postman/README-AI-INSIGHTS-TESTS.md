# HealEase AI Insights — Postman Test Guide

This guide explains how to test the AI insight generation and validation layer using the updated Postman collection.

## Overview

The AI insights feature generates personalized insights after each check-in. The validation layer ensures:
- **No diagnostic language** in insights
- **Safe fallback content** if validation fails
- **Proper insight structure** (title, content, type)

## Prerequisites

1. **Server running**: Start the HealEase server
   ```bash
   npm run dev
   ```

2. **Database configured**: Ensure PostgreSQL is running and migrations are applied
   ```bash
   npm run prisma:migrate:deploy
   ```

3. **Test user created**: The collection assumes `test@example.com` exists with password `testuser123`
   ```bash
   # If not exists, create via signup or directly in DB
   ```

4. **Google AI API Key (optional)**: Set in `.env` to test actual AI generation
   ```bash
   GOOGLE_AI_API_KEY=your_api_key_here
   ```
   - Without this key, insights will not generate (service throws error)
   - With this key, insights are generated and validated

## Test Flow

Run these tests in order:

### 1. **Login** (Required)
   - Authenticates and captures CSRF token
   - All subsequent requests require this token
   - **Expected**: Status 200, CSRF token captured

### 2. **Create Check-In (or Update if exists)** (Core functionality)
   - Creates today's check-in with mood/pain/activities
   - Triggers insight generation (if GOOGLE_AI_API_KEY is set)
   - **Expected**: Status 201 (new) or 200 (updated)
   - **Captures**: Check-in ID for later use

### 3. **Create Check-In Again (Idempotent - Falls Back to Update)**
   - Verifies that submitting the same check-in twice updates it
   - Tests idempotency
   - **Expected**: Status 200, message includes "updated"

### 4. **Update Check-In**
   - Modifies today's check-in (PATCH request)
   - Changes mood score to 9
   - **Expected**: Status 200, updated data reflected

### 5. **Get Check-Ins (Last 30)**
   - Retrieves last 30 check-ins
   - Verifies `insights` array exists on each check-in
   - **Expected**: Status 200, array with insights property

### 6. **Get Check-In Stats**
   - Retrieves user statistics (mood averages, streaks, top activities)
   - **Expected**: Status 200, all stat fields present

## AI Insights Tests

### 7. **Create Declining Mood Check-Ins** (Prepares for mood drop alert)
   - Creates a check-in with mood=5 (lower than previous ~7-9)
   - Simulates declining mood pattern
   - **Expected**: Status 201 or 200, mood score = 5
   - **Purpose**: Sets up conditions for MOOD_DROP_ALERT insight

### 8. **Verify Insight Generated**
   - Retrieves latest check-in
   - Verifies `insights` array is populated
   - Checks insight has all required fields: `id`, `type`, `title`, `content`
   - **Expected**: Status 200, insights present with valid structure
   - **Note**: Insights only populate if GOOGLE_AI_API_KEY is set

### 9. **Validate Insight Content (No Clinical Language)**
   - **Most important validation test**
   - Checks that insight content does NOT contain:
     - ❌ "you may have"
     - ❌ "you might have"
     - ❌ "diagnosed with"
     - ❌ "treatment plan"
     - ❌ "clinical condition"
   - Verifies content length is reasonable (20-500 characters)
   - Verifies title is not empty
   - Checks that medical terms don't appear with diagnostic phrasing
   - **Expected**: All assertions pass

### 10. **Verify Different Insight Types**
   - Checks that insight `type` is one of:
     - `MOOD_DROP_ALERT` (declining mood)
     - `MOTIVATIONAL` (new user or low streak)
     - `WEEKLY_SUMMARY` (≥5 check-ins + active streak)
   - Verifies title matches expected format for type:
     - MOOD_DROP_ALERT → "Mood Check-In"
     - MOTIVATIONAL → "Keep Going" (includes emoji)
     - WEEKLY_SUMMARY → "Weekly Reflection"
   - **Expected**: Type and title match expectations

## How Validation Works (Behind the Scenes)

When you submit a check-in, the service:

1. **Generates insight content** using Google Generative AI (Gemini 1.5 Flash)
2. **Validates** the generated content:
   - Checks for hard-block phrases (diagnostic language)
   - Checks for medical terms with diagnostic context
   - Verifies length (20-500 characters)
   - Counts sentences (max 4)
3. **Falls back** to safe static message if validation fails:
   - MOOD_DROP_ALERT: "We noticed your mood has felt lower recently..."
   - MOTIVATIONAL: "Thank you for checking in with yourself today..."
   - WEEKLY_SUMMARY: "You've made time this week to reflect on your wellness..."

**Important**: The API will always return a valid insight (either AI-generated or fallback), so you can't directly observe validation failures. However, the tests verify:
- Content structure (never empty)
- Content never contains forbidden phrases
- Content length is always in range
- Type always matches one of three categories

## Running Tests in Postman

### Option 1: Run All Tests
1. Open `HealEase-CheckIn.collection.json` in Postman
2. Click "Run" (play button)
3. Run the entire collection

### Option 2: Run Tests Sequentially
1. Start at "Login"
2. Run each test in order
3. Each test captures data for the next (e.g., CSRF token, check-in ID)

### Option 3: Run Individual Test
1. Click on a specific request
2. Click "Send"
3. Check the "Tests" tab for results

## Expected Results

### Without GOOGLE_AI_API_KEY
- ✅ Login passes
- ✅ Create Check-In passes (but no insights generated)
- ✅ Check-In retrieval passes (insights array is empty)
- ❌ Insight validation tests will fail (no insights to validate)

**Solution**: Set `GOOGLE_AI_API_KEY` in `.env` and restart server

### With GOOGLE_AI_API_KEY
- ✅ All tests should pass
- ✅ Check-ins have populated insights
- ✅ Insight content is safe (no clinical language)
- ✅ Insight type is correct based on mood pattern

## Troubleshooting

### Test: "Insight content does not contain hard-block phrases" fails
- The AI model generated content with prohibited language
- The validator should have caught this and used fallback
- Check logs: `npm run dev` should show validation info
- Possible fix: Improve prompt templates or forbidden phrase list

### Test: "Insight has valid structure" fails
- Insights may not be generated if API call failed
- Check: Is `GOOGLE_AI_API_KEY` set?
- Check: Is the server receiving the key from config?
- Check logs for "Failed to generate insight"

### Test: "Insight type is one of..." fails
- Decision service returned an unexpected type
- Check: Does the code only return MOOD_DROP_ALERT, MOTIVATIONAL, WEEKLY_SUMMARY?
- Verify: Are mood trends being detected correctly?

### All tests fail with 401/403
- CSRF token not captured
- Re-run "Login" test first
- Verify token is in `csrfToken` variable

## Test Data Captured

The collection captures these variables for use in tests:

- `csrfToken` — CSRF protection token (set after login)
- `checkInId` — Latest check-in ID (set after create)

These are used automatically in subsequent requests.

## Files Modified

- `postman/HealEase-CheckIn.collection.json` — Updated with 5 new insight tests
- This README file — Documentation for testing

## Next Steps

1. ✅ Run all tests in Postman
2. ✅ Verify insights are generated
3. ✅ Verify content is safe (no clinical language)
4. ✅ Check logs for any validation fallbacks
5. (Optional) Update prompts if insights need improvement
6. (Optional) Add more forbidden phrases if needed

## Code References

- **Validation logic**: `src/modules/ai-insight/ai-insight-validator.ts`
- **Hard-block phrases**: Lines 9-19
- **Forbidden medical contexts**: Lines 21-28
- **AI generation**: `src/modules/ai-insight/ai-insight-generator.service.ts`
- **Fallback messages**: `src/modules/ai-insight/ai-insight-validator.ts:getFallbackContent()`

---

**Last updated**: 2026-03-12
**Tested with**: Postman v10.x, Node.js v18+