// Example integration of Facebook-style reactions and comment replies in PostDetailScreen
// This shows how to integrate the new components into your existing PostDetailScreen

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { postsAPI } from '../../services/api';
import { reactionsAPI } from '../../services/reactions';
import Toast from 'react-native-toast-message';
import { Top3ReactionsDisplay } from '../../components/Top3ReactionsDisplay';
import { CommentReplySection } from '../../components/CommentReplySection';
import ReactionPopup from '../../components/ReactionPopup';

const PostDetailScreen: React.FC = ({ route, navigation }) => {
  const { postId } = route.params;
  const { theme } = useTheme();
  const { user } = useAuth();
  
  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [reactionPopup, setReactionPopup] = useState({
    visible: false,
    position: { x: 0, y: 0 },
  });

  useEffect(() => {
    loadPost();
  }, [postId]);

  const loadPost = async () => {
    try {
      setLoading(true);
      const response = await postsAPI.getPost(postId);
      if (response.success && response.data) {
        setPost(response.data);
      }
    } catch (error) {
      console.error('Error loading post:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to load post',
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle post reactions
  const handleReaction = async (reactionType: 'funny' | 'rage' | 'shock' | 'relatable' | 'love' | 'thinking') => {
    try {
      let response;
      if (post.userReaction === reactionType) {
        response = await reactionsAPI.removeReaction(postId);
      } else {
        response = await reactionsAPI.addReaction(postId, reactionType);
      }
      
      if (response.success && response.reactions) {
        setPost(prev => ({
          ...prev,
          reactionCounts: response.reactions,
          userReaction: response.userReaction || null,
        }));
      }
      
      setReactionPopup({ visible: false, position: { x: 0, y: 0 } });
    } catch (error) {
      console.error('Error handling reaction:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to update reaction',
      });
    }
  };

  // Handle adding a comment
  const handleAddComment = async () => {
    if (!commentText.trim() || submitting) return;

    try {
      setSubmitting(true);
      const response = await postsAPI.addComment(postId, commentText.trim());
      
      if (response.success) {
        setCommentText('');
        await loadPost(); // Reload to get updated comments
        Toast.show({
          type: 'success',
          text1: 'Comment added',
          text2: 'Your comment has been posted',
        });
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to add comment',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Handle adding a reply to a comment
  const handleReply = async (commentId: string, content: string) => {
    try {
      const response = await postsAPI.addReply(postId, commentId, content);
      
      if (response.success) {
        await loadPost(); // Reload to get updated comments with replies
        Toast.show({
          type: 'success',
          text1: 'Reply added',
          text2: 'Your reply has been posted',
        });
      }
    } catch (error) {
      console.error('Error adding reply:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to add reply',
      });
    }
  };

  // Handle reacting to a comment
  const handleReactToComment = async (commentId: string, reactionType: 'funny' | 'love') => {
    try {
      const comment = post.comments.find(c => c._id === commentId);
      
      let response;
      if (comment?.userReaction === reactionType) {
        response = await reactionsAPI.removeCommentReaction(postId, commentId);
      } else {
        response = await reactionsAPI.addCommentReaction(postId, commentId, reactionType);
      }
      
      if (response.success) {
        // Update comment in state
        setPost(prevPost => ({
          ...prevPost,
          comments: prevPost.comments.map(c =>
            c._id === commentId
              ? { ...c, reactionCounts: response.reactions, userReaction: response.userReaction }
              : c
          ),
        }));
      }
    } catch (error) {
      console.error('Error reacting to comment:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to react to comment',
      });
    }
  };

  // Handle reacting to a reply
  const handleReactToReply = async (commentId: string, replyId: string, reactionType: 'funny' | 'love') => {
    try {
      const comment = post.comments.find(c => c._id === commentId);
      const reply = comment?.replies?.find(r => r._id === replyId);
      
      let response;
      if (reply?.userReaction === reactionType) {
        response = await reactionsAPI.removeReplyReaction(postId, commentId, replyId);
      } else {
        response = await reactionsAPI.addReplyReaction(postId, commentId, replyId, reactionType);
      }
      
      if (response.success) {
        // Update reply in state
        setPost(prevPost => ({
          ...prevPost,
          comments: prevPost.comments.map(c =>
            c._id === commentId
              ? {
                  ...c,
                  replies: c.replies.map(r =>
                    r._id === replyId
                      ? { ...r, reactionCounts: response.reactions, userReaction: response.userReaction }
                      : r
                  ),
                }
              : c
          ),
        }));
      }
    } catch (error) {
      console.error('Error reacting to reply:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to react to reply',
      });
    }
  };

  // Handle loading replies for a comment
  const handleLoadReplies = async (commentId: string) => {
    try {
      const response = await postsAPI.getReplies(postId, commentId);
      
      if (response.success && response.replies) {
        // Update comment with loaded replies
        setPost(prevPost => ({
          ...prevPost,
          comments: prevPost.comments.map(c =>
            c._id === commentId ? { ...c, replies: response.replies } : c
          ),
        }));
      }
    } catch (error) {
      console.error('Error loading replies:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to load replies',
      });
    }
  };

  if (loading || !post) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading post...</Text>
      </View>
    );
  }

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    postContainer: {
      backgroundColor: theme.colors.surface,
      padding: theme.spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    postText: {
      fontSize: 16,
      lineHeight: 24,
      color: theme.colors.text,
      marginBottom: theme.spacing.md,
    },
    postActions: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: theme.spacing.md,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.borderRadius.md,
      backgroundColor: theme.colors.background,
    },
    actionButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.text,
      marginLeft: theme.spacing.xs,
    },
    commentsSection: {
      padding: theme.spacing.lg,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: theme.colors.text,
      marginBottom: theme.spacing.md,
    },
    commentInputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      borderRadius: 24,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.xs,
      marginBottom: theme.spacing.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    commentInput: {
      flex: 1,
      fontSize: 14,
      color: theme.colors.text,
      paddingVertical: 8,
      maxHeight: 100,
    },
    sendButton: {
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
    },
    sendButtonText: {
      fontSize: 20,
      color: theme.colors.primary,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.colors.background,
    },
    loadingText: {
      fontSize: 16,
      color: theme.colors.textSecondary,
    },
  });

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={100}
    >
      <ScrollView style={styles.container}>
        {/* Post Content */}
        <View style={styles.postContainer}>
          <Text style={styles.postText}>{post.content.text}</Text>
          
          {/* Post Actions with Top 3 Reactions */}
          <View style={styles.postActions}>
            <Top3ReactionsDisplay
              reactionCounts={post.reactionCounts}
              size="medium"
              onPress={() => setReactionPopup({ visible: true, position: { x: 100, y: 300 } })}
            />
            
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => setReactionPopup({ visible: true, position: { x: 100, y: 300 } })}
            >
              <Text style={styles.actionButtonText}>
                {post.userReaction ? '❤️' : '🤍'} React
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Comments Section */}
        <View style={styles.commentsSection}>
          <Text style={styles.sectionTitle}>
            Comments ({post.comments?.length || 0})
          </Text>

          {/* Add Comment Input */}
          <View style={styles.commentInputContainer}>
            <TextInput
              style={styles.commentInput}
              placeholder="Write a comment..."
              placeholderTextColor={theme.colors.textSecondary}
              value={commentText}
              onChangeText={setCommentText}
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              style={styles.sendButton}
              onPress={handleAddComment}
              disabled={!commentText.trim() || submitting}
            >
              <Text style={[styles.sendButtonText, (!commentText.trim() || submitting) && { opacity: 0.3 }]}>
                ➤
              </Text>
            </TouchableOpacity>
          </View>

          {/* Comments with Replies */}
          {post.comments?.map((comment) => (
            <CommentReplySection
              key={comment._id}
              comment={comment}
              onReply={handleReply}
              onReactToComment={handleReactToComment}
              onReactToReply={handleReactToReply}
              onLoadReplies={handleLoadReplies}
            />
          ))}
        </View>
      </ScrollView>

      {/* Reaction Popup */}
      {reactionPopup.visible && (
        <ReactionPopup
          visible={reactionPopup.visible}
          position={reactionPopup.position}
          onSelect={handleReaction}
          onClose={() => setReactionPopup({ visible: false, position: { x: 0, y: 0 } })}
          currentReaction={post.userReaction}
        />
      )}
    </KeyboardAvoidingView>
  );
};

export default PostDetailScreen;
