import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

/**
 * Screen 1 — NGO Staff Login
 * Converted directly from Stitch designs (screen_1_ngo_staff_login)
 */
export const NgoStaffLogin = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('elena.rostova@oceanrescue.org');
  const [password, setPassword] = useState('••••••••••••');
  const [keepSession, setKeepSession] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Please provide valid authorization credentials.');
      return;
    }

    setLoading(true);
    setError('');

    // Authentic client-side transition to NGO Dashboard
    setTimeout(() => {
      setLoading(false);
      navigate('/ngo/dashboard');
    }, 400);
  };

  return (
    <div className="min-h-screen bg-[#F2FAFA] text-[#173B4D] font-sans flex items-center justify-center p-4 lg:p-8 antialiased">
      <div className="w-full max-w-6xl min-h-[680px] bg-white rounded-2xl shadow-xl border border-[#D8ECEC] overflow-hidden grid grid-cols-1 lg:grid-cols-12">
        {/* Left Hero Column (60% width on desktop) */}
        <div className="lg:col-span-7 relative bg-gradient-to-br from-[#087E8B] to-[#173B4D] text-white p-8 lg:p-12 flex flex-col justify-between overflow-hidden">
          {/* Background Marine Texture & Gradient Overlay */}
          <div className="absolute inset-0 z-0">
            <img
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBwz1JdCq0gTtAGhaUBP8k6U4nch37lN3z_VJSUBZzxf8Dd19qpF388bT6bUADhLSkvPSwio-MYjxNechqqOkzYOGDO99Ngrud_f2SVrQqRlUiFpS5RcYod_wTUT1vMQoLF-WnFAVapOwDI0Lcjpi-eHuiU-_eG2sOfnvJ57UzmB3PN4kJ1_3Z748F6Y1E2yJareWEfIwyEszpgLuSeV7gYL4jndYGq0QNum9Ol-KudCFd3zGIIFWZV"
              alt="Marine conservation habitat"
              className="w-full h-full object-cover opacity-25 mix-blend-overlay"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0b2b3a]/90 via-[#087E8B]/60 to-[#173B4D]/80" />
          </div>

          {/* Header Brand */}
          <div className="relative z-10 flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 p-1.5 flex items-center justify-center shadow-xs">
              <img
                src="/images/landing/logo.png"
                alt="OceanRescue Logo"
                className="w-full h-full object-contain"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src =
                    'https://lh3.googleusercontent.com/aida-public/AB6AXuBiwCiH06fMn1uqRKe2HOv7TxijbrJvJHiyvnbGdcORIZTniyGNFyQyZhewjnLWSdtuFXeKY4hgTBmpbgbWko235ifJPAriAs0M3-XemI8nCwDmo1grIxOEzuCr306t3m4aizpnRlWbZVQFU8LcmpxXa6-KbppKhUTz7slgLB0_RGgY3xj4ITbOLC8wZ_kArx3ieSbEalAZ4p15nlcNPFGqP_h9du6Mk4mH9SYtIN-wDTh4KfPy-Wwm';
                }}
              />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-white block font-display">
                OceanRescue
              </span>
              <span className="text-[11px] font-mono font-medium tracking-wider uppercase text-[#00C9C1]">
                Operations Portal
              </span>
            </div>
          </div>

          {/* Center Hero Message */}
          <div className="relative z-10 my-10 max-w-lg">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-[#00C9C1] text-xs font-semibold mb-5">
              <span className="w-2 h-2 rounded-full bg-[#00C9C1] animate-pulse" />
              ALDFG Marine Geospatial Intelligence
            </div>

            <h1 className="text-3xl lg:text-4xl font-bold text-white tracking-tight leading-tight font-display">
              Protect Our Oceans.
              <br />
              <span className="text-[#00C9C1]">Act With Intelligence.</span>
            </h1>

            <p className="mt-4 text-white/80 text-sm leading-relaxed">
              OceanRescue equips conservation scientists, GIS analysts, and maritime response
              units to verify reported abandoned fishing gear, leverage computer vision, and
              coordinate safe recovery missions worldwide.
            </p>

            {/* Feature metric tags */}
            <div className="grid grid-cols-3 gap-3 mt-8 pt-6 border-t border-white/15">
              <div>
                <div className="text-lg font-bold text-white font-mono">99.2%</div>
                <div className="text-xs text-white/70">System Availability</div>
              </div>
              <div>
                <div className="text-lg font-bold text-[#00C9C1] font-mono">YOLOv8-Seg</div>
                <div className="text-xs text-white/70">Gear Detection</div>
              </div>
              <div>
                <div className="text-lg font-bold text-white font-mono">Role-Based</div>
                <div className="text-xs text-white/70">NGO Workspace</div>
              </div>
            </div>
          </div>

          {/* Footer Tagline */}
          <div className="relative z-10 flex items-center justify-between text-xs text-white/70 pt-4 border-t border-white/10">
            <span className="font-medium tracking-wide text-[#00C9C1]">
              “Every Net Found. Every Life Saved.”
            </span>
            <span className="font-mono text-[10px]">Operations Platform v2.4</span>
          </div>
        </div>

        {/* Right Login Column (40% width on desktop) */}
        <div className="lg:col-span-5 bg-white p-8 lg:p-12 flex flex-col justify-between">
          <div className="flex justify-end">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F2FAFA] border border-[#D8ECEC] text-xs font-medium text-[#087E8B]">
              <span className="material-symbols-outlined text-[16px]">verified_user</span>
              <span>Authorized Staff Only</span>
            </span>
          </div>

          <div className="max-w-sm mx-auto w-full my-auto py-6">
            <h2 className="text-2xl font-bold text-[#173B4D] font-display tracking-tight">
              Welcome Back
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Sign in to your authorized NGO operations workspace.
            </p>

            {error && (
              <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">error</span>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="mt-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#173B4D] uppercase tracking-wider mb-1.5">
                  Staff Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <span className="material-symbols-outlined text-[18px]">mail</span>
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-[#F2FAFA] border border-[#D8ECEC] rounded-lg text-sm text-[#173B4D] focus:outline-none focus:ring-2 focus:ring-[#00C9C1] focus:bg-white transition-all font-medium"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-[#173B4D] uppercase tracking-wider">
                    Access Password
                  </label>
                  <span className="text-xs text-[#087E8B] hover:underline cursor-pointer">
                    Forgot password?
                  </span>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <span className="material-symbols-outlined text-[18px]">lock</span>
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-[#F2FAFA] border border-[#D8ECEC] rounded-lg text-sm text-[#173B4D] focus:outline-none focus:ring-2 focus:ring-[#00C9C1] focus:bg-white transition-all font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={keepSession}
                    onChange={(e) => setKeepSession(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-[#087E8B] focus:ring-[#00C9C1]"
                  />
                  <span className="text-xs text-slate-600">Keep session active (8h)</span>
                </label>
                <span className="text-[11px] font-mono text-slate-400">2FA Verified</span>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-4 py-3 px-4 rounded-lg bg-[#00C9C1] hover:bg-[#087E8B] text-[#173B4D] hover:text-white font-semibold text-xs tracking-wider uppercase transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#00C9C1] disabled:opacity-50"
              >
                <span>{loading ? 'Authenticating...' : 'Sign In to Portal'}</span>
                <span className="material-symbols-outlined text-[18px]">
                  {loading ? 'sync' : 'arrow_forward'}
                </span>
              </button>
            </form>

            <div className="mt-6 p-3 rounded-lg bg-[#F2FAFA] border border-[#D8ECEC] text-xs text-slate-600 flex items-start gap-2.5">
              <span className="material-symbols-outlined text-[18px] text-[#087E8B] flex-shrink-0 mt-0.5">
                info
              </span>
              <span>
                To submit public lost gear reports without staff login credentials, please use the public intake portal.
              </span>
            </div>
          </div>

          <div className="text-center pt-4 border-t border-[#D8ECEC]">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#087E8B] hover:text-[#00C9C1] transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">arrow_back</span>
              <span>Back to OceanRescue Website</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NgoStaffLogin;
