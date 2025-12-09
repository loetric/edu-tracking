import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = 'اختر...',
  disabled = false,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<'bottom' | 'top'>('bottom');
  const selectRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Calculate dropdown position based on available space
  useEffect(() => {
    if (isOpen && selectRef.current) {
      const rect = selectRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const dropdownHeight = 240; // max-h-60 = 240px

      // If not enough space below but enough above, show above
      if (spaceBelow < dropdownHeight && spaceAbove > spaceBelow) {
        setDropdownPosition('top');
      } else {
        setDropdownPosition('bottom');
      }
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleScroll = () => {
      if (isOpen) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('scroll', handleScroll, true);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [isOpen]);

  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div ref={selectRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          w-full px-2 md:px-4 py-1.5 md:py-2 text-xs md:text-sm text-right border border-gray-300 rounded-lg 
          bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500
          flex items-center justify-between
          ${disabled ? 'opacity-50 cursor-not-allowed bg-gray-50' : 'cursor-pointer hover:border-gray-400'}
        `}
      >
        <span className={`truncate flex-1 text-right ${selectedOption ? 'text-gray-800' : 'text-gray-400'}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown 
          size={12} 
          className={`md:w-4 md:h-4 text-gray-400 transition-transform flex-shrink-0 mr-2 ${isOpen ? 'transform rotate-180' : ''}`}
        />
      </button>

      {isOpen && !disabled && (
        <>
          <div 
            className="fixed inset-0 z-[9998]" 
            onClick={() => setIsOpen(false)}
          />
          <div 
            ref={dropdownRef}
            className={`
              absolute z-[9999] w-full bg-white border border-gray-200 rounded-lg shadow-xl
              max-h-48 md:max-h-60 overflow-y-auto overflow-x-hidden
              scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100
              ${dropdownPosition === 'top' ? 'bottom-full mb-1' : 'top-full mt-1'}
            `}
            style={{
              // Ensure dropdown stays within viewport
              maxHeight: dropdownPosition === 'top' 
                ? `${Math.min(240, selectRef.current?.getBoundingClientRect().top || 240)}px`
                : `${Math.min(240, window.innerHeight - (selectRef.current?.getBoundingClientRect().bottom || 0) - 8)}px`,
              // Smooth scrolling
              scrollBehavior: 'smooth',
              // Better scrollbar for webkit browsers
              WebkitOverflowScrolling: 'touch'
            }}
            onWheel={(e) => {
              // Prevent closing on scroll
              e.stopPropagation();
            }}
            onTouchMove={(e) => {
              // Prevent closing on touch scroll
              e.stopPropagation();
            }}
          >
            {options.length > 0 ? (
              options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={`
                    w-full px-2 md:px-4 py-1.5 md:py-2 text-xs md:text-sm text-right hover:bg-gray-50 transition-colors
                    flex items-center justify-between border-b border-gray-100 last:border-b-0
                    ${value === option.value ? 'bg-teal-50 text-teal-700 font-bold' : 'text-gray-800'}
                  `}
                >
                  <span className="truncate flex-1 text-right">{option.label}</span>
                  {value === option.value && (
                    <Check size={12} className="md:w-4 md:h-4 text-teal-600 flex-shrink-0 mr-2" />
                  )}
                </button>
              ))
            ) : (
              <div className="px-4 py-3 text-sm text-gray-400 text-center">
                لا توجد خيارات متاحة
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

