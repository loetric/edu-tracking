import React, { useState } from 'react';
import { LogEntry } from '../types';
import { Clock, Activity, Search, Filter, X } from 'lucide-react';
import { CustomSelect } from './CustomSelect';

interface ArchiveLogProps {
  logs: LogEntry[];
}

export const ArchiveLog: React.FC<ArchiveLogProps> = ({ logs }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterUser, setFilterUser] = useState<string>('');
  const [filterAction, setFilterAction] = useState<string>('');

  // Get unique users and actions for filters
  const uniqueUsers = Array.from(new Set(logs.map(log => log.user))).sort();
  const uniqueActions = Array.from(new Set(logs.map(log => log.action))).sort();

  // Filter logs
  const filteredLogs = logs.filter(log => {
    const matchesSearch = !searchTerm || 
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.user.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesUser = !filterUser || log.user === filterUser;
    const matchesAction = !filterAction || log.action === filterAction;
    
    return matchesSearch && matchesUser && matchesAction;
  });

  const clearFilters = () => {
    setSearchTerm('');
    setFilterUser('');
    setFilterAction('');
  };

  const hasActiveFilters = searchTerm || filterUser || filterAction;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
          <Activity size={24} />
        </div>
        <h2 className="text-xl font-bold text-gray-800">أرشيف العمليات والحركات</h2>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 md:p-6 rounded-xl mb-6 border border-gray-100 shadow-sm">
        <div className="flex flex-col gap-3 md:gap-4">
          <div className="flex items-center gap-2">
            <Filter size={16} className="md:w-5 md:h-5 text-teal-600 flex-shrink-0" />
            <span className="font-bold text-gray-700 text-sm md:text-base">الفلاتر</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            {/* Search */}
            <div className="md:col-span-1 lg:col-span-2">
              <label className="block text-xs md:text-sm font-bold text-gray-700 mb-1.5">البحث</label>
              <div className="relative">
                <Search size={16} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="بحث في السجلات..."
                  className="w-full pr-10 pl-4 py-2 md:py-2.5 text-xs md:text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>
            </div>

            {/* User Filter */}
            <div>
              <label className="block text-xs md:text-sm font-bold text-gray-700 mb-1.5">المستخدم</label>
              <CustomSelect
                value={filterUser}
                onChange={(value) => setFilterUser(value)}
                options={[
                  { value: '', label: 'جميع المستخدمين' },
                  ...uniqueUsers.map(user => ({ value: user, label: user }))
                ]}
                placeholder="جميع المستخدمين"
                className="w-full text-xs md:text-sm"
              />
            </div>

            {/* Action Filter */}
            <div>
              <label className="block text-xs md:text-sm font-bold text-gray-700 mb-1.5">الإجراء</label>
              <CustomSelect
                value={filterAction}
                onChange={(value) => setFilterAction(value)}
                options={[
                  { value: '', label: 'جميع العمليات' },
                  ...uniqueActions.map(action => ({ value: action, label: action }))
                ]}
                placeholder="جميع العمليات"
                className="w-full text-xs md:text-sm"
              />
            </div>
          </div>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <div className="md:col-span-3 flex justify-end">
              <button
                onClick={clearFilters}
                className="flex items-center gap-1.5 px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
              >
                <X size={14} className="md:w-4 md:h-4 flex-shrink-0" />
                <span>مسح الفلاتر</span>
              </button>
            </div>
          )}
        </div>
        
        {hasActiveFilters && (
          <div className="mt-3 text-xs md:text-sm text-gray-600">
            النتائج المفلترة: <span className="font-bold text-teal-600">{filteredLogs.length}</span> من <span className="font-bold">{logs.length}</span>
          </div>
        )}
      </div>

      <div className="relative border-r border-gray-200 mr-3">
        {filteredLogs.length > 0 ? (
          filteredLogs.map((log) => (
            <div key={log.id} className="mb-8 mr-6 relative group">
              <div className="absolute -right-9 top-1 w-6 h-6 bg-white border-2 border-teal-500 rounded-full z-10"></div>
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-bold text-gray-800">{log.action}</span>
                  <div className="flex items-center text-xs text-gray-400 gap-1">
                    <Clock size={12} />
                    <span>{log.timestamp.toLocaleTimeString('ar-SA')} - {log.timestamp.toLocaleDateString('ar-SA')}</span>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-2">{log.details}</p>
                <div className="text-xs font-semibold text-teal-600 bg-teal-50 inline-block px-2 py-1 rounded">
                  بواسطة: {log.user}
                </div>
              </div>
            </div>
          ))
        ) : (
          <p className="text-center text-gray-400 py-10">
            {hasActiveFilters ? 'لا توجد نتائج تطابق الفلاتر' : 'لا يوجد سجلات حتى الآن'}
          </p>
        )}
      </div>
    </div>
  );
};
