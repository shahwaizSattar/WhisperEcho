import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  TextInput,
  ScrollView,
  Alert,
  Modal,
  StatusBar,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { chatAPI, userAPI } from '../../services/api';
import { getSocket } from '../../services/socket';
import { convertAvatarUrl } from '../../utils/imageUtils';

interface Chat {
  _id: string;
  participants: Array<{
    _id: string;
    username: string;
    avatar?: string;
  }>;
  lastMessage?: {
    text: string;
    createdAt: string;
    sender: string;
    readBy: string[];
  };
  lastMessageAt: string;
}

interface Message {
  _id: string;
  text: string;
  createdAt: string;
  sender: string;
  readBy: string[];
}

interface User {
  _id: string;
  username: string;
  avatar?: string;
}

const MessengerScreen: React.FC = () => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation();
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesListRef = useRef<FlatList<Message>>(null);
  const [newMessage, setNewMessage] = useState('');
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  useEffect(() => {
    loadChats();
  }, []);

  useEffect(() => {
    const socket = getSocket();
    if (user?._id) {
      socket.emit('join-room', user._id);
    }
    const onNewMessage = (payload: any) => {
      try {
        const { sender, message, conversationId } = payload || {};
        // Update chats list lastMessage
        setChats((prev: any) => {
          const updated = (prev as Chat[]).map((c: Chat) => {
            if (c._id !== conversationId) return c;
            const lm = { text: message?.text || '', createdAt: message?.createdAt || new Date().toISOString(), sender: String(sender?._id || sender || ''), readBy: message?.readBy || [] };
            const cu: Chat = { _id: c._id, participants: c.participants, lastMessage: lm, lastMessageAt: message?.createdAt || new Date().toISOString() };
            return cu;
          });
          return updated as Chat[];
        });

        // If viewing this conversation, append message to bottom
        if (selectedChat) {
          const other = getOtherParticipant(selectedChat);
          const senderId = String(sender?._id || sender);
          const otherId = String(other?._id || '');
          const myId = String(user?._id || '');
          if (other && senderId === otherId && senderId !== myId) {
            setMessages(prev => {
              const next = [...prev, { _id: message?._id || Date.now().toString(), text: message?.text || '', createdAt: message?.createdAt || new Date().toISOString(), sender: sender?._id || '', readBy: message?.readBy || [] }];
              requestAnimationFrame(() => messagesListRef.current?.scrollToEnd({ animated: true }));
              return next;
            });
            chatAPI.markRead(otherId).catch(() => {});
          }
        }
      } catch (e) {}
    };
    socket.on('chat:new-message', onNewMessage);
    const onUpdated = (payload: any) => {
      try {
        const { messageId, text, conversationId } = payload || {};
        setMessages(prev => prev.map(m => m._id === messageId ? { ...m, text } : m));
        setChats(prev => prev.map(c => c._id === conversationId ? { 
          ...c, 
          lastMessage: { 
            text, 
            createdAt: c.lastMessage?.createdAt || new Date().toISOString(), 
            sender: c.lastMessage?.sender || '', 
            readBy: c.lastMessage?.readBy || [] 
          } 
        } : c));
      } catch (e) {}
    };
    const onDeleted = (payload: any) => {
      try {
        const { messageId, conversationId } = payload || {};
        setMessages(prev => prev.filter(m => m._id !== messageId));
        setChats(prev => prev.map(c => c._id === conversationId ? { ...c } : c));
      } catch (e) {}
    };
    socket.on('chat:message-updated', onUpdated);
    socket.on('chat:message-deleted', onDeleted);
    return () => {
      socket.off('chat:new-message', onNewMessage);
      socket.off('chat:message-updated', onUpdated);
      socket.off('chat:message-deleted', onDeleted);
      if (user?._id) socket.emit('leave-room', user._id);
    };
  }, [user?._id, selectedChat]);

  const loadChats = async () => {
    try {
      setLoading(true);
      const response = await chatAPI.getConversations();
      if (response.success) {
        // Transform the data to match our interface
        const transformedChats = response.conversations.map((chat: any) => ({
          _id: chat._id,
          participants: chat.participants,
          lastMessage: chat.lastMessage,
          lastMessageAt: chat.lastMessageAt,
        }));
        setChats(transformedChats);
      }
    } catch (error) {
      console.error('Error loading chats:', error);
      Alert.alert('Error', 'Failed to load conversations');
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (peerId: string) => {
    try {
      const response = await chatAPI.getMessages(peerId);
      if (response.success) {
        const msgs: Message[] = (response.messages || []).slice().sort((a: Message, b: Message) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        setMessages(msgs);
        // Mark messages as read
        await chatAPI.markRead(peerId);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      Alert.alert('Error', 'Failed to load messages');
    }
  };

  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    
    try {
      setSearchLoading(true);
      const response = await userAPI.searchUsers(query);
      console.log('💬 Messenger search response:', response);
      if (response.success) {
        setSearchResults(response.users || []);
        console.log('💬 Found users for messenger:', response.users?.length || 0);
      } else {
        console.log('💬 Messenger search failed:', response.message);
      }
    } catch (error) {
      console.error('Error searching users:', error);
      Alert.alert('Error', 'Failed to search users');
    } finally {
      setSearchLoading(false);
    }
  };

  const startConversation = async (peerId: string) => {
    try {
      setShowUserSearch(false);
      setSearchQuery('');
      setSearchResults([]);
      
      // Find or create conversation
      const response = await chatAPI.getMessages(peerId);
      if (response.success) {
        // Load messages for this conversation
        await loadMessages(peerId);
        
        // Find the chat in our list or create a temporary one
        let chat = chats.find(c => c.participants.some(p => p._id === peerId));
        if (!chat) {
          // Create a temporary chat entry
          const peerUser = searchResults.find(u => u._id === peerId);
          if (peerUser) {
            chat = {
              _id: `temp_${peerId}`,
              participants: [peerUser, { _id: user?._id || '', username: user?.username || '', avatar: user?.avatar }],
              lastMessage: undefined,
              lastMessageAt: new Date().toISOString(),
            };
            setChats(prev => [chat!, ...prev]);
          }
        }
        
        if (chat) {
          setSelectedChat(chat);
        }
      }
    } catch (error) {
      console.error('Error starting conversation:', error);
      Alert.alert('Error', 'Failed to start conversation');
    }
  };

  const handleChatSelect = (chat: Chat) => {
    setSelectedChat(chat);
    // Get the peer ID (the other participant)
    const peerId = chat.participants.find(p => p._id !== user?._id)?._id;
    if (peerId) {
      loadMessages(peerId);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedChat) return;

    // Get the peer ID (the other participant)
    const peerId = selectedChat.participants.find(p => p._id !== user?._id)?._id;
    if (!peerId) return;

    try {
      const response = await chatAPI.sendMessage(peerId, newMessage.trim());
      if (response.success) {
        const serverMsg = response?.data?.message || response?.message;
        const newMsg: Message = {
          _id: serverMsg?._id || Date.now().toString(),
          text: serverMsg?.text || newMessage.trim(),
          createdAt: serverMsg?.createdAt || new Date().toISOString(),
          sender: user?._id || '',
          readBy: serverMsg?.readBy || [user?._id || ''],
        };
        setMessages(prev => [...prev, newMsg]);
        setNewMessage('');
        await loadChats();
      }
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message');
    }
  };

  const formatTime = (timestamp: string | number) => {
    const now = Date.now();
    const time = typeof timestamp === 'string' ? new Date(timestamp).getTime() : timestamp;
    const diff = now - time;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return 'now';
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    return `${days}d`;
  };

  const getOtherParticipant = (chat: Chat) => {
    return chat.participants.find(p => p._id !== user?._id);
  };

  const getUnreadCount = (chat: Chat) => {
    if (!chat.lastMessage) return 0;
    const isFromOther = chat.lastMessage.sender !== user?._id;
    const isRead = chat.lastMessage.readBy.includes(user?._id || '');
    return isFromOther && !isRead ? 1 : 0;
  };

  const renderChatItem = ({ item }: { item: Chat }) => {
    const otherUser = getOtherParticipant(item);
    const unreadCount = getUnreadCount(item);
    
    if (!otherUser) return null;
    
    return (
      <TouchableOpacity
        style={[
          styles.chatItem,
          selectedChat?._id === item._id && styles.chatItemSelected,
        ]}
        onPress={() => handleChatSelect(item)}
      >
        <View style={styles.chatAvatar}>
          {otherUser.avatar ? (
            <Image source={{ uri: otherUser.avatar }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>
                {otherUser.username.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.chatContent}>
          <View style={styles.chatHeader}>
            <Text style={styles.chatUsername}>{otherUser.username}</Text>
            <Text style={styles.chatTime}>
              {formatTime(item.lastMessageAt)}
            </Text>
          </View>
          <View style={styles.chatMessageContainer}>
            <Text
              style={[
                styles.chatMessage,
                unreadCount > 0 && styles.unreadMessage,
              ]}
              numberOfLines={1}
            >
              {item.lastMessage?.text || 'No messages yet'}
            </Text>
            {unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadCount}>{unreadCount}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isOwnMessage = item.sender === user?._id;
    const [showMenu, setShowMenu] = React.useState(false as any);
    const canEdit = isOwnMessage && !item.readBy?.some(id => String(id) !== String(user?._id));
    
    return (
      <View
        style={[
          styles.messageContainer,
          isOwnMessage ? styles.ownMessage : styles.otherMessage,
          { position: 'relative' },
        ]}
      >
        <TouchableOpacity onLongPress={() => isOwnMessage && setShowMenu(true)} activeOpacity={0.8}>
        <Text
          style={[
            styles.messageText,
            isOwnMessage ? styles.ownMessageText : styles.otherMessageText,
          ]}
        >
          {item.text}
        </Text>
        </TouchableOpacity>
        <Text style={styles.messageTime}>
          {formatTime(item.createdAt)}
        </Text>
        {isOwnMessage && (
          <TouchableOpacity onPress={() => setShowMenu(true)} style={{ position: 'absolute', top: -6, right: 10, padding: 4 }}>
            <Text style={{ fontSize: 16, color: theme.colors.textSecondary }}>⋮</Text>
          </TouchableOpacity>
        )}
        {isOwnMessage && showMenu && (
          <View style={{ position: 'absolute', top: -40, right: 0, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 8 }}>
            <TouchableOpacity onPress={() => { setEditing({ id: item._id, text: item.text }); setShowMenu(false); }} style={{ paddingHorizontal: 12, paddingVertical: 8 }}>
              <Text style={{ color: theme.colors.text }}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={async () => {
              const peerId = selectedChat?.participants.find(p => p._id !== user?._id)?._id;
              if (!peerId) return;
              try {
                await chatAPI.deleteMessage(peerId, item._id);
                setMessages(prev => prev.filter(m => m._id !== item._id));
                setShowMenu(false);
              } catch {}
            }} style={{ paddingHorizontal: 12, paddingVertical: 8 }}>
              <Text style={{ color: theme.colors.text }}>Unsend</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.xl,
      paddingVertical: theme.spacing.lg,
      backgroundColor: theme.colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    backButton: {
      marginRight: theme.spacing.md,
    },
    backButtonText: {
      fontSize: 20,
      color: theme.colors.text,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: theme.colors.text,
    },
    content: {
      flex: 1,
    },
    chatList: {
      flex: 1,
    },
    chatItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.xl,
      paddingVertical: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    chatItemSelected: {
      backgroundColor: theme.colors.primary + '10',
    },
    chatAvatar: {
      position: 'relative',
      marginRight: theme.spacing.md,
    },
    avatarImage: {
      width: 50,
      height: 50,
      borderRadius: 25,
    },
    avatarPlaceholder: {
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: theme.colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    avatarText: {
      fontSize: 20,
      fontWeight: 'bold',
      color: theme.colors.textInverse,
    },
    onlineIndicator: {
      position: 'absolute',
      bottom: 2,
      right: 2,
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: '#4CAF50',
      borderWidth: 2,
      borderColor: theme.colors.background,
    },
    chatContent: {
      flex: 1,
    },
    chatHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing.xs,
    },
    chatUsername: {
      fontSize: 16,
      fontWeight: 'bold',
      color: theme.colors.text,
    },
    chatTime: {
      fontSize: 12,
      color: theme.colors.textSecondary,
    },
    chatMessageContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    chatMessage: {
      flex: 1,
      fontSize: 14,
      color: theme.colors.textSecondary,
    },
    unreadMessage: {
      fontWeight: 'bold',
      color: theme.colors.text,
    },
    unreadBadge: {
      backgroundColor: theme.colors.primary,
      borderRadius: 10,
      minWidth: 20,
      height: 20,
      justifyContent: 'center',
      alignItems: 'center',
      marginLeft: theme.spacing.sm,
    },
    unreadCount: {
      fontSize: 12,
      fontWeight: 'bold',
      color: theme.colors.textInverse,
    },
    chatView: {
      flex: 1,
    },
    chatHeaderBar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.xl,
      paddingVertical: theme.spacing.md,
      backgroundColor: theme.colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    chatUserInfo: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
    },
    chatUserName: {
      fontSize: 18,
      fontWeight: 'bold',
      color: theme.colors.text,
      marginLeft: theme.spacing.md,
    },
    messagesContainer: {
      flex: 1,
      paddingHorizontal: theme.spacing.xl,
      paddingVertical: theme.spacing.md,
    },
    messageContainer: {
      marginVertical: theme.spacing.xs,
      maxWidth: '80%',
    },
    ownMessage: {
      alignSelf: 'flex-end',
    },
    otherMessage: {
      alignSelf: 'flex-start',
    },
    messageText: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.borderRadius.lg,
      fontSize: 16,
    },
    ownMessageText: {
      backgroundColor: theme.colors.primary,
      color: theme.colors.textInverse,
    },
    otherMessageText: {
      backgroundColor: theme.colors.surface,
      color: theme.colors.text,
    },
    messageTime: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      marginTop: theme.spacing.xs,
      textAlign: 'right',
    },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.xl,
      paddingVertical: theme.spacing.md,
      backgroundColor: theme.colors.surface,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    messageInput: {
      flex: 1,
      backgroundColor: theme.colors.background,
      borderRadius: theme.borderRadius.lg,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      fontSize: 16,
      color: theme.colors.text,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginRight: theme.spacing.md,
    },
    sendButton: {
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.lg,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    },
    sendButtonText: {
      color: theme.colors.textInverse,
      fontWeight: 'bold',
    },
    emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.xl,
    },
    emptyIcon: {
      fontSize: 60,
      marginBottom: theme.spacing.lg,
    },
    emptyTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: theme.colors.text,
      marginBottom: theme.spacing.sm,
      textAlign: 'center',
    },
    emptyText: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      lineHeight: 24,
    },
    startChatButton: {
      backgroundColor: theme.colors.primary,
      paddingHorizontal: theme.spacing.xl,
      paddingVertical: theme.spacing.md,
      borderRadius: theme.borderRadius.lg,
      marginTop: theme.spacing.lg,
    },
    startChatButtonText: {
      color: theme.colors.textInverse,
      fontSize: 16,
      fontWeight: 'bold',
    },
    searchButton: {
      paddingHorizontal: theme.spacing.md,
    },
    searchButtonText: {
      fontSize: 20,
      color: theme.colors.text,
    },
    modalContainer: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.xl,
      paddingVertical: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    modalCloseButton: {
      paddingHorizontal: theme.spacing.md,
    },
    modalCloseButtonText: {
      fontSize: 16,
      color: theme.colors.primary,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: theme.colors.text,
    },
    modalPlaceholder: {
      width: 60,
    },
    searchContainer: {
      paddingHorizontal: theme.spacing.xl,
      paddingVertical: theme.spacing.md,
    },
    searchInput: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      fontSize: 16,
      color: theme.colors.text,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    searchResults: {
      flex: 1,
    },
    searchResultItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.xl,
      paddingVertical: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    searchResultAvatar: {
      marginRight: theme.spacing.md,
    },
    searchResultUsername: {
      fontSize: 16,
      fontWeight: '500',
      color: theme.colors.text,
    },
    searchLoading: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    searchLoadingText: {
      fontSize: 16,
      color: theme.colors.textSecondary,
    },
    noResults: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    noResultsText: {
      fontSize: 16,
      color: theme.colors.textSecondary,
    },
    searchHint: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.xl,
    },
    searchHintText: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      textAlign: 'center',
    },
  });

  if (selectedChat) {
    const otherUser = getOtherParticipant(selectedChat);
    
    return (
      <View style={styles.container}>
        <SafeAreaView edges={['top']} style={{ backgroundColor: theme.colors.surface }}>
          <StatusBar barStyle={theme.dark ? 'light-content' : 'dark-content'} />
          {/* Chat Header */}
          <View style={styles.chatHeaderBar}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setSelectedChat(null)}
            >
              <Text style={styles.backButtonText}>←</Text>
            </TouchableOpacity>
          <View style={styles.chatUserInfo}>
            {otherUser?.avatar ? (
              <Image
                source={{ uri: otherUser.avatar }}
                style={styles.avatarImage}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>
                  {otherUser?.username?.charAt(0).toUpperCase() || '?'}
                </Text>
              </View>
            )}
            <Text style={styles.chatUserName}>{otherUser?.username || 'Unknown'}</Text>
          </View>
          </View>
        </SafeAreaView>

        {/* Messages */}
        <FlatList<Message>
          ref={messagesListRef}
          style={styles.messagesContainer}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item._id}
          inverted={false}
          onContentSizeChange={() => messagesListRef.current?.scrollToEnd({ animated: true })}
          onLayout={() => messagesListRef.current?.scrollToEnd({ animated: false })}
          keyboardShouldPersistTaps="handled"
        />

        {/* Message Input */}
        {editing && (
          <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: theme.dark ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.4)', zIndex: 10, ...(Platform.OS === 'web' ? ({ backdropFilter: 'blur(8px)' } as any) : {}) }} />
        )}
        {editing && (
          <View style={{ position: 'absolute', bottom: 120, left: 16, right: 16, zIndex: 11 }}>
            <View style={[styles.messageContainer, styles.ownMessage]}>
              <Text style={[styles.messageText, styles.ownMessageText]}>{editing.text}</Text>
              <Text style={styles.messageTime}>Editing</Text>
            </View>
          </View>
        )}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.messageInput}
            placeholder="Type a message..."
            placeholderTextColor={theme.colors.textSecondary}
            value={editing ? editing.text : newMessage}
            onChangeText={(t) => { if (editing) setEditing({ ...editing, text: t }); else setNewMessage(t); }}
            onSubmitEditing={(e) => { if (!editing) sendMessage(); }}
            multiline
          />
          {editing ? (
            <>
              <TouchableOpacity style={[styles.sendButton, { backgroundColor: theme.colors.background, borderWidth: 1, borderColor: theme.colors.border, marginRight: 8 }]} onPress={() => setEditing(null)}>
                <Text style={{ color: theme.colors.text, fontWeight: 'bold' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.sendButton} onPress={async () => {
                const peerId = selectedChat?.participants.find(p => p._id !== user?._id)?._id;
                if (!peerId || !editing) return;
                const text = editing.text.trim();
                if (!text) return;
                try {
                  const res = await chatAPI.editMessage(peerId, editing.id, text);
                  const updatedText = res?.data?.message?.text || text;
                  setMessages(prev => prev.map(m => m._id === editing.id ? { ...m, text: updatedText } : m));
                  setEditing(null);
                } catch {}
              }}>
                <Text style={styles.sendButtonText}>Save</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
              <Text style={styles.sendButtonText}>Send</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: theme.colors.surface }}>
        <StatusBar barStyle={theme.dark ? 'light-content' : 'dark-content'} />
        {/* Header */}
        <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Messages</Text>
        <TouchableOpacity
          style={styles.searchButton}
          onPress={() => setShowUserSearch(true)}
        >
          <Text style={styles.searchButtonText}>🔍</Text>
        </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Chat List */}
      {loading ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>⏳</Text>
          <Text style={styles.emptyTitle}>Loading conversations...</Text>
        </View>
      ) : chats.length > 0 ? (
        <FlatList
          style={styles.chatList}
          data={chats}
          renderItem={renderChatItem}
          keyExtractor={(item) => item._id}
        />
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>💬</Text>
          <Text style={styles.emptyTitle}>No Messages Yet</Text>
          <Text style={styles.emptyText}>
            Start a conversation with someone to see your messages here
          </Text>
          <TouchableOpacity
            style={styles.startChatButton}
            onPress={() => setShowUserSearch(true)}
          >
            <Text style={styles.startChatButtonText}>Start New Chat</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* User Search Modal */}
      <Modal
        visible={showUserSearch}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => {
                setShowUserSearch(false);
                setSearchQuery('');
                setSearchResults([]);
              }}
            >
              <Text style={styles.modalCloseButtonText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>New Message</Text>
            <View style={styles.modalPlaceholder} />
          </View>

          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search for users..."
              placeholderTextColor={theme.colors.textSecondary}
              value={searchQuery}
              onChangeText={(text) => {
                setSearchQuery(text);
                searchUsers(text);
              }}
              autoFocus
            />
          </View>

          {searchLoading ? (
            <View style={styles.searchLoading}>
              <Text style={styles.searchLoadingText}>Searching...</Text>
            </View>
          ) : searchResults.length > 0 ? (
            <FlatList
              style={styles.searchResults}
              data={searchResults}
              keyExtractor={(item) => item._id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.searchResultItem}
                  onPress={() => startConversation(item._id)}
                >
                  <View style={styles.searchResultAvatar}>
                    {item.avatar ? (
                      <Image source={{ uri: item.avatar }} style={styles.avatarImage} />
                    ) : (
                      <View style={styles.avatarPlaceholder}>
                        <Text style={styles.avatarText}>
                          {item.username.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.searchResultUsername}>{item.username}</Text>
                </TouchableOpacity>
              )}
            />
          ) : searchQuery.length > 0 ? (
            <View style={styles.noResults}>
              <Text style={styles.noResultsText}>No users found</Text>
            </View>
          ) : (
            <View style={styles.searchHint}>
              <Text style={styles.searchHintText}>
                Type a username to search for users
              </Text>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
};

export default MessengerScreen;
