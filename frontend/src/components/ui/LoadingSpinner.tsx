import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'spinner' | 'dots' | 'pulse' | 'bars';
  text?: string;
  themeClasses: Record<string, string>;
  isDark: boolean;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  variant = 'spinner',
  text,
  themeClasses,
  isDark
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  const renderSpinner = () => {
    switch (variant) {
      case 'dots':
        return (
          <div className="flex space-x-1">
            <div className={`${sizeClasses[size]} bg-current rounded-full animate-bounce`} style={{ animationDelay: '0ms' }}></div>
            <div className={`${sizeClasses[size]} bg-current rounded-full animate-bounce`} style={{ animationDelay: '150ms' }}></div>
            <div className={`${sizeClasses[size]} bg-current rounded-full animate-bounce`} style={{ animationDelay: '300ms' }}></div>
          </div>
        );
      
      case 'pulse':
        return (
          <div className={`${sizeClasses[size]} bg-current rounded-full animate-pulse`}></div>
        );
      
      case 'bars':
        return (
          <div className="flex items-end space-x-1">
            <div className={`w-1 h-8 bg-current animate-pulse`} style={{ animationDelay: '0ms', animationDuration: '1s' }}></div>
            <div className={`w-1 h-6 bg-current animate-pulse`} style={{ animationDelay: '0.2s', animationDuration: '1s' }}></div>
            <div className={`w-1 h-10 bg-current animate-pulse`} style={{ animationDelay: '0.4s', animationDuration: '1s' }}></div>
            <div className={`w-1 h-4 bg-current animate-pulse`} style={{ animationDelay: '0.6s', animationDuration: '1s' }}></div>
            <div className={`w-1 h-8 bg-current animate-pulse`} style={{ animationDelay: '0.8s', animationDuration: '1s' }}></div>
          </div>
        );
      
      default:
        return (
          <div className={`${sizeClasses[size]} border-2 border-current border-t-transparent rounded-full animate-spin`}></div>
        );
    }
  };

  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <div className={`${themeClasses.text} ${themeClasses.textSecondary}`}>
        {renderSpinner()}
      </div>
      {text && (
        <p className={`${themeClasses.text} text-sm font-medium`}>{text}</p>
      )}
    </div>
  );
};

interface LoadingOverlayProps {
  isLoading: boolean;
  children: React.ReactNode;
  text?: string;
  themeClasses: Record<string, string>;
  isDark: boolean;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isLoading,
  children,
  text = 'Loading...',
  themeClasses,
  isDark
}) => {
  return (
    <div className="relative">
      {children}
      {isLoading && (
        <div className="absolute inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className={`${themeClasses.card} border rounded-xl p-6 shadow-xl`}>
            <LoadingSpinner 
              size="lg" 
              text={text} 
              themeClasses={themeClasses} 
              isDark={isDark} 
            />
          </div>
        </div>
      )}
    </div>
  );
};

interface PageLoadingProps {
  themeClasses: Record<string, string>;
  isDark: boolean;
}

export const PageLoading: React.FC<PageLoadingProps> = ({ themeClasses, isDark }) => {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <LoadingSpinner 
        size="lg" 
        text="Loading dashboard..." 
        themeClasses={themeClasses} 
        isDark={isDark} 
      />
    </div>
  );
};

interface CardLoadingProps {
  themeClasses: Record<string, string>;
  isDark: boolean;
  count?: number;
}

export const CardLoading: React.FC<CardLoadingProps> = ({ 
  themeClasses, 
  isDark, 
  count = 4 
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={`${themeClasses.card} border backdrop-blur-xl rounded-2xl p-6 shadow-lg animate-pulse`}>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-gray-300 rounded-xl"></div>
            <div className="flex-1">
              <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
              <div className="h-8 bg-gray-300 rounded w-1/2"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};