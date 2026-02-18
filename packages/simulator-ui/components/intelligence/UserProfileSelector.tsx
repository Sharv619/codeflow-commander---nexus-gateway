import React from 'react';

interface UserProfileSelectorProps {
  currentUser: {
    id: string;
    name: string;
    role: string;
    avatar?: string;
  };
  onUserChange: (user: any) => void;
}

const UserProfileSelector: React.FC<UserProfileSelectorProps> = ({
  currentUser,
  onUserChange
}) => {
  const users = [
    { id: 'user-1', name: 'Deva Developer', role: 'Developer', avatar: '👨‍💻' },
    { id: 'user-2', name: 'Team Lead Taylor', role: 'Team Lead', avatar: '👩‍💼' },
    { id: 'user-3', name: 'Architect Alex', role: 'Architect', avatar: '👨‍🔬' },
    { id: 'user-4', name: 'Admin Sam', role: 'Admin', avatar: '👩‍💻' }
  ];

  return (
    <div className="bg-gray-700 rounded-lg p-2">
      <div className="flex items-center space-x-2">
        <div className="w-8 h-8 bg-cyan-500 rounded-full flex items-center justify-center text-white font-bold">
          {currentUser.avatar || currentUser.name.charAt(0)}
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-medium">{currentUser.name}</span>
          <span className="text-xs text-gray-400">{currentUser.role}</span>
        </div>
        <select
          value={currentUser.id}
          onChange={(e) => {
            const selectedUser = users.find(u => u.id === e.target.value);
            if (selectedUser) onUserChange(selectedUser);
          }}
          className="ml-2 p-1 bg-gray-800 rounded text-sm"
        >
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name} ({user.role})
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default UserProfileSelector;