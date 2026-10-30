
import { useEffect, useState } from 'react';
import api from '../../services/api';
import { useNavigate } from 'react-router-dom';

const ViewInterview = () => {
    const navigate = useNavigate();
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchInterviews = async () => {
    try {
      const response = await api.get('/employee/interviews');
      setInterviews(response.data);
    } catch (err) {
      console.error('Unable to fetch interviews:', err);
      window.alert(
        err.response?.data?.detail ||
        'Unable to load interview history.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInterviews();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-slate-500">Loading interviews...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-6xl">

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-800">
            Interview History
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            View all interviews posted by you.
          </p>
        </div>

        {interviews.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <h2 className="text-lg font-semibold text-slate-700">
              No Interviews Found
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              You have not posted any interviews yet.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

            {interviews.map((interview) => (
              <div
                key={interview.interview_id}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="mb-5 flex items-center justify-between">
                  <h2 className="font-semibold text-slate-800">
                    Interview #{interview.interview_id}
                  </h2>

                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                    {interview.status}
                  </span>
                </div>

                <div className="space-y-3 text-sm">

                  <div className="flex justify-between gap-3">
                    <span className="text-slate-500">Application ID</span>
                    <span className="font-medium text-slate-800">
                      #{interview.application_id}
                    </span>
                  </div>

                  <div className="flex justify-between gap-3">
                    <span className="text-slate-500">Interview Date</span>
                    <span className="font-medium text-slate-800">
                      {interview.interview_date}
                    </span>
                  </div>

                  <div className="flex justify-between gap-3">
                    <span className="text-slate-500">Interview Time</span>
                    <span className="font-medium text-slate-800">
                      {interview.interview_time}
                    </span>
                  </div>

                  <div className="flex justify-between gap-3">
                    <span className="text-slate-500">Mode</span>
                    <span className="font-medium text-slate-800">
                      {interview.mode}
                    </span>
                  </div>

                  <div className="border-t border-slate-100 pt-3">
                    <p className="mb-1 text-slate-500">
                      Meeting Link / Venue
                    </p>
                    <p className="break-all font-medium text-slate-800">
                      {interview.meeting_link_or_venue}
                    </p>
                  </div>

                  <div className="border-t border-slate-100 pt-3">
                    <p className="mb-1 text-slate-500">
                      Student Attendance
                    </p>
                    <span className="font-semibold text-amber-600">
                      {interview.student_attendance}
                    </span>
                  </div>

                  {interview.notes && (
                    <div className="border-t border-slate-100 pt-3">
                      <p className="mb-1 text-slate-500">
                        Additional Notes
                      </p>
                      <p className="text-slate-700">
                        {interview.notes}
                      </p>
                    </div>
                  )}

                </div>
                <button
  type="button"
  onClick={() =>
    navigate('/employee/post-result', {
      state: {
        interview_id: interview.interview_id,
      },
    })
  }
  className="mt-6 w-full rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white transition hover:bg-blue-800"
>
  Publish Results
</button>
              </div>
            ))}

          </div>
        )}
      </div>
    </div>
  );
};

export default ViewInterview;
