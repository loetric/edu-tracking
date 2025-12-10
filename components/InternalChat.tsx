
import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage, Role } from '../types';
import { CONFIG } from '../config';
import { MessageSquare, Send, X, Bell, Trash2 } from 'lucide-react';

interface InternalChatProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  currentUserName: string;
  role?: Role;
  onClearChat?: () => void;
}

export const InternalChat: React.FC<InternalChatProps> = ({ messages, onSendMessage, currentUserName, role, onClearChat }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const [unread, setUnread] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
      if (!isOpen && messages.length > 0) {
          // Logic for unread would typically check against last viewed ID
          setUnread(true);
      } else if (isOpen) {
          setUnread(false);
      }
  }, [messages, isOpen]);

  // Auto-scroll to bottom when new messages arrive or window opens
  useEffect(() => {
      if (isOpen && messagesEndRef.current) {
          setTimeout(() => {
              messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
          }, CONFIG.TIMEOUTS.AUTO_SCROLL_DELAY);
      }
  }, [messages, isOpen]);

  const handleSend = () => {
    const text = inputText.trim();
    if (text) {
      setInputText(''); // Clear input immediately
      onSendMessage(text);
    }
  };

  return (
    <>
      <button
        onClick={() => { setIsOpen(!isOpen); setUnread(false); }}
        className="group fixed bottom-4 left-4 md:bottom-6 md:left-6 bg-teal-600 text-white p-3 md:p-4 rounded-full shadow-lg hover:bg-teal-700 active:bg-teal-800 transition-all hover:scale-105 active:scale-95 z-50 flex items-center gap-2 overflow-hidden"
        aria-label="فتح التواصل الداخلي"
      >
        <MessageSquare size={18} className="md:w-6 md:h-6 flex-shrink-0" />
        {unread && (
            <span className="absolute top-0 right-0 w-2.5 h-2.5 md:w-4 md:h-4 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>
        )}
        <span className="font-bold text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 max-w-0 group-hover:max-w-[200px] transition-all duration-300 overflow-hidden">التواصل الداخلي</span>
      </button>

      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {isOpen && (
        <div 
          className="fixed left-3 right-3 md:bottom-20 md:left-6 md:right-auto md:w-72 md:inset-x-auto md:top-auto bg-white rounded-lg shadow-2xl border border-gray-200 z-50 flex flex-col overflow-hidden md:max-h-[320px]"
          style={{
            bottom: CONFIG.CHAT.MOBILE_BOTTOM,
            maxHeight: CONFIG.CHAT.MOBILE_MAX_HEIGHT,
            height: 'auto',
            maxWidth: CONFIG.CHAT.MOBILE_WIDTH
          }}
        >
          {/* Header */}
          <div className="bg-teal-600 p-2 md:p-3 text-white flex justify-between items-center flex-shrink-0">
            <h3 className="font-bold flex items-center gap-1 md:gap-1.5 text-xs md:text-sm">
                <Bell size={11} className="md:w-3.5 md:h-3.5 flex-shrink-0" />
                <span className="hidden sm:inline truncate">غرفة تواصل المعلمين والإدارة</span>
                <span className="sm:hidden truncate">التواصل الداخلي</span>
            </h3>
            <div className="flex items-center gap-1">
              {role === 'admin' && onClearChat && messages.length > 0 && (
                <button 
                  onClick={onClearChat}
                  className="p-1 md:p-1.5 hover:bg-teal-700 rounded transition-colors flex-shrink-0 active:scale-95"
                  aria-label="مسح جميع الرسائل"
                  title="مسح جميع الرسائل"
                >
                  <Trash2 size={12} className="md:w-4 md:h-4" />
                </button>
              )}
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1 md:p-1 hover:bg-teal-700 rounded transition-colors flex-shrink-0 active:scale-95"
                aria-label="إغلاق"
              >
                <X size={12} className="md:w-4 md:h-4" />
              </button>
            </div>
          </div>
          
          {/* Messages Container */}
          <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-2 md:p-3 space-y-2 md:space-y-3 bg-gray-50 min-h-0" style={{ maxHeight: 'calc(100% - 80px)' }}>
            {messages.length === 0 && (
              <div className="flex items-center justify-center h-full min-h-[100px]">
                <p className="text-center text-gray-400 text-xs md:text-sm py-4">لا توجد رسائل</p>
              </div>
            )}
            {messages.length > 0 && messages.map((msg, index) => {
              const isMe = (msg.sender || '').trim() === (currentUserName || '').trim();
              const msgTimestamp = msg.timestamp instanceof Date 
                ? msg.timestamp 
                : new Date(msg.timestamp);
              return (
              <div key={`msg-${msg.id}-${index}`} className={`flex flex-col ${isMe ? 'items-start' : 'items-end'}`}>
                <div 
                  className={`p-1.5 md:p-2 rounded-lg max-w-[75%] md:max-w-[80%] text-xs md:text-sm ${isMe ? 'bg-white border border-teal-100 text-gray-800 shadow-sm' : 'bg-teal-100 text-teal-900 shadow-sm'}`}
                >
                  <p className="font-bold text-[9px] md:text-[10px] text-teal-600 mb-0.5 truncate">{msg.sender || 'مستخدم'}</p>
                  <p className="break-words whitespace-pre-wrap leading-relaxed text-[10px] md:text-xs">{msg.text || ''}</p>
                </div>
                <span className="text-[7px] md:text-[9px] text-gray-400 mt-0.5 px-1">
                  {msgTimestamp.toLocaleTimeString(CONFIG.LOCALE.DEFAULT, CONFIG.LOCALE.TIME_FORMAT)}
                </span>
              </div>
            )})}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-2 md:p-2.5 bg-white border-t border-gray-200 flex gap-1.5 md:gap-2 flex-shrink-0" style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}>
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="اكتب رسالة..."
              className="flex-1 border border-gray-300 rounded px-2 md:px-2.5 py-1.5 md:py-2 text-xs focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20"
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            />
            <button 
              onClick={handleSend}
              disabled={!inputText.trim()}
              className="bg-teal-600 text-white p-1.5 md:p-2 rounded hover:bg-teal-700 active:bg-teal-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex-shrink-0 active:scale-95 min-w-[36px] min-h-[36px] md:min-w-[40px] md:min-h-[40px] flex items-center justify-center"
              aria-label="إرسال"
            >
              <Send size={12} className="md:w-4 md:h-4 rtl:rotate-180" />
            </button>
          </div>
        </div>
      )}
    </>
  );
};
