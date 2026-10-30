
import { useEffect, useState } from 'react';
import api from '../../services/api';

const ViewConfirmedInterview = () => {
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState(null);

  useEffect(() => {
    const fetchInterviews = async () => {
      try {
        const response = await api.get('/student/interviews');
        setInterviews(response.data);
      } catch (err) {
        setError(
          err.response?.data?.detail ||
          'Unable to load interviews.'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchInterviews();
  }, []);

  const updateAttendance = async (interviewId, value) => {
    setUpdatingId(interviewId);

    try {
      await api.patch(
        `/student/interviews/${interviewId}/attendance`,
        { student_attendance: value }
      );

      if (value !== 'Waiting') {
        setInterviews((previous) =>
          previous.filter(
            (item) => item.interview_id !== interviewId
          )
        );
      } else {
        setInterviews((previous) =>
          previous.map((item) =>
            item.interview_id === interviewId
              ? { ...item, student_attendance: value }
              : item
          )
        );
      }
    } catch (err) {
      window.alert(
        err.response?.data?.detail ||
        'Unable to update attendance.'
      );
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="font-medium text-slate-500">
          Loading interviews...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-600">
          {error}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">

        <div className="mb-8">
          <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-blue-700">
            Student Dashboard
          </p>

          <h1 className="text-3xl font-bold text-slate-900">
            My Interviews
          </h1>

          <p className="mt-2 text-slate-500">
            View your scheduled interviews and update your attendance.
          </p>
        </div>

        <div className="mb-6 flex items-center justify-between rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <div>
            <p className="text-sm text-slate-500">
              Total Interviews
            </p>
            <p className="text-2xl font-bold text-slate-900">
              {interviews.length}
            </p>
          </div>

          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.8}
              stroke="currentColor"
              className="h-6 w-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8 7V3m8 4V3M4 11h16M5 5h14a1 1 0 0 1 1 1v14H4V6a1 1 0 0 1 1-1Z"
              />
            </svg>
          </div>
        </div>

        {interviews.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
            <h2 className="text-lg font-semibold text-slate-800">
              No Interviews Found
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              You currently have no upcoming interviews.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">

                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-4 font-semibold">Date</th>
                    <th className="px-5 py-4 font-semibold">Time</th>
                    <th className="px-5 py-4 font-semibold">Mode</th>
                    <th className="px-5 py-4 font-semibold">Interview Status</th>
                    <th className="px-5 py-4 font-semibold">Venue / Link</th>
                    <th className="px-5 py-4 font-semibold">Attendance</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">

                  {interviews.map((interview) => (
                    <tr
                      key={interview.interview_id}
                      className="transition hover:bg-slate-50"
                    >
                      <td className="whitespace-nowrap px-5 py-4 font-medium text-slate-800">
                        {new Date(
                          `${interview.interview_date}T00:00:00`
                        ).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                        {interview.interview_time}
                      </td>

                      <td className="px-5 py-4 text-slate-700">
                        {interview.mode}
                      </td>

                      <td className="px-5 py-4">
                        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                          {interview.status}
                        </span>
                      </td>

                      <td className="max-w-xs break-all px-5 py-4 text-slate-600">
                        {interview.meeting_link_or_venue}
                      </td>

                      <td className="px-5 py-4">
                        <select
                          value={interview.student_attendance}
                          disabled={updatingId === interview.interview_id}
                          onChange={(e) =>
                            updateAttendance(
                              interview.interview_id,
                              e.target.value
                            )
                          }
                          className="w-44 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:opacity-60"
                        >
                          <option value="Waiting">Waiting</option>
                          <option value="Attended">Attended</option>
                          <option value="Not Interested">Not Interested</option>
                        </select>

                        {updatingId === interview.interview_id && (
                          <p className="mt-1 text-xs text-blue-600">
                            Updating...
                          </p>
                        )}
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
};

export default ViewConfirmedInterview;
