import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import { getSocket } from '../services/socket';
import { useAuth } from './AuthContext';
import MessageNotification from '../components/MessageNotification';

interface MessageNotificationData {
  senderName: string;
  senderAvatar?: string;
  text: string;
  senderId: string;
}

interface MessageNotificationContextType {
  showNotification: (message: MessageNotificationData) => void;
}

const MessageNotificationContext = createContext<MessageNotificationContextType | undefined>(undefined);

export const useMessageNotification = () => {
  const context = useContext(MessageNotificationContext);
  if (!context) {
    throw new Error('useMessageNotification must be used within MessageNotificationProvider');
  }
  return context;
};

export const MessageNotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [notification, setNotification] = useState<MessageNotificationData | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const socket = getSocket();
    
    const handleNewMessage = (payload: any) => {
      try {
        const { sender, message } = payload || {};
        const senderId = String(sender?._id || sender);
        const myId = String(user?._id || '');
        
        // Only show notification if message is from someone else
        if (senderId && senderId !== myId) {
          showNotification({
            senderName: sender?.username || 'Someone',
            senderAvatar: sender?.avatar,
            text: message?.text || 'Sent a message',
            senderId: senderId,
          });
        }
      } catch (e) {
        console.error('Error handling message notification:', e);
      }
    };

    socket.on('chat:new-message', handleNewMessage);

    return () => {
      socket.off('chat:new-message', handleNewMessage);
    };
  }, [user?._id]);

  const showNotification = (message: MessageNotificationData) => {
    setNotification(message);
    setVisible(true);
  };

  const handlePress = () => {
    if (notification) {
      setVisible(false);
      // Navigate to chat with the sender
      (navigation as any).navigate('Chat', {
        peerId: notification.senderId,
        username: notification.senderName,
        avatar: notification.senderAvatar,
      });
    }
  };

  const handleDismiss = () => {
    setVisible(false);
    setTimeout(() => {
      setNotification(null);
    }, 300);
  };

  return (
    <MessageNotificationContext.Provider value={{ showNotification }}>
      {children}
      {notification && (
        <MessageNotification
          visible={visible}
          message={notification}
          onPress={handlePress}
          onDismiss={handleDismiss}
        />
      )}
    </MessageNotificationContext.Provider>
  );
};
