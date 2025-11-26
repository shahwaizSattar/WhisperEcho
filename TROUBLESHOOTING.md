# Troubleshooting Guide

## Request Timeout Issues

### Quick Fixes Applied:

1. **Increased API Timeout**: Changed from 30s to 60s in `frontend/src/services/api.ts`
2. **Started Backend Server**: Running on port 5000
3. **Added Better Error Messages**: Network and timeout errors now show helpful messages
4. **Added Health Check Function**: Use `checkServerHealth()` to test connectivity

### How to Test Connection:

```typescript
import { checkServerHealth } from './services/api';

// In your component
const testConnection = async () => {
  const isHealthy = await checkServerHealth();
  console.log('Server is', isHealthy ? 'online' : 'offline');
};
```

### Common Issues:

#### 1. Backend Not Running
**Solution**: Start the backend server
```bash
cd backend
node server.js
```

#### 2. Wrong IP Address
**Current IP**: `192.168.10.13`
**Update in**: `frontend/src/services/api.ts` line 14

To find your IP:
```bash
# Windows
ipconfig | findstr IPv4

# Mac/Linux
ifconfig | grep inet
```

#### 3. Port Already in Use
**Solution**: Kill the process using port 5000
```bash
# Windows
netstat -ano | findstr :5000
taskkill /F /PID <PID>

# Mac/Linux
lsof -ti:5000 | xargs kill -9
```

#### 4. Firewall Blocking Connection
**Solution**: Allow port 5000 in Windows Firewall
- Open Windows Defender Firewall
- Advanced Settings → Inbound Rules → New Rule
- Port → TCP → 5000 → Allow

#### 5. Expo App Can't Connect
**Solutions**:
- Ensure phone and computer are on the same WiFi network
- Update `YOUR_COMPUTER_IP` in `api.ts` to your actual IP
- Try using tunnel mode: `npx expo start --tunnel`

### Platform-Specific URLs:

- **Web**: `http://localhost:5000/api`
- **Android Emulator**: `http://10.0.2.2:5000/api`
- **iOS Simulator**: `http://localhost:5000/api`
- **Physical Device**: `http://192.168.10.13:5000/api`

### Testing the API:

1. **Check server is running**:
   ```bash
   curl http://localhost:5000/health
   ```

2. **Test from Expo app**:
   - Open the app
   - Check console logs for "🌐 API Base URL"
   - Look for connection errors

3. **Verify MongoDB connection**:
   - Check backend console for "✅ MongoDB Atlas connected"

### Current Status:
✅ Backend server running on port 5000
✅ MongoDB Atlas connected
✅ API timeout increased to 60 seconds
✅ Better error handling added
