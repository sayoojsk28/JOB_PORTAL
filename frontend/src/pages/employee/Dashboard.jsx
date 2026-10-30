
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const dashboardCards = [
  {
    title: 'Add Company Details and Vacancies',
    description: 'Register new company details and manage company vacancy postings.',
    icon: '🏢',
    path: '/employee/companies/create',
  },
  {
    title: 'View Company Details and Status',
    description: 'View registered companies and check their approval status.',
    icon: '📋',
    path: '/employee/companies',
  },
  {
    title: 'View Current Vacancies',
    description: 'Manage and view all currently posted job vacancies.',
    icon: '💼',
    path: '/employee/vacancies',
  },
  {
    title: 'View Applications',
    description: 'Review student applications and access uploaded resumes.',
    icon: '📨',
    path: '/employee/applications',
  },
  {
    title: 'Interview History and Give Results',
    description: 'View scheduled interviews and manage interview details.',
    icon: '📅',
    path: '/employee/interviews',
  },
  {
    title: 'Publish Results',
    description: 'Enter, review and publish interview results to students.',
    icon: '🏆',
    path: '/employee/interview-results',
  },
  {
    title: 'Reset Password',
    description: 'Change your account password securely.',
    icon: '🔐',
  },
  {
    title: 'Announcements from Admin',
    description: 'View important announcements and updates from the admin.',
    icon: '📢',
  },
  {
    title: 'Give Announcement to Students',
    description: 'Share important announcements and information with students.',
    icon: '📣',
  },
];

function Dashboard() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-50">

      <main className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-10">

        <section className="mb-8 rounded-3xl bg-gradient-to-r from-blue-700 to-indigo-700 p-6 text-white shadow-lg sm:p-8">
          <p className="text-sm font-medium text-blue-100">
            Welcome to your dashboard
          </p>

          <h2 className="mt-2 text-2xl font-bold sm:text-3xl">
            Manage Your Recruitment Activities!
          </h2>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100 sm:text-base">
            Manage companies, post vacancies, review student applications,
            schedule interviews and publish results — all in one place.
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
                if (
                  card.path &&
                  (event.key === 'Enter' || event.key === ' ')
                ) {
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
                  {card.path ? 'Open Section →' : 'Under Development'}
                </span>

              </div>

            </article>

          ))}

        </div>

        <footer className="mt-10 pb-4 text-center text-sm text-slate-400">
          Job Portal · Employee Workspace
        </footer>

      </main>
    </div>
  );
}

export default Dashboard;
