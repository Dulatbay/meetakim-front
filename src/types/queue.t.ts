export type QueueStatus = 'WAITING' | 'BUFFER' | 'ACTIVE' | 'COMPLETED' | 'NOT_IN_QUEUE';

export interface QueueResponse {
    number: number | null;
    status: QueueStatus;
    meetingUrl: string | null;
}