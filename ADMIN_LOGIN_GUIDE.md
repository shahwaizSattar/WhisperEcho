# Admin Panel Login Guide

## Overview
The WhisperEcho Admin Panel now uses a secure hardcoded authentication system that is completely separate from user login/signup functionality.

## Admin Credentials
- **Username:** `superadmin`
- **Password:** `WhisperEcho@2025`

## Access URLs
- **Admin Login:** `http://localhost:3000/admin/login`
- **Admin Dashboard:** `http://localhost:3000/dashboard` (requires login)
- **Backend API:** `http://localhost:5001/api` (connected to MongoDB)

## Features

### 🔐 Secure Authentication
- Hardcoded credentials (no database required)
- Separate from user authentication system
- Session management using localStorage
- Automatic redirect to login if not authenticated

### 🛡️ Protected Routes
All admin routes are protected and require authentication:
- `/dashboard` - Admin Dashboard
- `/reports` - Content Reports
- `/posts` - Post Management
- `/users` - User Management
- `/moderation-rules` - Moderation Settings
- `/logs` - Admin Activity Logs

### 🚀 Quick Access
1. Navigate to `http://localhost:3000/admin/login`
2. Enter credentials:
   - Username: `superadmin`
   - Password: `WhisperEcho@2025`
3. Click "Login"
4. You'll be redirected to the admin dashboard

### 🔄 Session Management
- Login state is stored in localStorage as `isAdmin=true`
- Sessions persist across browser refreshes
- Logout clears the session and redirects to login
- Automatic logout on authentication errors

### 🎨 User Experience
- Clean, professional login interface
- Loading states during authentication
- Clear error messages for invalid credentials
- Responsive design for all devices

## Security Notes
- Credentials are hardcoded for simplicity
- Connected to MongoDB database for real user/post data
- Session data stored locally in browser
- All admin routes are protected by authentication check
- Backend API uses custom admin authentication middleware

## Development
The login system uses:
- React Router for route protection
- localStorage for session management
- Custom auth utility (`src/utils/auth.js`)
- Protected route component for security

## Troubleshooting
- If you can't access admin routes, ensure you're logged in at `/admin/login`
- Clear localStorage if experiencing session issues
- Check browser console for any JavaScript errors
- Ensure the admin panel is running on the correct port

---
**Note:** This is a development/demo authentication system. For production use, implement proper backend authentication with encrypted passwords and secure session management.

## Database Integration

### 📊 **Real Data Display**
The admin panel now displays real data from your MongoDB database:
- **Users:** Shows actual registered users with their fake IPs, device hashes, and violation counts
- **Posts:** Displays real posts from the platform
- **Reports:** Shows actual content reports and moderation actions
- **Statistics:** Real-time dashboard with accurate user/post counts

### 🔌 **API Configuration**
- **Frontend:** Admin panel runs on `http://localhost:3000`
- **Backend:** API server runs on `http://localhost:5001`
- **Database:** Connected to MongoDB Atlas cluster
- **Authentication:** Hardcoded admin credentials work with both frontend and backend

### 🛠 **Current Database Stats**
Based on the test connection:
- **Total Users:** 17 registered users
- **Total Posts:** 28 posts created
- **Pending Reports:** 0 unresolved reports
- **Shadowbanned Users:** Available in real-time

### 🚀 **Features Working**
- ✅ User management with real database users
- ✅ Dashboard statistics from actual data
- ✅ Hardcoded admin authentication
- ✅ Protected routes and API endpoints
- ✅ Real-time data updates
- ✅ MongoDB Atlas integration