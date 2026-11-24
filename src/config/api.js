const LOCAL_API_BASE_URL = '/api/';
const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();
const productionApiBaseUrl = configuredApiBaseUrl || LOCAL_API_BASE_URL;

export const API_BASE_URL = import.meta.env.DEV
  ? LOCAL_API_BASE_URL
  : productionApiBaseUrl.endsWith('/') ? productionApiBaseUrl : `${productionApiBaseUrl}/`;

export function apiUrl(path = '') {
  return `${API_BASE_URL}${path.replace(/^\/+/, '')}`;
}
