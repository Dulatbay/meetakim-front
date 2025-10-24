export type QueueStatus = 'WAITING' | 'IN_BUFFER' | 'SERVED' | 'CANCELLED';

export interface PositionResponse {
    number: number | null;
    status: QueueStatus;
    meetingUrl: string | null;
}

export interface JoinQueueResponse {
    id: number;
    sequenceNumber: number;
    iin: string | null;
    sessionId: number;
    user: unknown | null;
    createdAt: string;
    status: string;
    servedAt: string | null;
}
