
import axios from 'axios';
import { getAccessToken } from '../utils/authHelper';

const api = axios.create({
  baseURL: 'http://127.0.0.1:8000',
  
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
