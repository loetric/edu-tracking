import React, { useState } from 'react';
import { LogEntry } from '../types';
import { Clock, Activity, Search, Filter, X } from 'lucide-react';

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
      <div className="bg-gray-50 p-4 rounded-xl mb-6 border border-gray-200">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-gray-500" />
            <span className="font-bold text-gray-700">الفلاتر:</span>
          </div>
          
          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search size={18} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="بحث في السجلات..."
                className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>

          {/* User Filter */}
          <select
            value={filterUser}
            onChange={(e) => setFilterUser(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500 bg-white"
          >
            <option value="">جميع المستخدمين</option>
            {uniqueUsers.map(user => (
              <option key={user} value={user}>{user}</option>
            ))}
          </select>

          {/* Action Filter */}
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500 bg-white"
          >
            <option value="">جميع العمليات</option>
            {uniqueActions.map(action => (
              <option key={action} value={action}>{action}</option>
            ))}
          </select>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={16} />
              <span className="text-sm">مسح الفلاتر</span>
            </button>
          )}
        </div>
        {hasActiveFilters && (
          <div className="mt-3 text-sm text-gray-600">
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
