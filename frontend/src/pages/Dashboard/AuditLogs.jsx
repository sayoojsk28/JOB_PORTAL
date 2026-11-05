
import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

const AuditLogs = () => {
  const { user, loading: authLoading } = useAuth();

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);

  const limit = 10;

  useEffect(() => {
    if (authLoading) return;

    const fetchAuditLogs = async () => {
      if (!user) {
        setError('Please log in to view audit logs.');
        setLoading(false);
        return;
      }

      let endpoint;

      if (user.role === 'admin') {
        endpoint = '/admin/audit-logs';
      } else if (user.role === 'employee') {
        endpoint = '/employee/audit-logs';
      } else {
        setError('You are not authorised to view audit logs.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError('');

        const response = await api.get(endpoint, {
          params: { page, limit },
        });

        setLogs(response.data.logs);
        setTotal(response.data.total);
        setTotalPages(response.data.total_pages);

      } catch (err) {
        setError(
          err.response?.data?.detail ||
          'Failed to load audit logs. Please try again.'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchAuditLogs();
  }, [user, authLoading, page, refreshKey]);

  const handleRefresh = () => {
    if (page !== 1) {
      setPage(1);
    } else {
      setRefreshKey((prev) => prev + 1);
    }
  };

  const formatDate = (date) => {
    if (!date) return '—';

    return new Date(date).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getActionStyle = (action) => {
    if (action?.includes('SUCCESS') || action?.includes('ACTIVE')) {
      return 'bg-green-100 text-green-700';
    }

    if (
      action?.includes('FAILED') ||
      action?.includes('BLOCKED') ||
      action?.includes('REJECTED')
    ) {
      return 'bg-red-100 text-red-700';
    }

    return 'bg-blue-100 text-blue-700';
  };

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-slate-600">Loading audit logs...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-7xl">

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
            Audit Logs
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            {user?.role === 'admin'
              ? 'Monitor system activities, login attempts and user actions.'
              : 'View your login activity and student approval or rejection history.'}
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {!error && (
          <>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-800">
                  Activity History
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  {total} {total === 1 ? 'record' : 'records'} found
                </p>
              </div>

              <button
                onClick={handleRefresh}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              >
                ↻ Refresh
              </button>
            </div>

            {logs.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-white px-6 py-12 text-center">
                <p className="text-lg font-semibold text-slate-700">
                  No audit logs found
                </p>

                <p className="mt-2 text-sm text-slate-500">
                  Activity records will appear here when actions are performed.
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 text-left">
                      <thead className="bg-slate-100">
                        <tr>
                          <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-600">
                            ID
                          </th>

                          <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-600">
                            Action
                          </th>

                          <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-600">
                            Target
                          </th>

                          <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-600">
                            Details
                          </th>

                          {user?.role === 'admin' && (
                            <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-600">
                              User ID
                            </th>
                          )}

                          <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-600">
                            IP Address
                          </th>

                          <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-600">
                            Date & Time
                          </th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-slate-100">
                        {logs.map((log) => (
                          <tr
                            key={log.log_id}
                            className="transition hover:bg-slate-50"
                          >
                            <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-500">
                              #{log.log_id}
                            </td>

                            <td className="whitespace-nowrap px-5 py-4">
                              <span
                                className={`rounded-full px-3 py-1 text-xs font-semibold ${getActionStyle(log.action)}`}
                              >
                                {log.action}
                              </span>
                            </td>

                            <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
                              {log.target_type
                                ? `${log.target_type} #${log.target_id ?? '—'}`
                                : '—'}
                            </td>

                            <td className="max-w-xs px-5 py-4 text-sm text-slate-600">
                              {log.details || '—'}
                            </td>

                            {user?.role === 'admin' && (
                              <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
                                {log.user_id ?? 'Unknown'}
                              </td>
                            )}

                            <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-500">
                              {log.ip_address || '—'}
                            </td>

                            <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-500">
                              {formatDate(log.created_at)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Pagination */}
                <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
                  <p className="text-sm text-slate-500">
                    Showing {(page - 1) * limit + 1} to{' '}
                    {Math.min(page * limit, total)} of {total} records
                  </p>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setPage((prev) => prev - 1)}
                      disabled={page === 1}
                      className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Previous
                    </button>

                    <span className="text-sm font-medium text-slate-700">
                      Page {page} of {totalPages}
                    </span>

                    <button
                      onClick={() => setPage((prev) => prev + 1)}
                      disabled={page >= totalPages}
                      className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </>
            )}
          </>
        )}

      </div>
    </div>
  );
};

export default AuditLogs;
