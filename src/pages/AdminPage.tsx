import {useState, useEffect, useCallback} from 'react';
import {useNavigate} from 'react-router-dom';
import {toast} from 'sonner';
import type {QueueItem, QueueStats, QueueStatus} from '../types/moderator.t';
import {
    fetchQueues,
    fetchStats,
    updateQueueStatus,
    updateMeetingUrl,
    bulkUpdateStatus,
    deleteQueue
} from '../api/endpoints/moderator';

const REFRESH_INTERVAL = 5000; // 5 секунд

export const AdminPage = () => {
    const navigate = useNavigate();
    const [queues, setQueues] = useState<QueueItem[]>([]);
    const [stats, setStats] = useState<QueueStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState<QueueStatus | ''>('');
    const [editingUrl, setEditingUrl] = useState<number | null>(null);
    const [newUrl, setNewUrl] = useState('');
    const [bulkFrom, setBulkFrom] = useState('');
    const [bulkTo, setBulkTo] = useState('');
    const [bulkStatus, setBulkStatus] = useState<QueueStatus>('SERVED');

    const loadData = useCallback(async () => {
        try {
            const [queuesData, statsData] = await Promise.all([
                fetchQueues(filterStatus || undefined),
                fetchStats()
            ]);
            setQueues(queuesData);
            setStats(statsData);
        } catch (error) {
            console.error('Ошибка загрузки данных:', error);
            toast.error('Ошибка загрузки данных');
        } finally {
            setLoading(false);
        }
    }, [filterStatus]);

    useEffect(() => {
        void loadData();
    }, [loadData]);

    useEffect(() => {
        const interval = setInterval(loadData, REFRESH_INTERVAL);
        return () => clearInterval(interval);
    }, [loadData]);

    const handleStatusChange = async (id: number, newStatus: QueueStatus) => {
        try {
            await updateQueueStatus(id, newStatus);
            toast.success('Статус изменен');
            await loadData();
        } catch (error) {
            toast.error('Ошибка изменения статуса');
        }
    };

    const handleUrlUpdate = async (id: number) => {
        if (!newUrl.trim()) {
            toast.error('Введите URL встречи');
            return;
        }
        try {
            await updateMeetingUrl(id, newUrl);
            toast.success('URL встречи обновлен');
            setEditingUrl(null);
            setNewUrl('');
            await loadData();
        } catch (error) {
            toast.error('Ошибка обновления URL');
        }
    };

    const handleBulkUpdate = async () => {
        const from = parseInt(bulkFrom);
        const to = parseInt(bulkTo);

        if (!from || !to || from > to) {
            toast.error('Проверьте диапазон номеров');
            return;
        }

        try {
            const result = await bulkUpdateStatus(from, to, bulkStatus);
            toast.success(`Обновлено ${result.updatedCount} записей`);
            setBulkFrom('');
            setBulkTo('');
            await loadData();
        } catch (error) {
            toast.error('Ошибка массового обновления');
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('Вы уверены, что хотите отменить эту очередь?')) {
            return;
        }
        try {
            await deleteQueue(id);
            toast.success('Очередь отменена');
            await loadData();
        } catch (error) {
            toast.error('Ошибка отмены очереди');
        }
    };

    const handleLogout = () => {
        localStorage.clear();
        navigate('/login');
    };

    const getStatusText = (status: QueueStatus) => {
        switch (status) {
            case 'WAITING':
                return 'В ожидании';
            case 'IN_BUFFER':
                return 'В буфере';
            case 'SERVED':
                return 'Обслужен';
            case 'CANCELLED':
                return 'Отменен';
        }
    };

    const getStatusColor = (status: QueueStatus) => {
        switch (status) {
            case 'WAITING':
                return 'bg-blue-100 text-blue-700';
            case 'IN_BUFFER':
                return 'bg-orange-100 text-orange-700';
            case 'SERVED':
                return 'bg-green-100 text-green-700';
            case 'CANCELLED':
                return 'bg-red-100 text-red-700';
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center">
                <div className="bg-white rounded-xl shadow-lg p-8 text-center">
                    <div className="inline-block w-10 h-10 border-4 border-gray-200 rounded-full border-t-indigo-500 animate-spin mb-4" />
                    <div className="text-gray-600">Загрузка...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 p-4 md:p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Панель модератора</h1>
                        <button
                            onClick={handleLogout}
                            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-medium"
                        >
                            Выйти
                        </button>
                    </div>
                </div>

                {/* Stats */}
                {stats && (
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                        <div className="bg-white rounded-xl shadow p-4">
                            <div className="text-gray-500 text-sm mb-1">Всего</div>
                            <div className="text-2xl font-bold text-gray-800">{stats.total}</div>
                        </div>
                        <div className="bg-white rounded-xl shadow p-4">
                            <div className="text-gray-500 text-sm mb-1">Ожидают</div>
                            <div className="text-2xl font-bold text-blue-600">{stats.waiting}</div>
                        </div>
                        <div className="bg-white rounded-xl shadow p-4">
                            <div className="text-gray-500 text-sm mb-1">В буфере</div>
                            <div className="text-2xl font-bold text-orange-600">{stats.inBuffer}</div>
                        </div>
                        <div className="bg-white rounded-xl shadow p-4">
                            <div className="text-gray-500 text-sm mb-1">Обслужено</div>
                            <div className="text-2xl font-bold text-green-600">{stats.served}</div>
                        </div>
                        <div className="bg-white rounded-xl shadow p-4">
                            <div className="text-gray-500 text-sm mb-1">Отменено</div>
                            <div className="text-2xl font-bold text-red-600">{stats.cancelled}</div>
                        </div>
                    </div>
                )}

                {/* Bulk Actions */}
                <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
                    <h2 className="text-xl font-semibold mb-4">Массовые действия</h2>
                    <div className="flex flex-col md:flex-row gap-3">
                        <input
                            type="number"
                            placeholder="От номера"
                            value={bulkFrom}
                            onChange={(e) => setBulkFrom(e.target.value)}
                            className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <input
                            type="number"
                            placeholder="До номера"
                            value={bulkTo}
                            onChange={(e) => setBulkTo(e.target.value)}
                            className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <select
                            value={bulkStatus}
                            onChange={(e) => setBulkStatus(e.target.value as QueueStatus)}
                            className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="WAITING">В ожидании</option>
                            <option value="IN_BUFFER">В буфер</option>
                            <option value="SERVED">Обслужен</option>
                            <option value="CANCELLED">Отменен</option>
                        </select>
                        <button
                            onClick={handleBulkUpdate}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-medium whitespace-nowrap"
                        >
                            Применить
                        </button>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
                    <h2 className="text-xl font-semibold mb-4">Фильтры</h2>
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => setFilterStatus('')}
                            className={`px-4 py-2 rounded-lg font-medium ${
                                filterStatus === ''
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                        >
                            Все
                        </button>
                        <button
                            onClick={() => setFilterStatus('WAITING')}
                            className={`px-4 py-2 rounded-lg font-medium ${
                                filterStatus === 'WAITING'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                            }`}
                        >
                            В ожидании
                        </button>
                        <button
                            onClick={() => setFilterStatus('IN_BUFFER')}
                            className={`px-4 py-2 rounded-lg font-medium ${
                                filterStatus === 'IN_BUFFER'
                                    ? 'bg-orange-600 text-white'
                                    : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                            }`}
                        >
                            В буфере
                        </button>
                        <button
                            onClick={() => setFilterStatus('SERVED')}
                            className={`px-4 py-2 rounded-lg font-medium ${
                                filterStatus === 'SERVED'
                                    ? 'bg-green-600 text-white'
                                    : 'bg-green-100 text-green-700 hover:bg-green-200'
                            }`}
                        >
                            Обслужено
                        </button>
                        <button
                            onClick={() => setFilterStatus('CANCELLED')}
                            className={`px-4 py-2 rounded-lg font-medium ${
                                filterStatus === 'CANCELLED'
                                    ? 'bg-red-600 text-white'
                                    : 'bg-red-100 text-red-700 hover:bg-red-200'
                            }`}
                        >
                            Отменено
                        </button>
                    </div>
                </div>

                {/* Queue List */}
                <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                    <div className="p-6 border-b border-gray-200">
                        <h2 className="text-xl font-semibold">Список очередей ({queues.length})</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        №
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        ID Сессии
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Статус
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        URL встречи
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Создан
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Действия
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {queues.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                                            Нет данных
                                        </td>
                                    </tr>
                                ) : (
                                    queues.map((queue) => (
                                        <tr key={queue.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-gray-900">
                                                    {queue.sequenceNumber}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-900">{queue.sessionId}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span
                                                    className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(
                                                        queue.status
                                                    )}`}
                                                >
                                                    {getStatusText(queue.status)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                {editingUrl === queue.id ? (
                                                    <div className="flex gap-2">
                                                        <input
                                                            type="text"
                                                            value={newUrl}
                                                            onChange={(e) => setNewUrl(e.target.value)}
                                                            placeholder="https://..."
                                                            className="border border-gray-300 rounded px-2 py-1 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                        />
                                                        <button
                                                            onClick={() => handleUrlUpdate(queue.id)}
                                                            className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm"
                                                        >
                                                            ✓
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setEditingUrl(null);
                                                                setNewUrl('');
                                                            }}
                                                            className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded text-sm"
                                                        >
                                                            ✕
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2">
                                                        {queue.meetingUrl ? (
                                                            <a
                                                                href={queue.meetingUrl}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="text-indigo-600 hover:text-indigo-900 text-sm truncate max-w-xs"
                                                            >
                                                                {queue.meetingUrl}
                                                            </a>
                                                        ) : (
                                                            <span className="text-gray-400 text-sm">Нет URL</span>
                                                        )}
                                                        <button
                                                            onClick={() => {
                                                                setEditingUrl(queue.id);
                                                                setNewUrl(queue.meetingUrl || '');
                                                            }}
                                                            className="text-gray-500 hover:text-gray-700 text-sm"
                                                        >
                                                            ✏️
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-500">
                                                    {new Date(queue.createdAt).toLocaleString('ru-RU')}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                <div className="flex flex-col gap-1">
                                                    {queue.status === 'WAITING' && (
                                                        <button
                                                            onClick={() => handleStatusChange(queue.id, 'IN_BUFFER')}
                                                            className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-1 rounded text-xs"
                                                        >
                                                            В буфер
                                                        </button>
                                                    )}
                                                    {queue.status === 'IN_BUFFER' && (
                                                        <button
                                                            onClick={() => handleStatusChange(queue.id, 'SERVED')}
                                                            className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-xs"
                                                        >
                                                            Обслужен
                                                        </button>
                                                    )}
                                                    {queue.status !== 'CANCELLED' && queue.status !== 'SERVED' && (
                                                        <button
                                                            onClick={() => handleDelete(queue.id)}
                                                            className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-xs"
                                                        >
                                                            Отменить
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-6 text-center text-sm text-gray-500">
                    <p>Автоматическое обновление каждые 5 секунд</p>
                </div>
            </div>
        </div>
    );
};

