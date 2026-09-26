import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error?.message || 'Something went wrong.' };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[Fios ErrorBoundary]', error, info.componentStack);
  }

  private handleReset = () => {
    this.setState({ hasError: false, message: '' });
    this.props.onReset?.();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="rounded-2xl border border-rose-500/30 bg-rose-500/5 p-6 space-y-3 text-center font-sans">
        <div className="mx-auto w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <h3 className="text-sm font-black uppercase tracking-wider text-[var(--fios-text)]">
          {this.props.fallbackTitle || 'This panel crashed'}
        </h3>
        <p className="text-xs font-mono text-[var(--fios-text-muted)] max-w-md mx-auto">
          {this.state.message}
        </p>
        <button
          type="button"
          onClick={this.handleReset}
          className="inline-flex items-center gap-2 px-4 py-2 accent-bg text-slate-950 text-xs font-black uppercase rounded-lg cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Try again
        </button>
      </div>
    );
  }
}

export default ErrorBoundary;
