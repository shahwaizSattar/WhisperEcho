import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { Top3ReactionsDisplay } from './Top3ReactionsDisplay';
import { formatTimeAgo } from '../utils/timeUtils';

interface Reply {
  _id: string;
  author: {
    _id: string;
    username: string;
    avatar?: string;
  };
  content: string;
  createdAt: string;
  reactions?: {
    funny?: number;
    love?: number;
    total?: number;
  };
  userReaction?: 'funny' | 'love' | null;
}

interface Comment {
  _id: string;
  author: {
    _id: string;
    username: string;
    avatar?: string;
  };
  content: string;
  createdAt: string;
  reactions?: {
    funny?: number;
    love?: number;
    total?: number;
  };
  userReaction?: 'funny' | 'love' | null;
  replies?: Reply[];
  replyCount?: number;
}

interface CommentReplySectionProps {
  comment: Comment;
  onReply: (commentId: string, content: string) => Promise<void>;
  onReactToComment: (commentId: string, reactionType: 'funny' | 'love') => Promise<void>;
  onReactToReply: (commentId: string, replyId: string, reactionType: 'funny' | 'love') => Promise<void>;
  onLoadReplies?: (commentId: string) => Promise<void>;
}

export const CommentReplySection: React.FC<CommentReplySectionProps> = ({
  comment,
  onReply,
  onReactToComment,
  onReactToReply,
  onLoadReplies,
}) => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [showReplies, setShowReplies] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmitReply = async () => {
    if (!replyText.trim() || submitting) return;

    try {
      setSubmitting(true);
      await onReply(comment._id, replyText.trim());
      setReplyText('');
      setShowReplyInput(false);
      setShowReplies(true);
    } catch (error) {
      console.error('Error submitting reply:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleReplies = async () => {
    if (!showReplies && onLoadReplies && (!comment.replies || comment.replies.length === 0)) {
      await onLoadReplies(comment._id);
    }
    setShowReplies(!showReplies);
  };

  const styles = StyleSheet.create({
    container: {
      marginTop: theme.spacing.sm,
    },
    commentContainer: {
      flexDirection: 'row',
      marginBottom: theme.spacing.sm,
    },
    avatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.colors.primary + '30',
      marginRight: theme.spacing.sm,
    },
    avatarPlaceholder: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.colors.primary + '30',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: theme.spacing.sm,
    },
    avatarText: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.primary,
    },
    commentContent: {
      flex: 1,
    },
    commentBubble: {
      backgroundColor: theme.colors.surface,
      borderRadius: 18,
      padding: theme.spacing.md,
      marginBottom: 4,
    },
    username: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 4,
    },
    commentText: {
      fontSize: 14,
      color: theme.colors.text,
      lineHeight: 20,
    },
    commentActions: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 4,
      gap: theme.spacing.md,
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 4,
    },
    actionText: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.textSecondary,
      marginLeft: 4,
    },
    activeAction: {
      color: theme.colors.primary,
    },
    timestamp: {
      fontSize: 11,
      color: theme.colors.textSecondary,
    },
    replyInputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: theme.spacing.sm,
      marginLeft: 44,
      backgroundColor: theme.colors.surface,
      borderRadius: 20,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.xs,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    replyInput: {
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
    repliesContainer: {
      marginLeft: 44,
      marginTop: theme.spacing.sm,
    },
    replyItem: {
      flexDirection: 'row',
      marginBottom: theme.spacing.sm,
    },
    replyAvatar: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: theme.colors.primary + '20',
      marginRight: theme.spacing.xs,
    },
    replyAvatarPlaceholder: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: theme.colors.primary + '20',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: theme.spacing.xs,
    },
    replyAvatarText: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.primary,
    },
    replyContent: {
      flex: 1,
    },
    replyBubble: {
      backgroundColor: theme.colors.background,
      borderRadius: 16,
      padding: theme.spacing.sm,
      marginBottom: 4,
    },
    replyUsername: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 2,
    },
    replyText: {
      fontSize: 13,
      color: theme.colors.text,
      lineHeight: 18,
    },
    replyActions: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 2,
      gap: theme.spacing.sm,
    },
    viewRepliesButton: {
      flexDirection: 'row',
      alignItems: 'center',
      marginLeft: 44,
      marginTop: theme.spacing.xs,
      paddingVertical: theme.spacing.xs,
    },
    viewRepliesText: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.primary,
      marginLeft: 4,
    },
  });

  return (
    <View style={styles.container}>
      {/* Main Comment */}
      <View style={styles.commentContainer}>
        {comment.author.avatar ? (
          <Image source={{ uri: comment.author.avatar }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>
              {comment.author.username.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        
        <View style={styles.commentContent}>
          <View style={styles.commentBubble}>
            <Text style={styles.username}>{comment.author.username}</Text>
            <Text style={styles.commentText}>{comment.content}</Text>
          </View>
          
          <View style={styles.commentActions}>
            {comment.reactions && comment.reactions.total! > 0 && (
              <Top3ReactionsDisplay
                reactionCounts={comment.reactions}
                size="small"
              />
            )}
            
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => onReactToComment(comment._id, 'love')}
            >
              <Text style={[styles.actionText, comment.userReaction === 'love' && styles.activeAction]}>
                {comment.userReaction === 'love' ? '❤️' : '🤍'} Like
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => setShowReplyInput(!showReplyInput)}
            >
              <Text style={styles.actionText}>💬 Reply</Text>
            </TouchableOpacity>
            
            <Text style={styles.timestamp}>{formatTimeAgo(comment.createdAt)}</Text>
          </View>
        </View>
      </View>

      {/* Reply Input */}
      {showReplyInput && (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={100}
        >
          <View style={styles.replyInputContainer}>
            <TextInput
              style={styles.replyInput}
              placeholder={`Reply to ${comment.author.username}...`}
              placeholderTextColor={theme.colors.textSecondary}
              value={replyText}
              onChangeText={setReplyText}
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              style={styles.sendButton}
              onPress={handleSubmitReply}
              disabled={!replyText.trim() || submitting}
            >
              <Text style={[styles.sendButtonText, (!replyText.trim() || submitting) && { opacity: 0.3 }]}>
                ➤
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}

      {/* View Replies Button */}
      {comment.replyCount! > 0 && !showReplies && (
        <TouchableOpacity style={styles.viewRepliesButton} onPress={handleToggleReplies}>
          <Text style={styles.viewRepliesText}>
            ↳ View {comment.replyCount} {comment.replyCount === 1 ? 'reply' : 'replies'}
          </Text>
        </TouchableOpacity>
      )}

      {/* Hide Replies Button */}
      {showReplies && comment.replies && comment.replies.length > 0 && (
        <TouchableOpacity style={styles.viewRepliesButton} onPress={() => setShowReplies(false)}>
          <Text style={styles.viewRepliesText}>↳ Hide replies</Text>
        </TouchableOpacity>
      )}

      {/* Replies List */}
      {showReplies && comment.replies && comment.replies.length > 0 && (
        <View style={styles.repliesContainer}>
          {comment.replies.map((reply) => (
            <View key={reply._id} style={styles.replyItem}>
              {reply.author.avatar ? (
                <Image source={{ uri: reply.author.avatar }} style={styles.replyAvatar} />
              ) : (
                <View style={styles.replyAvatarPlaceholder}>
                  <Text style={styles.replyAvatarText}>
                    {reply.author.username.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              
              <View style={styles.replyContent}>
                <View style={styles.replyBubble}>
                  <Text style={styles.replyUsername}>{reply.author.username}</Text>
                  <Text style={styles.replyText}>{reply.content}</Text>
                </View>
                
                <View style={styles.replyActions}>
                  {reply.reactions && reply.reactions.total! > 0 && (
                    <Top3ReactionsDisplay
                      reactionCounts={reply.reactions}
                      size="small"
                    />
                  )}
                  
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => onReactToReply(comment._id, reply._id, 'love')}
                  >
                    <Text style={[styles.actionText, reply.userReaction === 'love' && styles.activeAction]}>
                      {reply.userReaction === 'love' ? '❤️' : '🤍'}
                    </Text>
                  </TouchableOpacity>
                  
                  <Text style={styles.timestamp}>{formatTimeAgo(reply.createdAt)}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};
