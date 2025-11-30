import axios, { AxiosResponse } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Platform-specific API URLs
const getBaseURL = () => {
  // Allow override via Expo public env: EXPO_PUBLIC_API_BASE=http://192.168.x.x:5000
  const envBase = (process as any)?.env?.EXPO_PUBLIC_API_BASE as string | undefined;
  if (envBase) return envBase.endsWith('/api') ? envBase : `${envBase}/api`;

  if (!__DEV__) return 'https://your-production-url.com/api';

  // Development defaults per platform
  const YOUR_COMPUTER_IP = '192.168.10.2'; // ✅ Updated to match current backend IP

  if (Platform.OS === 'web') {
    return `http://localhost:5000/api`;
  }

  // Android emulator special loopback
  if (Platform.OS === 'android') {
    return `http://10.0.2.2:5000/api`;
  }

  // iOS simulator can use localhost; physical device needs LAN IP
  return `http://${YOUR_COMPUTER_IP}:5000/api`;
};

const BASE_URL = getBaseURL();

// Log the API URL for debugging
console.log('🌐 API Base URL:', BASE_URL);
console.log('📱 Platform:', Platform.OS);

const getSocketBaseURL = () => {
  if (/\/api\/?$/.test(BASE_URL)) {
    return BASE_URL.replace(/\/api\/?$/, '');
  }
  return BASE_URL;
};

export const SOCKET_BASE_URL = getSocketBaseURL();

// Create axios instance with retry logic
export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 60000, // Increased to 60 seconds
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add retry interceptor
let retryCount = 0;
const MAX_RETRIES = 3;

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      await AsyncStorage.removeItem('authToken');
      // You might want to redirect to login screen here
    }
    
    // Better error messages for timeout and network errors
    if (error.code === 'ECONNABORTED') {
      console.error('❌ Request timeout - Server took too long to respond');
      error.message = 'Request timeout. Please check your connection and try again.';
    } else if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
      console.error('❌ Network error - Cannot reach server at:', BASE_URL);
      error.message = 'Cannot connect to server. Please check if the backend is running.';
    }
    
    return Promise.reject(error);
  }
);

// Health check function
export const checkServerHealth = async (): Promise<boolean> => {
  try {
    const response = await axios.get(`${SOCKET_BASE_URL}/health`, { timeout: 5000 });
    console.log('✅ Server health check passed:', response.data);
    return true;
  } catch (error) {
    console.error('❌ Server health check failed:', error);
    return false;
  }
};

// API Response types
interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  token?: string;
  user?: any;
  users?: T[]; // Add users field for user search
  count?: number; // Add count field for user search
}

interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total?: number;
    hasMore: boolean;
  };
}

// Auth API
export const authAPI = {
  login: async (emailOrUsername: string, password: string): Promise<ApiResponse> => {
    const response: AxiosResponse<ApiResponse> = await api.post('/auth/login', {
      identifier: emailOrUsername,
      password,
    });
    return response.data;
  },

  signup: async (userData: {
    email: string;
    phone?: string;
    password: string;
    username: string;
    preferences: string[];
    avatar?: string;
  }): Promise<ApiResponse> => {
    const response: AxiosResponse<ApiResponse> = await api.post('/auth/signup', userData);
    return response.data;
  },

  verifyToken: async (token: string): Promise<ApiResponse> => {
    const response: AxiosResponse<ApiResponse> = await api.post('/auth/verify-token', {
      token,
    });
    return response.data;
  },

  refreshToken: async (token: string): Promise<ApiResponse> => {
    const response: AxiosResponse<ApiResponse> = await api.post('/auth/refresh-token', {
      token,
    });
    return response.data;
  },

  requestPasswordReset: async (emailOrPhone: string): Promise<ApiResponse> => {
    const response: AxiosResponse<ApiResponse> = await api.post('/auth/forgot-password', {
      emailOrPhone,
    });
    return response.data;
  },

  verifyResetCode: async (emailOrPhone: string, code: string): Promise<ApiResponse> => {
    const response: AxiosResponse<ApiResponse> = await api.post('/auth/verify-reset-code', {
      emailOrPhone,
      code,
    });
    return response.data;
  },

  resetPassword: async (emailOrPhone: string, code: string, newPassword: string): Promise<ApiResponse> => {
    const response: AxiosResponse<ApiResponse> = await api.post('/auth/reset-password', {
      emailOrPhone,
      code,
      newPassword,
    });
    return response.data;
  },
};

// User API
export const userAPI = {
  getProfile: async (username: string): Promise<ApiResponse> => {
    const response: AxiosResponse<ApiResponse> = await api.get(`/user/profile/${username}`);
    return response.data;
  },

  updateProfile: async (userData: {
    bio?: string;
    preferences?: string[];
    avatar?: string;
    settings?: any;
    customAvatar?: any;
  }): Promise<ApiResponse> => {
    const response: AxiosResponse<ApiResponse> = await api.put('/user/profile', userData);
    return response.data;
  },

  updateAvatar: async (customAvatar: any): Promise<ApiResponse> => {
    const response: AxiosResponse<ApiResponse> = await api.put('/user/avatar', { customAvatar });
    return response.data;
  },

  getAvatarPresets: async (): Promise<ApiResponse> => {
    const response: AxiosResponse<ApiResponse> = await api.get('/user/avatar/presets');
    return response.data;
  },

  changePassword: async (currentPassword: string, newPassword: string): Promise<ApiResponse> => {
    const response: AxiosResponse<ApiResponse> = await api.put('/user/change-password', {
      currentPassword,
      newPassword,
    });
    return response.data;
  },

  changeUsername: async (newUsername: string): Promise<ApiResponse> => {
    const response: AxiosResponse<ApiResponse> = await api.put('/user/change-username', {
      newUsername,
    });
    return response.data;
  },

  echoUser: async (userId: string): Promise<ApiResponse> => {
    const response: AxiosResponse<ApiResponse> = await api.post(`/user/echo/${userId}`);
    return response.data;
  },

  unechoUser: async (userId: string): Promise<ApiResponse> => {
    const response: AxiosResponse<ApiResponse> = await api.delete(`/user/echo/${userId}`);
    return response.data;
  },

  discoverUsers: async (limit: number = 10): Promise<ApiResponse> => {
    const response: AxiosResponse<ApiResponse> = await api.get(`/user/discover?limit=${limit}`);
    return response.data;
  },

  getEchoTrails: async (userId: string): Promise<ApiResponse> => {
    const response: AxiosResponse<ApiResponse> = await api.get(`/user/echo-trails/${userId}`);
    return response.data;
  },

  getNotifications: async (): Promise<ApiResponse> => {
    const response: AxiosResponse<ApiResponse> = await api.get('/user/notifications');
    return response.data;
  },

  markNotificationsRead: async (notificationIds?: string[]): Promise<ApiResponse> => {
    const payload = Array.isArray(notificationIds) && notificationIds.length > 0
      ? { notificationIds }
      : {};
    const response: AxiosResponse<ApiResponse> = await api.post('/user/notifications/read', payload);
    return response.data;
  },

  searchUsers: async (query: string, page: number = 1, limit: number = 20): Promise<ApiResponse> => {
    const response: AxiosResponse<ApiResponse> = await api.get(
      `/user/search?q=${encodeURIComponent(query)}&page=${page}&limit=${limit}`
    );
    return response.data;
  },

  getUserProfile: async (username: string): Promise<ApiResponse> => {
    const response: AxiosResponse<ApiResponse> = await api.get(`/user/profile/${username}`);
    return response.data;
  },

  followUser: async (userId: string): Promise<ApiResponse> => {
    const response: AxiosResponse<ApiResponse> = await api.post(`/user/follow/${userId}`);
    return response.data;
  },

  unfollowUser: async (userId: string): Promise<ApiResponse> => {
    const response: AxiosResponse<ApiResponse> = await api.delete(`/user/follow/${userId}`);
    return response.data;
  },

  getFollowers: async (userId: string, page: number = 1, limit: number = 20): Promise<PaginatedResponse<any>> => {
    const response: AxiosResponse<PaginatedResponse<any>> = await api.get(
      `/user/${userId}/followers?page=${page}&limit=${limit}`
    );
    return response.data;
  },

  getFollowing: async (userId: string, page: number = 1, limit: number = 20): Promise<PaginatedResponse<any>> => {
    const response: AxiosResponse<PaginatedResponse<any>> = await api.get(
      `/user/${userId}/following?page=${page}&limit=${limit}`
    );
    return response.data;
  },

  muteUser: async (userId: string): Promise<ApiResponse> => {
    const response: AxiosResponse<ApiResponse> = await api.post(`/user/${userId}/mute`);
    return response.data;
  },

  unmuteUser: async (userId: string): Promise<ApiResponse> => {
    const response: AxiosResponse<ApiResponse> = await api.delete(`/user/${userId}/mute`);
    return response.data;
  },

  blockUser: async (userId: string): Promise<ApiResponse> => {
    const response: AxiosResponse<ApiResponse> = await api.post(`/user/${userId}/block`);
    return response.data;
  },

  unblockUser: async (userId: string): Promise<ApiResponse> => {
    const response: AxiosResponse<ApiResponse> = await api.delete(`/user/${userId}/block`);
    return response.data;
  },

  getBlockedUsers: async (): Promise<ApiResponse> => {
    const response: AxiosResponse<ApiResponse> = await api.get('/user/blocked');
    return response.data;
  },

  trackPreference: async (category: string): Promise<ApiResponse> => {
    const response: AxiosResponse<ApiResponse> = await api.post('/user/preferences/track', { category });
    return response.data;
  },
};

// Posts API
export const postsAPI = {
  createPost: async (postData: {
    content: {
      text: string;
      image?: string;
      voiceNote?: string;
      media?: Array<{
        url: string;
        type: 'image' | 'video' | 'audio';
        filename: string;
        originalName: string;
        size: number;
      }>;
    };
    category: string;
    visibility?: 'normal' | 'disguise';
    disguiseAvatar?: string;
    vanishMode?: {
      enabled: boolean;
      duration?: '1hour' | '6hours' | '12hours' | '1day' | '1week';
    };
    tags?: string[];
    poll?: {
      enabled: boolean;
      type: 'yesno' | 'emoji' | 'multi';
      question: string;
      options: Array<{
        text: string;
        emoji?: string;
        votes: any[];
        voteCount: number;
      }>;
      totalVotes: number;
      isAnonymous: boolean;
    };
    geoLocation?: {
      type: 'Point';
      coordinates: [number, number];
    };
    locationEnabled?: boolean;
  }): Promise<ApiResponse> => {
    const response: AxiosResponse<ApiResponse> = await api.post('/posts', postData);
    return response.data;
  },

  getFeed: async (page: number = 1, limit: number = 20): Promise<PaginatedResponse<any>> => {
    const response: AxiosResponse<any> = await api.get(`/posts/feed?page=${page}&limit=${limit}`);
    // Backend returns { success, posts, pagination }. Normalize to { success, data, pagination }
    const { success, posts, pagination } = response.data || {};
    return { success: !!success, data: posts || [], pagination } as PaginatedResponse<any>;
  },

  getExplorePosts: async (
    page: number = 1,
    limit: number = 20,
    category?: string,
    filter: 'trending' | 'recent' | 'popular' = 'trending'
  ): Promise<PaginatedResponse<any>> => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      filter,
    });
    if (category) params.append('category', category);
    
    const response: AxiosResponse<any> = await api.get(
      `/posts/explore?${params}`
    );
    // Backend returns { success, posts, pagination }. Normalize to { success, data, pagination }
    const { success, posts, pagination } = response.data || {};
    return { success: !!success, data: posts || [], pagination } as PaginatedResponse<any>;
  },

  searchPosts: async (
    query: string,
    page: number = 1,
    limit: number = 20,
    category?: string
  ): Promise<PaginatedResponse<any>> => {
    const params = new URLSearchParams({
      q: query,
      page: page.toString(),
      limit: limit.toString(),
    });
    if (category) params.append('category', category);
    
    const response: AxiosResponse<any> = await api.get(
      `/posts/search?${params}`
    );
    // Backend returns { success, posts, pagination }. Normalize to { success, data, pagination }
    const { success, posts, pagination } = response.data || {};
    return { success: !!success, data: posts || [], pagination } as PaginatedResponse<any>;
  },

  getPost: async (postId: string): Promise<ApiResponse> => {
    const response: AxiosResponse<ApiResponse> = await api.get(`/posts/${postId}`);
    return response.data;
  },

  getUserPosts: async (
    username: string,
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedResponse<any>> => {
    const response: AxiosResponse<PaginatedResponse<any>> = await api.get(
      `/posts/user/${username}?page=${page}&limit=${limit}`
    );
    return response.data;
  },

  addComment: async (
    postId: string,
    content: string,
    isAnonymous: boolean = false
  ): Promise<ApiResponse> => {
    const response: AxiosResponse<ApiResponse> = await api.post(`/posts/${postId}/comments`, {
      content,
      isAnonymous,
    });
    return response.data;
  },

  addReply: async (
    postId: string,
    commentId: string,
    content: string
  ): Promise<ApiResponse> => {
    const response: AxiosResponse<ApiResponse> = await api.post(
      `/posts/${postId}/comments/${commentId}/replies`,
      { content }
    );
    return response.data;
  },

  getReplies: async (postId: string, commentId: string): Promise<ApiResponse> => {
    const response: AxiosResponse<ApiResponse> = await api.get(
      `/posts/${postId}/comments/${commentId}/replies`
    );
    return response.data;
  },

  editPost: async (postId: string, postData: {
    content?: {
      text: string;
      media?: Array<{
        url: string;
        type: 'image' | 'video' | 'audio';
        filename: string;
        originalName: string;
        size: number;
      }>;
    };
    category?: string;
    tags?: string[];
  }): Promise<ApiResponse> => {
    const response: AxiosResponse<ApiResponse> = await api.put(`/posts/${postId}`, postData);
    return response.data;
  },

  deletePost: async (postId: string): Promise<ApiResponse> => {
    const response: AxiosResponse<ApiResponse> = await api.delete(`/posts/${postId}`);
    return response.data;
  },

  reportPost: async (postId: string, reason: string): Promise<ApiResponse> => {
    const response: AxiosResponse<ApiResponse> = await api.post(`/posts/${postId}/report`, {
      reason,
    });
    return response.data;
  },

  hidePost: async (postId: string): Promise<ApiResponse> => {
    const response: AxiosResponse<ApiResponse> = await api.post(`/posts/${postId}/hide`);
    return response.data;
  },

  unhidePost: async (postId: string): Promise<ApiResponse> => {
    const response: AxiosResponse<ApiResponse> = await api.delete(`/posts/${postId}/hide`);
    return response.data;
  },

  markOneTimeViewed: async (postId: string): Promise<ApiResponse> => {
    const response: AxiosResponse<ApiResponse> = await api.post(`/posts/${postId}/mark-viewed`);
    return response.data;
  },

  voteOnPoll: async (postId: string, optionIndex: number): Promise<ApiResponse> => {
    const response: AxiosResponse<ApiResponse> = await api.post(`/posts/${postId}/poll/vote`, {
      optionIndex,
    });
    return response.data;
  },

  lockPost: async (postId: string, lockType: 'comments' | 'reactions' | 'both', locked: boolean): Promise<ApiResponse> => {
    const response: AxiosResponse<ApiResponse> = await api.post(`/posts/${postId}/lock`, {
      lockType,
      locked,
    });
    return response.data;
  },
};

// Chat API
export const chatAPI = {
  getUnreadCount: async (): Promise<any> => {
    const response: AxiosResponse<any> = await api.get('/chat/unread-count');
    return response.data;
  },
  getConversations: async (): Promise<any> => {
    const response: AxiosResponse<any> = await api.get('/chat/conversations');
    return response.data;
  },
  getMessages: async (
    peerId: string,
    page: number = 1,
    limit: number = 30
  ): Promise<any> => {
    const response: AxiosResponse<any> = await api.get(`/chat/messages/${peerId}?page=${page}&limit=${limit}`);
    return response.data;
  },
  sendMessage: async (peerId: string, text: string, media?: Array<{ url: string; type: 'image' | 'video' | 'audio'; filename: string; originalName: string; size: number }>): Promise<any> => {
    const response: AxiosResponse<any> = await api.post(`/chat/messages/${peerId}`, { text, media });
    return response.data;
  },
  markRead: async (peerId: string): Promise<any> => {
    const response: AxiosResponse<any> = await api.post(`/chat/read/${peerId}`);
    return response.data;
  },
  editMessage: async (peerId: string, messageId: string, text: string): Promise<any> => {
    const response: AxiosResponse<any> = await api.patch(`/chat/messages/${peerId}/${messageId}`, { text });
    return response.data;
  },
  deleteMessage: async (peerId: string, messageId: string): Promise<any> => {
    const response: AxiosResponse<any> = await api.delete(`/chat/messages/${peerId}/${messageId}`);
    return response.data;
  },
  reactToMessage: async (peerId: string, messageId: string, type: 'funny' | 'rage' | 'shock' | 'relatable' | 'love' | 'thinking'): Promise<any> => {
    const response: AxiosResponse<any> = await api.post(`/chat/messages/${peerId}/${messageId}/react`, { type });
    return response.data;
  },
  removeMessageReaction: async (peerId: string, messageId: string): Promise<any> => {
    const response: AxiosResponse<any> = await api.delete(`/chat/messages/${peerId}/${messageId}/react`);
    return response.data;
  },
};

// WhisperWall API
export const whisperWallAPI = {
  // Simplified API methods for WhisperWall
  createWhisper: async (postData: {
    content: {
      text: string;
      media?: Array<{
        url: string;
        type: 'image' | 'video' | 'audio';
        filename: string;
        originalName: string;
        size: number;
      }>;
    };
    category: string;
    tags?: string[];
    backgroundAnimation?: 'none' | 'rain' | 'neon' | 'fire' | 'snow' | 'hearts' | 'mist';
    vanishMode?: {
      enabled: boolean;
      duration?: '1hour' | '6hours' | '12hours' | '24hours' | '1day' | '1week' | 'custom';
      customMinutes?: number;
    };
    oneTime?: {
      enabled: boolean;
    };
  }): Promise<ApiResponse> => {
    const response: AxiosResponse<ApiResponse> = await api.post('/whisperwall', postData);
    return response.data;
  },

  getWhispers: async (
    page: number = 1,
    limit: number = 20,
    category?: string,
    filter: 'trending' | 'recent' | 'popular' = 'recent'
  ): Promise<any> => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      filter,
    });
    if (category) params.append('category', category);
    
    const response: AxiosResponse<any> = await api.get(`/whisperwall?${params}`);
    return response.data;
  },

  getWhisper: async (postId: string): Promise<ApiResponse> => {
    const response: AxiosResponse<ApiResponse> = await api.get(`/whisperwall/${postId}`);
    return response.data;
  },

  reactToWhisper: async (
    postId: string,
    reactionType: 'funny' | 'rage' | 'shock' | 'relatable' | 'love' | 'thinking'
  ): Promise<ApiResponse> => {
    const response: AxiosResponse<ApiResponse> = await api.post(
      `/whisperwall/${postId}/react`,
      { reactionType }
    );
    return response.data;
  },

  removeWhisperReaction: async (postId: string): Promise<ApiResponse> => {
    const response: AxiosResponse<ApiResponse> = await api.delete(`/whisperwall/${postId}/react`);
    return response.data;
  },

  addWhisperComment: async (postId: string, content: string): Promise<ApiResponse> => {
    const response: AxiosResponse<ApiResponse> = await api.post(
      `/whisperwall/${postId}/comments`,
      { content }
    );
    return response.data;
  },

  getDailyChallenge: async (): Promise<ApiResponse> => {
    const response: AxiosResponse<ApiResponse> = await api.get('/whisperwall/daily-challenge');
    return response.data;
  },

  getTopWhisper: async (): Promise<ApiResponse> => {
    const response: AxiosResponse<ApiResponse> = await api.get('/whisperwall/top-whisper');
    return response.data;
  },

  getMoodWeather: async (): Promise<ApiResponse> => {
    const response: AxiosResponse<ApiResponse> = await api.get('/whisperwall/mood-weather');
    return response.data;
  },

  markWhisperViewed: async (postId: string): Promise<ApiResponse> => {
    const response: AxiosResponse<ApiResponse> = await api.post(`/whisperwall/${postId}/mark-viewed`);
    return response.data;
  },

  getUserWhispers: async (
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<any> => {
    const response: AxiosResponse<any> = await api.get(
      `/whisperwall/user/${userId}?page=${page}&limit=${limit}`
    );
    return response.data;
  },

  editWhisper: async (
    postId: string,
    updateData: {
      content?: { text: string; media?: any[] };
      category?: string;
      tags?: string[];
      backgroundAnimation?: string;
    }
  ): Promise<ApiResponse> => {
    const response: AxiosResponse<ApiResponse> = await api.put(
      `/whisperwall/${postId}`,
      updateData
    );
    return response.data;
  },

  deleteWhisper: async (postId: string): Promise<ApiResponse> => {
    const response: AxiosResponse<ApiResponse> = await api.delete(`/whisperwall/${postId}`);
    return response.data;
  },
};

// Reactions API
export const reactionsAPI = {
  addReaction: async (
    postId: string,
    reactionType: 'funny' | 'rage' | 'shock' | 'relatable' | 'love' | 'thinking'
  ): Promise<ApiResponse> => {
    const response: AxiosResponse<ApiResponse> = await api.post(`/reactions/${postId}`, {
      reactionType,
    });
    return response.data;
  },

  removeReaction: async (postId: string): Promise<ApiResponse> => {
    const response: AxiosResponse<ApiResponse> = await api.delete(`/reactions/${postId}`);
    return response.data;
  },

  getReactionUsers: async (
    postId: string,
    reactionType: string,
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedResponse<any>> => {
    const response: AxiosResponse<PaginatedResponse<any>> = await api.get(
      `/reactions/${postId}/users/${reactionType}?page=${page}&limit=${limit}`
    );
    return response.data;
  },

  reactToComment: async (
    postId: string,
    commentId: string,
    reactionType: 'funny' | 'love'
  ): Promise<ApiResponse> => {
    const response: AxiosResponse<ApiResponse> = await api.post(
      `/reactions/comments/${postId}/${commentId}`,
      { reactionType }
    );
    return response.data;
  },

  removeCommentReaction: async (postId: string, commentId: string): Promise<ApiResponse> => {
    const response: AxiosResponse<ApiResponse> = await api.delete(
      `/reactions/comments/${postId}/${commentId}`
    );
    return response.data;
  },

  getTrendingReactions: async (
    timeframe: '1h' | '24h' | '7d' = '24h',
    limit: number = 10
  ): Promise<ApiResponse> => {
    const response: AxiosResponse<ApiResponse> = await api.get(
      `/reactions/trending?timeframe=${timeframe}&limit=${limit}`
    );
    return response.data;
  },
};

// Location API
export const locationAPI = {
  getNearbyPosts: async (
    latitude: number,
    longitude: number,
    radius: number = 50,
    page: number = 1,
    limit: number = 20
  ): Promise<ApiResponse> => {
    const response: AxiosResponse<ApiResponse> = await api.get(
      `/location/nearby?latitude=${latitude}&longitude=${longitude}&radius=${radius}&page=${page}&limit=${limit}`
    );
    return response.data;
  },

  getPostsByRing: async (
    latitude: number,
    longitude: number,
    ring: 'inner' | 'mid' | 'outer' = 'inner',
    page: number = 1,
    limit: number = 20
  ): Promise<ApiResponse> => {
    const response: AxiosResponse<ApiResponse> = await api.get(
      `/location/ring?latitude=${latitude}&longitude=${longitude}&ring=${ring}&page=${page}&limit=${limit}`
    );
    return response.data;
  },

  getAreaStats: async (
    latitude: number,
    longitude: number,
    radius: number = 10
  ): Promise<ApiResponse> => {
    const response: AxiosResponse<ApiResponse> = await api.get(
      `/location/area-stats?latitude=${latitude}&longitude=${longitude}&radius=${radius}`
    );
    return response.data;
  },
};

// Media upload API
export const mediaAPI = {
  uploadSingle: async (file: {
    uri: string;
    type: string;
    name: string;
  }): Promise<ApiResponse> => {
    const formData = new FormData();
    formData.append('media', {
      uri: file.uri,
      type: file.type,
      name: file.name,
    } as any);

    const response: AxiosResponse<ApiResponse> = await api.post('/upload/single', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  uploadMultiple: async (files: Array<{
    uri: string;
    type: string;
    name: string;
    mediaType: 'photo' | 'video';
  }>): Promise<ApiResponse> => {
    const formData = new FormData();
    
    files.forEach((file, index) => {
      if (file.uri.startsWith('data:')) {
        // Handle web files (base64 data URLs)
        const base64Data = file.uri.split(',')[1];
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: file.type });
        formData.append('media', blob, file.name);
      } else {
        // Handle mobile files (file URIs)
        formData.append('media', {
          uri: file.uri,
          type: file.type,
          name: file.name,
        } as any);
      }
    });

    const response: AxiosResponse<ApiResponse> = await api.post('/upload/multiple', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};

export default api;
