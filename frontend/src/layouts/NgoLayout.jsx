import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import NgoSidebar from '../components/ngo/NgoSidebar';
import NgoHeader from '../components/ngo/NgoHeader';

class NgoErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('NGO Operations Subsystem Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 max-w-2xl mx-auto my-12 bg-white border border-red-300 rounded-xl shadow-md text-[#173B4D]">
          <div className="flex items-center gap-3 text-red-600 mb-3">
            <span className="material-symbols-outlined text-2xl">error</span>
            <h2 className="text-lg font-bold font-display">Subsystem Interface Notice</h2>
          </div>
          <p className="text-sm text-slate-600 mb-4">
            An issue occurred while rendering this operational screen.
          </p>
          <div className="p-3 bg-red-50 border border-red-200 rounded font-mono text-xs text-red-700 mb-4 overflow-x-auto">
            {this.state.error?.toString() || 'Unknown runtime error'}
          </div>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-[#00C9C1] hover:bg-[#087E8B] text-[#173B4D] hover:text-white rounded-lg text-xs font-bold uppercase tracking-wider"
          >
            Reload Interface
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export const NgoLayout = () => {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#F2FAFA] text-[#173B4D] flex font-sans antialiased selection:bg-[#00C9C1]/20 selection:text-[#087E8B]">
      {/* Persistent Left Sidebar */}
      <NgoSidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      {/* Main Viewport Container */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <NgoHeader onMenuClick={() => setMobileOpen(true)} />

        {/* Dynamic Route Viewport */}
        <main className="w-full lg:pl-64 pt-16 bg-[#F2FAFA] min-h-screen">
          <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
            <NgoErrorBoundary>
              <Outlet />
            </NgoErrorBoundary>
          </div>
        </main>
      </div>
    </div>
  );
};

export default NgoLayout;
