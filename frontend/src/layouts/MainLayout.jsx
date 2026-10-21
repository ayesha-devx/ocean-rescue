import React, { useState } from 'react';
import { Outlet, Link } from 'react-router-dom';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';
import Sidebar from './Sidebar';
import TopHeader from './TopHeader';

class TacticalErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("OceanRescue Tactical Boundary caught error:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 md:p-12 max-w-3xl mx-auto my-12 bg-[#071D33] border border-[#FF6B61] rounded-2xl shadow-2xl text-[#EAF6FF]">
          <div className="flex items-center gap-3 text-[#FF6B61] mb-4">
            <AlertTriangle className="w-8 h-8" />
            <h2 className="text-xl font-bold font-mono tracking-wider">TACTICAL SUBSYSTEM RECOVERY NOTICE</h2>
          </div>
          <p className="text-sm font-mono text-[#91A9BB] mb-4">
            An unexpected render anomaly occurred in this telemetry viewport. The core navigation and data channels remain operational.
          </p>
          <div className="bg-[#061522] p-4 rounded-xl border border-[#16465A] font-mono text-xs text-[#FF6B61] overflow-x-auto mb-6">
            {this.state.error?.toString() || 'Unknown runtime error'}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={this.handleReset}
              className="px-4 py-2 bg-[#00E5FF] hover:bg-[#75E6DA] text-[#061522] rounded-lg font-bold font-mono text-xs flex items-center gap-2 cursor-pointer transition shadow-[0_0_15px_rgba(0,229,255,0.3)]"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset & Reload Subsystem</span>
            </button>
            <Link
              to="/"
              className="px-4 py-2 bg-[#103B50] hover:bg-[#16465A] text-[#EAF6FF] rounded-lg font-mono text-xs flex items-center gap-2 border border-[#16465A]"
            >
              <Home className="w-4 h-4 text-[#00E5FF]" />
              <span>Return to GIS Dashboard</span>
            </Link>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export const MainLayout = () => {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#061522] print:bg-white text-[#EAF6FF] print:text-slate-900 flex font-sans antialiased overflow-x-hidden selection:bg-[#00E5FF]/20 selection:text-[#00E5FF]">
      {/* Persistent Left Tactical Sidebar (Hidden on Print) */}
      <div className="print:hidden">
        <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
      </div>

      {/* Main Content Viewport (offset by 64 / 256px on lg screens, 0 on print) */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64 print:pl-0 print:m-0 print:w-full print:block">
        {/* Top Header (Hidden on Print) */}
        <div className="print:hidden">
          <TopHeader onMenuClick={() => setMobileOpen(true)} />
        </div>

        {/* Dynamic Route Content */}
        <main className="flex-1 w-full overflow-y-auto print:overflow-visible print:h-auto print:p-0">
          <TacticalErrorBoundary>
            <Outlet />
          </TacticalErrorBoundary>
        </main>

        {/* Global Tactical Footer (Hidden on Print) */}
        <footer className="print:hidden mt-auto px-6 md:px-8 py-3.5 border-t border-[#16465A] bg-[#071D33]/60 text-xs font-mono text-[#91A9BB] flex flex-wrap items-center justify-between gap-3 select-none">
          <div className="flex items-center gap-3">
            <span className="text-[#EAF6FF] font-semibold">OceanRescue Marine AI Decision-Support Platform</span>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span className="text-[#75E6DA]">Every Net Found. Every Life Saved.</span>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default MainLayout;
