
import { useEffect, useState } from 'react';
import api from '../../services/api';

const PublishResult = () => {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [publishingId, setPublishingId] = useState(null);

  const fetchResults = async () => {
    try {
      const response = await api.get('/employee/interview-results');
      setResults(response.data);
    } catch (err) {
      console.error('Unable to fetch results:', err);

      window.alert(
        err.response?.data?.detail ||
        'Unable to load interview results.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResults();
  }, []);

  const handlePublish = async (resultId) => {
    try {
      setPublishingId(resultId);

      await api.patch(
        `/employee/interview-results/${resultId}/publish`
      );

      window.alert('Interview result published successfully!');

      await fetchResults();

    } catch (err) {
      console.error('Result publishing error:', err);

      window.alert(
        err.response?.data?.detail ||
        'Unable to publish result.'
      );
    } finally {
      setPublishingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-slate-500">Loading results...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-6xl">

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-800">
            Interview Results
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            View and publish interview results for students.
          </p>
        </div>

        {results.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <h2 className="text-lg font-semibold text-slate-700">
              No Results Found
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              You have not posted any interview results yet.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

            {results.map((item) => (
              <div
                key={item.result_id}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              >

                <div className="mb-5 flex items-center justify-between">
                  <h2 className="font-semibold text-slate-800">
                    Result #{item.result_id}
                  </h2>

                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    item.is_published
                      ? 'bg-green-50 text-green-700'
                      : 'bg-amber-50 text-amber-700'
                  }`}>
                    {item.is_published ? 'Published' : 'Pending'}
                  </span>
                </div>

                <div className="space-y-3 text-sm">

                  <div className="flex justify-between gap-3">
                    <span className="text-slate-500">Interview ID</span>
                    <span className="font-medium text-slate-800">
                      #{item.interview_id}
                    </span>
                  </div>

                  <div className="flex justify-between gap-3">
                    <span className="text-slate-500">Result</span>
                    <span className="font-semibold text-slate-800">
                      {item.result}
                    </span>
                  </div>

                  <div className="flex justify-between gap-3">
                    <span className="text-slate-500">Score</span>
                    <span className="font-medium text-slate-800">
                      {item.score ?? 'Not provided'}
                    </span>
                  </div>

                  {item.feedback && (
                    <div className="border-t border-slate-100 pt-3">
                      <p className="mb-1 text-slate-500">
                        Feedback
                      </p>

                      <p className="text-slate-700">
                        {item.feedback}
                      </p>
                    </div>
                  )}

                  <div className="border-t border-slate-100 pt-3">
                    <p className="text-slate-500">Created At</p>
                    <p className="mt-1 font-medium text-slate-800">
                      {new Date(item.created_at).toLocaleString('en-IN')}
                    </p>
                  </div>

                  {item.is_published && item.published_on && (
                    <div>
                      <p className="text-slate-500">Published On</p>
                      <p className="mt-1 font-medium text-slate-800">
                        {new Date(item.published_on).toLocaleString('en-IN')}
                      </p>
                    </div>
                  )}

                </div>

                <button
                  type="button"
                  disabled={item.is_published || publishingId === item.result_id}
                  onClick={() => handlePublish(item.result_id)}
                  className="mt-6 w-full rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {publishingId === item.result_id
                    ? 'Publishing...'
                    : item.is_published
                      ? 'Already Published'
                      : 'Publish Result'}
                </button>

              </div>
            ))}

          </div>
        )}

      </div>
    </div>
  );
};

export default PublishResult;
