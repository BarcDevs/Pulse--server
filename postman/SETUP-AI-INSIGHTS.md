c# Setting Up AI Insights — Quick Start Guide

If insights are coming back **empty**, follow these steps.

## The Problem

When you run the Postman tests, insights are empty:

```json
{
    "insights": []  // ❌ EMPTY
}
```

The test `🚨 AI Insights — MUST HAVE Insights (Fail if Empty)` will **fail** with:

```
⚠️ INSIGHTS EMPTY - GOOGLE_AI_API_KEY is likely not set.
Set it in .env: GOOGLE_AI_API_KEY=your_key_here and restart server.
```

## The Solution

### Step 1: Get a Google AI API Key

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikeys)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the key

### Step 2: Set the Environment Variable

**Option A: Using `.env` file (Recommended)**

1. Open `.env` in the project root
2. Add this line:
   ```
   GOOGLE_AI_API_KEY=your_api_key_here
   ```
   Replace `your_api_key_here` with your actual key
3. Save the file

**Option B: Using command line (for this session only)**

```bash
export GOOGLE_AI_API_KEY=your_api_key_here
npm run dev
```

### Step 3: Restart the Server

```bash
# Stop the current server (Ctrl+C)
# Then restart:
npm run dev
```

**Important**: The server must be restarted for changes to `.env` to take effect.

### Step 4: Verify Setup

1. Check that server started without errors
2. Look for logs like: `✓ Server is running on http://localhost:4001`
3. No errors about "GOOGLE_AI_API_KEY is not configured"

### Step 5: Run Postman Tests

1. Open Postman
2. Import `pulse-CheckIn.collection.json`
3. Click "Run"
4. Watch for the test: `🚨 AI Insights — MUST HAVE Insights (Fail if Empty)`

**Expected result**: ✅ PASS (insights are populated)

---

## Verification Checklist

After setting up, verify each step:

- [ ] `.env` file has `GOOGLE_AI_API_KEY=your_key_here`
- [ ] Server restarted (stopped and started again)
- [ ] Server logs show no errors about missing API key
- [ ] Postman "Login" test passes
- [ ] Postman "Create Check-In" test passes
- [ ] Postman "🚨 AI Insights — MUST HAVE Insights" test passes ✅

---

## What Happens After Setup

Once `GOOGLE_AI_API_KEY` is set:

1. **Check-in created**
   ```bash
   POST /check-in → Status 201/200 ✅
   ```

2. **Insight generation triggered** (in background)
   - AI model generates content
   - Validator checks content for clinical language
   - If invalid → fallback content used
   - Insight saved to database

3. **Get check-in shows insight**
   ```bash
   GET /check-in → insights array now populated ✅
   ```

4. **Validation tests verify safety**
   - No "you may have", "diagnosed with", etc.
   - No mixing diagnostic phrases with medical terms
   - Content length 20-500 chars
   - Title always present

---

## Troubleshooting

### Test Still Fails: "INSIGHTS EMPTY"

**Check 1: Is GOOGLE_AI_API_KEY in `.env`?**
```bash
grep GOOGLE_AI_API_KEY .env
```

Should output:
```
GOOGLE_AI_API_KEY=sk-...
```

If empty or not found:
- Add it to `.env`
- Restart server
- Retry test

**Check 2: Did you restart the server after adding the key?**

The server caches environment variables at startup. You MUST restart for changes to take effect.

```bash
# Kill server (Ctrl+C if running in foreground)
npm run dev  # Restart
```

**Check 3: Is the API key valid?**

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikeys)
2. Verify your key exists and is active
3. Copy the full key exactly (no extra spaces)
4. Update `.env`
5. Restart server

**Check 4: Check server logs**

When you restart with a valid key, you should see logs like:

```
✓ Server is running on http://localhost:4001
✓ Database connected
```

No errors about:
- "GOOGLE_AI_API_KEY is not configured"
- "Failed to generate insight"

If you see errors, the key might be invalid or missing.

### API Key is Set But Insights Still Empty

1. **Check server logs** — are there "Failed to generate insight" errors?
   - If yes: The API might be rate-limited or failing
   - If no: Something else is wrong

2. **Try a fresh test user**
   - Create a new check-in with different mood values
   - This triggers a new insight generation attempt

3. **Check database** — are insights being saved at all?
   ```bash
   # Connect to your database
   SELECT * FROM "AIInsight" LIMIT 5;
   ```
   If table is empty, insights aren't being saved.

---

## How to Verify Insights Are Working

### In Postman

1. Run the full test suite
2. Check the test: **"🚨 AI Insights — MUST HAVE Insights (Fail if Empty)"**
3. If it passes ✅: Insights are working
4. Check the other validation tests:
   - "Validate Content (No Clinical Language)" ✅
   - "Verify Type and Title Match" ✅

### In the Database

```bash
# If you have psql installed:
psql -U your_user -d your_db -c "SELECT id, type, title, content FROM \"AIInsight\" LIMIT 3;"
```

Should show:
```
 id | type | title | content
----+---+---+---
 ... | MOOD_DROP_ALERT | Mood Check-In | We noticed...
```

### In the API Response

```bash
curl http://localhost:4001/api/{api_version}/check-in?limit=1 \
  -H "Cookie: your_auth_cookie"
```

Should return:
```json
{
    "data": [{
        "id": "...",
        "insights": [
            {
                "id": "...",
                "type": "MOOD_DROP_ALERT",
                "title": "Mood Check-In",
                "content": "We noticed your mood has felt lower recently..."
            }
        ]
    }]
}
```

---

## File Reference

- **Configuration**: `.env`
- **Validator**: `src/modules/ai-insight/ai-insight-validator.ts`
- **Generator**: `src/modules/ai-insight/ai-insight-generator.service.ts`
- **Service**: `src/services/checkInService.ts` (calls generator after check-in)
- **Tests**: `postman/pulse-CheckIn.collection.json`

---

## Next Steps

After insights are working:

1. ✅ Run all Postman tests
2. ✅ Verify validation works (no clinical language)
3. ✅ Check different insight types (mood drop, motivational, weekly)
4. ✅ Review server logs for any errors
5. (Optional) Update prompts or validation rules if needed

---

**Questions?** Check `postman/README-AI-INSIGHTS-TESTS.md` or `postman/VALIDATION-RULES.md`

**Last updated**: 2026-03-12