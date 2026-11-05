
import { useEffect, useState } from 'react';
import api from '../../services/api';

const PublishResult = () => {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [publishingId, setPublishingId] = useState(null);
  const [search, setSearch] = useState('');

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

  const filteredResults = results.filter((item) => {
    const searchText = search.toLowerCase().trim();

    return (
      String(item.result_id).includes(searchText) ||
      String(item.interview_id).includes(searchText) ||
      String(item.result || '').toLowerCase().includes(searchText) ||
      String(item.score ?? '').toLowerCase().includes(searchText) ||
      String(item.feedback || '').toLowerCase().includes(searchText) ||
      (item.is_published ? 'published' : 'pending').includes(searchText)
    );
  });

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-slate-500">Loading results...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-7xl">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-800">
            Interview Results
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            View and publish interview results for students.
          </p>
        </div>

        {/* Search */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

          <div className="w-full sm:max-w-md">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by result ID, interview ID, result, feedback..."
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <p className="text-sm text-slate-500">
            {filteredResults.length} of {results.length} results
          </p>

        </div>

        {/* Results Table */}
        {filteredResults.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white px-6 py-12 text-center">
            <h2 className="text-lg font-semibold text-slate-700">
              {results.length === 0
                ? 'No Results Found'
                : 'No Matching Results'}
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              {results.length === 0
                ? 'You have not posted any interview results yet.'
                : 'Try searching with a different keyword.'}
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left">

                <thead className="bg-slate-100">
                  <tr>
                    <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-600">
                      Result ID
                    </th>

                    <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-600">
                      Interview ID
                    </th>

                    <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-600">
                      Result
                    </th>

                    <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-600">
                      Score
                    </th>

                    <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-600">
                      Feedback
                    </th>

                    <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-600">
                      Created At
                    </th>

                    <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-600">
                      Status
                    </th>

                    <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-600">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredResults.map((item) => (
                    <tr
                      key={item.result_id}
                      className="transition hover:bg-slate-50"
                    >
                      <td className="whitespace-nowrap px-5 py-4 text-sm font-medium text-slate-700">
                        #{item.result_id}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
                        #{item.interview_id}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-sm font-semibold text-slate-800">
                        {item.result}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
                        {item.score ?? 'Not provided'}
                      </td>

                      <td className="max-w-xs px-5 py-4 text-sm text-slate-600">
                        <p className="line-clamp-2">
                          {item.feedback || '—'}
                        </p>
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-500">
                        {item.created_at
                          ? new Date(item.created_at).toLocaleString('en-IN')
                          : '—'}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            item.is_published
                              ? 'bg-green-50 text-green-700'
                              : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          {item.is_published ? 'Published' : 'Pending'}
                        </span>

                        {item.is_published && item.published_on && (
                          <p className="mt-2 text-xs text-slate-500">
                            {new Date(item.published_on).toLocaleString('en-IN')}
                          </p>
                        )}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4">
                        <button
                          type="button"
                          disabled={
                            item.is_published ||
                            publishingId === item.result_id
                          }
                          onClick={() => handlePublish(item.result_id)}
                          className="rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                        >
                          {publishingId === item.result_id
                            ? 'Publishing...'
                            : item.is_published
                              ? 'Published'
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
};

export default PublishResult;
