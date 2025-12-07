
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
        className="fixed bottom-4 left-4 md:bottom-6 md:left-6 bg-teal-600 text-white p-3 md:p-4 rounded-full shadow-lg hover:bg-teal-700 transition-transform hover:scale-105 z-50 flex items-center gap-2"
      >
        <MessageSquare size={20} className="md:w-6 md:h-6" />
        {unread && (
            <span className="absolute top-0 right-0 w-3 h-3 md:w-4 md:h-4 bg-red-500 rounded-full border-2 border-white"></span>
        )}
        <span className="font-bold hidden md:inline text-sm">التواصل الداخلي</span>
      </button>

      {isOpen && (
        <div className="fixed bottom-20 left-4 right-4 md:bottom-24 md:left-6 md:right-auto md:w-96 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 flex flex-col overflow-hidden max-h-[70vh] md:max-h-[500px]">
          <div className="bg-teal-600 p-3 md:p-4 text-white flex justify-between items-center flex-shrink-0">
            <h3 className="font-bold flex items-center gap-2 text-sm md:text-base">
                <Bell size={14} className="md:w-4 md:h-4" />
                <span className="hidden sm:inline">غرفة تواصل المعلمين والإدارة</span>
                <span className="sm:hidden">التواصل الداخلي</span>
            </h3>
            <button 
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-teal-700 rounded transition-colors"
            >
              <X size={16} className="md:w-[18px] md:h-[18px]" />
            </button>
          </div>
          
          <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-3 md:p-4 space-y-3 md:space-y-4 bg-gray-50 min-h-[200px] md:h-64">
            {messages.length === 0 && (
              <p className="text-center text-gray-400 text-sm py-8">لا توجد رسائل</p>
            )}
            {messages.length > 0 && messages.map((msg, index) => {
              const isMe = (msg.sender || '').trim() === (currentUserName || '').trim();
              const msgTimestamp = msg.timestamp instanceof Date 
                ? msg.timestamp 
                : new Date(msg.timestamp);
              return (
              <div key={`msg-${msg.id}-${index}`} className={`flex flex-col ${isMe ? 'items-start' : 'items-end'}`}>
                <div className={`p-2.5 md:p-3 rounded-lg max-w-[85%] text-xs md:text-sm ${isMe ? 'bg-white border border-teal-100 text-gray-800' : 'bg-teal-100 text-teal-900'}`}>
                  <p className="font-bold text-[10px] md:text-xs text-teal-600 mb-1">{msg.sender || 'مستخدم'}</p>
                  <p className="break-words whitespace-pre-wrap">{msg.text || ''}</p>
                </div>
                <span className="text-[9px] md:text-[10px] text-gray-400 mt-1">
                  {msgTimestamp.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            )})}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-2.5 md:p-3 bg-white border-t border-gray-100 flex gap-2 flex-shrink-0">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="اكتب رسالة..."
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-xs md:text-sm focus:outline-none focus:border-teal-500"
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            />
            <button 
              onClick={handleSend}
              className="bg-teal-600 text-white p-2 rounded-lg hover:bg-teal-700 transition-colors flex-shrink-0"
            >
              <Send size={16} className="md:w-[18px] md:h-[18px] rtl:rotate-180" />
            </button>
          </div>
        </div>
      )}
    </>
  );
};
