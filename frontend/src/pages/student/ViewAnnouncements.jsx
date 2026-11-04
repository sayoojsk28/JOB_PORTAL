
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

const ViewAnnouncements = () => {
  const navigate = useNavigate();

  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const response = await api.get('/student/announcements');
        setAnnouncements(response.data);
      } catch (err) {
        setError(
          err.response?.data?.detail ||
          'Unable to load announcements. Please try again.'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchAnnouncements();
  }, []);

  const formatDate = (date) => {
    return new Date(date).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-8 sm:py-10">
      <div className="mx-auto max-w-4xl">

        <button
          type="button"
          onClick={() => navigate('/student/dashboard')}
          className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:text-blue-900"
        >
          ← Back to Dashboard
        </button>

        <div className="mb-8">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-2xl">
              📢
            </div>

            <div>
              <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
                Announcements
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Important updates and information from the administration.
              </p>
            </div>
          </div>
        </div>

        {loading && (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
            <p className="text-sm font-medium text-slate-500">
              Loading announcements...
            </p>
          </div>
        )}

        {!loading && error && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        {!loading && !error && announcements.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
            <div className="text-5xl">📭</div>

            <h2 className="mt-4 text-lg font-bold text-slate-800">
              No Announcements Yet
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              There are currently no announcements from the admin.
            </p>
          </div>
        )}

        {!loading && !error && announcements.length > 0 && (
          <div className="space-y-4">

            <p className="text-sm font-medium text-slate-500">
              {announcements.length} announcement(s)
            </p>

            {announcements.map((item) => (
              <article
                key={item.notification_id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-200 hover:shadow-md sm:p-6"
              >
                <div className="flex items-start gap-3">

                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-xl">
                    📢
                  </div>

                  <div className="min-w-0 flex-1">

                    <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-blue-700">
                      Admin Announcement
                    </p>

                    <p className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-700">
                      {item.message}
                    </p>

                    <div className="mt-5 border-t border-slate-100 pt-4">
                      <p className="text-xs text-slate-400">
                        {formatDate(item.created_at)}
                      </p>
                    </div>

                  </div>
                </div>
              </article>
            ))}

          </div>
        )}

        <footer className="mt-10 pb-4 text-center text-xs text-slate-400">
          Job Portal · Student Workspace
        </footer>

      </div>
    </main>
  );
};

export default ViewAnnouncements;
