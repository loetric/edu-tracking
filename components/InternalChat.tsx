
import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage, Role } from '../types';
import { MessageSquare, Send, X, Bell } from 'lucide-react';

interface InternalChatProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  role: Role;
  currentUserName: string;
}

export const InternalChat: React.FC<InternalChatProps> = ({ messages, onSendMessage, role, currentUserName }) => {
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
          }, 100);
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
        className="fixed bottom-4 left-4 md:bottom-6 md:left-6 bg-teal-600 text-white p-3 md:p-4 rounded-full shadow-lg hover:bg-teal-700 active:bg-teal-800 transition-all hover:scale-105 active:scale-95 z-50 flex items-center gap-2"
        aria-label="فتح التواصل الداخلي"
      >
        <MessageSquare size={18} className="md:w-6 md:h-6 flex-shrink-0" />
        {unread && (
            <span className="absolute top-0 right-0 w-2.5 h-2.5 md:w-4 md:h-4 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>
        )}
        <span className="font-bold hidden md:inline text-sm">التواصل الداخلي</span>
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
          className="fixed left-2 right-2 md:bottom-24 md:left-6 md:right-auto md:w-80 md:inset-x-auto md:top-auto bg-white rounded-xl shadow-2xl border border-gray-200 z-50 flex flex-col overflow-hidden md:max-h-[400px]"
          style={{
            bottom: 'max(0.5rem, env(safe-area-inset-bottom))',
            maxHeight: 'calc(100dvh - max(1rem, env(safe-area-inset-bottom) * 2))',
            height: 'auto',
            maxWidth: 'calc(100vw - 1rem)'
          }}
        >
          {/* Header */}
          <div className="bg-teal-600 p-2.5 md:p-4 text-white flex justify-between items-center flex-shrink-0">
            <h3 className="font-bold flex items-center gap-1.5 md:gap-2 text-xs md:text-base">
                <Bell size={12} className="md:w-4 md:h-4 flex-shrink-0" />
                <span className="hidden sm:inline truncate">غرفة تواصل المعلمين والإدارة</span>
                <span className="sm:hidden truncate">التواصل الداخلي</span>
            </h3>
            <button 
              onClick={() => setIsOpen(false)}
              className="p-1.5 md:p-1 hover:bg-teal-700 rounded-lg md:rounded transition-colors flex-shrink-0 active:scale-95"
              aria-label="إغلاق"
            >
              <X size={14} className="md:w-[18px] md:h-[18px]" />
            </button>
          </div>
          
          {/* Messages Container */}
          <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-2.5 md:p-4 space-y-2.5 md:space-y-4 bg-gray-50 min-h-0" style={{ maxHeight: 'calc(100% - 90px)' }}>
            {messages.length === 0 && (
              <div className="flex items-center justify-center h-full min-h-[150px]">
                <p className="text-center text-gray-400 text-xs md:text-sm py-8">لا توجد رسائل</p>
              </div>
            )}
            {messages.length > 0 && messages.map((msg, index) => {
              const isMe = (msg.sender || '').trim() === (currentUserName || '').trim();
              const msgTimestamp = msg.timestamp instanceof Date 
                ? msg.timestamp 
                : new Date(msg.timestamp);
              return (
              <div key={`msg-${msg.id}-${index}`} className={`flex flex-col ${isMe ? 'items-start' : 'items-end'}`}>
                <div className={`p-2 md:p-2.5 rounded-lg max-w-[80%] md:max-w-[85%] text-xs md:text-sm ${isMe ? 'bg-white border border-teal-100 text-gray-800 shadow-sm' : 'bg-teal-100 text-teal-900 shadow-sm'}`}>
                  <p className="font-bold text-[9px] md:text-xs text-teal-600 mb-0.5 md:mb-1 truncate">{msg.sender || 'مستخدم'}</p>
                  <p className="break-words whitespace-pre-wrap leading-relaxed text-[11px] md:text-sm">{msg.text || ''}</p>
                </div>
                <span className="text-[8px] md:text-[10px] text-gray-400 mt-0.5 md:mt-1 px-1">
                  {msgTimestamp.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            )})}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-2.5 md:p-3 bg-white border-t border-gray-200 flex gap-2 md:gap-2 flex-shrink-0" style={{ paddingBottom: 'max(0.625rem, env(safe-area-inset-bottom))' }}>
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="اكتب رسالة..."
              className="flex-1 border border-gray-300 rounded-lg px-2.5 md:px-3 py-2 md:py-2.5 text-xs md:text-sm focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            />
            <button 
              onClick={handleSend}
              disabled={!inputText.trim()}
              className="bg-teal-600 text-white p-2 md:p-2.5 rounded-lg hover:bg-teal-700 active:bg-teal-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex-shrink-0 active:scale-95 min-w-[40px] min-h-[40px] md:min-w-[44px] md:min-h-[44px] flex items-center justify-center"
              aria-label="إرسال"
            >
              <Send size={14} className="md:w-[18px] md:h-[18px] rtl:rotate-180" />
            </button>
          </div>
        </div>
      )}
    </>
  );
};
