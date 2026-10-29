
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const dashboardCards = [
  {
    title: 'Jobs & Applications',
    description: 'Explore job opportunities and apply for suitable positions.',
    icon: '💼',
  },
  {
    title: 'Confirmed Interviews',
    description: 'View your scheduled interviews, dates and meeting links.',
    icon: '📅',
  },
  {
    title: 'Applied Jobs History',
    description: 'Keep track of the jobs you have applied for.',
    icon: '📋',
  },
  {
    title: 'Interview History & Results',
    description: 'Review completed interviews and published results.',
    icon: '🏆',
  },
  {
    title: 'My Profile & Resume',
    description: 'Manage your personal details, profile photo and resume.',
    icon: '👤',
  },
  {
    title: 'Reset Password',
    description: 'Change your account password securely.',
    icon: '🔐',
  },
  {
    title: 'Job Portal AI Assistant',
    description: 'Get help and answers about using the job portal.',
    icon: '🤖',
	path: '/student/chatbot',
  },
  {
    title: 'Feedback to Admin',
    description: 'Share your suggestions, feedback or concerns.',
    icon: '💬',
  },
];

export default function StudentDashboard() {
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-50">
      <header className="border-b border-slate-200 bg-white/90">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
          <div>
            <h1 className="text-xl font-bold text-blue-700 sm:text-2xl">
              Job Portal
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Student Dashboard
            </p>
          </div>

          <div className="relative flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative rounded-xl border border-slate-200 p-3 text-slate-600 transition hover:bg-blue-50"
              aria-label="Notifications"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
                <path d="M10 21h4" />
              </svg>
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-blue-600" />
            </button>

            <button
              type="button"
              onClick={() => navigate('/profile')}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 font-bold text-white shadow-sm"
              aria-label="My profile"
              title="My profile"
            >
              S
            </button>

            {showNotifications && (
              <div className="absolute right-0 top-14 z-10 w-72 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
                <h3 className="font-semibold text-slate-800">
                  Notifications
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  You will see interview updates and application notifications
                  here when this feature is connected.
                </p>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-10">
        <section className="mb-8 rounded-3xl bg-gradient-to-r from-blue-700 to-indigo-700 p-6 text-white shadow-lg sm:p-8">
          <p className="text-sm font-medium text-blue-100">
            Welcome to your dashboard
          </p>
          <h2 className="mt-2 text-2xl font-bold sm:text-3xl">
            Your career journey starts here!
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100 sm:text-base">
            Manage your profile, keep track of your applications and prepare
            for upcoming opportunities — all in one place.
          </p>
        </section>

        <div className="mb-6">
          <h2 className="text-xl font-bold text-slate-800">
            Your Workspace
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Everything you need, organized in one place.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {dashboardCards.map((card) => (
            
<article
  key={card.title}
  onClick={() => {
    if (card.path) navigate(card.path);
  }}
  onKeyDown={(event) => {
    if (card.path && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      navigate(card.path);
    }
  }}
  role={card.path ? 'link' : undefined}
  tabIndex={card.path ? 0 : undefined}
  className={`group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg ${
    card.path ? 'cursor-pointer' : ''
  }`}
>

              <div className="flex items-start justify-between gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-2xl">
                  {card.icon}
                </div>

                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
  {card.path ? 'Available' : 'Coming Soon'}
</span>
              </div>

              <h3 className="mt-5 text-lg font-bold text-slate-800">
                {card.title}
              </h3>

              <p className="mt-2 min-h-12 text-sm leading-6 text-slate-500">
                {card.description}
              </p>

              <div className="mt-5 border-t border-slate-100 pt-4">
                <span className="text-sm font-semibold text-blue-600">
  {card.path ? 'Open Assistant →' : 'Under Development'}
</span>
              </div>
            </article>
          ))}
        </div>

        <footer className="mt-10 pb-4 text-center text-sm text-slate-400">
          Job Portal · Student Workspace
        </footer>
      </main>
    </div>
  );
}
