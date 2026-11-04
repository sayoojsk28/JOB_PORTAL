import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';

const ViewStudents = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);

  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const limit = 10;

  useEffect(() => {
    const fetchStudents = async () => {
      setLoading(true);
      setError('');

      try {
        const response = await api.get('/admin/students/active', {
          params: {
            page,
            limit,
            search: searchTerm,
          },
        });

        setStudents(response.data.students);
        setTotal(response.data.total);
        setTotalPages(response.data.total_pages);

        // Handle a page that becomes invalid after search
        if (response.data.page !== page) {
          setPage(response.data.page);
        }
      } catch (error) {
        console.error('Failed to fetch students:', error);
        setError(
          error.response?.data?.detail || 'Failed to load students.'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, [page, searchTerm]);

  const handleSearch = (value) => {
    setSearchTerm(value);
    setPage(1);
  };

  const handlePrevious = () => {
    if (page > 1) {
      setPage((prev) => prev - 1);
    }
  };

  const handleNext = () => {
    if (page < totalPages) {
      setPage((prev) => prev + 1);
    }
  };

  const startIndex = total === 0 ? 0 : (page - 1) * limit + 1;
  const endIndex = Math.min(page * limit, total);

  return (
    <main className="min-h-[calc(100vh-76px)] bg-slate-50 px-4 py-8 sm:px-8 sm:py-10">
      <div className="mx-auto max-w-7xl">

        {/* Page Heading */}
        <div className="mb-8">
          <Link
            to="/admin/dashboard"
            className="text-sm font-semibold text-blue-700 hover:text-blue-800"
          >
            ← Back to Dashboard
          </Link>

          <h1 className="mt-4 text-2xl font-bold text-slate-900 sm:text-3xl">
            Active Students
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            View students approved by employees.
          </p>
        </div>

        {/* Search Bar */}
        <div className="mb-5">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search by name, email, phone or department..."
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:max-w-md"
          />
        </div>

        {/* Student Count */}
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-slate-600">
            Total active students: <span className="font-semibold text-slate-900">{total}</span>
          </p>

          <p className="text-xs text-slate-500">
            {total > 0 ? `Showing ${startIndex}-${endIndex} of ${total}` : 'No students'}
          </p>
        </div>

        {/* Students Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[1000px] text-left text-sm">
            <thead className="bg-slate-100 text-slate-600">
              <tr>
                <th className="px-5 py-4">ID</th>
                <th className="px-5 py-4">Student Name</th>
                <th className="px-5 py-4">Email</th>
                <th className="px-5 py-4">Phone</th>
                <th className="px-5 py-4">Qualification</th>
                <th className="px-5 py-4">Department</th>
                <th className="px-5 py-4">Passing Year</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="9" className="py-10 text-center text-slate-500">
                    Loading students...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan="9" className="py-10 text-center text-red-600">
                    {error}
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-10 text-center text-slate-500">
                    No active students found.
                  </td>
                </tr>
              ) : (
                students.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-50">
                    <td className="px-5 py-4">{student.id}</td>

                    <td className="px-5 py-4 font-medium text-slate-900">
                      {student.full_name}
                    </td>

                    <td className="px-5 py-4">{student.email}</td>

                    <td className="px-5 py-4">{student.phone}</td>

                    <td className="px-5 py-4">{student.qualification}</td>

                    <td className="px-5 py-4">{student.department}</td>

                    <td className="px-5 py-4">{student.year_of_passing}</td>

                    <td className="px-5 py-4">
                      <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                        {student.status}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <Link
                        to={`/admin/students/${student.id}`}
                        className="font-semibold text-blue-600 hover:text-blue-800"
                      >
                        View Profile
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && !error && totalPages > 0 && (
          <div className="mt-6 flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p className="text-sm text-slate-500">
              Page {page} of {totalPages}
            </p>

            <div className="flex gap-3">
              <button
                onClick={handlePrevious}
                disabled={page === 1}
                className="rounded-lg border border-slate-300 bg-white px-5 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Previous
              </button>

              <button
                onClick={handleNext}
                disabled={page === totalPages}
                className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}

      </div>
    </main>
  );
};

export default ViewStudents;