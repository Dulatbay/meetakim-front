import { axiosInstance } from "../axiosInstance";

// QBox API Types
export interface MeetingUrlResponse {
    meetingUrl: string;
    displayName: string;
    roomType: 'admin' | 'akim';
    sessionUUID?: string;
}

export interface EnsureMeetingResponse {
    code: string;
    uid: string;
    meetingUrl: string;
    roomType: 'admin' | 'akim';
    status: string;
}

export interface MeetingInfoResponse {
    uid: string;
    code: string;
    title: string;
    state: number;
    host_name: string;
    type?: number;
    privacy?: number;
    schedule_time?: string;
    created_at?: string;
}

export interface HealthCheckResponse {
    status: 'healthy' | 'unhealthy';
    qboxConnection: string;
    adminMeeting?: {
        code: string;
        uid: string;
        roomType: 'admin';
    };
    akimMeeting?: {
        code: string;
        uid: string;
        roomType: 'akim';
    };
    error?: string;
}

export interface ResetSessionResponse {
    message: string;
}

// API Functions

// Получить ссылку для гражданина (комната r1)
export const getCitizenMeetingUrl = async (sessionUUID: string): Promise<MeetingUrlResponse> => {
    const { data } = await axiosInstance.get<MeetingUrlResponse>('/api/qbox/meeting-url', {
        params: { sessionUUID }
    });
    return data;
};

// Получить ссылку для администратора (комната r1)
export const getAdminMeetingUrl = async (displayName: string = 'Администратор'): Promise<MeetingUrlResponse> => {
    const { data } = await axiosInstance.get<MeetingUrlResponse>('/api/qbox/admin-meeting-url', {
        params: { displayName }
    });
    return data;
};

// Получить ссылку для акима (комната r2)
export const getAkimMeetingUrl = async (displayName: string = 'Аким'): Promise<MeetingUrlResponse> => {
    const { data } = await axiosInstance.get<MeetingUrlResponse>('/api/qbox/akim-meeting-url', {
        params: { displayName }
    });
    return data;
};

// Создать/получить комнату администратора (r1)
export const ensureAdminMeeting = async (): Promise<EnsureMeetingResponse> => {
    const { data } = await axiosInstance.post<EnsureMeetingResponse>('/api/qbox/ensure-admin-meeting');
    return data;
};

// Создать/получить комнату акима (r2)
export const ensureAkimMeeting = async (): Promise<EnsureMeetingResponse> => {
    const { data } = await axiosInstance.post<EnsureMeetingResponse>('/api/qbox/ensure-akim-meeting');
    return data;
};

// Получить информацию о встрече
export const getMeetingInfo = async (code: string): Promise<MeetingInfoResponse> => {
    const { data } = await axiosInstance.get<MeetingInfoResponse>('/api/qbox/meeting-info', {
        params: { code }
    });
    return data;
};

// Health check для комнаты администратора
export const getAdminHealth = async (): Promise<HealthCheckResponse> => {
    const { data } = await axiosInstance.get<HealthCheckResponse>('/api/qbox/health');
    return data;
};

// Health check для комнаты акима
export const getAkimHealth = async (): Promise<HealthCheckResponse> => {
    const { data } = await axiosInstance.get<HealthCheckResponse>('/api/qbox/health-akim');
    return data;
};

// Сбросить токены сессии
export const resetQboxSession = async (): Promise<ResetSessionResponse> => {
    const { data } = await axiosInstance.post<ResetSessionResponse>('/api/qbox/reset-session');
    return data;
};
