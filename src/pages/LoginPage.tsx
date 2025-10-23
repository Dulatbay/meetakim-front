import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { getToken, setToken } from "../utils/tokenUtils";
import { makeSessionId } from "../utils/session";

import type { SignStatusResponse } from "../types/sign.t";
import {createSession, fetchQr, getSignStatus} from "../api/endpoints/sign.ts";

export const LoginPage = () => {
    const navigate = useNavigate();

    // UUID для создания сессии
    const [uuid] = useState(() => makeSessionId());
    const [sessionId, setSessionId] = useState<number | null>(null);
    const [qrUrl, setQrUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const currentBlobUrlRef = useRef<string | null>(null);

    // Очистка blob-URL при замене/размонтаже
    const setBlobUrlSafely = (url: string) => {
        if (currentBlobUrlRef.current) URL.revokeObjectURL(currentBlobUrlRef.current);
        currentBlobUrlRef.current = url;
        setQrUrl(url);
    };

    const startPollingStatus = () => {
        if (pollTimerRef.current || !sessionId) return; // уже идёт или нет sessionId
        pollTimerRef.current = setInterval(async () => {
            try {
                const resp: SignStatusResponse = await getSignStatus(String(sessionId));

                if (resp.state === "SIGNED") {
                    if (resp.user?.iin) {
                        setToken(resp.user.iin);
                    } else {
                        setToken(String(resp.id));
                    }
                    toast.success("Успешная авторизация");
                    stopPolling();
                    navigate("/queue");
                } else if (resp.state === "FAILED") {
                    toast.error("Авторизация отклонена в eGov Mobile");
                    stopPolling();
                } // PENDING — просто ждём дальше
            } catch (e: unknown) {
                // Игнорируем ошибки 400/404 - сессия еще не инициализирована или не найдена
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

    const stopAllTimers = () => {
        stopPolling();
    };

    useEffect(() => {
        let mounted = true;

        (async () => {
            setLoading(true);
            try {
                // Создаем сессию с UUID
                const session = await createSession(uuid);
                setSessionId(session.id);

                // Загружаем QR с полученным sessionId
                const { imageUrl } = await fetchQr(String(session.id));
                setBlobUrlSafely(imageUrl);

                // Начинаем проверку статуса
                startPollingStatus();
            } catch (e) {
                console.error(e);
                toast.error("Не удалось создать сессию. Попробуйте обновить страницу.");
            } finally {
                if (mounted) setLoading(false);
            }
        })();

        return () => {
            mounted = false;
            stopAllTimers();
            if (currentBlobUrlRef.current) {
                URL.revokeObjectURL(currentBlobUrlRef.current);
                currentBlobUrlRef.current = null;
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [uuid]);

    const handleManualRefresh = async () => {
        // Останавливаем старый polling
        stopAllTimers();

        setLoading(true);
        try {
            // Создаем новую сессию с тем же UUID
            const session = await createSession(uuid);
            setSessionId(session.id);

            // Загружаем новый QR
            const { imageUrl } = await fetchQr(String(session.id));
            setBlobUrlSafely(imageUrl);

            // Запускаем polling снова
            startPollingStatus();

            toast.success("QR обновлён");
        } catch (e) {
            console.error(e);
            toast.error("Не удалось обновить QR. Попробуйте ещё раз.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (getToken()) {
            navigate("/queue");
        }
    }, [navigate]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
            <div className="bg-white rounded-xl p-6 md:p-8 max-w-lg w-full shadow-xl">
                <div className="text-center mb-6">
                    <h1 className="text-2xl sm:text-3xl text-gray-800 font-semibold mb-2">Встреча с акимом</h1>
                    <p className="text-gray-600 text-base sm:text-lg">Онлайн очередь</p>
                </div>

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
                                    <rect width="200" height="200" fill="#f0f0f0" />
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

                <div className="mt-8 pt-6 border-t border-gray-200">
                    <p className="text-gray-500 text-sm mb-2">
                        После входа вы автоматически встанете в очередь на встречу.
                    </p>
                    <p className="text-yellow-500 font-semibold text-sm">
                        ⚠️ Важно: оставайтесь онлайн, иначе ваша очередь будет сброшена!
                    </p>
                </div>
            </div>
        </div>
    );
};

