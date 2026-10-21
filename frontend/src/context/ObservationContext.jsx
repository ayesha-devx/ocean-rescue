import React, { createContext, useContext, useState, useEffect } from 'react';

const ObservationContext = createContext(null);

const STORAGE_KEY_OBSERVATIONS = 'oceanrescue_observations_v1';
const STORAGE_KEY_SELECTED_ID = 'oceanrescue_selected_obs_id_v1';
const STORAGE_KEY_CURRENT_INFERENCE = 'oceanrescue_current_inference_v1';

// Base simulated reference targets for the demonstration dashboard
const INITIAL_OBSERVATIONS = [
  {
    id: 'OR-2024-094',
    name: 'Ghost Gillnet (45m)',
    typeName: 'Ghost Gillnet (45m)',
    class_name: 'fishing_net',
    confidence: 0.942,
    confidencePercent: 94.2,
    riskScore: 96,
    severity: 'critical',
    reviewStatus: 'pending', // Requirement 3: Never mark verified before user confirms
    hasGps: true,
    coords: '17.2860° S, 178.4100° E',
    utmCoords: 'Zone 60S 649821E 8088450N',
    currentDrift: '1.4 kts @ 165° SSE (Simulated)',
    depth: '-38.4m Depth (Simulated)',
    localDepth: '-42.1 m',
    timeToStranding: 'Est. 8h 40m',
    strandingPercent: 84,
    estArea: '340 m²',
    sector: 'Tavaru Nursery Sector 4',
    warning:
      'CRITICAL IMPACT WARNING: Drifting southward along shelf boundary toward Tavaru Marine Reserve Zone A. High entanglement risk to endangered green sea turtles & shallow Acropora reef structures.',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBFcqulbxW3gdOZbMGOFT9xJZOm_1bv9s0Y9DK-VciIGnos4gExkHYEXvoyH7I6jOBorQAwYsqj0F18MflB8jhaqhcicFmTqRdkE6YyfcnFZ2of0NNA4QkK6JTNHOfOdfV4MoawStkXGl8_3gVamEJvt-DulqglsjtyBggnYF6BqFwDmmWDQTj54EEHnZTtrVaue8SFESVW5GDnh5cp3LIDXurRhJJGBfm2gnqT53I5pnnnOp616APS',
    cx: 420,
    cy: 290,
    timestamp: '2024-10-24T11:18:42Z',
    isSimulated: true,
    source: 'Archive Reference Frame #094',
    bbox_xyxy: [1420, 830, 1830, 1120],
    segmentation_polygon: [],
    has_mask: false,
    notes: 'Reference anchor frame for Tavaru reef sector.'
  },
  {
    id: 'OR-2024-089',
    name: 'Mooring Line (80m)',
    typeName: 'Mooring Line (80m)',
    class_name: 'rope_line',
    confidence: 0.896,
    confidencePercent: 89.6,
    riskScore: 78,
    severity: 'high',
    reviewStatus: 'confirmed',
    hasGps: true,
    coords: '17.2841° S, 178.4012° E',
    utmCoords: 'Zone 60S 648910E 8088620N',
    currentDrift: '0.9 kts @ 170° S (Simulated)',
    depth: '-28.0m Depth (Simulated)',
    localDepth: '-32.5 m',
    timeToStranding: 'Est. 14h 20m',
    strandingPercent: 62,
    estArea: '160 m²',
    sector: 'Western Channel Shoals',
    warning:
      'HIGH THREAT ADVISORY: Heavy poly-synthetic hawser drifting toward artisanal navigation corridor. Risk of propeller fouling and seafloor scouring.',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBtHN0aQp_cDKWLH5c2ePgRxNfrR1GoXfnl9BjQnastQWWaxhG-3QvoFyV-9vcDjcNESbY5kI4Qf3TidJV_PvBd11n9a8lpaqWkglaZZfXNhntN9Bd2uFe-3a36n9E3Lcaji7W8VolMZG8MVAayl_0Ca_J7vL74mejPp8CvL3LqSDVm61m1WZrA178cl32yHbcSZN1lxTFBRPufDMoJ24lAW52i6Wgu55D1c-gILDAoLJr8I-hWDpDd',
    cx: 240,
    cy: 480,
    timestamp: '2024-10-24T09:45:10Z',
    isSimulated: true,
    source: 'Archive Reference Frame #089',
    bbox_xyxy: [980, 1240, 1600, 1350],
    segmentation_polygon: [],
    has_mask: false,
    notes: 'Confirmed mooring line posing navigational hazard.'
  },
  {
    id: 'OR-2024-072',
    name: 'Fishnet Scrap (12m)',
    typeName: 'Fishnet scrap (12m)',
    class_name: 'fishing_net',
    confidence: 0.713,
    confidencePercent: 71.3,
    riskScore: 54,
    severity: 'medium',
    reviewStatus: 'pending',
    hasGps: true,
    coords: '17.2910° S, 178.3980° E',
    utmCoords: 'Zone 60S 648550E 8087850N',
    currentDrift: '0.6 kts @ 185° S (Simulated)',
    depth: '-64.5m Depth (Simulated)',
    localDepth: '-68.2 m',
    timeToStranding: 'Est. 28h 10m',
    strandingPercent: 38,
    estArea: '48 m²',
    sector: 'Pelagic Outer Shelf',
    warning:
      'MONITORED TARGET: Fragmented netting buoyant at intermediate depth. Currently tracking south along open trench with low habitat impact vector.',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBFcqulbxW3gdOZbMGOFT9xJZOm_1bv9s0Y9DK-VciIGnos4gExkHYEXvoyH7I6jOBorQAwYsqj0F18MflB8jhaqhcicFmTqRdkE6YyfcnFZ2of0NNA4QkK6JTNHOfOdfV4MoawStkXGl8_3gVamEJvt-DulqglsjtyBggnYF6BqFwDmmWDQTj54EEHnZTtrVaue8SFESVW5GDnh5cp3LIDXurRhJJGBfm2gnqT53I5pnnnOp616APS',
    cx: 1010,
    cy: 210,
    timestamp: '2024-10-20T14:30:00Z',
    isSimulated: true,
    source: 'Archive Reference Frame #072',
    bbox_xyxy: [310, 273, 895, 533],
    segmentation_polygon: [],
    has_mask: false,
    notes: 'Monitored scrap fragment in pelagic trench.'
  }
];

export const ObservationProvider = ({ children }) => {
  const [observations, setObservations] = useState(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY_OBSERVATIONS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Failed to parse stored observations:', e);
    }
    return INITIAL_OBSERVATIONS;
  });

  const [selectedObservationId, setSelectedObservationId] = useState(() => {
    try {
      const storedId = sessionStorage.getItem(STORAGE_KEY_SELECTED_ID);
      if (storedId) return storedId;
    } catch (e) {
      console.warn('Failed to parse selected observation ID:', e);
    }
    return 'OR-2024-094';
  });

  const [currentInference, setCurrentInference] = useState(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY_CURRENT_INFERENCE);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.warn('Failed to parse current inference:', e);
    }
    return null;
  });

  // Save changes to sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY_OBSERVATIONS, JSON.stringify(observations));
    } catch (e) {
      console.warn('Could not save observations to sessionStorage:', e);
    }
  }, [observations]);

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY_SELECTED_ID, selectedObservationId);
    } catch (e) {
      console.warn('Could not save selected observation ID to sessionStorage:', e);
    }
  }, [selectedObservationId]);

  useEffect(() => {
    try {
      if (currentInference) {
        sessionStorage.setItem(STORAGE_KEY_CURRENT_INFERENCE, JSON.stringify(currentInference));
      } else {
        sessionStorage.removeItem(STORAGE_KEY_CURRENT_INFERENCE);
      }
    } catch (e) {
      console.warn('Could not save current inference to sessionStorage:', e);
    }
  }, [currentInference]);

  // Method to add a reviewed live observation to the shared store
  const addObservation = (newObs) => {
    setObservations((prev) => {
      // If observation already exists with this ID, update it; otherwise prepend it
      const index = prev.findIndex((o) => o.id === newObs.id);
      if (index >= 0) {
        const updated = [...prev];
        updated[index] = { ...updated[index], ...newObs };
        return updated;
      }
      return [newObs, ...prev];
    });
    setSelectedObservationId(newObs.id);
  };

  // Method to update review status of an existing observation
  const updateObservationReview = (obsId, reviewStatus) => {
    setObservations((prev) =>
      prev.map((obs) => (obs.id === obsId ? { ...obs, reviewStatus } : obs))
    );
  };

  // Currently selected observation object
  const selectedObservation =
    observations.find((o) => o.id === selectedObservationId) || observations[0] || null;

  // Split into located (with coordinates) vs unlocated (no coordinates)
  const locatedObservations = observations.filter((o) => o.hasGps && o.coords);
  const unlocatedObservations = observations.filter((o) => !o.hasGps || !o.coords);

  return (
    <ObservationContext.Provider
      value={{
        observations,
        locatedObservations,
        unlocatedObservations,
        selectedObservationId,
        setSelectedObservationId,
        selectedObservation,
        addObservation,
        updateObservationReview,
        currentInference,
        setCurrentInference,
      }}
    >
      {children}
    </ObservationContext.Provider>
  );
};

export const useObservations = () => {
  const context = useContext(ObservationContext);
  if (!context) {
    throw new Error('useObservations must be used within an ObservationProvider');
  }
  return context;
};

export default ObservationContext;
