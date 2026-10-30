
import { useEffect, useState } from 'react';
import api from '../../services/api';
import { Link } from 'react-router-dom';

function ViewCompanies() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const handleStatusChange = async (company, newStatus) => {
    if (company.is_active === newStatus) return;

    try {
      await api.patch(
        `/companies/${company.id}/status`,
        { status: newStatus }
      );

      setCompanies((previous) =>
        previous.map((item) =>
          item.id === company.id
            ? { ...item, is_active: newStatus }
            : item
        )
      );

      alert('Status changed successfully!');
    } catch (err) {
      alert(
        err.response?.data?.detail ||
        'Failed to update company status.'
      );
    }
  };

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const response = await api.get('/companies');
        setCompanies(response.data);
      } catch (err) {
        setError(
          err.response?.data?.detail ||
          'Failed to load companies.'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchCompanies();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-sm font-medium text-slate-500">
          Loading companies...
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
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">

        <div className="mb-8">
          <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-blue-700">
            Company Directory
          </p>

          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                View Companies
              </h1>
              <p className="mt-2 text-slate-500">
                View registered company profiles and manage their status.
              </p>
            </div>

            <div className="inline-flex w-fit items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-xl">
                🏢
              </span>
              <div>
                <p className="text-xs text-slate-500">
                  Total companies
                </p>
                <p className="text-xl font-bold text-slate-900">
                  {companies.length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {companies.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
            <div className="mb-4 text-4xl">🏢</div>
            <h2 className="text-lg font-semibold text-slate-800">
              No companies yet
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Registered companies will appear here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {companies.map((company) => (
              <article
                key={company.id}
                className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition duration-200 hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl"
              >
                <div className="h-1.5 bg-gradient-to-r from-blue-700 via-blue-500 to-cyan-400" />

                <div className="p-5 sm:p-6">

                  {/* Company Logo and Name */}
                  <div className="flex items-center gap-4">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-100 bg-slate-50">
                      {company.logo ? (
                        <img
                          src={`http://127.0.0.1:8000${company.logo}`}
                          alt={`${company.name} logo`}
                          className="h-full w-full object-contain p-1.5"
                        />
                      ) : (
                        <span className="text-3xl">🏢</span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <h2 className="break-words text-lg font-bold text-slate-900 group-hover:text-blue-700">
                        {company.name}
                      </h2>
                    </div>
                  </div>

                  {/* Email */}
                  <div className="mt-6 border-t border-slate-100 pt-5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Email
                    </p>
                    <a
                      href={`mailto:${company.email}`}
                      className="mt-1 block break-all text-sm text-slate-700 hover:text-blue-700"
                    >
                      {company.email}
                    </a>
                  </div>

                  {/* Phone */}
                  <div className="mt-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Contact Number
                    </p>
                    <a
                      href={`tel:${company.contact_number}`}
                      className="mt-1 block text-sm text-slate-700 hover:text-blue-700"
                    >
                      {company.contact_number}
                    </a>
                  </div>

                  {/* Website */}
                  <div className="mt-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Website
                    </p>

                    {company.website ? (
                      <a
                        href={
                          /^https?:\/\//i.test(company.website)
                            ? company.website
                            : `https://${company.website}`
                        }
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 block break-all text-sm text-blue-700 hover:underline"
                      >
                        {company.website}
                      </a>
                    ) : (
                      <p className="mt-1 text-sm text-slate-400">
                        Not provided
                      </p>
                    )}
                  </div>

                  {/* Company Status */}
                  <div className="mt-5 border-t border-slate-100 pt-4">
                    <label
                      htmlFor={`status-${company.id}`}
                      className="mb-2 block text-sm font-semibold text-slate-700"
                    >
                      Company Status
                    </label>

                    <select
                      id={`status-${company.id}`}
                      value={company.is_active || 'waiting'}
                      onChange={(e) =>
                        handleStatusChange(company, e.target.value)
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
                    >
                      <option value="waiting">Waiting</option>
                      <option value="accepted">Accepted</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>

                  {/* View Accepted Companies Button */}
                  <div className="mt-3">
                    <Link
                      to="/employee/accepted-companies"
                      aria-disabled={company.is_active !== 'accepted'}
                      onClick={(e) => {
                        if (company.is_active !== 'accepted') {
                          e.preventDefault();
                        }
                      }}
                      className={`block w-full rounded-xl px-4 py-3 text-center text-sm font-semibold transition ${
                        company.is_active === 'accepted'
                          ? 'bg-blue-700 text-white hover:bg-blue-800'
                          : 'cursor-not-allowed bg-slate-100 text-slate-400'
                      }`}
                    >
                      View Accepted Companies
                    </Link>
                  </div>

                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default ViewCompanies;
