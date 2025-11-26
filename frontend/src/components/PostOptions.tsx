import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { postsAPI, userAPI } from '../services/api';
import Toast from 'react-native-toast-message';

interface PostOptionsProps {
  visible: boolean;
  onClose: () => void;
  postId: string;
  authorId?: string;
  authorUsername?: string;
  onPostHidden?: () => void;
  onUserBlocked?: () => void;
  onUserMuted?: () => void;
}

const PostOptions: React.FC<PostOptionsProps> = ({
  visible,
  onClose,
  postId,
  authorId,
  authorUsername,
  onPostHidden,
  onUserBlocked,
  onUserMuted,
}) => {
  const { theme } = useTheme();
  const [showReportOptions, setShowReportOptions] = useState(false);
  const [reportReason, setReportReason] = useState<string | null>(null);

  const reportReasons = [
    { id: 'harassment', label: 'Harassment', icon: '🚫' },
    { id: 'hate', label: 'Hate / Discrimination', icon: '💔' },
    { id: 'violence', label: 'Violence or Threats', icon: '⚔️' },
    { id: 'explicit', label: 'Explicit / Sexual', icon: '🔞' },
    { id: 'spam', label: 'Spam or Fake', icon: '📧' },
    { id: 'selfharm', label: 'Self-harm Concern', icon: '⚠️' },
    { id: 'misinformation', label: 'Misinformation', icon: '❌' },
    { id: 'other', label: 'Other', icon: '📝' },
  ];

  const handleReport = async (reason: string) => {
    try {
      await postsAPI.reportPost(postId, reason);
      Toast.show({
        type: 'success',
        text1: 'Report Submitted',
        text2: 'Thank you for reporting. We\'ll review this content.',
      });
      setReportReason(reason);
      setTimeout(() => {
        setShowReportOptions(false);
        onClose();
        setReportReason(null);
      }, 1500);
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to submit report. Please try again.',
      });
    }
  };

  const handleMuteUser = async () => {
    if (!authorId) return;
    try {
      await userAPI.muteUser(authorId);
      onUserMuted?.();
      onClose();
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to mute user. Please try again.',
      });
    }
  };

  const handleBlockUser = async () => {
    if (!authorId) return;
    try {
      await userAPI.blockUser(authorId);
      onUserBlocked?.();
      onClose();
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to block user. Please try again.',
      });
    }
  };

  const handleHidePost = async () => {
    try {
      await postsAPI.hidePost(postId);
      onPostHidden?.();
      onClose();
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to hide post. Please try again.',
      });
    }
  };

  const styles = StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: theme.colors.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingTop: 20,
      paddingBottom: 40,
      maxHeight: '80%',
    },
    handleBar: {
      width: 40,
      height: 4,
      backgroundColor: theme.colors.border,
      borderRadius: 2,
      alignSelf: 'center',
      marginBottom: 20,
    },
    title: {
      fontSize: 20,
      fontWeight: 'bold',
      color: theme.colors.text,
      paddingHorizontal: 20,
      marginBottom: 20,
    },
    optionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 16,
      paddingHorizontal: 20,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border + '30',
    },
    optionIcon: {
      fontSize: 24,
      marginRight: 16,
      width: 32,
    },
    optionTextContainer: {
      flex: 1,
    },
    optionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 4,
    },
    optionDescription: {
      fontSize: 12,
      color: theme.colors.textSecondary,
    },
    optionArrow: {
      fontSize: 18,
      color: theme.colors.textSecondary,
    },
    dangerOption: {
      borderTopWidth: 1,
      borderTopColor: theme.colors.border + '30',
      marginTop: 8,
    },
    dangerText: {
      color: theme.colors.error,
    },
    reportOption: {
      backgroundColor: theme.colors.error + '10',
    },
    backButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 16,
      paddingHorizontal: 20,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border + '30',
    },
    backIcon: {
      fontSize: 20,
      marginRight: 12,
      color: theme.colors.text,
    },
    backText: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
    },
    reportReasonButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
      paddingHorizontal: 20,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border + '20',
    },
    reportReasonIcon: {
      fontSize: 20,
      marginRight: 12,
    },
    reportReasonText: {
      fontSize: 15,
      color: theme.colors.text,
      flex: 1,
    },
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
          style={styles.modalContent}
        >
          <View style={styles.handleBar} />
          
          {!showReportOptions ? (
            <>
              <Text style={styles.title}>Post Options</Text>
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Report Post */}
                <TouchableOpacity
                  style={[styles.optionButton, styles.reportOption]}
                  onPress={() => setShowReportOptions(true)}
                >
                  <Text style={styles.optionIcon}>🚨</Text>
                  <View style={styles.optionTextContainer}>
                    <Text style={[styles.optionTitle, styles.dangerText]}>
                      Report Post
                    </Text>
                    <Text style={styles.optionDescription}>
                      A clean, responsible moderation tool.
                    </Text>
                  </View>
                  <Text style={styles.optionArrow}>›</Text>
                </TouchableOpacity>

                {/* Mute User */}
                {authorId && (
                  <TouchableOpacity
                    style={styles.optionButton}
                    onPress={handleMuteUser}
                  >
                    <Text style={styles.optionIcon}>🔇</Text>
                    <View style={styles.optionTextContainer}>
                      <Text style={styles.optionTitle}>Mute User</Text>
                      <Text style={styles.optionDescription}>
                        Blocks seeing posts from this user without them knowing.
                        Perfect for anonymous spaces where boundaries matter.
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}

                {/* Block User */}
                {authorId && (
                  <TouchableOpacity
                    style={[styles.optionButton, styles.dangerOption]}
                    onPress={handleBlockUser}
                  >
                    <Text style={styles.optionIcon}>🚫</Text>
                    <View style={styles.optionTextContainer}>
                      <Text style={[styles.optionTitle, styles.dangerText]}>
                        Block User
                      </Text>
                      <Text style={styles.optionDescription}>
                        Full block — they cannot interact with you or your posts.
                        Stronger than mute.
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}

                {/* Hide Post */}
                <TouchableOpacity
                  style={styles.optionButton}
                  onPress={handleHidePost}
                >
                  <Text style={styles.optionIcon}>👁️‍🗨️</Text>
                  <View style={styles.optionTextContainer}>
                    <Text style={styles.optionTitle}>Hide Post</Text>
                    <Text style={styles.optionDescription}>
                      Removes this post from your feed without affecting the user.
                    </Text>
                  </View>
                </TouchableOpacity>
              </ScrollView>
            </>
          ) : (
            <>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => setShowReportOptions(false)}
              >
                <Text style={styles.backIcon}>←</Text>
                <Text style={styles.backText}>Back</Text>
              </TouchableOpacity>
              <Text style={styles.title}>Report Post</Text>
              <Text style={{
                fontSize: 14,
                color: theme.colors.textSecondary,
                paddingHorizontal: 20,
                marginBottom: 20,
              }}>
                Why are you reporting this post?
              </Text>
              <ScrollView showsVerticalScrollIndicator={false}>
                {reportReasons.map((reason) => (
                  <TouchableOpacity
                    key={reason.id}
                    style={styles.reportReasonButton}
                    onPress={() => handleReport(reason.id)}
                  >
                    <Text style={styles.reportReasonIcon}>{reason.icon}</Text>
                    <Text style={styles.reportReasonText}>{reason.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

export default PostOptions;

