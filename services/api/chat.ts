// Chat messages API functions
import { ChatMessage } from '../../types';
import { supabase } from '../supabase';

/**
 * Get all chat messages
 */
export const getMessages = async (): Promise<ChatMessage[]> => {
  try {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .order('timestamp', { ascending: true });

    if (error) throw error;
    return (data || []).map(m => ({
      ...m,
      timestamp: new Date(m.timestamp)
    })) as ChatMessage[];
  } catch (error) {
    console.error('Get messages error:', error);
    return [];
  }
};

/**
 * Send a chat message
 */
export const sendMessage = async (message: ChatMessage): Promise<ChatMessage | null> => {
  try {
    // Let database generate UUID - don't pass id if empty
    const insertData: any = {
      sender: message.sender,
      text: message.text,
      timestamp: message.timestamp?.toISOString() || new Date().toISOString(),
      isSystem: message.isSystem || false
    };

    // Only include id if it's a valid UUID (not empty string)
    if (message.id && message.id.trim() !== '') {
      insertData.id = message.id;
    }

    // Insert and return the created message with UUID
    const { data, error } = await supabase
      .from('chat_messages')
      .insert([insertData])
      .select()
      .single();

    if (error) throw error;

    // Return the created message with proper timestamp
    if (data) {
      return {
        ...data,
        timestamp: new Date(data.timestamp)
      } as ChatMessage;
    }

    return null;
  } catch (error) {
    console.error('Send message error:', error);
    throw error;
  }
};

