import React, { useState, useEffect, useRef } from 'react';
import { Send, MessageSquare, X, Loader, UserX } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { User } from '../../types/multiplayer';

interface ChatMessage {
  id: string;
  session_id: string;
  user_id: string;
  message: string;
  timestamp: string;
  user?: User;
  character_id?: string;
  character?: any;
}

interface MultiplayerChatProps {
  sessionId: string;
  currentUser: User | null;
  currentCharacter?: any | null;
  onClose: () => void;
  inputRef?: React.MutableRefObject<HTMLInputElement | null>;
}

export function MultiplayerChat({ 
  sessionId, 
  currentUser, 
  currentCharacter,
  onClose, 
  inputRef 
}: MultiplayerChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const localInputRef = useRef<HTMLInputElement>(null);
  const mounted = useRef(true);
  
  // Combine refs
  const actualInputRef = inputRef || localInputRef;

  // Handle case where currentUser is null
  if (!currentUser) {
    return (
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-amber-600/30 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <MessageSquare className="w-5 h-5 text-amber-400" />
            <h3 className="fantasy-title text-lg text-amber-300">Party Chat</h3>
          </div>
          <button
            onClick={onClose}
            className="text-amber-400 hover:text-amber-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Not logged in message */}
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center">
            <UserX className="w-12 h-12 text-amber-400 mx-auto mb-4" />
            <h4 className="fantasy-title text-lg text-amber-300 mb-2">Authentication Required</h4>
            <p className="text-amber-200 text-sm mb-4">
              You need to be logged in to participate in the chat.
            </p>
            <button
              onClick={onClose}
              className="rune-button px-4 py-2 rounded font-medium text-black"
            >
              Close Chat
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Load chat messages
  useEffect(() => {
    mounted.current = true;
    loadMessages();
    
    // Subscribe to new messages
    const subscription = supabase
      .channel(`chat-${sessionId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `session_id=eq.${sessionId}`
      }, (payload) => {
        console.log('New chat message received:', payload);
        if (mounted.current) {
          loadMessages(); // Reload to get user data
        }
      })
      .subscribe((status) => {
        console.log('Chat subscription status:', status);
      });

    return () => {
      mounted.current = false;
      subscription.unsubscribe();
    };
  }, [sessionId]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Focus input when component mounts
  useEffect(() => {
    if (actualInputRef.current) {
      actualInputRef.current.focus();
    }
  }, [actualInputRef]);

  const loadMessages = async () => {
    try {
      if (!mounted.current) return;
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('chat_messages')
        .select(`
          *,
          user:users(*)
        `)
        .eq('session_id', sessionId)
        .order('timestamp', { ascending: true });

      if (!mounted.current) return;

      if (error) {
        console.error('Error loading chat messages:', error);
        setError('Failed to load chat messages');
        return;
      }

      console.log('Chat messages loaded:', data?.length || 0);
      
      // Filter out any malformed messages to prevent React errors
      const validMessages = (data || []).filter((msg): msg is ChatMessage => {
        return msg && 
               typeof msg.id === 'string' && 
               typeof msg.message === 'string' && 
               typeof msg.timestamp === 'string' &&
               typeof msg.session_id === 'string' &&
               typeof msg.user_id === 'string' &&
               msg.id.length > 0 &&
               msg.message.length > 0;
      });
      
      setMessages(validMessages);
    } catch (err) {
      console.error('Error in loadMessages:', err);
      if (mounted.current) {
        setError('Failed to load chat messages');
      }
    } finally {
      if (mounted.current) {
        setLoading(false);
      }
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !currentUser || loading) return;

    if (!mounted.current) return;
    setIsSending(true);
    setError(null);
    
    try {
      console.log('Sending chat message:', { 
        sessionId, 
        userId: currentUser.id, 
        characterId: currentCharacter?.id,
        content: newMessage.trim() 
      });
      
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          session_id: sessionId,
          user_id: currentUser.id,
          character_id: currentCharacter?.id || null,
          message: newMessage.trim()
        });

      if (!mounted.current) return;

      if (error) {
        console.error('Error sending message:', error);
        setError('Failed to send message');
        return;
      }

      setNewMessage('');
      console.log('Message sent successfully');
      
      // Focus the input after sending
      setTimeout(() => {
        if (mounted.current && actualInputRef.current) {
          actualInputRef.current.focus();
        }
      }, 0);
    } catch (err) {
      console.error('Error in sendMessage:', err);
      if (mounted.current) {
        setError('Failed to send message');
      }
    } finally {
      if (mounted.current) {
        setIsSending(false);
      }
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) {
        return 'Invalid time';
      }
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (err) {
      console.error('Error formatting timestamp:', timestamp, err);
      return 'Invalid time';
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-amber-600/30 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <MessageSquare className="w-5 h-5 text-amber-400" />
          <h3 className="fantasy-title text-lg text-amber-300">Party Chat</h3>
        </div>
        <button
          onClick={onClose}
          className="text-amber-400 hover:text-amber-300 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-3 bg-red-900/30 border-b border-red-600/30">
          <p className="text-red-200 text-sm">{error}</p>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
        {messages.length === 0 ? (
          <div className="text-center text-amber-400 text-sm italic py-8">
            No messages yet. Start the conversation!
          </div>
        ) : (
          messages
            .filter((msg) => msg && msg.id && msg.message && msg.timestamp) // Additional safety filter
            .map((message) => {
              const isOwnMessage = message.user_id === currentUser?.id;
              const userName = message.user?.display_name || message.user?.username || 'Unknown';
              
              return (
                <div
                  key={message.id}
                  className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-3 py-2 rounded-lg ${
                      isOwnMessage
                        ? 'bg-amber-600 text-black'
                        : 'bg-gray-700 text-amber-100'
                    }`}
                  >
                    {!isOwnMessage && (
                      <div className="text-xs text-amber-400 mb-1 font-medium">
                        {userName}
                      </div>
                    )}
                    <div className="text-sm leading-relaxed">
                      {message.message}
                    </div>
                    <div className={`text-xs mt-1 ${
                      isOwnMessage ? 'text-black/70' : 'text-amber-400/70'
                    }`}>
                      {formatTime(message.timestamp)}
                    </div>
                  </div>
                </div>
              );
            })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-amber-600/30">
        <div className="flex space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={currentCharacter ? 
              `${currentCharacter.name} says...` : 
              "Type a message..."}
            disabled={loading || isSending}
            className="flex-1 p-2 spell-input rounded text-amber-50 text-sm disabled:opacity-50"
            ref={actualInputRef}
          />
          <button
            onClick={sendMessage}
            disabled={!newMessage.trim() || loading || isSending}
            className="px-3 py-2 rune-button rounded font-medium text-black disabled:opacity-50 flex items-center"
          >
            {isSending ? (
              <Loader className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
        
        <div className="mt-2 text-xs text-amber-400">
          Press Enter to send, Shift+Enter for new line
        </div>
      </div>
    </div>
  );
}