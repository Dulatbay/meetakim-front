// Admin Session Types

export type SessionState = 'CREATED' | 'WAITING' | 'SIGNED' | 'FAILED' | 'EXPIRED';

export interface SessionResponseDto {
    sessionUuid: string;
    phoneNumber: string;
    state: SessionState;
    createdAt: string;
    signedAt: string | null;
    meetingUrl: string | null;
    citizenName: string | null;
    iin: string | null;
}

export interface PageResponse<T> {
    content: T[];
    page: number;
    size: number;
    totalElements: number;
    totalPages: number;
    first: boolean;
    last: boolean;
    empty: boolean;
}

export interface SessionFilters {
    search?: string;
    state?: SessionState;
    createdFrom?: string;
    createdTo?: string;
    page?: number;
    size?: number;
    sortBy?: 'createdAt' | 'phoneNumber' | 'state';
    sortDirection?: 'ASC' | 'DESC';
}

export interface SessionStats {
    message?: string;
    totalSessions: number;
}
