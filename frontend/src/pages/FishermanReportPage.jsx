import React, { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  validateCoordinates,
  validatePhotoFile,
  formatCoordinatesDisplay,
  submitIncidentReport,
} from '../services/reportService';

export const FishermanReportPage = () => {
  const navigate = useNavigate();

  // Form input state - latitude and longitude start completely empty
  const [formData, setFormData] = useState({
    reporterType: 'Commercial Fisherman',
    reporterName: '',
    contactInfo: '',
    isAnonymous: false,
    gearType: 'Gillnet / Monofilament',
    waterPosition: 'Partially Submerged / Drifting',
    estimatedSize: 'Medium (10 - 50 meters)',
    latitude: '',
    longitude: '',
    locationNotes: '',
    seaState: 'Moderate (2-4 ft chop)',
    wildlifeEntangled: 'No visible entangled wildlife',
    wildlifeDetails: '',
    description: '',
    isDemoCoordinates: false,
  });

  // Media state - starts empty with no dummy photo
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoMeta, setPhotoMeta] = useState(null);

  // Hidden file inputs for standard upload and mobile camera capture
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  // GPS and telemetry interaction states
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState(null);
  const [gpsSuccessMessage, setGpsSuccessMessage] = useState(null);
  const [demoBannerMessage, setDemoBannerMessage] = useState(null);

  // Submission lifecycle states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submissionResult, setSubmissionResult] = useState(null);
  const [errors, setErrors] = useState({});

  /**
   * Browser Geolocation detection with comprehensive permission & error handling
   */
  const handleGpsDetect = () => {
    setGpsError(null);
    setGpsSuccessMessage(null);
    setDemoBannerMessage(null);

    if (!('geolocation' in navigator)) {
      setGpsError(
        'Geolocation is not supported by your current browser. Please enter coordinates manually below.'
      );
      return;
    }

    setGpsLoading(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude.toFixed(5);
        const lng = position.coords.longitude.toFixed(5);
        const accuracy = Math.round(position.coords.accuracy || 0);

        setFormData((prev) => ({
          ...prev,
          latitude: lat,
          longitude: lng,
          locationNotes: prev.locationNotes || 'GPS Auto-detected via onboard browser telemetry',
          isDemoCoordinates: false,
        }));

        setErrors((prev) => {
          const updated = { ...prev };
          delete updated.latitude;
          delete updated.longitude;
          return updated;
        });

        setGpsSuccessMessage(
          `GPS Position Acquired: ${formatCoordinatesDisplay(lat, lng)} (Accuracy: ±${accuracy}m)`
        );
        setGpsLoading(false);
      },
      (error) => {
        setGpsLoading(false);
        // Do NOT silently use demo or coastal coordinates!
        let msg = 'Unable to detect GPS position. Please enter coordinates manually.';
        if (error.code === error.PERMISSION_DENIED) {
          msg =
            'GPS location access was denied. Please allow location permissions in your browser or enter coordinates manually.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          msg =
            'Location telemetry unavailable from your device or network. Please enter coordinates manually.';
        } else if (error.code === error.TIMEOUT) {
          msg =
            'GPS detection request timed out. Please retry or enter coordinates manually.';
        }
        setGpsError(msg);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  /**
   * Explicit Demo Mode: Supplies labeled sample coordinates for interface evaluation
   */
  const handleLoadDemoCoordinates = () => {
    setGpsError(null);
    setGpsSuccessMessage(null);

    const demoLat = '21.3069';
    const demoLng = '-157.8583';

    setFormData((prev) => ({
      ...prev,
      latitude: demoLat,
      longitude: demoLng,
      locationNotes: 'Sector 04-Pacific, ~8 NM off Oahu reef shelf (Demo Fix)',
      isDemoCoordinates: true,
    }));

    setErrors((prev) => {
      const updated = { ...prev };
      delete updated.latitude;
      delete updated.longitude;
      return updated;
    });

    setDemoBannerMessage(
      'Demo Mode: Sample coordinates (21.3069° N, 157.8583° W) applied for testing. Remember to use real GPS coordinates for actual maritime incidents.'
    );
  };

  /**
   * Reset coordinates to empty
   */
  const handleClearCoordinates = () => {
    setFormData((prev) => ({
      ...prev,
      latitude: '',
      longitude: '',
      locationNotes: '',
      isDemoCoordinates: false,
    }));
    setGpsError(null);
    setGpsSuccessMessage(null);
    setDemoBannerMessage(null);
  };

  /**
   * Photo selection with file format and 20MB size validation
   */
  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validatePhotoFile(file);
    if (!validation.isValid) {
      setErrors((prev) => ({ ...prev, photo: validation.error }));
      e.target.value = '';
      return;
    }

    // Clean up previous preview URL to prevent memory leaks
    if (photoPreview && photoPreview.startsWith('blob:')) {
      URL.revokeObjectURL(photoPreview);
    }

    setPhotoFile(file);
    const sizeFormatted = (file.size / (1024 * 1024)).toFixed(2) + ' MB';
    setPhotoMeta({ name: file.name, sizeFormatted });
    setPhotoPreview(URL.createObjectURL(file));

    setErrors((prev) => {
      const updated = { ...prev };
      delete updated.photo;
      return updated;
    });
  };

  /**
   * Remove attached photo and reset file inputs
   */
  const handleRemovePhoto = () => {
    if (photoPreview && photoPreview.startsWith('blob:')) {
      URL.revokeObjectURL(photoPreview);
    }
    setPhotoFile(null);
    setPhotoPreview(null);
    setPhotoMeta(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
    setErrors((prev) => {
      const updated = { ...prev };
      delete updated.photo;
      return updated;
    });
  };

  /**
   * Form validation & submission with duplicate submission lock
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    // Validate coordinates
    const coordValidation = validateCoordinates(formData.latitude, formData.longitude);
    const newErrors = { ...coordValidation.errors };

    // Validate required gear type
    if (!formData.gearType || !formData.gearType.trim()) {
      newErrors.gearType = 'Please select a valid gear category';
    }

    // If wildlife entangled is "Yes", strongly encourage details
    if (
      formData.wildlifeEntangled &&
      formData.wildlifeEntangled.startsWith('Yes') &&
      !formData.wildlifeDetails.trim()
    ) {
      newErrors.wildlifeDetails =
        'Please describe the entangled marine life species or urgent condition';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      // Scroll to first error
      const firstErrorKey = Object.keys(newErrors)[0];
      const errorElement = document.querySelector(`[data-error-field="${firstErrorKey}"]`);
      if (errorElement) {
        errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    try {
      const result = await submitIncidentReport(formData, photoFile);
      if (!result.success) {
        setErrors({ form: result.error || 'Failed to submit report. Please check your connection and try again.' });
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      setSubmissionResult(result);
      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error('Submission processing error:', err);
      setErrors({ form: err.message || 'An unexpected error occurred while processing the report.' });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Reset form for reporting another piece of gear
   */
  const handleResetForm = () => {
    setSubmitted(false);
    setSubmissionResult(null);
    setFormData({
      reporterType: 'Commercial Fisherman',
      reporterName: '',
      contactInfo: '',
      isAnonymous: false,
      gearType: 'Gillnet / Monofilament',
      waterPosition: 'Partially Submerged / Drifting',
      estimatedSize: 'Medium (10 - 50 meters)',
      latitude: '',
      longitude: '',
      locationNotes: '',
      seaState: 'Moderate (2-4 ft chop)',
      wildlifeEntangled: 'No visible entangled wildlife',
      wildlifeDetails: '',
      description: '',
      isDemoCoordinates: false,
    });
    handleRemovePhoto();
    setGpsError(null);
    setGpsSuccessMessage(null);
    setDemoBannerMessage(null);
    setErrors({});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Compute live human-readable coordinate display if valid
  const coordinatesDisplay = formatCoordinatesDisplay(formData.latitude, formData.longitude);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#EBF6F5] via-[#E0F0EF] to-[#EAF6F5] text-[#071B2B] font-sans py-8 px-4 sm:px-6 lg:px-8 relative selection:bg-[#00D5D2]/30 selection:text-[#071B2B]">
      {/* Subtle Marine Ambient Background Glow */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-72 bg-gradient-to-b from-[#00D5D2]/10 via-[#075E63]/5 to-transparent pointer-events-none blur-3xl -z-0"
        aria-hidden="true"
      />

      <div className="max-w-4xl mx-auto relative z-10">
        {/* Top Header Bar with Soft Sea-Glass Background Contrast */}
        <header className="flex items-center justify-between gap-4 mb-8 pb-4 border-b border-[#B4D9D7]">
          <Link
            to="/"
            className="flex items-center gap-3 group focus:outline-none focus:ring-2 focus:ring-[#075E63] rounded-lg p-1"
            title="OceanRescue Alliance - Home"
          >
            <div className="w-10 h-10 rounded-xl bg-white border border-[#B4D9D7] p-1.5 flex items-center justify-center shadow-xs group-hover:border-[#075E63] transition-colors">
              <img
                src="/images/landing/logo.png"
                alt="OceanRescue Alliance"
                className="h-full w-auto object-contain"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src =
                    'https://lh3.googleusercontent.com/aida/AEtjO1XaukLRDUdqzy3Nq8ziomsjjb9xo93Nz3PzieRHaUuEtxiVOj5fR7mqZbQg0vkrIv64oQXEcseCED9gt-sUV8t95PHe-4yp8y97hW4RVXxAKNF-qo3rAbpNTT2pMO9QtD7X7CJnwptTEmOrzgQm3L3dE6trdbj3gwwJztXR0-eTD9JSzkVE3CUWg26Kms5NcptqC4Vfl-4D5PETTIxmh1ln2uFJCmytN5DO5DL5tiBsGqCGAm5qK9OHE2A';
                }}
              />
            </div>
            <div className="flex flex-col">
              <span className="font-playfair text-xl font-bold text-[#071B2B] group-hover:text-[#075E63] transition-colors tracking-tight">
                OceanRescue
              </span>
              <span className="font-mono text-[11px] font-bold text-[#075E63] tracking-wider uppercase">
                Mariner Public Reporting Portal
              </span>
            </div>
          </Link>

          <nav className="flex items-center gap-3">
            <Link
              to="/"
              className="px-3.5 py-2 rounded-lg bg-white hover:bg-slate-50 text-[#071B2B] hover:text-[#075E63] text-xs font-semibold border border-[#B4D9D7] hover:border-[#075E63] transition-all flex items-center gap-1.5 shadow-2xs focus:outline-none focus:ring-2 focus:ring-[#075E63]"
            >
              <span className="material-symbols-outlined text-[16px] text-[#075E63]">arrow_back</span>
              <span>Back to Home</span>
            </Link>
            <Link
              to="/ngo-login"
              className="hidden sm:inline-flex px-4 py-2 rounded-lg bg-[#075E63] hover:bg-[#0B2D42] text-white text-xs font-bold border border-[#075E63] transition-all shadow-xs focus:outline-none focus:ring-2 focus:ring-[#075E63]"
            >
              NGO Staff Login
            </Link>
          </nav>
        </header>

        {/* ============================================================== */}
        {/* CONFIRMATION / SUCCESS VIEW */}
        {/* ============================================================== */}
        {submitted && submissionResult ? (
          <section
            aria-live="polite"
            className="bg-white rounded-2xl p-6 md:p-10 shadow-xl shadow-[#075E63]/10 border border-[#B4D9D7] text-center animate-fadeIn"
          >
            {/* Live Operational Confirmation Banner */}
            <div className="w-16 h-16 rounded-full bg-[#00D5D2]/20 text-[#075E63] mx-auto flex items-center justify-center mb-4 border border-[#00D5D2]/40">
              <span className="material-symbols-outlined text-[38px] text-[#075E63]">
                check_circle
              </span>
            </div>

            {/* Live Mode Tag */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#EAF6F5] text-[#075E63] text-xs font-bold uppercase tracking-wider mb-3 border border-[#B4D9D7]">
              <span className="w-2 h-2 rounded-full bg-[#00D5D2] animate-ping" />
              Live Incident Registered in Database
            </div>

            <h1 className="text-2xl sm:text-3xl font-playfair font-bold text-[#071B2B] mb-2">
              Thank You for Protecting Our Oceans
            </h1>

            <p className="text-sm text-slate-600 max-w-xl mx-auto mb-6 leading-relaxed">
              Your lost gear incident report has been securely registered with the OceanRescue incident telemetry database. Partner NGO salvage crews and recovery planners can now inspect and triage the vector.
            </p>

            {/* Incident Dossier Ticket */}
            <div className="bg-[#EAF6F5]/70 rounded-xl p-5 max-w-xl mx-auto text-left border border-[#B4D9D7] mb-8 font-mono text-xs shadow-inner">
              <div className="flex flex-wrap items-center justify-between pb-3 border-b border-[#B4D9D7] mb-3 gap-2">
                <span className="text-[#075E63] font-bold uppercase tracking-wider">
                  INCIDENT DOSSIER ID
                </span>
                <span className="text-[#071B2B] font-bold text-sm bg-white px-2.5 py-1 rounded border border-[#B4D9D7]">
                  #{submissionResult.reportId}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-700">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold block mb-0.5">
                    GEAR CLASSIFICATION
                  </span>
                  <span className="text-[#071B2B] font-semibold">{formData.gearType}</span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold block mb-0.5">
                    INTAKE STATUS TIER
                  </span>
                  <span className="font-semibold text-emerald-700">
                    REGISTERED (PENDING NGO TRIAGE)
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold block mb-0.5">
                    GEOSPATIAL COORDINATES
                  </span>
                  <span className="text-[#071B2B] font-semibold">
                    {coordinatesDisplay || `${formData.latitude}, ${formData.longitude}`}
                    {formData.isDemoCoordinates && (
                      <span className="text-[10px] text-amber-700 block font-normal">
                        (Sample Demo Coordinates)
                      </span>
                    )}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold block mb-0.5">
                    WATER POSITION &amp; MASS
                  </span>
                  <span className="text-[#071B2B] font-semibold">
                    {formData.waterPosition} ({formData.estimatedSize})
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold block mb-0.5">
                    REPORTER STATUS
                  </span>
                  <span className="text-[#071B2B] font-semibold">
                    {formData.isAnonymous
                      ? 'Anonymous Mariner (No identifying data)'
                      : formData.reporterName || 'Confidential Citizen'}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold block mb-0.5">
                    WILDLIFE RISK STATUS
                  </span>
                  <span
                    className={`font-semibold ${
                      formData.wildlifeEntangled.startsWith('Yes')
                        ? 'text-red-700 font-bold'
                        : 'text-[#071B2B]'
                    }`}
                  >
                    {formData.wildlifeEntangled}
                  </span>
                </div>

                {photoPreview && (
                  <div className="sm:col-span-2 pt-2 border-t border-[#B4D9D7]/60 flex items-center gap-3">
                    <img
                      src={photoPreview}
                      alt="Submitted gear preview"
                      className="w-14 h-14 object-cover rounded-lg border border-[#B4D9D7]"
                    />
                    <div className="text-[11px]">
                      <span className="text-[#075E63] font-bold block">
                        Water Photograph Attached
                      </span>
                      <span className="text-slate-500">
                        {photoMeta?.name} ({photoMeta?.sizeFormatted})
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Post-Submission Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={handleResetForm}
                className="w-full sm:w-auto px-6 py-3 rounded-lg bg-white hover:bg-[#EAF6F5] text-[#071B2B] border border-[#075E63]/40 text-xs uppercase tracking-wider font-bold transition-all shadow-xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#075E63]"
              >
                Report Another Net / Gear
              </button>

              <Link
                to="/"
                className="w-full sm:w-auto px-6 py-3 rounded-lg bg-[#075E63] hover:bg-[#0B2D42] text-white text-xs uppercase tracking-wider font-bold transition-all text-center shadow-sm focus:outline-none focus:ring-2 focus:ring-[#00D5D2]"
              >
                Return to Landing Page
              </Link>

              {submissionResult.reportId && (
                <Link
                  to={`/ngo/incidents/${submissionResult.reportId}`}
                  className="w-full sm:w-auto px-6 py-3 rounded-lg bg-[#00C9C1] hover:bg-[#00b5ae] text-[#173B4D] text-xs uppercase tracking-wider font-bold transition-all text-center shadow-md focus:outline-none focus:ring-2 focus:ring-[#087E8B] flex items-center justify-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">visibility</span>
                  <span>Inspect in Incident Queue</span>
                </Link>
              )}

              <Link
                to="/ngo/dashboard"
                className="w-full sm:w-auto px-6 py-3 rounded-lg bg-white hover:bg-slate-50 text-[#075E63] border border-[#075E63] text-xs uppercase tracking-wider font-bold transition-all text-center shadow-xs focus:outline-none focus:ring-2 focus:ring-[#087E8B]"
              >
                NGO Dashboard
              </Link>
            </div>
          </section>
        ) : (
          /* ============================================================== */
          /* REPORT INTAKE FORM */
          /* ============================================================== */
          <form
            onSubmit={handleSubmit}
            noValidate
            className="bg-white rounded-2xl p-6 sm:p-8 md:p-10 shadow-xl shadow-[#075E63]/8 border border-[#B4D9D7] flex flex-col gap-6"
          >
            {/* Form Title & Context Header */}
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EAF6F5] text-[#075E63] border border-[#B4D9D7] text-xs font-mono font-bold uppercase tracking-wider mb-3">
                <span className="material-symbols-outlined text-[16px]">add_location_alt</span>
                Rapid Marine Incident Intake
              </div>

              <h1 className="text-2xl sm:text-3xl font-playfair font-bold text-[#071B2B] mb-2 tracking-tight">
                Report Lost or Abandoned Fishing Gear
              </h1>

              <p className="text-sm text-slate-600 max-w-2xl leading-relaxed">
                Provide the location and characteristics of ghost nets, derelict traps, or lines.
                Every report directly informs targeted NGO retrieval missions and prevents marine
                wildlife entanglements.
              </p>
            </div>

            {/* General Form Error Banner if any */}
            {errors.form && (
              <div
                role="alert"
                className="p-4 rounded-xl bg-red-50 border border-red-300 text-red-800 text-sm flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-red-600 text-[20px]">error</span>
                <span>{errors.form}</span>
              </div>
            )}

            {/* ============================================================ */}
            {/* 1. REPORTER DETAILS */}
            {/* ============================================================ */}
            <fieldset className="bg-[#EAF6F5]/70 p-5 sm:p-6 rounded-xl border border-[#B4D9D7]">
              <legend className="sr-only">1. Reporter Details</legend>
              <div className="flex items-center justify-between gap-2 mb-4">
                <h2 className="text-[#071B2B] font-bold text-base flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-lg bg-[#075E63] text-[#36F4D0] flex items-center justify-center font-bold text-sm shadow-xs">
                    1
                  </span>
                  <span>Reporter Details</span>
                </h2>
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#075E63] bg-white border border-[#B4D9D7] px-2 py-0.5 rounded-full font-semibold">
                  Identity Protection
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Mariner Role */}
                <div>
                  <label
                    htmlFor="reporterType"
                    className="block text-xs font-bold uppercase tracking-wider text-[#071B2B] mb-1.5"
                  >
                    Your Mariner Role
                  </label>
                  <select
                    id="reporterType"
                    value={formData.reporterType}
                    onChange={(e) => setFormData({ ...formData, reporterType: e.target.value })}
                    className="w-full bg-white border border-[#B2D5D3] rounded-lg px-3 py-2.5 text-sm text-[#071B2B] font-medium focus:outline-none focus:border-[#00D5D2] focus:ring-2 focus:ring-[#00D5D2]/25 transition-all shadow-2xs"
                  >
                    <option>Commercial Fisherman</option>
                    <option>Recreational Boater / Mariner</option>
                    <option>Scuba / Free Diver</option>
                    <option>Harbor Master / Port Authority</option>
                    <option>NGO / Marine Biologist</option>
                    <option>Other Coastal Citizen</option>
                  </select>
                </div>

                {/* Vessel or Reporter Name */}
                <div>
                  <label
                    htmlFor="reporterName"
                    className="block text-xs font-bold uppercase tracking-wider text-[#071B2B] mb-1.5"
                  >
                    Vessel / Name <span className="text-slate-500 font-normal lowercase">(optional)</span>
                  </label>
                  <input
                    id="reporterName"
                    type="text"
                    placeholder={
                      formData.isAnonymous ? 'Omitted (Anonymous Report)' : 'e.g. F/V Pacific Star or John D.'
                    }
                    value={formData.isAnonymous ? '' : formData.reporterName}
                    disabled={formData.isAnonymous}
                    onChange={(e) => setFormData({ ...formData, reporterName: e.target.value })}
                    className="w-full bg-white border border-[#B2D5D3] rounded-lg px-3 py-2.5 text-sm text-[#071B2B] placeholder-slate-400 focus:outline-none focus:border-[#00D5D2] focus:ring-2 focus:ring-[#00D5D2]/25 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed transition-all shadow-2xs"
                  />
                </div>

                {/* Radio / Contact Info */}
                <div>
                  <label
                    htmlFor="contactInfo"
                    className="block text-xs font-bold uppercase tracking-wider text-[#071B2B] mb-1.5"
                  >
                    Radio / Phone / Email{' '}
                    <span className="text-slate-500 font-normal lowercase">(optional)</span>
                  </label>
                  <input
                    id="contactInfo"
                    type="text"
                    placeholder={
                      formData.isAnonymous ? 'Omitted (Anonymous Report)' : 'VHF Ch 16 / Phone / Email'
                    }
                    value={formData.isAnonymous ? '' : formData.contactInfo}
                    disabled={formData.isAnonymous}
                    onChange={(e) => setFormData({ ...formData, contactInfo: e.target.value })}
                    className="w-full bg-white border border-[#B2D5D3] rounded-lg px-3 py-2.5 text-sm text-[#071B2B] placeholder-slate-400 focus:outline-none focus:border-[#00D5D2] focus:ring-2 focus:ring-[#00D5D2]/25 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed transition-all shadow-2xs"
                  />
                </div>
              </div>

              {/* Anonymous Checkbox with clear reassurance */}
              <div className="mt-4 pt-3 border-t border-[#B4D9D7]/60 flex items-start gap-2.5 bg-white/70 p-3 rounded-lg border border-[#B4D9D7]/80">
                <input
                  type="checkbox"
                  id="anonymousCheck"
                  checked={formData.isAnonymous}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setFormData((prev) => ({
                      ...prev,
                      isAnonymous: checked,
                      reporterName: '',
                      contactInfo: '',
                    }));
                  }}
                  className="mt-0.5 h-4 w-4 rounded border-[#075E63] text-[#075E63] focus:ring-[#00D5D2] cursor-pointer"
                />
                <label htmlFor="anonymousCheck" className="text-xs text-slate-700 cursor-pointer">
                  <strong className="text-[#071B2B] font-semibold block">
                    Submit Anonymously (Strict Privacy Guarantee)
                  </strong>
                  Check this box to ensure zero personal identifying information or vessel callsigns
                  are logged or transmitted in this lost gear report.
                </label>
              </div>
            </fieldset>

            {/* ============================================================ */}
            {/* 2. INCIDENT COORDINATES & SECTOR */}
            {/* ============================================================ */}
            <fieldset
              data-error-field="latitude"
              className="bg-[#EAF6F5]/70 p-5 sm:p-6 rounded-xl border border-[#B4D9D7]"
            >
              <legend className="sr-only">2. Incident Coordinates &amp; Sector</legend>
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-lg bg-[#075E63] text-[#36F4D0] flex items-center justify-center font-bold text-sm shadow-xs">
                    2
                  </span>
                  <div>
                    <h2 className="text-[#071B2B] font-bold text-base">
                      Incident Coordinates &amp; Sector
                    </h2>
                    <span className="text-[11px] text-slate-600 block">
                      Required for tactical dispatch &amp; drift tracking
                    </span>
                  </div>
                </div>

                {/* Telemetry Actions: Auto-Detect GPS & Demo Coordinates */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleGpsDetect}
                    disabled={gpsLoading}
                    aria-label="Auto-Detect Current GPS Coordinates"
                    className="px-3.5 py-2 rounded-lg bg-white hover:bg-[#EAF6F5] text-[#075E63] hover:text-[#0B2D42] border-2 border-[#075E63] hover:border-[#00D5D2] text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-xs transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#075E63] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span
                      className={`material-symbols-outlined text-[18px] ${
                        gpsLoading ? 'animate-spin' : ''
                      }`}
                    >
                      {gpsLoading ? 'sync' : 'my_location'}
                    </span>
                    <span>{gpsLoading ? 'Detecting GPS...' : 'Auto-Detect Current GPS'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleLoadDemoCoordinates}
                    title="Load sample coordinates for interface demonstration"
                    className="px-3 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-700 hover:text-[#071B2B] border border-slate-300 hover:border-[#075E63] text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#075E63]"
                  >
                    <span className="material-symbols-outlined text-[16px] text-[#075E63]">
                      science
                    </span>
                    <span>Load Demo Sample</span>
                  </button>

                  {(formData.latitude || formData.longitude) && (
                    <button
                      type="button"
                      onClick={handleClearCoordinates}
                      title="Clear coordinates"
                      className="px-2.5 py-2 rounded-lg bg-white hover:bg-red-50 text-red-700 border border-red-200 text-xs font-semibold transition-all cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* GPS Geolocation Feedback Banners */}
              {gpsLoading && (
                <div className="mb-4 p-3 rounded-lg bg-cyan-50 border border-cyan-200 text-cyan-900 text-xs flex items-center gap-2 animate-pulse">
                  <span className="material-symbols-outlined text-[18px] text-[#075E63] animate-spin">
                    sync
                  </span>
                  <span>Acquiring high-accuracy browser geolocation fix from device sensors...</span>
                </div>
              )}

              {gpsError && (
                <div
                  role="alert"
                  className="mb-4 p-3.5 rounded-lg bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-start gap-2.5"
                >
                  <span className="material-symbols-outlined text-[20px] text-amber-700 flex-shrink-0 mt-0.5">
                    location_off
                  </span>
                  <div>
                    <strong className="block font-bold">GPS Geolocation Unavailable</strong>
                    <span>{gpsError}</span>
                  </div>
                </div>
              )}

              {gpsSuccessMessage && (
                <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-emerald-700">
                    check_circle
                  </span>
                  <span className="font-semibold">{gpsSuccessMessage}</span>
                </div>
              )}

              {demoBannerMessage && (
                <div className="mb-4 p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-start gap-2">
                  <span className="material-symbols-outlined text-[18px] text-[#075E63] flex-shrink-0 mt-0.5">
                    info
                  </span>
                  <span>{demoBannerMessage}</span>
                </div>
              )}

              {/* Coordinates Form Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {/* Latitude Input */}
                <div>
                  <label
                    htmlFor="latitudeInput"
                    className="block text-xs font-bold uppercase tracking-wider text-[#071B2B] mb-1"
                  >
                    Latitude (Decimal Degrees) <span className="text-red-600 font-bold">*</span>
                  </label>
                  <span className="text-[10px] text-slate-500 block mb-1.5 font-mono">
                    -90.0000° to +90.0000° (North +, South -)
                  </span>
                  <input
                    id="latitudeInput"
                    type="text"
                    required
                    placeholder="e.g. 21.3069"
                    value={formData.latitude}
                    onChange={(e) => {
                      setFormData({
                        ...formData,
                        latitude: e.target.value,
                        isDemoCoordinates: false,
                      });
                      if (errors.latitude) {
                        setErrors((prev) => {
                          const updated = { ...prev };
                          delete updated.latitude;
                          return updated;
                        });
                      }
                    }}
                    className={`w-full bg-white border rounded-lg px-3 py-2.5 text-sm text-[#071B2B] font-mono focus:outline-none focus:ring-2 transition-all shadow-2xs ${
                      errors.latitude
                        ? 'border-red-500 focus:border-red-500 focus:ring-red-200'
                        : 'border-[#B2D5D3] focus:border-[#00D5D2] focus:ring-[#00D5D2]/25'
                    }`}
                  />
                  {errors.latitude && (
                    <p className="text-xs text-red-600 font-medium mt-1 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">error</span>
                      {errors.latitude}
                    </p>
                  )}
                </div>

                {/* Longitude Input */}
                <div>
                  <label
                    htmlFor="longitudeInput"
                    className="block text-xs font-bold uppercase tracking-wider text-[#071B2B] mb-1"
                  >
                    Longitude (Decimal Degrees) <span className="text-red-600 font-bold">*</span>
                  </label>
                  <span className="text-[10px] text-slate-500 block mb-1.5 font-mono">
                    -180.0000° to +180.0000° (East +, West -)
                  </span>
                  <input
                    id="longitudeInput"
                    type="text"
                    required
                    placeholder="e.g. -157.8583"
                    value={formData.longitude}
                    onChange={(e) => {
                      setFormData({
                        ...formData,
                        longitude: e.target.value,
                        isDemoCoordinates: false,
                      });
                      if (errors.longitude) {
                        setErrors((prev) => {
                          const updated = { ...prev };
                          delete updated.longitude;
                          return updated;
                        });
                      }
                    }}
                    className={`w-full bg-white border rounded-lg px-3 py-2.5 text-sm text-[#071B2B] font-mono focus:outline-none focus:ring-2 transition-all shadow-2xs ${
                      errors.longitude
                        ? 'border-red-500 focus:border-red-500 focus:ring-red-200'
                        : 'border-[#B2D5D3] focus:border-[#00D5D2] focus:ring-[#00D5D2]/25'
                    }`}
                  />
                  {errors.longitude && (
                    <p className="text-xs text-red-600 font-medium mt-1 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">error</span>
                      {errors.longitude}
                    </p>
                  )}
                </div>

                {/* Location Description / Landmark */}
                <div className="sm:col-span-2 md:col-span-1">
                  <label
                    htmlFor="locationNotesInput"
                    className="block text-xs font-bold uppercase tracking-wider text-[#071B2B] mb-1"
                  >
                    Location Description / Landmark{' '}
                    <span className="text-slate-500 font-normal lowercase">(optional)</span>
                  </label>
                  <span className="text-[10px] text-slate-500 block mb-1.5">
                    Sector reference, distance off reef, buoy marker
                  </span>
                  <input
                    id="locationNotesInput"
                    type="text"
                    placeholder="e.g. ~8 NM off reef shelf, Channel 4"
                    value={formData.locationNotes}
                    onChange={(e) => setFormData({ ...formData, locationNotes: e.target.value })}
                    className="w-full bg-white border border-[#B2D5D3] rounded-lg px-3 py-2.5 text-sm text-[#071B2B] focus:outline-none focus:border-[#00D5D2] focus:ring-2 focus:ring-[#00D5D2]/25 transition-all shadow-2xs"
                  />
                </div>
              </div>

              {/* Formatted Geospatial Target Confirmation Badge */}
              {coordinatesDisplay && (
                <div className="mt-3.5 p-2.5 rounded-lg bg-white border border-[#075E63]/30 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#075E63] text-[18px]">
                      pin_drop
                    </span>
                    <span className="text-[#071B2B] font-semibold">
                      Selected Coordinate Fix: <span className="font-mono text-[#075E63] font-bold">{coordinatesDisplay}</span>
                    </span>
                  </div>
                  {formData.isDemoCoordinates && (
                    <span className="text-[10px] uppercase font-mono font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded border border-amber-300">
                      Demo Mode Value
                    </span>
                  )}
                </div>
              )}
            </fieldset>

            {/* ============================================================ */}
            {/* 3. GEAR CHARACTERISTICS */}
            {/* ============================================================ */}
            <fieldset
              data-error-field="gearType"
              className="bg-[#EAF6F5]/70 p-5 sm:p-6 rounded-xl border border-[#B4D9D7]"
            >
              <legend className="sr-only">3. Gear Characteristics</legend>
              <div className="flex items-center justify-between gap-2 mb-4">
                <h2 className="text-[#071B2B] font-bold text-base flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-lg bg-[#075E63] text-[#36F4D0] flex items-center justify-center font-bold text-sm shadow-xs">
                    3
                  </span>
                  <span>Gear Characteristics</span>
                </h2>
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#075E63] bg-white border border-[#B4D9D7] px-2 py-0.5 rounded-full font-semibold">
                  ALDFG Classification
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Gear Category (Required) */}
                <div>
                  <label
                    htmlFor="gearTypeSelect"
                    className="block text-xs font-bold uppercase tracking-wider text-[#071B2B] mb-1.5"
                  >
                    Gear Category <span className="text-red-600 font-bold">*</span>
                  </label>
                  <select
                    id="gearTypeSelect"
                    value={formData.gearType}
                    onChange={(e) => {
                      setFormData({ ...formData, gearType: e.target.value });
                      if (errors.gearType) {
                        setErrors((prev) => {
                          const updated = { ...prev };
                          delete updated.gearType;
                          return updated;
                        });
                      }
                    }}
                    className={`w-full bg-white border rounded-lg px-3 py-2.5 text-sm text-[#071B2B] font-medium focus:outline-none focus:ring-2 transition-all shadow-2xs ${
                      errors.gearType
                        ? 'border-red-500 focus:border-red-500 focus:ring-red-200'
                        : 'border-[#B2D5D3] focus:border-[#00D5D2] focus:ring-[#00D5D2]/25'
                    }`}
                  >
                    <option>Gillnet / Monofilament</option>
                    <option>Trawl Net / Bag</option>
                    <option>Crab / Lobster Pot &amp; Line</option>
                    <option>Longline with Gangions</option>
                    <option>FAD / Moored Buoy Structure</option>
                    <option>Seine Net Bundle</option>
                    <option>Unidentified Net Mass</option>
                  </select>
                  {errors.gearType && (
                    <p className="text-xs text-red-600 font-medium mt-1">{errors.gearType}</p>
                  )}
                </div>

                {/* Water Position */}
                <div>
                  <label
                    htmlFor="waterPositionSelect"
                    className="block text-xs font-bold uppercase tracking-wider text-[#071B2B] mb-1.5"
                  >
                    Water Position
                  </label>
                  <select
                    id="waterPositionSelect"
                    value={formData.waterPosition}
                    onChange={(e) => setFormData({ ...formData, waterPosition: e.target.value })}
                    className="w-full bg-white border border-[#B2D5D3] rounded-lg px-3 py-2.5 text-sm text-[#071B2B] font-medium focus:outline-none focus:border-[#00D5D2] focus:ring-2 focus:ring-[#00D5D2]/25 transition-all shadow-2xs"
                  >
                    <option>Partially Submerged / Drifting</option>
                    <option>Floating at Surface</option>
                    <option>Snagged on Coral Reef / Seabed</option>
                    <option>Washed Ashore / Coastal Edge</option>
                    <option>Subsurface (5 - 20m depth)</option>
                  </select>
                </div>

                {/* Estimated Size / Mass */}
                <div>
                  <label
                    htmlFor="estimatedSizeSelect"
                    className="block text-xs font-bold uppercase tracking-wider text-[#071B2B] mb-1.5"
                  >
                    Estimated Size / Mass
                  </label>
                  <select
                    id="estimatedSizeSelect"
                    value={formData.estimatedSize}
                    onChange={(e) => setFormData({ ...formData, estimatedSize: e.target.value })}
                    className="w-full bg-white border border-[#B2D5D3] rounded-lg px-3 py-2.5 text-sm text-[#071B2B] font-medium focus:outline-none focus:border-[#00D5D2] focus:ring-2 focus:ring-[#00D5D2]/25 transition-all shadow-2xs"
                  >
                    <option>Small (&lt; 10 meters / single trap)</option>
                    <option>Medium (10 - 50 meters)</option>
                    <option>Large (50 - 200 meters)</option>
                    <option>Massive Industrial Net (&gt; 200 meters)</option>
                  </select>
                </div>
              </div>
            </fieldset>

            {/* ============================================================ */}
            {/* 4. VISUAL OBSERVATION & WILDLIFE */}
            {/* ============================================================ */}
            <fieldset
              data-error-field="wildlifeDetails"
              className="bg-[#EAF6F5]/70 p-5 sm:p-6 rounded-xl border border-[#B4D9D7]"
            >
              <legend className="sr-only">4. Visual Observation &amp; Wildlife</legend>
              <div className="flex items-center justify-between gap-2 mb-4">
                <h2 className="text-[#071B2B] font-bold text-base flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-lg bg-[#075E63] text-[#36F4D0] flex items-center justify-center font-bold text-sm shadow-xs">
                    4
                  </span>
                  <span>Visual Observation &amp; Wildlife</span>
                </h2>
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#075E63] bg-white border border-[#B4D9D7] px-2 py-0.5 rounded-full font-semibold">
                  Field Media &amp; Ecology
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Photographic Evidence (Optional Upload or Mobile Camera) */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#071B2B] mb-1.5">
                    Water Photograph <span className="text-slate-500 font-normal lowercase">(optional)</span>
                  </label>

                  {/* Hidden file inputs */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/heic,.png,.jpg,.jpeg,.webp,.heic"
                    onChange={handlePhotoSelect}
                    className="hidden"
                    id="standardFileInput"
                  />
                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handlePhotoSelect}
                    className="hidden"
                    id="cameraFileInput"
                  />

                  {photoPreview ? (
                    /* Attached Photo Preview Container */
                    <div className="bg-white p-3 rounded-xl border border-[#B4D9D7] flex items-center gap-3 shadow-2xs">
                      <div className="w-20 h-20 rounded-lg overflow-hidden border border-[#B4D9D7] bg-slate-100 flex-shrink-0 relative group">
                        <img
                          src={photoPreview}
                          alt="Uploaded gear observation"
                          className="w-full h-full object-cover"
                        />
                      </div>

                      <div className="flex-1 min-w-0 text-xs">
                        <p className="font-semibold text-[#071B2B] truncate">{photoMeta?.name}</p>
                        <p className="text-slate-500 text-[11px] mt-0.5">{photoMeta?.sizeFormatted}</p>
                        <span className="inline-block px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded mt-1 border border-emerald-200">
                          Ready for submission
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={handleRemovePhoto}
                        aria-label="Remove attached photo"
                        className="p-2 rounded-lg text-slate-500 hover:text-red-700 hover:bg-red-50 border border-slate-200 hover:border-red-300 transition-colors"
                        title="Remove photo"
                      >
                        <span className="material-symbols-outlined text-[20px]">delete</span>
                      </button>
                    </div>
                  ) : (
                    /* Empty Dropzone with Dual Upload / Camera Capture Support */
                    <div className="border-2 border-dashed border-[#075E63]/30 hover:border-[#00D5D2] bg-white rounded-xl p-4 text-center transition-colors shadow-2xs flex flex-col items-center justify-center gap-2">
                      <div className="w-10 h-10 rounded-full bg-[#EAF6F5] text-[#075E63] flex items-center justify-center">
                        <span className="material-symbols-outlined text-[22px]">cloud_upload</span>
                      </div>

                      <div>
                        <span className="block text-xs font-bold text-[#071B2B]">
                          Attach Field Photo Evidence
                        </span>
                        <span className="text-[11px] text-slate-500 block">
                          PNG, JPG, WebP, or HEIC up to 20MB
                        </span>
                      </div>

                      <div className="flex items-center gap-2 mt-1">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="px-3 py-1.5 rounded-lg bg-[#EAF6F5] hover:bg-[#B4D9D7]/40 text-[#075E63] text-xs font-bold border border-[#075E63]/30 transition-all cursor-pointer flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[16px]">folder_open</span>
                          <span>Choose File</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => cameraInputRef.current?.click()}
                          className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-[#071B2B] text-xs font-bold border border-slate-300 transition-all cursor-pointer flex items-center gap-1"
                          title="Open device camera"
                        >
                          <span className="material-symbols-outlined text-[16px] text-[#075E63]">
                            photo_camera
                          </span>
                          <span>Use Camera</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {errors.photo && (
                    <p className="text-xs text-red-600 font-medium mt-1.5 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">error</span>
                      {errors.photo}
                    </p>
                  )}
                </div>

                {/* Entangled Marine Life Detection */}
                <div>
                  <label
                    htmlFor="wildlifeSelect"
                    className="block text-xs font-bold uppercase tracking-wider text-[#071B2B] mb-1.5"
                  >
                    Entangled Marine Life Seen?
                  </label>
                  <select
                    id="wildlifeSelect"
                    value={formData.wildlifeEntangled}
                    onChange={(e) =>
                      setFormData({ ...formData, wildlifeEntangled: e.target.value })
                    }
                    className="w-full bg-white border border-[#B2D5D3] rounded-lg px-3 py-2.5 text-sm text-[#071B2B] font-medium focus:outline-none focus:border-[#00D5D2] focus:ring-2 focus:ring-[#00D5D2]/25 transition-all shadow-2xs mb-2"
                  >
                    <option>No visible entangled wildlife</option>
                    <option>Yes — Turtle / Cetacean / Fish trapped (Urgent)</option>
                    <option>Uncertain / Murky water conditions</option>
                  </select>

                  {formData.wildlifeEntangled.startsWith('Yes') && (
                    <div className="mt-2 animate-fadeIn">
                      <label
                        htmlFor="wildlifeDetailsInput"
                        className="block text-[11px] font-bold text-red-700 uppercase mb-1"
                      >
                        Urgent Entanglement Details <span className="text-red-600">*</span>
                      </label>
                      <input
                        id="wildlifeDetailsInput"
                        type="text"
                        placeholder="Species (e.g. green turtle, monk seal), alive/dead, degree of entrapment..."
                        value={formData.wildlifeDetails}
                        onChange={(e) => {
                          setFormData({ ...formData, wildlifeDetails: e.target.value });
                          if (errors.wildlifeDetails) {
                            setErrors((prev) => {
                              const updated = { ...prev };
                              delete updated.wildlifeDetails;
                              return updated;
                            });
                          }
                        }}
                        className={`w-full bg-white border rounded-lg px-3 py-2 text-xs text-[#071B2B] focus:outline-none transition-all ${
                          errors.wildlifeDetails
                            ? 'border-red-500 ring-2 ring-red-200'
                            : 'border-red-300 focus:border-red-500'
                        }`}
                      />
                      {errors.wildlifeDetails && (
                        <p className="text-xs text-red-600 font-medium mt-1">
                          {errors.wildlifeDetails}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Additional Field Notes */}
              <div className="mt-4">
                <label
                  htmlFor="descriptionNotes"
                  className="block text-xs font-bold uppercase tracking-wider text-[#071B2B] mb-1.5"
                >
                  Additional Field Notes{' '}
                  <span className="text-slate-500 font-normal lowercase">(optional)</span>
                </label>
                <textarea
                  id="descriptionNotes"
                  rows={2}
                  placeholder="Notes on current direction, drift speed, visible buoy markers, danger to navigation, nearby marine traffic..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-white border border-[#B2D5D3] rounded-lg px-3 py-2 text-sm text-[#071B2B] focus:outline-none focus:border-[#00D5D2] focus:ring-2 focus:ring-[#00D5D2]/25 transition-all shadow-2xs"
                />
              </div>
            </fieldset>

            {/* ============================================================ */}
            {/* SUBMISSION ACTIONS & VERIFIED PRIVACY WORDING */}
            {/* ============================================================ */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-3 border-t border-[#B4D9D7]">
              {/* Corrected Privacy Statement replacing unsupported encryption claim */}
              <div className="text-xs text-slate-600 flex items-start gap-2 max-w-md">
                <span className="material-symbols-outlined text-[#075E63] text-[18px] flex-shrink-0 mt-0.5">
                  verified_user
                </span>
                <span>
                  <strong>Privacy Notice:</strong> Incident reports are forwarded directly to
                  verified marine conservation and salvage partners. Personal contact details remain
                  confidential or are omitted if submitted anonymously.
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <Link
                  to="/"
                  className="w-1/2 sm:w-auto px-5 py-3.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-[#071B2B] text-xs font-bold uppercase tracking-wider text-center transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400"
                >
                  Cancel
                </Link>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-1/2 sm:w-auto px-8 py-3.5 rounded-lg bg-[#00D5D2] hover:bg-[#36F4D0] active:scale-[0.99] text-[#071B2B] font-bold text-xs uppercase tracking-wider shadow-md hover:shadow-[0_0_20px_rgba(0,213,210,0.4)] transition-all cursor-pointer flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-[#071B2B] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <span className="material-symbols-outlined text-[18px] animate-spin">
                        sync
                      </span>
                      <span>Submitting Report...</span>
                    </>
                  ) : (
                    <>
                      <span>Submit Lost Gear Report</span>
                      <span className="material-symbols-outlined text-[18px]">send</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default FishermanReportPage;
