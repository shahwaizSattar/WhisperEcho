import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { postsAPI } from '../services/api';
import Toast from 'react-native-toast-message';

interface EditPostModalProps {
  visible: boolean;
  post: {
    _id: string;
    content: {
      text: string;
    };
    category: string;
  } | null;
  onClose: () => void;
  onSuccess: () => void;
}

const EditPostModal: React.FC<EditPostModalProps> = ({
  visible,
  post,
  onClose,
  onSuccess,
}) => {
  const { theme } = useTheme();
  const [editedText, setEditedText] = useState('');
  const [editedCategory, setEditedCategory] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  React.useEffect(() => {
    if (post) {
      setEditedText(post.content.text);
      setEditedCategory(post.category);
    }
  }, [post, visible]);

  const handleSave = async () => {
    if (!editedText.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Post content cannot be empty',
      });
      return;
    }

    if (!post) return;

    try {
      setIsLoading(true);
      const response = await postsAPI.editPost(post._id, {
        content: {
          text: editedText.trim(),
        },
        category: editedCategory,
      });

      if (response.success) {
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: 'Post updated successfully',
        });
        onSuccess();
        onClose();
      } else {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: response.message || 'Failed to update post',
        });
      }
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.response?.data?.message || 'Failed to update post',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const styles = StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      justifyContent: 'flex-end',
    },
    container: {
      backgroundColor: theme.colors.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: 20,
      paddingVertical: 24,
      maxHeight: '80%',
    },
    header: {
      fontSize: 20,
      fontWeight: '700',
      color: theme.colors.text,
      marginBottom: 20,
    },
    label: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 8,
    },
    input: {
      backgroundColor: theme.colors.background,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
      color: theme.colors.text,
      marginBottom: 16,
      minHeight: 100,
      textAlignVertical: 'top',
    },
    categoryInput: {
      backgroundColor: theme.colors.background,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
      color: theme.colors.text,
      marginBottom: 24,
    },
    charCount: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      marginBottom: 16,
      textAlign: 'right',
    },
    buttonContainer: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 20,
    },
    button: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    saveButton: {
      backgroundColor: theme.colors.primary,
    },
    cancelButton: {
      backgroundColor: theme.colors.border,
    },
    buttonText: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.textInverse,
    },
    cancelButtonText: {
      color: theme.colors.text,
    },
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={onClose}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            style={styles.container}
          >
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.header}>Edit Post</Text>

              <Text style={styles.label}>Post Content</Text>
              <TextInput
                style={styles.input}
                placeholder="What's on your mind?"
                placeholderTextColor={theme.colors.textSecondary}
                value={editedText}
                onChangeText={setEditedText}
                multiline
                maxLength={2000}
                editable={!isLoading}
              />
              <Text style={styles.charCount}>
                {editedText.length}/2000
              </Text>

              <Text style={styles.label}>Category</Text>
              <TextInput
                style={styles.categoryInput}
                placeholder="e.g., Random, Rant, Question"
                placeholderTextColor={theme.colors.textSecondary}
                value={editedCategory}
                onChangeText={setEditedCategory}
                editable={!isLoading}
              />

              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton]}
                  onPress={onClose}
                  disabled={isLoading}
                >
                  <Text style={[styles.buttonText, styles.cancelButtonText]}>
                    Cancel
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.button, styles.saveButton]}
                  onPress={handleSave}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color={theme.colors.textInverse} />
                  ) : (
                    <Text style={styles.buttonText}>Save Changes</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default EditPostModal;
