import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {getToken} from "../utils/tokenUtils.ts";

export const LoginPage = () => {
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleEgovLogin = () => {
        setLoading(true);

        const width = 600;
        const height = 700;
        const left = window.innerWidth / 2 - width / 2;
        const top = window.innerHeight / 2 - height / 2;

        const popup = window.open(
            "/auth/egov",
            "eGovLogin",
            `width=${width},height=${height},top=${top},left=${left}`
        );

        if (!popup) {
            toast.error('Окно авторизации было заблокировано. Разрешите всплывающие окна и попробуйте снова.');
            setLoading(false);
            return;
        }

        // Убедимся для TS, что окно не null в колбэках
        const authWin = popup as Window;

        toast.info('Завершите авторизацию в открывшемся окне');

        const checkPopup = setInterval(() => {
            if (authWin.closed) {
                clearInterval(checkPopup);

                // Получаем токен из localStorage
                const token = getToken();

                if (token) {
                    toast.success('Успешная авторизация');
                    navigate("/status");
                    setLoading(false);
                } else {
                    toast.error('Ошибка авторизации. Пожалуйста, попробуйте снова.');
                    setLoading(false);
                }
            }
        }, 500);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
            <div className="bg-white rounded-xl p-6 md:p-8 max-w-lg w-full shadow-xl">
                <div className="text-center mb-6">
                    <h1 className="text-2xl sm:text-3xl text-gray-800 font-semibold mb-2">Встреча с акимом</h1>
                    <p className="text-gray-600 text-base sm:text-lg">Онлайн очередь</p>
                </div>

                <div className="text-center my-8">
                    <div className="inline-block border-2 border-gray-300 rounded-xl overflow-hidden p-2">
                        <div className="w-40 h-40 sm:w-52 sm:h-52">
                            <svg className="w-full h-full" viewBox="0 0 200 200">
                                <rect width="200" height="200" fill="#f0f0f0" />
                                <text x="50%" y="50%" textAnchor="middle" dy=".3em" fill="#999" fontSize="14">
                                    QR для eGov Mobile
                                </text>
                            </svg>
                        </div>
                    </div>
                    <p className="text-gray-500 mt-4 text-sm sm:text-base">Отсканируйте QR-код приложением eGov Mobile</p>
                </div>

                <div className="relative my-8">
                    <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 border-t border-gray-200" />
                    <span className="relative bg-white px-4 text-gray-500 text-sm">или</span>
                </div>

                <button
                    onClick={handleEgovLogin}
                    className="w-full py-3 bg-gradient-to-r from-indigo-500 to-indigo-700 text-white rounded-lg text-base sm:text-lg font-semibold transition-all duration-200 hover:translate-y-[1px] disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={loading}
                >
                    {loading ? 'Ожидание авторизации...' : 'Войти через eGov Mobile (Demo)'}
                </button>

                {loading && (
                    <div className="mt-4 text-center text-gray-500 text-sm">
                        Завершите авторизацию в открывшемся окне
                    </div>
                )}

                <div className="mt-8 pt-6 border-t border-gray-200">
                    <p className="text-gray-500 text-sm mb-2">После входа вы автоматически встанете в очередь на встречу с акимом.</p>
                    <p className="text-yellow-500 font-semibold text-sm">⚠️ Важно: Оставайтесь онлайн, иначе ваша очередь будет сброшена!</p>
                </div>
            </div>
        </div>
    )
}
