import {useEffect, useState} from "react";
import type {QueueResponse} from "../types/queue.t.ts";
import axiosInstance from "../api/axiosInstance";
import {getToken} from "../utils/tokenUtils.ts";

export const QueueStatus = () => {
    const [queueStatus, setQueueStatus] = useState<QueueResponse | null>(null);

    useEffect(() => {
        const token = getToken();

        if (token) {
            axiosInstance
                .get("/api/queue/status")
                .then((response) => {
                    setQueueStatus(response.data);
                })
                .catch((error) => {
                    console.error("Error fetching queue status", error);
                });
        } else {
            window.location.href = "/";
        }
    }, []);

    const statusLabel = (status: string) => {
        switch (status) {
            case 'WAITING':
                return {text: 'В ожидании', cls: 'bg-blue-50 text-blue-600'};
            case 'BUFFER':
                return {text: 'Скоро ваша очередь', cls: 'bg-amber-50 text-amber-600'};
            case 'ACTIVE':
                return {text: 'Встреча началась', cls: 'bg-green-50 text-green-600'};
            case 'COMPLETED':
                return {text: 'Завершено', cls: 'bg-gray-100 text-gray-600'};
            default:
                return {text: status, cls: 'bg-gray-100 text-gray-600'};
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl p-6 md:p-8 max-w-lg w-full shadow-xl">
                {queueStatus ? (
                    <div className="text-center">
                        <h2 className="text-xl sm:text-2xl font-semibold text-gray-800 mb-4">Ваш номер в очереди</h2>
                        <div className="text-5xl font-extrabold text-gray-900 mb-4">{queueStatus.number}</div>
                        <div className={`inline-block px-4 py-2 rounded-full text-sm font-semibold ${statusLabel(queueStatus.status).cls}`}>
                            {statusLabel(queueStatus.status).text}
                        </div>

                        {queueStatus.status === "ACTIVE" && queueStatus.meetingUrl && (
                            <div className="mt-6">
                                <a href={queueStatus.meetingUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold no-underline">
                                    Перейти в комнату
                                </a>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="text-center text-gray-600">
                        <div className="inline-block w-10 h-10 border-4 border-gray-200 rounded-full border-t-indigo-500 animate-spin mb-3" />
                        <p>Загрузка информации о вашем статусе...</p>
                    </div>
                )}
            </div>
        </div>
    );
};
