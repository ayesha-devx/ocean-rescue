/**
 * OceanRescue API Service
 * Base configuration and endpoints for communicating with the FastAPI backend.
 * (Backend connection will be integrated in future phases)
 */

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export default {
  API_BASE_URL
};
