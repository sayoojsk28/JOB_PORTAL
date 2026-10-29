
import { useEffect, useState } from 'react';
import api from '../../services/api';
import { Link } from 'react-router-dom';

function ViewCompanies() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const handleStatusChange = async (company, newStatus) => {
  console.log("Selected status:", newStatus);
  console.log("Company ID:", company.id);
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

        {/* Page heading */}
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
                Explore and manage registered company profiles.
              </p>
            </div>

            <div className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.8}
                  stroke="currentColor"
                  className="h-5 w-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 21h18M5 21V7l8-4v18m6 0V11l-6-4M9 9v.01M9 12v.01M9 15v.01M9 18v.01M15 13v.01M15 16v.01M15 19v.01"
                  />
                </svg>
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

        {/* Empty state */}
        {companies.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="h-8 w-8 text-slate-400"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 21h18M5 21V7l8-4v18m6 0V11l-6-4"
                />
              </svg>
            </div>

            <h2 className="text-lg font-semibold text-slate-800">
              No companies yet
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Registered companies will appear here.
            </p>
          </div>
        ) : (
          /* Company profile cards */
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {companies.map((company) => (
              <article
                key={company.id}
                className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition duration-200 hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl hover:shadow-slate-200/60"
              >
                {/* Card accent */}
                <div className="h-1.5 bg-gradient-to-r from-blue-700 via-blue-500 to-cyan-400" />

                <div className="p-5 sm:p-6">

                  {/* Logo and company name */}
                  <div className="flex items-start gap-4">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-100 bg-slate-50">
                      {company.logo ? (
                        <img
                          src={`http://127.0.0.1:8000${company.logo}`}
                          alt={`${company.name} logo`}
                          className="h-full w-full object-contain p-1.5"
                        />
                      ) : (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={1.5}
                          stroke="currentColor"
                          className="h-8 w-8 text-slate-400"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M3 21h18M5 21V7l8-4v18m6 0V11l-6-4"
                          />
                        </svg>
                      )}
                    </div>

                    <div className="min-w-0 flex-1 pt-1">
                      <h2 className="break-words text-lg font-bold text-slate-900 transition group-hover:text-blue-700">
                        {company.name}
                      </h2>

                      <p className="mt-1 text-sm font-medium text-blue-700">
                        {company.industry}
                      </p>

                      {company.size && (
                        <p className="mt-2 text-xs text-slate-500">
                          {company.size}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Company information */}
                  <div className="mt-6 space-y-4 border-t border-slate-100 pt-5">

                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-500">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={1.7}
                          stroke="currentColor"
                          className="h-5 w-5"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M19.5 10.5c0 7.142-7.5 11-7.5 11s-7.5-3.858-7.5-11a7.5 7.5 0 1 1 15 0Z"
                          />
                        </svg>
                      </span>

                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                          Location
                        </p>
                        <p className="mt-1 break-words text-sm leading-5 text-slate-700">
                          {company.address || 'Not provided'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-500">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={1.7}
                          stroke="currentColor"
                          className="h-5 w-5"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="m3 7 9 6 9-6M5 19h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2Z"
                          />
                        </svg>
                      </span>

                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                          Email
                        </p>
                        <a
                          href={`mailto:${company.email}`}
                          className="mt-1 block break-all text-sm text-slate-700 transition hover:text-blue-700"
                        >
                          {company.email}
                        </a>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-500">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={1.7}
                          stroke="currentColor"
                          className="h-5 w-5"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372a1.125 1.125 0 0 0-.852-1.093l-4.423-1.106a1.125 1.125 0 0 0-1.173.417l-.97 1.293a1.125 1.125 0 0 1-1.21.39 12.035 12.035 0 0 1-7.126-7.126 1.125 1.125 0 0 1 .39-1.21l1.293-.97a1.125 1.125 0 0 0 .417-1.173L6.99 3.122a1.125 1.125 0 0 0-1.093-.852H4.5A2.25 2.25 0 0 0 2.25 4.52v2.23Z"
                          />
                        </svg>
                      </span>

                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                          Contact number
                        </p>
                        <a
                          href={`tel:${company.contact_number}`}
                          className="mt-1 block break-words text-sm text-slate-700 transition hover:text-blue-700"
                        >
                          {company.contact_number}
                        </a>
                      </div>
                    </div>

                    {company.website && (
                      <div className="flex items-start gap-3">
                        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-500">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={1.7}
                            stroke="currentColor"
                            className="h-5 w-5"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M3 12h18M12 3a15 15 0 0 1 0 18m0-18a15 15 0 0 0 0 18"
                            />
                          </svg>
                        </span>

                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                            Website
                          </p>
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
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  {company.description && (
                    <div className="mt-5 border-t border-slate-100 pt-4">
                      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">
                        About company
                      </p>
                      <p className="whitespace-pre-line text-sm leading-6 text-slate-600">
                        {company.description}
                      </p>
                    </div>
                  )}
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
<div className="mt-3">
  <Link
    to={`/employee/companies/${company.id}/vacancies/create`}
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
    Post Vacancies
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
