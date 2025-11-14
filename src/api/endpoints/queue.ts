import {axiosInstance} from "../axiosInstance.ts";
import type {JoinQueueResponse, PositionResponse} from "../../types/queue.t.ts";

export const queueJoin = async (sessionUUID: string): Promise<JoinQueueResponse> => {
    const {data} = await axiosInstance.post<JoinQueueResponse>(`/api/citizen/join`, null, {
        params: { sessionUUID },
    });
    return data;
}

export const fetchPosition = async (sessionUUID: string): Promise<PositionResponse> => {
    const {data} = await axiosInstance.get<PositionResponse>(`/api/citizen/position`, {
        params: { sessionUUID },
    });
    return data;
}