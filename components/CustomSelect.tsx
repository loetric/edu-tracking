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
      const dropdownHeight = 160; // max-h-40 = 160px

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

    const handleScroll = (event: Event) => {
      // Only close if scrolling is outside the dropdown
      // Check if the scroll event target is within the dropdown or select container
      if (isOpen) {
        const target = event.target as Node;
        const isInsideDropdown = dropdownRef.current?.contains(target);
        const isInsideSelect = selectRef.current?.contains(target);
        
        // Only close if scrolling happened outside both dropdown and select
        if (!isInsideDropdown && !isInsideSelect) {
          setIsOpen(false);
        }
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      // Use capture phase to catch scroll events, but check if they're from outside dropdown
      document.addEventListener('scroll', handleScroll, true);
      window.addEventListener('scroll', handleScroll, true);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('scroll', handleScroll, true);
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
          w-full px-2 md:px-3 py-1 md:py-1.5 text-[10px] md:text-xs text-right border border-gray-300 rounded-md 
          bg-white focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500
          flex items-center justify-between transition-colors
          ${disabled ? 'opacity-50 cursor-not-allowed bg-gray-50' : 'cursor-pointer hover:border-teal-400 hover:bg-gray-50'}
        `}
      >
        <span className={`truncate flex-1 text-right ${selectedOption ? 'text-gray-800 font-medium' : 'text-gray-400'}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown 
          size={10} 
          className={`md:w-3 md:h-3 text-gray-400 transition-transform flex-shrink-0 mr-1 ${isOpen ? 'transform rotate-180' : ''}`}
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
              absolute z-[9999] w-full bg-white border border-gray-200 rounded-md shadow-xl
              max-h-40 md:max-h-48 overflow-y-auto overflow-x-visible
              scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100
              ${dropdownPosition === 'top' ? 'bottom-full mb-0.5' : 'top-full mt-0.5'}
            `}
            style={{
              // Ensure dropdown stays within viewport
              maxHeight: dropdownPosition === 'top' 
                ? `${Math.min(160, selectRef.current?.getBoundingClientRect().top || 160)}px`
                : `${Math.min(160, window.innerHeight - (selectRef.current?.getBoundingClientRect().bottom || 0) - 4)}px`,
              // Smooth scrolling
              scrollBehavior: 'smooth',
              // Better scrollbar for webkit browsers
              WebkitOverflowScrolling: 'touch',
              // Ensure scrolling works properly
              overscrollBehavior: 'contain'
            }}
            onWheel={(e) => {
              // Prevent closing on scroll inside dropdown
              e.stopPropagation();
              e.nativeEvent.stopImmediatePropagation();
            }}
            onTouchMove={(e) => {
              // Prevent closing on touch scroll inside dropdown
              e.stopPropagation();
              e.nativeEvent.stopImmediatePropagation();
            }}
            onScroll={(e) => {
              // Prevent scroll event from bubbling up and closing dropdown
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
                    w-full px-2 md:px-3 py-1 md:py-1.5 text-[10px] md:text-xs text-right hover:bg-gray-50 transition-colors
                    flex items-center justify-start border-b border-gray-100 last:border-b-0
                    ${value === option.value ? 'bg-teal-50 text-teal-700 font-medium' : 'text-gray-800'}
                  `}
                >
                  <span className="flex-1 text-right break-words whitespace-normal min-w-0 pr-1">{option.label}</span>
                  {value === option.value && (
                    <Check size={10} className="md:w-3 md:h-3 text-teal-600 flex-shrink-0 mr-1" />
                  )}
                </button>
              ))
            ) : (
              <div className="px-2 py-2 text-[10px] md:text-xs text-gray-400 text-center">
                لا توجد خيارات متاحة
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

