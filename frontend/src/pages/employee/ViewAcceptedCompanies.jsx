
import { useEffect, useState } from 'react';
import api from '../../services/api';
import { useNavigate } from 'react-router-dom';

function ViewAcceptedCompanies() {
    const navigate = useNavigate();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchAcceptedCompanies = async () => {
      try {
        const response = await api.get('/companies');

        const accepted = response.data.filter(
          (company) => company.is_active === 'accepted'
        );

        setCompanies(accepted);
      } catch (err) {
        setError('Failed to load accepted companies.');
      } finally {
        setLoading(false);
      }
    };

    fetchAcceptedCompanies();
  }, []);

  if (loading) {
    return <div className="p-6 text-center">Loading companies...</div>;
  }

  if (error) {
    return <div className="p-6 text-center text-red-600">{error}</div>;
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
              </div>
              
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default ViewAcceptedCompanies;
