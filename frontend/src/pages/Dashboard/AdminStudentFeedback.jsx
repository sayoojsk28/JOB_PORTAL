
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';

export default function AdminStudentFeedback() {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [feedbackStatuses, setFeedbackStatuses] = useState({});

  // Load saved statuses
  useEffect(() => {
    try {
      const savedStatuses = localStorage.getItem('studentFeedbackStatuses');
      if (savedStatuses) {
        setFeedbackStatuses(JSON.parse(savedStatuses));
      }
    } catch {
      setFeedbackStatuses({});
    }
  }, []);

  // Fetch feedback
  useEffect(() => {
    const fetchFeedbacks = async () => {
      try {
        setLoading(true);
        const response = await api.get('/admin/student-feedback');
        setFeedbacks(response.data);
      } catch (error) {
        setErrorMessage(
          error.response?.data?.detail || 'Failed to load student feedback.'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchFeedbacks();
  }, []);

  // Update status
  const handleStatusChange = (feedbackId, newStatus) => {
    const updatedStatuses = {
      ...feedbackStatuses,
      [feedbackId]: newStatus,
    };

    setFeedbackStatuses(updatedStatuses);
    localStorage.setItem(
      'studentFeedbackStatuses',
      JSON.stringify(updatedStatuses)
    );
  };

  // Search and sorting
  const filteredFeedbacks = feedbacks
    .filter((item) => {
      const search = searchTerm.toLowerCase();

      return (
        item.student_name.toLowerCase().includes(search) ||
        item.student_email.toLowerCase().includes(search) ||
        item.message.toLowerCase().includes(search)
      );
    })
    .sort((a, b) => {
      const statusA = feedbackStatuses[a.feedback_id] || 'Unread';
      const statusB = feedbackStatuses[b.feedback_id] || 'Unread';

      if (statusA === statusB) {
        return new Date(b.created_at) - new Date(a.created_at);
      }

      return statusA === 'Unread' ? -1 : 1;
    });

  const unreadCount = feedbacks.filter(
    (item) => (feedbackStatuses[item.feedback_id] || 'Unread') === 'Unread'
  ).length;

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-7xl">

        {/* Page Heading */}
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">
            Administration Portal
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
            Student Feedback Management
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Review and manage feedback, suggestions and complaints submitted by students.
          </p>
        </div>

        {/* Feedback Summary */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Total Feedback
            </p>
            <h2 className="mt-2 text-3xl font-bold text-slate-900">
              {feedbacks.length}
            </h2>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
            <p className="text-sm font-medium text-amber-700">
              Unread Feedback
            </p>
            <h2 className="mt-2 text-3xl font-bold text-amber-900">
              {unreadCount}
            </h2>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by student name, email or feedback..."
            className="w-full rounded-lg border border-slate-300 py-3 px-4 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />
        </div>

        {/* Loading */}
        {loading && <p>Loading feedback...</p>}

        {/* Error */}
        {errorMessage && (
          <p className="text-red-500">{errorMessage}</p>
        )}

        {/* Feedback Table */}
        {!loading && !errorMessage && (
          <div className="mt-6 overflow-x-auto rounded-lg border border-gray-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-100 text-gray-700">
                <tr>
                  <th className="px-5 py-4">Student</th>
                  <th className="px-5 py-4">Email</th>
                  <th className="px-5 py-4">Feedback</th>
                  <th className="px-5 py-4">Submitted On</th>
                  <th className="px-5 py-4">Status</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200">
                {filteredFeedbacks.map((item) => (
                  <tr key={item.feedback_id} className="hover:bg-gray-50">
                    <td className="px-5 py-4 font-medium">
                      {item.student_name}
                    </td>

                    <td className="px-5 py-4 text-gray-600">
                      {item.student_email}
                    </td>

                    <td className="px-5 py-4">
                      <Link
                        to={`/admin/student-feedback/${item.feedback_id}`}
                        state={{ feedback: item }}
                        className="font-semibold text-indigo-600 hover:text-indigo-800 hover:underline"
                      >
                        View Feedback
                      </Link>
                    </td>

                    <td className="px-5 py-4 text-gray-600 whitespace-nowrap">
                      {new Date(item.created_at).toLocaleString()}
                    </td>

                    <td className="px-5 py-4">
                      <select
                        value={feedbackStatuses[item.feedback_id] || 'Unread'}
                        onChange={(e) =>
                          handleStatusChange(item.feedback_id, e.target.value)
                        }
                        className={`rounded-lg border px-3 py-2 text-sm font-semibold outline-none ${
                          (feedbackStatuses[item.feedback_id] || 'Unread') === 'Unread'
                            ? 'border-amber-200 bg-amber-50 text-amber-700'
                            : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        }`}
                      >
                        <option value="Unread">Unread</option>
                        <option value="Read">Read</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredFeedbacks.length === 0 && (
              <p className="p-6 text-center text-gray-500">
                {feedbacks.length === 0
                  ? 'No feedback received yet.'
                  : 'No matching feedback found.'}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
