import {useState, useEffect, useCallback, useRef} from 'react';
import {useNavigate, useSearchParams} from 'react-router-dom';
import axios from 'axios';
import {toast} from 'sonner';
import type {QueueStatus, PositionResponse} from '../types/queue.t';
import {queueJoin, fetchPosition} from "../api/endpoints/queue.ts";

const POSITION_UPDATE_INTERVAL = 5000; // 5 секунд

export const QueuePage = () => {
    const [searchParams] = useSearchParams();
    const sessionId = searchParams.get('sessionid')

    const [queueData, setQueueData] = useState<PositionResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isOnline, setIsOnline] = useState(true);
    const [wasOnline, setWasOnline] = useState(true);
    const [lastStatus, setLastStatus] = useState<QueueStatus | null>(null);
    const [registeredToastShown, setRegisteredToastShown] = useState(false);
    const navigate = useNavigate();
    const hasRegisteredRef = useRef(false);


    const fetchQueueStatus = useCallback(async () => {
        try {
            if (!sessionId) {
                navigate('/login');
                return;
            }

            // Use position endpoint for polling
            const data = await fetchPosition(sessionId);

            if (!wasOnline) {
                toast.success('Соединение восстановлено');
                setWasOnline(true);
            }

            // Status change toasts (skip first undefined -> X change)
            if (lastStatus && data?.status && lastStatus !== data.status) {
                if (data.status === 'IN_BUFFER') {
                    toast.info('Ваша очередь подошла!', data.meetingUrl ? {
                        action: {
                            label: 'Перейти к встрече',
                            onClick: () => window.open(data.meetingUrl!, '_blank', 'noopener,noreferrer')
                        }
                    } : undefined);
                }
                if (data.status === 'SERVED') {
                    toast.success('Встреча завершена');
                }
                if (data.status === 'CANCELLED') {
                    toast.message('Встреча отменена');
                }
            }

            setLastStatus(data?.status ?? null);
            setQueueData(data);
            setError('');
            setIsOnline(true);
        } catch (error: unknown) {
            if (axios.isAxiosError(error)) {
                if (error.response?.status === 401) {
                    return; // interceptor/logging handles it
                }
            }
            setError('Ошибка получения данных очереди');

            if (wasOnline) {
                toast.error('Потеряно соединение с сервером. Попытка восстановления...');
                setWasOnline(false);
            }
            setIsOnline(false);
        } finally {
            setLoading(false);
        }
    }, [lastStatus, wasOnline, sessionId, navigate]);

    // Регистрация в очереди при первой загрузке (однократно/с троттлингом)
    useEffect(() => {
        const registerInQueue = async () => {
            if (!sessionId) {
                navigate('/login');
                return;
            }

            if (hasRegisteredRef.current) {
                // уже отправляли запрос на регистрацию — не повторяем
                hasRegisteredRef.current = true;
                await fetchQueueStatus();
                return;
            }
            try {
                await queueJoin(sessionId);
                hasRegisteredRef.current = true;
                if (!registeredToastShown) {
                    toast.success('Вы зарегистрированы в очереди');
                    setRegisteredToastShown(true);
                }
                await fetchQueueStatus();
            } catch (error: unknown) {
                if (axios.isAxiosError(error)) {
                    if (error.response?.status === 401) {
                        return;
                    }

                }
                // Если уже зарегистрирован или другая ошибка, просто получаем статус
                hasRegisteredRef.current = true; // считаем, что регистрация уже была
                await fetchQueueStatus();
            }
        };

        void registerInQueue();
    }, [fetchQueueStatus, registeredToastShown, navigate, sessionId]);

    // Периодическое обновление статуса
    useEffect(() => {
        const interval = setInterval(fetchQueueStatus, POSITION_UPDATE_INTERVAL);
        return () => clearInterval(interval);
    }, [fetchQueueStatus]);

    // Предупреждение при закрытии страницы
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            e.preventDefault();
            e.returnValue = 'Вы уверены? При выходе вы потеряете место в очереди!';
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, []);

    const handleLogout = () => {
        if (window.confirm('Вы уверены? При выходе вы потеряете место в очереди!')) {
            navigate('/login');
        }
    };

    const handleManualRegister = async () => {
        try {
            if (!sessionId) {
                navigate('/login');
                return;
            }

            if (hasRegisteredRef.current) {
                await fetchQueueStatus();
                return;
            }
            await queueJoin(sessionId);
            toast.success('Вы зарегистрированы в очереди');
            await fetchQueueStatus();
        } catch (error) {
            if (axios.isAxiosError(error) && error.response?.status === 401) {
                return;
            }
            await fetchQueueStatus();
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4 sm:p-5">
                <div className="bg-white rounded-2xl shadow-xl p-6 md:p-10 w-full max-w-[600px] text-center">
                    <div className="inline-flex flex-col items-center">
                        <div className="inline-block w-10 h-10 border-4 border-gray-200 rounded-full border-t-indigo-500 animate-spin mb-5" />
                        <div className="text-gray-600">Загрузка...</div>
                    </div>
                </div>
            </div>
        );
    }

    const getStatusText = (status: QueueStatus | string) => {
        switch (status) {
            case 'WAITING':
                return 'В ожидании';
            case 'IN_BUFFER':
                return 'Ваша очередь';
            case 'SERVED':
                return 'Встреча завершена';
            case 'CANCELLED':
                return 'Встреча отменена';
            default:
                return String(status);
        }
    };

    // Tailwind class mappings instead of inline colors
    const statusPillClasses = (status: QueueStatus | string) => {
        switch (status) {
            case 'WAITING':
                return 'bg-blue-100 text-blue-700';
            case 'IN_BUFFER':
                return 'bg-orange-100 text-orange-700';
            case 'SERVED':
                return 'bg-green-100 text-green-700';
            case 'CANCELLED':
                return 'bg-red-100 text-red-700';
            default:
                return 'bg-gray-100 text-gray-600';
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4 sm:p-5">
            <div className="bg-white rounded-2xl shadow-xl p-6 md:p-10 w-full max-w-[600px] text-center">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6 md:mb-8 pb-4 md:pb-5 border-b border-gray-200 text-center md:text-left">
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-800 m-0">Встреча с акимом</h1>
                    <button onClick={handleLogout} className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
                        Выйти
                    </button>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 p-3 md:p-4 rounded-lg mb-5 text-sm">
                        {error}
                    </div>
                )}

                <div className={`flex items-center justify-center p-3 rounded-xl mb-6 md:mb-8 text-sm font-semibold text-white ${isOnline ? 'bg-green-500' : 'bg-red-500'}`}>
                    <span className="w-2 h-2 rounded-full mr-2 bg-white"></span>
                    {isOnline ? 'Онлайн' : 'Офлайн - восстановление соединения...'}
                </div>

                {queueData && (
                    <>
                        <div className="mb-6 md:mb-8">
                            <div className="text-base sm:text-lg text-gray-600 mb-3 sm:mb-4">Ваш номер в очереди</div>
                            <div className="text-5xl md:text-6xl font-extrabold text-gray-800 mb-3 sm:mb-4 leading-none">{queueData?.number ?? '—'}</div>
                            <div className={`text-base sm:text-lg font-semibold px-4 py-2 rounded-full inline-block ${statusPillClasses(queueData.status)}`}>
                                {getStatusText(queueData.status)}
                            </div>
                        </div>

                        {queueData.status === 'IN_BUFFER' && queueData.meetingUrl && (
                            <div className="bg-gradient-to-br from-amber-500 to-orange-500 text-white p-6 md:p-8 rounded-xl mb-5">
                                <div className="text-4xl md:text-5xl mb-3 md:mb-4">🎉</div>
                                <h2 className="text-lg md:text-xl font-semibold m-0 mb-2">Ваша очередь подошла!</h2>
                                <p className="m-0 mb-4 md:mb-5 opacity-90">Можете присоединиться к встрече</p>
                                <a
                                    href={queueData.meetingUrl}
                                    className="bg-white text-amber-600 px-5 md:px-6 py-3 rounded-lg no-underline font-semibold inline-flex items-center gap-2 transition-transform duration-300 hover:-translate-y-0.5 shadow hover:shadow-lg"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    Перейти к встрече
                                </a>
                            </div>
                        )}

                        {queueData.status === 'SERVED' && (
                            <div className="bg-gradient-to-br from-green-600 to-emerald-500 text-white p-6 md:p-8 rounded-xl mb-5">
                                <div className="text-4xl md:text-5xl mb-3 md:mb-4">✅</div>
                                <h2 className="text-lg md:text-xl font-semibold m-0 mb-2">Встреча завершена</h2>
                                <p className="m-0 opacity-90">Спасибо за участие!</p>
                            </div>
                        )}

                        {queueData.status === 'WAITING' && (
                            <div className="bg-gray-100 p-6 md:p-8 rounded-xl mb-5 text-left md:text-center">
                                <p className="m-0 mb-3 md:mb-4 text-gray-600 leading-relaxed">Пожалуйста, оставайтесь на этой странице.</p>
                                <p className="m-0 mb-4 md:mb-5 text-gray-600 leading-relaxed">Когда подойдет ваша очередь, здесь появится ссылка на встречу.</p>
                                <div className="bg-amber-100 border border-amber-200 text-amber-700 p-3 md:p-4 rounded-lg text-xs sm:text-sm inline-flex items-center gap-2">
                                    ⚠️ Страница автоматически обновляется каждые 5 секунд
                                </div>
                            </div>
                        )}
                    </>
                )}

                {!queueData && (
                    <div className="bg-gray-100 p-6 md:p-8 rounded-xl mb-5">
                        <p className="m-0 mb-4">Вы не зарегистрированы в очереди.</p>
                        <button onClick={handleManualRegister} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg font-medium">
                            Зарегистрироваться
                        </button>
                    </div>
                )}

                <div className="mt-6 md:mt-8 pt-4 md:pt-5 border-t border-gray-200">
                    <p className="text-gray-400 text-xs sm:text-sm m-0">Система автоматически обновляет статус каждые 5 секунд</p>
                </div>
            </div>
        </div>
    );
}
