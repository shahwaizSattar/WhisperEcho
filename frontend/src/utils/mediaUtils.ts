import { Platform } from 'react-native';
import { Audio } from 'expo-av';
import Toast from 'react-native-toast-message';

// Get the base URL for media files
const getMediaBaseURL = () => {
  // Allow override via Expo public env
  const envBase = (process as any)?.env?.EXPO_PUBLIC_API_BASE as string | undefined;
  if (envBase) {
    return envBase.endsWith('/api') ? envBase.replace('/api', '') : envBase;
  }

  if (!__DEV__) {
    return 'https://echo-yddc.onrender.com';
  }

  // Get IP and port from environment variables
  const SERVER_IP = (process as any)?.env?.EXPO_PUBLIC_SERVER_IP || '172.20.10.2';
  const SERVER_PORT = (process as any)?.env?.EXPO_PUBLIC_SERVER_PORT || '5000';

  if (Platform.OS === 'web') {
    return `http://${SERVER_IP}:${SERVER_PORT}`;
  }

  // Android emulator special loopback
  if (Platform.OS === 'android') {
    return `http://10.0.2.2:${SERVER_PORT}`;
  }

  // iOS simulator can use localhost; physical device needs LAN IP
  return `http://${SERVER_IP}:${SERVER_PORT}`;
};

const MEDIA_BASE_URL = getMediaBaseURL();

// Debug logging
console.log('🔧 Media Utils Initialized');
console.log('📡 MEDIA_BASE_URL:', MEDIA_BASE_URL);
console.log('🌍 Environment:', __DEV__ ? 'Development' : 'Production');
console.log('📱 Platform:', Platform.OS);

/**
 * Constructs a full media URL from a relative path or filename
 * @param mediaUrl - The media URL (can be relative or absolute)
 * @returns Full media URL
 */
export const getFullMediaUrl = (mediaUrl: string): string => {
  if (!mediaUrl) return '';
  
  // If already a full URL, return as is
  if (mediaUrl.startsWith('http://') || mediaUrl.startsWith('https://')) {
    return mediaUrl;
  }
  
  // If starts with /uploads, construct full URL
  if (mediaUrl.startsWith('/uploads/')) {
    const fullUrl = `${MEDIA_BASE_URL}${mediaUrl}`;
    console.log('🔗 Media URL constructed:', mediaUrl, '->', fullUrl);
    return fullUrl;
  }
  
  // If just a filename, assume it's in uploads
  if (!mediaUrl.includes('/')) {
    const fullUrl = `${MEDIA_BASE_URL}/uploads/images/${mediaUrl}`;
    console.log('🔗 Media URL constructed (filename):', mediaUrl, '->', fullUrl);
    return fullUrl;
  }
  
  // Default: prepend base URL
  const fullUrl = `${MEDIA_BASE_URL}/${mediaUrl}`;
  console.log('🔗 Media URL constructed (default):', mediaUrl, '->', fullUrl);
  return fullUrl;
};

/**
 * Validates if a media URL is accessible
 * @param url - The media URL to validate
 * @returns Promise<boolean> - True if accessible
 */
export const validateMediaUrl = async (url: string): Promise<boolean> => {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch (error) {
    console.error('Media URL validation failed:', error);
    return false;
  }
};

/**
 * Requests audio permissions and handles denial gracefully
 * @returns Promise<boolean> - True if permission granted
 */
export const requestAudioPermission = async (): Promise<boolean> => {
  try {
    const { status } = await Audio.requestPermissionsAsync();
    
    if (status === 'granted') {
      return true;
    }
    
    // Show user-friendly message for denied permission
    Toast.show({
      type: 'error',
      text1: 'Audio Permission Required',
      text2: 'Please enable microphone access in your device settings to record and play audio.',
      visibilityTime: 4000,
    });
    
    return false;
  } catch (error) {
    console.error('Error requesting audio permission:', error);
    Toast.show({
      type: 'error',
      text1: 'Permission Error',
      text2: 'Unable to request audio permission. Please check your device settings.',
    });
    return false;
  }
};

/**
 * Plays audio with proper permission handling
 * @param audioUrl - The audio URL to play
 * @param onStatusUpdate - Callback for status updates
 * @returns Promise<Audio.Sound | null> - The sound object or null if failed
 */
export const playAudioWithPermission = async (
  audioUrl: string,
  onStatusUpdate?: (status: any) => void
): Promise<Audio.Sound | null> => {
  try {
    // Check if we have audio permission
    const { status } = await Audio.getPermissionsAsync();
    
    if (status !== 'granted') {
      // Request permission if not granted
      const hasPermission = await requestAudioPermission();
      if (!hasPermission) {
        return null;
      }
    }

    // Set audio mode for playback
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      staysActiveInBackground: false,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });

    // Get full media URL
    const fullUrl = getFullMediaUrl(audioUrl);
    
    // Validate URL before attempting to play
    const isValid = await validateMediaUrl(fullUrl);
    if (!isValid) {
      Toast.show({
        type: 'error',
        text1: 'Audio Error',
        text2: 'Audio file not found or inaccessible.',
      });
      return null;
    }

    // Create and load the sound
    const { sound } = await Audio.Sound.createAsync(
      { uri: fullUrl },
      { shouldPlay: true },
      onStatusUpdate
    );

    return sound;
  } catch (error) {
    console.error('Error playing audio:', error);
    Toast.show({
      type: 'error',
      text1: 'Playback Error',
      text2: 'Failed to play audio. Please try again.',
    });
    return null;
  }
};

/**
 * Gets media type from URL or filename
 * @param mediaUrl - The media URL
 * @returns 'image' | 'video' | 'audio' | 'unknown'
 */
export const getMediaType = (mediaUrl: string): 'image' | 'video' | 'audio' | 'unknown' => {
  if (!mediaUrl) return 'unknown';
  
  const url = mediaUrl.toLowerCase();
  
  if (url.includes('/images/') || url.match(/\.(jpg|jpeg|png|gif|webp|bmp)(\?|$)/)) {
    return 'image';
  }
  
  if (url.includes('/videos/') || url.match(/\.(mp4|mov|avi|mkv|webm|m4v)(\?|$)/)) {
    return 'video';
  }
  
  if (url.includes('/audio/') || url.match(/\.(mp3|wav|m4a|aac|ogg|flac)(\?|$)/)) {
    return 'audio';
  }
  
  return 'unknown';
};

/**
 * Handles media loading errors with user-friendly messages
 * @param error - The error object
 * @param mediaType - Type of media that failed to load
 * @param mediaUrl - The URL that failed to load
 */
export const handleMediaError = (error: any, mediaType: string, mediaUrl: string) => {
  console.error(`❌ ${mediaType} load error:`, error, 'URL:', mediaUrl);
  
  const errorMessages = {
    image: 'Failed to load image',
    video: 'Failed to load video',
    audio: 'Failed to load audio',
  };
  
  Toast.show({
    type: 'error',
    text1: 'Media Error',
    text2: errorMessages[mediaType as keyof typeof errorMessages] || 'Failed to load media',
    visibilityTime: 3000,
  });
};

export default {
  getFullMediaUrl,
  validateMediaUrl,
  requestAudioPermission,
  playAudioWithPermission,
  getMediaType,
  handleMediaError,
  MEDIA_BASE_URL,
};