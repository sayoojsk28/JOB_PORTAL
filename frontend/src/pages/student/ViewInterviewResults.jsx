
import { useEffect, useState } from 'react';
import api from '../../services/api';

function ViewInterviewResults() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const response = await api.get('/student/interview-results');
        setResults(response.data);
      } catch (err) {
        console.error('Error fetching interview results:', err);
        setError('Unable to load interview results.');
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, []);

  if (loading) {
    return <p className="p-6 text-center">Loading results...</p>;
  }

  if (error) {
    return <p className="p-6 text-center text-red-600">{error}</p>;
  }

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">
        Interview Results
      </h2>

      {results.length === 0 ? (
        <p className="text-center text-gray-500 py-10">
          No published results available.
        </p>
      ) : (
        <div className="overflow-x-auto bg-white rounded-lg shadow">
          <table className="min-w-full border-collapse">
            <thead className="bg-gray-100">
              <tr>
                {[
                  
                  'Interview Date',
                  'Interview Time',
                  'Mode',
                  'Result',
                  'Score',
                  'Feedback',
                  'Published On',
                ].map((heading) => (
                  <th
                    key={heading}
                    className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b whitespace-nowrap"
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {results.map((item) => (
                <tr
                  key={item.result_id}
                  className="hover:bg-gray-50"
                >
                  
                  <td className="px-4 py-3 border-b whitespace-nowrap">
                    {item.interview_date}
                  </td>
                  <td className="px-4 py-3 border-b whitespace-nowrap">
                    {item.interview_time}
                  </td>
                  <td className="px-4 py-3 border-b">{item.mode}</td>
                  <td className="px-4 py-3 border-b font-semibold">
                    {item.result}
                  </td>
                  <td className="px-4 py-3 border-b">
                    {item.score ?? '-'}
                  </td>
                  <td className="px-4 py-3 border-b">
                    {item.feedback || '-'}
                  </td>
                  <td className="px-4 py-3 border-b whitespace-nowrap">
                    {item.published_on
                      ? new Date(item.published_on).toLocaleString()
                      : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default ViewInterviewResults;
