import axiosInstance from "../axiosInstance";
import type {
    QueueItem,
    StatusChangeResponse,
    MeetingUrlUpdateResponse,
    BulkStatusUpdateResponse,
    QueueStats,
    DeleteQueueResponse,
    QueueStatus,
    PageableResponse,
    SortDirection
} from "../../types/moderator.t";

const BASE_PATH = '/api/citizen-moderator';

// Получить список всех очередей с пагинацией
export const fetchQueues = async (
    status?: QueueStatus,
    page: number = 0,
    size: number = 20,
    sort: string = 'sequenceNumber',
    direction: SortDirection = 'ASC'
): Promise<PageableResponse<QueueItem>> => {
    const params: Record<string, string | number> = {
        page,
        size,
        sort,
        direction
    };

    if (status) {
        params.status = status;
    }

    const {data} = await axiosInstance.get<PageableResponse<QueueItem>>(`${BASE_PATH}/queues`, {
        params
    });

    return data;
};

// Получить очередь по ID
export const fetchQueueById = async (id: number): Promise<QueueItem> => {
    const {data} = await axiosInstance.get<QueueItem>(`${BASE_PATH}/queue/${id}`);
    return data;
};

// Получить очередь по номеру
export const fetchQueueBySequence = async (sequenceNumber: number): Promise<QueueItem> => {
    const {data} = await axiosInstance.get<QueueItem>(`${BASE_PATH}/queue/by-sequence/${sequenceNumber}`);
    return data;
};

// Изменить статус очереди
export const updateQueueStatus = async (id: number, status: QueueStatus): Promise<StatusChangeResponse> => {
    const {data} = await axiosInstance.put<StatusChangeResponse>(
        `${BASE_PATH}/queue/${id}/status`,
        null,
        {params: {status}}
    );
    return data;
};

// Изменить ссылку на встречу
export const updateMeetingUrl = async (id: number, meetingUrl: string): Promise<MeetingUrlUpdateResponse> => {
    const {data} = await axiosInstance.put<MeetingUrlUpdateResponse>(
        `${BASE_PATH}/queue/${id}/meeting-url`,
        null,
        {params: {meetingUrl}}
    );
    return data;
};

// Массово изменить статус
export const bulkUpdateStatus = async (
    fromSeq: number,
    toSeq: number,
    status: QueueStatus
): Promise<BulkStatusUpdateResponse> => {
    const {data} = await axiosInstance.put<BulkStatusUpdateResponse>(
        `${BASE_PATH}/queues/bulk-status`,
        null,
        {params: {fromSeq, toSeq, status}}
    );
    return data;
};

// Получить статистику
export const fetchStats = async (): Promise<QueueStats> => {
    const {data} = await axiosInstance.get<QueueStats>(`${BASE_PATH}/stats`);
    return data;
};

// Удалить/отменить очередь
export const deleteQueue = async (id: number): Promise<DeleteQueueResponse> => {
    const {data} = await axiosInstance.delete<DeleteQueueResponse>(`${BASE_PATH}/queue/${id}`);
    return data;
};
