
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';

export default function AdminStudentFeedback() {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const [totalFeedback, setTotalFeedback] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const limit = 10;

  // Fetch feedback with backend pagination and search
  useEffect(() => {
    const fetchFeedbacks = async () => {
      try {
        setLoading(true);
        setErrorMessage('');

        const response = await api.get('/admin/student-feedback', {
          params: {
            page: currentPage,
            limit,
            search: searchTerm.trim(),
          },
        });

        setFeedbacks(response.data.feedbacks);
        setTotalFeedback(response.data.total_feedback);
        setTotalPages(response.data.total_pages);
      } catch (error) {
        setErrorMessage(
          error.response?.data?.detail || 'Failed to load student feedback.'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchFeedbacks();
  }, [currentPage, searchTerm]);

  // Delete feedback when marked as Read
  const handleStatusChange = async (feedbackId) => {
    try {
      setErrorMessage('');
      setDeletingId(feedbackId);

      await api.delete(`/admin/student-feedback/${feedbackId}`);

      const remainingFeedbacks = feedbacks.length - 1;

      if (remainingFeedbacks === 0 && currentPage > 1) {
        setCurrentPage((previousPage) => previousPage - 1);
      } else {
        const response = await api.get('/admin/student-feedback', {
          params: {
            page: currentPage,
            limit,
            search: searchTerm.trim(),
          },
        });

        setFeedbacks(response.data.feedbacks);
        setTotalFeedback(response.data.total_feedback);
        setTotalPages(response.data.total_pages);
      }
    } catch (error) {
      setErrorMessage(
        error.response?.data?.detail || 'Failed to delete feedback.'
      );
    } finally {
      setDeletingId(null);
    }
  };

  // Reset to first page when searching
  const handleSearchChange = (value) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const unreadCount = totalFeedback;

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
              {totalFeedback}
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
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search by student name, email or feedback..."
            className="w-full rounded-lg border border-slate-300 py-3 px-4 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />
        </div>

        {/* Error */}
        {errorMessage && (
          <p className="mb-4 text-sm text-red-500">
            {errorMessage}
          </p>
        )}

        {/* Loading */}
        {loading && <p>Loading feedback...</p>}

        {/* Feedback Table */}
        {!loading && (
          <>
            <div className="mt-6 overflow-x-auto rounded-lg border border-gray-200 bg-white">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-100 text-gray-700">
                  <tr>
                    <th className="px-5 py-4">Student</th>
                    <th className="px-5 py-4">Email</th>
                    <th className="px-5 py-4">Feedback</th>
                    <th className="px-5 py-4">Submitted On</th>
                    <th className="px-5 py-4">Action</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-200">
                  {feedbacks.map((item) => (
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
                        <button
                          type="button"
                          onClick={() => handleStatusChange(item.feedback_id)}
                          disabled={deletingId === item.feedback_id}
                          className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {deletingId === item.feedback_id
                            ? 'Processing...'
                            : 'Mark as Read'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {feedbacks.length === 0 && (
                <p className="p-6 text-center text-gray-500">
                  {searchTerm.trim()
                    ? 'No matching feedback found.'
                    : 'No feedback received yet.'}
                </p>
              )}
            </div>

            {/* Pagination */}
            {totalPages > 0 && (
              <div className="mt-5 flex flex-col items-center justify-between gap-4 sm:flex-row">
                <p className="text-sm text-gray-600">
                  Showing {((currentPage - 1) * limit) + 1} -{' '}
                  {Math.min(currentPage * limit, totalFeedback)} of{' '}
                  {totalFeedback} feedbacks
                </p>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((prev) => prev - 1)}
                    disabled={currentPage === 1}
                    className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Previous
                  </button>

                  <span className="px-3 text-sm font-semibold text-gray-700">
                    Page {currentPage} of {totalPages}
                  </span>

                  <button
                    type="button"
                    onClick={() => setCurrentPage((prev) => prev + 1)}
                    disabled={currentPage >= totalPages}
                    className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
