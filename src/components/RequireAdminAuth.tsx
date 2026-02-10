import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { isAdminAuthenticated, clearAdminAuth } from '../utils/tokenUtils';
import { axiosInstance } from '../api/axiosInstance';

interface RequireAdminAuthProps {
    children: React.ReactNode;
}

export const RequireAdminAuth = ({ children }: RequireAdminAuthProps) => {
    const [isVerified, setIsVerified] = useState<boolean | null>(null);

    useEffect(() => {
        const verifyAuth = async () => {
            // Проверяем наличие credentials в localStorage
            if (!isAdminAuthenticated()) {
                setIsVerified(false);
                return;
            }

            try {
                // Реально проверяем авторизацию на сервере через health check
                const response = await axiosInstance.get('/api/qbox/health');
                
                if (response.status === 200) {
                    setIsVerified(true);
                } else {
                    clearAdminAuth();
                    setIsVerified(false);
                }
            } catch (error: any) {
                console.error('Auth verification failed:', error);
                
                // Если 401/403 - неверные credentials
                if (error.response?.status === 401 || error.response?.status === 403) {
                    clearAdminAuth();
                }
                
                setIsVerified(false);
            }
        };

        verifyAuth();
    }, []);

    // Показываем загрузчик пока проверяем
    if (isVerified === null) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center">
                <div className="bg-white rounded-xl shadow-lg p-8 text-center">
                    <div className="inline-block w-10 h-10 border-4 border-gray-200 rounded-full border-t-indigo-500 animate-spin mb-4" />
                    <div className="text-gray-600">Проверка доступа...</div>
                </div>
            </div>
        );
    }

    // Если не авторизован - редирект на логин
    if (!isVerified) {
        return <Navigate to="/admin/login" replace />;
    }

    // Если всё ок - показываем контент
    return <>{children}</>;
};
