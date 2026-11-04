import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../../services/api';

const AdminStudentProfile = () => {
  const { studentId } = useParams();

  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchStudent = async () => {
      try {
        const response = await api.get(
          `/admin/students/${studentId}`
        );

        setStudent(response.data);
      } catch (error) {
        console.error('Failed to fetch student profile:', error);

        setError(
          error.response?.data?.detail ||
          'Failed to load student profile.'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchStudent();
  }, [studentId]);

  const getPhotoUrl = (photoPath) => {
    if (!photoPath) return null;

    return `http://127.0.0.1:8000/${photoPath.replace(/^\/+/, '')}`;
  };

  const formatDate = (date) => {
    if (!date) return 'Not provided';

    return new Date(`${date}T00:00:00`).toLocaleDateString(
      'en-IN',
      {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      }
    );
  };

  const InfoItem = ({ label, value }) => (
    <div className="rounded-xl bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
        {label}
      </p>

      <p className="mt-2 break-words text-sm font-semibold text-slate-800">
        {value || 'Not provided'}
      </p>
    </div>
  );

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 p-8 text-center">
        <p className="text-slate-500">Loading student profile...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-slate-50 p-8">
        <div className="mx-auto max-w-3xl rounded-2xl border border-red-200 bg-white p-8 text-center">
          <p className="font-medium text-red-600">{error}</p>

          <Link
            to="/admin/students"
            className="mt-5 inline-block font-semibold text-blue-600 hover:text-blue-800"
          >
            ← Back to Students
          </Link>
        </div>
      </main>
    );
  }

  if (!student) return null;

  const skills = student.skills
    ? student.skills.split(',').map((skill) => skill.trim()).filter(Boolean)
    : [];

  return (
    <main className="min-h-[calc(100vh-76px)] bg-slate-50 px-4 py-8 sm:px-8 sm:py-10">
      <div className="mx-auto max-w-5xl">

        {/* Back Navigation */}
        <div className="mb-6">
          <Link
            to="/admin/students"
            className="text-sm font-semibold text-blue-700 hover:text-blue-800"
          >
            ← Back to Students
          </Link>
        </div>

        {/* Profile Header */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="h-32 bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-600 sm:h-40" />

          <div className="px-6 pb-7 sm:px-8">
            <div className="-mt-14 flex flex-col gap-5 sm:-mt-16 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-end">
                <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-4 border-white bg-blue-50 shadow-md sm:h-32 sm:w-32">
                  {student.profile_photo ? (
                    <img
                      src={getPhotoUrl(student.profile_photo)}
                      alt={student.full_name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-4xl font-bold text-blue-700">
                      {student.full_name?.charAt(0)?.toUpperCase()}
                    </span>
                  )}
                </div>

                <div className="pb-5 sm:pb-2">
                  <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
                    {student.full_name}
                  </h1>

                  <p className="mt-1 text-sm text-slate-500">
                    {student.qualification} · {student.department}
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    Student ID: #{student.id}
                  </p>
                </div>
              </div>

              <span
                className={`inline-flex w-fit items-center rounded-full px-4 py-2 text-xs font-bold ${
                  student.status === 'Active'
                    ? 'bg-emerald-100 text-emerald-700'
                    : student.status === 'Rejected'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-amber-100 text-amber-700'
                }`}
              >
                {student.status}
              </span>
            </div>
          </div>
        </section>

        {/* Personal Information */}
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-slate-900">
              Personal Information
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Student's personal and contact details.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <InfoItem label="Email Address" value={student.email} />
            <InfoItem label="Phone Number" value={student.phone} />

            <InfoItem
              label="Date of Birth"
              value={formatDate(student.date_of_birth)}
            />

            <InfoItem label="Gender" value={student.gender} />

            <div className="sm:col-span-2">
              <InfoItem label="Address" value={student.address} />
            </div>
          </div>
        </section>

        {/* Academic Information */}
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-slate-900">
              Academic Information
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Educational background and academic details.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <InfoItem
              label="Qualification"
              value={student.qualification}
            />

            <InfoItem
              label="Department / Specialization"
              value={student.department}
            />

            <InfoItem
              label="Year of Passing"
              value={student.year_of_passing}
            />
          </div>
        </section>

        {/* Skills */}
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-5">
            <h2 className="text-lg font-bold text-slate-900">
              Skills & Expertise
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Skills provided by the student during registration.
            </p>
          </div>

          {skills.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {skills.map((skill, index) => (
                <span
                  key={`${skill}-${index}`}
                  className="rounded-full border border-blue-100 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700"
                >
                  {skill}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400">
              No skills provided.
            </p>
          )}
        </section>

        <p className="mt-6 text-center text-xs text-slate-400">
          Student Profile · Job Portal
        </p>

      </div>
    </main>
  );
};

export default AdminStudentProfile;