
import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';

const PendingStudents = () => {
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState('');

  const fetchStudents = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await api.get('/employee/students/pending');

      setStudents(
        Array.isArray(response.data) ? response.data : []
      );
    } catch (err) {
      const detail = err.response?.data?.detail;

      setError(
        typeof detail === 'string'
          ? detail
          : 'Unable to load students. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const filteredStudents = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return students;

    return students.filter((student) =>
      [
        student.full_name,
        student.email,
        student.phone,
        student.qualification,
        student.department,
        student.id,
      ].some((value) =>
        String(value ?? '').toLowerCase().includes(query)
      )
    );
  }, [students, search]);

  const handleStatusUpdate = async (studentId, status) => {
    try {
      await api.patch(`/employee/students/${studentId}/status`, {
        status: status,
      });

      setStudents((currentStudents) =>
        currentStudents.filter((student) => student.id !== studentId)
      );
    } catch (err) {
      console.error('Failed to update student status:', err);

      const detail = err.response?.data?.detail;

      setError(
        typeof detail === 'string'
          ? detail
          : 'Failed to update student status.'
      );
    }
  };

  const openConfirmDialog = (student, status) => {
    setSelectedStudent(student);
    setSelectedStatus(status);
    setShowConfirmDialog(true);
  };

  const confirmStatusUpdate = async () => {
    if (!selectedStudent || !selectedStatus) return;

    await handleStatusUpdate(selectedStudent.id, selectedStatus);

    setShowConfirmDialog(false);
    setSelectedStudent(null);
    setSelectedStatus('');
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-7xl">

        <Link
          to="/employee/dashboard"
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
            Student Verification
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-100">
            Review registered student accounts and manage approval requests.
          </p>

          <div className="mt-6 inline-flex items-center gap-3 rounded-xl border border-white/20 bg-white/10 px-4 py-3">
            <span className="text-2xl font-bold">
              {loading ? '—' : students.length}
            </span>

            <span className="text-sm text-blue-100">
              Students awaiting review
            </span>
          </div>
        </section>

        <section className="mt-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Student List
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Search student details to find an account.
              </p>
            </div>

            <div className="w-full sm:max-w-sm">
              <label
                htmlFor="student-search"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Search students
              </label>

              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  ⌕
                </span>

                <input
                  id="student-search"
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Name, email, phone or department"
                  className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-9 pr-4 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
              </div>
            </div>
          </div>

          {loading && (
            <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-12 text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-blue-100 border-t-blue-700" />

              <p className="mt-4 text-sm text-slate-500">
                Loading student details...
              </p>
            </div>
          )}

          {!loading && error && (
            <div className="mt-6 rounded-2xl border border-red-200 bg-white p-6">
              <p className="font-semibold text-red-700">
                Could not load students
              </p>

              <p className="mt-2 text-sm text-slate-600">
                {error}
              </p>

              <button
                type="button"
                onClick={fetchStudents}
                className="mt-4 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
              >
                Try Again
              </button>
            </div>
          )}

          {!loading && !error && filteredStudents.length === 0 && (
            <div className="mt-6 rounded-2xl border border-slate-200 bg-white px-6 py-14 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-2xl text-blue-700">
                {search ? '⌕' : '✓'}
              </div>

              <h3 className="mt-4 text-lg font-bold text-slate-900">
                {search
                  ? 'No matching students'
                  : 'No students awaiting review'}
              </h3>

              <p className="mt-2 text-sm text-slate-500">
                {search
                  ? 'Try a different name, email, phone number or department.'
                  : 'There are currently no student accounts to review.'}
              </p>
            </div>
          )}

          {!loading && !error && filteredStudents.length > 0 && (
            <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
              {filteredStudents.map((student) => (
                <article
                  key={student.id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-200 hover:shadow-md sm:p-6"
                >
                  <div className="flex items-start gap-4">

                    <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-blue-100 bg-blue-50">
  {student.profile_photo ? (
    <img
      src={`http://127.0.0.1:8000/${student.profile_photo.replace(/^\/+/, '')}`}
      alt={`${student.full_name || 'Student'} profile`}
      className="h-full w-full object-cover"
      onError={(e) => {
        console.error('Student photo failed to load:', e.currentTarget.src);
        e.currentTarget.style.display = 'none';
      }}
    />
  ) : (
    <span className="text-xl font-bold text-blue-700">
      {student.full_name?.charAt(0)?.toUpperCase() || 'S'}
    </span>
  )}
</div>

                    <div className="min-w-0 flex-1">
                      <h3 className="break-words font-bold text-slate-900">
                        {student.full_name || 'Name not provided'}
                      </h3>

                      <p className="mt-1 break-all text-sm text-slate-500">
                        {student.email || 'No email provided'}
                      </p>

                      <p className="mt-2 text-xs text-slate-400">
                        Student ID: {student.id}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-1 gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-2">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                        Qualification
                      </p>

                      <p className="mt-1 break-words text-sm font-medium text-slate-700">
                        {student.qualification || 'Not provided'}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                        Department
                      </p>

                      <p className="mt-1 break-words text-sm font-medium text-slate-700">
                        {student.department || 'Not provided'}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                        Phone
                      </p>

                      <p className="mt-1 break-words text-sm font-medium text-slate-700">
                        {student.phone || 'Not provided'}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                        Year of Passing
                      </p>

                      <p className="mt-1 break-words text-sm font-medium text-slate-700">
                        {student.year_of_passing || 'Not provided'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 border-t border-slate-100 pt-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                      Skills
                    </p>

                    <p className="mt-1 break-words text-sm text-slate-700">
                      {student.skills || 'Not provided'}
                    </p>
                  </div>

                  <div className="mt-5 flex gap-3 border-t border-slate-100 pt-4">
                    <button
                      type="button"
                      onClick={() => openConfirmDialog(student, 'Active')}
                      className="flex-1 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
                    >
                      ✓ Accept
                    </button>

                    <button
                      type="button"
                      onClick={() => openConfirmDialog(student, 'Rejected')}
                      className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700"
                    >
                      ✕ Reject
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}

          {!loading && !error && filteredStudents.length > 0 && (
            <p className="mt-5 text-center text-xs text-slate-400">
              Showing {filteredStudents.length} of {students.length} students
            </p>
          )}

          <p className="mt-6 text-center text-xs text-slate-400">
            Camerin Innovate · Employee Portal
          </p>
        </section>
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
              {selectedStatus === 'Active'
                ? 'Accept Student?'
                : 'Reject Student?'}
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Are you sure you want to{' '}
              {selectedStatus === 'Active' ? 'accept' : 'reject'}{' '}
              <span className="font-semibold text-slate-700">
                {selectedStudent?.full_name}
              </span>
              ?
            </p>

            <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowConfirmDialog(false);
                  setSelectedStudent(null);
                  setSelectedStatus('');
                }}
                className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={confirmStatusUpdate}
                className={`rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition ${
                  selectedStatus === 'Active'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                Yes, {selectedStatus === 'Active' ? 'Accept' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

export default PendingStudents;
