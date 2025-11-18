import axios from "axios";
import {getToken, getAdminAuth} from "../utils/tokenUtils.ts";

const BASE_URL = "https://meet-akim.kz"; // http://localhost:8080
// const BASE_URL = "http://localhost:8080"; // http://localhost:8080

export const axiosInstance = axios.create({
    baseURL: BASE_URL,
    headers: {
        "Content-Type": "application/json",
    },
});

axiosInstance.interceptors.request.use(
    (config) => {
        const adminAuth = getAdminAuth();
        if (adminAuth) {
            config.headers['Authorization'] = `Basic ${adminAuth}`;
        } else {
            const token = getToken();
            if (token) {
                config.headers['Authorization'] = `Bearer ${token}`;
            }
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


