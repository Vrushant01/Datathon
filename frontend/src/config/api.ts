/**
 * Centralized API configuration for the frontend application.
 * Resolves the backend URL seamlessly for development and production environments.
 */

export const API_BASE_URL = 
  import.meta.env.VITE_API_BASE_URL || 
  (import.meta.env.DEV ? "http://localhost:3001" : "");

if (!import.meta.env.DEV && !API_BASE_URL) {
  console.error("CRITICAL: API_BASE_URL is not defined in the production environment. API calls will fail.");
}
