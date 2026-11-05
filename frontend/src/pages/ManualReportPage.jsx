import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Circle, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import {
  validatePhoneNumber,
  validateEmail,
  validatePhotoFile,
  formatCoordinatesDisplay,
  submitIncidentReport,
} from '../services/reportService';

// Benchmark coordinates for pilot coastal operations (Mirkarwada / Ratnagiri coast)
const PILOT_COAST = { lat: 16.99, lng: 73.28 };

// Custom pin marker for manual estimated position
const estimatedMarkerIcon = L.divIcon({
  className: 'custom-estimated-pin',
  html: `
    <div style="position: relative; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">
      <span style="position: absolute; inset: -4px; border-radius: 9999px; background-color: rgba(245, 158, 11, 0.4); animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></span>
      <div style="position: relative; width: 28px; height: 28px; border-radius: 9999px; background-color: #D97706; border: 2px solid #FFFFFF; box-shadow: 0 4px 10px rgba(23, 59, 77, 0.35); display: flex; align-items: center; justify-content: center; color: white;">
        <svg style="width: 16px; height: 16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z"/>
        </svg>
      </div>
    </div>
  `,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

/**
 * Click handler sub-component for Leaflet map
 */
function MapClickHandler({ onLocationSelect }) {
  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

/**
 * Map controller to center map when coordinates change
 */
function MapCenterController({ centerCoords }) {
  const map = useMap();
  useEffect(() => {
    if (centerCoords && centerCoords[0] !== null && centerCoords[1] !== null) {
      map.panTo(centerCoords, { animate: true, duration: 0.8 });
    }
  }, [centerCoords, map]);
  return null;
}

/**
 * Public Mariner Portal — Manual Location Reporting
 * Designed for mariners without GPS gear or smartphone onboard during fishing.
 * Allows answering simple guided questions and clicking on an interactive map.
 * Records location_type: 'estimated' with a documented uncertainty radius.
 */
export const ManualReportPage = () => {
  // Question states
  const [approximateArea, setApproximateArea] = useState('Ratnagiri / Mirkarwada Coastal Waters');
  const [distanceOption, setDistanceOption] = useState('coastal'); // 'close', 'coastal', 'offshore', 'unsure'
  const [customDistanceKm, setCustomDistanceKm] = useState('2.5');
  const [knowsLandmark, setKnowsLandmark] = useState(true);
  const [nearbyLandmark, setNearbyLandmark] = useState('Ratnagiri Lighthouse / Headland');
  const [directionFromLandmark, setDirectionFromLandmark] = useState('West / Offshore');

  // Selected map coordinates (strictly null until explicit user map click)
  const [selectedLat, setSelectedLat] = useState(null);
  const [selectedLng, setSelectedLng] = useState(null);
  const [mapClicked, setMapClicked] = useState(false);

  // Common Fisherman / Reporter Information
  const [reporterName, setReporterName] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [mobileDigits, setMobileDigits] = useState('');
  const [reporterPhone, setReporterPhone] = useState('');
  const [reporterEmail, setReporterEmail] = useState('');
  const [reporterRole, setReporterRole] = useState('Captain / Skipper');

  // Common Vessel Information
  const [vesselName, setVesselName] = useState('');
  const [hasRegisteredVesselName, setHasRegisteredVesselName] = useState(true);
  const [vesselRegistrationNumber, setVesselRegistrationNumber] = useState('');
  const [vesselType, setVesselType] = useState('Fishing Boat');
  const [homePort, setHomePort] = useState('');

  // Gear Specifications
  const [gearType, setGearType] = useState('Gillnet / Monofilament');
  const [gearQuantity, setGearQuantity] = useState(1);
  const [gearMarkings, setGearMarkings] = useState('');
  const [waterPosition, setWaterPosition] = useState('Partially Submerged / Drifting');
  const [estimatedSize, setEstimatedSize] = useState('Medium (10 - 50 meters)');
  const [seaState, setSeaState] = useState('Moderate (2-4 ft chop)');
  const [lossDateTime, setLossDateTime] = useState(new Date().toISOString().slice(0, 16));
  const [description, setDescription] = useState('');

  // Declaration
  const [declarationConfirmed, setDeclarationConfirmed] = useState(false);

  // Media
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const fileInputRef = useRef(null);

  // Submission lifecycle
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submissionResult, setSubmissionResult] = useState(null);
  const [errors, setErrors] = useState({});

  /**
   * Documented Estimation Method for Uncertainty Radius:
   * 1. Close Inshore with visual landmark (< 1.5 km): ±500 meters
   * 2. Standard Coastal Waters (1.5 - 5 km): ±1,500 meters
   * 3. Offshore Open Water (> 5 km) or Unsure: ±3,000 meters
   */
  const calculateUncertaintyMeters = () => {
    if (distanceOption === 'close' && knowsLandmark) return 500;
    if (distanceOption === 'close') return 800;
    if (distanceOption === 'coastal') return 1500;
    if (distanceOption === 'offshore') return 3000;
    return 3000; // 'unsure'
  };

  const uncertaintyMeters = calculateUncertaintyMeters();
  const uncertaintyKm = (uncertaintyMeters / 1000).toFixed(1);

  const handlePhoneChange = (code, digits) => {
    setCountryCode(code);
    setMobileDigits(digits);
    const combined = digits.trim() ? `${code} ${digits.trim()}` : '';
    setReporterPhone(combined);
    if (errors.reporterPhone) {
      setErrors((prev) => {
        const u = { ...prev };
        delete u.reporterPhone;
        return u;
      });
    }
  };

  const handleMapClick = (lat, lng) => {
    setSelectedLat(Number(lat.toFixed(5)));
    setSelectedLng(Number(lng.toFixed(5)));
    setMapClicked(true);
    if (errors.location) {
      setErrors((prev) => {
        const u = { ...prev };
        delete u.location;
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
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    const newErrors = {};

    // 1. Location Validation
    if (!mapClicked || selectedLat === null || selectedLng === null) {
      newErrors.location = 'Please mark the approximate gear loss location on the interactive map below.';
    }

    // 2. Reporter Validation
    if (!reporterName || !reporterName.trim()) {
      newErrors.reporterName = 'Full name is required';
    }

    const phoneValidation = validatePhoneNumber(reporterPhone);
    if (!phoneValidation.isValid) {
      newErrors.reporterPhone = phoneValidation.error;
    }

    if (reporterEmail) {
      const emailValidation = validateEmail(reporterEmail);
      if (!emailValidation.isValid) {
        newErrors.reporterEmail = emailValidation.error;
      }
    }

    // 3. Vessel Validation
    if (hasRegisteredVesselName && (!vesselName || !vesselName.trim() || vesselName.trim() === 'No registered name')) {
      newErrors.vesselName = 'Please enter vessel name or check "No registered name"';
    }

    // 4. Gear Validation
    if (!gearType || !gearType.trim()) {
      newErrors.gearType = 'Please select a gear category';
    }

    const qty = parseInt(gearQuantity, 10);
    if (isNaN(qty) || qty < 1) {
      newErrors.gearQuantity = 'Quantity must be a positive integer (at least 1)';
    }

    // 5. Declaration Validation
    if (!declarationConfirmed) {
      newErrors.declarationConfirmed = 'You must confirm the accuracy declaration before submitting';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      const distanceValue =
        distanceOption === 'unsure'
          ? null
          : distanceOption === 'close'
          ? 1.0
          : distanceOption === 'coastal'
          ? Number(customDistanceKm) || 2.5
          : 8.0;

      const payload = {
        reporterName: reporterName.trim(),
        reporterPhone: reporterPhone.trim(),
        reporterEmail: reporterEmail.trim() || null,
        reporterRole,
        vesselName: hasRegisteredVesselName ? vesselName.trim() : 'No registered name',
        hasRegisteredVesselName,
        vesselRegistrationNumber: vesselRegistrationNumber.trim() || null,
        vesselType,
        homePort: homePort.trim() || null,
        gearType,
        gearQuantity: qty,
        gearMarkings: gearMarkings.trim() || null,
        waterPosition,
        estimatedSize,
        seaState,
        latitude: selectedLat,
        longitude: selectedLng,
        lossDateTime,
        reportingMethod: 'manual',
        locationType: 'estimated',
        locationUncertaintyRadiusM: uncertaintyMeters,
        approximateArea: approximateArea.trim() || 'Coastal Waters',
        distanceFromCoastKm: distanceValue,
        nearbyLandmark: knowsLandmark ? nearbyLandmark.trim() || null : null,
        directionFromLandmark: knowsLandmark ? directionFromLandmark.trim() || null : null,
        declarationConfirmed: true,
        description: description.trim(),
      };

      const result = await submitIncidentReport(payload, photoFile);
      if (!result.success) {
        setErrors({ form: result.error || 'Failed to submit report. Please check backend connection.' });
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      setSubmissionResult(result);
      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setErrors({ form: err.message || 'An unexpected error occurred while saving the report.' });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setSubmitted(false);
    setSubmissionResult(null);
    setPhotoFile(null);
    setPhotoPreview(null);
    setSelectedLat(null);
    setSelectedLng(null);
    setMapClicked(false);
    setReporterName('');
    setCountryCode('+91');
    setMobileDigits('');
    setReporterPhone('');
    setReporterEmail('');
    setReporterRole('Captain / Skipper');
    setVesselName('');
    setHasRegisteredVesselName(true);
    setVesselRegistrationNumber('');
    setVesselType('Fishing Boat');
    setHomePort('');
    setGearQuantity(1);
    setGearMarkings('');
    setDeclarationConfirmed(false);
    setErrors({});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const formattedCoords = formatCoordinatesDisplay(selectedLat, selectedLng);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#EBF6F5] via-[#E0F0EF] to-[#EAF6F5] text-[#071B2B] font-sans py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Navigation Header */}
        <header className="flex items-center justify-between gap-4 mb-8 pb-4 border-b border-[#B4D9D7]">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-white border border-[#B4D9D7] p-1.5 flex items-center justify-center shadow-xs">
              <img src="/images/landing/logo.png" alt="OceanRescue" className="h-full w-auto object-contain" />
            </div>
            <div className="flex flex-col">
              <span className="font-playfair text-xl font-bold text-[#071B2B] tracking-tight">OceanRescue</span>
              <span className="font-mono text-[11px] font-bold text-[#075E63] tracking-wider uppercase">
                Manual Location Reporting
              </span>
            </div>
          </Link>

          <Link
            to="/report-gear"
            className="px-3 py-1.5 rounded-lg bg-white border border-[#B4D9D7] hover:bg-slate-50 text-xs font-semibold text-[#071B2B] transition-colors flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[16px] text-[#075E63]">arrow_back</span>
            <span>All Reporting Options</span>
          </Link>
        </header>

        {submitted && submissionResult ? (
          /* Confirmation Dossier */
          <div className="bg-white rounded-2xl p-6 sm:p-10 shadow-xl border border-[#B4D9D7] text-center animate-fadeIn">
            <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-700 mx-auto flex items-center justify-center mb-4 border border-amber-300">
              <span className="material-symbols-outlined text-[38px]">map</span>
            </div>
            <span className="text-[11px] font-mono uppercase bg-amber-50 text-amber-800 border border-amber-300 px-3 py-1 rounded-full font-bold">
              Manual Location Report Logged
            </span>
            <h1 className="text-2xl sm:text-3xl font-playfair font-bold text-[#071B2B] mt-3 mb-2">
              Report Submitted for Field Verification
            </h1>
            <p className="text-xs text-slate-600 max-w-lg mx-auto mb-6">
              Your estimated fishing gear coordinates, vessel details, and mariner contact have been logged. OceanRescue teams will review the uncertainty zone and plan acoustic or visual sonar verification.
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
                  <span className="font-semibold text-[#071B2B]">{reporterName} ({reporterRole})</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold block mb-0.5">MOBILE NUMBER</span>
                  <span className="font-semibold text-[#071B2B]">{reporterPhone}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold block mb-0.5">VESSEL</span>
                  <span className="font-semibold text-[#071B2B]">
                    {hasRegisteredVesselName ? vesselName : 'No registered name'} ({vesselType})
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold block mb-0.5">LOCATION FIX</span>
                  <span className="font-semibold text-amber-800">
                    Manual Estimated (±{uncertaintyKm} km search radius)
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold block mb-0.5">ESTIMATED COORDINATES</span>
                  <span className="font-semibold text-[#071B2B]">{formattedCoords}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold block mb-0.5">GEAR &amp; QUANTITY</span>
                  <span className="font-semibold text-[#071B2B]">{gearType} (Qty: {gearQuantity})</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={handleReset}
                className="px-5 py-2.5 rounded-lg bg-white border border-[#075E63]/40 text-[#071B2B] hover:bg-[#EAF6F5] text-xs font-bold uppercase tracking-wider transition-all"
              >
                Submit Another Report
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
                Return to Home
              </Link>
            </div>
          </div>
        ) : (
          /* Intake Form */
          <form onSubmit={handleSubmit} noValidate className="bg-white rounded-2xl p-6 sm:p-10 shadow-xl border border-[#B4D9D7] flex flex-col gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-300 text-xs font-mono font-bold uppercase tracking-wider mb-2">
                <span className="material-symbols-outlined text-[16px]">travel_explore</span>
                Manual Sea Area Intake
              </div>
              <h1 className="text-2xl sm:text-3xl font-playfair font-bold text-[#071B2B] tracking-tight">
                Report Gear Without GPS Equipment
              </h1>
              <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
                If you did not have a GPS device onboard, answer the simple location questions below and mark where you were fishing on the interactive map. Provide your vessel and contact details for recovery verification.
              </p>
            </div>

            {errors.form && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-300 text-red-800 text-xs flex items-center gap-2">
                <span className="material-symbols-outlined text-red-600 text-base">error</span>
                <span>{errors.form}</span>
              </div>
            )}

            {/* 1. Approximate Fishing Area & Guided Location Questions */}
            <fieldset className="bg-[#EAF6F5]/70 p-5 rounded-xl border border-[#B4D9D7]">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#B4D9D7]">
                <h2 className="text-[#071B2B] font-bold text-sm flex items-center gap-2">
                  <span className="w-6 h-6 rounded bg-[#075E63] text-[#36F4D0] flex items-center justify-center font-bold text-xs">1</span>
                  <span>Approximate Fishing Area &amp; Coast Reference</span>
                </h2>
                <span className="text-[10px] font-mono text-slate-500 uppercase font-semibold">Guided Questionnaire</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Fishing Area */}
                <div>
                  <label htmlFor="areaInput" className="block text-xs font-bold uppercase text-[#071B2B] mb-1">
                    Approximate Fishing Area / Sector
                  </label>
                  <input
                    id="areaInput"
                    type="text"
                    value={approximateArea}
                    onChange={(e) => setApproximateArea(e.target.value)}
                    placeholder="e.g. Off Mirkarwada breakwater, Pawas bay, Ratnagiri headland..."
                    className="w-full bg-white border border-[#B2D5D3] rounded-lg px-3 py-2 text-xs text-[#071B2B] focus:outline-none focus:border-[#00D5D2]"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">Local bay, reef name, or common fishing sector</span>
                </div>

                {/* Distance From Coast */}
                <div>
                  <label htmlFor="distanceSelect" className="block text-xs font-bold uppercase text-[#071B2B] mb-1">
                    Distance from Shoreline
                  </label>
                  <select
                    id="distanceSelect"
                    value={distanceOption}
                    onChange={(e) => setDistanceOption(e.target.value)}
                    className="w-full bg-white border border-[#B2D5D3] rounded-lg px-3 py-2 text-xs text-[#071B2B] focus:outline-none focus:border-[#00D5D2]"
                  >
                    <option value="close">Close inshore / near beach (&lt; 1.5 km)</option>
                    <option value="coastal">Coastal waters (approx. 1.5 – 5 km)</option>
                    <option value="offshore">Deep offshore waters (&gt; 5 km)</option>
                    <option value="unsure">Not sure / Unspecified</option>
                  </select>
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Choose "Not sure" if you were fishing without visual coastal markers
                  </span>
                </div>
              </div>

              {/* Landmark questions with optional toggle */}
              <div className="mt-4 pt-3 border-t border-[#B4D9D7]/60">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase text-[#071B2B]">
                    Nearby Coastal Landmark Reference
                  </span>
                  <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={knowsLandmark}
                      onChange={(e) => setKnowsLandmark(e.target.checked)}
                      className="rounded border-[#075E63] text-[#075E63] focus:ring-[#00D5D2]"
                    />
                    <span>I recall a visible landmark</span>
                  </label>
                </div>

                {knowsLandmark ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <input
                        type="text"
                        placeholder="Landmark name (e.g. Lighthouse, Hill, River mouth, Port tower)"
                        value={nearbyLandmark}
                        onChange={(e) => setNearbyLandmark(e.target.value)}
                        className="w-full bg-white border border-[#B2D5D3] rounded-lg px-3 py-2 text-xs text-[#071B2B] focus:outline-none focus:border-[#00D5D2]"
                      />
                    </div>
                    <div>
                      <select
                        value={directionFromLandmark}
                        onChange={(e) => setDirectionFromLandmark(e.target.value)}
                        className="w-full bg-white border border-[#B2D5D3] rounded-lg px-3 py-2 text-xs text-[#071B2B] focus:outline-none focus:border-[#00D5D2]"
                      >
                        <option>West / Offshore from landmark</option>
                        <option>Northwest from landmark</option>
                        <option>Southwest from landmark</option>
                        <option>North along coastline</option>
                        <option>South along coastline</option>
                        <option>Directly seaward</option>
                      </select>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic">
                    No landmark specified. The system will use an open-water uncertainty radius of ±{uncertaintyKm} km.
                  </p>
                )}
              </div>
            </fieldset>

            {/* 2. Interactive Map Selection */}
            <fieldset className="bg-[#EAF6F5]/70 p-5 rounded-xl border border-[#B4D9D7]">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#B4D9D7]">
                <h2 className="text-[#071B2B] font-bold text-sm flex items-center gap-2">
                  <span className="w-6 h-6 rounded bg-[#075E63] text-[#36F4D0] flex items-center justify-center font-bold text-xs">2</span>
                  <span>Mark Approximate Loss Location on Sea Map</span>
                </h2>
                <span className="text-[10px] font-mono font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded">
                  Tap / Click Map
                </span>
              </div>

              {errors.location && (
                <p className="text-xs text-red-600 font-bold mb-3 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">error</span>
                  {errors.location}
                </p>
              )}

              {/* Map Container */}
              <div className="relative w-full h-[380px] rounded-xl overflow-hidden border-2 border-[#075E63]/30 shadow-inner bg-slate-100">
                <MapContainer
                  center={[PILOT_COAST.lat, PILOT_COAST.lng]}
                  zoom={11}
                  scrollWheelZoom={true}
                  className="w-full h-full"
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <MapClickHandler onLocationSelect={handleMapClick} />
                  {mapClicked && selectedLat !== null && selectedLng !== null && (
                    <>
                      <MapCenterController centerCoords={[selectedLat, selectedLng]} />
                      {/* Estimated Location Marker */}
                      <Marker position={[selectedLat, selectedLng]} icon={estimatedMarkerIcon} />

                      {/* Uncertainty Area Circle */}
                      <Circle
                        center={[selectedLat, selectedLng]}
                        radius={uncertaintyMeters}
                        pathOptions={{
                          color: '#D97706',
                          fillColor: '#F59E0B',
                          fillOpacity: 0.18,
                          weight: 2,
                          dashArray: '6, 6',
                        }}
                      />
                    </>
                  )}
                </MapContainer>

                {/* Map Overlay Badge */}
                <div className="absolute top-3 left-3 z-[1000] bg-white/95 backdrop-blur-xs p-2.5 rounded-lg border border-[#B4D9D7] shadow-sm max-w-xs text-xs">
                  <div className="flex items-center gap-1 text-amber-700 font-mono font-bold text-[11px] uppercase">
                    <span className="material-symbols-outlined text-[15px]">info</span>
                    <span>Search-Area Planning Assumption</span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1 leading-tight">
                    {mapClicked && selectedLat !== null && selectedLng !== null ? (
                      <>
                        Shaded circle represents an approximate <strong>±{uncertaintyKm} km ({uncertaintyMeters}m)</strong> search-area planning assumption. This is an operational estimate and not scientifically validated accuracy; it does not guarantee gear lies strictly within this circle.
                      </>
                    ) : (
                      <>
                        Click anywhere on the coastal sea map to place your estimated gear loss location. The initial map view is centered on the Ratnagiri coast.
                      </>
                    )}
                  </p>
                </div>
              </div>

              {/* Position and Uncertainty Banner */}
              <div className="mt-3.5 p-3 rounded-lg bg-white border border-[#B4D9D7] flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-amber-600 text-lg">pin_drop</span>
                  <div>
                    <span className="text-slate-500 font-mono text-[11px] block">Selected Estimated Location:</span>
                    {mapClicked && selectedLat !== null && selectedLng !== null ? (
                      <strong className="text-[#071B2B] font-mono text-xs">{formattedCoords}</strong>
                    ) : (
                      <span className="text-amber-800 font-mono text-xs italic font-semibold">
                        No location selected yet — please click on the sea map above
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded bg-amber-50 text-amber-800 border border-amber-300 font-mono font-bold text-[10px] uppercase">
                    Assumed Radius: ±{uncertaintyKm} km
                  </span>
                  <span className="px-2.5 py-1 rounded bg-slate-100 text-slate-700 border border-slate-300 font-mono font-bold text-[10px] uppercase">
                    Non-GPS Estimate
                  </span>
                </div>
              </div>

              {/* Search-Area Assumption Legal / Operational Disclaimer */}
              <div className="mt-2.5 p-2.5 rounded-lg bg-amber-50/70 border border-amber-200 text-[11px] text-slate-600 leading-relaxed">
                <strong className="text-amber-900 font-semibold">Search Area Assumption: </strong>
                The search radius (±{uncertaintyKm} km) is an approximate planning assumption based on visual coastal references and distance estimates. It is an operational guideline and not scientifically validated accuracy, and does not guarantee that the lost gear lies within the displayed circle.
              </div>
            </fieldset>

            {/* 3. Fisherman / Reporter Information */}
            <fieldset className="bg-[#EAF6F5]/70 p-5 rounded-xl border border-[#B4D9D7]">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#B4D9D7]">
                <h2 className="text-[#071B2B] font-bold text-sm flex items-center gap-2">
                  <span className="w-6 h-6 rounded bg-[#075E63] text-[#36F4D0] flex items-center justify-center font-bold text-xs">3</span>
                  <span>Fisherman / Reporter Information</span>
                </h2>
                <span className="text-[10px] font-mono text-slate-500 uppercase font-semibold">Contact Verification</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Full Name */}
                <div>
                  <label htmlFor="manualReporterName" className="block text-xs font-bold uppercase text-[#071B2B] mb-1">
                    Full Name <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="manualReporterName"
                    type="text"
                    required
                    placeholder="e.g. Suresh Tandel"
                    value={reporterName}
                    onChange={(e) => setReporterName(e.target.value)}
                    className={`w-full bg-white border rounded-lg px-3 py-2 text-xs text-[#071B2B] focus:outline-none ${
                      errors.reporterName ? 'border-red-500 ring-2 ring-red-200' : 'border-[#B2D5D3] focus:border-[#00D5D2]'
                    }`}
                  />
                  {errors.reporterName && <p className="text-xs text-red-600 mt-1">{errors.reporterName}</p>}
                </div>

                {/* Reporter Role */}
                <div>
                  <label htmlFor="manualReporterRole" className="block text-xs font-bold uppercase text-[#071B2B] mb-1">
                    Reporter Role <span className="text-red-600">*</span>
                  </label>
                  <select
                    id="manualReporterRole"
                    value={reporterRole}
                    onChange={(e) => setReporterRole(e.target.value)}
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
                  <label htmlFor="manualReporterPhone" className="block text-xs font-bold uppercase text-[#071B2B] mb-1">
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
                      id="manualReporterPhone"
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
                    <span className="text-[10px] text-slate-500 mt-1 block">Full number: {reporterPhone || `${countryCode} ...`}</span>
                  )}
                </div>

                {/* Email Address (Optional) */}
                <div>
                  <label htmlFor="manualReporterEmail" className="block text-xs font-bold uppercase text-[#071B2B] mb-1">
                    Email Address <span className="text-slate-400 font-normal font-mono">(Optional)</span>
                  </label>
                  <input
                    id="manualReporterEmail"
                    type="email"
                    placeholder="e.g. suresh.tandel@coastal.net"
                    value={reporterEmail}
                    onChange={(e) => setReporterEmail(e.target.value)}
                    className={`w-full bg-white border rounded-lg px-3 py-2 text-xs text-[#071B2B] focus:outline-none ${
                      errors.reporterEmail ? 'border-red-500 ring-2 ring-red-200' : 'border-[#B2D5D3] focus:border-[#00D5D2]'
                    }`}
                  />
                  {errors.reporterEmail && <p className="text-xs text-red-600 mt-1">{errors.reporterEmail}</p>}
                </div>
              </div>
            </fieldset>

            {/* 4. Vessel Information */}
            <fieldset className="bg-[#EAF6F5]/70 p-5 rounded-xl border border-[#B4D9D7]">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#B4D9D7]">
                <h2 className="text-[#071B2B] font-bold text-sm flex items-center gap-2">
                  <span className="w-6 h-6 rounded bg-[#075E63] text-[#36F4D0] flex items-center justify-center font-bold text-xs">4</span>
                  <span>Vessel Information</span>
                </h2>
                <span className="text-[10px] font-mono text-slate-500 uppercase font-semibold">Craft Details</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Vessel Name + No Registered Name Option */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor="manualVesselName" className="text-xs font-bold uppercase text-[#071B2B]">
                      Vessel / Boat Name {hasRegisteredVesselName && <span className="text-red-600">*</span>}
                    </label>
                    <label className="flex items-center gap-1.5 text-[11px] text-slate-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!hasRegisteredVesselName}
                        onChange={(e) => {
                          const noName = e.target.checked;
                          setHasRegisteredVesselName(!noName);
                          setVesselName(noName ? 'No registered name' : '');
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
                    id="manualVesselName"
                    type="text"
                    disabled={!hasRegisteredVesselName}
                    placeholder={hasRegisteredVesselName ? 'e.g. Sagar Kanya' : 'Traditional craft (unregistered name)'}
                    value={hasRegisteredVesselName ? vesselName : 'No registered name'}
                    onChange={(e) => {
                      setVesselName(e.target.value);
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
                  <label htmlFor="manualVesselType" className="block text-xs font-bold uppercase text-[#071B2B] mb-1">
                    Vessel Type <span className="text-red-600">*</span>
                  </label>
                  <select
                    id="manualVesselType"
                    value={vesselType}
                    onChange={(e) => setVesselType(e.target.value)}
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
                  <label htmlFor="manualVesselReg" className="block text-xs font-bold uppercase text-[#071B2B] mb-1">
                    Vessel Registration Number <span className="text-slate-400 font-normal font-mono">(Optional)</span>
                  </label>
                  <input
                    id="manualVesselReg"
                    type="text"
                    placeholder="e.g. IND-MH-RT-1102"
                    value={vesselRegistrationNumber}
                    onChange={(e) => setVesselRegistrationNumber(e.target.value)}
                    className="w-full bg-white border border-[#B2D5D3] rounded-lg px-3 py-2 text-xs font-mono text-[#071B2B] focus:outline-none focus:border-[#00D5D2]"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">Leave blank if craft has no formal registry.</span>
                </div>

                {/* Fishing Harbour / Home Port (Optional) */}
                <div>
                  <label htmlFor="manualHomePort" className="block text-xs font-bold uppercase text-[#071B2B] mb-1">
                    Fishing Harbour / Home Port <span className="text-slate-400 font-normal font-mono">(Optional)</span>
                  </label>
                  <input
                    id="manualHomePort"
                    type="text"
                    placeholder="e.g. Mirkarwada Port"
                    value={homePort}
                    onChange={(e) => setHomePort(e.target.value)}
                    className="w-full bg-white border border-[#B2D5D3] rounded-lg px-3 py-2 text-xs text-[#071B2B] focus:outline-none focus:border-[#00D5D2]"
                  />
                </div>
              </div>
            </fieldset>

            {/* 5. Gear Loss Timing & Specifications */}
            <fieldset className="bg-[#EAF6F5]/70 p-5 rounded-xl border border-[#B4D9D7]">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#B4D9D7]">
                <h2 className="text-[#071B2B] font-bold text-sm flex items-center gap-2">
                  <span className="w-6 h-6 rounded bg-[#075E63] text-[#36F4D0] flex items-center justify-center font-bold text-xs">5</span>
                  <span>Gear Loss Timing &amp; Detailed Specifications</span>
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="manualLossTime" className="block text-xs font-bold uppercase text-[#071B2B] mb-1">
                    Loss Date &amp; Time <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="manualLossTime"
                    type="datetime-local"
                    value={lossDateTime}
                    onChange={(e) => setLossDateTime(e.target.value)}
                    className="w-full bg-white border border-[#B2D5D3] rounded-lg px-3 py-2 text-xs font-mono text-[#071B2B] focus:outline-none focus:border-[#00D5D2]"
                  />
                </div>

                <div>
                  <label htmlFor="manualGearType" className="block text-xs font-bold uppercase text-[#071B2B] mb-1">
                    Gear Category <span className="text-red-600">*</span>
                  </label>
                  <select
                    id="manualGearType"
                    value={gearType}
                    onChange={(e) => setGearType(e.target.value)}
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
                  <label htmlFor="manualGearQty" className="block text-xs font-bold uppercase text-[#071B2B] mb-1">
                    Quantity of Gear Lost <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="manualGearQty"
                    type="number"
                    min="1"
                    required
                    value={gearQuantity}
                    onChange={(e) => setGearQuantity(e.target.value)}
                    className={`w-full bg-white border rounded-lg px-3 py-2 text-xs font-mono text-[#071B2B] focus:outline-none ${
                      errors.gearQuantity ? 'border-red-500 ring-2 ring-red-200' : 'border-[#B2D5D3] focus:border-[#00D5D2]'
                    }`}
                  />
                  {errors.gearQuantity && <p className="text-xs text-red-600 mt-1">{errors.gearQuantity}</p>}
                </div>
              </div>

              {/* Gear Identification / Markings (Optional) */}
              <div className="mt-4">
                <label htmlFor="manualGearMarkings" className="block text-xs font-bold uppercase text-[#071B2B] mb-1">
                  Gear Identification / Markings <span className="text-slate-400 font-normal font-mono">(Optional)</span>
                </label>
                <input
                  id="manualGearMarkings"
                  type="text"
                  placeholder="e.g. Yellow marker buoy with black cross, owner initial tags, float color"
                  value={gearMarkings}
                  onChange={(e) => setGearMarkings(e.target.value)}
                  className="w-full bg-white border border-[#B2D5D3] rounded-lg px-3 py-2 text-xs text-[#071B2B] focus:outline-none focus:border-[#00D5D2]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                <div>
                  <label htmlFor="manualSize" className="block text-xs font-bold uppercase text-[#071B2B] mb-1">
                    Estimated Size / Mass
                  </label>
                  <select
                    id="manualSize"
                    value={estimatedSize}
                    onChange={(e) => setEstimatedSize(e.target.value)}
                    className="w-full bg-white border border-[#B2D5D3] rounded-lg px-3 py-2 text-xs text-[#071B2B] focus:outline-none focus:border-[#00D5D2]"
                  >
                    <option>Small (&lt; 10 meters / single trap)</option>
                    <option>Medium (10 - 50 meters)</option>
                    <option>Large (50 - 200 meters)</option>
                    <option>Massive Industrial Net (&gt; 200 meters)</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="manualWaterPos" className="block text-xs font-bold uppercase text-[#071B2B] mb-1">
                    Water Position at Loss
                  </label>
                  <select
                    id="manualWaterPos"
                    value={waterPosition}
                    onChange={(e) => setWaterPosition(e.target.value)}
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
                  <label htmlFor="manualSeaState" className="block text-xs font-bold uppercase text-[#071B2B] mb-1">
                    Sea State at Loss
                  </label>
                  <select
                    id="manualSeaState"
                    value={seaState}
                    onChange={(e) => setSeaState(e.target.value)}
                    className="w-full bg-white border border-[#B2D5D3] rounded-lg px-3 py-2 text-xs text-[#071B2B] focus:outline-none focus:border-[#00D5D2]"
                  >
                    <option>Calm (Glassy / &lt;1 ft waves)</option>
                    <option>Moderate (2-4 ft chop)</option>
                    <option>Rough (5-8 ft swells)</option>
                    <option>Severe (Gale / Heavy sea)</option>
                  </select>
                </div>
              </div>

              {/* Photo Evidence & Notes */}
              <div className="mt-4 pt-3 border-t border-[#B4D9D7]/60">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoSelect}
                  className="hidden"
                />

                <div className="flex items-center gap-3 mb-3">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-lg bg-white border border-[#B4D9D7] hover:bg-slate-50 text-xs font-semibold text-[#075E63] flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[16px]">upload_file</span>
                    <span>Upload Gear Photo (Optional)</span>
                  </button>
                  {photoFile && <span className="text-xs text-emerald-700 font-semibold">{photoFile.name}</span>}
                </div>

                <label htmlFor="manualDesc" className="block text-xs font-bold uppercase text-[#071B2B] mb-1">
                  Additional Notes / Observations
                </label>
                <textarea
                  id="manualDesc"
                  rows={2}
                  placeholder="Describe the lost gear, buoy flags, current drift observations, or nearby boats..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
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
                  checked={declarationConfirmed}
                  onChange={(e) => {
                    setDeclarationConfirmed(e.target.checked);
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
                    <span>Submitting Manual Report...</span>
                  </>
                ) : (
                  <>
                    <span>Submit Manual Location Report</span>
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

export default ManualReportPage;
