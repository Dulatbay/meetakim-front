import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { clearAdminAuth } from '../utils/tokenUtils';
import {
    getAdminMeetingUrl,
    getAdminHealth,
    ensureAdminMeeting,
    getMeetingInfo,
    type HealthCheckResponse,
    type MeetingInfoResponse
} from '../api/endpoints/qbox';
import { fetchSessions } from '../api/endpoints/admin';
import type { SessionResponseDto, PageResponse, SessionState, SessionFilters } from '../types/admin.t';

const REFRESH_INTERVAL = 30000; // 30 секунд

export const AdminPage = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'meeting' | 'sessions'>('meeting');
    
    // Meeting tab state
    const [health, setHealth] = useState<HealthCheckResponse | null>(null);
    const [meetingInfo, setMeetingInfo] = useState<MeetingInfoResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [joining, setJoining] = useState(false);
    const [displayName, setDisplayName] = useState('Администратор');
    
    // Sessions tab state
    const [sessions, setSessions] = useState<PageResponse<SessionResponseDto> | null>(null);
    const [sessionsLoading, setSessionsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [stateFilter, setStateFilter] = useState<SessionState | ''>('');
    const [currentPage, setCurrentPage] = useState(0);
    const [pageSize, setPageSize] = useState(20);

    const checkHealth = useCallback(async () => {
        try {
            const data = await getAdminHealth();
            setHealth(data);
            
            if (data.adminMeeting?.code) {
                try {
                    const info = await getMeetingInfo(data.adminMeeting.code);
                    setMeetingInfo(info);
                } catch (error) {
                    console.error('Ошибка получения информации о встрече:', error);
                }
            }
        } catch (error) {
            console.error('Ошибка проверки здоровья:', error);
            setHealth({ status: 'unhealthy', qboxConnection: 'error', error: 'Не удалось подключиться' });
        } finally {
            setLoading(false);
        }
    }, []);

    const loadSessions = useCallback(async () => {
        setSessionsLoading(true);
        try {
            const filters: SessionFilters = {
                page: currentPage,
                size: pageSize,
                sortBy: 'createdAt',
                sortDirection: 'DESC'
            };
            
            if (searchQuery) filters.search = searchQuery;
            if (stateFilter) filters.state = stateFilter;
            
            const data = await fetchSessions(filters);
            setSessions(data);
        } catch (error) {
            console.error('Ошибка загрузки сессий:', error);
            toast.error('Ошибка загрузки сессий');
        } finally {
            setSessionsLoading(false);
        }
    }, [currentPage, pageSize, searchQuery, stateFilter]);

    useEffect(() => {
        if (activeTab === 'meeting') {
            checkHealth();
            const interval = setInterval(checkHealth, REFRESH_INTERVAL);
            return () => clearInterval(interval);
        }
    }, [activeTab, checkHealth]);

    useEffect(() => {
        if (activeTab === 'sessions') {
            loadSessions();
        }
    }, [activeTab, loadSessions]);

    const handleEnsureMeeting = async () => {
        setLoading(true);
        try {
            await ensureAdminMeeting();
            toast.success('Комната успешно создана/обновлена');
            await checkHealth();
        } catch (error) {
            console.error('Ошибка создания комнаты:', error);
            toast.error('Ошибка создания комнаты');
        } finally {
            setLoading(false);
        }
    };

    const handleJoinMeeting = async () => {
        if (!displayName.trim()) {
            toast.error('Введите ваше имя');
            return;
        }

        setJoining(true);
        try {
            const response = await getAdminMeetingUrl(displayName);
            window.open(response.meetingUrl, '_blank', 'noopener,noreferrer');
            toast.success('Переход в комнату встречи');
        } catch (error: any) {
            console.error('Ошибка входа в комнату:', error);
            if (error.response?.status === 503) {
                toast.error('QBox сервис недоступен. Попробуйте позже.');
            } else if (error.message?.includes('unauthorized')) {
                toast.error('Ошибка авторизации в QBox. Обратитесь к системному администратору.');
            } else {
                toast.error('Ошибка входа в комнату');
            }
        } finally {
            setJoining(false);
        }
    };

    const handleLogout = () => {
        clearAdminAuth();
        navigate('/admin/login');
    };

    const handleSearch = () => {
        setCurrentPage(0);
        loadSessions();
    };

    const getStateText = (state: number) => {
        switch (state) {
            case 0: return '⏸️ Не начата';
            case 1: return '▶️ Активна';
            case 2: return '⏹️ Завершена';
            case -1: return '❌ Отменена';
            default: return 'Неизвестно';
        }
    };

    const getSessionStateColor = (state: SessionState) => {
        switch (state) {
            case 'CREATED': return 'bg-gray-100 text-gray-700';
            case 'WAITING': return 'bg-blue-100 text-blue-700';
            case 'SIGNED': return 'bg-green-100 text-green-700';
            case 'FAILED': return 'bg-red-100 text-red-700';
            case 'EXPIRED': return 'bg-orange-100 text-orange-700';
        }
    };

    const getSessionStateText = (state: SessionState) => {
        switch (state) {
            case 'CREATED': return 'Создана';
            case 'WAITING': return 'Ожидание';
            case 'SIGNED': return 'Подписана';
            case 'FAILED': return 'Ошибка';
            case 'EXPIRED': return 'Истекла';
        }
    };

    if (loading && activeTab === 'meeting') {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
                <div className="bg-white rounded-xl shadow-lg p-8 text-center">
                    <div className="inline-block w-10 h-10 border-4 border-gray-200 rounded-full border-t-indigo-500 animate-spin mb-4" />
                    <div className="text-gray-600">Загрузка...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-blue-50 to-purple-50 p-3 sm:p-4 md:p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 mb-4 sm:mb-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div>
                            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800">Панель администратора</h1>
                            <p className="text-gray-600 text-sm mt-1">Управление встречами и сессиями</p>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-medium transition-colors w-full sm:w-auto"
                        >
                            Выйти
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="bg-white rounded-xl shadow-lg mb-4 sm:mb-6 overflow-hidden">
                    <div className="flex border-b border-gray-200">
                        <button
                            onClick={() => setActiveTab('meeting')}
                            className={`flex-1 px-4 py-3 sm:px-6 sm:py-4 font-medium transition-colors ${
                                activeTab === 'meeting'
                                    ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-600'
                                    : 'text-gray-600 hover:bg-gray-50'
                            }`}
                        >
                            <span className="text-lg mr-2">🎥</span>
                            Вход в комнату
                        </button>
                        <button
                            onClick={() => setActiveTab('sessions')}
                            className={`flex-1 px-4 py-3 sm:px-6 sm:py-4 font-medium transition-colors ${
                                activeTab === 'sessions'
                                    ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-600'
                                    : 'text-gray-600 hover:bg-gray-50'
                            }`}
                        >
                            <span className="text-lg mr-2">📋</span>
                            Список сессий
                        </button>
                    </div>
                </div>

                {/* Meeting Tab */}
                {activeTab === 'meeting' && (
                    <>
                        {/* Health Status */}
                        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 mb-4 sm:mb-6">
                            <h2 className="text-lg sm:text-xl font-semibold mb-4">Статус комнаты</h2>
                            <div className={`flex items-center gap-3 p-4 rounded-lg ${
                                health?.status === 'healthy' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                            }`}>
                                <span className="text-3xl">
                                    {health?.status === 'healthy' ? '✅' : '❌'}
                                </span>
                                <div className="flex-1">
                                    <div className={`font-semibold ${
                                        health?.status === 'healthy' ? 'text-green-800' : 'text-red-800'
                                    }`}>
                                        {health?.status === 'healthy' ? 'Комната активна' : 'Комната недоступна'}
                                    </div>
                                    {health?.adminMeeting && (
                                        <div className="text-sm text-gray-600 mt-1">
                                            <div>Код: {health.adminMeeting.code}</div>
                                            <div>UID: {health.adminMeeting.uid}</div>
                                        </div>
                                    )}
                                    {health?.error && (
                                        <div className="text-sm text-red-600 mt-1">{health.error}</div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Meeting Info */}
                        {meetingInfo && (
                            <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 mb-4 sm:mb-6">
                                <h2 className="text-lg sm:text-xl font-semibold mb-4">Информация о встрече</h2>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Название:</span>
                                        <span className="font-medium">{meetingInfo.title}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Состояние:</span>
                                        <span className="font-medium">{getStateText(meetingInfo.state)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Хост:</span>
                                        <span className="font-medium">{meetingInfo.host_name}</span>
                                    </div>
                                    {meetingInfo.schedule_time && (
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Запланировано:</span>
                                            <span className="font-medium">
                                                {new Date(meetingInfo.schedule_time).toLocaleString('ru-RU')}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Join Meeting Section */}
                        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 mb-4 sm:mb-6">
                            <h2 className="text-lg sm:text-xl font-semibold mb-4">Войти в приемную комнату</h2>
                            
                            <div className="space-y-4">
                                <div>
                                    <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-2">
                                        Ваше имя для отображения
                                    </label>
                                    <input
                                        id="displayName"
                                        type="text"
                                        value={displayName}
                                        onChange={(e) => setDisplayName(e.target.value)}
                                        placeholder="Администратор"
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>

                                <button
                                    onClick={handleJoinMeeting}
                                    disabled={joining || health?.status !== 'healthy'}
                                    className={`w-full py-3 rounded-lg font-semibold text-white transition-colors ${
                                        health?.status === 'healthy' 
                                            ? 'bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700'
                                            : 'bg-gray-400 cursor-not-allowed'
                                    }`}
                                >
                                    {joining ? (
                                        <div className="flex items-center justify-center">
                                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                                            Подключение...
                                        </div>
                                    ) : (
                                        '▶️ Войти в приемную комнату'
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
                            <h2 className="text-lg sm:text-xl font-semibold mb-4">Действия</h2>
                            <div className="space-y-3">
                                <button
                                    onClick={handleEnsureMeeting}
                                    disabled={loading}
                                    className="w-full bg-blue-500 hover:bg-blue-600 text-white px-4 py-3 rounded-lg font-medium transition-colors disabled:bg-gray-400"
                                >
                                    🔄 Создать/обновить комнату
                                </button>
                                
                                <button
                                    onClick={() => checkHealth()}
                                    disabled={loading}
                                    className="w-full bg-gray-500 hover:bg-gray-600 text-white px-4 py-3 rounded-lg font-medium transition-colors disabled:bg-gray-400"
                                >
                                    🔍 Обновить статус
                                </button>
                            </div>
                        </div>

                        <div className="mt-4 sm:mt-6 text-center text-xs sm:text-sm text-gray-500">
                            <p>Автоматическое обновление каждые 30 секунд</p>
                        </div>
                    </>
                )}

                {/* Sessions Tab */}
                {activeTab === 'sessions' && (
                    <>
                        {/* Filters */}
                        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 mb-4 sm:mb-6">
                            <h2 className="text-lg sm:text-xl font-semibold mb-4">Фильтры</h2>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Поиск по телефону или UUID
                                    </label>
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                        placeholder="77011234567 или UUID..."
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Состояние
                                    </label>
                                    <select
                                        value={stateFilter}
                                        onChange={(e) => {
                                            setStateFilter(e.target.value as SessionState | '');
                                            setCurrentPage(0);
                                        }}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    >
                                        <option value="">Все</option>
                                        <option value="CREATED">Создана</option>
                                        <option value="WAITING">Ожидание</option>
                                        <option value="SIGNED">Подписана</option>
                                        <option value="FAILED">Ошибка</option>
                                        <option value="EXPIRED">Истекла</option>
                                    </select>
                                </div>
                            </div>
                            <div className="mt-4">
                                <button
                                    onClick={handleSearch}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                                >
                                    🔍 Поиск
                                </button>
                            </div>
                        </div>

                        {/* Sessions List */}
                        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                            <div className="p-4 sm:p-6 border-b border-gray-200 flex justify-between items-center">
                                <h2 className="text-lg sm:text-xl font-semibold">
                                    Сессии ({sessions?.totalElements || 0})
                                </h2>
                                <button
                                    onClick={() => loadSessions()}
                                    disabled={sessionsLoading}
                                    className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                                >
                                    🔄 Обновить
                                </button>
                            </div>

                            {sessionsLoading ? (
                                <div className="p-8 text-center">
                                    <div className="inline-block w-8 h-8 border-4 border-gray-200 rounded-full border-t-indigo-500 animate-spin mb-4" />
                                    <p className="text-gray-600">Загрузка...</p>
                                </div>
                            ) : sessions && sessions.content.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">UUID</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Телефон</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ФИО</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ИИН</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Состояние</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Создана</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Подписана</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200">
                                            {sessions.content.map((session) => (
                                                <tr key={session.sessionUuid} className="hover:bg-gray-50">
                                                    <td className="px-4 py-3 text-xs font-mono text-gray-600">
                                                        {session.sessionUuid.slice(0, 8)}...
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-gray-900">
                                                        {session.phoneNumber}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-gray-900">
                                                        {session.citizenName || '—'}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-gray-900">
                                                        {session.iin || '—'}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getSessionStateColor(session.state)}`}>
                                                            {getSessionStateText(session.state)}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-xs text-gray-600">
                                                        {new Date(session.createdAt).toLocaleString('ru-RU')}
                                                    </td>
                                                    <td className="px-4 py-3 text-xs text-gray-600">
                                                        {session.signedAt ? new Date(session.signedAt).toLocaleString('ru-RU') : '—'}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="p-8 text-center text-gray-500">
                                    Нет сессий
                                </div>
                            )}

                            {/* Pagination */}
                            {sessions && sessions.totalPages > 1 && (
                                <div className="p-4 border-t border-gray-200 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-gray-600">Размер страницы:</span>
                                        <select
                                            value={pageSize}
                                            onChange={(e) => {
                                                setPageSize(parseInt(e.target.value));
                                                setCurrentPage(0);
                                            }}
                                            className="border border-gray-300 rounded px-2 py-1 text-sm"
                                        >
                                            <option value={10}>10</option>
                                            <option value={20}>20</option>
                                            <option value={50}>50</option>
                                            <option value={100}>100</option>
                                        </select>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                                            disabled={currentPage === 0}
                                            className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            ← Назад
                                        </button>
                                        <span className="text-sm text-gray-600">
                                            Страница {currentPage + 1} из {sessions.totalPages}
                                        </span>
                                        <button
                                            onClick={() => setCurrentPage(p => Math.min(sessions.totalPages - 1, p + 1))}
                                            disabled={currentPage >= sessions.totalPages - 1}
                                            className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Вперед →
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};
