import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import api from '../../services/api';

function SelfDiscoveryStudio() {
  const { courseId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleStart = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await api.post(
        `/student/training-courses/${courseId}/self-discovery/start`
      );

      navigate(
        `/student/training-courses/${courseId}/self-discovery/chat`,
        {
          state: {
            selfDiscoveryData: response.data
          }
        }
      );

    } catch (err) {
      setError(
        err.response?.data?.detail ||
        'Failed to start Self Discovery. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-4xl">

        <button
          onClick={() => navigate('/student/training-courses')}
          className="mb-6 text-sm font-semibold text-blue-700 hover:text-blue-900"
        >
          ← Back to Courses
        </button>

        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-widest text-blue-700">
            AI Training Programme
          </p>

          <h1 className="mt-2 text-3xl font-bold text-slate-900 sm:text-4xl">
            Self Discovery Studio
          </h1>

          <p className="mt-3 text-slate-500">
            Understand yourself, recognise your strengths, and discover
            what makes you unique.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">

          <h2 className="text-xl font-bold text-slate-900">
            Discover Yourself
          </h2>

          <p className="mt-4 leading-7 text-slate-600">
            Before preparing for an interview, it is important to
            understand who you are beyond your technical knowledge.
            This activity will help you explore your interests,
            motivations, personal qualities, experiences, and
            challenges.
          </p>

          <div className="mt-6 rounded-xl bg-blue-50 p-5">
            <h3 className="font-semibold text-blue-900">
              What will you do?
            </h3>

            <ul className="mt-3 space-y-3 text-sm leading-6 text-blue-900">
              <li>
                • Reflect on your interests and what motivates you.
              </li>

              <li>
                • Explore your personal experiences and challenges.
              </li>

              <li>
                • Discuss your thoughts through an AI-guided conversation.
              </li>

              <li>
                • Develop a better understanding of yourself through reflection.
              </li>
            </ul>
          </div>

          <div className="mt-6">
            <h3 className="font-semibold text-slate-900">
              How does it work?
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              The AI will engage in a natural conversation with you,
              exploring your thoughts and experiences through relevant
              follow-up questions. There are no right or wrong answers.
              Be honest and share your experiences in your own words.
            </p>
          </div>

          {error && (
            <div className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="mt-8 border-t border-slate-200 pt-6">

            <p className="text-xs text-slate-400">
              Course ID: #{courseId}
            </p>

            <button
              type="button"
              onClick={handleStart}
              disabled={loading}
              className="mt-4 w-full rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading
                ? 'Starting...'
                : 'Begin Discover Yourself →'}
            </button>

          </div>
        </div>

      </div>
    </div>
  );
}

export default SelfDiscoveryStudio;