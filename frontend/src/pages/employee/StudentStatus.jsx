
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';

const StudentStatus = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
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

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 p-8 text-center">
        <p className="text-slate-500">
          Loading student history...
        </p>
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

        {students.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white py-12 text-center shadow-sm">
            <p className="text-slate-500">
              No student status history found.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {students.map((student) => (
              <div
                key={student.id}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">
                      {student.full_name}
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      {student.qualification}
                    </p>
                  </div>

                  <select
                    value={student.status}
                    onChange={(e) =>
                      openStatusConfirm(student, e.target.value)
                    }
                    className={`rounded-xl border px-3 py-2 text-sm font-semibold outline-none ${
                      student.status === 'Active'
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        : 'border-red-200 bg-red-50 text-red-700'
                    }`}
                  >
                    <option value="Active">Active</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>

                <div className="mt-5 space-y-3 border-t border-slate-100 pt-4 text-sm">
                  <p className="text-slate-600">
                    <span className="font-semibold text-slate-800">
                      Student ID:
                    </span>{' '}
                    {student.id}
                  </p>

                  <p className="text-slate-600">
                    <span className="font-semibold text-slate-800">
                      Email:
                    </span>{' '}
                    {student.email}
                  </p>

                  <p className="text-slate-600">
                    <span className="font-semibold text-slate-800">
                      Phone:
                    </span>{' '}
                    {student.phone}
                  </p>

                  <p className="text-slate-600">
                    <span className="font-semibold text-slate-800">
                      Department:
                    </span>{' '}
                    {student.department}
                  </p>

                  <p className="text-slate-600">
                    <span className="font-semibold text-slate-800">
                      Passing Year:
                    </span>{' '}
                    {student.year_of_passing}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

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
