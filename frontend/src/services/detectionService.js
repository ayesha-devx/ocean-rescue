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
 * @returns {Promise<PredictResponse>}
 */
export async function predictImage(file) {
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

export { API_BASE_URL };
