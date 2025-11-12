import {useState, useEffect, useCallback, useRef} from 'react';
import {useNavigate, useSearchParams} from 'react-router-dom';
import axios from 'axios';
import {toast} from 'sonner';
import type {QueueStatus, PositionResponse} from '../types/queue.t';
import {queueJoin, fetchPosition} from "../api/endpoints/queue.ts";

const POSITION_UPDATE_INTERVAL = 5000; // 5 секунд

export const QueuePage = () => {
    const [searchParams] = useSearchParams();
    const sessionId = searchParams.get('sessionId') ?? searchParams.get('sessionid');

    const [queueData, setQueueData] = useState<PositionResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [isOnline, setIsOnline] = useState(true);
    const [wasOnline, setWasOnline] = useState(true);
    const [lastStatus, setLastStatus] = useState<QueueStatus | null>(null);
    const [registeredToastShown, setRegisteredToastShown] = useState(false);
    const navigate = useNavigate();
    const hasRegisteredRef = useRef(false);
    const hasRedirectedRef = useRef(false);
    const beforeUnloadHandlerRef = useRef<((e: BeforeUnloadEvent) => void) | null>(null);
    const pollIntervalRef = useRef<number | null>(null);

    const goToMeeting = useCallback((url: string) => {
        hasRedirectedRef.current = true;

        if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
        }

        if (beforeUnloadHandlerRef.current) {
            window.removeEventListener('beforeunload', beforeUnloadHandlerRef.current);
        }

        window.open(url, '_blank', 'noopener,noreferrer');
    }, []);

    const fetchQueueStatus = useCallback(async () => {
        try {
            if (!sessionId) {
                toast.error("Перенаправление на регистрацию")
                navigate('/login');
                return;
            }

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
                            label: 'Открыть окно встречи',
                            onClick: () => goToMeeting(data.meetingUrl!)
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
            setIsOnline(true);
        } catch (error: unknown) {
            if (axios.isAxiosError(error)) {
                if (error.response?.status === 401) {
                    return; // interceptor/logging handles it
                }
            }

            if (wasOnline) {
                toast.error('Потеряно соединение с сервером. Попытка восстановления...');
                setWasOnline(false);
            }
            setIsOnline(false);
        } finally {
            setLoading(false);
        }
    }, [lastStatus, wasOnline, sessionId, navigate, goToMeeting]);

    useEffect(() => {
        const registerInQueue = async () => {
            if (!sessionId) {
                navigate('/login');
                return;
            }

            if (hasRegisteredRef.current) {
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
                hasRegisteredRef.current = true;
                await fetchQueueStatus();
            }
        };

        void registerInQueue();
    }, [fetchQueueStatus, registeredToastShown, navigate, sessionId]);

    useEffect(() => {
        if (
            queueData?.status === 'IN_BUFFER' &&
            queueData?.meetingUrl &&
            !hasRedirectedRef.current
        ) {
            goToMeeting(queueData.meetingUrl);
        }
    }, [queueData?.status, queueData?.meetingUrl, goToMeeting]);

    useEffect(() => {
        const id = window.setInterval(fetchQueueStatus, POSITION_UPDATE_INTERVAL);
        pollIntervalRef.current = id;
        return () => {
            clearInterval(id);
            pollIntervalRef.current = null;
        };
    }, [fetchQueueStatus]);

    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            e.preventDefault();
            e.returnValue = 'Вы уверены? При выходе вы потеряете место в очереди!';
        };
        beforeUnloadHandlerRef.current = handleBeforeUnload;

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, []);

    const handleLogout = () => {
        if (window.confirm('Вы уверены? При выходе вы потеряете место в очереди!')) {
            navigate('/login');
        }
    };

    const handleReRegister = async () => {
        navigate('/');
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

    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4 sm:p-5">
            <div className="bg-white rounded-2xl shadow-xl p-6 md:p-10 w-full max-w-[600px] text-center">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6 md:mb-8 pb-4 md:pb-5 border-b border-gray-200 text-center md:text-left">
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-800 m-0">Встреча с акимом</h1>
                    <button onClick={handleLogout} className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
                        Выйти
                    </button>
                </div>

                <div className={`flex items-center justify-center p-3 rounded-xl mb-6 md:mb-8 text-sm font-semibold text-white ${isOnline ? 'bg-green-500' : 'bg-red-500'}`}>
                    <span className="w-2 h-2 rounded-full mr-2 bg-white"></span>
                    {isOnline ? 'Онлайн' : 'Офлайн - восстановление соединения...'}
                </div>

                {queueData && (
                    <>
                        {queueData.status !== 'CANCELLED' && queueData.status !== 'SERVED' && queueData.status !== 'IN_BUFFER' && queueData.number !== 0 && queueData.number !== null && (
                            <div className="mb-6 md:mb-8">
                                <div className="text-base sm:text-lg text-gray-600 mb-3 sm:mb-4">Ваш номер в очереди</div>
                                <div className="text-5xl md:text-6xl font-extrabold text-gray-800 mb-3 sm:mb-4 leading-none">{queueData.number}</div>
                                <div className={`text-base sm:text-lg font-semibold px-4 py-2 rounded-full inline-block bg-blue-100 text-blue-700`}>
                                    В ожидании
                                </div>
                            </div>
                        )}

                        {queueData.status === 'CANCELLED' && (
                            <div className="bg-gradient-to-br from-red-600 to-rose-500 text-white p-6 md:p-8 rounded-xl mb-5">
                                <div className="text-4xl md:text-5xl mb-3 md:mb-4">❌</div>
                                <h2 className="text-lg md:text-xl font-semibold m-0 mb-2">Вы вышли.</h2>
                                <p className="m-0 mb-4 md:mb-5 opacity-90">Оставайтесь онлайн для того что попасть на встречу</p>

                                <button onClick={handleReRegister} className="bg-white text-red-600 px-5 md:px-6 py-3 rounded-lg font-semibold inline-flex items-center gap-2 transition-transform duration-300 hover:-translate-y-0.5 shadow hover:shadow-lg">
                                    Зарегистрироваться снова
                                </button>
                            </div>
                        )}

                        {queueData.number === 0 && queueData.status === 'WAITING' && (
                            <div
                                className="bg-gradient-to-br from-purple-500 to-indigo-500 text-white p-6 md:p-8 rounded-xl mb-5">
                                <div className="text-4xl md:text-5xl mb-3 md:mb-4">⏰</div>
                                <h2 className="text-lg md:text-xl font-semibold m-0 mb-2">Вот-вот подойдёт ваша
                                    очередь!</h2>
                                <p className="m-0 opacity-90">Будьте готовы, встреча начнётся с минуты на минуту</p>
                            </div>
                        )}

                        {queueData.status === 'IN_BUFFER' && queueData.meetingUrl && (
                            <div className="bg-gradient-to-br from-amber-500 to-orange-500 text-white p-6 md:p-8 rounded-xl mb-5">
                                <div className="text-4xl md:text-5xl mb-3 md:mb-4">🎉</div>
                                <h2 className="text-lg md:text-xl font-semibold m-0 mb-2">Ваша очередь подошла!</h2>
                                <p className="m-0 mb-4 md:mb-5 opacity-90">Можете присоединиться к встрече</p>
                                <button
                                    onClick={() => goToMeeting(queueData.meetingUrl!)}
                                    className="bg-white text-amber-600 px-5 md:px-6 py-3 rounded-lg font-semibold inline-flex items-center gap-2 transition-transform duration-300 hover:-translate-y-0.5 shadow hover:shadow-lg"
                                >
                                    Открыть встречу в отдельном окне
                                </button>
                            </div>
                        )}

                        {queueData.status === 'SERVED' && (
                            <div className="bg-gradient-to-br from-green-600 to-emerald-500 text-white p-6 md:p-8 rounded-xl mb-5">
                                <div className="text-4xl md:text-5xl mb-3 md:mb-4">✅</div>
                                <h2 className="text-lg md:text-xl font-semibold m-0 mb-2">Встреча завершена</h2>
                                <p className="m-0 opacity-90">Спасибо за участие!</p>
                            </div>
                        )}

                        {queueData.status === 'WAITING' && queueData.number !== 0 && (
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
                        <button onClick={handleReRegister} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg font-medium">
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
