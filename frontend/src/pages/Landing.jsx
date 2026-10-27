
import React from 'react';
import { Link } from 'react-router-dom';
import jobSearchImage from '../assets/jobSearch.png';

const Landing = () => {
  const features = [
    {
      number: '01',
      title: 'For Students',
      description:
        'Explore career opportunities and take the next step towards your professional future.',
      icon: 'graduation-cap',
      color: 'blue',
    },
    {
      number: '02',
      title: 'For Employers',
      description:
        'Connect with potential candidates and discover talent for your organisation.',
      icon: 'briefcase-business',
      color: 'indigo',
    },
    {
      number: '03',
      title: 'A Better Experience',
      description:
        'Access a dedicated portal designed to make career and recruitment activities easier.',
      icon: 'layers-3',
      color: 'violet',
    },
  ];

  return (
    <main className="overflow-hidden bg-white text-slate-900">

      
{/* HERO */}
<section className="relative isolate overflow-hidden bg-[#07152e] text-white">
  {/* Background effects */}
  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_75%_30%,rgba(37,99,235,0.32),transparent_48%)]" />
  <div className="pointer-events-none absolute -right-32 top-10 h-[500px] w-[500px] rounded-full border border-blue-300/10" />
  <div className="pointer-events-none absolute -right-16 top-24 h-[370px] w-[370px] rounded-full border border-blue-300/10" />
  <div className="pointer-events-none absolute bottom-0 left-0 h-px w-full bg-gradient-to-r from-transparent via-blue-400/40 to-transparent" />

  <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-5 py-20 sm:px-8 sm:py-24 lg:grid-cols-[1.1fr_0.9fr] lg:gap-10 lg:px-12 lg:py-28">

    {/* Hero copy */}
    <div className="max-w-2xl">
      <div className="inline-flex items-center gap-3 rounded-full border border-blue-300/20 bg-blue-400/10 px-4 py-2">
        <span className="h-2 w-2 rounded-full bg-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.9)]" />
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-100">
          Camerin Innovate
        </span>
      </div>

      <h1 className="mt-8 text-5xl font-bold leading-[1.2] tracking-tight sm:text-6xl lg:text-7xl">
        Where your
        <span className="block">next chapter</span>
        <span className="mt-2 block bg-gradient-to-r from-sky-300 via-blue-400 to-violet-400 bg-clip-text leading-[1.3] pb-1 text-transparent">
          begins.
        </span>
      </h1>

      <p className="mt-7 max-w-xl text-base leading-8 text-slate-300 sm:text-lg">
        A dedicated career portal connecting ambition with opportunity.
        Discover a platform built to support students and help employers
        find the talent they need.
      </p>

      {/* Job Portal button */}
      
    </div>

    {/* Hero Image */}
    <div className="relative mx-auto w-full max-w-xl">
      <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-blue-500/30 to-violet-500/30 blur-2xl" />

      <div className="relative overflow-hidden rounded-[2rem] border border-white/15 bg-white p-3 shadow-2xl sm:p-4">
        <img
          src={jobSearchImage}
          alt="Discover career opportunities"
          className="block h-auto w-full rounded-[1.5rem] object-contain"
        />
      </div>

      <div className="absolute -bottom-5 -left-3 rounded-2xl border border-white/15 bg-[#14294b] px-5 py-4 shadow-xl sm:-left-7">
        <p className="text-xs text-blue-200">Your next step</p>
        <p className="mt-1 font-semibold text-white">
          Starts here ✦
        </p>
      </div>
    </div>
  </div>

  
{/* Bottom transition */}
<div className="relative flex justify-center pb-8 -mt-3">
  <a
    href="#portals"
    className="group inline-flex items-center gap-3 rounded-full border border-white/15 bg-white/[0.06] px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:border-sky-400/50 hover:bg-white/10"
  >
    Explore the Portal
    <span className="transition group-hover:translate-y-1">↓</span>
  </a>
</div>

</section>


      {/* PORTAL SELECTION */}
      <section id="portals" className="scroll-mt-24 bg-white py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
          <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-blue-700">
                Choose your portal
              </p>
              <h2 className="mt-4 text-3xl font-bold leading-tight tracking-tight text-slate-900 sm:text-4xl">
                Your journey.
                <span className="block text-blue-700">Your starting point.</span>
              </h2>
            </div>

            <p className="max-w-xl text-base leading-8 text-slate-600 lg:justify-self-end">
              Select the portal that fits your role. Students and employers
              have dedicated spaces designed around their needs.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-2">
            {/* Student card */}
            <Link
              to="/login/student"
              className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-slate-50 p-7 transition duration-300 hover:-translate-y-1 hover:border-blue-300 hover:shadow-2xl hover:shadow-blue-900/10 sm:p-10"
            >
              <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-blue-100/70 transition duration-500 group-hover:scale-125" />

              <div className="relative flex items-start justify-between gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-700 text-white shadow-lg shadow-blue-700/20">
                  <svg
                    className="h-8 w-8"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="m2 10 10-5 10 5-10 5-10-5Z" />
                    <path d="M6 12v5c3.5 3 8.5 3 12 0v-5" />
                    <path d="M22 10v6" />
                  </svg>
                </div>
                <span className="rounded-full border border-blue-200 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-blue-700">
                  Student
                </span>
              </div>

              <div className="relative mt-9">
                <h3 className="text-2xl font-bold text-slate-900 sm:text-3xl">
                  Build your future.
                </h3>
                <p className="mt-4 max-w-md leading-7 text-slate-600">
                  Explore opportunities, discover your next career step, and
                  make progress towards your ambitions.
                </p>
              </div>

              <div className="relative mt-9 flex items-center justify-between border-t border-slate-200 pt-5">
                <span className="font-semibold text-blue-700">
                  Enter Student Portal
                </span>
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-700 text-xl text-white transition group-hover:translate-x-1">
                  →
                </span>
              </div>
            </Link>

            {/* Employee card */}
            <Link
              to="/login/employee"
              className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-slate-50 p-7 transition duration-300 hover:-translate-y-1 hover:border-indigo-300 hover:shadow-2xl hover:shadow-indigo-900/10 sm:p-10"
            >
              <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-indigo-100/70 transition duration-500 group-hover:scale-125" />

              <div className="relative flex items-start justify-between gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-700 text-white shadow-lg shadow-indigo-700/20">
                  <svg
                    className="h-8 w-8"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <rect x="3" y="7" width="18" height="13" rx="2" />
                    <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    <path d="M3 12h18M10 12v2h4v-2" />
                  </svg>
                </div>
                <span className="rounded-full border border-indigo-200 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-indigo-700">
                  Employee
                </span>
              </div>

              <div className="relative mt-9">
                <h3 className="text-2xl font-bold text-slate-900 sm:text-3xl">
                  Discover great talent.
                </h3>
                <p className="mt-4 max-w-md leading-7 text-slate-600">
                  Access your recruitment portal to connect with candidates
                  and support your organisation's hiring needs.
                </p>
              </div>

              <div className="relative mt-9 flex items-center justify-between border-t border-slate-200 pt-5">
                <span className="font-semibold text-indigo-700">
                  Enter Employee Portal
                </span>
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-indigo-700 text-xl text-white transition group-hover:translate-x-1">
                  →
                </span>
              </div>
            </Link>
          </div>
        </div>
      </section>

      
      
{/* FOOTER */}
<footer className="bg-[#07152e] text-white">
  <div className="mx-auto max-w-7xl border-t border-white/10 px-5 py-5 text-center sm:px-8">
    <p className="text-sm text-slate-400">
      © {new Date().getFullYear()} Camerin Innovate. All rights reserved.
    </p>
  </div>
</footer>

    </main>
  );
};

export default Landing;
