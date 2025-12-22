import React, { useState } from 'react';
import { Eye, EyeOff, Lock, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { ApiError } from '../services/httpClient';

interface LoginProps {
  isDark: boolean;
}

export const Login: React.FC<LoginProps> = ({ isDark }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(username, password);
    } catch (err) {
      let errorMessage = 'Login failed';
      if (err instanceof ApiError) {
        errorMessage = err.message || err.data?.detail || err.data?.message || 'Login failed';
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const themeClasses = {
    bg: isDark ? 'bg-gray-900' : 'bg-gray-50',
    card: isDark ? 'bg-gray-800/80 border-gray-700/50' : 'bg-white border-gray-200',
    text: isDark ? 'text-gray-100' : 'text-gray-900',
    textSecondary: isDark ? 'text-gray-400' : 'text-gray-600',
    input: isDark ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-300',
    button: 'bg-gradient-to-r from-violet-500 to-pink-500 hover:from-violet-600 hover:to-pink-600',
    errorBg: isDark ? 'bg-red-900/20' : 'bg-red-500/10',
    errorBorder: isDark ? 'border-red-700' : 'border-red-500/20',
    errorText: isDark ? 'text-red-300' : 'text-red-400',
  };

  return (
    <div className={`min-h-screen ${themeClasses.bg} flex items-center justify-center px-4`}>
      <div className={`max-w-md w-full ${themeClasses.card} border backdrop-blur-xl rounded-2xl p-8 shadow-2xl`}>
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-violet-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Lock className="text-white" size={32} />
          </div>
          <h2 className={`text-3xl font-bold ${themeClasses.text} mb-2`}>POS System</h2>
          <p className={themeClasses.textSecondary}>Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="username" className={`block text-sm font-medium ${themeClasses.text} mb-2`}>
              Username
            </label>
            <div className={`relative ${themeClasses.input} border rounded-xl px-4 py-3`}>
              <User className={`absolute left-3 top-3.5 ${themeClasses.textSecondary}`} size={20} />
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className={`w-full pl-10 bg-transparent ${themeClasses.text} outline-none`}
                placeholder="Enter your username"
                required
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className={`block text-sm font-medium ${themeClasses.text} mb-2`}>
              Password
            </label>
            <div className={`relative ${themeClasses.input} border rounded-xl px-4 py-3`}>
              <Lock className={`absolute left-3 top-3.5 ${themeClasses.textSecondary}`} size={20} />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full pl-10 pr-10 bg-transparent ${themeClasses.text} outline-none`}
                placeholder="Enter your password"
                required
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className={`absolute right-3 top-3.5 ${themeClasses.textSecondary} hover:${themeClasses.text}`}
                disabled={loading}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {error && (
            <div className={`${themeClasses.errorBg} border ${themeClasses.errorBorder} rounded-xl p-4`}>
              <p className={`${themeClasses.errorText} text-sm`}>{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !username || !password}
            className={`w-full ${themeClasses.button} text-white font-semibold py-3 px-4 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};