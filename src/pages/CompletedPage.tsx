import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { getSignStatus } from '../api/endpoints/sign';
import { getCitizenMeetingUrl } from '../api/endpoints/qbox';
import type { SignStatusResponse } from '../types/sign.t';

export const CompletedPage = () => {
    const [searchParams] = useSearchParams();
    const sessionId = searchParams.get('sessionId');
    const navigate = useNavigate();
    
    const [loading, setLoading] = useState(true);
    const [meetingUrl, setMeetingUrl] = useState<string | null>(null);
    const [signData, setSignData] = useState<SignStatusResponse | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const initMeeting = async () => {
            if (!sessionId) {
                toast.error('Не указан ID сессии');
                navigate('/');
                return;
            }

            try {
                // Проверяем статус сессии
                const status = await getSignStatus(sessionId);
                setSignData(status);
                
                if (status.state !== 'SIGNED') {
                    setError('Сессия не подписана. Пожалуйста, завершите авторизацию в eGov Mobile.');
                    setLoading(false);
                    return;
                }

                // Получаем ссылку на встречу
                const meetingData = await getCitizenMeetingUrl(sessionId);
                setMeetingUrl(meetingData.meetingUrl);
                
                // Для десктопа не открываем автоматически - даем пользователю контроль
                toast.success('Ссылка на встречу получена');
                
                setLoading(false);
            } catch (err: any) {
                console.error('Ошибка получения встречи:', err);
                
                if (err.response?.status === 404) {
                    setError('Встреча не найдена. Администратор еще не создал комнату.');
                } else if (err.response?.status === 400) {
                    setError('Сессия недействительна.');
                } else {
                    setError('Не удалось получить ссылку на встречу.');
                }
                
                setLoading(false);
            }
        };

        initMeeting();
    }, [sessionId, navigate]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
                <div className="bg-white rounded-xl shadow-lg p-8 text-center max-w-md w-full">
                    <div className="inline-block w-12 h-12 border-4 border-gray-200 rounded-full border-t-blue-500 animate-spin mb-4" />
                    <h2 className="text-xl font-bold text-gray-800 mb-2">Проверка статуса подписи...</h2>
                    <p className="text-gray-600">Пожалуйста, подождите</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
                <div className="bg-white rounded-xl shadow-lg p-6 md:p-8 max-w-md w-full text-center">
                    <div className="bg-gradient-to-br from-red-500 to-rose-500 text-white p-6 md:p-8 rounded-xl mb-6">
                        <div className="text-5xl mb-4">❌</div>
                        <h2 className="text-xl md:text-2xl font-bold mb-2">Ошибка</h2>
                        <p className="text-base opacity-90">{error}</p>
                    </div>
                    
                    <div className="space-y-3">
                        <button
                            onClick={() => navigate('/login')}
                            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
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
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-lg p-6 md:p-8 max-w-md w-full text-center">
                <div className="bg-gradient-to-br from-green-500 to-emerald-500 text-white p-6 md:p-8 rounded-xl mb-6">
                    <div className="text-5xl mb-4">✅</div>
                    <h2 className="text-xl md:text-2xl font-bold mb-2">Успешная авторизация!</h2>
                    <p className="text-base opacity-90">Документы успешно подписаны</p>
                </div>

                {signData?.user && (
                    <div className="bg-blue-50 border border-blue-200 p-4 md:p-5 rounded-lg mb-6 text-left">
                        <h3 className="text-sm font-semibold text-blue-900 mb-2">Информация о пользователе</h3>
                        <div className="text-sm text-blue-800 space-y-1">
                            <p className="m-0"><strong>ФИО:</strong> {signData.user.fullName}</p>
                            <p className="m-0"><strong>ИИН:</strong> {signData.user.iin}</p>
                            {signData.user.placeOfRegistrationCity && (
                                <p className="m-0"><strong>Город:</strong> {signData.user.placeOfRegistrationCity}</p>
                            )}
                        </div>
                    </div>
                )}

                {meetingUrl && (
                    <>
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 p-4 rounded-lg mb-4">
                            <p className="text-sm text-gray-700 mb-3">
                                Вы можете войти в видеоконференцию прямо сейчас
                            </p>
                        </div>

                        <button
                            onClick={() => window.open(meetingUrl, '_blank', 'noopener,noreferrer')}
                            className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg text-lg font-semibold transition-all shadow-lg hover:shadow-xl mb-4"
                        >
                            🎥 Войти в комнату встречи
                        </button>

                        <button
                            onClick={() => navigate('/')}
                            className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-sm font-medium transition"
                        >
                            ← Вернуться на главную
                        </button>

                        <div className="mt-6 pt-6 border-t border-gray-200">
                            <p className="text-gray-500 text-xs">
                                Встреча откроется в новой вкладке при нажатии кнопки выше
                            </p>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};
