import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { loginNgoUser } from '../services/ngoService';

export const NgoLoginPage = () => {
  const navigate = useNavigate();
  const [agency, setAgency] = useState('Ghost Diving & Marine Alliance');
  const [operatorId, setOperatorId] = useState('officer.maritime@oceanrescue.org');
  const [role, setRole] = useState('Field Recovery Specialist');
  const [password, setPassword] = useState('oceanrescue-demo');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await loginNgoUser({
        operatorId,
        password,
        role,
        agency,
      });
    } catch (err) {
      console.warn('Backend login notice:', err);
    } finally {
      setLoading(false);
      navigate('/ngo/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-surface-container-low text-on-surface font-body-md flex flex-col justify-between py-8 px-gutter-mobile md:px-gutter">
      <div className="max-w-md mx-auto w-full flex-grow flex flex-col justify-center">
        {/* Brand Bar */}
        <div className="text-center mb-6">
          <Link to="/" className="inline-flex items-center gap-2 group mb-3">
            <img
              src="/images/landing/logo.png"
              alt="OceanRescue"
              className="h-10 w-auto object-contain transition-transform group-hover:scale-105"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src =
                  'https://lh3.googleusercontent.com/aida/AEtjO1XaukLRDUdqzy3Nq8ziomsjjb9xo93Nz3PzieRHaUuEtxiVOj5fR7mqZbQg0vkrIv64oQXEcseCED9gt-sUV8t95PHe-4yp8y97hW4RVXxAKNF-qo3rAbpNTT2pMO9QtD7X7CJnwptTEmOrzgQm3L3dE6trdbj3gwwJztXR0-eTD9JSzkVE3CUWg26Kms5NcptqC4Vfl-4D5PETTIxmh1ln2uFJCmytN5DO5DL5tiBsGqCGAm5qK9OHE2A';
              }}
            />
            <span className="font-title-lg text-2xl font-playfair text-on-surface">OceanRescue</span>
          </Link>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container text-secondary font-label-sm text-xs font-bold uppercase tracking-wider">
            <span className="material-symbols-outlined text-[16px]">shield</span>
            <span>NGO Tactical Intelligence Portal</span>
          </div>
        </div>

        {/* Auth Card */}
        <div className="bg-surface-container-lowest rounded-2xl p-6 sm:p-8 shadow-md border border-surface-container flex flex-col gap-5">
          <div>
            <h1 className="font-headline-sm font-playfair text-on-surface leading-snug">
              Sign In to Marine Command
            </h1>
            <p className="font-body-sm text-on-surface-variant mt-1 text-xs leading-relaxed">
              Access real-time GIS incident layers, YOLOv8 detection verification, drift simulations,
              and salvage dispatch workflows.
            </p>
          </div>

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div>
              <label className="font-label-sm uppercase text-[11px] text-on-surface-variant block mb-1">
                Authorized NGO / Agency
              </label>
              <select
                value={agency}
                onChange={(e) => setAgency(e.target.value)}
                className="w-full bg-surface-container-low border border-surface-container rounded-lg px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-secondary"
              >
                <option>Ghost Diving Global Alliance</option>
                <option>The Ocean Cleanup Maritime Team</option>
                <option>Hawaii Marine Patrol &amp; Sanctuary</option>
                <option>Global Ghost Gear Initiative (GGGI)</option>
                <option>NOAA Ocean Guardian Partner</option>
              </select>
            </div>

            <div>
              <label className="font-label-sm uppercase text-[11px] text-on-surface-variant block mb-1">
                Operator ID / Maritime Email
              </label>
              <input
                type="email"
                required
                value={operatorId}
                onChange={(e) => setOperatorId(e.target.value)}
                className="w-full bg-surface-container-low border border-surface-container rounded-lg px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-secondary"
              />
            </div>

            <div>
              <label className="font-label-sm uppercase text-[11px] text-on-surface-variant block mb-1">
                Tactical Access Token / Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-surface-container-low border border-surface-container rounded-lg px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-secondary font-mono"
              />
            </div>

            <div>
              <label className="font-label-sm uppercase text-[11px] text-on-surface-variant block mb-1">
                Operational Clearance Role
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full bg-surface-container-low border border-surface-container rounded-lg px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-secondary"
              >
                <option>Field Recovery Specialist</option>
                <option>GIS Telemetry &amp; Drift Analyst</option>
                <option>AI Sonar Review Officer</option>
                <option>Mission Commander</option>
              </select>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 rounded-lg bg-primary-container text-on-primary-container font-label-md text-xs uppercase tracking-wider font-bold shadow-md hover:opacity-90 active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span>{loading ? 'Authenticating...' : 'Authenticate & Enter Marine Dashboard'}</span>
                <span className="material-symbols-outlined text-[18px]">
                  {loading ? 'sync' : 'arrow_forward'}
                </span>
              </button>
            </div>
          </form>

          {/* Quick Demo Pill Note */}
          <div className="bg-surface-container-low rounded-lg p-3 text-xs text-on-surface-variant border border-surface-container flex items-start gap-2">
            <span className="material-symbols-outlined text-primary text-[18px] flex-shrink-0 mt-0.5">
              info
            </span>
            <span>
              <strong>Demo Environment:</strong> Credentials pre-populated for instant access to the
              OceanRescue GIS Intelligence Suite.
            </span>
          </div>

          <div className="text-center pt-2">
            <Link
              to="/"
              className="text-xs text-secondary hover:text-primary font-semibold transition-colors flex items-center justify-center gap-1"
            >
              <span className="material-symbols-outlined text-[16px]">arrow_back</span>
              <span>Return to Public Landing Page</span>
            </Link>
          </div>
        </div>
      </div>

      <div className="text-center text-xs text-on-surface-variant/70 pt-6">
        <p>© 2025 OceanRescue Alliance. Encrypted Tactical Session.</p>
      </div>
    </div>
  );
};

export default NgoLoginPage;
