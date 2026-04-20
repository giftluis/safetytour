import axios from 'axios';
import { getTokens } from './auth';

const api = axios.create({
    baseURL: 'http://127.0.0.1:8000/api/',
    headers: {
        'Content-Type': 'application/json',
    },
});

api.interceptors.request.use((config) => {
    const tokens = getTokens();
    if (tokens && tokens.access) {
        config.headers.Authorization = `Bearer ${tokens.access}`;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

export default api;
