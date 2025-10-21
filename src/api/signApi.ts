import axios, {type AxiosInstance} from "axios";

const EGOV_BASE_URL = "http://77.240.39.109:8080";

export const egovAxios: AxiosInstance = axios.create({
    baseURL: EGOV_BASE_URL,
});

egovAxios.interceptors.request.use(
    (config) => {
        config.headers['Authorization'] = `Basic ${btoa('admin:admin123')}`;
        return config;
    },
    (error) => Promise.reject(error)
);