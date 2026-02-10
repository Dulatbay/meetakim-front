import { axiosInstance } from "../axiosInstance";
import type { SessionResponseDto, PageResponse, SessionFilters, SessionStats } from "../../types/admin.t";

// Получить список сессий с фильтрами
export const fetchSessions = async (filters: SessionFilters = {}): Promise<PageResponse<SessionResponseDto>> => {
    const params: Record<string, string | number> = {
        page: filters.page ?? 0,
        size: filters.size ?? 20,
        sortBy: filters.sortBy ?? 'createdAt',
        sortDirection: filters.sortDirection ?? 'DESC',
    };

    if (filters.search) params.search = filters.search;
    if (filters.state) params.state = filters.state;
    if (filters.createdFrom) params.createdFrom = filters.createdFrom;
    if (filters.createdTo) params.createdTo = filters.createdTo;

    const { data } = await axiosInstance.get<PageResponse<SessionResponseDto>>('/api/admin/sessions', { params });
    return data;
};

// Получить статистику по сессиям
export const fetchSessionStats = async (): Promise<SessionStats> => {
    const { data } = await axiosInstance.get<SessionStats>('/api/admin/sessions/stats');
    return data;
};
