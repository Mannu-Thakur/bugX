import React, { useState, useEffect } from 'react';
import { User, Link } from 'lucide-react';
import { useAuth } from '../useAuth';
import { Modal } from '../../../shared/ui/modal/Modal';
import { Input } from '../../../shared/ui/input/Input';
import { Button } from '../../../shared/ui/button/Button';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({ isOpen, onClose }) => {
  const { user, updateProfile } = useAuth();
  const [username, setUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [errors, setErrors] = useState<{ username?: string; avatarUrl?: string }>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setUsername(user.username || '');
      setAvatarUrl(user.avatarUrl || '');
      setErrors({});
    }
  }, [user, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: typeof errors = {};

    // Validate username (min 3, max 50, alphanumeric + dashes/underscores)
    if (!username) {
      newErrors.username = 'Username is required.';
    } else if (username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters.';
    } else if (username.length > 50) {
      newErrors.username = 'Username cannot exceed 50 characters.';
    } else if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      newErrors.username = 'Username must contain only alphanumeric characters, dashes, and underscores.';
    }

    // Validate avatar url (max 512)
    if (avatarUrl && avatarUrl.length > 512) {
      newErrors.avatarUrl = 'Avatar URL cannot exceed 512 characters.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setLoading(true);

    try {
      await updateProfile({
        username,
        avatarUrl: avatarUrl || null,
      });
      onClose();
    } catch (err) {
      // Handled by updateProfile toast
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Profile Settings"
      size="sm"
      footer={
        <div className="flex gap-2 w-full justify-end">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} loading={loading}>
            Save Changes
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Username"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          error={errors.username}
          icon={<User className="w-4 h-4" />}
          placeholder="New username"
        />

        <Input
          label="Avatar Image URL (Optional)"
          type="text"
          value={avatarUrl}
          onChange={(e) => setAvatarUrl(e.target.value)}
          error={errors.avatarUrl}
          icon={<Link className="w-4 h-4" />}
          placeholder="https://example.com/avatar.png"
        />

        {avatarUrl && !errors.avatarUrl && (
          <div className="flex items-center gap-3 p-3 bg-dark-bg/40 border border-dark-border/60 rounded-md">
            <span className="text-xs text-gray-500 font-medium">Avatar Preview:</span>
            <img
              src={avatarUrl}
              alt="Avatar Preview"
              className="w-10 h-10 rounded-full object-cover border border-dark-border"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y';
              }}
            />
          </div>
        )}
      </form>
    </Modal>
  );
};
