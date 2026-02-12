import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { getSignStatus } from '../api/endpoints/sign';
import { getCitizenMeetingUrl } from '../api/endpoints/qbox';

export const MeetingRedirectPage = () => {
    const [searchParams] = useSearchParams();
    const sessionId = searchParams.get('sessionId');
    const navigate = useNavigate();
    
    const [loading, setLoading] = useState(true);
    const [meetingUrl, setMeetingUrl] = useState<string | null>(null);
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
                
                if (status.state !== 'SIGNED') {
                    setError('Сессия не подписана. Пожалуйста, завершите авторизацию.');
                    setLoading(false);
                    return;
                }

                // Получаем ссылку на встречу
                const meetingData = await getCitizenMeetingUrl(sessionId);
                setMeetingUrl(meetingData.meetingUrl);
                
                // Автоматически пробуем открыть встречу (для мобильных это должно сработать)
                const opened = window.open(meetingData.meetingUrl, '_blank', 'noopener,noreferrer');
                
                if (opened) {
                    toast.success('Встреча открыта');
                } else {
                    toast.info('Нажмите кнопку ниже для входа в комнату');
                }
                
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
                    <h2 className="text-xl font-bold text-gray-800 mb-2">Получение ссылки на встречу...</h2>
                    <p className="text-gray-600">Пожалуйста, подождите</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
                <div className="bg-white rounded-xl shadow-lg p-6 md:p-8 max-w-md w-full text-center">
                    <div className="text-5xl mb-4">❌</div>
                    <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-3">Ошибка</h2>
                    <p className="text-gray-600 mb-6">{error}</p>
                    
                    <button
                        onClick={() => navigate('/')}
                        className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
                    >
                        Вернуться на главную
                    </button>
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
                    <p className="text-base opacity-90">Вы можете войти в видеоконференцию</p>
                </div>

                {meetingUrl && (
                    <>
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
                                Если встреча не открылась автоматически, нажмите кнопку выше
                            </p>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};
