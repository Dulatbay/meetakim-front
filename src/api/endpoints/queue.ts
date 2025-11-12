import {axiosInstance} from "../axiosInstance.ts";
import type {JoinQueueResponse, PositionResponse} from "../../types/queue.t.ts";

export const queueJoin = async (sessionId: string): Promise<JoinQueueResponse> => {
    const {data} = await axiosInstance.post<JoinQueueResponse>(`/api/citizen/join`, null, {
        params: { sessionId: String(sessionId) },
    });
    return data;
}

export const fetchPosition = async (sessionId: string): Promise<PositionResponse> => {
    const {data} = await axiosInstance.get<PositionResponse>(`/api/citizen/position`, {
        params: { sessionId: String(sessionId) },
    });
    return data;
}