
import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';


const roleConfig = {
  student: {
    title: 'Welcome back, Student',
    subtitle: 'Discover opportunities that match your ambitions.',
    endpoint: '/auth/student/login',
    dashboard: '/student/dashboard',
    register: '/register/student',
    icon: '🎓',
    branding: {
      badge: 'Your next chapter starts here',
      heading: ['Great careers', 'begin with', 'great opportunities.'],
      description:
        'Connect your ambitions with the right opportunities. Take the next step towards a future you are excited about.',
      modules: [
        {
          title: 'Find your path',
          description: 'Explore career options',
          icon: '📄',
        },
        {
          title: 'Grow together',
          description: 'Build your future',
          icon: '👤',
        },
      ],
      footer: 'Your ambition. Your opportunity. Your future.',
    },
  },

  employee: {
    title: 'Welcome back, Recruiter',
    subtitle: 'Find talented people and build your dream team.',
    endpoint: '/auth/employee/login',
    dashboard: '/employee/dashboard',
    register: '/register/employee',
    icon: '💼',
    branding: {
      badge: 'Great teams start here',
      heading: ['Great teams', 'begin with', 'great talent.'],
      description:
        'Connect your company with the right people. Discover promising talent and build a team that drives success.',
      modules: [
        {
          title: 'Discover talent',
          description: 'Find the right candidates',
          icon: '🔎',
        },
        {
          title: 'Build your team',
          description: 'Turn potential into success',
          icon: '👥',
        },
      ],
      footer: 'Your team. Your vision. Your success.',
    },
  },

  admin: {
    title: 'Administrator Login',
    subtitle: 'Sign in to manage your job portal.',
    endpoint: '/auth/admin/login',
    dashboard: '/admin/dashboard',
    register: null,
    icon: '🛡️',
    branding: {
      badge: 'Your platform starts here',
      heading: ['Great platforms', 'begin with', 'great leadership.'],
      description:
        'Keep your job portal organised, secure and running smoothly. Manage the platform with confidence and create a better experience for everyone.',
      modules: [
        {
          title: 'Stay in control',
          description: 'Manage platform operations',
          icon: '⚙️',
        },
        {
          title: 'Make an impact',
          description: 'Support a better experience',
          icon: '✨',
        },
      ],
      footer: 'Your platform. Your responsibility. Your impact.',
    },
  },
};


const Login = () => {
  const { role } = useParams();
  const config = roleConfig[role];

  const { user, login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (user && config && user.role === role) {
      navigate(config.dashboard, { replace: true });
    }
  }, [user, role, config, navigate]);

  const handleChange = (e) => {
    setForm((previous) => ({
      ...previous,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!config) {
      setError('Invalid login page. Please return to the home page.');
      return;
    }

    setLoading(true);

    try {
      const response = await api.post(config.endpoint, {
        email: form.email.trim(),
        password: form.password,
      });

      const { access_token, role: responseRole } = response.data;

      if (!access_token || responseRole !== role) {
        throw new Error('Unexpected login response from server.');
      }

      login(access_token);
      navigate(config.dashboard, { replace: true });
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          err.message ||
          'Login failed. Please check your credentials and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  if (!config) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-900">
            Choose a login page
          </h2>
          <Link to="/" className="mt-4 inline-block text-blue-600 hover:underline">
            Return to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-white lg:grid lg:grid-cols-2">
      
{/* Left branding panel */}
<section className="relative hidden min-h-screen overflow-hidden bg-gradient-to-br from-blue-950 via-blue-950 to-blue-800 px-12 py-10 text-white lg:flex lg:flex-col lg:justify-between xl:px-20">
  <div className="absolute -right-24 top-28 h-80 w-80 rounded-full border border-white/10" />
  <div className="absolute -right-10 top-44 h-52 w-52 rounded-full border border-white/10" />
  <div className="absolute -bottom-40 -left-24 h-96 w-96 rounded-full bg-blue-400/10 blur-3xl" />

  <Link to="/" className="relative z-10 inline-flex w-fit items-center gap-3">
    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-xl font-black text-blue-800 shadow-lg">
      J
    </div>
    <span className="text-2xl font-bold tracking-tight">JobPortal</span>
  </Link>

  <div className="relative z-10 max-w-xl py-12">
    <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm text-blue-50 backdrop-blur">
      <span className="h-2 w-2 rounded-full bg-emerald-300" />
      {config.branding.badge}
    </div>

    <h1 className="text-5xl font-bold leading-tight tracking-tight xl:text-6xl">
      {config.branding.heading.map((line, index) => (
        <React.Fragment key={line}>
          {index === 2 ? (
            <span className="text-blue-200">{line}</span>
          ) : (
            line
          )}
          {index < config.branding.heading.length - 1 && <br />}
        </React.Fragment>
      ))}
    </h1>

    <p className="mt-6 max-w-md text-lg leading-8 text-blue-100">
      {config.branding.description}
    </p>

    <div className="mt-10 grid max-w-md grid-cols-2 gap-4">
      {config.branding.modules.map((module) => (
        <div
          key={module.title}
          className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur"
        >
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 text-xl">
            {module.icon}
          </div>
          <p className="font-semibold">{module.title}</p>
          <p className="mt-1 text-sm text-blue-100">
            {module.description}
          </p>
        </div>
      ))}
    </div>
  </div>

  <p className="relative z-10 text-sm text-blue-200">
    {config.branding.footer}
  </p>
</section>


      {/* Right login panel */}
      <section className="flex min-h-screen flex-col px-5 py-6 sm:px-10 lg:px-12 xl:px-20">
        <header className="flex items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-2 lg:hidden">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-700 text-lg font-black text-white">
              J
            </span>
            <span className="text-xl font-bold text-slate-900">JobPortal</span>
          </Link>

          <Link
            to="/"
            className="ml-auto rounded-lg px-3 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-100 hover:text-blue-700"
          >
            ← Back to home
          </Link>
        </header>

        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-12">
          <div className="mb-8">
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-2xl ring-1 ring-blue-100">
              {config.icon}
            </div>

            <p className="mb-3 text-sm font-bold uppercase tracking-[0.18em] text-blue-700">
              {role} portal
            </p>

            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              {config.title}
            </h2>

            <p className="mt-3 leading-7 text-slate-500">
              {config.subtitle}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/50 sm:p-8">
            {error && (
              <div
                className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700"
                role="alert"
              >
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Email address
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={handleChange}
                  required
                  autoComplete="username"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <label
                    htmlFor="password"
                    className="block text-sm font-semibold text-slate-700"
                  >
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPassword((previous) => !previous)}
                    className="text-sm font-semibold text-blue-700 hover:text-blue-900"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>

                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  placeholder="Enter your password"
                  value={form.password}
                  onChange={handleChange}
                  required
                  autoComplete="current-password"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3.5 font-semibold text-white shadow-lg shadow-blue-700/20 transition hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity=".25" />
                      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                    </svg>
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign in to your account
                    <span aria-hidden="true">→</span>
                  </>
                )}
              </button>
            </form>

            {config.register && (
              <p className="mt-6 text-center text-sm text-slate-500">
                Don&apos;t have an account?{' '}
                <Link
                  to={config.register}
                  className="font-semibold text-blue-700 hover:text-blue-900"
                >
                  Create an account
                </Link>
              </p>
            )}

            {!config.register && (
              <p className="mt-6 text-center text-sm text-slate-500">
                Administrator access only
              </p>
            )}
          </div>

          <p className="mt-7 text-center text-xs leading-5 text-slate-400">
            By signing in, you agree to use this platform responsibly.
          </p>
        </div>

        <footer className="pb-3 text-center text-xs text-slate-400">
          © {new Date().getFullYear()} JobPortal. All rights reserved.
        </footer>
      </section>
    </main>
  );
};

export default Login;
