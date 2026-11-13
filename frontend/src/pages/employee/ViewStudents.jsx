
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';

const ViewStudents = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const [page, setPage] = useState(1);
  const [totalStudents, setTotalStudents] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        setLoading(true);
        setError('');

        const response = await api.get('/employee/students/active', {
          params: {
            page,
            limit: 20,
            search: searchTerm,
          },
        });

        setStudents(response.data.students);
        setTotalStudents(response.data.total_students);
        setTotalPages(response.data.total_pages);

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

  const startIndex = totalStudents === 0
    ? 0
    : (page - 1) * 20 + 1;

  const endIndex = Math.min(page * 20, totalStudents);

  if (loading && students.length === 0) {
    return (
      <main className="min-h-screen bg-slate-50 p-8 text-center">
        <p className="text-slate-500">Loading students...</p>
      </main>
    );
  }

  if (error && students.length === 0) {
    return (
      <main className="min-h-screen bg-slate-50 p-8 text-center">
        <p className="text-red-600">{error}</p>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-76px)] bg-slate-50 px-4 py-8 sm:px-8 sm:py-10">
      <div className="mx-auto max-w-7xl">

        <div className="mb-8">
          <Link
            to="/employee/dashboard"
            className="text-sm font-semibold text-blue-700 hover:text-blue-800"
          >
            ← Back to Dashboard
          </Link>

          <h1 className="mt-4 text-2xl font-bold text-slate-900 sm:text-3xl">
            Active Students
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            View students approved by you.
          </p>
        </div>

        <div className="mb-5">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search by name, email, phone or department..."
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:max-w-md"
          />
        </div>

        {error && (
          <p className="mb-4 text-sm text-red-600">{error}</p>
        )}

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
              {students.map((student) => (
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
                      to={`/employee/students/${student.id}`}
                      className="font-semibold text-blue-600 hover:text-blue-800"
                    >
                      View Profile
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {loading && students.length > 0 && (
            <p className="py-4 text-center text-sm text-slate-500">
              Loading students...
            </p>
          )}

          {!loading && students.length === 0 && (
            <p className="py-10 text-center text-slate-500">
              No active students found.
            </p>
          )}
        </div>

        {totalStudents > 0 && (
          <div className="mt-5 flex flex-col items-center justify-between gap-4 sm:flex-row">

            <p className="text-sm text-slate-500">
              Showing {startIndex}–{endIndex} of {totalStudents} students
            </p>

            {totalPages > 1 && (
              <div className="flex items-center gap-3">

                <button
                  onClick={() => setPage((prev) => prev - 1)}
                  disabled={page === 1 || loading}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Previous
                </button>

                <span className="text-sm font-medium text-slate-600">
                  Page {page} of {totalPages}
                </span>

                <button
                  onClick={() => setPage((prev) => prev + 1)}
                  disabled={page === totalPages || loading}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                </button>

              </div>
            )}

          </div>
        )}

      </div>
    </main>
  );
};

export default ViewStudents;
