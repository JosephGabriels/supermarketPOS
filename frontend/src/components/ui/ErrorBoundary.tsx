import React, { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ error, errorInfo });
    this.props.onError?.(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[400px] flex items-center justify-center p-8">
          <div className="text-center space-y-6 max-w-md">
            <div className="w-16 h-16 mx-auto bg-red-500/20 rounded-full flex items-center justify-center">
              <Bug className="w-8 h-8 text-red-500" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                Something went wrong
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                We encountered an unexpected error. Please try refreshing the page.
              </p>
            </div>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => window.location.reload()}
                className="flex items-center gap-2 px-4 py-2 bg-violet-500 text-white rounded-lg hover:bg-violet-600 transition-colors"
              >
                <RefreshCw size={16} />
                Refresh Page
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 dark:text-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <Home size={16} />
                Go Home
              </button>
            </div>
            {import.meta.env.DEV && this.state.error && (
              <details className="text-left">
                <summary className="cursor-pointer text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">
                  Error Details
                </summary>
                <div className="mt-2 p-3 bg-gray-100 dark:bg-gray-800 rounded text-xs font-mono">
                  <div className="text-red-600 dark:text-red-400 mb-2">
                    {this.state.error.toString()}
                  </div>
                  {this.state.errorInfo && (
                    <pre className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  )}
                </div>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

interface ErrorMessageProps {
  title?: string;
  message: string;
  type?: 'error' | 'warning' | 'info';
  onRetry?: () => void;
  onDismiss?: () => void;
  themeClasses: Record<string, string>;
  isDark: boolean;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({
  title = 'Error',
  message,
  type = 'error',
  onRetry,
  onDismiss,
  themeClasses,
  isDark
}) => {
  const typeConfig = {
    error: {
      icon: AlertTriangle,
      bgColor: 'bg-red-500/10',
      textColor: 'text-red-500',
      borderColor: 'border-red-500/20'
    },
    warning: {
      icon: AlertTriangle,
      bgColor: 'bg-amber-500/10',
      textColor: 'text-amber-500',
      borderColor: 'border-amber-500/20'
    },
    info: {
      icon: AlertTriangle,
      bgColor: 'bg-blue-500/10',
      textColor: 'text-blue-500',
      borderColor: 'border-blue-500/20'
    }
  };

  const config = typeConfig[type];
  const Icon = config.icon;

  return (
    <div className={`${config.bgColor} ${config.borderColor} border rounded-xl p-6`}>
      <div className="flex items-start gap-4">
        <Icon className={`${config.textColor} flex-shrink-0 mt-0.5`} size={20} />
        <div className="flex-1 min-w-0">
          <h3 className={`${themeClasses.text} font-semibold mb-1`}>{title}</h3>
          <p className={`${themeClasses.textSecondary} text-sm`}>{message}</p>
          {(onRetry || onDismiss) && (
            <div className="flex gap-3 mt-4">
              {onRetry && (
                <button
                  onClick={onRetry}
                  className={`${config.textColor} hover:opacity-80 text-sm font-medium flex items-center gap-2`}
                >
                  <RefreshCw size={14} />
                  Try Again
                </button>
              )}
              {onDismiss && (
                <button
                  onClick={onDismiss}
                  className={`${themeClasses.textSecondary} hover:${themeClasses.text} text-sm`}
                >
                  Dismiss
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface EmptyStateProps {
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  themeClasses: Record<string, string>;
  isDark: boolean;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = AlertTriangle,
  title,
  description,
  action,
  themeClasses,
  isDark
}) => {
  return (
    <div className="text-center py-12 px-6">
      <div className={`w-16 h-16 mx-auto ${themeClasses.card} border rounded-full flex items-center justify-center mb-6`}>
        <Icon className={`${themeClasses.textSecondary}`} size={32} />
      </div>
      <h3 className={`text-xl font-semibold ${themeClasses.text} mb-2`}>
        {title}
      </h3>
      {description && (
        <p className={`${themeClasses.textSecondary} mb-6 max-w-sm mx-auto`}>
          {description}
        </p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="px-6 py-3 bg-gradient-to-r from-violet-500 to-pink-500 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-violet-500/25 transition-all"
        >
          {action.label}
        </button>
      )}
    </div>
  );
};

interface NetworkErrorProps {
  onRetry?: () => void;
  themeClasses: Record<string, string>;
  isDark: boolean;
}

export const NetworkError: React.FC<NetworkErrorProps> = ({ onRetry, themeClasses, isDark }) => {
  return (
    <div className="min-h-[400px] flex items-center justify-center p-8">
      <div className="text-center space-y-4 max-w-md">
        <div className="w-16 h-16 mx-auto bg-red-500/20 rounded-full flex items-center justify-center">
          <AlertTriangle className="w-8 h-8 text-red-500" />
        </div>
        <div>
          <h3 className={`text-xl font-semibold ${themeClasses.text} mb-2`}>
            Connection Error
          </h3>
          <p className={`${themeClasses.textSecondary} mb-6`}>
            Unable to connect to the server. Please check your internet connection and try again.
          </p>
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="flex items-center gap-2 mx-auto px-6 py-3 bg-gradient-to-r from-violet-500 to-pink-500 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-violet-500/25 transition-all"
          >
            <RefreshCw size={16} />
            Try Again
          </button>
        )}
      </div>
    </div>
  );
};