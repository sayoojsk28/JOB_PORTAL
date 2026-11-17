
import { useEffect, useState } from 'react';
import api from '../../services/api';

export default function EmployeeMockInterviewResults() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [publishingId, setPublishingId] = useState(null);
  const [error, setError] = useState('');

  const fetchResults = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await api.get('/employee/mock-interview-results');
      setResults(response.data);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        'Failed to load mock interview results.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResults();
  }, []);

  const handlePublish = async (interviewId) => {
    const confirmed = window.confirm(
      'Are you sure you want to publish this mock interview result?'
    );

    if (!confirmed) return;

    try {
      setPublishingId(interviewId);

      await api.patch(
        `/employee/mock-interview-results/${interviewId}/publish`
      );

      alert('Mock interview result published successfully.');

      setResults((previous) =>
        previous.filter((item) => item.interview_id !== interviewId)
      );
    } catch (err) {
      alert(
        err.response?.data?.detail ||
        'Failed to publish mock interview result.'
      );
    } finally {
      setPublishingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-600">Loading mock interview results...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-5 py-8 sm:px-8">
      <div className="mx-auto max-w-7xl">

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-800 sm:text-3xl">
            Mock Interview Results
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Review completed student mock interviews and publish their results.
          </p>
        </div>

        {error && (
          <div className="mb-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {results.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <div className="text-4xl">🎯</div>
            <h2 className="mt-4 text-lg font-semibold text-slate-800">
              No Pending Mock Interview Results
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Completed mock interview results will appear here for your review.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="bg-slate-100 text-slate-600">
                  <tr>
                    <th className="px-5 py-4">Student</th>
                    <th className="px-5 py-4">Course</th>
                    <th className="px-5 py-4">Attempt</th>
                    <th className="px-5 py-4">Final Mark</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4">Completed At</th>
                    <th className="px-5 py-4">Action</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {results.map((item) => (
                    <tr key={item.interview_id} className="hover:bg-slate-50">

                      <td className="px-5 py-4">
                        <p className="font-semibold text-slate-800">
                          {item.student_name}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {item.student_email}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <p className="font-medium text-slate-800">
                          {item.job_role}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {item.course_type}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        {item.attempt_number}
                      </td>

                      <td className="px-5 py-4 font-semibold text-slate-800">
                        {item.total_score}/100
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            item.status === 'Passed'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        {item.completed_at
                          ? new Date(item.completed_at).toLocaleString()
                          : '—'}
                      </td>

                      <td className="px-5 py-4">
                        <button
                          onClick={() => handlePublish(item.interview_id)}
                          disabled={publishingId === item.interview_id}
                          className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {publishingId === item.interview_id
                            ? 'Publishing...'
                            : 'Publish'}
                        </button>
                      </td>

                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
