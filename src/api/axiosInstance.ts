import axios from "axios";
import {getToken} from "../utils/tokenUtils.ts";

const BASE_URL = "https://meet-akim.kz"; // http://localhost:8080

const axiosInstance = axios.create({
    baseURL: BASE_URL,
    headers: {
        "Content-Type": "application/json",
    },
});

axiosInstance.interceptors.request.use(
    (config) => {
        const token = getToken();
        if (token) {
            config.headers['Authorization'] = `Basic ${btoa('admin:admin123')}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

axiosInstance.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            console.error("Session expired. Please log in again.");
        }

        if (error.response?.data?.message) {
            console.error(`API Error: ${error.response.data.message}`);
        } else {
            console.error("Unexpected error occurred", error);
        }

        return Promise.reject(error);
    }
);

export default axiosInstance;
