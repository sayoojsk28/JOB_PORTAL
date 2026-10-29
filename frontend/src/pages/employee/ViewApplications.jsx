
import { useEffect, useState } from 'react';
import api from '../../services/api';

function ViewApplication() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState(null);
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    const fetchApplications = async () => {
      try {
        const response = await api.get('/employee/applications');
        setApplications(response.data);
      } catch (err) {
        setError(
          err.response?.data?.detail ||
            'Failed to load applications.'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchApplications();
  }, []);

  const markAsSent = async (application) => {
    setUpdatingId(application.application_id);
    setActionError('');

    try {
      await api.patch(
        `/employee/applications/${application.application_id}/status`,
        { status: 'Sent' }
      );

      setApplications((previous) =>
        previous.map((item) =>
          item.application_id === application.application_id
            ? { ...item, status: 'Sent' }
            : item
        )
      );
      alert('Application status updated successfully!');
    } catch (err) {
      setActionError(
        err.response?.data?.detail ||
          'Failed to update application status.'
      );
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-sm font-medium text-slate-500">
          Loading applications...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-600">
          {typeof error === 'string' ? error : 'Failed to load applications.'}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        {/* Page heading */}
        <div className="mb-8">
          <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-blue-700">
            Recruitment Management
          </p>

          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                View Applications
              </h1>
              <p className="mt-2 text-slate-500">
                Review student applications and manage resume submissions.
              </p>
            </div>

            <div className="inline-flex w-fit items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.8}
                  stroke="currentColor"
                  className="h-5 w-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2m6-10a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm7-3h5m-2.5-2.5v5"
                  />
                </svg>
              </span>

              <div>
                <p className="text-xs text-slate-500">
                  Total applications
                </p>
                <p className="text-xl font-bold text-slate-900">
                  {applications.length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {actionError && (
          <p className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
            {actionError}
          </p>
        )}

        {/* Empty state */}
        {applications.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="h-8 w-8"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"
                />
              </svg>
            </div>

            <h2 className="text-lg font-semibold text-slate-800">
              No applications yet
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Student applications will appear here when they apply for vacancies.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">
                Student applications
              </h2>
              <p className="text-sm text-slate-500">
                {applications.length} application(s)
              </p>
            </div>

            {/* Application cards */}
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              {applications.map((application) => {
                const isSent = application.status === 'Sent';
                const isUpdating =
                  updatingId === application.application_id;

                const resumeUrl = application.resume_url
                  ? `${api.defaults.baseURL?.replace(/\/$/, '') || ''}${application.resume_url.startsWith('/') ? '' : '/'}${application.resume_url}`
                  : '';

                return (
                  <article
                    key={application.application_id}
                    className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition duration-200 hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl hover:shadow-slate-200/60"
                  >
                    <div className="h-1.5 bg-gradient-to-r from-blue-700 via-blue-500 to-cyan-400" />

                    <div className="p-5 sm:p-6">
                      {/* Student and status */}
                      <div className="flex items-start gap-4">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-blue-700">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={1.6}
                            stroke="currentColor"
                            className="h-7 w-7"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M20 21a8 8 0 0 0-16 0m8-10a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"
                            />
                          </svg>
                        </div>

                        <div className="min-w-0 flex-1">
                          <h3 className="break-words text-lg font-bold text-slate-900 transition group-hover:text-blue-700">
                            {application.student_name || 'Unknown student'}
                          </h3>
                          <p className="mt-1 break-all text-sm text-slate-500">
                            {application.student_email || 'No email available'}
                          </p>
                        </div>

                        <span
                          className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                            isSent
                              ? 'bg-green-50 text-green-700'
                              : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          {application.status || 'Not Sent'}
                        </span>
                      </div>

                      {/* Vacancy and company */}
                      <div className="mt-5 rounded-xl bg-slate-50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                          Applied for
                        </p>
                        <h4 className="mt-1 break-words text-base font-bold text-slate-900">
                          {application.vacancy_title || 'Unknown vacancy'}
                        </h4>
                        <p className="mt-1 text-sm text-slate-600">
                          {application.company_name || 'Company not available'}
                        </p>
                      </div>

                      {/* Applied date */}
                      <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={1.8}
                          stroke="currentColor"
                          className="h-5 w-5 shrink-0"
                        >
                          <rect x="3" y="5" width="18" height="16" rx="2" />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M16 3v4M8 3v4M3 10h18"
                          />
                        </svg>
                        <span>
                          Applied:{' '}
                          {application.applied_at
                            ? new Date(application.applied_at).toLocaleDateString(
                                'en-IN',
                                {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                }
                              )
                            : 'Date unavailable'}
                        </span>
                      </div>

                      {/* Actions */}
                      <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row">
                        {resumeUrl ? (
                          <a
                            href={resumeUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700 transition hover:border-blue-300 hover:bg-blue-100"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth={1.8}
                              stroke="currentColor"
                              className="h-5 w-5"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M12 16V4m0 0L8 8m4-4 4 4M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"
                              />
                            </svg>
                            View Resume
                          </a>
                        ) : (
                          <span className="flex-1 rounded-xl bg-slate-100 px-4 py-3 text-center text-sm text-slate-500">
                            Resume unavailable
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => markAsSent(application)}
                          disabled={isSent || isUpdating}
                          className={`inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition ${
                            isSent
                              ? 'cursor-not-allowed bg-green-50 text-green-700'
                              : 'bg-blue-700 text-white hover:bg-blue-800 disabled:cursor-wait disabled:opacity-60'
                          }`}
                        >
                          {isUpdating ? (
                            'Updating...'
                          ) : isSent ? (
                            <>
                              <span aria-hidden="true">✓</span>
                              Sent
                            </>
                          ) : (
                            <>
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth={1.8}
                                stroke="currentColor"
                                className="h-5 w-5"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="m4 12 16-8-5 16-3-6-8-2Zm8 2 5-10"
                                />
                              </svg>
                              Mark as Sent
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default ViewApplication;
