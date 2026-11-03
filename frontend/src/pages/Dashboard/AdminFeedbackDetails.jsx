import { useLocation, useNavigate, useParams } from 'react-router-dom';

export default function AdminFeedbackDetails() {
  const location = useLocation();
  const navigate = useNavigate();
  const { feedbackId } = useParams();

  const feedback = location.state?.feedback;

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-4xl">

        <h1 className="text-3xl font-bold text-slate-900">
          Feedback Details
        </h1>
        {feedback ? (
  <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">

    <div className="border-b border-slate-200 pb-5">
      <p className="text-sm font-medium text-slate-500">
        Submitted by
      </p>

      <h2 className="mt-1 text-xl font-semibold text-slate-900">
        {feedback.student_name}
      </h2>

      <p className="mt-1 text-sm text-slate-500">
        {feedback.student_email}
      </p>
    </div>

    <div className="mt-5 flex flex-wrap justify-between gap-3 text-sm text-slate-500">
      <p>Feedback ID: #{feedback.feedback_id}</p>

      <p>
        {new Date(feedback.created_at).toLocaleString()}
      </p>
    </div>

    <div className="mt-7">
      <h3 className="text-lg font-semibold text-slate-800">
        Feedback Message
      </h3>

      <div className="mt-3 whitespace-pre-wrap rounded-lg bg-slate-50 p-5 leading-7 text-slate-700">
        {feedback.message}
      </div>
    </div>

    <button
      onClick={() => navigate('/admin/student-feedback')}
      className="mt-7 rounded-lg bg-slate-800 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-700"
    >
      Back to Feedback Inbox
    </button>

  </div>
) : (
  <p className="mt-8 text-slate-500">
    Feedback details are unavailable. Please return to the inbox.
  </p>
)}

      </div>
    </div>
  );
}