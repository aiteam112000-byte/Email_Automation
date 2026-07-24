import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    this.setState({ error, info });
    // Keep console error for developer debugging
    // eslint-disable-next-line no-console
    console.error("ErrorBoundary caught:", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="max-w-3xl w-full bg-white border border-rose-100 rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-bold text-rose-600">Something went wrong</h2>
            <p className="text-sm text-slate-600 mt-2">An error occurred while rendering this page. Technical details follow:</p>
            <pre className="mt-3 p-3 bg-slate-50 border rounded text-xs text-rose-700 overflow-auto" style={{whiteSpace: 'pre-wrap'}}>
              {String(this.state.error && this.state.error.toString())}
              {this.state.info?.componentStack ? `\n\nStack:\n${this.state.info.componentStack}` : ''}
            </pre>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
