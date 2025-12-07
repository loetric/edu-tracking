
import React from 'react';
import { LayoutDashboard, Users, FileText, Upload, History, Settings, LogOut, Calendar, School, X } from 'lucide-react';
import { Role, SchoolSettings } from '../types';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  role: Role;
  onLogout: () => void;
  settings: SchoolSettings;
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, role, onLogout, settings, isOpen, onClose }) => {
  // Define all possible items
  const allItems = [
    { id: 'dashboard', label: 'الرئيسية', icon: LayoutDashboard, roles: ['admin', 'teacher', 'counselor'] },
    { id: 'schedule', label: 'جدولي الدراسي', icon: Calendar, roles: ['teacher'] },
    { id: 'tracking', label: 'متابعة الطلاب', icon: Users, roles: ['admin', 'teacher'] },
    { id: 'reports', label: 'التقارير', icon: FileText, roles: ['admin', 'counselor'] },
    { id: 'import', label: 'استيراد بيانات', icon: Upload, roles: ['admin'] },
    { id: 'archive', label: 'سجل الحركات', icon: History, roles: ['admin'] },
  ];

  const allowedItems = allItems.filter(item => item.roles.includes(role || ''));

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <div className={`
        fixed top-0 right-0 h-full w-64 bg-white shadow-2xl md:shadow-lg border-l border-gray-100 z-40 
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : 'translate-x-full'} 
        md:translate-x-0
        flex flex-col print:hidden
      `}>
        
        {/* Mobile Close Button */}
        <button 
          onClick={onClose}
          className="md:hidden absolute top-4 left-4 p-2 text-gray-400 hover:text-red-500 transition-colors"
        >
          <X size={24} />
        </button>

        <div className="p-6 flex items-center justify-center border-b border-gray-100 mt-8 md:mt-0">
          <div className="flex flex-col items-center gap-2">
            <div className="w-20 h-20 rounded-full flex items-center justify-center bg-gray-50 overflow-hidden border-2 border-teal-100 p-2 shadow-sm">
              {settings.logoUrl ? (
                  <img src={settings.logoUrl} alt="Logo" className="w-full h-full object-contain" />
              ) : (
                  <School className="text-teal-500 w-10 h-10" />
              )}
            </div>
            <h1 className="font-bold text-lg text-gray-800 text-center px-2">{settings.name}</h1>
            <span className="text-xs text-gray-500 font-medium bg-gray-100 px-2 py-1 rounded-full border border-gray-200">
              {role === 'admin' ? 'مدير النظام' : role === 'teacher' ? 'حساب المعلم' : 'الموجه الطلابي'}
            </span>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 scrollbar-thin scrollbar-thumb-gray-200">
          <ul className="space-y-1 px-3">
            {allowedItems.map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => {
                    setActiveTab(item.id);
                    onClose(); // Close sidebar on mobile when item selected
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group ${
                    activeTab === item.id
                      ? 'bg-teal-50 text-teal-700 font-bold border-r-4 border-teal-500 shadow-sm'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <item.icon size={20} className={`transition-colors ${activeTab === item.id ? 'text-teal-600' : 'text-gray-400 group-hover:text-gray-600'}`} />
                  <span>{item.label}</span>
                </button>
              </li>
            ))}
          </ul>

          {role === 'admin' && (
            <div className="mt-4 px-3 border-t border-gray-100 pt-4">
                <h3 className="text-xs font-semibold text-gray-400 px-4 mb-2 uppercase tracking-wider">الإعدادات</h3>
                 <button 
                  onClick={() => {
                    setActiveTab('settings');
                    onClose();
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors duration-200 ${
                      activeTab === 'settings' ? 'bg-teal-50 text-teal-700 font-bold' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                 >
                    <Settings size={20} />
                    <span>الإعدادات العامة</span>
                  </button>
            </div>
          )}
        </nav>

        <div className="p-4 border-t border-gray-100 bg-gray-50/50">
          <button 
              onClick={onLogout}
              className="w-full flex items-center justify-center gap-2 bg-white border border-red-100 text-red-600 py-2.5 rounded-lg hover:bg-red-50 hover:border-red-200 transition-all font-medium shadow-sm active:scale-95">
            <LogOut size={18} />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </div>
    </>
  );
};
