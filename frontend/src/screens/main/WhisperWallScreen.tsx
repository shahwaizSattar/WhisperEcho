import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  StatusBar,
  Platform,
  Image,
  FlatList,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { useTheme } from '../../context/ThemeContext';
import { whisperWallAPI } from '../../services/api';
import { reactionsAPI } from '../../services/reactions';
import Toast from 'react-native-toast-message';
import { useNavigation } from '@react-navigation/native';
import ReactionPopup from '../../components/ReactionPopup';
import { convertAvatarUrl } from '../../utils/imageUtils';
import { censorText } from '../../utils/censorUtils';

const WhisperWallScreen: React.FC = () => {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [whisperText, setWhisperText] = useState('');
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<string>('24h 0m');
  const [reactionPopup, setReactionPopup] = useState<{
    visible: boolean;
    postId: string;
    position: { x: number; y: number };
  }>({
    visible: false,
    postId: '',
    position: { x: 0, y: 0 },
  });
  const likeButtonRefs = useRef<{ [key: string]: any }>({});

  const moods = [
    { id: 'Vent', name: 'Vent', icon: '😤', color: '#FF4D6D' },
    { id: 'Confession', name: 'Confession', icon: '🤫', color: '#A259FF' },
    { id: 'Advice', name: 'Advice', icon: '💡', color: '#00FFD1' },
    { id: 'Random', name: 'Random', icon: '🎲', color: '#FFB800' },
    { id: 'Comedy', name: 'Happy', icon: '😊', color: '#32CD32' },
    { id: 'Music', name: 'Sad', icon: '😢', color: '#4682B4' },
  ];

  const modalScale = useSharedValue(0);

  const animatedModalStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: modalScale.value }],
    };
  });

  // Calculate time remaining until next 24-hour cleanup
  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      // Get the next midnight (24-hour mark)
      const nextMidnight = new Date(now);
      nextMidnight.setHours(24, 0, 0, 0);
      
      // If we've passed midnight today, set to tomorrow's midnight
      if (nextMidnight <= now) {
        nextMidnight.setDate(nextMidnight.getDate() + 1);
      }
      
      const diff = nextMidnight.getTime() - now.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      
      if (hours > 0) {
        setTimeRemaining(`${hours}h ${minutes}m`);
      } else if (minutes > 0) {
        setTimeRemaining(`${minutes}m`);
      } else {
        setTimeRemaining('Expired');
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  // Test/Mock posts for demonstration
  const getTestPosts = () => {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now
    
    return [
      {
        _id: 'test-1',
        randomUsername: 'MysterySoul',
        category: 'Confession',
        content: {
          text: 'I\'ve been keeping a secret from everyone for years. Today I finally feel brave enough to share it anonymously. Sometimes the weight of silence is heavier than the fear of judgment.',
          media: []
        },
        tags: ['whisperwall', 'confession', 'deep'],
        createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
        expiresAt: expiresAt.toISOString(),
        reactions: { funny: 5, relatable: 12, love: 8, shock: 3 },
        comments: [{ _id: 'c1' }, { _id: 'c2' }],
        userReaction: null,
      },
      {
        _id: 'test-2',
        randomUsername: 'VentMaster',
        category: 'Vent',
        content: {
          text: 'Had the worst day at work today. My boss took credit for my project again. I wish I could speak up but I need this job. At least here I can let it out without consequences.',
          media: []
        },
        tags: ['whisperwall', 'vent', 'work'],
        createdAt: new Date(now.getTime() - 5 * 60 * 60 * 1000).toISOString(), // 5 hours ago
        expiresAt: expiresAt.toISOString(),
        reactions: { relatable: 20, rage: 7, love: 4 },
        comments: [{ _id: 'c3' }, { _id: 'c4' }, { _id: 'c5' }],
        userReaction: 'relatable',
      },
      {
        _id: 'test-3',
        randomUsername: 'WisdomSeeker',
        category: 'Advice',
        content: {
          text: 'If you\'re feeling lost, remember: every expert was once a beginner. Every pro was once an amateur. Every icon was once an unknown. Don\'t give up on your dreams.',
          media: []
        },
        tags: ['whisperwall', 'advice', 'motivation'],
        createdAt: new Date(now.getTime() - 1 * 60 * 60 * 1000).toISOString(), // 1 hour ago
        expiresAt: expiresAt.toISOString(),
        reactions: { love: 15, relatable: 10, thinking: 5 },
        comments: [{ _id: 'c6' }],
        userReaction: null,
      },
      {
        _id: 'test-4',
        randomUsername: 'RandomThoughts',
        category: 'Random',
        content: {
          text: 'Why do we say "heads up" when we really mean "look out"? Language is weird. Also, why do we park in driveways and drive on parkways? 🤔',
          media: []
        },
        tags: ['whisperwall', 'random', 'funny'],
        createdAt: new Date(now.getTime() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
        expiresAt: expiresAt.toISOString(),
        reactions: { funny: 25, thinking: 8, relatable: 3 },
        comments: [{ _id: 'c7' }, { _id: 'c8' }],
        userReaction: 'funny',
      },
      {
        _id: 'test-5',
        randomUsername: 'HappyVibes',
        category: 'Comedy',
        content: {
          text: 'Just realized I\'ve been adulting wrong this whole time. I thought paying bills was optional. Turns out it\'s not. Who knew? 😂',
          media: []
        },
        tags: ['whisperwall', 'comedy', 'life'],
        createdAt: new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString(), // 3 hours ago
        expiresAt: expiresAt.toISOString(),
        reactions: { funny: 30, relatable: 15, love: 5 },
        comments: [{ _id: 'c9' }, { _id: 'c10' }, { _id: 'c11' }],
        userReaction: null,
      },
      {
        _id: 'test-6',
        randomUsername: 'SadMelody',
        category: 'Music',
        content: {
          text: 'Sometimes music is the only thing that understands. When words fail, melodies speak. When silence hurts, songs heal. What\'s your go-to song when you need to feel understood?',
          media: []
        },
        tags: ['whisperwall', 'music', 'emotions'],
        createdAt: new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
        expiresAt: expiresAt.toISOString(),
        reactions: { relatable: 18, love: 12, thinking: 6 },
        comments: [{ _id: 'c12' }, { _id: 'c13' }],
        userReaction: 'love',
      },
      {
        _id: 'test-7',
        randomUsername: 'DeepThinker',
        category: 'Advice',
        content: {
          text: 'The best time to plant a tree was 20 years ago. The second best time is now. Stop waiting for the perfect moment. Start where you are, use what you have.',
          media: []
        },
        tags: ['whisperwall', 'advice', 'inspiration'],
        createdAt: new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString(), // 6 hours ago
        expiresAt: expiresAt.toISOString(),
        reactions: { love: 22, thinking: 10, relatable: 8 },
        comments: [{ _id: 'c14' }],
        userReaction: null,
      },
      {
        _id: 'test-8',
        randomUsername: 'AnonymousHeart',
        category: 'Confession',
        content: {
          text: 'I miss my ex but I know we can\'t be together. It hurts every day but I\'m trying to move on. Sometimes love isn\'t enough. Sometimes timing is everything.',
          media: []
        },
        tags: ['whisperwall', 'confession', 'love'],
        createdAt: new Date(now.getTime() - 8 * 60 * 60 * 1000).toISOString(), // 8 hours ago
        expiresAt: expiresAt.toISOString(),
        reactions: { relatable: 35, love: 20, shock: 2 },
        comments: [{ _id: 'c15' }, { _id: 'c16' }, { _id: 'c17' }, { _id: 'c18' }],
        userReaction: 'relatable',
      },
    ];
  };

  const loadPosts = async () => {
    try {
      setLoading(true);
      const response = await whisperWallAPI.getWhisperPosts(1, 50);
      
      if (response.success) {
        const whisperPosts = response.posts || response.data || [];
        
        // Filter out posts older than 24 hours (frontend only)
        const now = new Date();
        const validPosts = whisperPosts.filter((post: any) => {
          if (!post.createdAt && !post.expiresAt) return true;
          
          const postDate = post.expiresAt ? new Date(post.expiresAt) : new Date(post.createdAt);
          const hoursSinceCreation = (now.getTime() - postDate.getTime()) / (1000 * 60 * 60);
          
          // If post has expiresAt, use that; otherwise check if it's been 24 hours
          if (post.expiresAt) {
            return postDate > now;
          }
          return hoursSinceCreation < 24;
        });
        
        // If no posts from API, use test posts for demonstration
        if (validPosts.length === 0) {
          setPosts(getTestPosts());
        } else {
          setPosts(validPosts);
        }
      } else {
        // If API fails or returns no posts, use test posts
        setPosts(getTestPosts());
      }
    } catch (error) {
      console.error('Error loading WhisperWall posts:', error);
      // On error, show test posts for demonstration
      setPosts(getTestPosts());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadPosts();
  }, []);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await loadPosts();
  }, []);

  const openCreateModal = () => {
    setShowCreateModal(true);
    modalScale.value = withSpring(1);
  };

  const closeCreateModal = () => {
    modalScale.value = withSpring(0, {}, () => {
      setShowCreateModal(false);
      setWhisperText('');
      setSelectedMood(null);
    });
  };

  const handleSubmitWhisper = async () => {
    if (!whisperText.trim() || !selectedMood) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Please write your whisper and select a mood.',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const whisperData = {
        content: {
          text: whisperText.trim(),
        },
        category: selectedMood,
        tags: ['whisperwall', 'disappearing', selectedMood],
      };

      const response = await whisperWallAPI.createWhisperPost(whisperData);
      
      if (response.success) {
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: 'Your whisper has been shared!',
        });
        closeCreateModal();
        await loadPosts(); // Refresh posts
      } else {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: response.message || 'Failed to share whisper',
        });
      }
    } catch (error: any) {
      console.log('Whisper creation error:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.response?.data?.message || 'Something went wrong. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const showReactionPopup = (postId: string, event?: any) => {
    const buttonRef = likeButtonRefs.current[postId];
    if (buttonRef) {
      (buttonRef as any).measure((fx: number, fy: number, fwidth: number, fheight: number, pageX: number, pageY: number) => {
        setReactionPopup({
          visible: true,
          postId,
          position: { 
            x: pageX + fwidth / 2,
            y: pageY,
          },
        });
      });
    } else {
      let x = Dimensions.get('window').width / 6;
      let y = Dimensions.get('window').height - 200;
      
      if (event?.nativeEvent) {
        const touch = event.nativeEvent.touches?.[0] || event.nativeEvent;
        if (touch?.pageX) x = touch.pageX;
        if (touch?.pageY) y = touch.pageY - 80;
      }
      
      setReactionPopup({
        visible: true,
        postId,
        position: { x, y },
      });
    }
  };

  const hideReactionPopup = () => {
    setReactionPopup({
      visible: false,
      postId: '',
      position: { x: 0, y: 0 },
    });
  };

  const handleReaction = async (postId: string, reactionType: 'funny' | 'rage' | 'shock' | 'relatable' | 'love' | 'thinking') => {
    try {
      const post = posts.find(p => p._id === postId);
      if (!post) return;
      
      if (post.userReaction === reactionType) {
        await whisperWallAPI.removeWhisperReaction(postId);
        Toast.show({
          type: 'success',
          text1: 'Reaction removed',
        });
      } else {
        await whisperWallAPI.reactToWhisperPost(postId, reactionType);
        Toast.show({
          type: 'success',
          text1: 'Reaction added',
        });
      }
      await loadPosts();
    } catch (error) {
      console.error('Error handling reaction:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to update reaction',
      });
    }
  };

  const handleReactionSelect = async (reactionType: 'funny' | 'rage' | 'shock' | 'relatable' | 'love' | 'thinking') => {
    if (reactionPopup.postId) {
      await handleReaction(reactionPopup.postId, reactionType);
    }
  };

  const formatTimeRemaining = (expiresAt: string) => {
    const now = new Date();
    const vanishTime = new Date(expiresAt);
    const diff = vanishTime.getTime() - now.getTime();
    
    if (diff <= 0) return 'Expired';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) return `${hours}h ${minutes}m left`;
    return `${minutes}m left`;
  };

  const renderMedia = (media: any[]) => {
    if (!media || media.length === 0) return null;
    
    const screenWidth = Dimensions.get('window').width;
    const imageWidth = screenWidth;
    const imageHeight = imageWidth * 0.75;
    
    return (
      <View style={styles.mediaContainer}>
        {media.length === 1 ? (
          <View style={styles.mediaItem}>
            {media[0].type === 'video' ? (
              <View style={styles.videoContainer}>
                <View style={[styles.mediaContent, { 
                  width: imageWidth, 
                  height: imageHeight,
                  backgroundColor: '#000', 
                  justifyContent: 'center', 
                  alignItems: 'center' 
                }]}>
                  <Text style={{ color: '#fff' }}>🎥 Video</Text>
                </View>
              </View>
            ) : (
              <Image 
                source={{ uri: media[0].url }} 
                style={[styles.mediaContent, { width: imageWidth, height: imageHeight }]} 
                resizeMode="cover"
              />
            )}
          </View>
        ) : (
          <FlatList
            data={media}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(_, index) => index.toString()}
            contentContainerStyle={{ alignItems: 'center' }}
            renderItem={({ item }) => {
              return (
                <View style={styles.mediaItem}>
                  {item.type === 'video' ? (
                    <View style={styles.videoContainer}>
                      <View style={[styles.mediaContent, { 
                        width: imageWidth * 0.9, 
                        height: imageHeight * 0.9,
                        backgroundColor: '#000', 
                        justifyContent: 'center', 
                        alignItems: 'center' 
                      }]}>
                        <Text style={{ color: '#fff' }}>🎥 Video</Text>
                      </View>
                    </View>
                  ) : (
                    <Image 
                      source={{ uri: item.url }} 
                      style={[styles.mediaContent, { width: imageWidth * 0.9, height: imageHeight * 0.9 }]} 
                      resizeMode="cover"
                    />
                  )}
                </View>
              );
            }}
          />
        )}
      </View>
    );
  };

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    header: {
      paddingHorizontal: theme.spacing.xl,
      paddingVertical: theme.spacing.lg,
      backgroundColor: theme.colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    title: {
      fontSize: 28,
      fontWeight: 'bold',
      color: theme.colors.text,
      marginBottom: theme.spacing.sm,
    },
    subtitle: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.md,
    },
    timerContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.primary + '20',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.borderRadius.md,
      alignSelf: 'flex-start',
    },
    timerText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.primary,
      marginLeft: theme.spacing.sm,
    },
    content: { flex: 1, paddingHorizontal: 0, paddingVertical: 0 },
    placeholderContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: theme.spacing.xl,
    },
    placeholderIcon: { fontSize: 80, marginBottom: theme.spacing.lg },
    placeholderTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      color: theme.colors.text,
      marginBottom: theme.spacing.md,
      textAlign: 'center',
    },
    placeholderText: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      lineHeight: 24,
      marginBottom: theme.spacing.xl,
    },
    createButton: {
      backgroundColor: theme.colors.primary,
      paddingHorizontal: theme.spacing.xl,
      paddingVertical: theme.spacing.md,
      borderRadius: theme.borderRadius.lg,
      ...theme.shadows.medium,
    },
    createButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.textInverse,
    },
    floatingButton: {
      position: 'absolute',
      bottom: 30,
      right: 30,
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: theme.colors.accent,
      justifyContent: 'center',
      alignItems: 'center',
      ...theme.shadows.large,
      zIndex: 1000,
    },
    floatingButtonText: {
      fontSize: 28,
      color: theme.colors.textInverse,
    },
    postCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 0,
      padding: theme.spacing.lg,
      marginBottom: theme.spacing.sm,
      marginHorizontal: 0,
      ...theme.shadows.small,
      borderWidth: 0,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border + '60',
      overflow: 'hidden',
      width: '100%',
    },
    postHeader: { 
      flexDirection: 'row', 
      justifyContent: 'space-between', 
      alignItems: 'center', 
      marginBottom: theme.spacing.md,
      paddingBottom: theme.spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border + '40',
    },
    authorInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    avatar: { 
      width: 44, 
      height: 44, 
      borderRadius: 22, 
      marginRight: theme.spacing.sm,
      borderWidth: 2,
      borderColor: theme.colors.primary + '30',
    },
    avatarPlaceholder: { 
      width: 44, 
      height: 44, 
      borderRadius: 22, 
      marginRight: theme.spacing.sm, 
      justifyContent: 'center', 
      alignItems: 'center',
      borderWidth: 2,
      borderColor: theme.colors.primary + '30',
    },
    avatarText: { 
      fontSize: 18, 
      fontWeight: 'bold', 
      color: '#fff',
    },
    username: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
    },
    postDate: { fontSize: 12 },
    postTags: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      marginBottom: theme.spacing.sm,
    },
    postCategory: { fontSize: 12, fontWeight: '600', marginRight: theme.spacing.sm },
    whisperTag: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.warning || '#FF6B35',
      marginRight: theme.spacing.sm,
    },
    hashtagsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginTop: theme.spacing.xs,
    },
    hashtag: {
      fontSize: 12,
      fontWeight: '600',
      marginRight: theme.spacing.sm,
      marginBottom: theme.spacing.xs,
      color: theme.colors.secondary || '#6B73FF',
    },
    postText: { 
      fontSize: 16, 
      lineHeight: 24, 
      marginBottom: theme.spacing.md,
      color: theme.colors.text,
    },
    mediaContainer: { 
      marginVertical: theme.spacing.md,
      marginHorizontal: -theme.spacing.lg,
      alignItems: 'center',
      justifyContent: 'center',
      width: Dimensions.get('window').width,
    },
    mediaItem: { marginRight: theme.spacing.sm },
    mediaContent: {
      height: 200,
      borderRadius: theme.borderRadius.md,
      backgroundColor: theme.colors.surface,
    },
    videoContainer: { borderRadius: theme.borderRadius.md, overflow: 'hidden' },
    actionButtons: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'stretch',
      marginTop: theme.spacing.md,
      paddingTop: theme.spacing.md,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border + '40',
    },
    actionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
      backgroundColor: 'transparent',
      flex: 1,
    },
    activeActionBtn: {
      backgroundColor: theme.colors.primary + '20',
    },
    actionBtnIcon: {
      fontSize: 20,
      marginRight: theme.spacing.xs,
    },
    actionBtnText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.text,
      marginRight: theme.spacing.xs,
    },
    actionBtnCount: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.textSecondary,
    },
    postMeta: { 
      flexDirection: 'row', 
      justifyContent: 'space-between', 
      alignItems: 'center',
      marginTop: theme.spacing.sm,
    },
    reactionText: { fontSize: 12 },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: theme.spacing.xl,
    },
    modalContent: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.xl,
      padding: theme.spacing.xl,
      width: '100%',
      maxHeight: '80%',
    },
    modalTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      color: theme.colors.text,
      marginBottom: theme.spacing.md,
      textAlign: 'center',
    },
    modalSubtitle: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginBottom: theme.spacing.xl,
    },
    moodSelector: {
      marginBottom: theme.spacing.xl,
    },
    moodLabel: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: theme.spacing.md,
    },
    moodOptions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
    },
    moodOption: {
      width: '48%',
      flexDirection: 'row',
      alignItems: 'center',
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
      marginBottom: theme.spacing.sm,
      borderWidth: 2,
      borderColor: 'transparent',
      backgroundColor: theme.colors.background,
    },
    moodOptionSelected: {
      borderColor: theme.colors.primary,
      backgroundColor: theme.colors.primary + '10',
    },
    moodIcon: {
      fontSize: 20,
      marginRight: theme.spacing.sm,
    },
    moodName: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.text,
    },
    textInput: {
      backgroundColor: theme.colors.background,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.md,
      fontSize: 16,
      color: theme.colors.text,
      borderWidth: 1,
      borderColor: theme.colors.border,
      minHeight: 120,
      textAlignVertical: 'top',
      marginBottom: theme.spacing.xl,
    },
    modalButtons: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    modalButton: {
      flex: 1,
      paddingVertical: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
      alignItems: 'center',
      marginHorizontal: theme.spacing.sm,
    },
    cancelButton: {
      backgroundColor: theme.colors.border,
    },
    submitButton: {
      backgroundColor: theme.colors.primary,
    },
    submitButtonDisabled: {
      backgroundColor: theme.colors.border,
      opacity: 0.6,
    },
    buttonText: {
      fontSize: 16,
      fontWeight: '600',
    },
    cancelButtonText: {
      color: theme.colors.textSecondary,
    },
    submitButtonText: {
      color: theme.colors.textInverse,
    },
  });

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle={theme.dark ? 'light-content' : 'dark-content'} />
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={[theme.colors.surface, theme.colors.background]}
        style={styles.header}
      >
        <Text style={styles.title}>WhisperWall 👻</Text>
        <Text style={styles.subtitle}>
            Your anonymous sanctuary • All posts disappear in 24 hours
        </Text>
        <View style={styles.timerContainer}>
          <Text>⏰</Text>
          <Text style={styles.timerText}>
              Next cleanup in {timeRemaining}
          </Text>
        </View>
      </LinearGradient>

      {/* Content */}
        <ScrollView
          style={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {posts.length > 0 ? (
            posts.map(post => (
              <TouchableOpacity 
                key={post._id} 
                style={styles.postCard}
                onPress={() => navigation.navigate('PostDetail' as never, { postId: post._id })}
                activeOpacity={0.9}
              >
                <View style={styles.postHeader}>
                  <View style={styles.authorInfo}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      {post.randomUsername ? (
                        <View style={[styles.avatarPlaceholder, { backgroundColor: theme.colors.primary }]}>
                          <Text style={styles.avatarText}>{post.randomUsername?.charAt(0).toUpperCase() || '?'}</Text>
                        </View>
                      ) : (
                        <View style={[styles.avatarPlaceholder, { backgroundColor: theme.colors.primary }]}>
                          <Text style={styles.avatarText}>👻</Text>
                        </View>
                      )}
                      <Text style={[styles.username, { color: theme.colors.text }]}>
                        {post.randomUsername || 'Anonymous'}
                </Text>
              </View>
            </View>
                  <Text style={[styles.postDate, { color: theme.colors.textSecondary }]}>
                    {post.expiresAt ? formatTimeRemaining(post.expiresAt) : '24h left'}
                  </Text>
                </View>
                <View style={styles.postTags}>
                  {post.category && <Text style={[styles.postCategory, { color: theme.colors.primary }]}>#{post.category}</Text>}
                  <Text style={[styles.whisperTag, { color: theme.colors.warning || '#FF6B35' }]}>
                    👻 WhisperWall • {post.expiresAt ? formatTimeRemaining(post.expiresAt) : '24h left'}
                  </Text>
                  {post.tags && post.tags.length > 0 && (
                    <View style={styles.hashtagsContainer}>
                      {post.tags.map((tag: string, index: number) => (
                        <Text key={index} style={[styles.hashtag, { color: theme.colors.secondary || '#6B73FF' }]}>
                          #{tag}
                        </Text>
                      ))}
                    </View>
                  )}
                </View>
                {post.content?.text && <Text style={[styles.postText, { color: theme.colors.text }]} numberOfLines={3}>{censorText(post.content.text)}</Text>}
                {renderMedia(post.content?.media)}
                
                {/* Like, Comment Actions */}
                <View style={styles.actionButtons}>
                  <View
                    ref={(ref) => {
                      if (ref) {
                        likeButtonRefs.current[post._id] = ref;
                      }
                    }}
                    style={{ flex: 1 }}
                  >
                    <TouchableOpacity 
                      style={[styles.actionBtn, post.userReaction && styles.activeActionBtn]}
                      onPress={(e) => {
                        e.stopPropagation();
                        showReactionPopup(post._id, e);
                      }}
                    >
                      <Text style={styles.actionBtnIcon}>
                        {post.userReaction ? '👍' : '👍'}
                      </Text>
                      <Text style={styles.actionBtnText}>
                        {post.userReaction ? 'Liked' : 'Like'}
                      </Text>
                      <Text style={styles.actionBtnCount}>
                        {(post.reactions?.funny || 0) + (post.reactions?.rage || 0) + (post.reactions?.shock || 0) + 
                         (post.reactions?.relatable || 0) + (post.reactions?.love || 0) + (post.reactions?.thinking || 0) || 0}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  
                  <View style={{ flex: 1 }}>
                    <TouchableOpacity 
                      style={styles.actionBtn}
                      onPress={(e) => {
                        e.stopPropagation();
                        navigation.navigate('PostDetail' as never, { postId: post._id });
                      }}
                    >
                      <Text style={styles.actionBtnIcon}>💬</Text>
                      <Text style={styles.actionBtnText}>Comment</Text>
                      <Text style={styles.actionBtnCount}>{post.comments?.length || 0}</Text>
                    </TouchableOpacity>
                  </View>
        </View>

                <View style={styles.postMeta}>
                  <Text style={[styles.reactionText, { color: theme.colors.textSecondary }]}>
                    {(post.reactions?.funny || 0) + (post.reactions?.rage || 0) + (post.reactions?.shock || 0) + 
                     (post.reactions?.relatable || 0) + (post.reactions?.love || 0) + (post.reactions?.thinking || 0) || 0} likes • {post.comments?.length || 0} comments
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          ) : loading ? (
            <View style={styles.placeholderContainer}>
              <Text style={styles.placeholderIcon}>⏳</Text>
              <Text style={styles.placeholderTitle}>Loading whispers...</Text>
            </View>
          ) : (
        <View style={styles.placeholderContainer}>
          <Text style={styles.placeholderIcon}>💭</Text>
          <Text style={styles.placeholderTitle}>
            The Wall Awaits Your Whisper
          </Text>
          <Text style={styles.placeholderText}>
            Share your deepest thoughts, confessions, or random musings completely anonymously. No judgement, just authentic human connection.
          </Text>
          <TouchableOpacity style={styles.createButton} onPress={openCreateModal}>
            <Text style={styles.createButtonText}>
              Share a Whisper
            </Text>
          </TouchableOpacity>
        </View>
          )}
        </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity style={styles.floatingButton} onPress={openCreateModal}>
        <Text style={styles.floatingButtonText}>+</Text>
      </TouchableOpacity>

      {/* Create Whisper Modal */}
      <Modal
        visible={showCreateModal}
        transparent
        animationType="none"
        onRequestClose={closeCreateModal}
      >
        <View style={styles.modalOverlay}>
          <Animated.View style={[styles.modalContent, animatedModalStyle]}>
            <Text style={styles.modalTitle}>Share a Whisper</Text>
            <Text style={styles.modalSubtitle}>
              Your identity will remain completely anonymous
            </Text>

            {/* Mood Selector */}
            <View style={styles.moodSelector}>
              <Text style={styles.moodLabel}>Choose your mood:</Text>
              <View style={styles.moodOptions}>
                {moods.map((mood) => (
                  <TouchableOpacity
                    key={mood.id}
                    style={[
                      styles.moodOption,
                      selectedMood === mood.id && styles.moodOptionSelected,
                    ]}
                    onPress={() => setSelectedMood(mood.id)}
                  >
                    <Text style={styles.moodIcon}>{mood.icon}</Text>
                    <Text style={styles.moodName}>{mood.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Text Input */}
            <TextInput
              style={styles.textInput}
              placeholder="What's on your mind? Share your whisper..."
              placeholderTextColor={theme.colors.textSecondary}
              value={whisperText}
              onChangeText={setWhisperText}
              multiline
              maxLength={2000}
              returnKeyType="done"
              blurOnSubmit={true}
              textAlignVertical="top"
            />

            {/* Buttons */}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={closeCreateModal}
              >
                <Text style={[styles.buttonText, styles.cancelButtonText]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton, 
                  styles.submitButton,
                  (!whisperText.trim() || !selectedMood || isSubmitting) && styles.submitButtonDisabled
                ]}
                disabled={!whisperText.trim() || !selectedMood || isSubmitting}
                onPress={handleSubmitWhisper}
              >
                <Text style={[styles.buttonText, styles.submitButtonText]}>
                  {isSubmitting ? 'Sharing...' : 'Share Whisper'}
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </View>
      <ReactionPopup
        visible={reactionPopup.visible}
        position={reactionPopup.position}
        onSelect={handleReactionSelect}
        onClose={hideReactionPopup}
      />
    </SafeAreaView>
  );
};

export default WhisperWallScreen;
