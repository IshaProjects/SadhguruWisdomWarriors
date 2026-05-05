import axios from 'axios';

const baseURL = import.meta.env.VITE_API_BASE_URL || '/api';

const api = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const isRefreshCall = (config) =>
  typeof config?.url === 'string' && config.url.includes('/auth/refresh');

let refreshPromise = null;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status !== 401 || !originalRequest || originalRequest._retry) {
      return Promise.reject(error);
    }

    if (isRefreshCall(originalRequest)) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      refreshPromise = null;
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) throw new Error('No refresh token');

      if (!refreshPromise) {
        refreshPromise = axios
          .post(`${baseURL}/auth/refresh`, { refreshToken })
          .then((res) => {
            localStorage.setItem('accessToken', res.data.accessToken);
            localStorage.setItem('refreshToken', res.data.refreshToken);
            return res.data.accessToken;
          })
          .finally(() => {
            refreshPromise = null;
          });
      }

      const accessToken = await refreshPromise;
      originalRequest.headers.Authorization = `Bearer ${accessToken}`;
      return api(originalRequest);
    } catch (e) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
      return Promise.reject(e);
    }
  }
);

export default api;
