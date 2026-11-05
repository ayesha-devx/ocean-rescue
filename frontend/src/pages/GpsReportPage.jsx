import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  validateCoordinates,
  validatePhoneNumber,
  validateEmail,
  validatePhotoFile,
  formatCoordinatesDisplay,
  submitIncidentReport,
} from '../services/reportService';

/**
 * Public Mariner Portal — GPS-Based Lost Fishing Gear Reporting
 * Designed for fishermen who return to shore with saved GPS waypoint coordinates.
 * Strictly records reporting_method: 'gps' and location_type: 'exact'.
 */
export const GpsReportPage = () => {
  // Country code state for phone number input
  const [countryCode, setCountryCode] = useState('+91');
  const [mobileDigits, setMobileDigits] = useState('');

  const [formData, setFormData] = useState({
    // Coordinates & Timing
    latitude: '',
    longitude: '',
    locationNotes: '',
    lossDateTime: new Date().toISOString().slice(0, 16),

    // Fisherman / Reporter Information
    reporterName: '',
    reporterPhone: '',
    reporterEmail: '',
    reporterRole: 'Captain / Skipper',

    // Vessel Information
    vesselName: '',
    hasRegisteredVesselName: true,
    vesselRegistrationNumber: '',
    vesselType: 'Fishing Boat',
    homePort: '',

    // Gear Specifications
    gearType: 'Gillnet / Monofilament',
    gearQuantity: 1,
    gearMarkings: '',
    waterPosition: 'Partially Submerged / Drifting',
    estimatedSize: 'Medium (10 - 50 meters)',
    seaState: 'Moderate (2-4 ft chop)',
    wildlifeEntangled: 'No visible entangled wildlife',
    wildlifeDetails: '',
    description: '',

    // Declaration & Metadata
    declarationConfirmed: false,
    isAnonymous: false,
  });

  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoMeta, setPhotoMeta] = useState(null);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submissionResult, setSubmissionResult] = useState(null);
  const [errors, setErrors] = useState({});

  const handlePhoneChange = (code, digits) => {
    setCountryCode(code);
    setMobileDigits(digits);
    const combined = digits.trim() ? `${code} ${digits.trim()}` : '';
    setFormData((prev) => ({ ...prev, reporterPhone: combined }));
    if (errors.reporterPhone) {
      setErrors((prev) => {
        const u = { ...prev };
        delete u.reporterPhone;
        return u;
      });
    }
  };

  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validatePhotoFile(file);
    if (!validation.isValid) {
      setErrors((prev) => ({ ...prev, photo: validation.error }));
      e.target.value = '';
      return;
    }

    if (photoPreview && photoPreview.startsWith('blob:')) {
      URL.revokeObjectURL(photoPreview);
    }

    setPhotoFile(file);
    setPhotoMeta({ name: file.name, sizeFormatted: (file.size / (1024 * 1024)).toFixed(2) + ' MB' });
    setPhotoPreview(URL.createObjectURL(file));
    setErrors((prev) => {
      const u = { ...prev };
      delete u.photo;
      return u;
    });
  };

  const handleRemovePhoto = () => {
    if (photoPreview && photoPreview.startsWith('blob:')) {
      URL.revokeObjectURL(photoPreview);
    }
    setPhotoFile(null);
    setPhotoPreview(null);
    setPhotoMeta(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    // Validate coordinates
    const coordValidation = validateCoordinates(formData.latitude, formData.longitude);
    const newErrors = { ...coordValidation.errors };

    // 1. Validate Reporter Info
    if (!formData.reporterName || !formData.reporterName.trim()) {
      newErrors.reporterName = 'Full name is required';
    }

    const phoneValidation = validatePhoneNumber(formData.reporterPhone);
    if (!phoneValidation.isValid) {
      newErrors.reporterPhone = phoneValidation.error;
    }

    if (formData.reporterEmail) {
      const emailValidation = validateEmail(formData.reporterEmail);
      if (!emailValidation.isValid) {
        newErrors.reporterEmail = emailValidation.error;
      }
    }

    // 2. Validate Vessel Info
    if (formData.hasRegisteredVesselName && (!formData.vesselName || !formData.vesselName.trim() || formData.vesselName.trim() === 'No registered name')) {
      newErrors.vesselName = 'Please enter vessel name or check "No registered name"';
    }

    // 3. Validate Gear Info
    if (!formData.gearType || !formData.gearType.trim()) {
      newErrors.gearType = 'Please select a gear category';
    }

    const qty = parseInt(formData.gearQuantity, 10);
    if (isNaN(qty) || qty < 1) {
      newErrors.gearQuantity = 'Quantity must be a positive number (at least 1)';
    }

    // 4. Validate Declaration
    if (!formData.declarationConfirmed) {
      newErrors.declarationConfirmed = 'You must confirm the accuracy declaration before submitting';
    }

    if (formData.wildlifeEntangled?.startsWith('Yes') && !formData.wildlifeDetails?.trim()) {
      newErrors.wildlifeDetails = 'Please provide details regarding entangled marine wildlife';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    try {
      const payload = {
        ...formData,
        reportingMethod: 'gps',
        locationType: 'exact',
        locationUncertaintyRadiusM: null,
      };

      const result = await submitIncidentReport(payload, photoFile);
      if (!result.success) {
        setErrors({ form: result.error || 'Failed to submit report. Please check server connectivity.' });
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      setSubmissionResult(result);
      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setErrors({ form: err.message || 'An unexpected error occurred during submission.' });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setSubmitted(false);
    setSubmissionResult(null);
    setCountryCode('+91');
    setMobileDigits('');
    setFormData({
      latitude: '',
      longitude: '',
      locationNotes: '',
      lossDateTime: new Date().toISOString().slice(0, 16),
      reporterName: '',
      reporterPhone: '',
      reporterEmail: '',
      reporterRole: 'Captain / Skipper',
      vesselName: '',
      hasRegisteredVesselName: true,
      vesselRegistrationNumber: '',
      vesselType: 'Fishing Boat',
      homePort: '',
      gearType: 'Gillnet / Monofilament',
      gearQuantity: 1,
      gearMarkings: '',
      waterPosition: 'Partially Submerged / Drifting',
      estimatedSize: 'Medium (10 - 50 meters)',
      seaState: 'Moderate (2-4 ft chop)',
      wildlifeEntangled: 'No visible entangled wildlife',
      wildlifeDetails: '',
      description: '',
      declarationConfirmed: false,
      isAnonymous: false,
    });
    handleRemovePhoto();
    setErrors({});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const coordsDisplay = formatCoordinatesDisplay(formData.latitude, formData.longitude);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#EBF6F5] via-[#E0F0EF] to-[#EAF6F5] text-[#071B2B] font-sans py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Breadcrumb Navigation */}
        <nav className="mb-6 flex items-center gap-2 text-xs font-mono">
          <Link to="/" className="text-[#075E63] hover:underline font-bold">
            OceanRescue Home
          </Link>
          <span className="text-slate-400">/</span>
          <Link to="/report-gear" className="text-[#075E63] hover:underline">
            Reporting Method
          </Link>
          <span className="text-slate-400">/</span>
          <span className="text-slate-600 font-semibold">GPS-Based Intake</span>
        </nav>

        {submitted && submissionResult ? (
          /* Submission Confirmation Dossier */
          <div className="bg-white rounded-2xl p-8 sm:p-12 shadow-xl border border-[#B4D9D7] text-center">
            <div className="w-16 h-16 bg-[#36F4D0]/30 text-[#075E63] rounded-full flex items-center justify-center mx-auto mb-4 border border-[#075E63]/20">
              <span className="material-symbols-outlined text-3xl">verified</span>
            </div>
            <span className="text-[11px] font-mono uppercase bg-emerald-50 text-emerald-800 border border-emerald-300 px-3 py-1 rounded-full font-bold">
              Official GPS Report Logged
            </span>
            <h1 className="text-2xl sm:text-3xl font-playfair font-bold text-[#071B2B] mt-3 mb-2">
              GPS Report Successfully Transmitted
            </h1>
            <p className="text-xs text-slate-600 max-w-lg mx-auto mb-6">
              Your exact GPS coordinates, contact details, and vessel specifications have been registered with the OceanRescue incident queue. Conservation teams can now review and deploy salvage missions.
            </p>

            <div className="bg-[#EAF6F5]/70 rounded-xl p-5 max-w-xl mx-auto text-left border border-[#B4D9D7] mb-8 font-mono text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-[#B4D9D7] mb-3">
                <span className="text-[#075E63] font-bold uppercase">INCIDENT DOSSIER ID</span>
                <span className="font-bold text-sm bg-white px-2.5 py-1 rounded border border-[#B4D9D7]">
                  #{submissionResult.reportId}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-700">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold block mb-0.5">REPORTER</span>
                  <span className="font-semibold text-[#071B2B]">{formData.reporterName} ({formData.reporterRole})</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold block mb-0.5">CONTACT MOBILE</span>
                  <span className="font-semibold text-[#071B2B]">{formData.reporterPhone}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold block mb-0.5">VESSEL</span>
                  <span className="font-semibold text-[#071B2B]">
                    {formData.hasRegisteredVesselName ? formData.vesselName : 'No registered name'} ({formData.vesselType})
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold block mb-0.5">COORDINATES</span>
                  <span className="font-semibold text-[#071B2B]">{coordsDisplay || (formData.latitude && formData.longitude ? `${formData.latitude}, ${formData.longitude}` : 'No Coordinates')}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold block mb-0.5">GEAR &amp; QUANTITY</span>
                  <span className="font-semibold text-[#071B2B]">{formData.gearType} (Qty: {formData.gearQuantity})</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold block mb-0.5">LOSS DATE &amp; TIME</span>
                  <span className="font-semibold text-[#071B2B]">{new Date(formData.lossDateTime).toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={handleReset}
                className="px-5 py-2.5 rounded-lg bg-white border border-[#075E63]/40 text-[#071B2B] hover:bg-[#EAF6F5] text-xs font-bold uppercase tracking-wider transition-all"
              >
                Report Another Gear
              </button>
              <Link
                to={`/ngo/incidents/${submissionResult.reportId}`}
                className="px-5 py-2.5 rounded-lg bg-[#00C9C1] hover:bg-[#00b5ae] text-[#173B4D] text-xs font-bold uppercase tracking-wider transition-all shadow-md"
              >
                Inspect in Incident Queue
              </Link>
              <Link
                to="/"
                className="px-5 py-2.5 rounded-lg bg-[#075E63] hover:bg-[#0B2D42] text-white text-xs font-bold uppercase tracking-wider transition-all"
              >
                Return Home
              </Link>
            </div>
          </div>
        ) : (
          /* Intake Form */
          <form onSubmit={handleSubmit} noValidate className="bg-white rounded-2xl p-6 sm:p-10 shadow-xl border border-[#B4D9D7] flex flex-col gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-50 text-sky-800 border border-sky-200 text-xs font-mono font-bold uppercase tracking-wider mb-2">
                <span className="material-symbols-outlined text-[16px]">my_location</span>
                GPS Waypoint Reporting
              </div>
              <h1 className="text-2xl sm:text-3xl font-playfair font-bold text-[#071B2B] tracking-tight">
                Report Gear via Saved GPS Coordinates
              </h1>
              <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
                Enter exact coordinates recorded on your vessel's GPS plotter or chartplotter along with fisherman and vessel details for salvage verification.
              </p>
            </div>

            {errors.form && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-300 text-red-800 text-xs flex items-center gap-2">
                <span className="material-symbols-outlined text-red-600 text-base">error</span>
                <span>{errors.form}</span>
              </div>
            )}

            {/* 1. Saved GPS Coordinates */}
            <fieldset className="bg-[#EAF6F5]/70 p-5 rounded-xl border border-[#B4D9D7]">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#B4D9D7]">
                <h2 className="text-[#071B2B] font-bold text-sm flex items-center gap-2">
                  <span className="w-6 h-6 rounded bg-[#075E63] text-[#36F4D0] flex items-center justify-center font-bold text-xs">1</span>
                  <span>Saved GPS Waypoint Coordinates</span>
                </h2>
                {coordsDisplay ? (
                  <span className="text-[10px] font-mono uppercase bg-emerald-50 border border-emerald-300 px-2 py-0.5 rounded text-emerald-800 font-bold flex items-center gap-1">
                    <span className="material-symbols-outlined text-[12px]">verified</span>
                    <span>Exact Waypoint Verified</span>
                  </span>
                ) : (
                  <span className="text-[10px] font-mono uppercase bg-slate-100 border border-slate-300 px-2 py-0.5 rounded text-slate-500 font-medium">
                    Awaiting Coordinates
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="latitude" className="block text-xs font-bold uppercase text-[#071B2B] mb-1">
                    Latitude (Decimal Degrees) <span className="text-red-600">*</span>
                  </label>
                  <span className="text-[10px] text-slate-500 block mb-1 font-mono">-90.0000° to +90.0000° (e.g. 17.0250)</span>
                  <input
                    id="latitude"
                    type="text"
                    required
                    placeholder="e.g. 16.9900"
                    value={formData.latitude}
                    onChange={(e) => {
                      setFormData({ ...formData, latitude: e.target.value });
                      if (errors.latitude) {
                        setErrors((prev) => {
                          const u = { ...prev };
                          delete u.latitude;
                          return u;
                        });
                      }
                    }}
                    className={`w-full bg-white border rounded-lg px-3 py-2 text-sm font-mono text-[#071B2B] focus:outline-none ${
                      errors.latitude ? 'border-red-500 ring-2 ring-red-200' : 'border-[#B2D5D3] focus:border-[#00D5D2]'
                    }`}
                  />
                  {errors.latitude && <p className="text-xs text-red-600 mt-1 font-semibold">{errors.latitude}</p>}
                </div>

                <div>
                  <label htmlFor="longitude" className="block text-xs font-bold uppercase text-[#071B2B] mb-1">
                    Longitude (Decimal Degrees) <span className="text-red-600">*</span>
                  </label>
                  <span className="text-[10px] text-slate-500 block mb-1 font-mono">-180.0000° to +180.0000° (e.g. 73.2800)</span>
                  <input
                    id="longitude"
                    type="text"
                    required
                    placeholder="e.g. 73.3000"
                    value={formData.longitude}
                    onChange={(e) => {
                      setFormData({ ...formData, longitude: e.target.value });
                      if (errors.longitude) {
                        setErrors((prev) => {
                          const u = { ...prev };
                          delete u.longitude;
                          return u;
                        });
                      }
                    }}
                    className={`w-full bg-white border rounded-lg px-3 py-2 text-sm font-mono text-[#071B2B] focus:outline-none ${
                      errors.longitude ? 'border-red-500 ring-2 ring-red-200' : 'border-[#B2D5D3] focus:border-[#00D5D2]'
                    }`}
                  />
                  {errors.longitude && <p className="text-xs text-red-600 mt-1 font-semibold">{errors.longitude}</p>}
                </div>
              </div>

              {coordsDisplay ? (
                <div className="mt-3 p-2.5 rounded bg-white border border-[#B4D9D7] flex items-center justify-between text-xs shadow-2xs">
                  <div className="flex items-center gap-1.5 font-mono">
                    <span className="material-symbols-outlined text-[#075E63] text-base">pin_drop</span>
                    <span className="text-slate-600">Formatted Position:</span>
                    <strong className="text-[#075E63]">{coordsDisplay}</strong>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-bold">
                    Exact Waypoint
                  </span>
                </div>
              ) : (
                <div className="mt-3 p-3 rounded-lg bg-white/70 border border-dashed border-[#B4D9D7] flex items-center gap-2 text-xs text-slate-500 font-mono">
                  <span className="material-symbols-outlined text-slate-400 text-base">explore</span>
                  <span>Enter valid latitude (-90° to +90°) and longitude (-180° to +180°) above to preview coordinates.</span>
                </div>
              )}
            </fieldset>

            {/* 2. Fisherman / Reporter Information */}
            <fieldset className="bg-[#EAF6F5]/70 p-5 rounded-xl border border-[#B4D9D7]">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#B4D9D7]">
                <h2 className="text-[#071B2B] font-bold text-sm flex items-center gap-2">
                  <span className="w-6 h-6 rounded bg-[#075E63] text-[#36F4D0] flex items-center justify-center font-bold text-xs">2</span>
                  <span>Fisherman / Reporter Information</span>
                </h2>
                <span className="text-[10px] font-mono text-slate-500 uppercase font-semibold">Contact Verification</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Full Name */}
                <div>
                  <label htmlFor="reporterName" className="block text-xs font-bold uppercase text-[#071B2B] mb-1">
                    Full Name <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="reporterName"
                    type="text"
                    required
                    placeholder="e.g. Ramesh Kadam"
                    value={formData.reporterName}
                    onChange={(e) => setFormData({ ...formData, reporterName: e.target.value })}
                    className={`w-full bg-white border rounded-lg px-3 py-2 text-xs text-[#071B2B] focus:outline-none ${
                      errors.reporterName ? 'border-red-500 ring-2 ring-red-200' : 'border-[#B2D5D3] focus:border-[#00D5D2]'
                    }`}
                  />
                  {errors.reporterName && <p className="text-xs text-red-600 mt-1">{errors.reporterName}</p>}
                </div>

                {/* Reporter Role */}
                <div>
                  <label htmlFor="reporterRole" className="block text-xs font-bold uppercase text-[#071B2B] mb-1">
                    Reporter Role <span className="text-red-600">*</span>
                  </label>
                  <select
                    id="reporterRole"
                    value={formData.reporterRole}
                    onChange={(e) => setFormData({ ...formData, reporterRole: e.target.value })}
                    className="w-full bg-white border border-[#B2D5D3] rounded-lg px-3 py-2 text-xs text-[#071B2B] focus:outline-none focus:border-[#00D5D2]"
                  >
                    <option>Vessel Owner</option>
                    <option>Captain / Skipper</option>
                    <option>Crew Member</option>
                    <option>Other</option>
                  </select>
                </div>

                {/* Mobile Number with Country Code */}
                <div>
                  <label htmlFor="reporterPhone" className="block text-xs font-bold uppercase text-[#071B2B] mb-1">
                    Mobile Number <span className="text-red-600">*</span>
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={countryCode}
                      onChange={(e) => handlePhoneChange(e.target.value, mobileDigits)}
                      className="w-28 bg-white border border-[#B2D5D3] rounded-lg px-2 py-2 text-xs font-mono text-[#071B2B] focus:outline-none focus:border-[#00D5D2]"
                      title="Select Country Calling Code"
                    >
                      <option value="+91">+91 (IN)</option>
                      <option value="+1">+1 (US/CA)</option>
                      <option value="+44">+44 (UK)</option>
                      <option value="+61">+61 (AU)</option>
                      <option value="+94">+94 (LK)</option>
                      <option value="+960">+960 (MV)</option>
                      <option value="+62">+62 (ID)</option>
                      <option value="+60">+60 (MY)</option>
                      <option value="+971">+971 (AE)</option>
                      <option value="+">+</option>
                    </select>
                    <input
                      id="reporterPhone"
                      type="tel"
                      required
                      placeholder="9876543210"
                      value={mobileDigits}
                      onChange={(e) => handlePhoneChange(countryCode, e.target.value)}
                      className={`flex-1 bg-white border rounded-lg px-3 py-2 text-xs font-mono text-[#071B2B] focus:outline-none ${
                        errors.reporterPhone ? 'border-red-500 ring-2 ring-red-200' : 'border-[#B2D5D3] focus:border-[#00D5D2]'
                      }`}
                    />
                  </div>
                  {errors.reporterPhone ? (
                    <p className="text-xs text-red-600 mt-1">{errors.reporterPhone}</p>
                  ) : (
                    <span className="text-[10px] text-slate-500 mt-1 block">Full number: {formData.reporterPhone || `${countryCode} ...`}</span>
                  )}
                </div>

                {/* Email Address (Optional) */}
                <div>
                  <label htmlFor="reporterEmail" className="block text-xs font-bold uppercase text-[#071B2B] mb-1">
                    Email Address <span className="text-slate-400 font-normal font-mono">(Optional)</span>
                  </label>
                  <input
                    id="reporterEmail"
                    type="email"
                    placeholder="e.g. fisherman@harbour.org"
                    value={formData.reporterEmail}
                    onChange={(e) => setFormData({ ...formData, reporterEmail: e.target.value })}
                    className={`w-full bg-white border rounded-lg px-3 py-2 text-xs text-[#071B2B] focus:outline-none ${
                      errors.reporterEmail ? 'border-red-500 ring-2 ring-red-200' : 'border-[#B2D5D3] focus:border-[#00D5D2]'
                    }`}
                  />
                  {errors.reporterEmail && <p className="text-xs text-red-600 mt-1">{errors.reporterEmail}</p>}
                </div>
              </div>
            </fieldset>

            {/* 3. Vessel Information */}
            <fieldset className="bg-[#EAF6F5]/70 p-5 rounded-xl border border-[#B4D9D7]">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#B4D9D7]">
                <h2 className="text-[#071B2B] font-bold text-sm flex items-center gap-2">
                  <span className="w-6 h-6 rounded bg-[#075E63] text-[#36F4D0] flex items-center justify-center font-bold text-xs">3</span>
                  <span>Vessel Information</span>
                </h2>
                <span className="text-[10px] font-mono text-slate-500 uppercase font-semibold">Craft Details</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Vessel Name + No Registered Name Option */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor="vesselName" className="text-xs font-bold uppercase text-[#071B2B]">
                      Vessel / Boat Name {formData.hasRegisteredVesselName && <span className="text-red-600">*</span>}
                    </label>
                    <label className="flex items-center gap-1.5 text-[11px] text-slate-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!formData.hasRegisteredVesselName}
                        onChange={(e) => {
                          const noName = e.target.checked;
                          setFormData({
                            ...formData,
                            hasRegisteredVesselName: !noName,
                            vesselName: noName ? 'No registered name' : '',
                          });
                          if (noName && errors.vesselName) {
                            setErrors((prev) => {
                              const u = { ...prev };
                              delete u.vesselName;
                              return u;
                            });
                          }
                        }}
                        className="rounded border-[#B2D5D3] text-[#075E63] focus:ring-0"
                      />
                      <span>No registered name</span>
                    </label>
                  </div>
                  <input
                    id="vesselName"
                    type="text"
                    disabled={!formData.hasRegisteredVesselName}
                    placeholder={formData.hasRegisteredVesselName ? 'e.g. Matsya Sagar III' : 'Traditional craft (unregistered name)'}
                    value={formData.hasRegisteredVesselName ? formData.vesselName : 'No registered name'}
                    onChange={(e) => {
                      setFormData({ ...formData, vesselName: e.target.value });
                      if (errors.vesselName) {
                        setErrors((prev) => {
                          const u = { ...prev };
                          delete u.vesselName;
                          return u;
                        });
                      }
                    }}
                    className={`w-full bg-white border rounded-lg px-3 py-2 text-xs text-[#071B2B] focus:outline-none disabled:bg-slate-100 disabled:text-slate-500 ${
                      errors.vesselName ? 'border-red-500 ring-2 ring-red-200' : 'border-[#B2D5D3] focus:border-[#00D5D2]'
                    }`}
                  />
                  {errors.vesselName && <p className="text-xs text-red-600 mt-1">{errors.vesselName}</p>}
                </div>

                {/* Vessel Type */}
                <div>
                  <label htmlFor="vesselType" className="block text-xs font-bold uppercase text-[#071B2B] mb-1">
                    Vessel Type <span className="text-red-600">*</span>
                  </label>
                  <select
                    id="vesselType"
                    value={formData.vesselType}
                    onChange={(e) => setFormData({ ...formData, vesselType: e.target.value })}
                    className="w-full bg-white border border-[#B2D5D3] rounded-lg px-3 py-2 text-xs text-[#071B2B] focus:outline-none focus:border-[#00D5D2]"
                  >
                    <option>Fishing Boat</option>
                    <option>Trawler</option>
                    <option>Mechanized Fishing Boat</option>
                    <option>Traditional Fishing Boat</option>
                    <option>Other</option>
                  </select>
                </div>

                {/* Vessel Registration Number (Optional) */}
                <div>
                  <label htmlFor="vesselRegistrationNumber" className="block text-xs font-bold uppercase text-[#071B2B] mb-1">
                    Vessel Registration Number <span className="text-slate-400 font-normal font-mono">(Optional)</span>
                  </label>
                  <input
                    id="vesselRegistrationNumber"
                    type="text"
                    placeholder="e.g. IND-MH-RT-4029"
                    value={formData.vesselRegistrationNumber}
                    onChange={(e) => setFormData({ ...formData, vesselRegistrationNumber: e.target.value })}
                    className="w-full bg-white border border-[#B2D5D3] rounded-lg px-3 py-2 text-xs font-mono text-[#071B2B] focus:outline-none focus:border-[#00D5D2]"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">Leave blank if craft does not carry formal registry.</span>
                </div>

                {/* Fishing Harbour / Home Port (Optional) */}
                <div>
                  <label htmlFor="homePort" className="block text-xs font-bold uppercase text-[#071B2B] mb-1">
                    Fishing Harbour / Home Port <span className="text-slate-400 font-normal font-mono">(Optional)</span>
                  </label>
                  <input
                    id="homePort"
                    type="text"
                    placeholder="e.g. Mirkarwada Port, Ratnagiri"
                    value={formData.homePort}
                    onChange={(e) => setFormData({ ...formData, homePort: e.target.value })}
                    className="w-full bg-white border border-[#B2D5D3] rounded-lg px-3 py-2 text-xs text-[#071B2B] focus:outline-none focus:border-[#00D5D2]"
                  />
                </div>
              </div>
            </fieldset>

            {/* 4. Gear Loss Timing & Specifications */}
            <fieldset className="bg-[#EAF6F5]/70 p-5 rounded-xl border border-[#B4D9D7]">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#B4D9D7]">
                <h2 className="text-[#071B2B] font-bold text-sm flex items-center gap-2">
                  <span className="w-6 h-6 rounded bg-[#075E63] text-[#36F4D0] flex items-center justify-center font-bold text-xs">4</span>
                  <span>Gear Loss Timing &amp; Detailed Specifications</span>
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="lossDateTime" className="block text-xs font-bold uppercase text-[#071B2B] mb-1">
                    Loss Date &amp; Time <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="lossDateTime"
                    type="datetime-local"
                    value={formData.lossDateTime}
                    onChange={(e) => setFormData({ ...formData, lossDateTime: e.target.value })}
                    className="w-full bg-white border border-[#B2D5D3] rounded-lg px-3 py-2 text-xs font-mono text-[#071B2B] focus:outline-none focus:border-[#00D5D2]"
                  />
                </div>

                <div>
                  <label htmlFor="gearType" className="block text-xs font-bold uppercase text-[#071B2B] mb-1">
                    Gear Category <span className="text-red-600">*</span>
                  </label>
                  <select
                    id="gearType"
                    value={formData.gearType}
                    onChange={(e) => setFormData({ ...formData, gearType: e.target.value })}
                    className="w-full bg-white border border-[#B2D5D3] rounded-lg px-3 py-2 text-xs text-[#071B2B] focus:outline-none focus:border-[#00D5D2]"
                  >
                    <option>Gillnet / Monofilament</option>
                    <option>Trawl Net / Bag</option>
                    <option>Crab / Lobster Pot &amp; Line</option>
                    <option>Longline with Gangions</option>
                    <option>FAD / Moored Buoy Structure</option>
                    <option>Seine Net Bundle</option>
                    <option>Unidentified Net Mass</option>
                  </select>
                </div>

                {/* Quantity of Gear Lost */}
                <div>
                  <label htmlFor="gearQuantity" className="block text-xs font-bold uppercase text-[#071B2B] mb-1">
                    Quantity of Gear Lost <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="gearQuantity"
                    type="number"
                    min="1"
                    required
                    value={formData.gearQuantity}
                    onChange={(e) => setFormData({ ...formData, gearQuantity: e.target.value })}
                    className={`w-full bg-white border rounded-lg px-3 py-2 text-xs font-mono text-[#071B2B] focus:outline-none ${
                      errors.gearQuantity ? 'border-red-500 ring-2 ring-red-200' : 'border-[#B2D5D3] focus:border-[#00D5D2]'
                    }`}
                  />
                  {errors.gearQuantity && <p className="text-xs text-red-600 mt-1">{errors.gearQuantity}</p>}
                </div>
              </div>

              {/* Gear Identification / Markings (Optional) */}
              <div className="mt-4">
                <label htmlFor="gearMarkings" className="block text-xs font-bold uppercase text-[#071B2B] mb-1">
                  Gear Identification / Markings <span className="text-slate-400 font-normal font-mono">(Optional)</span>
                </label>
                <input
                  id="gearMarkings"
                  type="text"
                  placeholder="e.g. Orange fluorescent buoys, owner stamp, yellow flag with black 'RT-4' stencil"
                  value={formData.gearMarkings}
                  onChange={(e) => setFormData({ ...formData, gearMarkings: e.target.value })}
                  className="w-full bg-white border border-[#B2D5D3] rounded-lg px-3 py-2 text-xs text-[#071B2B] focus:outline-none focus:border-[#00D5D2]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                <div>
                  <label htmlFor="estimatedSize" className="block text-xs font-bold uppercase text-[#071B2B] mb-1">
                    Estimated Size / Mass
                  </label>
                  <select
                    id="estimatedSize"
                    value={formData.estimatedSize}
                    onChange={(e) => setFormData({ ...formData, estimatedSize: e.target.value })}
                    className="w-full bg-white border border-[#B2D5D3] rounded-lg px-3 py-2 text-xs text-[#071B2B] focus:outline-none focus:border-[#00D5D2]"
                  >
                    <option>Small (&lt; 10 meters / single trap)</option>
                    <option>Medium (10 - 50 meters)</option>
                    <option>Large (50 - 200 meters)</option>
                    <option>Massive Industrial Net (&gt; 200 meters)</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="waterPosition" className="block text-xs font-bold uppercase text-[#071B2B] mb-1">
                    Water Position at Loss
                  </label>
                  <select
                    id="waterPosition"
                    value={formData.waterPosition}
                    onChange={(e) => setFormData({ ...formData, waterPosition: e.target.value })}
                    className="w-full bg-white border border-[#B2D5D3] rounded-lg px-3 py-2 text-xs text-[#071B2B] focus:outline-none focus:border-[#00D5D2]"
                  >
                    <option>Partially Submerged / Drifting</option>
                    <option>Floating at Surface</option>
                    <option>Snagged on Coral Reef / Seabed</option>
                    <option>Washed Ashore / Coastal Edge</option>
                    <option>Subsurface (5 - 20m depth)</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="seaState" className="block text-xs font-bold uppercase text-[#071B2B] mb-1">
                    Sea State at Loss
                  </label>
                  <select
                    id="seaState"
                    value={formData.seaState}
                    onChange={(e) => setFormData({ ...formData, seaState: e.target.value })}
                    className="w-full bg-white border border-[#B2D5D3] rounded-lg px-3 py-2 text-xs text-[#071B2B] focus:outline-none focus:border-[#00D5D2]"
                  >
                    <option>Calm (Glassy / &lt;1 ft waves)</option>
                    <option>Moderate (2-4 ft chop)</option>
                    <option>Rough (5-8 ft swells)</option>
                    <option>Severe (Gale / Heavy sea)</option>
                  </select>
                </div>
              </div>
            </fieldset>

            {/* 5. Photographic Evidence & Field Notes */}
            <fieldset className="bg-[#EAF6F5]/70 p-5 rounded-xl border border-[#B4D9D7]">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#B4D9D7]">
                <h2 className="text-[#071B2B] font-bold text-sm flex items-center gap-2">
                  <span className="w-6 h-6 rounded bg-[#075E63] text-[#36F4D0] flex items-center justify-center font-bold text-xs">5</span>
                  <span>Photographic Evidence &amp; Field Notes</span>
                </h2>
                <span className="text-[10px] text-slate-500 font-mono">(Optional)</span>
              </div>

              {/* Photo Input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoSelect}
                className="hidden"
              />
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoSelect}
                className="hidden"
              />

              {photoPreview ? (
                <div className="p-3 bg-white rounded-lg border border-[#B4D9D7] flex items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <img src={photoPreview} alt="Preview" className="w-12 h-12 rounded object-cover border" />
                    <div>
                      <p className="text-xs font-bold text-[#071B2B] truncate">{photoMeta?.name}</p>
                      <p className="text-[10px] text-slate-500">{photoMeta?.sizeFormatted}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="text-red-600 hover:text-red-800 text-xs font-bold"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 mb-4">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-lg bg-white border border-[#B4D9D7] hover:bg-slate-50 text-xs font-semibold text-[#075E63] flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[16px]">upload_file</span>
                    <span>Upload Gear Photo</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-lg bg-white border border-[#B4D9D7] hover:bg-slate-50 text-xs font-semibold text-[#075E63] flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[16px]">photo_camera</span>
                    <span>Take Photo</span>
                  </button>
                  <span className="text-[10px] text-slate-500">Max 20MB (JPG, PNG, WebP, HEIC)</span>
                </div>
              )}

              <div>
                <label htmlFor="description" className="block text-xs font-bold uppercase text-[#071B2B] mb-1">
                  Additional Notes / Observations
                </label>
                <textarea
                  id="description"
                  rows={2}
                  placeholder="Notes on gear condition, line markers, surface flags, vessel speed at snagging..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-white border border-[#B2D5D3] rounded-lg p-2.5 text-xs text-[#071B2B] focus:outline-none focus:border-[#00D5D2]"
                />
              </div>
            </fieldset>

            {/* 6. Legal / Regulatory Declaration */}
            <div className="bg-amber-50/80 p-5 rounded-xl border border-amber-300">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  required
                  checked={formData.declarationConfirmed}
                  onChange={(e) => {
                    setFormData({ ...formData, declarationConfirmed: e.target.checked });
                    if (errors.declarationConfirmed) {
                      setErrors((prev) => {
                        const u = { ...prev };
                        delete u.declarationConfirmed;
                        return u;
                      });
                    }
                  }}
                  className="mt-1 h-4 w-4 rounded border-amber-400 text-[#075E63] focus:ring-0"
                />
                <div className="text-xs text-[#071B2B] leading-relaxed">
                  <span className="font-bold block mb-0.5">Mariner Truthfulness &amp; Data Sharing Declaration <span className="text-red-600">*</span></span>
                  <span>
                    "I confirm that the information provided is accurate to the best of my knowledge and understand that it may be shared with authorized OceanRescue NGO/recovery personnel for verification and recovery coordination."
                  </span>
                </div>
              </label>
              {errors.declarationConfirmed && (
                <p className="text-xs text-red-600 font-semibold mt-2 pl-7">{errors.declarationConfirmed}</p>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between gap-4 pt-4 border-t border-[#B4D9D7]">
              <Link to="/report-gear" className="text-xs font-semibold text-slate-600 hover:text-[#071B2B]">
                Cancel
              </Link>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-3 rounded-lg bg-[#00D5D2] hover:bg-[#36F4D0] text-[#071B2B] font-bold text-xs uppercase tracking-wider transition-all shadow-md flex items-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <span className="material-symbols-outlined text-[16px] animate-spin">sync</span>
                    <span>Submitting GPS Report...</span>
                  </>
                ) : (
                  <>
                    <span>Submit GPS Waypoint Report</span>
                    <span className="material-symbols-outlined text-[16px]">send</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default GpsReportPage;
