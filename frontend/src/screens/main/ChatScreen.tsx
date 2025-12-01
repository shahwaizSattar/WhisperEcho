import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Image, Animated, Pressable, Dimensions, Keyboard, ScrollView, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { RootStackParamList } from '../../types/navigation';
import { useAuth } from '../../context/AuthContext';
import { chatAPI, mediaAPI } from '../../services/api';
import { getSocket } from '../../services/socket';
import Toast from 'react-native-toast-message';
import { getFullMediaUrl, playAudioWithPermission, handleMediaError, requestAudioPermission } from '../../utils/mediaUtils';
import ReactionPopup from '../../components/ReactionPopup';
import * as ImagePicker from 'expo-image-picker';
import { Video } from 'expo-av';
import { Audio } from 'expo-av';
import { useMessageNotification } from '../../context/MessageNotificationContext';

type ChatRouteProp = RouteProp<RootStackParamList, 'Chat'>;

type ReactionType = 'funny' | 'rage' | 'shock' | 'relatable' | 'love' | 'thinking';

interface Reaction {
  user: string;
  type: ReactionType;
  createdAt: string;
}

interface MediaItem {
  url: string;
  type: 'image' | 'video' | 'audio';
  filename: string;
  originalName: string;
  size: number;
}

interface MessageItem {
  id: string;
  text: string;
  media?: MediaItem[];
  createdAt: string;
  senderId: string;
  reactions?: Reaction[];
  editedAt?: string;
}

const REACTION_ICONS: Record<ReactionType, string> = {
  funny: '😂',
  rage: '😡',
  shock: '😱',
  relatable: '💯',
  love: '❤️',
  thinking: '🤔',
};

const ChatScreen: React.FC = () => {
  const { theme } = useTheme();
  const route = useRoute<ChatRouteProp>();
  const { user } = useAuth();
  const navigation = useNavigation();
  const { refreshUnreadCount } = useMessageNotification();
  const { peerId, username, avatar } = route.params;

  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [input, setInput] = useState('');
  const [selectedMedia, setSelectedMedia] = useState<MediaItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showMediaOptions, setShowMediaOptions] = useState(false);
  const [playingAudio, setPlayingAudio] = useState<{ [key: string]: Audio.Sound }>({});
  const [audioStatus, setAudioStatus] = useState<{ [key: string]: { isPlaying: boolean; duration: number; position: number } }>({});
  const [fullscreenMedia, setFullscreenMedia] = useState<{ url: string; type: 'image' | 'video' } | null>(null);
  const listRef = useRef<FlatList<MessageItem>>(null);
  const [actionFor, setActionFor] = useState<{ id: string; text: string; position: { x: number; y: number } } | null>(null);
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(null);
  const [reactionPopup, setReactionPopup] = useState<{ visible: boolean; messageId: string; position: { x: number; y: number } }>({ visible: false, messageId: '', position: { x: 0, y: 0 } });
  const blurAnim = useRef(new Animated.Value(0)).current;
  const editingMessageY = useRef(new Animated.Value(0)).current;

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.xl,
      paddingVertical: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    headerAvatar: { width: 36, height: 36, borderRadius: 18, marginRight: 10 },
    headerName: { color: theme.colors.text, fontSize: 16, fontWeight: '700' },
    list: { flex: 1 },
    bubbleRow: { paddingHorizontal: theme.spacing.xl, marginVertical: 6 },
    bubble: { padding: 10, borderRadius: 14 },
    bubbleMe: { backgroundColor: theme.colors.primary },
    bubbleOther: { backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border },
    bubbleTextMe: { color: theme.colors.textInverse, fontSize: 15 },
    bubbleTextOther: { color: theme.colors.text, fontSize: 15 },
    time: { fontSize: 10, marginTop: 4, opacity: 0.7 },
    reactionsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginTop: 4,
      gap: 4,
    },
    reactionBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.background,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 12,
      paddingHorizontal: 6,
      paddingVertical: 2,
      gap: 2,
    },
    reactionEmoji: {
      fontSize: 12,
    },
    reactionCount: {
      fontSize: 10,
      fontWeight: '600',
    },
    composerWrap: {
      padding: theme.spacing.md,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      elevation: 10,
    },
    composerRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    mediaPreviewContainer: {
      flexDirection: 'row',
      paddingVertical: 8,
      paddingHorizontal: 4,
      gap: 8,
      flexWrap: 'wrap',
    },
    mediaPreviewItem: {
      width: 80,
      height: 80,
      borderRadius: 8,
      overflow: 'hidden',
      position: 'relative',
      backgroundColor: theme.colors.background,
    },
    mediaPreviewImage: {
      width: '100%',
      height: '100%',
    },
    removeMediaBtn: {
      position: 'absolute',
      top: 4,
      right: 4,
      backgroundColor: 'rgba(0,0,0,0.6)',
      borderRadius: 12,
      width: 24,
      height: 24,
      justifyContent: 'center',
      alignItems: 'center',
    },
    mediaButton: {
      paddingHorizontal: 12,
      paddingVertical: 10,
      marginRight: 8,
    },
    messageMedia: {
      marginTop: 8,
      borderRadius: 12,
      overflow: 'hidden',
    },
    messageImage: {
      width: 250,
      height: 250,
      borderRadius: 8,
    },
    messageVideo: {
      width: 250,
      height: 250,
      borderRadius: 8,
    },
    messageAudio: {
      width: '100%',
      height: 50,
    },
    audioContainer: {
      minWidth: 200,
      maxWidth: 280,
      backgroundColor: 'rgba(255,255,255,0.1)',
      borderRadius: 20,
      padding: 12,
      marginTop: 4,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    audioContainerMe: {
      backgroundColor: 'rgba(255,255,255,0.2)',
    },
    audioContainerOther: {
      backgroundColor: 'rgba(0,0,0,0.05)',
    },
    playButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: 'rgba(255,255,255,0.3)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    audioWaveform: {
      flex: 1,
      height: 30,
      justifyContent: 'center',
    },
    audioDuration: {
      fontSize: 11,
      opacity: 0.8,
    },
    mediaContainer: {
      marginTop: 4,
      borderRadius: 8,
      overflow: 'hidden',
    },
    videoOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0,0,0,0.3)',
    },
    videoPlayButton: {
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: 'rgba(255,255,255,0.9)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    recordButton: {
      paddingHorizontal: 12,
      paddingVertical: 10,
      marginRight: 8,
    },

    attachMenuModal: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    attachMenuContainer: {
      backgroundColor: theme.colors.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingVertical: 20,
      paddingHorizontal: 16,
      paddingBottom: 40,
    },
    attachMenuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 16,
      paddingHorizontal: 20,
      borderRadius: 12,
      marginBottom: 8,
      backgroundColor: theme.colors.background,
    },
    attachMenuIcon: {
      fontSize: 28,
      marginRight: 16,
    },
    attachMenuText: {
      color: theme.colors.text,
      fontSize: 16,
      fontWeight: '600',
    },
    plusButton: {
      paddingHorizontal: 12,
      paddingVertical: 10,
      marginRight: 8,
    },
    fullscreenModal: {
      flex: 1,
      backgroundColor: '#000',
      justifyContent: 'center',
      alignItems: 'center',
    },
    fullscreenImage: {
      width: '100%',
      height: '100%',
    },
    fullscreenVideo: {
      width: Dimensions.get('window').width,
      height: Dimensions.get('window').height * 0.6,
    },
    fullscreenCloseButton: {
      position: 'absolute',
      top: Platform.OS === 'ios' ? 60 : 40,
      right: 20,
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
      elevation: 10,
    },
    input: {
      flex: 1,
      backgroundColor: theme.colors.background,
      color: theme.colors.text,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 24,
      paddingHorizontal: 16,
      paddingVertical: Platform.select({ ios: 12, android: 8, default: 10 }),
      marginRight: 10,
    },
    sendBtn: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 20,
      backgroundColor: theme.colors.primary,
    },
    sendText: { color: theme.colors.textInverse, fontWeight: '700' },
  });

  useEffect(() => {
    const load = async () => {
      try {
        const res = await chatAPI.getMessages(peerId, 1, 30);
        const msgsRaw: MessageItem[] = (res.messages || []).map((m: any): MessageItem => ({
          id: m._id || Math.random().toString(36).slice(2),
          text: m.text || '',
          media: m.media || [],
          createdAt: m.createdAt || new Date().toISOString(),
          senderId: m.sender || '',
          reactions: m.reactions || [],
          editedAt: m.editedAt,
        }));
        const msgs = msgsRaw.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        setMessages(msgs);
        // Mark messages as read when opening chat
        chatAPI.markRead(peerId).then(() => refreshUnreadCount()).catch(() => {});
      } catch (e: any) {
        console.error('Failed to load messages:', e);
        Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to load messages' });
        setMessages([]);
      }
    };
    load();
  }, [peerId]);

  useEffect(() => {
    if (editing || actionFor) {
      Animated.parallel([
        Animated.timing(blurAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: false,
        }),
        Animated.spring(editingMessageY, {
          toValue: 1,
          useNativeDriver: true,
          tension: 50,
          friction: 7,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(blurAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: false,
        }),
        Animated.timing(editingMessageY, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [editing, actionFor]);

  useEffect(() => {
    const socket = getSocket();
    if (user?._id) socket.emit('join-room', user._id);
    const onNewMessage = (payload: any) => {
      try {
        const { sender, message } = payload || {};
        const senderId = String(sender?._id || sender);
        const peer = String(peerId);
        const myId = String(user?._id || '');
        const messageId = message?._id;
        
        // Append only if message is from the peer (not me)
        if (senderId && senderId === peer && senderId !== myId && messageId) {
          setMessages(prev => {
            // Check if message already exists
            const exists = prev.some(m => m.id === messageId);
            if (exists) {
              return prev; // Don't add duplicate
            }
            
            const next = [...prev, { 
              id: messageId, 
              text: message?.text || '', 
              media: message?.media || [], 
              createdAt: message?.createdAt || new Date().toISOString(), 
              senderId: sender?._id || '', 
              reactions: message?.reactions || [] 
            }];
            requestAnimationFrame(() => {
              listRef.current?.scrollToEnd({ animated: true });
            });
            return next;
          });
          // keep thread read while viewing
          chatAPI.markRead(peerId).then(() => refreshUnreadCount()).catch(() => {});
        }
      } catch (e) {}
    };
    socket.on('chat:new-message', onNewMessage);
    const onUpdated = (payload: any) => {
      try {
        const { messageId, text, editedAt, sender } = payload || {};
        if (String(sender?._id || sender) === String(peerId)) {
          setMessages(prev => prev.map(m => m.id === messageId ? { ...m, text, editedAt } : m));
        }
      } catch (e) {}
    };
    const onDeleted = (payload: any) => {
      try {
        const { messageId, sender } = payload || {};
        if (String(sender?._id || sender) === String(peerId)) {
          setMessages(prev => prev.filter(m => m.id !== messageId));
        }
      } catch (e) {}
    };
    const onReacted = (payload: any) => {
      try {
        const { messageId, reactions } = payload || {};
        setMessages(prev => prev.map(m => m.id === messageId ? { ...m, reactions: reactions || [] } : m));
      } catch (e) {}
    };
    socket.on('chat:new-message', onNewMessage);
    socket.on('chat:message-updated', onUpdated);
    socket.on('chat:message-deleted', onDeleted);
    socket.on('chat:message-reacted', onReacted);
    return () => {
      socket.off('chat:new-message', onNewMessage);
      socket.off('chat:message-updated', onUpdated);
      socket.off('chat:message-deleted', onDeleted);
      socket.off('chat:message-reacted', onReacted);
      if (user?._id) socket.emit('leave-room', user._id);
      
      // Clean up audio players
      Object.values(playingAudio).forEach(async (sound) => {
        try {
          await sound.stopAsync();
          await sound.unloadAsync();
        } catch (e) {}
      });
    };
  }, [peerId, user?._id, playingAudio]);

  const openMediaOptions = () => {
    setShowMediaOptions(true);
  };

  const pickFromGallery = async () => {
    try {
      console.log('📷 Opening gallery...');
      
      // Check permissions first
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      console.log('📋 Media library permission status:', status);
      
      if (status !== 'granted') {
        console.log('❌ Media permission denied');
        Toast.show({ type: 'error', text1: 'Permission denied', text2: 'Please allow media access in settings' });
        return;
      }

      console.log('✅ Media permission granted, launching gallery...');
      
      const options = {
        mediaTypes: ['images', 'videos'] as any,
        allowsMultipleSelection: true,
        quality: 0.8,
        videoMaxDuration: 60,
        allowsEditing: false,
      };
      
      console.log('📋 Gallery options:', options);
      
      const result = await ImagePicker.launchImageLibraryAsync(options);
      console.log('📱 Gallery result received');
      
      await handleMediaResult(result);
    } catch (error) {
      console.error('❌ Gallery picker error:', error);
      Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to open gallery' });
      setUploading(false);
    }
  };

  const takePhoto = async () => {
    try {
      console.log('📸 Opening camera...');
      
      // Check permissions first
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      console.log('📋 Camera permission status:', status);
      
      if (status !== 'granted') {
        console.log('❌ Camera permission denied');
        Toast.show({ type: 'error', text1: 'Permission denied', text2: 'Please allow camera access in settings' });
        return;
      }

      console.log('✅ Camera permission granted, launching camera...');
      
      const options = {
        mediaTypes: ['images', 'videos'] as any,
        quality: 0.8,
        videoMaxDuration: 60,
        allowsEditing: false,
      };
      
      console.log('📋 Camera options:', options);
      
      const result = await ImagePicker.launchCameraAsync(options);
      console.log('📱 Camera result received');
      
      await handleMediaResult(result);
    } catch (error) {
      console.error('❌ Camera error:', error);
      Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to open camera' });
      setUploading(false);
    }
  };

  const handleMediaResult = async (result: any) => {
    console.log('📱 Media result:', JSON.stringify(result, null, 2));

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setUploading(true);
      Toast.show({ type: 'info', text1: 'Uploading...', text2: `Processing ${result.assets.length} file(s)` });
      
      try {
        console.log('📋 Processing assets:', result.assets);
        
        const files = result.assets.map((asset: any, index: number) => {
          console.log(`📄 Asset ${index}:`, {
            uri: asset.uri,
            type: asset.type,
            fileName: asset.fileName,
            width: asset.width,
            height: asset.height,
            mimeType: asset.mimeType
          });
          
          // Determine media type from asset type or mimeType
          const isVideo = asset.type === 'video' || asset.mimeType?.startsWith('video/');
          const mediaType = isVideo ? 'video' : 'photo';
          const fileType = isVideo ? 'video/mp4' : 'image/jpeg';
          const extension = isVideo ? 'mp4' : 'jpg';
          
          return {
            uri: asset.uri,
            type: fileType,
            name: asset.fileName || `media_${Date.now()}_${index}.${extension}`,
            mediaType: mediaType as 'photo' | 'video',
          };
        });

        console.log('📤 Uploading files:', files.map((f: any) => ({ name: f.name, type: f.type, mediaType: f.mediaType, uri: f.uri.substring(0, 50) + '...' })));
        
        const uploadRes = await mediaAPI.uploadMultiple(files);
        console.log('📥 Upload response:', uploadRes);
        
        const responseFiles = (uploadRes as any).files;
        if (uploadRes.success && responseFiles && responseFiles.length > 0) {
          const mediaItems = responseFiles.map((file: any) => ({
            url: file.url,
            type: file.mimetype?.startsWith('video/') ? 'video' as const : 'image' as const,
            filename: file.filename,
            originalName: file.originalname,
            size: file.size
          }));
          console.log('✅ Media items processed:', mediaItems);
          setSelectedMedia(prev => [...prev, ...mediaItems]);
          Toast.show({ type: 'success', text1: 'Media ready!', text2: `${mediaItems.length} file(s) ready to send` });
        } else {
          console.error('❌ Upload failed - no files returned:', uploadRes);
          Toast.show({ type: 'error', text1: 'Upload failed', text2: uploadRes.message || 'No files returned from server' });
        }
      } catch (error: any) {
        console.error('❌ Upload error:', error);
        const errorMessage = error?.response?.data?.message || error?.message || 'Failed to upload media';
        Toast.show({ type: 'error', text1: 'Upload failed', text2: errorMessage });
      } finally {
        setUploading(false);
      }
    } else {
      console.log('📷 Media selection cancelled or no assets selected. Result:', {
        canceled: result.canceled,
        assets: result.assets?.length || 0
      });
    }
  };



  const startRecording = async () => {
    try {
      console.log('🎤 Starting audio recording...');
      const hasPermission = await requestAudioPermission();
      if (!hasPermission) {
        Toast.show({ type: 'error', text1: 'Permission denied', text2: 'Please allow microphone access' });
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      const recordingOptions = Audio.RecordingOptionsPresets.HIGH_QUALITY;

      const { recording } = await Audio.Recording.createAsync(recordingOptions);
      setRecording(recording);
      setIsRecording(true);
      Toast.show({ type: 'info', text1: 'Recording...', text2: 'Tap the microphone again to stop' });
      console.log('✅ Recording started successfully');
    } catch (error) {
      console.error('❌ Failed to start recording:', error);
      Toast.show({ type: 'error', text1: 'Recording Error', text2: 'Failed to start recording. Please try again.' });
      setIsRecording(false);
      setRecording(null);
    }
  };

  const stopRecording = async () => {
    if (!recording) {
      console.log('⚠️ No recording to stop');
      return;
    }

    try {
      console.log('🛑 Stopping audio recording...');
      setIsRecording(false);
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      console.log('📁 Recording saved to:', uri);
      
      if (uri) {
        setUploading(true);
        Toast.show({ type: 'info', text1: 'Uploading...', text2: 'Processing your voice note' });
        
        const file = {
          uri,
          type: 'audio/m4a',
          name: `voice_note_${Date.now()}.m4a`,
          mediaType: 'photo' as 'photo' | 'video', // This is required by the upload API
        };

        console.log('📤 Uploading voice note:', file);
        const uploadRes = await mediaAPI.uploadMultiple([file]);
        console.log('📥 Upload response:', uploadRes);
        
        const responseFiles = (uploadRes as any).files;
        
        if (uploadRes.success && responseFiles && responseFiles.length > 0) {
          const mediaItems = responseFiles.map((file: any) => ({
            url: file.url,
            type: 'audio' as const,
            filename: file.filename,
            originalName: file.originalname,
            size: file.size
          }));
          console.log('✅ Voice note processed:', mediaItems);
          setSelectedMedia(prev => [...prev, ...mediaItems]);
          Toast.show({ type: 'success', text1: 'Voice note ready!', text2: 'Tap send to share your message' });
        } else {
          console.error('❌ Upload failed - no files returned');
          Toast.show({ type: 'error', text1: 'Upload failed', text2: 'Could not process voice note' });
        }
      } else {
        console.error('❌ No recording URI available');
        Toast.show({ type: 'error', text1: 'Recording Error', text2: 'Could not save voice note' });
      }
      
      setUploading(false);
      setRecording(null);
    } catch (error) {
      console.error('❌ Failed to stop recording:', error);
      Toast.show({ type: 'error', text1: 'Recording Error', text2: 'Failed to save voice note. Please try again.' });
      setIsRecording(false);
      setRecording(null);
      setUploading(false);
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const playAudio = async (audioUrl: string, messageId: string) => {
    try {
      // Stop any currently playing audio
      if (playingAudio[messageId]) {
        await playingAudio[messageId].stopAsync();
        await playingAudio[messageId].unloadAsync();
        const newPlayingAudio = { ...playingAudio };
        delete newPlayingAudio[messageId];
        setPlayingAudio(newPlayingAudio);
        setAudioStatus(prev => ({ ...prev, [messageId]: { ...prev[messageId], isPlaying: false } }));
        return;
      }

      // Use the new audio utility with permission handling
      const sound = await playAudioWithPermission(audioUrl, (status) => {
        if (status.isLoaded) {
          setAudioStatus(prev => ({
            ...prev,
            [messageId]: {
              isPlaying: status.isPlaying,
              duration: status.durationMillis || 0,
              position: status.positionMillis || 0,
            }
          }));
          
          if (status.didJustFinish) {
            setPlayingAudio(prev => {
              const newState = { ...prev };
              delete newState[messageId];
              return newState;
            });
          }
        }
      });

      if (sound) {
        setPlayingAudio(prev => ({ ...prev, [messageId]: sound }));
      }
    } catch (error) {
      console.error('Error playing audio:', error);
      handleMediaError(error, 'audio', audioUrl);
    }
  };

  const formatDuration = (millis: number) => {
    const seconds = Math.floor(millis / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const sendMessage = () => {
    console.log('📤 sendMessage called, input:', input, 'selectedMedia:', selectedMedia.length);
    const trimmed = input.trim();
    if (!trimmed && selectedMedia.length === 0) {
      console.log('⚠️ Empty message, not sending');
      Toast.show({ type: 'info', text1: 'Empty message', text2: 'Please type a message or select media' });
      return;
    }
    
    if (uploading) {
      console.log('⚠️ Upload in progress, not sending');
      Toast.show({ type: 'info', text1: 'Please wait', text2: 'Media is still uploading' });
      return;
    }
    
    console.log('✅ Sending message with text:', trimmed, 'and media:', selectedMedia);
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const newMsg: MessageItem = {
      id: tempId,
      text: trimmed,
      media: [...selectedMedia], // Create a copy
      createdAt: new Date().toISOString(),
      senderId: user?._id || 'me',
      reactions: [],
    };
    
    // Add message to UI immediately
    setMessages(prev => {
      const updated = [...prev, newMsg];
      requestAnimationFrame(() => {
        listRef.current?.scrollToEnd({ animated: true });
      });
      return updated;
    });
    
    // Clear input and media
    setInput('');
    const mediaToSend = [...selectedMedia];
    setSelectedMedia([]);
    
    // Send to server
    chatAPI.sendMessage(peerId, trimmed, mediaToSend.length > 0 ? mediaToSend : undefined)
      .then((res: any) => {
        console.log('✅ Message sent successfully:', res);
        const serverMsg = res?.data?.message || res?.message;
        const serverId = serverMsg?._id;
        const serverCreatedAt = serverMsg?.createdAt;
        if (serverId) {
          setMessages(prev => {
            // Replace temp message with server message
            return prev.map(m => m.id === tempId ? { 
              ...m, 
              id: serverId, 
              createdAt: serverCreatedAt || m.createdAt,
              media: serverMsg?.media || m.media // Use server media if available
            } : m);
          });
        }
      })
      .catch((e: any) => {
        console.error('❌ Failed to send message:', e);
        const errorMsg = e?.response?.data?.message || e?.message || 'Failed to send message';
        // Remove the failed message from UI
        setMessages(prev => prev.filter(m => m.id !== tempId));
        // Restore the media and input if send failed
        setSelectedMedia(mediaToSend);
        setInput(trimmed);
        Toast.show({ type: 'error', text1: 'Send failed', text2: errorMsg });
      });
  };

  const handleReaction = async (messageId: string, reactionType: ReactionType) => {
    const message = messages.find(m => m.id === messageId);
    if (!message) return;

    const myReaction = message.reactions?.find(r => r.user === user?._id);
    
    try {
      if (myReaction) {
        // Remove reaction if same type, otherwise update
        if (myReaction.type === reactionType) {
          await chatAPI.removeMessageReaction(peerId, messageId);
          setMessages(prev => prev.map(m => m.id === messageId ? { ...m, reactions: m.reactions?.filter(r => r.user !== user?._id) } : m));
        } else {
          await chatAPI.reactToMessage(peerId, messageId, reactionType);
          setMessages(prev => prev.map(m => m.id === messageId ? { ...m, reactions: m.reactions?.map(r => r.user === user?._id ? { ...r, type: reactionType } : r) } : m));
        }
      } else {
        // Add new reaction
        await chatAPI.reactToMessage(peerId, messageId, reactionType);
        setMessages(prev => prev.map(m => m.id === messageId ? { ...m, reactions: [...(m.reactions || []), { user: user?._id || '', type: reactionType, createdAt: new Date().toISOString() }] } : m));
      }
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to react' });
    }
  };

  const renderItem = ({ item, index }: { item: MessageItem; index: number }) => {
    const isMe = item.senderId === user?._id || item.senderId === 'me';
    const isEditing = editing?.id === item.id;
    const isActionTarget = actionFor?.id === item.id;
    
    // Calculate opacity: if editing/action mode is active and this is NOT the target message, blur it
    const shouldBlur = (editing && !isEditing) || (actionFor && !isActionTarget);
    const blurOpacity = blurAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [1, shouldBlur ? 0.3 : 1],
    });

    // Group reactions by type
    const reactionGroups: Record<ReactionType, number> = {
      funny: 0,
      rage: 0,
      shock: 0,
      relatable: 0,
      love: 0,
      thinking: 0,
    };
    item.reactions?.forEach(r => {
      if (r.type in reactionGroups) {
        reactionGroups[r.type]++;
      }
    });
    const hasReactions = item.reactions && item.reactions.length > 0;
    const myReaction = item.reactions?.find(r => r.user === user?._id);

    const handleLongPress = (event: any) => {
      const { pageX, pageY } = event.nativeEvent;
      const position = {
        x: pageX,
        y: pageY
      };
      
      if (isMe) {
        setActionFor({ id: item.id, text: item.text, position });
      } else {
        setReactionPopup({
          visible: true,
          messageId: item.id,
          position,
        });
      }
    };

    return (
      <Animated.View style={[styles.bubbleRow, { opacity: blurOpacity }]}>
        <Pressable
          onLongPress={handleLongPress}
          style={{ maxWidth: '80%', alignSelf: isMe ? 'flex-end' : 'flex-start' }}
        >
          <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
            {item.text ? <Text style={isMe ? styles.bubbleTextMe : styles.bubbleTextOther}>{item.text}</Text> : null}
            {item.media && item.media.length > 0 && (
              <View style={{ marginTop: item.text ? 4 : 0 }}>
                {item.media.map((mediaItem, idx) => {
                  const audioKey = `${item.id}-${idx}`;
                  const status = audioStatus[audioKey];
                  const isPlaying = status?.isPlaying || false;
                  const duration = status?.duration || 0;
                  
                  return (
                    <View key={idx} style={mediaItem.type === 'audio' ? {} : styles.mediaContainer}>
                      {mediaItem.type === 'image' ? (
                        <TouchableOpacity onPress={() => setFullscreenMedia({ url: getFullMediaUrl(mediaItem.url), type: 'image' })}>
                          <Image 
                            source={{ uri: getFullMediaUrl(mediaItem.url) }} 
                            style={styles.messageImage} 
                            resizeMode="cover"
                            onError={(error) => handleMediaError(error, 'image', mediaItem.url)}
                          />
                        </TouchableOpacity>
                      ) : mediaItem.type === 'video' ? (
                        <TouchableOpacity onPress={() => setFullscreenMedia({ url: getFullMediaUrl(mediaItem.url), type: 'video' })}>
                          <Video
                            source={{ uri: getFullMediaUrl(mediaItem.url) }}
                            style={styles.messageVideo}
                            useNativeControls={false}
                            isLooping={false}
                            onError={(error) => handleMediaError(error, 'video', mediaItem.url)}
                          />
                          <View style={styles.videoOverlay}>
                            <View style={styles.videoPlayButton}>
                              <Text style={{ fontSize: 24 }}>▶️</Text>
                            </View>
                          </View>
                        </TouchableOpacity>
                      ) : (
                        <View style={[styles.audioContainer, isMe ? styles.audioContainerMe : styles.audioContainerOther]}>
                          <TouchableOpacity 
                            style={styles.playButton}
                            onPress={() => playAudio(mediaItem.url, audioKey)}
                          >
                            <Text style={{ fontSize: 16 }}>{isPlaying ? '⏸' : '▶️'}</Text>
                          </TouchableOpacity>
                          <View style={styles.audioWaveform}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                              {[...Array(20)].map((_, i) => (
                                <View 
                                  key={i} 
                                  style={{ 
                                    width: 2, 
                                    height: Math.random() * 20 + 10, 
                                    backgroundColor: isMe ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.3)',
                                    borderRadius: 1 
                                  }} 
                                />
                              ))}
                            </View>
                          </View>
                          <Text style={[styles.audioDuration, { color: isMe ? theme.colors.textInverse : theme.colors.text }]}>
                            {duration > 0 ? formatDuration(duration) : '0:00'}
                          </Text>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            )}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={[styles.time, isMe ? { color: theme.colors.textInverse } : { color: theme.colors.textSecondary }]}>
                {new Date(item.createdAt).toLocaleTimeString()}
              </Text>
              {item.editedAt && (
                <Text style={[styles.time, isMe ? { color: theme.colors.textInverse } : { color: theme.colors.textSecondary }, { fontStyle: 'italic' }]}>
                  • edited
                </Text>
              )}
            </View>
          </View>
          {hasReactions && (
            <View style={[styles.reactionsContainer, { alignSelf: isMe ? 'flex-end' : 'flex-start' }]}>
              {Object.entries(reactionGroups).map(([type, count]) => {
                if (count === 0) return null;
                const isMyReaction = myReaction?.type === type;
                return (
                  <View key={type} style={[styles.reactionBadge, isMyReaction && { backgroundColor: theme.colors.primary + '20', borderColor: theme.colors.primary }]}>
                    <Text style={styles.reactionEmoji}>{REACTION_ICONS[type as ReactionType]}</Text>
                    {count > 1 && <Text style={[styles.reactionCount, { color: theme.colors.text }]}>{count}</Text>}
                  </View>
                );
              })}
            </View>
          )}
        </Pressable>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
        <TouchableOpacity onPress={() => { chatAPI.markRead(peerId).then(() => refreshUnreadCount()).finally(() => (navigation as any).goBack()); }} style={{ marginRight: 12 }}>
          <Text style={{ color: theme.colors.primary, fontWeight: '700' }}>Back</Text>
        </TouchableOpacity>
        {avatar ? (
          <Image source={{ uri: avatar }} style={styles.headerAvatar} />
        ) : (
          <View style={[styles.headerAvatar, { backgroundColor: theme.colors.primary, justifyContent: 'center', alignItems: 'center' }]}> 
            <Text style={{ color: theme.colors.textInverse, fontWeight: '700' }}>{username.charAt(0).toUpperCase()}</Text>
          </View>
        )}
        <Text style={styles.headerName}>@{username}</Text>
      </View>
      <FlatList<MessageItem>
        ref={listRef}
        style={styles.list}
        data={messages}
        keyExtractor={(m) => m.id}
        renderItem={renderItem}
        inverted={false}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        onLayout={() => listRef.current?.scrollToEnd({ animated: false })}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        onScrollBeginDrag={() => Keyboard.dismiss()}
      />
      {(editing || actionFor) && (
        <Animated.View 
          style={{ 
            ...StyleSheet.absoluteFillObject, 
            backgroundColor: theme.dark ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.5)', 
            zIndex: 10,
            ...(Platform.OS === 'web' ? ({ backdropFilter: 'blur(4px)' } as any) : {}),
            pointerEvents: 'none',
          }} 
        />
      )}
      {editing && (
        <Animated.View 
          style={{ 
            position: 'absolute', 
            bottom: 100, 
            left: 16, 
            right: 16, 
            zIndex: 11,
            transform: [{ 
              translateY: editingMessageY.interpolate({
                inputRange: [0, 1],
                outputRange: [50, 0],
              })
            }],
            pointerEvents: 'none',
          }}
        >
          <View style={{ alignItems: 'flex-end' }}>
            <View style={[styles.bubble, styles.bubbleMe, { maxWidth: '80%' }]}>
              <Text style={styles.bubbleTextMe}>{messages.find(m => m.id === editing.id)?.text}</Text>
              <Text style={[styles.time, { color: theme.colors.textInverse }]}>
                Editing...
              </Text>
            </View>
          </View>
        </Animated.View>
      )}
      <View style={[styles.composerWrap, { zIndex: 20 }]}>
        {selectedMedia.length > 0 && !editing && (
          <ScrollView horizontal style={{ maxHeight: 90 }} showsHorizontalScrollIndicator={false}>
            <View style={styles.mediaPreviewContainer}>
              {selectedMedia.map((media, idx) => (
                <View key={idx} style={styles.mediaPreviewItem}>
                  {media.type === 'image' ? (
                    <Image 
                      source={{ uri: getFullMediaUrl(media.url) }} 
                      style={styles.mediaPreviewImage}
                      onError={(error) => handleMediaError(error, 'image', media.url)}
                    />
                  ) : media.type === 'video' ? (
                    <Video
                      source={{ uri: getFullMediaUrl(media.url) }}
                      style={styles.mediaPreviewImage}
                      shouldPlay={false}
                      onError={(error) => handleMediaError(error, 'video', media.url)}
                    />
                  ) : (
                    <View style={{ width: '100%', height: '100%', backgroundColor: theme.colors.primary, justifyContent: 'center', alignItems: 'center' }}>
                      <Text style={{ fontSize: 32 }}>🎤</Text>
                      <Text style={{ color: theme.colors.textInverse, fontSize: 10, marginTop: 4 }}>Audio</Text>
                    </View>
                  )}
                  <TouchableOpacity
                    style={styles.removeMediaBtn}
                    onPress={() => setSelectedMedia(prev => prev.filter((_, i) => i !== idx))}
                  >
                    <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>×</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </ScrollView>
        )}
        {isRecording && (
          <View style={{ paddingHorizontal: 16, paddingVertical: 8, backgroundColor: theme.colors.error + '20', borderRadius: 8, marginBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: theme.colors.error || '#ff4444', fontSize: 14, fontWeight: '600', marginRight: 8 }}>● Recording...</Text>
            <TouchableOpacity onPress={stopRecording} style={{ paddingHorizontal: 12, paddingVertical: 4, backgroundColor: theme.colors.error || '#ff4444', borderRadius: 6 }}>
              <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>Stop</Text>
            </TouchableOpacity>
          </View>
        )}
        <View style={styles.composerRow}>
          {!editing && (
            <TouchableOpacity onPress={() => setShowAttachMenu(true)} style={styles.plusButton} disabled={uploading}>
              <Text style={{ fontSize: 28, color: theme.colors.primary, fontWeight: 'bold' }}>+</Text>
            </TouchableOpacity>
          )}
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            placeholderTextColor={theme.colors.textSecondary}
            value={editing ? editing.text : input}
            onChangeText={(t) => {
              if (editing) setEditing({ ...editing, text: t }); else setInput(t);
            }}
            onSubmitEditing={() => { if (!editing) sendMessage(); }}
            returnKeyType="send"
            multiline
          />
          {editing ? (
            <>
              <TouchableOpacity onPress={() => setEditing(null)} style={[styles.sendBtn, { backgroundColor: theme.colors.background, borderWidth: 1, borderColor: theme.colors.border, marginRight: 8 }]}>
                <Text style={{ color: theme.colors.text, fontWeight: '700' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={async () => {
                const text = editing.text.trim();
                if (!text) return;
                const msg = messages.find(m => m.id === editing.id);
                if (!msg) { setEditing(null); return; }
                try {
                  const res = await chatAPI.editMessage(peerId, msg.id, text);
                  const updatedText = res?.data?.message?.text || text;
                  const editedAt = res?.data?.message?.editedAt || new Date().toISOString();
                  setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, text: updatedText, editedAt } : m));
                  setEditing(null);
                } catch (e: any) {
                  Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to edit message' });
                }
              }} style={styles.sendBtn}>
                <Text style={styles.sendText}>Save</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity onPress={sendMessage} style={styles.sendBtn} disabled={uploading}>
              <Text style={styles.sendText}>Send</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
      {actionFor && (
        <>
          <Pressable 
            style={[StyleSheet.absoluteFill, { zIndex: 11 }]} 
            onPress={() => setActionFor(null)}
          />
          <View style={{ 
            position: 'absolute', 
            top: Math.max(20, actionFor.position.y - 200), 
            left: 16, 
            right: 16, 
            alignItems: 'center', 
            zIndex: 15 
          }}>
            {/* Reactions Row */}
            <View style={{ 
              backgroundColor: theme.dark ? 'rgba(42, 42, 42, 0.98)' : 'rgba(255, 255, 255, 0.98)',
              borderWidth: 2, 
              borderColor: theme.dark ? '#444' : '#ddd',
              borderRadius: 30, 
              ...theme.shadows.large,
              paddingHorizontal: 8,
              paddingVertical: 8,
              flexDirection: 'row',
              gap: 4,
              marginBottom: 12,
              elevation: 20,
            }}>
              {Object.entries(REACTION_ICONS).map(([type, emoji]) => (
                <TouchableOpacity
                  key={type}
                  onPress={() => {
                    handleReaction(actionFor.id, type as ReactionType);
                    setActionFor(null);
                  }}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 20,
                    backgroundColor: theme.dark ? 'rgba(58, 58, 58, 0.95)' : 'rgba(245, 245, 245, 0.95)',
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={{ fontSize: 24 }}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
            
            {/* Action Buttons */}
            <View style={{ 
              backgroundColor: theme.dark ? 'rgba(42, 42, 42, 0.98)' : 'rgba(255, 255, 255, 0.98)',
              borderWidth: 2, 
              borderColor: theme.dark ? '#444' : '#ddd',
              borderRadius: 12, 
              ...theme.shadows.large,
              minWidth: 200, 
              overflow: 'hidden',
              elevation: 20,
            }}>
              <TouchableOpacity 
                onPress={() => { 
                  setEditing({ id: actionFor.id, text: actionFor.text }); 
                  setActionFor(null); 
                }} 
                style={{ paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: theme.dark ? '#444' : '#e0e0e0', flexDirection: 'row', alignItems: 'center', gap: 12 }}
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: 18 }}>✏️</Text>
                <Text style={{ color: theme.colors.text, fontSize: 15, fontWeight: '600' }}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={async () => {
                  const id = actionFor.id; 
                  setActionFor(null);
                  try {
                    await chatAPI.deleteMessage(peerId, id);
                    setMessages(prev => prev.filter(m => m.id !== id));
                    Toast.show({ type: 'success', text1: 'Message deleted' });
                  } catch (e: any) {
                    Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to unsend' });
                  }
                }} 
                style={{ paddingHorizontal: 20, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: 18 }}>🗑️</Text>
                <Text style={{ color: theme.colors.error || '#ff4444', fontSize: 15, fontWeight: '600' }}>Unsend</Text>
              </TouchableOpacity>
            </View>
          </View>
        </>
      )}
      <ReactionPopup
        visible={reactionPopup.visible}
        onSelect={(reaction) => {
          handleReaction(reactionPopup.messageId, reaction);
          setReactionPopup({ visible: false, messageId: '', position: { x: 0, y: 0 } });
        }}
        onClose={() => setReactionPopup({ visible: false, messageId: '', position: { x: 0, y: 0 } })}
        position={reactionPopup.position}
      />
      
      {/* Attach Menu Modal */}
      <Modal
        visible={showAttachMenu}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAttachMenu(false)}
      >
        <Pressable style={styles.attachMenuModal} onPress={() => setShowAttachMenu(false)}>
          <Pressable style={styles.attachMenuContainer} onPress={(e) => e.stopPropagation()}>
            <View style={{ marginBottom: 16 }}>
              <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: '700', paddingHorizontal: 20 }}>Attach</Text>
            </View>
            
            <TouchableOpacity 
              style={styles.attachMenuItem}
              onPress={() => {
                setShowAttachMenu(false);
                setTimeout(() => openMediaOptions(), 100); // Add small delay to ensure modal closes first
              }}
            >
              <Text style={styles.attachMenuIcon}>📷</Text>
              <Text style={styles.attachMenuText}>Photo or Video</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.attachMenuItem}
              onPress={() => {
                setShowAttachMenu(false);
                setTimeout(() => toggleRecording(), 100); // Add small delay to ensure modal closes first
              }}
            >
              <Text style={styles.attachMenuIcon}>{isRecording ? '⏹️' : '🎤'}</Text>
              <Text style={styles.attachMenuText}>{isRecording ? 'Stop Recording' : 'Voice Note'}</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Media Options Modal */}
      <Modal
        visible={showMediaOptions}
        transparent
        animationType="slide"
        onRequestClose={() => setShowMediaOptions(false)}
      >
        <Pressable style={styles.attachMenuModal} onPress={() => setShowMediaOptions(false)}>
          <Pressable style={styles.attachMenuContainer} onPress={(e) => e.stopPropagation()}>
            <View style={{ marginBottom: 16 }}>
              <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: '700', paddingHorizontal: 20 }}>Select Media</Text>
            </View>
            
            <TouchableOpacity 
              style={styles.attachMenuItem}
              onPress={() => {
                setShowMediaOptions(false);
                setTimeout(() => pickFromGallery(), 100);
              }}
            >
              <Text style={styles.attachMenuIcon}>🖼️</Text>
              <Text style={styles.attachMenuText}>Gallery</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.attachMenuItem}
              onPress={() => {
                setShowMediaOptions(false);
                setTimeout(() => takePhoto(), 100);
              }}
            >
              <Text style={styles.attachMenuIcon}>📸</Text>
              <Text style={styles.attachMenuText}>Camera</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.attachMenuItem, { borderTopWidth: 1, borderTopColor: theme.colors.border, marginTop: 8 }]}
              onPress={() => setShowMediaOptions(false)}
            >
              <Text style={styles.attachMenuIcon}>❌</Text>
              <Text style={[styles.attachMenuText, { color: theme.colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Fullscreen Media Viewer */}
      <Modal
        visible={fullscreenMedia !== null}
        transparent={false}
        animationType="fade"
        onRequestClose={() => setFullscreenMedia(null)}
        statusBarTranslucent
      >
        <Pressable style={styles.fullscreenModal} onPress={() => fullscreenMedia?.type === 'image' && setFullscreenMedia(null)}>
          <TouchableOpacity 
            style={styles.fullscreenCloseButton}
            onPress={() => setFullscreenMedia(null)}
            activeOpacity={0.8}
          >
            <Text style={{ color: '#fff', fontSize: 28, fontWeight: 'bold' }}>×</Text>
          </TouchableOpacity>
          
          {fullscreenMedia?.type === 'image' ? (
            <Image 
              source={{ uri: fullscreenMedia.url }} 
              style={styles.fullscreenImage}
              resizeMode="contain"
            />
          ) : fullscreenMedia?.type === 'video' ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <Video
                source={{ uri: fullscreenMedia.url }}
                style={styles.fullscreenVideo}
                useNativeControls
                shouldPlay
                isLooping={false}
              />
            </View>
          ) : null}
        </Pressable>
      </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default ChatScreen;


