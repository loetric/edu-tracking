
import React, { useState, useEffect } from 'react';
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

  useEffect(() => {
      if (!isOpen && messages.length > 0) {
          // Logic for unread would typically check against last viewed ID
          setUnread(true);
      }
  }, [messages, isOpen]);

  const handleSend = () => {
    if (inputText.trim()) {
      onSendMessage(inputText);
      setInputText('');
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
        <div className="fixed bottom-20 left-4 right-4 md:bottom-24 md:left-6 md:w-96 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 flex flex-col overflow-hidden max-h-[500px]">
          <div className="bg-teal-600 p-4 text-white flex justify-between items-center">
            <h3 className="font-bold flex items-center gap-2">
                <Bell size={16} />
                غرفة تواصل المعلمين والإدارة
            </h3>
            <button onClick={() => setIsOpen(false)}><X size={18} /></button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 h-64">
            {messages.length === 0 && <p className="text-center text-gray-400 text-sm">لا توجد رسائل</p>}
            {messages.map((msg) => {
              const isMe = msg.sender === currentUserName;
              return (
              <div key={msg.id} className={`flex flex-col ${isMe ? 'items-start' : 'items-end'}`}>
                <div className={`p-3 rounded-lg max-w-[85%] text-sm ${isMe ? 'bg-white border border-teal-100 text-gray-800' : 'bg-teal-100 text-teal-900'}`}>
                  <p className="font-bold text-xs text-teal-600 mb-1">{msg.sender}</p>
                  {msg.text}
                </div>
                <span className="text-[10px] text-gray-400 mt-1">{msg.timestamp.toLocaleTimeString('ar-SA')}</span>
              </div>
            )})}
          </div>

          <div className="p-3 bg-white border-t border-gray-100 flex gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="اكتب رسالة..."
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-500"
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            />
            <button 
              onClick={handleSend}
              className="bg-teal-600 text-white p-2 rounded-lg hover:bg-teal-700"
            >
              <Send size={18} className="rtl:rotate-180" />
            </button>
          </div>
        </div>
      )}
    </>
  );
};
