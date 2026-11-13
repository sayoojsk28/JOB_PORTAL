
import { useEffect, useState } from 'react';
import api from '../../services/api';
import { useNavigate } from 'react-router-dom';

function ViewAcceptedCompanies() {
  const navigate = useNavigate();

  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [page, setPage] = useState(1);
  const [totalCompanies, setTotalCompanies] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  useEffect(() => {
    const fetchAcceptedCompanies = async () => {
      try {
        setLoading(true);
        setError('');

        const response = await api.get('/companies', {
          params: {
            page,
            limit: 10,
            status: 'accepted',
          },
        });

        setCompanies(response.data.companies);
        setTotalCompanies(response.data.total_companies);
        setTotalPages(response.data.total_pages);

      } catch (err) {
        console.error('Failed to load accepted companies:', err);

        setError(
          err.response?.data?.detail ||
          'Failed to load accepted companies.'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchAcceptedCompanies();
  }, [page]);

  if (loading) {
    return (
      <div className="p-6 text-center">
        Loading companies...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center text-red-600">
        {error}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-6xl">

        <h1 className="mb-6 text-2xl font-bold text-gray-800">
          Accepted Companies
        </h1>

        {companies.length === 0 ? (
          <p className="rounded-lg bg-white p-6 text-center text-gray-500 shadow">
            No accepted companies available.
          </p>
        ) : (
          <>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {companies.map((company) => (
                <div
                  key={company.id}
                  className="rounded-xl bg-white p-6 shadow-md"
                >
                  {company.logo && (
                    <img
                      src={`http://127.0.0.1:8000${company.logo}`}
                      alt={company.name}
                      className="mb-4 h-20 w-20 rounded-lg border object-contain"
                    />
                  )}

                  <h2 className="mb-3 text-xl font-semibold text-gray-800">
                    {company.name}
                  </h2>

                  <div className="space-y-2 text-sm text-gray-600">
                    <p>
                      <strong>Email:</strong> {company.email}
                    </p>

                    <p>
                      <strong>Phone:</strong> {company.contact_number}
                    </p>

                    {company.website && (
                      <p>
                        <strong>Website:</strong>{' '}
                        <a
                          href={
                            /^https?:\/\//i.test(company.website)
                              ? company.website
                              : `https://${company.website}`
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="break-all text-blue-600 hover:underline"
                        >
                          {company.website}
                        </a>
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() =>
                      navigate(`/employee/companies/${company.id}/vacancies/create`)
                    }
                    className="mt-5 w-full rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
                  >
                    Post Vacancy
                  </button>

                  <button
                    onClick={() =>
                      navigate(`/employee/companies/${company.id}/edit`)
                    }
                    className="mt-3 w-full rounded-lg bg-blue-800 px-4 py-2 font-medium text-white hover:bg-blue-800"
                  >
                    Edit Details
                  </button>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-8 flex flex-col items-center justify-between gap-4 sm:flex-row">

                <p className="text-sm text-gray-500">
                  Showing {(page - 1) * 10 + 1}–
                  {Math.min(page * 10, totalCompanies)} of{' '}
                  {totalCompanies} companies
                </p>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((previous) => previous - 1)}
                    disabled={page === 1}
                    className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Previous
                  </button>

                  <span className="px-3 text-sm font-semibold text-gray-700">
                    Page {page} of {totalPages}
                  </span>

                  <button
                    type="button"
                    onClick={() => setPage((previous) => previous + 1)}
                    disabled={page === totalPages}
                    className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
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

export default ViewAcceptedCompanies;
