import {useEffect, useRef, useState} from "react";
import {useNavigate} from "react-router-dom";
import {toast} from "sonner";
import {setToken} from "../utils/tokenUtils";
import {makeSessionId} from "../utils/session";

import type {SignStatusResponse} from "../types/sign.t";
import {createSession, fetchQr, getSignStatus, getEgovMobileUrl} from "../api/endpoints/sign.ts";
import {getCitizenMeetingUrl} from "../api/endpoints/qbox";

export const LoginPage = () => {
    const navigate = useNavigate();

    const [uuid] = useState(() => makeSessionId());
    const [qrUrl, setQrUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [phoneNumber] = useState(() => localStorage.getItem("phoneNumber") || "");
    const [meetingUrl, setMeetingUrl] = useState<string | null>(null);
    const [showMeetingButton, setShowMeetingButton] = useState(false);

    const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const qrRefreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const currentBlobUrlRef = useRef<string | null>(null);

    const setBlobUrlSafely = (url: string) => {
        if (currentBlobUrlRef.current) URL.revokeObjectURL(currentBlobUrlRef.current);
        currentBlobUrlRef.current = url;
        setQrUrl(url);
    };

    const startPollingStatus = (id: string) => {
        if (pollTimerRef.current) return; // уже запущен
        pollTimerRef.current = setInterval(async () => {
            try {
                const resp: SignStatusResponse = await getSignStatus(String(id));

                if (resp.state === "SIGNED") {
                    if (resp.user?.iin) {
                        setToken(resp.user.iin);
                    } else {
                        setToken(String(resp.id));
                    }
                    toast.success("Успешная авторизация");
                    stopPolling();
                    
                    // Получаем ссылку на встречу
                    try {
                        toast.loading("Получение ссылки на встречу...");
                        const meetingData = await getCitizenMeetingUrl(id);
                        toast.dismiss();
                        
                        // Сохраняем ссылку
                        setMeetingUrl(meetingData.meetingUrl);
                        setShowMeetingButton(true);
                        
                        // Пробуем открыть встречу автоматически
                        const opened = window.open(meetingData.meetingUrl, '_blank', 'noopener,noreferrer');
                        
                        if (opened) {
                            toast.success("Встреча открыта в новой вкладке");
                        } else {
                            toast.info("Нажмите кнопку ниже для входа в комнату");
                        }
                    } catch (meetingError: any) {
                        toast.dismiss();
                        console.error("Ошибка получения ссылки на встречу:", meetingError);
                        
                        if (meetingError.response?.status === 404) {
                            toast.error("Встреча не найдена. Администратор еще не создал комнату.");
                        } else if (meetingError.response?.status === 400) {
                            toast.error("Сессия не подписана или недействительна.");
                        } else {
                            toast.error("Не удалось получить ссылку на встречу");
                        }
                        
                        // Переход на главную через 3 секунды
                        setTimeout(() => {
                            navigate('/');
                        }, 3000);
                    }
                } else if (resp.state === "FAILED") {
                    toast.error("Авторизация отклонена в eGov Mobile");
                    stopPolling();
                } // PENDING — просто ждём дальше
            } catch (e: unknown) {
                const isAxiosError = typeof e === 'object' && e !== null && 'response' in e;
                const status = isAxiosError ? (e as { response?: { status?: number } }).response?.status : undefined;

                if (status === 400 || status === 404) {
                    console.debug("Session not yet initialized or not found, waiting...");
                    return;
                }
                console.warn("Status poll error:", e);
            }
        }, 2000);
    };

    const stopPolling = () => {
        if (pollTimerRef.current) {
            clearInterval(pollTimerRef.current);
            pollTimerRef.current = null;
        }
    };

    const stopQrRefresh = () => {
        if (qrRefreshTimerRef.current) {
            clearInterval(qrRefreshTimerRef.current);
            qrRefreshTimerRef.current = null;
        }
    };

    const stopAllTimers = () => {
        stopPolling();
        stopQrRefresh();
    };


    useEffect(() => {
        let mounted = true;
        stopAllTimers()
        // Проверяем наличие номера телефона
        if (!phoneNumber) {
            toast.error("Номер телефона не найден. Перенаправление...");
            navigate("/");
            return;
        }

        (async () => {
            setLoading(true);
            try {
                const session = await createSession(uuid, phoneNumber);
                setSessionId(session.sessionUuid);
                console.log("Создана сессия:", session.sessionUuid);
                const {imageUrl} = await fetchQr(session.sessionUuid);
                setBlobUrlSafely(imageUrl);

                startQrAutoRefresh();
                startPollingStatus(session.sessionUuid);
            } catch (e) {
                console.error(e);
                localStorage.clear();
                toast.error("Не удалось создать сессию. Попробуйте обновить страницу.");
            } finally {
                if (mounted) setLoading(false);
            }
        })();

        return () => {
            mounted = false;
            stopAllTimers();
            localStorage.clear();
            if (currentBlobUrlRef.current) {
                URL.revokeObjectURL(currentBlobUrlRef.current);
                currentBlobUrlRef.current = null;
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [uuid, phoneNumber]);

    const refreshQrWithNewSession = async (showToast = false) => {
        console.debug("Refreshing QR with new session");
        stopAllTimers();
        
        try {
            const newUuid = makeSessionId();
            const session = await createSession(newUuid, phoneNumber);
            setSessionId(session.sessionUuid);

            const {imageUrl} = await fetchQr(session.sessionUuid);
            setBlobUrlSafely(imageUrl);

            startPollingStatus(session.sessionUuid);
            startQrAutoRefresh();

            if (showToast) {
                toast.success("QR обновлён");
            }
        } catch (e) {
            console.error(e);
            if (showToast) {
                toast.error("Не удалось обновить QR. Попробуйте ещё раз.");
            }
        }
    };

    const startQrAutoRefresh = () => {
        console.debug("Starting QR auto-refresh");
        if (qrRefreshTimerRef.current) {
            console.debug("QR refresh timer already running");
            return;
        }
        console.debug("QR refresh timer not yet initialized, creating...");
        qrRefreshTimerRef.current = setInterval(() => {
            console.debug("Auto-refreshing QR with new session...");
            void refreshQrWithNewSession(true);
        }, 60000);
    };

    const handleManualRefresh = async () => {
        setLoading(true);
        try {
            await refreshQrWithNewSession(true);
        } finally {
            setLoading(false);
        }
    };

    const handleEgovMobileLogin = async () => {
        if (!sessionId) {
            toast.error("Сессия не создана. Попробуйте обновить страницу.");
            return;
        }

        try {
            const response = await getEgovMobileUrl(String(sessionId));
            window.location.href = response.url;
        } catch (e) {
            console.error(e);
            toast.error("Не удалось получить ссылку для входа");
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
            <div className="bg-white rounded-xl p-6 md:p-8 max-w-lg w-full shadow-xl">
                <div className="text-center mb-6">
                    <h1 className="text-2xl sm:text-3xl text-gray-800 font-semibold mb-2">Встреча с акимом</h1>
                    <p className="text-gray-600 text-base sm:text-lg">Онлайн очередь</p>
                </div>

                {/* Если получена ссылка на встречу */}
                {showMeetingButton && meetingUrl ? (
                    <div className="text-center">
                        <div className="bg-gradient-to-br from-green-500 to-emerald-500 text-white p-6 md:p-8 rounded-xl mb-6">
                            <div className="text-5xl mb-4">✅</div>
                            <h2 className="text-xl md:text-2xl font-bold mb-2">Успешная авторизация!</h2>
                            <p className="text-base opacity-90">Вы можете войти в видеоконференцию</p>
                        </div>

                        <button
                            onClick={() => window.open(meetingUrl, '_blank', 'noopener,noreferrer')}
                            className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg text-lg font-semibold transition-all shadow-lg hover:shadow-xl"
                        >
                            🎥 Войти в комнату встречи
                        </button>

                        <button
                            onClick={() => navigate('/')}
                            className="w-full mt-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-sm font-medium transition"
                        >
                            ← Вернуться на главную
                        </button>

                        <div className="mt-6 pt-6 border-t border-gray-200">
                            <p className="text-gray-500 text-xs">
                                Если встреча не открылась автоматически, нажмите кнопку выше
                            </p>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="text-center my-8">
                            <div className="inline-block border-2 border-gray-300 rounded-xl overflow-hidden p-2">
                                <div className="w-40 h-40 sm:w-52 sm:h-52 flex items-center justify-center bg-gray-50">
                                    {qrUrl ? (
                                        <img
                                            src={qrUrl}
                                            alt="QR для eGov Mobile"
                                            className="w-full h-full object-contain"
                                            draggable={false}
                                        />
                                    ) : (
                                        <svg className="w-full h-full" viewBox="0 0 200 200" aria-hidden>
                                            <rect width="200" height="200" fill="#f0f0f0"/>
                                            <text x="50%" y="50%" textAnchor="middle" dy=".3em" fill="#999" fontSize="14">
                                                Загрузка QR…
                                            </text>
                                        </svg>
                                    )}
                                </div>
                            </div>

                            <p className="text-gray-500 mt-4 text-sm sm:text-base">
                                Отсканируйте QR-код приложением <b>eGov Mobile</b>
                            </p>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleManualRefresh}
                                className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-sm font-medium transition"
                                disabled={loading}
                            >
                                Обновить QR
                            </button>
                        </div>

                        <div className="mt-4">
                            <button
                                onClick={handleEgovMobileLogin}
                                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition"
                                disabled={loading}
                            >
                                Войти через eGov Mobile
                            </button>
                        </div>

                        <div className="mt-8 pt-6 border-t border-gray-200">
                            <p className="text-gray-500 text-sm mb-2">
                                После успешной авторизации вы получите ссылку на встречу.
                            </p>
                            <p className="text-blue-600 font-semibold text-sm">
                                ✨ Встреча откроется автоматически в новой вкладке
                            </p>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};