# Auth-Gated App Testing Playbook

## Step 1: Create Test User & Session
```
mongosh --eval "
use('test_database');
var userId = 'test-user-' + Date.now();
var sessionToken = 'test_session_' + Date.now();
db.users.insertOne({
  user_id: userId,
  email: 'test.user.' + Date.now() + '@example.com',
  name: 'Test User',
  picture: 'https://via.placeholder.com/150',
  created_at: new Date()
});
db.user_sessions.insertOne({
  user_id: userId,
  session_token: sessionToken,
  expires_at: new Date(Date.now() + 7*24*60*60*1000),
  created_at: new Date()
});
print('Session token: ' + sessionToken);
print('User ID: ' + userId);
"
```

## Step 2: Test Backend API
```
curl -X GET "$API/api/auth/me" -H "Authorization: Bearer YOUR_SESSION_TOKEN"
curl -X GET "$API/api/me/saved" -H "Authorization: Bearer YOUR_SESSION_TOKEN"
curl -X POST "$API/api/me/saved" -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN" -d '{"slug":"radiohead"}'
```

## Step 3: Browser Testing
```python
await page.context.add_cookies([{
    "name": "session_token",
    "value": "YOUR_SESSION_TOKEN",
    "domain": "case-file-4.preview.emergentagent.com",
    "path": "/",
    "httpOnly": True,
    "secure": True,
    "sameSite": "None"
}])
await page.goto("https://case-file-4.preview.emergentagent.com/")
```

## Checklist
- [ ] User document has user_id field (custom UUID)
- [ ] Session user_id matches user's user_id exactly
- [ ] All queries use `{"_id": 0}` projection
- [ ] Backend queries use user_id (not _id or id)
- [ ] Callback detection uses `useLocation().hash`
- [ ] AuthProvider skips /me if hash has session_id

## Success
- ✅ /api/auth/me returns user data
- ✅ Save case file works when authed
- ✅ Anonymous browsing still works (auth is additive)

## Failure
- ❌ "User not found"
- ❌ 401 on protected endpoints
- ❌ Redirect loop on callback
