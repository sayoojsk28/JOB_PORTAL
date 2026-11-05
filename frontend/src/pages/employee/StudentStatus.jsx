
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';

const StudentStatus = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState('');

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const response = await api.get(
          '/employee/students/status-history'
        );

        setStudents(response.data);
      } catch (error) {
        console.error('Failed to fetch student status history:', error);

        setError(
          error.response?.data?.detail ||
          'Failed to load student status history.'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, []);

  const openStatusConfirm = (student, newStatus) => {
    if (student.status === newStatus) return;

    setSelectedStudent(student);
    setSelectedStatus(newStatus);
    setShowConfirmDialog(true);
  };

  const confirmStatusUpdate = async () => {
    if (!selectedStudent || !selectedStatus) return;

    try {
      await api.patch(
        `/employee/students/${selectedStudent.id}/status`,
        {
          status: selectedStatus,
        }
      );

      setStudents((currentStudents) =>
        currentStudents.map((student) =>
          student.id === selectedStudent.id
            ? { ...student, status: selectedStatus }
            : student
        )
      );

      setShowConfirmDialog(false);
      setSelectedStudent(null);
      setSelectedStatus('');
    } catch (error) {
      console.error('Failed to update student status:', error);

      setError(
        error.response?.data?.detail ||
        'Failed to update student status.'
      );

      setShowConfirmDialog(false);
      setSelectedStudent(null);
      setSelectedStatus('');
    }
  };

  const closeConfirmDialog = () => {
    setShowConfirmDialog(false);
    setSelectedStudent(null);
    setSelectedStatus('');
  };

  const filteredStudents = students.filter((student) => {
    const searchText = search.toLowerCase().trim();

    return (
      String(student.id).includes(searchText) ||
      String(student.full_name || '').toLowerCase().includes(searchText) ||
      String(student.email || '').toLowerCase().includes(searchText) ||
      String(student.phone || '').toLowerCase().includes(searchText) ||
      String(student.qualification || '').toLowerCase().includes(searchText) ||
      String(student.department || '').toLowerCase().includes(searchText) ||
      String(student.year_of_passing || '').toLowerCase().includes(searchText) ||
      String(student.status || '').toLowerCase().includes(searchText)
    );
  });

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 p-8 text-center">
        <p className="text-slate-500">
          Loading student history...
        </p>
      </main>
    );
  }

  if (error && !students.length) {
    return (
      <main className="min-h-screen bg-slate-50 p-8 text-center">
        <p className="text-red-600">{error}</p>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-76px)] bg-slate-50 px-4 py-8 sm:px-8 sm:py-10">
      <div className="mx-auto max-w-7xl">

        {/* Header */}
        <div className="mb-8">
          <Link
            to="/employee/dashboard"
            className="text-sm font-semibold text-blue-700 hover:text-blue-800"
          >
            ← Back to Dashboard
          </Link>

          <h1 className="mt-4 text-2xl font-bold text-slate-900 sm:text-3xl">
            Student Status History
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            View student approval history and manage their current account status.
          </p>
        </div>

        {/* Search */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, phone, department, status..."
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:max-w-md"
          />

          <p className="text-sm text-slate-500">
            {filteredStudents.length} of {students.length} students
          </p>
        </div>

        {error && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Students Table */}
        {filteredStudents.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white px-6 py-12 text-center">
            <p className="text-lg font-semibold text-slate-700">
              {students.length === 0
                ? 'No Student Status History Found'
                : 'No Matching Students Found'}
            </p>

            <p className="mt-2 text-sm text-slate-500">
              {students.length === 0
                ? 'Student status records will appear here.'
                : 'Try searching with a different keyword.'}
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left">

                <thead className="bg-slate-100">
                  <tr>
                    <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-600">
                      Student ID
                    </th>

                    <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-600">
                      Name
                    </th>

                    <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-600">
                      Email
                    </th>

                    <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-600">
                      Phone
                    </th>

                    <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-600">
                      Qualification
                    </th>

                    <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-600">
                      Department
                    </th>

                    <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-600">
                      Passing Year
                    </th>

                    <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-600">
                      Status
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredStudents.map((student) => (
                    <tr
                      key={student.id}
                      className="transition hover:bg-slate-50"
                    >
                      <td className="whitespace-nowrap px-5 py-4 text-sm font-medium text-slate-700">
                        #{student.id}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-sm font-semibold text-slate-800">
                        {student.full_name}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
                        {student.email}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
                        {student.phone || '—'}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
                        {student.qualification || '—'}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
                        {student.department || '—'}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
                        {student.year_of_passing || '—'}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4">
                        <select
                          value={student.status}
                          onChange={(e) =>
                            openStatusConfirm(student, e.target.value)
                          }
                          className={`rounded-lg border px-3 py-2 text-sm font-semibold outline-none ${
                            student.status === 'Active'
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                              : 'border-red-200 bg-red-50 text-red-700'
                          }`}
                        >
                          <option value="Active">Active</option>
                          <option value="Rejected">Rejected</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>

              </table>
            </div>
          </div>
        )}

      </div>

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/50 px-4 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl sm:p-8"
          >
            <div
              className={`mb-5 flex h-12 w-12 items-center justify-center rounded-xl ${
                selectedStatus === 'Active'
                  ? 'bg-emerald-50 text-emerald-600'
                  : 'bg-red-50 text-red-600'
              }`}
            >
              <span className="text-2xl">
                {selectedStatus === 'Active' ? '✓' : '✕'}
              </span>
            </div>

            <h2 className="text-xl font-bold text-slate-900">
              Confirm Status Change?
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Are you sure you want to change{' '}
              <span className="font-semibold text-slate-700">
                {selectedStudent?.full_name}
              </span>
              's status from{' '}
              <span className="font-semibold">
                {selectedStudent?.status}
              </span>{' '}
              to{' '}
              <span className="font-semibold">
                {selectedStatus}
              </span>?
            </p>

            <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeConfirmDialog}
                className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Cancel
              </button>

              <button
                onClick={confirmStatusUpdate}
                type="button"
                className={`rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition ${
                  selectedStatus === 'Active'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                Yes, Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

export default StudentStatus;
