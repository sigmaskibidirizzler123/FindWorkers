'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, ArrowLeft } from 'lucide-react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

/**
 * React Error Boundary - catches render errors and shows fallback UI
 * 
 * Usage:
 *   <ErrorBoundary>
 *     <AppContent />
 *   </ErrorBoundary>
 * 
 * With custom fallback:
 *   <ErrorBoundary fallback={<CustomErrorPage />}>
 *     <AppContent />
 *   </ErrorBoundary>
 */
export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
        errorInfo: null,
    };

    public static getDerivedStateFromError(error: Error): Partial<State> {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        // Log error to monitoring service (Sentry, etc.)
        console.error('[ErrorBoundary]', error, errorInfo);

        this.setState({ errorInfo });

        // In production, send to error tracking
        if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
            // Example: Sentry.captureException(error, { extra: errorInfo });
            try {
                fetch('/api/v1/system/error-report', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        error: { name: error.name, message: error.message, stack: error.stack },
                        componentStack: errorInfo.componentStack,
                        url: window.location.href,
                        timestamp: new Date().toISOString(),
                    }),
                }).catch(() => { /* silent */ });
            } catch { /* silent */ }
        }
    }

    private handleRetry = () => {
        this.setState({ hasError: false, error: null, errorInfo: null });
    };

    public render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return <DefaultErrorFallback
                error={this.state.error}
                onRetry={this.handleRetry}
            />;
        }

        return this.props.children;
    }
}

/**
 * Default error fallback UI
 */
function DefaultErrorFallback({
    error,
    onRetry,
}: {
    error: Error | null;
    onRetry: () => void;
}) {
    return (
        <div className="min-h-[60vh] flex items-center justify-center px-4">
            <div className="glass-card max-w-md w-full p-8 text-center">
                <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-6">
                    <AlertTriangle className="w-8 h-8 text-red-400" />
                </div>

                <h2 className="text-xl font-bold text-white mb-2">Đã xảy ra lỗi</h2>
                <p className="text-slate-400 text-sm mb-6">
                    Rất tiếc, đã có lỗi xảy ra. Vui lòng thử lại hoặc quay về trang chủ.
                </p>

                {process.env.NODE_ENV !== 'production' && error && (
                    <div className="mb-6 text-left bg-red-500/5 border border-red-500/10 rounded-xl p-4">
                        <p className="text-xs font-mono text-red-400 break-all">
                            {error.name}: {error.message}
                        </p>
                    </div>
                )}

                <div className="flex gap-3 justify-center">
                    <button
                        onClick={() => window.history.back()}
                        className="btn-secondary text-sm"
                    >
                        <ArrowLeft className="w-4 h-4" /> Quay lại
                    </button>
                    <button
                        onClick={onRetry}
                        className="btn-secondary text-sm"
                    >
                        <RefreshCw className="w-4 h-4" /> Thử lại
                    </button>
                    <a href="/" className="btn-primary text-sm inline-flex items-center gap-2">
                        <Home className="w-4 h-4" /> Trang chủ
                    </a>
                </div>
            </div>
        </div>
    );
}

export default ErrorBoundary;
