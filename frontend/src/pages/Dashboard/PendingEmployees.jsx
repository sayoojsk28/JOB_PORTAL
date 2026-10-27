
import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';

const PendingEmployees = () => {
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchEmployees = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await api.get('/admin/employees/pending');
      setEmployees(
        Array.isArray(response.data) ? response.data : []
      );
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(
        typeof detail === 'string'
          ? detail
          : 'Unable to load employees. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const filteredEmployees = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return employees;

    return employees.filter((employee) =>
      [
        employee.full_name,
        employee.email,
        employee.phone,
        employee.designation,
        employee.id,
      ].some((value) =>
        String(value ?? '').toLowerCase().includes(query)
      )
    );
  }, [employees, search]);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-7xl">

        <Link
          to="/admin/dashboard"
          className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 transition hover:text-blue-900"
        >
          <span aria-hidden="true">←</span>
          Back to Dashboard
        </Link>

        <section className="mt-6 rounded-2xl bg-gradient-to-r from-blue-950 via-blue-800 to-blue-600 p-6 text-white shadow-lg sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-200">
            Camerin Innovate
          </p>

          <h1 className="mt-3 text-2xl font-bold sm:text-3xl">
            Employee Verification
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-100">
            Review registered employee accounts and manage verification requests.
          </p>

          <div className="mt-6 inline-flex items-center gap-3 rounded-xl border border-white/20 bg-white/10 px-4 py-3">
            <span className="text-2xl font-bold">
              {loading ? '—' : employees.length}
            </span>
            <span className="text-sm text-blue-100">
              Employees awaiting review
            </span>
          </div>
        </section>

        <section className="mt-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Employee List
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Search employee details to find an account.
              </p>
            </div>

            <div className="w-full sm:max-w-sm">
              <label
                htmlFor="employee-search"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Search employees
              </label>

              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  ⌕
                </span>

                <input
                  id="employee-search"
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Name, email, phone or designation"
                  className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-9 pr-4 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
              </div>
            </div>
          </div>

          {loading && (
            <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-12 text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-blue-100 border-t-blue-700" />
              <p className="mt-4 text-sm text-slate-500">
                Loading employee details...
              </p>
            </div>
          )}

          {!loading && error && (
            <div className="mt-6 rounded-2xl border border-red-200 bg-white p-6">
              <p className="font-semibold text-red-700">
                Could not load employees
              </p>
              <p className="mt-2 text-sm text-slate-600">{error}</p>

              <button
                type="button"
                onClick={fetchEmployees}
                className="mt-4 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
              >
                Try Again
              </button>
            </div>
          )}

          {!loading && !error && filteredEmployees.length === 0 && (
            <div className="mt-6 rounded-2xl border border-slate-200 bg-white px-6 py-14 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-2xl text-blue-700">
                {search ? '⌕' : '✓'}
              </div>

              <h3 className="mt-4 text-lg font-bold text-slate-900">
                {search
                  ? 'No matching employees'
                  : 'No employees awaiting review'}
              </h3>

              <p className="mt-2 text-sm text-slate-500">
                {search
                  ? 'Try a different name, email, phone number or designation.'
                  : 'There are currently no employee accounts to review.'}
              </p>
            </div>
          )}

          {!loading && !error && filteredEmployees.length > 0 && (
            <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
              {filteredEmployees.map((employee) => (
                <article
                  key={employee.id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-200 hover:shadow-md sm:p-6"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-lg font-bold text-blue-800">
                      {(employee.full_name || 'E')
                        .trim()
                        .charAt(0)
                        .toUpperCase()}
                    </div>

                    <div className="min-w-0 flex-1">
                      <h3 className="break-words font-bold text-slate-900">
                        {employee.full_name || 'Name not provided'}
                      </h3>
                      <p className="mt-1 break-all text-sm text-slate-500">
                        {employee.email || 'No email provided'}
                      </p>
                      <p className="mt-2 text-xs text-slate-400">
                        Employee ID: {employee.id}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-1 gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-2">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                        Designation
                      </p>
                      <p className="mt-1 break-words text-sm font-medium text-slate-700">
                        {employee.designation || 'Not provided'}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                        Phone
                      </p>
                      <p className="mt-1 break-words text-sm font-medium text-slate-700">
                        {employee.phone || 'Not provided'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 flex gap-3 border-t border-slate-100 pt-4">
                    <button
                      type="button"
                      disabled
                      title="Approval endpoint is not implemented yet"
                      className="flex-1 cursor-not-allowed rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white opacity-50"
                    >
                      ✓ Approve
                    </button>

                    <button
                      type="button"
                      disabled
                      title="Rejection endpoint is not implemented yet"
                      className="flex-1 cursor-not-allowed rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white opacity-50"
                    >
                      ✕ Reject
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}

          {!loading && !error && filteredEmployees.length > 0 && (
            <p className="mt-5 text-center text-xs text-slate-400">
              Showing {filteredEmployees.length} of {employees.length} employees
            </p>
          )}

          <p className="mt-6 text-center text-xs text-slate-400">
            Camerin Innovate · Administration Portal
          </p>
        </section>
      </div>
    </main>
  );
};

export default PendingEmployees;
