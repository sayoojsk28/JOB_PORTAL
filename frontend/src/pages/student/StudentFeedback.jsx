import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';

export default function StudentFeedback() {
  const [message, setMessage] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [sending, setSending] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmitFeedback = async () => {
  setErrorMessage('');
  setSuccessMessage('');

  try {
    setSending(true);

    const response = await api.post('/student/feedback', {
      message: message.trim(),
    });

    setSuccessMessage('Feedback submitted successfully!');
    setMessage('');
    setShowConfirm(false);

    alert('Feedback submitted successfully!');
  } catch (error) {
    setErrorMessage(
      error.response?.data?.detail || 'Failed to submit feedback.'
    );
  } finally {
    setSending(false);
  }
};
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-50 px-5 py-8">
      <div className="mx-auto max-w-3xl">

        <Link
          to="/student"
          className="text-sm font-semibold text-blue-600 hover:text-blue-800"
        >
          ← Back to Dashboard
        </Link>

        <div className="mt-6">
          <h1 className="text-3xl font-bold text-slate-800">
            Feedback to Admin
          </h1>
          <p className="mt-2 text-slate-500">
            Share your suggestions, feedback or complaints with the admin.
          </p>
        </div>

        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <label className="mb-3 block font-semibold text-slate-700">
            Your Message
          </label>

          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows="7"
            maxLength={500}
            placeholder="Write your feedback or complaint here..."
            className="w-full rounded-xl border border-slate-300 p-4 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
          {errorMessage && (
  <p className="mt-3 text-sm text-red-600">
    {errorMessage}
  </p>
)}

          <div className="mt-2 text-right text-xs text-slate-400">
            {message.length}/500
          </div>

          <div className="mt-5 flex justify-end">
            <button
  type="button"
  disabled={!message.trim()}
  onClick={() => setShowConfirm(true)}
  className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
>
  Send Feedback
</button>
          </div>
        </div>

      </div>
      {showConfirm && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">

      <h2 className="text-xl font-bold text-slate-800">
        Confirm Feedback Submission
      </h2>

      <p className="mt-3 text-sm leading-6 text-slate-600">
        Are you sure you want to send this feedback to the admin?
      </p>

      <div className="mt-6 flex justify-end gap-3">
        <button
          type="button"
          onClick={() => setShowConfirm(false)}
          className="rounded-lg border border-slate-300 px-5 py-2.5 font-semibold text-slate-600 hover:bg-slate-50"
        >
          Cancel
        </button>

        <button
  type="button"
  onClick={handleSubmitFeedback}
  disabled={sending}
  className="rounded-lg bg-blue-600 px-5 py-2.5 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
>
  {sending ? 'Sending...' : 'Yes, Send'}
</button>
      </div>

    </div>
  </div>
)}
    </div>
  );
}