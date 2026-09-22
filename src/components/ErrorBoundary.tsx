import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in component tree:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  private handleSafeClearCache = () => {
    if (window.confirm('Khôi phục chế độ an toàn: Hệ thống sẽ đặt lại phiên đăng nhập và bộ nhớ tạm để khắc phục sự cố. Bạn có đồng ý không?')) {
      try {
        localStorage.removeItem('donbosco_auth_user_id');
        localStorage.removeItem('donbosco_auth_rate_limit');
      } catch (e) {
        console.error(e);
      }
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-4">
          <div className="max-w-lg w-full bg-slate-800 border border-slate-700 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-5 text-center">
            <div className="w-16 h-16 bg-rose-500/20 border border-rose-500/40 text-rose-400 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase tracking-wider">
                Chế độ phục hồi an toàn • Don Bosco Đà Lạt
              </span>
              <h1 className="text-lg sm:text-xl font-bold text-white pt-1">
                Đã xảy ra sự cố hiển thị giao diện
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Hệ thống đã tự động kích hoạt màng chắn an toàn để bảo vệ tính toàn vẹn của cơ sở dữ liệu và không làm mất dữ liệu học sinh.
              </p>
            </div>

            {this.state.error && (
              <div className="text-left bg-slate-950/70 border border-slate-700/80 rounded-xl p-3 text-[11px] font-mono text-rose-300 max-h-32 overflow-y-auto break-all">
                {this.state.error.toString()}
              </div>
            )}

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={this.handleReset}
                className="w-full sm:w-auto px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Tải lại trang</span>
              </button>

              <button
                type="button"
                onClick={this.handleSafeClearCache}
                className="w-full sm:w-auto px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border border-slate-600 transition-all cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                <span>Khôi phục an toàn</span>
              </button>
            </div>

            <p className="text-[11px] text-slate-400 pt-1 italic">
              Nếu sự cố tiếp diễn, vui lòng liên hệ Quản trị viên kỹ thuật hoặc Cha Quản Sở Don Bosco Đà Lạt.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
