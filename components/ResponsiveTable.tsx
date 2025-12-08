// Responsive Table Component - Converts table to cards on mobile
import React from 'react';

interface ResponsiveTableProps {
  headers: Array<{ key: string; label: string; className?: string }>;
  data: Array<Record<string, any>>;
  renderRow: (item: any, isMobile?: boolean) => React.ReactNode;
  emptyMessage?: string;
  className?: string;
}

export const ResponsiveTable: React.FC<ResponsiveTableProps> = ({
  headers,
  data,
  renderRow,
  emptyMessage = 'لا توجد بيانات',
  className = ''
}) => {
  return (
    <>
      {/* Desktop Table */}
      <div className={`hidden md:block overflow-x-auto rounded-lg border border-gray-200 ${className}`}>
        <table className="w-full text-right text-sm">
          <thead className="bg-gray-50 text-gray-500 font-bold">
            <tr>
              {headers.map(header => (
                <th key={header.key} className={`p-4 ${header.className || ''}`}>
                  {header.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.length === 0 ? (
              <tr>
                <td colSpan={headers.length} className="p-8 text-center text-gray-400">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((item, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  {renderRow(item, false)}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className={`md:hidden space-y-4 ${className}`}>
        {data.length === 0 ? (
          <div className="p-8 text-center text-gray-400 bg-white rounded-lg border border-gray-200">
            {emptyMessage}
          </div>
        ) : (
          data.map((item, index) => (
            <div key={index} className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
              {renderRow(item, true)}
            </div>
          ))
        )}
      </div>
    </>
  );
};


