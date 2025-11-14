import {axiosInstance} from "../axiosInstance.ts";
import type {
    CreateSessionResponse,
    SignCallbackPayload,
    SignCallbackResponse,
    SignStatusResponse
} from "../../types/sign.t.ts";

export const createSession = async (sessionUUID: string, phoneNumber: string): Promise<CreateSessionResponse> => {
    const {data} = await axiosInstance.get<CreateSessionResponse>(`/api/sign/create_session`, {
        params: { sessionUUID, phoneNumber },
    });
    return data;
};

export const fetchQr = async (sessionUUID: string): Promise<{ imageUrl: string; contentType: string | null }> => {
    const response = await axiosInstance.get(`/api/qr`, {
        params: { sessionUUID },
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

export const getSignStatus = async (sessionUUID: string): Promise<SignStatusResponse> => {
    try {
        if (typeof window !== 'undefined') {
            const pathname = window.location?.pathname || '';
            const allowlist = ['/login', '/admin', '/completed'];
            if (!allowlist.some(p => pathname.startsWith(p))) {
                // Диагностический лог — покажет откуда вызван
                console.debug('[getSignStatus] blocked call', { sessionId: sessionUUID, pathname, stack: new Error().stack });
                return Promise.reject(new Error(`getSignStatus blocked on path ${pathname}`));
            }
        }
    } catch (e) {
        // не ломаем поведение в случае ошибки в диагностике
        console.warn('[getSignStatus] diagnostic check failed', e);
    }

    const {data} = await axiosInstance.get<SignStatusResponse>(`/api/sign/status`, {
        params: { sessionUUID },
    });
    return data;
};

export const getEgovMobileUrl = async (sessionUUID: string): Promise<{ url: string; sessionUUID: string }> => {
    const {data} = await axiosInstance.get<{ url: string; sessionUUID: string }>(`/api/egov-mobile-url`, {
        params: { sessionUUID },
    });
    return data;
};

export const postSignCallback = async (payload: SignCallbackPayload): Promise<SignCallbackResponse> => {
    const {data} = await axiosInstance.post<SignCallbackResponse>(`/api/sign/callback`, payload, {
        headers: {"Content-Type": "application/json"},
    });
    return data;
};
