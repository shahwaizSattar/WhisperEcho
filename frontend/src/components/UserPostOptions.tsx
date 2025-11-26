import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface UserPostOptionsProps {
  visible: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const UserPostOptions: React.FC<UserPostOptionsProps> = ({
  visible,
  onClose,
  onEdit,
  onDelete,
}) => {
  const { theme } = useTheme();

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
    },
    handleBar: {
      width: 40,
      height: 4,
      backgroundColor: theme.colors.border,
      borderRadius: 2,
      alignSelf: 'center',
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
    optionText: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
      flex: 1,
    },
    deleteOption: {
      borderTopWidth: 1,
      borderTopColor: theme.colors.border + '30',
      marginTop: 8,
    },
    deleteText: {
      color: theme.colors.error,
    },
    cancelButton: {
      marginTop: 8,
      paddingVertical: 16,
      alignItems: 'center',
    },
    cancelText: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.textSecondary,
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
          
          {/* Edit Option */}
          <TouchableOpacity
            style={styles.optionButton}
            onPress={() => {
              onEdit();
              onClose();
            }}
          >
            <Text style={styles.optionIcon}>✏️</Text>
            <Text style={styles.optionText}>Edit Post</Text>
          </TouchableOpacity>

          {/* Delete Option */}
          <TouchableOpacity
            style={[styles.optionButton, styles.deleteOption]}
            onPress={() => {
              onDelete();
              onClose();
            }}
          >
            <Text style={styles.optionIcon}>🗑️</Text>
            <Text style={[styles.optionText, styles.deleteText]}>Delete Post</Text>
          </TouchableOpacity>

          {/* Cancel Button */}
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={onClose}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

export default UserPostOptions;

