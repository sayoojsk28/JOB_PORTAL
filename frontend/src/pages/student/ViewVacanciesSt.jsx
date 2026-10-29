
import { useEffect, useState } from 'react';
import api from '../../services/api';
import { useNavigate } from 'react-router-dom';


function ViewVacanciesSt() {
  const navigate = useNavigate();
  const [vacancies, setVacancies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchVacancies = async () => {
      try {
        const response = await api.get('/student/vacancies')
        setVacancies(response.data);
      } catch (err) {
        setError(
          err.response?.data?.detail ||
            'Failed to load vacancies.'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchVacancies();
  }, []);

  const filteredVacancies = vacancies.filter((vacancy) => {
    const searchText = search.toLowerCase();

    return [
      vacancy.title,
      vacancy.location,
      vacancy.required_skills,
      vacancy.qualification,
      vacancy.employment_type,
    ].some((value) =>
      String(value || '').toLowerCase().includes(searchText)
    );
  });

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-sm font-medium text-slate-500">
          Loading vacancies...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-600">
          {typeof error === 'string'
            ? error
            : JSON.stringify(error)}
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
            Career Opportunities
          </p>

          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                View Vacancies
              </h1>

              <p className="mt-2 text-slate-500">
                Explore job opportunities and find your next career move.
              </p>
            </div>

            <div className="inline-flex w-fit items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
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
                    d="M20 7h-9m9 0-3-3m3 3-3 3M4 17h9m-9 0 3-3m-3 3 3 3"
                  />
                </svg>
              </span>

              <div>
                <p className="text-xs text-slate-500">
                  Available vacancies
                </p>
                <p className="text-xl font-bold text-slate-900">
                  {vacancies.length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Search bar */}
        <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <label
            htmlFor="vacancy-search"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Search opportunities
          </label>

          <div className="relative">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.8}
              stroke="currentColor"
              className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
            >
              <circle cx="10.5" cy="10.5" r="6.5" />
              <path
                strokeLinecap="round"
                d="m15.5 15.5 5 5"
              />
            </svg>

            <input
              id="vacancy-search"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by job title, location, skills..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-12 pr-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </div>

        {/* Empty state */}
        {vacancies.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="h-8 w-8"
              >
                <rect
                  x="3"
                  y="7"
                  width="18"
                  height="14"
                  rx="2"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18"
                />
              </svg>
            </div>

            <h2 className="text-lg font-semibold text-slate-800">
              No vacancies available yet
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              New job opportunities will appear here when companies post them.
            </p>
          </div>
        ) : filteredVacancies.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center">
            <h2 className="text-lg font-semibold text-slate-800">
              No matching vacancies
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Try another job title, skill, or location.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">
                Job opportunities
              </h2>

              <p className="text-sm text-slate-500">
                {filteredVacancies.length} result(s)
              </p>
            </div>

            {/* Job cards */}
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              {filteredVacancies.map((vacancy) => (
                <article
                  key={vacancy.id}
                  className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition duration-200 hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl hover:shadow-slate-200/60"
                >
                  <div className="h-1.5 bg-gradient-to-r from-blue-700 via-blue-500 to-cyan-400" />

                  <div className="p-5 sm:p-6">

                    {/* Job title and status */}
                    <div className="flex items-start gap-4">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-blue-700">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={1.6}
                          stroke="currentColor"
                          className="h-7 w-7"
                        >
                          <rect
                            x="3"
                            y="7"
                            width="18"
                            height="14"
                            rx="2"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18"
                          />
                        </svg>
                      </div>

                      <div className="min-w-0 flex-1">
                        <h3 className="break-words text-lg font-bold text-slate-900 transition group-hover:text-blue-700">
                          {vacancy.title}
                        </h3>

                        <p className="mt-1 text-sm text-slate-500">
                          Company #{vacancy.company_id}
                        </p>

                        <span className="mt-2 inline-flex rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                          {vacancy.status || 'Open'}
                        </span>
                      </div>
                    </div>

                    {/* Job highlights */}
                    <div className="mt-5 flex flex-wrap gap-2">
                      <span className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
                        📍 {vacancy.location || 'Location not specified'}
                      </span>

                      <span className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
                        {vacancy.employment_type || 'Employment type not specified'}
                      </span>

                      <span className="rounded-lg bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700">
                        {vacancy.salary_range || 'Salary not specified'}
                      </span>
                    </div>

                    {/* Description
                    <div className="mt-5 border-t border-slate-100 pt-4">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                        About the role
                      </p>

                      <p className="whitespace-pre-line text-sm leading-6 text-slate-600">
                        {vacancy.description || 'No description provided.'}
                      </p>
                    </div> */}

                    {/* Skills */}
                    {vacancy.required_skills && (
                      <div className="mt-4">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                          Required skills
                        </p>

                        <div className="flex flex-wrap gap-2">
                          {vacancy.required_skills
                            .split(',')
                            .map((skill) => skill.trim())
                            .filter(Boolean)
                            .map((skill, index) => (
                              <span
                                key={`${skill}-${index}`}
                                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700"
                              >
                                {skill}
                              </span>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* Qualification and openings */}
                    <div className="mt-5 grid grid-cols-1 gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                          Qualification
                        </p>
                        <p className="mt-1 text-sm leading-5 text-slate-700">
                          {vacancy.qualification || 'Not specified'}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                          Openings
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-700">
                          {vacancy.openings}
                        </p>
                      </div>
                    </div>

                    {/* <div className="mt-5 border-t border-slate-100 pt-4">
                      <p className="text-xs text-slate-400">
                        Vacancy ID: {vacancy.id}
                      </p>
                    </div> */}
                    <div className="mt-5 border-t border-slate-100 pt-4">
  <p className="mb-3 text-xs text-slate-400">
    Vacancy ID: {vacancy.id}
  </p>

  <button
    type="button"
    onClick={() =>
      navigate(`/student/upload-resume/${vacancy.id}`)
    }
    className="w-full rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
  >
    Apply Now →
  </button>
</div>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default ViewVacanciesSt;
