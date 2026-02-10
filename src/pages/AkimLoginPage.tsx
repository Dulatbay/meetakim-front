import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { setAdminAuth } from '../utils/tokenUtils';
import { axiosInstance } from '../api/axiosInstance';

export const AkimLoginPage = () => {
    const navigate = useNavigate();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (!username.trim() || !password.trim()) {
            toast.error('Введите логин и пароль');
            return;
        }

        setLoading(true);

        try {
            const credentials = btoa(`${username}:${password}`);
            
            // Проверяем авторизацию через health check акима
            const response = await axiosInstance.get('/api/qbox/health-akim', {
                headers: {
                    'Authorization': `Basic ${credentials}`
                },
                withCredentials: true
            });

            if (response.status === 200) {
                setAdminAuth(username, password);
                toast.success('Успешная авторизация');
                navigate('/akim');
            }
        } catch (error: unknown) {
            console.error('Ошибка авторизации:', error);
            if (error && typeof error === 'object' && 'response' in error) {
                const axiosError = error as { response?: { status?: number; data?: any } };
                const status = axiosError.response?.status;
                const data = axiosError.response?.data;

                if (status === 401 || status === 403) {
                    toast.error('Неверный логин или пароль');
                } else if (data?.message) {
                    toast.error(`Ошибка: ${data.message}`);
                } else {
                    toast.error(`Ошибка сервера: ${status || 'неизвестная ошибка'}`);
                }
            } else {
                toast.error('Ошибка подключения к серверу');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-100 via-pink-50 to-blue-100 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
                <div className="text-center mb-8">
                    <div className="text-5xl mb-3">🎩</div>
                    <h1 className="text-3xl font-bold text-gray-800 mb-2">Панель акима</h1>
                    <p className="text-gray-600">Войдите для доступа к комнате встречи</p>
                </div>

                <div className="space-y-6">
                    <div>
                        <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                            Логин
                        </label>
                        <input
                            id="username"
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            disabled={loading}
                            autoComplete="username"
                        />
                    </div>

                    <div>
                        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                            Пароль
                        </label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            disabled={loading}
                            autoComplete="current-password"
                            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                        />
                    </div>

                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className={`w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors ${
                            loading ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                    >
                        {loading ? (
                            <div className="flex items-center justify-center">
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                                Вход...
                            </div>
                        ) : (
                            'Войти'
                        )}
                    </button>
                </div>

                <div className="mt-6 text-center">
                    <button
                        onClick={() => navigate('/')}
                        className="text-purple-600 hover:text-purple-800 text-sm font-medium"
                    >
                        ← Вернуться на главную
                    </button>
                </div>
            </div>
        </div>
    );
};
