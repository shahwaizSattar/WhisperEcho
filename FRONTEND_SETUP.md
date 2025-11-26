# Frontend Setup Guide

## How to Run Frontend Changes on Your PC

### Prerequisites
- Node.js (v16 or higher) installed
- Git installed
- npm or yarn package manager

### Step 1: Clone the Repository (if you don't have it)

```bash
git clone https://github.com/shahwaizSattar/Anonymous_social.git
cd Anonymous_social
```

### Step 2: Checkout the Frontend Branch

```bash
git fetch origin
git checkout frontend-dev
```

**OR if you already have the repository cloned:**

```bash
git pull origin main  # Get latest main branch
git checkout frontend-dev  # Switch to frontend branch
git pull origin frontend-dev  # Get latest frontend changes
```

### Step 3: Navigate to Frontend Directory

```bash
cd frontend
```

### Step 4: Install Dependencies

```bash
npm install
```

### Step 5: Run the Application

#### For Web (if using Expo Web):
```bash
npm start
# Then press 'w' to open in web browser
```

#### For Android:
```bash
npm run android
```

#### For iOS (macOS only):
```bash
npm run ios
```

#### For Development with Hot Reload:
```bash
npm start
# This will start Metro bundler
# Then scan QR code with Expo Go app (for mobile) or press 'w' for web
```

### Troubleshooting

#### If you get dependency errors:
```bash
# Delete node_modules and package-lock.json
rm -rf node_modules package-lock.json

# Reinstall
npm install
```

#### If you're on Windows and get errors:
```powershell
# Use PowerShell commands
Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json
npm install
```

#### If you need to update to latest changes:
```bash
git pull origin frontend-dev
npm install  # In case new dependencies were added
```

### Important Notes

1. **Backend Required**: Make sure the backend server is running. The frontend needs the backend API to work properly.

2. **Environment Variables**: Check if there's a `.env` file needed in the frontend directory (usually for API endpoints).

3. **Port Conflicts**: If port 19000 or 8081 is already in use, you may need to stop other services or change ports.

4. **Branch Workflow**: 
   - You're working on `frontend-dev` branch
   - Backend developer works on `backend-dev` branch
   - Both merge to `main` when ready

### Quick Start (All Steps Combined)

```bash
# Clone and setup
git clone https://github.com/shahwaizSattar/Anonymous_social.git
cd Anonymous_social
git checkout frontend-dev

# Install and run
cd frontend
npm install
npm start
```

### Need Help?

If you encounter any issues:
1. Check that Node.js version is 16+ (`node --version`)
2. Make sure you're in the `frontend` directory
3. Try clearing cache: `npm start -- --reset-cache`
4. Check the main README.md for more details


