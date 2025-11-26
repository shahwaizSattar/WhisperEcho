import { checkServerHealth } from '../services/api';
import { Platform } from 'react-native';

/**
 * Test API connection and log detailed information
 */
export const testAPIConnection = async (): Promise<{
  success: boolean;
  message: string;
  details: any;
}> => {
  console.log('🔍 Testing API Connection...');
  console.log('📱 Platform:', Platform.OS);
  
  try {
    const startTime = Date.now();
    const isHealthy = await checkServerHealth();
    const duration = Date.now() - startTime;
    
    if (isHealthy) {
      const message = `✅ Connected successfully in ${duration}ms`;
      console.log(message);
      return {
        success: true,
        message,
        details: {
          platform: Platform.OS,
          duration,
          timestamp: new Date().toISOString(),
        },
      };
    } else {
      const message = '❌ Server health check failed';
      console.error(message);
      return {
        success: false,
        message,
        details: {
          platform: Platform.OS,
          duration,
          timestamp: new Date().toISOString(),
        },
      };
    }
  } catch (error: any) {
    const message = `❌ Connection failed: ${error.message}`;
    console.error(message);
    console.error('Error details:', error);
    
    return {
      success: false,
      message,
      details: {
        platform: Platform.OS,
        error: error.message,
        code: error.code,
        timestamp: new Date().toISOString(),
      },
    };
  }
};

/**
 * Get connection troubleshooting tips based on platform
 */
export const getConnectionTips = (): string[] => {
  const tips: string[] = [
    '1. Make sure the backend server is running (node server.js)',
    '2. Check that you\'re on the same WiFi network (for physical devices)',
  ];
  
  if (Platform.OS === 'android') {
    tips.push('3. Android emulator uses 10.0.2.2 to access localhost');
  } else if (Platform.OS === 'ios') {
    tips.push('3. iOS simulator can use localhost directly');
  } else if (Platform.OS === 'web') {
    tips.push('3. Web uses localhost:5000');
  }
  
  tips.push('4. Check firewall settings if using a physical device');
  tips.push('5. Try using Expo tunnel mode: npx expo start --tunnel');
  
  return tips;
};
