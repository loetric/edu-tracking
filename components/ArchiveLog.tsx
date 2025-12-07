import React from 'react';
import { LogEntry } from '../types';
import { Clock, Activity } from 'lucide-react';

interface ArchiveLogProps {
  logs: LogEntry[];
}

export const ArchiveLog: React.FC<ArchiveLogProps> = ({ logs }) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
          <Activity size={24} />
        </div>
        <h2 className="text-xl font-bold text-gray-800">أرشيف العمليات والحركات</h2>
      </div>

      <div className="relative border-r border-gray-200 mr-3">
        {logs.map((log) => (
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
        ))}
        {logs.length === 0 && (
            <p className="text-center text-gray-400 py-10">لا يوجد سجلات حتى الآن</p>
        )}
      </div>
    </div>
  );
};
