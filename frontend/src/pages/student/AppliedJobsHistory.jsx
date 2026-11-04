
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

const AppliedJobsHistory = () => {
  const navigate = useNavigate();

  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchApplications = async () => {
      try {
        const response = await api.get('/student/applications/history');
        setApplications(response.data);
      } catch (err) {
        setError(
          err.response?.data?.detail ||
          'Failed to load application history.'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchApplications();
  }, []);

  const formatDate = (date) => {
    if (!date) return '-';

    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const getStatusStyle = (status) => {
    switch (status?.toLowerCase()) {
      case 'selected':
      case 'accepted':
        return 'bg-green-100 text-green-700';

      case 'rejected':
        return 'bg-red-100 text-red-700';

      case 'pending':
        return 'bg-yellow-100 text-yellow-700';

      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">

        <button
          onClick={() => navigate('/student/dashboard')}
          className="mb-6 text-blue-600 hover:text-blue-800 font-medium"
        >
          ← Back to Dashboard
        </button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800">
            Applied Jobs History
          </h1>
          <p className="text-gray-500 mt-2">
            View all the jobs you have applied for.
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">
            Loading application history...
          </div>
        ) : error ? (
          <div className="bg-red-50 text-red-600 p-4 rounded-lg">
            {error}
          </div>
        ) : applications.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-10 text-center">
            <div className="text-5xl mb-4">📋</div>
            <h2 className="text-xl font-semibold text-gray-700">
              No Applications Yet
            </h2>
            <p className="text-gray-500 mt-2">
              Jobs you apply for will appear here.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-100 text-gray-600 text-sm">
                  <tr>
                    <th className="px-6 py-4">#</th>
                    <th className="px-6 py-4">Job Title</th>
                    <th className="px-6 py-4">Company</th>
                    <th className="px-6 py-4">Applied Date</th>
                    <th className="px-6 py-4">Status</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {applications.map((application, index) => (
                    <tr
                      key={application.application_id}
                      className="hover:bg-gray-50"
                    >
                      <td className="px-6 py-4 text-gray-500">
                        {index + 1}
                      </td>

                      <td className="px-6 py-4 font-medium text-gray-800">
                        {application.vacancy_title || '-'}
                      </td>

                      <td className="px-6 py-4 text-gray-600">
                        {application.company_name || '-'}
                      </td>

                      <td className="px-6 py-4 text-gray-600 whitespace-nowrap">
                        {formatDate(application.applied_at)}
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusStyle(application.status)}`}
                        >
                          {application.status}
                        </span>
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

export default AppliedJobsHistory;
