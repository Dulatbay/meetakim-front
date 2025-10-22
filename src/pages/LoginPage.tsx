import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { getToken, setToken } from "../utils/tokenUtils";
import { makeSessionId } from "../utils/session";

import type { SignStatusResponse } from "../types/sign.t";
import {fetchQr, getSignStatus} from "../api/endpoints/sign.ts";

export const LoginPage = () => {
    const navigate = useNavigate();

    // Стабильный sessionId на время жизни компонента
    const sessionId = useMemo(() => makeSessionId(), []);
    const [qrUrl, setQrUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const qrRefreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const currentBlobUrlRef = useRef<string | null>(null);

    // Очистка blob-URL при замене/размонтаже
    const setBlobUrlSafely = (url: string) => {
        if (currentBlobUrlRef.current) URL.revokeObjectURL(currentBlobUrlRef.current);
        currentBlobUrlRef.current = url;
        setQrUrl(url);
    };

    const loadQr = async () => {
        try {
            const { imageUrl } = await fetchQr(sessionId);
            setBlobUrlSafely(imageUrl);
        } catch (e) {
            console.error(e);
            toast.error("Не удалось загрузить QR. Попробуйте обновить.");
        }
    };

    const startPollingStatus = () => {
        if (pollTimerRef.current) return; // уже идёт
        pollTimerRef.current = setInterval(async () => {
            try {
                const resp: SignStatusResponse = await getSignStatus(sessionId);

                if (resp.status === "SIGNED") {
                    // Есть подпись — считаем это финальным «токеном»
                    if (resp.signedDocument) {
                        setToken(resp.signedDocument);
                    } else {
                        // fallback — можно сохранить sessionId как токен, если так задумано
                        setToken(resp.sessionId);
                    }
                    toast.success("Успешная авторизация");
                    stopAllTimers();
                    navigate("/queue");
                } else if (resp.status === "FAILED") {
                    toast.error("Авторизация отклонена в eGov Mobile");
                    stopPolling();
                } // PENDING — просто ждём дальше
            } catch (e) {
                console.warn("Status poll error:", e);
                // тихо продолжаем; при длительных ошибках можно показать подсказку
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
        if (qrRefreshTimerRef.current) {
            clearInterval(qrRefreshTimerRef.current);
            qrRefreshTimerRef.current = null;
        }
    };

    useEffect(() => {
        let mounted = true;

        (async () => {
            setLoading(true);
            try {
                await loadQr();

                startPollingStatus();

                qrRefreshTimerRef.current = setInterval(() => {
                    if (!mounted) return;
                    loadQr();
                }, 60_000);
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
    }, [sessionId]);

    const handleManualRefresh = async () => {
        await loadQr();
        toast.info("QR обновлён");
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

