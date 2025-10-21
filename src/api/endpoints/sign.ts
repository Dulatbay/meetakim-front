import {egovAxios} from "../signApi";
import type {
    SignCallbackPayload,
    SignCallbackResponse,
    SignInitResponse,
    SignStatusResponse
} from "../../types/sign.t.ts";

export const fetchQr = async (sessionId: string): Promise<{ imageUrl: string; contentType: string | null }> => {
    const response = await egovAxios.get(`/api/qr`, {
        params: {sessionId},
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
    const {data} = await egovAxios.get<SignInitResponse>(`/api/sign/init`, {
        params: {sessionId},
    });
    return data;
};

export const getSignStatus = async (sessionId: string): Promise<SignStatusResponse> => {
    const {data} = await egovAxios.get<SignStatusResponse>(`/api/sign/status`, {
        params: {sessionId},
    });
    return data;
};

export const postSignCallback = async (payload: SignCallbackPayload): Promise<SignCallbackResponse> => {
    const {data} = await egovAxios.post<SignCallbackResponse>(`/api/sign/callback`, payload, {
        headers: {"Content-Type": "application/json"},
    });
    return data;
};
