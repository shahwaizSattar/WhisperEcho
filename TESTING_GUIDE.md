# Testing Guide for Post Menu Features

## Prerequisites
1. Backend server running: `cd backend && npm start`
2. Frontend app running: `cd frontend && npm start`
3. At least 2 test user accounts
4. Some posts created by different users

## Test Scenarios

### Test 1: Mute User with Undo
**Steps:**
1. Login as User A
2. Navigate to Home feed
3. Find a post from User B
4. Tap the three-dot menu (⋮) on the post
5. Select "Mute User"

**Expected Results:**
- ✓ All posts from User B disappear immediately
- ✓ Toast notification appears: "All posts muted - All posts from @UserB are now hidden"
- ✓ Undo button appears at bottom of screen
- ✓ Tapping Undo restores all posts from User B
- ✓ After 15 seconds without undo, posts remain hidden
- ✓ Refreshing feed does not show User B's posts

### Test 2: Mute User without Undo
**Steps:**
1. Login as User A
2. Mute User B (follow Test 1 steps 1-5)
3. Wait 15 seconds without tapping Undo

**Expected Results:**
- ✓ Undo button disappears after 15 seconds
- ✓ User B's posts remain hidden
- ✓ Pull to refresh does not show User B's posts
- ✓ Backend has User B in mutedUsers array

### Test 3: Hide Single Post with Undo
**Steps:**
1. Login as User A
2. Navigate to Home feed
3. Find any post
4. Tap the three-dot menu (⋮)
5. Select "Hide Post"

**Expected Results:**
- ✓ The specific post disappears immediately
- ✓ Other posts from same user remain visible
- ✓ Toast notification appears: "Post hidden - This post has been removed from your feed"
- ✓ Undo button appears at bottom of screen
- ✓ Tapping Undo restores the hidden post
- ✓ After 15 seconds without undo, post remains hidden

### Test 4: Block User
**Steps:**
1. Login as User A
2. Navigate to Home feed
3. Find a post from User B
4. Tap the three-dot menu (⋮)
5. Select "Block User"

**Expected Results:**
- ✓ All posts from User B disappear immediately
- ✓ Toast notification appears: "User blocked - @UserB has been blocked. You can unblock them from your profile."
- ✓ No undo button appears (immediate action)
- ✓ User B is removed from followers/following lists
- ✓ User B's avatar and messages are hidden in chat
- ✓ Refreshing feed does not show User B's posts

### Test 5: View Blocked Users
**Steps:**
1. Login as User A (who has blocked User B)
2. Navigate to Profile tab
3. Tap "Blocked Users" menu item

**Expected Results:**
- ✓ BlockedUsersScreen opens
- ✓ User B appears in the list with avatar and username
- ✓ "Unblock" button is visible next to User B
- ✓ If no users blocked, shows empty state with message

### Test 6: Unblock User
**Steps:**
1. Login as User A
2. Navigate to Profile → Blocked Users
3. Find User B in the list
4. Tap "Unblock" button

**Expected Results:**
- ✓ Loading indicator appears on button
- ✓ User B is removed from blocked list
- ✓ Toast notification appears: "User unblocked - @UserB has been unblocked"
- ✓ User B's posts appear in feed again
- ✓ Can follow User B again

### Test 7: Multiple Actions
**Steps:**
1. Login as User A
2. Mute User B
3. Before 15 seconds, hide a post from User C
4. Observe undo button behavior

**Expected Results:**
- ✓ Only one undo button visible at a time
- ✓ New action cancels previous undo timeout
- ✓ Undo button shows for most recent action

### Test 8: Report Post (Existing Feature)
**Steps:**
1. Login as User A
2. Tap three-dot menu on any post
3. Select "Report Post"
4. Choose a report reason

**Expected Results:**
- ✓ Report reasons screen appears
- ✓ Selecting reason submits report
- ✓ Toast notification confirms submission
- ✓ Post remains visible (reporting doesn't hide)

### Test 9: Edge Cases

#### Test 9a: Cannot Mute Self
**Steps:**
1. Login as User A
2. Find your own post
3. Tap three-dot menu
4. Observe available options

**Expected Results:**
- ✓ Mute/Block options should not appear for own posts
- ✓ Only Report and Hide options available

#### Test 9b: Cannot Block Self
**Steps:**
1. Try to block yourself via API call

**Expected Results:**
- ✓ Backend returns error: "You cannot block yourself"

#### Test 9c: Feed Filtering
**Steps:**
1. Login as User A
2. Mute User B and Block User C
3. Refresh feed

**Expected Results:**
- ✓ No posts from User B appear
- ✓ No posts from User C appear
- ✓ Posts from other users appear normally

### Test 10: Pull to Refresh
**Steps:**
1. Perform any mute/hide/block action
2. Pull down to refresh feed

**Expected Results:**
- ✓ Muted users' posts don't reappear
- ✓ Blocked users' posts don't reappear
- ✓ Hidden posts don't reappear
- ✓ New posts from non-muted/blocked users appear

## API Testing (Optional)

### Test Mute Endpoint
```bash
# Mute user
curl -X POST http://localhost:5000/api/users/{userId}/mute \
  -H "Authorization: Bearer {token}"

# Unmute user
curl -X DELETE http://localhost:5000/api/users/{userId}/mute \
  -H "Authorization: Bearer {token}"
```

### Test Block Endpoint
```bash
# Block user
curl -X POST http://localhost:5000/api/users/{userId}/block \
  -H "Authorization: Bearer {token}"

# Unblock user
curl -X DELETE http://localhost:5000/api/users/{userId}/block \
  -H "Authorization: Bearer {token}"

# Get blocked users
curl -X GET http://localhost:5000/api/users/blocked \
  -H "Authorization: Bearer {token}"
```

### Test Hide Post Endpoint
```bash
# Hide post
curl -X POST http://localhost:5000/api/posts/{postId}/hide \
  -H "Authorization: Bearer {token}"

# Unhide post
curl -X DELETE http://localhost:5000/api/posts/{postId}/hide \
  -H "Authorization: Bearer {token}"
```

## Known Issues / Limitations
- Undo timeout is client-side only; if app is closed during undo window, action is not finalized
- Blocked users can still see your posts (one-way block)
- No notification sent to blocked/muted users
- WhisperWall posts (anonymous) cannot be muted by user

## Success Criteria
All tests should pass with expected results. The implementation is complete when:
- ✓ All three-dot menu options work correctly
- ✓ Undo functionality works for mute and hide
- ✓ Block is immediate without undo
- ✓ Blocked users screen displays and functions correctly
- ✓ Feed properly filters muted/blocked/hidden content
- ✓ No console errors or crashes
- ✓ Smooth user experience with appropriate feedback
