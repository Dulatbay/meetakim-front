export type QueueStatus = 'WAITING' | 'IN_BUFFER' | 'SERVED' | 'CANCELLED';

export interface QueueItem {
    id: number;
    sequenceNumber: number;
    sessionId: number;
    status: QueueStatus;
    meetingUrl: string | null;
    createdAt: string;
    servedAt?: string | null;
    fullName?: string;
    iin?: string;
    phoneNumber?: string;
}

export interface PageableResponse<T> {
    content: T[];
    pageable: {
        pageNumber: number;
        pageSize: number;
        sort: {
            empty: boolean;
            sorted: boolean;
            unsorted: boolean;
        };
        offset: number;
        paged: boolean;
        unpaged: boolean;
    };
    totalPages: number;
    totalElements: number;
    last: boolean;
    size: number;
    number: number;
    sort: {
        empty: boolean;
        sorted: boolean;
        unsorted: boolean;
    };
    numberOfElements: number;
    first: boolean;
    empty: boolean;
}

export type SortDirection = 'ASC' | 'DESC';

export interface StatusChangeResponse {
    message: string;
    oldStatus: QueueStatus;
    newStatus: QueueStatus;
    queue: QueueItem;
}

export interface MeetingUrlUpdateResponse {
    message: string;
    oldUrl: string | null;
    newUrl: string;
    queue: QueueItem;
}

export interface BulkStatusUpdateResponse {
    message: string;
    updatedCount: number;
    fromSeq: number;
    toSeq: number;
    newStatus: QueueStatus;
}

export interface QueueStats {
    total: number;
    waiting: number;
    inBuffer: number;
    served: number;
    cancelled: number;
}

export interface DeleteQueueResponse {
    message: string;
    queue: QueueItem;
}
