/* eslint-disable react-hooks/set-state-in-effect */
import React, { useState, useEffect } from 'react';
import { Code2, ImagePlus, Link, Terminal, Upload, User } from 'lucide-react';
import { useAuth } from '../useAuth';
import { Modal } from '../../../shared/ui/modal/Modal';
import { Input } from '../../../shared/ui/input/Input';
import { Button } from '../../../shared/ui/button/Button';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({ isOpen, onClose }) => {
  const { user, updateProfile, uploadAvatar } = useAuth();
  const [username, setUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState('');
  const [avatarUrlDirty, setAvatarUrlDirty] = useState(false);
  const [leetcodeUrl, setLeetcodeUrl] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [fullName, setFullName] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setUsername(user.username || '');
      setAvatarUrl(user.avatarUrl || '');
      setAvatarFile(null);
      setAvatarPreviewUrl('');
      setAvatarUrlDirty(false);
      setLeetcodeUrl(user.leetcodeUrl || '');
      setGithubUrl(user.githubUrl || '');
      setLinkedinUrl(user.linkedinUrl || '');
      setPortfolioUrl(user.portfolioUrl || '');
      setFullName(user.fullName || '');
      setBio(user.bio || '');
      setLocation(user.location || '');
      setErrors({});
    }
  }, [user, isOpen]);

  useEffect(() => {
    return () => {
      if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl);
    };
  }, [avatarPreviewUrl]);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrors(prev => ({ ...prev, avatarUrl: 'Please upload an image file.' }));
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrors(prev => ({ ...prev, avatarUrl: 'Image must be under 5 MB.' }));
      return;
    }

    if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl);
    setAvatarFile(file);
    setAvatarPreviewUrl(URL.createObjectURL(file));
    setErrors(prev => {
      const next = { ...prev };
      delete next.avatarUrl;
      return next;
    });
  };

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

    if (avatarUrlDirty && avatarUrl && avatarUrl.length > 2048) {
      newErrors.avatarUrl = 'Profile image URL is too long.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setLoading(true);

    try {
      if (avatarFile) {
        await uploadAvatar(avatarFile);
      }

      await updateProfile({
        username,
        ...(avatarUrlDirty && !avatarFile ? { avatarUrl: avatarUrl || null } : {}),
        leetcodeUrl: leetcodeUrl || null,
        githubUrl: githubUrl || null,
        linkedinUrl: linkedinUrl || null,
        portfolioUrl: portfolioUrl || null,
        fullName: fullName || null,
        bio: bio || null,
        location: location || null,
      });

      onClose();
    } catch {
      // Handled by updateProfile toast
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Profile"
      size="lg"
      footer={
        <div className="flex gap-2 w-full justify-end">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" form="edit-profile-form" loading={loading}>
            Save Changes
          </Button>
        </div>
      }
    >
      <form id="edit-profile-form" onSubmit={handleSubmit} className="space-y-5">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-blue-600/10 border border-blue-500/20 overflow-hidden flex items-center justify-center shrink-0">
            {avatarPreviewUrl || avatarUrl ? (
              <img
                src={avatarPreviewUrl || avatarUrl}
                alt="Profile preview"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : (
              <ImagePlus className="w-7 h-7 text-blue-400" />
            )}
          </div>
          <div className="flex-1 space-y-2">
            <label className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-dark-bg border border-dark-border hover:bg-dark-hover text-gray-300 text-xs font-bold cursor-pointer transition-colors">
              <Upload className="w-3.5 h-3.5" />
              Upload Profile Image
              <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            </label>
            <p className="text-[11px] text-gray-500">JPG, PNG, WebP, or GIF up to 5 MB. It will be stored on the backend.</p>
            {avatarFile && (
              <p className="text-[11px] text-blue-300 truncate">
                Ready to upload: {avatarFile.name}
              </p>
            )}
          </div>
        </div>

        <Input
          label="Username"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          error={errors.username}
          icon={<User className="w-4 h-4" />}
          placeholder="New username"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Full Name"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            icon={<User className="w-4 h-4" />}
            placeholder="Mannu Kumar thakur"
          />
          <Input
            label="Location"
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            icon={<User className="w-4 h-4" />}
            placeholder="India"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-gray-400">Bio</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="w-full bg-[#0a0a0c] border border-white/[0.08] rounded px-3 py-2 text-sm text-gray-300 resize-none h-20 focus:border-blue-500/60 focus:outline-none"
            placeholder="Tell us about yourself..."
          />
        </div>

        <Input
          label="Profile Image URL"
          type="text"
          value={avatarUrl}
          onChange={(e) => {
            if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl);
            setAvatarPreviewUrl('');
            setAvatarFile(null);
            setAvatarUrlDirty(true);
            setAvatarUrl(e.target.value);
          }}
          error={errors.avatarUrl}
          icon={<Link className="w-4 h-4" />}
          placeholder="https://example.com/avatar.png"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="LeetCode"
            type="url"
            value={leetcodeUrl}
            onChange={(e) => setLeetcodeUrl(e.target.value)}
            icon={<Link className="w-4 h-4" />}
            placeholder="https://leetcode.com/u/username"
          />
          <Input
            label="GitHub"
            type="url"
            value={githubUrl}
            onChange={(e) => setGithubUrl(e.target.value)}
            icon={<Terminal className="w-4 h-4" />}
            placeholder="https://github.com/username"
          />
          <Input
            label="LinkedIn"
            type="url"
            value={linkedinUrl}
            onChange={(e) => setLinkedinUrl(e.target.value)}
            icon={<Code2 className="w-4 h-4" />}
            placeholder="https://linkedin.com/in/username"
          />
          <Input
            label="Portfolio / Other"
            type="url"
            value={portfolioUrl}
            onChange={(e) => setPortfolioUrl(e.target.value)}
            icon={<Link className="w-4 h-4" />}
            placeholder="https://your-site.com"
          />
        </div>
      </form>
    </Modal>
  );
};
