
import React from 'react';
import { useNavigate } from 'react-router-dom';

const adminOptions = [
  {
    title: 'View Employees',
    description: 'View and manage registered employee accounts.',
    icon: 'users',
    color: 'blue',
    path: '/admin/employees',
    status: 'Coming soon',
  },
  {
    title: 'Pending Employees',
    description: 'Review employee accounts awaiting verification.',
    icon: 'user-check',
    color: 'amber',
    path: '/admin/employees/pending',
    status: 'Available',
  },
  {
    title: 'View Students',
    description: 'Explore registered students and their information.',
    icon: 'graduation-cap',
    color: 'emerald',
    path: '/admin/students',
    status: 'Coming soon',
  },
  {
    title: 'Change Password',
    description: 'Update your admin account password securely.',
    icon: 'key-round',
    color: 'violet',
    path: '/admin/change-password',
    status: 'Coming soon',
  },
  {
    title: 'Employee Status',
    description: 'Look up an employee and check their current status.',
    icon: 'badge-check',
    color: 'cyan',
    path: '/admin/employee-status',
    status: 'Available',
  },
  {
    title: 'Block / Unblock Employees',
    description: 'Manage access for verified employee accounts.',
    icon: 'shield-check',
    color: 'rose',
    path: '/admin/manage-employees',
    status: 'Coming soon',
  },
  {
    title: 'Student Profiles & Verification',
    description:
      'Review student profiles, verify resumes and view interview history.',
    icon: 'file-check',
    color: 'indigo',
    path: '/admin/student-verification',
    status: 'Coming soon',
  },
];

const colorStyles = {
  blue: {
    icon: 'bg-blue-50 text-blue-700',
    hover: 'hover:border-blue-300',
    arrow: 'text-blue-700',
  },
  amber: {
    icon: 'bg-amber-50 text-amber-700',
    hover: 'hover:border-amber-300',
    arrow: 'text-amber-700',
  },
  emerald: {
    icon: 'bg-emerald-50 text-emerald-700',
    hover: 'hover:border-emerald-300',
    arrow: 'text-emerald-700',
  },
  violet: {
    icon: 'bg-violet-50 text-violet-700',
    hover: 'hover:border-violet-300',
    arrow: 'text-violet-700',
  },
  cyan: {
    icon: 'bg-cyan-50 text-cyan-700',
    hover: 'hover:border-cyan-300',
    arrow: 'text-cyan-700',
  },
  rose: {
    icon: 'bg-rose-50 text-rose-700',
    hover: 'hover:border-rose-300',
    arrow: 'text-rose-700',
  },
  indigo: {
    icon: 'bg-indigo-50 text-indigo-700',
    hover: 'hover:border-indigo-300',
    arrow: 'text-indigo-700',
  },
};

const icons = {
  users: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="10" cy="7" r="4" />
      <path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
  'user-check': (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="10" cy="7" r="4" />
      <path d="m16 11 2 2 4-4" />
    </>
  ),
  'graduation-cap': (
    <>
      <path d="m22 10-10-5L2 10l10 5 10-5Z" />
      <path d="M6 12v5c3 3 9 3 12 0v-5M22 10v6" />
    </>
  ),
  'key-round': (
    <>
      <circle cx="8" cy="15" r="5" />
      <path d="m21 2-9.6 9.6M15.5 7.5l3 3L22 7l-3-3" />
    </>
  ),
  'badge-check': (
    <>
      <path d="M12 3 15 5l4-.2.2 4L21 12l-1.8 3.2-.2 4-4-.2L12 21l-3-2-4 .2-.2-4L3 12l1.8-3.2.2-4 4 .2 3-2Z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  'shield-check': (
    <>
      <path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  'file-check': (
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
      <path d="M14 2v6h6m-11 5 2 2 4-4" />
    </>
  ),
};

const AdminDashboard = () => {
  const navigate = useNavigate();

  return (
    <main className="min-h-[calc(100vh-76px)] bg-slate-50 px-4 py-8 sm:px-8 sm:py-10">
      <div className="mx-auto max-w-7xl">
        {/* Dashboard heading */}
        <div className="mb-8 rounded-2xl bg-gradient-to-r from-blue-950 via-blue-800 to-blue-600 p-6 text-white shadow-lg sm:p-9">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-200 sm:text-sm">
            Camerin Innovate
          </p>

          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Admin Dashboard
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100 sm:text-base">
            Manage employees, students, verification requests and account
            access from one place.
          </p>

          <div className="mt-6 flex items-center gap-2 text-sm text-blue-100">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            Administration Portal
          </div>
        </div>

        {/* Section heading */}
        <div className="mb-5">
          <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">
            Management Options
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Select an option to manage the portal.
          </p>
        </div>

        {/* Feature cards */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {adminOptions.map((option) => {
            const styles = colorStyles[option.color];

            return (
              <button
                key={option.title}
                type="button"
                onClick={() => {
                  if (option.status === 'Available') {
                    navigate(option.path);
                  }
                }}
                disabled={option.status !== 'Available'}
                className={`group flex min-h-[220px] flex-col rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition duration-200 sm:p-6 ${
                  option.status === 'Available'
                    ? `cursor-pointer hover:-translate-y-1 hover:shadow-lg ${styles.hover}`
                    : 'cursor-not-allowed opacity-80'
                }`}
              >
                <div className="flex w-full items-start justify-between gap-3">
                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${styles.icon}`}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-6 w-6"
                      aria-hidden="true"
                    >
                      {icons[option.icon]}
                    </svg>
                  </div>

                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                      option.status === 'Available'
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {option.status}
                  </span>
                </div>

                <h3 className="mt-5 text-base font-bold leading-6 text-slate-900">
                  {option.title}
                </h3>

                <p className="mt-2 flex-1 text-sm leading-6 text-slate-500">
                  {option.description}
                </p>

                <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                  <span className="text-sm font-semibold text-slate-700">
                    {option.status === 'Available'
                      ? 'Open section'
                      : 'Coming soon'}
                  </span>

                  <span
                    className={`text-xl transition-transform ${
                      option.status === 'Available'
                        ? `group-hover:translate-x-1 ${styles.arrow}`
                        : 'text-slate-300'
                    }`}
                    aria-hidden="true"
                  >
                    →
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        <p className="mt-8 text-center text-xs text-slate-400">
          Camerin Innovate · Administration Portal
        </p>
      </div>
    </main>
  );
};

export default AdminDashboard;
