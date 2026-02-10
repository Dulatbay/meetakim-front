import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { clearAdminAuth } from '../utils/tokenUtils';
import {
    getAkimMeetingUrl,
    getAkimHealth,
    ensureAkimMeeting,
    getMeetingInfo,
    type HealthCheckResponse,
    type MeetingInfoResponse
} from '../api/endpoints/qbox';

const REFRESH_INTERVAL = 30000; // 30 секунд

export const AkimPage = () => {
    const navigate = useNavigate();
    const [health, setHealth] = useState<HealthCheckResponse | null>(null);
    const [meetingInfo, setMeetingInfo] = useState<MeetingInfoResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [joining, setJoining] = useState(false);
    const [displayName, setDisplayName] = useState('Аким');

    const checkHealth = useCallback(async () => {
        try {
            const data = await getAkimHealth();
            setHealth(data);
            
            // Если комната есть, получаем информацию о ней
            if (data.akimMeeting?.code) {
                try {
                    const info = await getMeetingInfo(data.akimMeeting.code);
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

    useEffect(() => {
        checkHealth();
        const interval = setInterval(checkHealth, REFRESH_INTERVAL);
        return () => clearInterval(interval);
    }, [checkHealth]);

    const handleEnsureMeeting = async () => {
        setLoading(true);
        try {
            await ensureAkimMeeting();
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
            const response = await getAkimMeetingUrl(displayName);
            // Открываем встречу в новой вкладке
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

    const getStateText = (state: number) => {
        switch (state) {
            case 0: return '⏸️ Не начата';
            case 1: return '▶️ Активна';
            case 2: return '⏹️ Завершена';
            case -1: return '❌ Отменена';
            default: return 'Неизвестно';
        }
    };

    if (loading) {
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
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 p-3 sm:p-4 md:p-6">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 mb-4 sm:mb-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div>
                            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800">Панель акима</h1>
                            <p className="text-gray-600 text-sm mt-1">Комната для встреч с акимом (r2)</p>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-medium transition-colors w-full sm:w-auto"
                        >
                            Выйти
                        </button>
                    </div>
                </div>

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
                            {health?.akimMeeting && (
                                <div className="text-sm text-gray-600 mt-1">
                                    <div>Код: {health.akimMeeting.code}</div>
                                    <div>UID: {health.akimMeeting.uid}</div>
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
                    <h2 className="text-lg sm:text-xl font-semibold mb-4">Войти в комнату</h2>
                    
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
                                placeholder="Аким"
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                        </div>

                        <button
                            onClick={handleJoinMeeting}
                            disabled={joining || health?.status !== 'healthy'}
                            className={`w-full py-3 rounded-lg font-semibold text-white transition-colors ${
                                health?.status === 'healthy' 
                                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700'
                                    : 'bg-gray-400 cursor-not-allowed'
                            }`}
                        >
                            {joining ? (
                                <div className="flex items-center justify-center">
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                                    Подключение...
                                </div>
                            ) : (
                                '▶️ Войти в комнату встречи'
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

                {/* Info */}
                <div className="mt-4 sm:mt-6 text-center text-xs sm:text-sm text-gray-500">
                    <p>Автоматическое обновление каждые 30 секунд</p>
                    <p className="mt-1">Комната создается заново каждый день с кодом r2:YYYY-MM-DD</p>
                </div>
            </div>
        </div>
    );
};
