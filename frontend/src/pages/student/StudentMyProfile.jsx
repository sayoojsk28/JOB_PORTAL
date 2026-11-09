
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

const sections = [
  { id: 1, icon: '📁' },
  { id: 2, icon: '📄' },
  { id: 3, icon: '🎯' },
  { id: 4, icon: '🤖' },
];

export default function StudentMyProfile() {
  const navigate = useNavigate();

  const [student, setStudent] = useState(null);
  const [activeSection, setActiveSection] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingPlaced, setSavingPlaced] = useState(false);
  const [placedError, setPlacedError] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await api.get('/student/my-profile');
        setStudent(response.data);
      } catch (err) {
        setError(
          err.response?.data?.detail || 'Unable to load your profile.'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);
const handlePlacedToggle = async () => {
  if (savingPlaced || !student) return;

  const newStatus = !student.is_placed;

  setSavingPlaced(true);
  setPlacedError('');

  try {
    const response = await api.patch(
      '/student/my-profile/placed',
      null,
      {
        params: {
          is_placed: newStatus,
        },
      }
    );

    setStudent((prev) => ({
      ...prev,
      is_placed: response.data.is_placed,
    }));
  } catch (err) {
    setPlacedError(
      err.response?.data?.detail || 'Unable to update Placed status.'
    );
  } finally {
    setSavingPlaced(false);
  }
};
  const photoUrl = student?.profile_photo
    ? `http://127.0.0.1:8000/${student.profile_photo.replace(/^\/+/, '')}`
    : null;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-slate-500">Loading your profile...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-5">
        <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
          <p className="font-semibold text-red-600">{error}</p>
          <button
            onClick={() => navigate('/student/dashboard')}
            className="mt-5 rounded-lg bg-blue-600 px-5 py-2 text-white"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-50">
      <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8">

        {/* Back button */}
        <button
          onClick={() => navigate('/student/dashboard')}
          className="mb-6 flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-blue-700"
        >
          ← Back to Dashboard
        </button>

        {/* Profile header */}
        <section className="overflow-hidden rounded-3xl bg-white shadow-sm">
          <div className="h-32 bg-gradient-to-r from-blue-700 to-indigo-700 sm:h-40" />

          <div className="-mt-12 flex flex-col items-center gap-4 px-6 pb-7 sm:-mt-14 sm:flex-row sm:items-end">
            {photoUrl ? (
              <img
                src={photoUrl}
                alt={student.full_name}
                className="h-28 w-28 rounded-2xl border-4 border-white bg-white object-cover shadow-md"
              />
            ) : (
              <div className="flex h-28 w-28 items-center justify-center rounded-2xl border-4 border-white bg-blue-100 text-4xl font-bold text-blue-700 shadow-md">
                {student.full_name?.charAt(0)?.toUpperCase() || 'S'}
              </div>
            )}

            <div className="pb-1 text-center sm:pb-2 sm:text-left">
              <h1 className="text-2xl font-bold text-slate-800">
                {student.full_name}
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Student Profile
              </p>
            </div>
          </div>
        </section>
        
{/* Placed Status */}
<section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
  <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">

    <div>
      <h2 className="text-lg font-bold text-slate-800">
        Placement Status
      </h2>

      <p className="mt-1 text-sm text-slate-500">
        Update your placement status if you have been placed.
      </p>

      <div className="mt-3 flex items-center gap-2">
        <span
          className={`h-2.5 w-2.5 rounded-full ${
            student.is_placed ? 'bg-green-500' : 'bg-slate-400'
          }`}
        />

        <span className="text-sm font-semibold text-slate-700">
          {student.is_placed ? 'Placed' : 'Not Placed'}
        </span>
      </div>
    </div>

    <button
      type="button"
      onClick={handlePlacedToggle}
      disabled={savingPlaced}
      className={`rounded-xl px-6 py-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${
        student.is_placed
          ? 'bg-slate-600 hover:bg-slate-700'
          : 'bg-blue-600 hover:bg-blue-700'
      }`}
    >
      {savingPlaced
        ? 'Updating...'
        : student.is_placed
          ? 'Mark as Not Placed'
          : 'Mark as Placed'}
    </button>

  </div>

  {placedError && (
    <p className="mt-4 text-sm font-medium text-red-600">
      {placedError}
    </p>
  )}
</section>


        {/* Selectable sections */}
        <section className="mt-8">
          <div className="mb-5">
            <h2 className="text-xl font-bold text-slate-800">
              Your Sections
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Select a section to explore.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`rounded-2xl border p-5 text-left transition duration-200 hover:-translate-y-1 hover:shadow-md ${
                  activeSection === section.id
                    ? 'border-blue-500 bg-blue-50 shadow-sm'
                    : 'border-slate-200 bg-white'
                }`}
              >
                <span className="text-3xl">{section.icon}</span>

                <h3 className="mt-4 font-bold text-slate-800">
                  Section {section.id}
                </h3>

                <p className="mt-1 text-xs text-slate-500">
                  Select to open
                </p>
              </button>
            ))}
          </div>
        </section>

        {/* Selected section content */}
        <section className="mt-6 min-h-64 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-xl">
              {sections[activeSection - 1].icon}
            </div>

            <h2 className="text-xl font-bold text-slate-800">
              Section {activeSection}
            </h2>
          </div>

          <div className="mt-8 flex min-h-32 flex-col items-center justify-center text-center">
            <p className="text-slate-500">
              Section {activeSection} content will be added here.
            </p>
          </div>
        </section>

        <footer className="mt-10 pb-4 text-center text-sm text-slate-400">
          Job Portal · Student Workspace
        </footer>
      </main>
    </div>
  );
}
