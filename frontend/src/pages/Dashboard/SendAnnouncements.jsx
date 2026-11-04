
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';

const SendAnnouncements = () => {
  const [recipientType, setRecipientType] = useState('employees');
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

    const response = await api.post('/admin/announcements', {
      recipient_type: recipientType,
      message: message.trim(),
    });

    setSuccessMessage(
      `Announcement sent successfully! ${response.data.employees_notified} employees and ${response.data.students_notified} students notified.`
    );

    setMessage('');
    alert('Announcement sent successfully!');
  } catch (error) {
    setErrorMessage(
      error.response?.data?.detail || 'Failed to send announcement.'
    );
  } finally {
    setSending(false);
  }
};
  return (
    <main className="min-h-[calc(100vh-76px)] bg-slate-50 px-4 py-8 sm:px-8 sm:py-10">
      <div className="mx-auto max-w-4xl">

        <Link
          to="/admin/dashboard"
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
            Share important updates with employees and students.
          </p>
        </div>

        {/* Announcement Card */}
        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">

          {/* Recipient Selection */}
          <h2 className="text-base font-bold text-slate-900">
            Choose Recipients
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Who should receive this announcement?
          </p>

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">

            {/* Employees */}
            <button
              type="button"
              onClick={() => setRecipientType('employees')}
              className={`rounded-xl border p-4 text-left transition ${
                recipientType === 'employees'
                  ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-100'
                  : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
              }`}
            >
              <div className="text-sm font-bold text-slate-800">
                Employees
              </div>

              <p className="mt-1 text-xs text-slate-500">
                Send to all active employees
              </p>

              {recipientType === 'employees' && (
                <span className="mt-3 inline-block text-xs font-semibold text-blue-700">
                  ✓ Selected
                </span>
              )}
            </button>

            {/* Everyone */}
            <button
              type="button"
              onClick={() => setRecipientType('both')}
              className={`rounded-xl border p-4 text-left transition ${
                recipientType === 'both'
                  ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-100'
                  : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
              }`}
            >
              <div className="text-sm font-bold text-slate-800">
                Everyone
              </div>

              <p className="mt-1 text-xs text-slate-500">
                Employees and students
              </p>

              {recipientType === 'both' && (
                <span className="mt-3 inline-block text-xs font-semibold text-blue-700">
                  ✓ Selected
                </span>
              )}
            </button>

            {/* Students */}
            <button
              type="button"
              onClick={() => setRecipientType('students')}
              className={`rounded-xl border p-4 text-left transition ${
                recipientType === 'students'
                  ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-100'
                  : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
              }`}
            >
              <div className="text-sm font-bold text-slate-800">
                Students
              </div>

              <p className="mt-1 text-xs text-slate-500">
                Send to all active students
              </p>

              {recipientType === 'students' && (
                <span className="mt-3 inline-block text-xs font-semibold text-blue-700">
                  ✓ Selected
                </span>
              )}
            </button>

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
              placeholder="Type your announcement here..."
              className="mt-4 w-full resize-y rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
            <div className="flex justify-end mt-6">
  {successMessage && (
  <p className="text-green-600 text-sm mt-4">
    {successMessage}
  </p>
)}

{errorMessage && (
  <p className="text-red-600 text-sm mt-4">
    {errorMessage}
  </p>
)}
  <button
    type="button"
    onClick={handleSendAnnouncement}
  disabled={sending}
    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
  >
    <span className="mr-2">➤</span>
    Send Announcement
  </button>
</div>

          </div>

        </div>
      </div>
    </main>
  );
};

export default SendAnnouncements;
