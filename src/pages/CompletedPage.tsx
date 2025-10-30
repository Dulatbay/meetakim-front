import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { getSignStatus } from '../api/endpoints/sign';
import type { SignStatusResponse } from '../types/sign.t';

const POLL_INTERVAL = 2000; // 2 секунды
const MAX_POLL_DURATION = 60000; // 1 минута

export const CompletedPage = () => {
    const [searchParams] = useSearchParams();
    const sessionId = searchParams.get('sessionId');
    const navigate = useNavigate();

    const [status, setStatus] = useState<'loading' | 'signed' | 'not_signed'>('loading');
    const [signData, setSignData] = useState<SignStatusResponse | null>(null);
    const [timeElapsed, setTimeElapsed] = useState(0);

    const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const pollStartTimeRef = useRef<number>(Date.now());

    const stopPolling = () => {
        if (pollTimerRef.current) {
            clearInterval(pollTimerRef.current);
            pollTimerRef.current = null;
        }
    };

    const checkSignStatus = async () => {
        if (!sessionId) {
            toast.error('Не указан ID сессии');
            navigate('/');
            return;
        }

        try {
            const response = await getSignStatus(sessionId);
            setSignData(response);

            if (response.state === 'SIGNED') {
                setStatus('signed');
                stopPolling();
                return true;
            }

            // Проверяем, прошла ли минута
            const elapsed = Date.now() - pollStartTimeRef.current;
            setTimeElapsed(elapsed);

            if (elapsed >= MAX_POLL_DURATION) {
                setStatus('not_signed');
                stopPolling();
                return false;
            }

            return false;
        } catch (error) {
            console.error('Ошибка при проверке статуса:', error);
            
            // Если прошла минута, показываем экран "не подписано"
            const elapsed = Date.now() - pollStartTimeRef.current;
            if (elapsed >= MAX_POLL_DURATION) {
                setStatus('not_signed');
                stopPolling();
            }
            return false;
        }
    };

    useEffect(() => {
        if (!sessionId) {
            toast.error('Не указан ID сессии');
            navigate('/');
            return;
        }

        // Первая проверка
        checkSignStatus();

        // Запуск polling
        pollTimerRef.current = setInterval(checkSignStatus, POLL_INTERVAL);

        return () => {
            stopPolling();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sessionId]);

    const handleGoToQueue = () => {
        if (sessionId) {
            navigate(`/queue?sessionId=${sessionId}`);
        }
    };

    const handleGoToLogin = () => {
        navigate('/');
    };

    const getRemainingTime = () => {
        const remaining = Math.max(0, MAX_POLL_DURATION - timeElapsed);
        return Math.ceil(remaining / 1000);
    };

    // Экран загрузки
    if (status === 'loading') {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4 sm:p-5">
                <div className="bg-white rounded-2xl shadow-xl p-6 md:p-10 w-full max-w-[600px] text-center">
                    <div className="inline-flex flex-col items-center">
                        <div className="inline-block w-16 h-16 border-4 border-gray-200 rounded-full border-t-blue-500 animate-spin mb-5" />
                        <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-3">
                            Проверяем статус подписи...
                        </h2>
                        <p className="text-gray-600 mb-4">
                            Пожалуйста, подождите
                        </p>
                        <div className="bg-blue-50 border border-blue-200 text-blue-700 p-3 md:p-4 rounded-lg text-sm">
                            ⏱️ Осталось примерно {getRemainingTime()} сек
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Экран успешной подписи
    if (status === 'signed') {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4 sm:p-5">
                <div className="bg-white rounded-2xl shadow-xl p-6 md:p-10 w-full max-w-[600px] text-center">
                    <div className="bg-gradient-to-br from-green-600 to-emerald-500 text-white p-8 md:p-10 rounded-xl mb-6">
                        <div className="text-6xl md:text-7xl mb-4">✅</div>
                        <h1 className="text-2xl md:text-3xl font-bold m-0 mb-3">
                            Успешный вход в очередь!
                        </h1>
                        <p className="text-lg opacity-90 m-0">
                            Документы успешно подписаны
                        </p>
                    </div>

                    <div className="bg-gray-100 p-6 md:p-8 rounded-xl mb-6 text-left">
                        <h2 className="text-lg font-semibold text-gray-800 mb-3 text-center md:text-left">
                            Ваша сессия продолжается в веб-версии
                        </h2>
                        <div className="space-y-2 text-gray-600 text-sm md:text-base">
                            <p className="m-0">
                                • Вы успешно зарегистрированы в очереди
                            </p>
                            <p className="m-0">
                                • Дождитесь своей очереди на основной странице
                            </p>
                            <p className="m-0">
                                • Не закрывайте страницу, чтобы не потерять место
                            </p>
                        </div>
                    </div>

                    {signData?.user && (
                        <div className="bg-blue-50 border border-blue-200 p-4 md:p-5 rounded-lg mb-6 text-left">
                            <h3 className="text-sm font-semibold text-blue-900 mb-2">Информация о пользователе</h3>
                            <div className="text-sm text-blue-800">
                                <p className="m-0 mb-1"><strong>ФИО:</strong> {signData.user.fullName}</p>
                                <p className="m-0 mb-1"><strong>ИИН:</strong> {signData.user.iin}</p>
                                {signData.user.placeOfRegistrationCity && (
                                    <p className="m-0"><strong>Город:</strong> {signData.user.placeOfRegistrationCity}</p>
                                )}
                            </div>
                        </div>
                    )}

                    <button
                        onClick={handleGoToQueue}
                        className="w-full py-3 md:py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg text-base md:text-lg font-semibold transition-all shadow-lg hover:shadow-xl"
                    >
                        Перейти к очереди
                    </button>

                    <div className="mt-6 pt-6 border-t border-gray-200">
                        <p className="text-gray-400 text-xs sm:text-sm m-0">
                            Ваша сессия активна • ID: {sessionId?.slice(0, 8)}...
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // Экран неподписанного документа
    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4 sm:p-5">
            <div className="bg-white rounded-2xl shadow-xl p-6 md:p-10 w-full max-w-[600px] text-center">
                <div className="bg-gradient-to-br from-amber-500 to-orange-500 text-white p-8 md:p-10 rounded-xl mb-6">
                    <div className="text-6xl md:text-7xl mb-4">⚠️</div>
                    <h1 className="text-2xl md:text-3xl font-bold m-0 mb-3">
                        Документы не подписаны
                    </h1>
                    <p className="text-lg opacity-90 m-0">
                        Требуется подпись для входа в очередь
                    </p>
                </div>

                <div className="bg-gray-100 p-6 md:p-8 rounded-xl mb-6 text-left">
                    <h2 className="text-lg font-semibold text-gray-800 mb-3 text-center md:text-left">
                        Что нужно сделать?
                    </h2>
                    <div className="space-y-3 text-gray-600 text-sm md:text-base">
                        <div className="flex items-start gap-3">
                            <span className="flex-shrink-0 w-6 h-6 bg-orange-500 text-white rounded-full flex items-center justify-center text-xs font-bold">1</span>
                            <p className="m-0">
                                Откройте приложение <strong>eGov Mobile</strong>
                            </p>
                        </div>
                        <div className="flex items-start gap-3">
                            <span className="flex-shrink-0 w-6 h-6 bg-orange-500 text-white rounded-full flex items-center justify-center text-xs font-bold">2</span>
                            <p className="m-0">
                                Подпишите документы для входа в очередь
                            </p>
                        </div>
                        <div className="flex items-start gap-3">
                            <span className="flex-shrink-0 w-6 h-6 bg-orange-500 text-white rounded-full flex items-center justify-center text-xs font-bold">3</span>
                            <p className="m-0">
                                После успешной подписи вы автоматически войдете в очередь
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mb-6 text-sm">
                    <strong>Внимание!</strong> Без подписи документов вы не сможете войти в очередь на встречу с акимом.
                </div>

                <div className="space-y-3">
                    <button
                        onClick={handleGoToLogin}
                        className="w-full py-3 md:py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg text-base md:text-lg font-semibold transition-all shadow-lg hover:shadow-xl"
                    >
                        Попробовать снова
                    </button>
                    
                    <button
                        onClick={() => navigate('/')}
                        className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-sm font-medium transition"
                    >
                        Вернуться на главную
                    </button>
                </div>

                <div className="mt-6 pt-6 border-t border-gray-200">
                    <p className="text-gray-400 text-xs sm:text-sm m-0">
                        Если у вас возникли проблемы, обратитесь в службу поддержки
                    </p>
                </div>
            </div>
        </div>
    );
};

