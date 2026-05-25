import React, { useState, useRef, useEffect } from 'react';
import { LogOut, Settings, Shield } from 'lucide-react';
import { useAuth } from '../useAuth';
import { cn } from '../../../shared/lib/cn';

interface UserMenuProps {
  onEditProfile: () => void;
}

export const UserMenu: React.FC<UserMenuProps> = ({ onEditProfile }) => {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  if (!user) return null;

  const toggleDropdown = () => setIsOpen((prev) => !prev);

  const getInitials = (name: string) => {
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="relative select-none" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={toggleDropdown}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-full border bg-dark-panel hover:bg-dark-hover transition-all duration-200 active:scale-[0.98] outline-none",
          isOpen ? "border-blue-500/50 shadow-md shadow-blue-500/5" : "border-dark-border"
        )}
      >
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt={user.username}
            className="w-5 h-5 rounded-full object-cover border border-dark-border"
            onError={(e) => {
              // fallback if avatarUrl fails to load
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
        ) : (
          <div className="w-5 h-5 rounded-full bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center text-[10px] font-bold">
            {getInitials(user.username)}
          </div>
        )}
        <span className="text-sm font-semibold text-gray-300 hover:text-gray-100 max-w-[120px] truncate">
          {user.username}
        </span>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-dark-panel border border-dark-border rounded-lg shadow-xl py-1.5 z-50 animate-fade-in divide-y divide-dark-border/50">
          {/* User Profile Header */}
          <div className="px-4 py-2.5 flex flex-col gap-0.5">
            <span className="text-xs font-sans text-gray-500">Signed in as</span>
            <span className="text-sm font-bold text-gray-200 truncate">{user.username}</span>
            <span className="text-[11px] text-gray-400 truncate">{user.email}</span>
            
            {user.role === 'ADMIN' && (
              <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded w-max">
                <Shield className="w-2.5 h-2.5" />
                ADMIN
              </span>
            )}
          </div>

          {/* Menu Items */}
          <div className="py-1">
            <button
              onClick={() => {
                setIsOpen(false);
                onEditProfile();
              }}
              className="flex items-center gap-2.5 w-full px-4 py-2 text-sm text-gray-400 hover:text-gray-200 hover:bg-dark-hover transition-colors text-left"
            >
              <Settings className="w-4 h-4 text-gray-500" />
              <span>Edit Profile</span>
            </button>
          </div>

          {/* Logout Action */}
          <div className="py-1">
            <button
              onClick={() => {
                setIsOpen(false);
                logout();
              }}
              className="flex items-center gap-2.5 w-full px-4 py-2 text-sm text-rose-400 hover:text-rose-300 hover:bg-rose-500/5 transition-colors text-left font-medium"
            >
              <LogOut className="w-4 h-4 text-rose-400/80" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
