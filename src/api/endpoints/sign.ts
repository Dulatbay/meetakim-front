import axiosInstance from "../axiosInstance.ts";
import type {
    CreateSessionResponse,
    SignCallbackPayload,
    SignCallbackResponse,
    SignInitResponse,
    SignStatusResponse
} from "../../types/sign.t.ts";

export const createSession = async (uuid: string): Promise<CreateSessionResponse> => {
    const {data} = await axiosInstance.get<CreateSessionResponse>(`/api/sign/create_session`, {
        params: {uuid},
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
    const {data} = await axiosInstance.get<SignStatusResponse>(`/api/sign/status`, {
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
