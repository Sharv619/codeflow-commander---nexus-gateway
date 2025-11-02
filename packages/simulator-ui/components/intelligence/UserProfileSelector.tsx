import React, { useState } from 'react';
import { UserRole } from '../../types/intelligence';

interface UserProfileSelectorProps {
  currentUser: {
    id: string;
    name: string;
    role: UserRole;
    avatar?: string;
  };
  onUserChange: (user: { id: string; name: string; role: UserRole; avatar?: string }) => void;
}

const UserProfileSelector: React.FC<UserProfileSelectorProps> = ({
  currentUser,
  onUserChange
}) => {
  const [isOpen, setIsOpen] = useState(false);

  // Mock user profiles for different roles
  const userProfiles = [
    {
      id: 'user-1',
      name: 'Deva Developer',
      role: UserRole.Developer,
      avatar: '👩‍💻',
      description: 'Individual contributor focused on code quality'
    },
    {
      id: 'user-2',
      name: 'Leo Team Lead',
      role: UserRole.TeamLead,
      avatar: '👨‍💼',
      description: 'Manages team productivity and code standards'
    },
    {
      id: 'user-3',
      name: 'Aria Architect',
      role: UserRole.Architect,
      avatar: '👩‍🏗️',
      description: 'Oversees enterprise architecture and dependencies'
    },
    {
      id: 'user-4',
      name: 'Admin User',
      role: UserRole.Admin,
      avatar: '👑',
      description: 'Full system administration access'
    }
  ];

  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case UserRole.Developer:
        return 'bg-blue-500';
      case UserRole.TeamLead:
        return 'bg-green-500';
      case UserRole.Architect:
        return 'bg-purple-500';
      case UserRole.Admin:
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case UserRole.Developer:
        return '👩‍💻';
      case UserRole.TeamLead:
        return '👨‍💼';
      case UserRole.Architect:
        return '👩‍🏗️';
      case UserRole.Admin:
        return '👑';
      default:
        return '👤';
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-gray-700 transition-colors"
      >
        <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center text-sm">
          {currentUser.avatar || getRoleIcon(currentUser.role)}
        </div>
        <div className="text-left">
          <div className="text-sm font-medium text-gray-200">{currentUser.name}</div>
          <div className="text-xs text-gray-400 capitalize">
            {currentUser.role.replace('_', ' ')}
          </div>
        </div>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute right-0 top-full mt-2 w-80 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-20">
            <div className="p-4 border-b border-gray-700">
              <h3 className="text-sm font-semibold text-gray-200 mb-2">Switch User Profile</h3>
              <p className="text-xs text-gray-400">
                Experience the dashboard from different user perspectives
              </p>
            </div>

            <div className="max-h-64 overflow-y-auto">
              {userProfiles.map(profile => (
                <button
                  key={profile.id}
                  onClick={() => {
                    onUserChange(profile);
                    setIsOpen(false);
                  }}
                  className={`w-full px-4 py-3 text-left hover:bg-gray-700 transition-colors ${
                    currentUser.id === profile.id ? 'bg-cyan-500/10 border-l-4 border-cyan-500' : ''
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center">
                      {profile.avatar}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-200">{profile.name}</div>
                      <div className="text-xs text-gray-400">{profile.description}</div>
                    </div>
                    <div className={`px-2 py-1 rounded-full text-xs text-white ${getRoleColor(profile.role)}`}>
                      {profile.role.replace('_', ' ')}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <div className="p-3 border-t border-gray-700 bg-gray-750 rounded-b-lg">
              <div className="text-xs text-gray-400">
                💡 Each role has different dashboard views and permissions
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default UserProfileSelector;
