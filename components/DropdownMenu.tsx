
import React, { useEffect, useRef } from 'react';

interface DropdownMenuProps {
  triggerButton: React.ReactNode;
  children: React.ReactNode;
  isOpen: boolean;
  onClose: () => void;
  menuClasses?: string;
}

const DropdownMenu: React.FC<DropdownMenuProps> = ({
  triggerButton,
  children,
  isOpen,
  onClose,
  menuClasses = "origin-top-right right-0 mt-2 w-48" 
}) => {
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      console.log("[DropdownMenu] handleClickOutside (Bubbling Phase): Event Fired. Target:", event.target);
      console.log("[DropdownMenu] handleClickOutside (Bubbling Phase): dropdownRef.current:", dropdownRef.current);
      
      const isTargetInside = dropdownRef.current?.contains(event.target as Node);
      console.log("[DropdownMenu] handleClickOutside (Bubbling Phase): Does ref contain target?", isTargetInside);

      if (dropdownRef.current && !isTargetInside) {
        console.log("[DropdownMenu] handleClickOutside (Bubbling Phase): Target is OUTSIDE. Calling onClose.");
        onClose();
      } else {
        console.log("[DropdownMenu] handleClickOutside (Bubbling Phase): Target is INSIDE or ref is null. Not calling onClose.");
      }
    };

    if (isOpen) {
      console.log("[DropdownMenu] Adding 'click' event listener (Bubbling Phase).");
      document.addEventListener('click', handleClickOutside, false); // Changed to bubbling phase
    }
    
    return () => {
      console.log("[DropdownMenu] Removing 'click' event listener (Bubbling Phase).");
      document.removeEventListener('click', handleClickOutside, false); // Changed to bubbling phase
    };
  }, [isOpen, onClose]);

  return (
    <div ref={dropdownRef} className="relative inline-block text-left">
      {triggerButton} 
      {isOpen && (
        <div
          className={`${menuClasses} absolute z-50 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none transition ease-out duration-100 transform opacity-100 scale-100`}
          role="menu"
          aria-orientation="vertical"
          aria-labelledby="user-menu-button" 
        >
          {children}
        </div>
      )}
    </div>
  );
};

export default DropdownMenu;