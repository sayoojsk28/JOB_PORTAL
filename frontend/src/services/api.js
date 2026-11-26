import axios from 'axios';
import { getAccessToken } from '../utils/authHelper';
import { API_BASE_URL } from '../utils/apiUrl';

const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use(
  (config) => {
    const token = getAccessToken();

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

export default api;
