import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { setAdminAuth } from '../utils/tokenUtils';
import axiosInstance from '../api/axiosInstance';

export const AdminLoginPage = () => {
    const navigate = useNavigate();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();

        if (!username.trim() || !password.trim()) {
            toast.error('Введите логин и пароль');
            return;
        }

        setLoading(true);

        try {
            // Временно сохраняем учетные данные для проверки
            const credentials = btoa(`${username}:${password}`);
            console.log('Попытка авторизации с учетными данными:', { username, credentials });

            // Проверяем авторизацию, делая тестовый запрос к API
            const response = await axiosInstance.get('/api/citizen-moderator/stats', {
                headers: {
                    'Authorization': `Basic ${credentials}`
                },
                withCredentials: true
            });

            console.log('Успешный ответ от сервера:', response);

            if (response.status === 200) {
                // Сохраняем учетные данные
                setAdminAuth(username, password);
                toast.success('Успешная авторизация');
                navigate('/admin');
            }
        } catch (error: unknown) {
            console.error('Полная ошибка авторизации:', error);
            if (error && typeof error === 'object' && 'response' in error) {
                const axiosError = error as { response?: { status?: number; data?: any; headers?: any } };
                const status = axiosError.response?.status;
                const data = axiosError.response?.data;
                const headers = axiosError.response?.headers;

                console.error('Детали ошибки:', { status, data, headers });

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
        <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-800 mb-2">Панель администратора</h1>
                    <p className="text-gray-600">Войдите для доступа к модерации</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                            Логин
                        </label>
                        <input
                            id="username"
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
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
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            disabled={loading}
                            autoComplete="current-password"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors ${
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
                </form>

                <div className="mt-6 text-center">
                    <button
                        onClick={() => navigate('/login')}
                        className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                    >
                        ← Вернуться на главную
                    </button>
                </div>
            </div>
        </div>
    );
};
