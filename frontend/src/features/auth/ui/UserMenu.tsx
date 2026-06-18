import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { LogOut, Settings, Shield, User, BookOpen, Palette } from 'lucide-react';
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
      {/* Trigger Button - Circle avatar only */}
      <button
        onClick={toggleDropdown}
        className={cn(
          "flex items-center justify-center w-8 h-8 rounded-full border bg-dark-panel hover:bg-dark-hover transition-all duration-200 active:scale-[0.98] outline-none overflow-hidden shrink-0 cursor-pointer",
          isOpen ? "border-[#4F7DFF] shadow-sm shadow-[#4F7DFF]/20" : "border-white/[0.08]"
        )}
      >
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt={user.username}
            className="w-full h-full rounded-full object-cover"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
        ) : (
          <div className="w-full h-full rounded-full bg-[#4F7DFF]/10 text-[#4F7DFF] flex items-center justify-center text-[11px] font-bold">
            {getInitials(user.username)}
          </div>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-60 bg-[#05070A]/95 backdrop-blur-md border border-white/[0.06] rounded-xl shadow-2xl shadow-black/90 p-1.5 z-50 animate-scale-in">
          {/* User Profile Header */}
          <div className="px-3 py-2 flex flex-col gap-0.5 border-b border-white/[0.04] mb-1">
            <span className="text-[10px] font-medium uppercase tracking-wider text-gray-500">Signed in as</span>
            <span className="text-sm font-semibold text-white truncate">{user.username}</span>
            <span className="text-[11px] text-gray-400 truncate">{user.email}</span>
            
            {user.role === 'ADMIN' && (
              <span className="inline-flex items-center gap-1 mt-1 text-[9px] font-semibold text-amber-500 bg-amber-500/10 border border-amber-500/10 px-1.5 py-0.5 rounded w-max">
                <Shield className="w-2.5 h-2.5" />
                ADMIN
              </span>
            )}
          </div>

          {/* Quick Actions */}
          <div className="space-y-0.5">
            <Link
              to="/profile"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-gray-400 hover:text-white hover:bg-white/[0.03] rounded-lg transition-colors text-left"
            >
              <User className="w-3.5 h-3.5 text-gray-500" />
              <span>View Profile</span>
            </Link>

            <Link
              to="/settings"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-gray-400 hover:text-white hover:bg-white/[0.03] rounded-lg transition-colors text-left"
            >
              <BookOpen className="w-3.5 h-3.5 text-gray-500" />
              <span>Vault Settings</span>
            </Link>

            <button
              onClick={() => {
                setIsOpen(false);
                onEditProfile();
              }}
              className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-gray-400 hover:text-white hover:bg-white/[0.03] rounded-lg transition-colors text-left cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5 text-gray-500" />
              <span>Edit Profile</span>
            </button>

            <Link
              to="/appearance"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-gray-400 hover:text-white hover:bg-white/[0.03] rounded-lg transition-colors text-left"
            >
              <Palette className="w-3.5 h-3.5 text-gray-500" />
              <span>Appearance</span>
            </Link>

            {user.role === 'ADMIN' && (
              <Link
                to="/admin"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-amber-500/80 hover:text-amber-400 hover:bg-amber-500/5 rounded-lg transition-colors text-left font-medium"
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Admin Console</span>
              </Link>
            )}
          </div>


          {/* Sign Out */}
          <div className="border-t border-white/[0.04] mt-1 pt-1">
            <button
              onClick={() => {
                setIsOpen(false);
                logout();
              }}
              className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/5 rounded-lg transition-colors text-left font-medium cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-400/80" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
