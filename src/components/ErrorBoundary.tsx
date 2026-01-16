import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('应用崩溃:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
            <div className="text-center">
              <div className="text-6xl mb-4">⚠️</div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                应用崩溃
              </h1>
              <p className="text-gray-600 mb-4">抱歉，应用遇到了问题</p>

              {this.state.error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 text-left">
                  <p className="text-sm text-red-800 font-mono break-words">
                    {this.state.error.message}
                  </p>
                </div>
              )}

              <div className="space-y-3">
                <button
                  onClick={() => window.location.href = '/debug'}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700"
                >
                  打开调试页面
                </button>

                <button
                  onClick={() => window.location.href = '/'}
                  className="w-full bg-gray-200 text-gray-800 py-3 rounded-lg font-medium hover:bg-gray-300"
                >
                  返回首页
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
