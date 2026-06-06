# Pulse Test User Credentials

All test users have password: `password123`

## Test Users

| Name | Username | Email | Password |
|------|----------|-------|----------|
| Alice Johnson | alice_j | alice@example.com | password123 |
| Bob Smith | bob_smith | bob@example.com | password123 |
| Carol Williams | carol_w | carol@example.com | password123 |
| David Brown | david_b | david@example.com | password123 |
| Emma Davis | emma_d | emma@example.com | password123 |

## Notes

- Each user has a profile with timezone set to `America/New_York`
- Each user has 7 days of check-in data (past week)
- Test posts created from these users with forum replies
- Recovery goals with various statuses (ACTIVE, COMPLETED, PAUSED, ABANDONED)
- Goals have associated milestones showing progression tracking

## Usage in Tests

```typescript
// Example API request
const loginResponse = await request(app)
    .post('/auth/login')
    .send({
        email: 'alice@example.com',
        password: 'password123'
    })
```

## Seeded Data

- **Users:** 5 test users
- **Check-ins:** 7 per user (35 total)
- **Posts:** 5 posts with replies
- **Goals:** 4 per user (ACTIVE, COMPLETED, PAUSED, ABANDONED)
- **Health Interests:** 10 categories
- **Activity Preferences:** 15 options
