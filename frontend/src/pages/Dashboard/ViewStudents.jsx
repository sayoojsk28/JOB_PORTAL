import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';

const ViewStudents = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const response = await api.get('/admin/students/active');
        setStudents(response.data);
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
  }, []);

  const filteredStudents = students.filter((student) => {
  const search = searchTerm.toLowerCase();

  return (
    student.full_name?.toLowerCase().includes(search) ||
    student.email?.toLowerCase().includes(search) ||
    student.phone?.toLowerCase().includes(search) ||
    student.department?.toLowerCase().includes(search)
  );
});
  
  if (loading) {
  return (
    <main className="min-h-screen bg-slate-50 p-8 text-center">
      <p className="text-slate-500">Loading students...</p>
    </main>
  );
}

if (error) {
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
            to="/admin"
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
      </div>
      <div className="mb-5">
  <input
    type="text"
    value={searchTerm}
    onChange={(e) => setSearchTerm(e.target.value)}
    placeholder="Search by name, email, phone or department..."
    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:max-w-md"
  />
</div>
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
      {filteredStudents.map((student) => (
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
              to="#"
              className="font-semibold text-blue-600 hover:text-blue-800"
            >
              View Profile
            </Link>
          </td>
        </tr>
      ))}
    </tbody>
  </table>

  {filteredStudents.length === 0 && (
    <p className="py-10 text-center text-slate-500">
      No active students found.
    </p>
  )}
</div>
    </main>
  );
};

export default ViewStudents;