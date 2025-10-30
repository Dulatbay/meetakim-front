import {useState, useEffect, useCallback} from 'react';
import {useNavigate} from 'react-router-dom';
import {toast} from 'sonner';
import type {QueueItem, QueueStats, QueueStatus, SortDirection} from '../types/moderator.t';
import {
    fetchQueues,
    fetchStats,
    updateQueueStatus,
    updateMeetingUrl,
    bulkUpdateStatus,
    deleteQueue
} from '../api/endpoints/moderator';
import {getSignStatus} from '../api/endpoints/sign';
import type {SignStatusResponse} from '../types/sign.t';
import {clearAdminAuth} from '../utils/tokenUtils';

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
    const [personNames, setPersonNames] = useState<Record<number, string>>({});
    const [isMobileView, setIsMobileView] = useState(false);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(0);
    const [pageSize, setPageSize] = useState(20);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);
    const [sortField, setSortField] = useState('sequenceNumber');
    const [sortDirection, setSortDirection] = useState<SortDirection>('DESC');

    // Detect screen size
    useEffect(() => {
        const checkMobileView = () => {
            setIsMobileView(window.innerWidth < 1024);
        };
        checkMobileView();
        window.addEventListener('resize', checkMobileView);
        return () => window.removeEventListener('resize', checkMobileView);
    }, []);

    const loadData = useCallback(async () => {
        try {
            const [queuesData, statsData] = await Promise.all([
                fetchQueues(filterStatus || undefined, currentPage, pageSize, sortField, sortDirection),
                fetchStats()
            ]);
            console.log('Загружены данные:', {
                queuesData,
                content: queuesData.content,
                contentLength: queuesData.content?.length,
                totalPages: queuesData.totalPages,
                totalElements: queuesData.totalElements,
                currentPage,
                filterStatus
            });
            setQueues(queuesData.content || []);
            setTotalPages(queuesData.totalPages || 0);
            setTotalElements(queuesData.totalElements || 0);
            setStats(statsData);
        } catch (error) {
            console.error('Ошибка загрузки данных:', error);
            toast.error('Ошибка загрузки данных');
            setQueues([]);
        } finally {
            setLoading(false);
        }
    }, [filterStatus, currentPage, pageSize, sortField, sortDirection]);

    useEffect(() => {
        void loadData();
    }, [loadData]);

    useEffect(() => {
        const interval = setInterval(loadData, REFRESH_INTERVAL);
        return () => clearInterval(interval);
    }, [loadData]);

    useEffect(() => {
        setCurrentPage(0);
    }, [filterStatus]);

    useEffect(() => {
        const controller = new AbortController();
        const run = async () => {
            const missing = queues
                .filter(q => !q.fullName && !personNames[q.sessionId])
                .map(q => q.sessionId);
            if (missing.length === 0) return;

            try {
                // Limit concurrency to avoid spamming backend
                const batch = missing.slice(0, 20);
                const results = await Promise.all(
                    batch.map(async (sid) => {
                        try {
                            const resp: SignStatusResponse = await getSignStatus(String(sid));
                            const nameFromUser = resp.user?.fullName?.trim();
                            const nameFromCert = `${resp.personCertInfo?.subject?.surName ?? ''} ${resp.personCertInfo?.subject?.commonName ?? ''}`.trim();
                            const name = nameFromUser || nameFromCert || '';
                            return {sid, name} as const;
                        } catch {
                            return {sid, name: ''} as const;
                        }
                    })
                );

                const updates: Record<number, string> = {};
                for (const r of results) {
                    if (r.name) updates[r.sid] = r.name;
                }
                if (Object.keys(updates).length > 0) {
                    setPersonNames(prev => ({...prev, ...updates}));
                }
            } catch (e) {
                console.warn('Не удалось получить ФИО по сессиям:', e);
            }
        };
        void run();
        return () => controller.abort();
    }, [queues, personNames]);

    const handleStatusChange = async (id: number, newStatus: QueueStatus) => {
        try {
            await updateQueueStatus(id, newStatus);
            toast.success('Статус изменен');
            await loadData();
        } catch (error) {
            console.error('Ошибка изменения статуса:', error);
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
            console.error('Ошибка обновления URL:', error);
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
            console.error('Ошибка массового обновления:', error);
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
            console.error('Ошибка отмены очереди:', error);
            toast.error('Ошибка отмены очереди');
        }
    };

    const handlePageChange = (newPage: number) => {
        setCurrentPage(newPage);
    };

    const handlePageSizeChange = (newSize: number) => {
        setPageSize(newSize);
        setCurrentPage(0); // Reset to first page when changing page size
    };

    const handleLogout = () => {
        clearAdminAuth();
        navigate('/admin/login');
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
            <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
                <div className="bg-white rounded-xl shadow-lg p-8 text-center">
                    <div
                        className="inline-block w-10 h-10 border-4 border-gray-200 rounded-full border-t-indigo-500 animate-spin mb-4"/>
                    <div className="text-gray-600">Загрузка...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 p-3 sm:p-4 md:p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 mb-4 sm:mb-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800">Панель модератора</h1>
                        <button
                            onClick={handleLogout}
                            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-medium transition-colors w-full sm:w-auto"
                        >
                            Выйти
                        </button>
                    </div>
                </div>

                {/* Stats */}
                {stats && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-4 sm:mb-6">
                        <div className="bg-white rounded-xl shadow p-3 sm:p-4">
                            <div className="text-gray-500 text-xs sm:text-sm mb-1">Всего</div>
                            <div className="text-xl sm:text-2xl font-bold text-gray-800">{stats.total}</div>
                        </div>
                        <div className="bg-white rounded-xl shadow p-3 sm:p-4">
                            <div className="text-gray-500 text-xs sm:text-sm mb-1">Ожидают</div>
                            <div className="text-xl sm:text-2xl font-bold text-blue-600">{stats.waiting}</div>
                        </div>
                        <div className="bg-white rounded-xl shadow p-3 sm:p-4">
                            <div className="text-gray-500 text-xs sm:text-sm mb-1">В буфере</div>
                            <div className="text-xl sm:text-2xl font-bold text-orange-600">{stats.inBuffer}</div>
                        </div>
                        <div className="bg-white rounded-xl shadow p-3 sm:p-4">
                            <div className="text-gray-500 text-xs sm:text-sm mb-1">Обслужено</div>
                            <div className="text-xl sm:text-2xl font-bold text-green-600">{stats.served}</div>
                        </div>
                        <div className="bg-white rounded-xl shadow p-3 sm:p-4 col-span-2 sm:col-span-1">
                            <div className="text-gray-500 text-xs sm:text-sm mb-1">Отменено</div>
                            <div className="text-xl sm:text-2xl font-bold text-red-600">{stats.cancelled}</div>
                        </div>
                    </div>
                )}

                {/* Bulk Actions */}
                <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 mb-4 sm:mb-6">
                    <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">Массовые действия</h2>
                    <div className="flex flex-col gap-2 sm:gap-3">
                        <div className="grid grid-cols-2 gap-2 sm:gap-3">
                            <input
                                type="number"
                                placeholder="От номера"
                                value={bulkFrom}
                                onChange={(e) => setBulkFrom(e.target.value)}
                                className="border border-gray-300 rounded-lg px-3 sm:px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm sm:text-base"
                            />
                            <input
                                type="number"
                                placeholder="До номера"
                                value={bulkTo}
                                onChange={(e) => setBulkTo(e.target.value)}
                                className="border border-gray-300 rounded-lg px-3 sm:px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm sm:text-base"
                            />
                        </div>
                        <select
                            value={bulkStatus}
                            onChange={(e) => setBulkStatus(e.target.value as QueueStatus)}
                            className="border border-gray-300 rounded-lg px-3 sm:px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm sm:text-base"
                        >
                            <option value="WAITING">В ожидании</option>
                            <option value="IN_BUFFER">В буфер</option>
                            <option value="SERVED">Обслужен</option>
                            <option value="CANCELLED">Отменен</option>
                        </select>
                        <button
                            onClick={handleBulkUpdate}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-medium transition-colors text-sm sm:text-base"
                        >
                            Применить
                        </button>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 mb-4 sm:mb-6">
                    <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">Фильтры</h2>
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => setFilterStatus('')}
                            className={`px-3 sm:px-4 py-2 rounded-lg font-medium transition-colors text-sm sm:text-base ${
                                filterStatus === ''
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                        >
                            Все
                        </button>
                        <button
                            onClick={() => setFilterStatus('WAITING')}
                            className={`px-3 sm:px-4 py-2 rounded-lg font-medium transition-colors text-sm sm:text-base ${
                                filterStatus === 'WAITING'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                            }`}
                        >
                            В ожидании
                        </button>
                        <button
                            onClick={() => setFilterStatus('IN_BUFFER')}
                            className={`px-3 sm:px-4 py-2 rounded-lg font-medium transition-colors text-sm sm:text-base ${
                                filterStatus === 'IN_BUFFER'
                                    ? 'bg-orange-600 text-white'
                                    : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                            }`}
                        >
                            В буфере
                        </button>
                        <button
                            onClick={() => setFilterStatus('SERVED')}
                            className={`px-3 sm:px-4 py-2 rounded-lg font-medium transition-colors text-sm sm:text-base ${
                                filterStatus === 'SERVED'
                                    ? 'bg-green-600 text-white'
                                    : 'bg-green-100 text-green-700 hover:bg-green-200'
                            }`}
                        >
                            Обслужено
                        </button>
                        <button
                            onClick={() => setFilterStatus('CANCELLED')}
                            className={`px-3 sm:px-4 py-2 rounded-lg font-medium transition-colors text-sm sm:text-base ${
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
                    <div className="p-4 sm:p-6 border-b border-gray-200">
                        <h2 className="text-lg sm:text-xl font-semibold">Список очередей ({queues?.length || 0})</h2>
                    </div>

                    {/* Mobile Card View */}
                    {isMobileView ? (
                        <div className="divide-y divide-gray-200">
                            {!queues || queues.length === 0 ? (
                                <div className="p-6 text-center text-gray-500">Нет данных</div>
                            ) : (
                                queues.map((queue) => {
                                    const displayName = queue.fullName || personNames[queue.sessionId] || '—';
                                    return (
                                        <div key={queue.id} className="p-4 space-y-3">
                                            {/* Header Row */}
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="text-2xl font-bold text-gray-900">
                                                        #{queue.sequenceNumber}
                                                    </div>
                                                    <span
                                                        className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(
                                                            queue.status
                                                        )}`}
                                                    >
                                                        {getStatusText(queue.status)}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Info Section */}
                                            <div className="space-y-2 text-sm">
                                                <div>
                                                    <span className="text-gray-500">ФИО:</span>{' '}
                                                    <span className="text-gray-900 font-medium">{displayName}</span>
                                                </div>
                                                <div>
                                                    <span className="text-gray-500">ИИН:</span>{' '}
                                                    <span className="text-gray-900">{queue.iin || '—'}</span>
                                                </div>
                                                <div>
                                                    <span className="text-gray-500">ID Сессии:</span>{' '}
                                                    <span className="text-gray-900">{queue.sessionId}</span>
                                                </div>
                                                <div>
                                                    <span className="text-gray-500">Создан:</span>{' '}
                                                    <span className="text-gray-900">
                                                        {new Date(queue.createdAt).toLocaleString('ru-RU')}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Meeting URL Section */}
                                            <div>
                                                <div className="text-xs text-gray-500 mb-1">URL встречи:</div>
                                                {editingUrl === queue.id ? (
                                                    <div className="flex flex-col gap-2">
                                                        <input
                                                            type="text"
                                                            value={newUrl}
                                                            onChange={(e) => setNewUrl(e.target.value)}
                                                            placeholder="https://..."
                                                            className="border border-gray-300 rounded px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                        />
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => handleUrlUpdate(queue.id)}
                                                                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded text-sm flex-1"
                                                            >
                                                                Сохранить
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    setEditingUrl(null);
                                                                    setNewUrl('');
                                                                }}
                                                                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded text-sm flex-1"
                                                            >
                                                                Отмена
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2">
                                                        {queue.meetingUrl ? (
                                                            <a
                                                                href={queue.meetingUrl}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="text-indigo-600 hover:text-indigo-900 text-sm truncate flex-1"
                                                            >
                                                                {queue.meetingUrl}
                                                            </a>
                                                        ) : (
                                                            <span
                                                                className="text-gray-400 text-sm flex-1">Нет URL</span>
                                                        )}
                                                        <button
                                                            onClick={() => {
                                                                setEditingUrl(queue.id);
                                                                setNewUrl(queue.meetingUrl || '');
                                                            }}
                                                            className="text-gray-500 hover:text-gray-700 p-2"
                                                        >
                                                            ✏️
                                                        </button>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Actions */}
                                            <div className="flex flex-wrap gap-2 pt-2">
                                                {queue.status === 'WAITING' && (
                                                    <button
                                                        onClick={() => handleStatusChange(queue.id, 'IN_BUFFER')}
                                                        className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded text-sm flex-1 min-w-[120px]"
                                                    >
                                                        В буфер
                                                    </button>
                                                )}
                                                {queue.status === 'IN_BUFFER' && (
                                                    <button
                                                        onClick={() => handleStatusChange(queue.id, 'SERVED')}
                                                        className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded text-sm flex-1 min-w-[120px]"
                                                    >
                                                        Обслужен
                                                    </button>
                                                )}
                                                {queue.status !== 'CANCELLED' && queue.status !== 'SERVED' && (
                                                    <button
                                                        onClick={() => handleDelete(queue.id)}
                                                        className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded text-sm flex-1 min-w-[120px]"
                                                    >
                                                        Отменить
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    ) : (
                        /* Desktop Table View */
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50">
                                <tr>
                                    <th
                                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                        onClick={() => {
                                            if (sortField === 'sequenceNumber') {
                                                setSortDirection(sortDirection === 'ASC' ? 'DESC' : 'ASC');
                                            } else {
                                                setSortField('sequenceNumber');
                                                setSortDirection('ASC');
                                            }
                                        }}
                                    >
                                        <div className="flex items-center gap-1">
                                            № {sortField === 'sequenceNumber' && (sortDirection === 'ASC' ? '↑' : '↓')}
                                        </div>
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        ID Сессии
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        ФИО
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        ИИН
                                    </th>
                                    <th
                                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                        onClick={() => {
                                            if (sortField === 'status') {
                                                setSortDirection(sortDirection === 'ASC' ? 'DESC' : 'ASC');
                                            } else {
                                                setSortField('status');
                                                setSortDirection('ASC');
                                            }
                                        }}
                                    >
                                        <div className="flex items-center gap-1">
                                            Статус {sortField === 'status' && (sortDirection === 'ASC' ? '↑' : '↓')}
                                        </div>
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        URL встречи
                                    </th>
                                    <th
                                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                        onClick={() => {
                                            if (sortField === 'createdAt') {
                                                setSortDirection(sortDirection === 'ASC' ? 'DESC' : 'ASC');
                                            } else {
                                                setSortField('createdAt');
                                                setSortDirection('DESC');
                                            }
                                        }}
                                    >
                                        <div className="flex items-center gap-1">
                                            Создан {sortField === 'createdAt' && (sortDirection === 'ASC' ? '↑' : '↓')}
                                        </div>
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Действия
                                    </th>
                                </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                {!queues || queues.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
                                            Нет данных
                                        </td>
                                    </tr>
                                ) : (
                                    queues.map((queue) => {
                                        const displayName = queue.fullName || personNames[queue.sessionId] || '—';
                                        return (
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
                                                    <div className="text-sm text-gray-900 truncate max-w-[220px]"
                                                         title={displayName}>
                                                        {displayName}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm text-gray-900">
                                                        {queue.iin || '—'}
                                                    </div>
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
                                        );
                                    })
                                )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Pagination */}
                <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 mt-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        {/* Page Size Selector */}
                        <div className="flex items-center gap-2">
                            <span className="text-xs sm:text-sm text-gray-500">Записей на странице:</span>
                            <select
                                value={pageSize}
                                onChange={(e) => handlePageSizeChange(parseInt(e.target.value))}
                                className="border border-gray-300 rounded-lg px-2 sm:px-3 py-1 sm:py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs sm:text-sm"
                            >
                                <option value={10}>10</option>
                                <option value={20}>20</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                            </select>
                        </div>

                        {/* Total Elements Info */}
                        <div className="text-xs sm:text-sm text-gray-500 text-center">
                            Всего записей: {totalElements}
                        </div>

                        {/* Pagination Controls */}
                        <div className="flex items-center justify-center gap-2">
                            <button
                                onClick={() => handlePageChange(currentPage - 1)}
                                disabled={currentPage === 0}
                                className={`px-3 sm:px-4 py-2 rounded-lg font-medium transition-colors text-xs sm:text-sm ${
                                    currentPage === 0
                                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                        : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                                }`}
                            >
                                Назад
                            </button>
                            <span className="text-xs sm:text-sm text-gray-700 font-medium whitespace-nowrap px-2">
                                {currentPage + 1} / {totalPages || 1}
                            </span>
                            <button
                                onClick={() => handlePageChange(currentPage + 1)}
                                disabled={currentPage + 1 >= totalPages}
                                className={`px-3 sm:px-4 py-2 rounded-lg font-medium transition-colors text-xs sm:text-sm ${
                                    currentPage + 1 >= totalPages
                                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                        : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                                }`}
                            >
                                Вперед
                            </button>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-4 sm:mt-6 text-center text-xs sm:text-sm text-gray-500">
                    <p>Автоматическое обновление каждые 5 секунд</p>
                </div>
            </div>
        </div>
    );
};
