# Quick Debug Checklist

## ⚡ Quick Steps

### 1. Restart Services
```bash
# Backend
cd WhisperEcho
start-backend.bat

# Admin Panel (in new terminal)
cd WhisperEcho/admin-panel
npm start
```

### 2. Open Browser Console (F12)
- Clear console
- Keep it open

### 3. Test the Issue
1. Login to admin panel
2. Go to Users → With Violations
3. Click View on any user
4. **Watch the console logs**

### 4. Check What You See

#### ✅ If you see these logs, it's working:
```
🔎 Frontend: Fetching user with id: ...
✅ ObjectId validation passed
✅ User found: ...
```

#### ❌ If you see these, there's an issue:
```
❌ Invalid ObjectId format
❌ User not found
❌ Error fetching user
```

## 📋 What to Report

Copy and paste from console:
1. All lines starting with 🔎 or ❌
2. The Network tab response
3. Backend console output

## 🔍 Quick Checks

- [ ] Backend is running on port 5000
- [ ] Admin panel is running on port 3001
- [ ] You're logged in as admin
- [ ] Browser console is open (F12)
- [ ] You clicked on a user WITH violations

## 📸 Screenshots Needed

1. Users list showing the user with violations
2. Error message when clicking View
3. Browser console logs
4. Network tab showing the failed request

---

**See `DEBUG_VIEW_USER_ISSUE.md` for detailed debugging guide**
