import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, message: error.message || 'An unexpected error occurred.' };
  }

  componentDidCatch(error: Error) {
    console.error('QazaFlow ErrorBoundary caught:', error);
  }

  render() {
    if (this.state.hasError) {
      let displayMsg = this.state.message;
      try {
        const parsed = JSON.parse(this.state.message);
        if (parsed?.error) displayMsg = parsed.error;
      } catch {
        // non-JSON message
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-[#F8F7F4] dark:bg-[#0E1311] p-6">
          <div className="max-w-md w-full bg-white dark:bg-[#151C19] border border-[#E5E2DC] dark:border-[#242E2A] rounded-2xl p-6 space-y-4">
            <h1 className="text-xl font-semibold text-[#1A1D1B] dark:text-[#F1F3F2]">
              Something interrupted your view
            </h1>
            <p className="text-sm text-[#5C635E] dark:text-[#9AA59E] leading-relaxed">
              Your tracking records remain safely stored locally. You can reload to continue.
            </p>
            <p className="text-xs font-mono-num text-[#7A827D] break-words bg-[#F8F7F4] dark:bg-[#0E1311] p-3 rounded-lg border border-[#E5E2DC] dark:border-[#242E2A]">
              {displayMsg}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="w-full min-h-[44px] rounded-xl bg-[#1B4D3E] text-white text-sm font-medium hover:bg-[#143B2F] transition-colors"
            >
              Reload QazaFlow
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
