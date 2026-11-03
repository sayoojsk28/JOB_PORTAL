
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';

const SendAnnouncements = () => {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSendAnnouncement = async () => {
    setSuccessMessage('');
    setErrorMessage('');

    if (!message.trim()) {
      setErrorMessage('Please enter an announcement message.');
      return;
    }

    try {
      setSending(true);

      const response = await api.post('/employee/announcements', {
        message: message.trim(),
      });

      setSuccessMessage(
        `Announcement sent successfully! ${response.data.students_notified} students notified.`
      );

      setMessage('');
      alert('Announcement sent successfully!');
    } catch (error) {
  const detail = error.response?.data?.detail;

  setErrorMessage(
    typeof detail === 'string'
      ? detail
      : Array.isArray(detail)
        ? detail.map((item) => item.msg).join(', ')
        : 'Failed to send announcement.'
  );
} finally {
  setSending(false);
}
  };

  return (
    <main className="min-h-[calc(100vh-76px)] bg-slate-50 px-4 py-8 sm:px-8 sm:py-10">
      <div className="mx-auto max-w-4xl">

        <Link
          to="/employee/dashboard"
          className="text-sm font-semibold text-blue-700 hover:text-blue-800"
        >
          ← Back to Dashboard
        </Link>

        {/* Page Heading */}
        <div className="mt-6">
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
            Send Announcements
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Share important updates with all active students.
          </p>
        </div>

        {/* Announcement Card */}
        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">

          {/* Recipient Information */}
          <h2 className="text-base font-bold text-slate-900">
            Recipients
          </h2>

          <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4">
            <div className="text-sm font-bold text-slate-800">
              🎓 All Active Students
            </div>

            <p className="mt-1 text-xs text-slate-600">
              This announcement will be sent to all active students.
            </p>
          </div>

          {/* Announcement Message */}
          <div className="mt-8 border-t border-slate-100 pt-6">

            <label className="block text-sm font-bold text-slate-900">
              Announcement Message
            </label>

            <p className="mt-1 text-sm text-slate-500">
              Write the announcement you want to share.
            </p>

            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              maxLength={500}
              placeholder="Type your announcement here..."
              className="mt-4 w-full resize-y rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />

            <div className="mt-2 text-right text-xs text-slate-400">
              {message.length}/500 characters
            </div>

            <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

              <div>
                {successMessage && (
                  <p className="text-sm text-green-600">
                    {successMessage}
                  </p>
                )}

                {errorMessage && (
                  <p className="text-sm text-red-600">
                    {errorMessage}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={handleSendAnnouncement}
                disabled={sending}
                className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="mr-2">➤</span>
                {sending ? 'Sending...' : 'Send Announcement'}
              </button>

            </div>

          </div>
        </div>
      </div>
    </main>
  );
};

export default SendAnnouncements;
