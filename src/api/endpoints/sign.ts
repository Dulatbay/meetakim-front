import {axiosInstance} from "../axiosInstance.ts";
import type {
    CreateSessionResponse,
    SignCallbackPayload,
    SignCallbackResponse,
    SignInitResponse,
    SignStatusResponse
} from "../../types/sign.t.ts";

export const createSession = async (uuid: string, phoneNumber: string): Promise<CreateSessionResponse> => {
    const {data} = await axiosInstance.get<CreateSessionResponse>(`/api/sign/create_session`, {
        params: { uuid, phoneNumber },
    });
    return data;
};

export const fetchQr = async (sessionId: string): Promise<{ imageUrl: string; contentType: string | null }> => {
    const response = await axiosInstance.get(`/api/qr`, {
        params: {sessionId: Number(sessionId)},
        responseType: "blob",
        headers: {
            Accept: "image/*",
        },
    });

    const blob = response.data as Blob;
    const contentType = response.headers?.["content-type"] ?? null;

    const imageUrl = URL.createObjectURL(blob);
    return {imageUrl, contentType};
};

export const initSign = async (sessionId: string): Promise<SignInitResponse> => {
    const {data} = await axiosInstance.get<SignInitResponse>(`/api/sign/init`, {
        params: {sessionId: Number(sessionId)},
    });
    return data;
};

export const getSignStatus = async (sessionId: string): Promise<SignStatusResponse> => {
    try {
        if (typeof window !== 'undefined') {
            const pathname = window.location?.pathname || '';
            const allowlist = ['/login', '/admin'];
            if (!allowlist.some(p => pathname.startsWith(p))) {
                // Диагностический лог — покажет откуда вызван
                console.debug('[getSignStatus] blocked call', { sessionId, pathname, stack: new Error().stack });
                return Promise.reject(new Error(`getSignStatus blocked on path ${pathname}`));
            }
        }
    } catch (e) {
        // не ломаем поведение в случае ошибки в диагностике
        console.warn('[getSignStatus] diagnostic check failed', e);
    }

    const {data} = await axiosInstance.get<SignStatusResponse>(`/api/sign/status`, {
        params: {sessionId: Number(sessionId)},
    });
    return data;
};

export const getEgovMobileUrl = async (sessionId: string): Promise<{ url: string; sessionId: string }> => {
    const {data} = await axiosInstance.get<{ url: string; sessionId: string }>(`/api/egov-mobile-url`, {
        params: {sessionId: Number(sessionId)},
    });
    return data;
};

export const postSignCallback = async (payload: SignCallbackPayload): Promise<SignCallbackResponse> => {
    const {data} = await axiosInstance.post<SignCallbackResponse>(`/api/sign/callback`, payload, {
        headers: {"Content-Type": "application/json"},
    });
    return data;
};
