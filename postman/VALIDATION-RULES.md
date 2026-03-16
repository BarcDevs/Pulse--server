# AI Insight Validation Rules — Quick Reference

This document outlines the exact validation rules applied to AI-generated insights before they are saved to the database.

## Validation Layers

The insight validator runs **TWO layers** of checks on generated content:

### Layer 1: Hard-Block Phrases (Automatic Rejection)

If the content contains ANY of these phrases (case-insensitive), it is **automatically rejected**:

```
❌ "you may have"
❌ "you might have"
❌ "this may indicate"
❌ "this could indicate"
❌ "symptoms of"
❌ "diagnosed with"
❌ "diagnosis"
❌ "treatment plan"
❌ "clinical condition"
```

**Impact**: These phrases indicate diagnosis, which the app never provides.

**Examples of rejected content:**
- "You may have depression based on your mood."
- "These symptoms indicate anxiety."
- "This could suggest a clinical condition."

**Examples of accepted content with similar themes:**
- "Your mood has shifted recently." ✅
- "Low mood is something many people experience." ✅
- "Noticing patterns in your mood is helpful." ✅

---

### Layer 2: Contextual Medical Terms (Proximity Check)

If the content contains a **medical term** paired with **diagnostic phrasing**, it is **rejected**.

**Medical Terms:**
```
depression
anxiety disorder
mental disorder
syndrome
disease
```

**Diagnostic Phrases:**
```
indicates
suggests
signs of
symptoms of
may have
might have
```

**Rejection Rule**: Medical term + diagnostic phrase = REJECTED

**Examples of rejected combinations:**
- "indicates depression" ❌
- "you may have anxiety disorder" ❌
- "symptoms of syndrome" ❌
- "suggests mental disorder" ❌

**Examples of accepted content (same terms, no diagnostic phrasing):**
- "Low mood can happen during recovery" ✅
- "Depression is common, and so are the ups and downs" ✅
- "Many people experience anxiety at various times" ✅
- "You're noticing emotional patterns without jumping to conclusions" ✅

---

## Length Validation

**Minimum length**: 20 characters
- Rejects content that is too vague or brief
- Example rejected: "Be okay" (6 chars)
- Example accepted: "Take time to check in with yourself" (35 chars)

**Maximum length**: 500 characters
- Rejects overly verbose content
- Example: A 600-character essay (rejected)
- Fallback used instead

---

## Sentence Count

**Maximum sentences**: 4
- Rejects overly complex insights
- Helps ensure clarity and focus
- Example: "First. Second. Third. Fourth." ✅ (exactly 4)
- Example: "First. Second. Third. Fourth. Fifth." ❌ (5, too many)

**Note**: Sentences without punctuation count as 1 sentence
- "Keep noticing what helps and what feels heavier" = 1 sentence ✅

---

## Fallback Messages (Used When Validation Fails)

If ANY validation rule is violated, a **safe static fallback** is used instead:

### MOOD_DROP_ALERT fallback
```
"We noticed your mood has felt lower recently. Take a moment to
check in with what may be weighing on you today. Noticing the
pattern is already a meaningful step."
```

### MOTIVATIONAL fallback
```
"Thank you for checking in with yourself today. Consistency is a
powerful part of your journey."
```

### WEEKLY_SUMMARY fallback
```
"You've made time this week to reflect on your wellness. That
dedication is something to acknowledge and build on."
```

**All fallback messages:**
- Are pre-written and safe
- Pass all validation rules
- Match the insight type
- Are empowering but not diagnostic

---

## What Gets Validated

| Check | When | Result |
|-------|------|--------|
| Title empty | On every insight | Reject → use fallback |
| Content empty | On every insight | Reject → use fallback |
| Hard-block phrase found | Content check | Reject → use fallback |
| Medical term + diagnostic phrase | Content check | Reject → use fallback |
| Content < 20 chars | Length check | Reject → use fallback |
| Content > 500 chars | Length check | Reject → use fallback |
| Sentence count > 4 | Structure check | Reject → use fallback |

---

## What Does NOT Get Validated

These are intentionally allowed:

✅ Medical terms alone (without diagnostic phrasing)
- "Depression is normal" (no diagnostic phrase)
- "Anxiety can happen" (no diagnostic phrase)

✅ Supportive language even if slightly longer
- Up to 500 characters is fine
- 4 sentences is fine

✅ Clinical terminology in educational context
- "Understanding your patterns"
- "Recovery is a process"

---

## Testing the Validation

To verify validation in Postman:

1. **Run**: "Validate Insight Content (No Clinical Language)" test
2. **Check assertions**:
   - ✅ Content does not contain hard-block phrases
   - ✅ Content length is 20-500 characters
   - ✅ Title is not empty
   - ✅ Medical terms don't mix with diagnostic phrases

All assertions must pass for valid insights.

---

## Behind the Scenes

When you submit a check-in:

```
1. AI generates content
   ↓
2. Validator checks content
   ├─ Pass? → Save generated content
   └─ Fail? → Use fallback content
   ↓
3. Either way, insight is saved
   ├─ Title: Static title (e.g., "Mood Check-In")
   └─ Content: Generated OR fallback
```

**Key point**: An insight is ALWAYS created. If validation fails, you get a safe fallback instead of an error.

---

## Code Location

For implementation details, see:

- **Validator**: `src/modules/ai-insight/ai-insight-validator.ts`
  - `validateGeneratedInsight()` — Main validation function
  - `containsHardBlockPhrase()` — Layer 1 check
  - `containsForbiddenMedicalContext()` — Layer 2 check
  - `countSentences()` — Sentence counting
  - `getFallbackContent()` — Safe fallback messages

- **Integration**: `src/modules/ai-insight/ai-insight-generator.service.ts`
  - `generateInsight()` — Calls validator, uses fallback if needed

- **Tests**: `src/modules/ai-insight/__tests__/aiInsightValidator.test.ts`
  - 46 comprehensive test cases covering all rules

---

## Updating Validation Rules

To change validation rules:

1. **Add/remove hard-block phrases**:
   - File: `ai-insight-validator.ts`
   - Array: `HARD_BLOCK_PHRASES`

2. **Add/remove medical terms**:
   - File: `ai-insight-validator.ts`
   - Array: `MEDICAL_TERMS`

3. **Change length limits**:
   - File: `ai-insight-validator.ts`
   - Constants: `MIN_CONTENT_LENGTH`, `MAX_CONTENT_LENGTH`

4. **Change max sentences**:
   - File: `ai-insight-validator.ts`
   - Constant: `MAX_SENTENCES`

5. **Update fallback messages**:
   - File: `ai-insight-validator.ts`
   - Function: `getFallbackContent()`

After changes, run tests:
```bash
npm test -- src/modules/ai-insight/__tests__/aiInsightValidator.test.ts
```

---

**Last updated**: 2026-03-12