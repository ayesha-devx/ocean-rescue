/**
 * OceanRescue Detection API Service
 * 
 * Communicates with the FastAPI backend endpoints:
 * - GET  /api/v1/model-info
 * - GET  /api/v1/health
 * - POST /api/v1/predict
 * 
 * Uses import.meta.env.VITE_API_BASE_URL with fallback to http://127.0.0.1:8000.
 */

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '');

export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB

/**
 * Fetch model information and metadata from FastAPI.
 */
export async function getModelInfo() {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/model-info`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || `Server returned HTTP ${res.status}`);
    }

    return await res.json();
  } catch (err) {
    console.error('Failed to fetch model info:', err);
    throw err;
  }
}

/**
 * Fetch health status of the API and YOLOv8-seg model load.
 */
export async function getHealth() {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/health`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || `Server returned HTTP ${res.status}`);
    }

    return await res.json();
  } catch (err) {
    console.error('Failed to fetch API health:', err);
    throw err;
  }
}

/**
 * Upload an image file for YOLOv8-seg inference.
 * 
 * @param {File} file - The user selected image file (JPEG, PNG, or WebP)
 * @param {number|null} reportId - Optional incident report ID to link detections to in PostgreSQL
 * @param {number|null} conf - Optional confidence threshold (0.0 to 1.0)
 * @returns {Promise<PredictResponse>}
 */
export async function predictImage(file, reportId = null, conf = null) {
  // Client-side validations
  if (!file) {
    throw new Error('Please select an image file to upload.');
  }

  const fileType = (file.type || '').toLowerCase();
  const fileExtension = '.' + (file.name.split('.').pop() || '').toLowerCase();
  const validExtensions = ['.jpg', '.jpeg', '.png', '.webp'];

  const isMimeValid = ALLOWED_MIME_TYPES.includes(fileType);
  const isExtValid = validExtensions.includes(fileExtension);

  if (!isMimeValid && !isExtValid) {
    throw new Error(
      `Invalid file format "${file.name}". Supported formats: JPG, JPEG, PNG, and WebP.`
    );
  }

  if (file.size <= 0) {
    throw new Error('The selected image file is empty (0 bytes).');
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    throw new Error(
      `File size (${sizeMb} MB) exceeds the maximum allowed limit of 20 MB.`
    );
  }

  const formData = new FormData();
  formData.append('file', file);
  if (reportId) {
    formData.append('report_id', reportId);
  }
  if (conf !== null && conf !== undefined) {
    formData.append('conf', conf);
  }

  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/predict`, {
      method: 'POST',
      body: formData,
      headers: {
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      const detail = errData.detail || `Inference error: HTTP ${res.status}`;
      throw new Error(detail);
    }

    const data = await res.json();
    return data;
  } catch (err) {
    if (err.name === 'TypeError' && err.message.includes('fetch')) {
      throw new Error(
        `Could not connect to FastAPI backend at ${API_BASE_URL}. Ensure the backend service is running on port 8000 and CORS allows this origin.`
      );
    }
    throw err;
  }
}

/**
 * Execute YOLOv8 detection on an existing report's attached photograph.
 * Saves candidate detections to PostgreSQL `ai_detections`.
 * 
 * @param {number} reportId
 * @param {number|null} conf
 */
export async function runReportInference(reportId, conf = null) {
  const url = new URL(`${API_BASE_URL}/api/v1/detections/run/${reportId}`);
  if (conf !== null && conf !== undefined) {
    url.searchParams.append('conf', conf);
  }

  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || `Inference run failed: HTTP ${res.status}`);
  }

  return await res.json();
}

/**
 * Fetch all saved AI detections linked to a specific report ID.
 * 
 * @param {number} reportId
 */
export async function getDetectionsByReport(reportId) {
  const res = await fetch(`${API_BASE_URL}/api/v1/detections/by-report/${reportId}`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || `Failed to fetch detections: HTTP ${res.status}`);
  }

  return await res.json();
}

/**
 * List detections with optional filtering (status, class, incident ID) and pagination.
 * 
 * @param {Object} params
 * @param {number|null} [params.reportId]
 * @param {string|null} [params.reviewStatus] - 'pending', 'confirmed', 'rejected', or 'all'
 * @param {string|null} [params.detectedClass] - 'fishing_net', 'rope_line', or 'all'
 * @param {string|null} [params.modelName]
 * @param {number} [params.page=1]
 * @param {number} [params.pageSize=20]
 */
export async function listDetections({
  reportId = null,
  reviewStatus = null,
  detectedClass = null,
  modelName = null,
  page = 1,
  pageSize = 20,
} = {}) {
  const url = new URL(`${API_BASE_URL}/api/v1/detections`);
  if (reportId) url.searchParams.append('report_id', reportId);
  if (reviewStatus && reviewStatus !== 'all') url.searchParams.append('review_status', reviewStatus);
  if (detectedClass && detectedClass !== 'all') url.searchParams.append('detected_class', detectedClass);
  if (modelName) url.searchParams.append('model_name', modelName);
  url.searchParams.append('page', page);
  url.searchParams.append('page_size', pageSize);

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || `Failed to list detections: HTTP ${res.status}`);
  }

  return await res.json();
}

/**
 * Fetch an individual detection by ID.
 * 
 * @param {number} detectionId
 */
export async function getDetectionById(detectionId) {
  const res = await fetch(`${API_BASE_URL}/api/v1/detections/${detectionId}`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || `Failed to fetch detection #${detectionId}: HTTP ${res.status}`);
  }

  return await res.json();
}

/**
 * Confirm gear presence for an individual AI detection.
 * 
 * @param {number} detectionId
 * @param {Object} [options]
 * @param {string} [options.reviewedBy="NGO Field Officer"]
 * @param {string} [options.reviewNotes=""]
 */
export async function confirmDetection(detectionId, { reviewedBy = 'NGO Field Officer', reviewNotes = '' } = {}) {
  const res = await fetch(`${API_BASE_URL}/api/v1/detections/${detectionId}/confirm`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      reviewed_by: reviewedBy,
      review_notes: reviewNotes,
    }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || `Failed to confirm detection #${detectionId}: HTTP ${res.status}`);
  }

  return await res.json();
}

/**
 * Flag an individual AI detection as a false positive with optional explanation.
 * 
 * @param {number} detectionId
 * @param {Object} [options]
 * @param {string} [options.reviewedBy="NGO Field Officer"]
 * @param {string} [options.reviewNotes=""]
 */
export async function rejectDetection(detectionId, { reviewedBy = 'NGO Field Officer', reviewNotes = '' } = {}) {
  const res = await fetch(`${API_BASE_URL}/api/v1/detections/${detectionId}/reject`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      reviewed_by: reviewedBy,
      review_notes: reviewNotes,
    }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || `Failed to reject detection #${detectionId}: HTTP ${res.status}`);
  }

  return await res.json();
}

/**
 * Update an individual AI detection review decision (confirmed, rejected, or pending).
 * 
 * @param {number} detectionId
 * @param {Object} payload
 * @param {string} payload.reviewStatus - 'confirmed', 'rejected', or 'pending'
 * @param {string} [payload.reviewedBy="NGO Field Officer"]
 * @param {string} [payload.reviewNotes=""]
 */
export async function reviewDetection(detectionId, { reviewStatus, reviewedBy = 'NGO Field Officer', reviewNotes = '' }) {
  const res = await fetch(`${API_BASE_URL}/api/v1/detections/${detectionId}/review`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      review_status: reviewStatus,
      reviewed_by: reviewedBy,
      review_notes: reviewNotes,
    }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || `Failed to update review for detection #${detectionId}: HTTP ${res.status}`);
  }

  return await res.json();
}

export { API_BASE_URL };

