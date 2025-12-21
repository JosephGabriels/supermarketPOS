import React, { useState, useEffect } from 'react';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Camera,
  Edit,
  Save,
  X,
  ChevronRight
} from 'lucide-react';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import usersApi from '../services/usersApi';

interface ProfileProps {
  isDark: boolean;
  themeClasses: Record<string, string>;
}

interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  location: string;
  joinDate: string;
  avatar: string;
  role: string;
  department: string;
}

export const Profile: React.FC<ProfileProps> = ({ isDark, themeClasses }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Mock user profile data
  const [profile, setProfile] = useState<UserProfile>({
    id: '1',
    name: 'Sarah Johnson',
    email: 'sarah.johnson@company.com',
    phone: '+1 (555) 123-4567',
    location: 'San Francisco, CA',
    joinDate: '2023-01-15',
    avatar: '',
    role: 'Admin',
    department: 'Operations'
  });

  const [editForm, setEditForm] = useState(profile);

  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Load current profile from backend and merge into UI state
  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true);
        const user = await usersApi.getCurrentUser();
        const mapped: UserProfile = {
          id: String(user.id),
          name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username,
          email: user.email,
          phone: user.phone || '',
          location: user.branch?.name || '',
          joinDate: user.date_joined || new Date().toISOString(),
          avatar: '',
          role: user.role || 'User',
          department: user.branch?.name || ''
        };
        setProfile(mapped);
        setEditForm(mapped);
      } catch (err) {
        console.error('Failed to load profile', err);
      } finally {
        setIsLoading(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const handleSave = async () => {
    if (!profile) return;
    setIsLoading(true);
    try {
      // Build minimal payload from editForm
      const payload: any = {};
      if ((editForm as any).name) {
        const parts = (editForm as any).name.split(' ');
        payload.first_name = parts.slice(0, -1).join(' ') || parts[0];
        payload.last_name = parts.length > 1 ? parts.slice(-1).join(' ') : '';
      }
      if ((editForm as any).email) payload.email = (editForm as any).email;
      if ((editForm as any).phone) payload.phone = (editForm as any).phone;

      await usersApi.patchUser(parseInt(profile.id, 10), payload);
      // Refresh profile from API
      const updated = await usersApi.getCurrentUser();
      const mapped: UserProfile = {
        id: String(updated.id),
        name: `${updated.first_name || ''} ${updated.last_name || ''}`.trim() || updated.username,
        email: updated.email,
        phone: updated.phone || '',
        location: updated.branch?.name || '',
        joinDate: updated.date_joined || new Date().toISOString(),
        avatar: '',
        role: updated.role || 'User',
        department: updated.branch?.name || ''
      };
      setProfile(mapped);
      setEditForm(mapped);
      setIsEditing(false);
      setSaveMessage('Profile updated successfully');
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      console.error('Failed to save profile:', error);
      setSaveMessage('Failed to save profile');
      setTimeout(() => setSaveMessage(null), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setEditForm(profile);
    setIsEditing(false);
  };

  const handleInputChange = (field: string, value: any) => {
    setEditForm(prev => ({
      ...prev,
      [field]: value
    }));
  };





  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-3xl font-bold ${themeClasses.text} mb-2`}>Profile</h2>
          <p className={themeClasses.textSecondary}>Manage your account information</p>
        </div>
      </div>
      {saveMessage && (
        <div className="p-3 rounded-md bg-green-500/10 border border-green-500/20">
          <p className="text-sm text-green-500">{saveMessage}</p>
        </div>
      )}

      {/* Profile Header */}
      <div className={`${themeClasses.card} border backdrop-blur-xl rounded-2xl p-6`}>
        <div className="flex items-center gap-6">
          <div className="w-24 h-24 bg-gradient-to-br from-violet-500 to-pink-500 rounded-full flex items-center justify-center text-white text-2xl font-bold">
            {profile.avatar ? (
              <img src={profile.avatar} alt={profile.name} className="w-full h-full rounded-full object-cover" />
            ) : (
              profile.name.split(' ').map(n => n[0]).join('')
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h2 className={`text-2xl font-bold ${themeClasses.text}`}>{profile.name}</h2>
              <span className={`px-3 py-1 bg-violet-500/20 text-violet-500 rounded-full text-sm font-medium`}>
                {profile.role}
              </span>
            </div>
            <p className={`${themeClasses.textSecondary} mb-4`}>{profile.department}</p>
          </div>
        </div>
      </div>

      {/* Personal Information */}
      <div className={`${themeClasses.card} border backdrop-blur-xl rounded-2xl p-6`}>
        <div className="flex items-center justify-between mb-6">
          <h3 className={`text-xl font-bold ${themeClasses.text}`}>Personal Information</h3>
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 bg-violet-500 text-white rounded-lg hover:bg-violet-600 transition-colors flex items-center gap-2"
            >
              <Edit size={16} />
              Edit Profile
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={handleCancel}
                className={`px-4 py-2 ${themeClasses.hover} border ${themeClasses.card} rounded-lg flex items-center gap-2`}
              >
                <X size={16} />
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isLoading}
                className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Save size={16} />
                )}
                Save Changes
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className={`block text-sm font-medium ${themeClasses.text} mb-2`}>Full Name</label>
            {isEditing ? (
              <input
                type="text"
                value={editForm.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className={`w-full px-4 py-3 ${themeClasses.input} border rounded-xl ${themeClasses.text} focus:outline-none focus:ring-2 focus:ring-violet-500`}
              />
            ) : (
              <p className={`${themeClasses.text} py-3`}>{profile.name}</p>
            )}
          </div>

          <div>
            <label className={`block text-sm font-medium ${themeClasses.text} mb-2`}>Email Address</label>
            {isEditing ? (
              <input
                type="email"
                value={editForm.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className={`w-full px-4 py-3 ${themeClasses.input} border rounded-xl ${themeClasses.text} focus:outline-none focus:ring-2 focus:ring-violet-500`}
              />
            ) : (
              <p className={`${themeClasses.text} py-3`}>{profile.email}</p>
            )}
          </div>

          <div>
            <label className={`block text-sm font-medium ${themeClasses.text} mb-2`}>Phone Number</label>
            {isEditing ? (
              <input
                type="tel"
                value={editForm.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                className={`w-full px-4 py-3 ${themeClasses.input} border rounded-xl ${themeClasses.text} focus:outline-none focus:ring-2 focus:ring-violet-500`}
              />
            ) : (
              <p className={`${themeClasses.text} py-3`}>{profile.phone}</p>
            )}
          </div>

          <div>
            <label className={`block text-sm font-medium ${themeClasses.text} mb-2`}>Location</label>
            {isEditing ? (
              <input
                type="text"
                value={editForm.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                className={`w-full px-4 py-3 ${themeClasses.input} border rounded-xl ${themeClasses.text} focus:outline-none focus:ring-2 focus:ring-violet-500`}
              />
            ) : (
              <p className={`${themeClasses.text} py-3`}>{profile.location}</p>
            )}
          </div>

          <div>
            <label className={`block text-sm font-medium ${themeClasses.text} mb-2`}>Role</label>
            <p className={`${themeClasses.text} py-3`}>{profile.role}</p>
          </div>

          <div>
            <label className={`block text-sm font-medium ${themeClasses.text} mb-2`}>Department</label>
            <p className={`${themeClasses.text} py-3`}>{profile.department}</p>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-700/50">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Calendar size={16} />
            <span>Member since {new Date(profile.joinDate).toLocaleDateString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
};