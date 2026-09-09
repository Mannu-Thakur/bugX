const resolveApiUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_URL;

  // If VITE_API_URL is set to an absolute URL (e.g. Render/production backend),
  // always use it directly — this is the correct path for Vercel deployments.
  if (envUrl && !envUrl.startsWith('/') && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) {
    return envUrl;
  }

  // Local development on localhost: use VITE_API_URL as-is (relative /api/v1
  // is handled by the Vite dev-server proxy).
  if (
    typeof window === 'undefined' ||
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1'
  ) {
    return envUrl || 'http://127.0.0.1:8000/api/v1';
  }

  // LAN access (non-localhost, no absolute VITE_API_URL set):
  // derive backend URL from browser hostname so other devices on the same
  // Wi-Fi network reach the correct backend port.
  return `${window.location.protocol}//${window.location.hostname}:8000/api/v1`;
};

export const ENV = {
  API_URL: resolveApiUrl(),
  APP_NAME: import.meta.env.VITE_APP_NAME || 'bugX',
};
