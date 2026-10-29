
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';

const initialForm = {
  full_name: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
  date_of_birth: '',
  gender: '',
  address: '',
  qualification: '',
  department: '',
  year_of_passing: '',
  skills: '',
  designation: '',
};

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100';

const labelClass = 'mb-2 block text-sm font-semibold text-slate-700';

const Register = () => {
  const navigate = useNavigate();

  const [role, setRole] = useState('student');
  const [form, setForm] = useState(initialForm);
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm((previous) => ({
      ...previous,
      [e.target.name]: e.target.value,
    }));
  };

  const passwordChecks = [
    form.password.length >= 8,
    /[A-Z]/.test(form.password),
    /\d/.test(form.password),
    /[^A-Za-z0-9]/.test(form.password),
  ];

  const strength = passwordChecks.filter(Boolean).length;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (form.password.length < 8) {
      setError('Password must contain at least 8 characters.');
      return;
    }

    if (!/[A-Z]/.test(form.password) || !/\d/.test(form.password)) {
      setError('Password must include at least one uppercase letter and one number.');
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match. Please check both fields.');
      return;
    }

    
    const endpoint =
      role === 'student' ? '/students/register' : '/employees/register';

    let payload;

    if (role === 'student') {
      payload = {
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        date_of_birth: form.date_of_birth,
        gender: form.gender,
        address: form.address.trim(),
        qualification: form.qualification.trim(),
        department: form.department.trim(),
        year_of_passing: Number(form.year_of_passing),
        skills: form.skills.trim(),
        password: form.password,
      };
    } else {
      payload = new FormData();

      payload.append('full_name', form.full_name.trim());
      payload.append('email', form.email.trim());
      payload.append('phone', form.phone.trim());
      payload.append('designation', form.designation.trim());
      payload.append('password', form.password);

      if (profilePhoto) {
        payload.append('profile_photo', profilePhoto);
      }
    }

    setLoading(true);


    try {
      const endpoint =
        role === 'student' ? '/students/register' : '/employees/register';

      
      await api.post(endpoint, payload);

      if (role === 'student') {
        navigate('/student/registration-success');
      } 

    } catch (err) {
      const detail = err.response?.data?.detail;

      setError(
        typeof detail === 'string'
          ? detail
          : Array.isArray(detail)
            ? detail.map((item) => item.msg).join(' ')
            : 'Registration failed. Please check your details and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const changeRole = (nextRole) => {
    setRole(nextRole);
    setError('');
    setSuccess('');
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-100 px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto w-full max-w-2xl">
        <header className="mb-8 text-center">
          <Link
            to="/"
            className="inline-flex items-center rounded-lg px-3 py-2 text-sm font-medium text-slate-500 transition hover:bg-white hover:text-blue-700"
          >
            ← Back to home
          </Link>

          <p className="mt-5 text-sm font-bold uppercase tracking-[0.2em] text-blue-700">
            Camerin Innovate
          </p>

          <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Create your account
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-500 sm:text-base">
            Start your next career chapter with Camerin Innovate.
          </p>
        </header>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/60 sm:p-8">
          <div className="mb-7">
            <p className="mb-3 text-sm font-semibold text-slate-700">
              I want to register as
            </p>

            <div className="grid grid-cols-2 gap-3">
              {[
                {
                  value: 'student',
                  title: 'Student',
                  description: 'Explore opportunities',
                  icon: '🎓',
                },
                {
                  value: 'employee',
                  title: 'Employee',
                  description: 'Recruit talent',
                  icon: '💼',
                },
              ].map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => changeRole(item.value)}
                  aria-pressed={role === item.value}
                  className={`rounded-xl border p-4 text-left transition ${
                    role === item.value
                      ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-100'
                      : 'border-slate-200 bg-white hover:border-blue-300'
                  }`}
                >
                  <span className="text-2xl">{item.icon}</span>
                  <span className="mt-2 block font-semibold text-slate-900">
                    {item.title}
                  </span>
                  <span className="mt-1 block text-xs text-slate-500">
                    {item.description}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div
              role="alert"
              className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700"
            >
              {error}
            </div>
          )}

          {success && (
            <div
              role="status"
              className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-700"
            >
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className={labelClass} htmlFor="full_name">
                  Full name
                </label>
                <input
                  className={inputClass}
                  id="full_name"
                  name="full_name"
                  value={form.full_name}
                  onChange={handleChange}
                  placeholder="Enter your full name"
                  minLength={2}
                  maxLength={100}
                  autoComplete="name"
                  required
                />
              </div>

              <div>
                <label className={labelClass} htmlFor="email">
                  Email address
                </label>
                <input
                  className={inputClass}
                  id="email"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                />
              </div>

              <div>
                <label className={labelClass} htmlFor="phone">
                  Phone number
                </label>
                <input
                  className={inputClass}
                  id="phone"
                  name="phone"
                  type="tel"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="Enter phone number"
                  minLength={7}
                  maxLength={20}
                  autoComplete="tel"
                  required
                />
              </div>

              {role === 'employee' && (
                <div>
                  <label className={labelClass} htmlFor="designation">
                    Designation
                  </label>
                  <input
                    className={inputClass}
                    id="designation"
                    name="designation"
                    value={form.designation}
                    onChange={handleChange}
                    placeholder="e.g. HR Manager"
                    minLength={2}
                    maxLength={100}
                    required
                  />
                </div>
              )}
            
            {role === 'employee' && (
              <div>
                <label className={labelClass} htmlFor="profile_photo">
                  Profile photo <span className="font-normal text-slate-400">(Optional)</span>
                </label>

                <input
                  className={inputClass}
                  id="profile_photo"
                  name="profile_photo"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) =>
                    setProfilePhoto(e.target.files?.[0] || null)
                  }
                />

                <p className="mt-2 text-xs text-slate-500">
                  Accepted formats: JPG, PNG or WEBP.
                </p>

                {profilePhoto && (
                  <div className="mt-3 flex items-center gap-3">
                    <img
                      src={URL.createObjectURL(profilePhoto)}
                      alt="Selected profile preview"
                      className="h-16 w-16 rounded-full border border-slate-200 object-cover"
                    />
                    <span className="break-all text-sm text-slate-600">
                      {profilePhoto.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => setProfilePhoto(null)}
                      className="text-sm font-semibold text-red-600 hover:text-red-800"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            )}

            </div>

            {role === 'student' && (
              <>
                <div className="border-t border-slate-100 pt-5">
                  <h2 className="text-lg font-bold text-slate-900">
                    Student details
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Tell us a little more about your education.
                  </p>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label className={labelClass} htmlFor="date_of_birth">
                      Date of birth
                    </label>
                    <input
                      className={inputClass}
                      id="date_of_birth"
                      name="date_of_birth"
                      type="date"
                      value={form.date_of_birth}
                      onChange={handleChange}
                      max={new Date().toISOString().split('T')[0]}
                      required
                    />
                  </div>

                  <div>
                    <label className={labelClass} htmlFor="gender">
                      Gender
                    </label>
                    <select
                      className={inputClass}
                      id="gender"
                      name="gender"
                      value={form.gender}
                      onChange={handleChange}
                      required
                    >
                      <option value="">Select gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                      <option value="Prefer not to say">Prefer not to say</option>
                    </select>
                  </div>

                  <div>
                    <label className={labelClass} htmlFor="qualification">
                      Qualification
                    </label>
                    <input
                      className={inputClass}
                      id="qualification"
                      name="qualification"
                      value={form.qualification}
                      onChange={handleChange}
                      placeholder="e.g. BCA, B.Tech"
                      minLength={2}
                      maxLength={100}
                      required
                    />
                  </div>

                  <div>
                    <label className={labelClass} htmlFor="department">
                      Department / Specialisation
                    </label>
                    <input
                      className={inputClass}
                      id="department"
                      name="department"
                      value={form.department}
                      onChange={handleChange}
                      placeholder="e.g. Computer Science"
                      minLength={2}
                      maxLength={100}
                      required
                    />
                  </div>

                  <div>
                    <label className={labelClass} htmlFor="year_of_passing">
                      Year of passing
                    </label>
                    <input
                      className={inputClass}
                      id="year_of_passing"
                      name="year_of_passing"
                      type="number"
                      value={form.year_of_passing}
                      onChange={handleChange}
                      placeholder="e.g. 2027"
                      min={1950}
                      max={2100}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className={labelClass} htmlFor="address">
                    Address
                  </label>
                  <textarea
                    className={inputClass}
                    id="address"
                    name="address"
                    value={form.address}
                    onChange={handleChange}
                    placeholder="Enter your address"
                    minLength={5}
                    maxLength={500}
                    rows={3}
                    required
                  />
                </div>

                <div>
                  <label className={labelClass} htmlFor="skills">
                    Skills
                  </label>
                  <textarea
                    className={inputClass}
                    id="skills"
                    name="skills"
                    value={form.skills}
                    onChange={handleChange}
                    placeholder="e.g. Python, React, communication"
                    minLength={1}
                    maxLength={1000}
                    rows={2}
                    required
                  />
                </div>
              </>
            )}

            <div className="border-t border-slate-100 pt-5">
              <h2 className="mb-5 text-lg font-bold text-slate-900">
                Secure your account
              </h2>

              <div className="mb-5">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <label className={labelClass} htmlFor="password">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="text-sm font-semibold text-blue-700 hover:text-blue-900"
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>

                <input
                  className={inputClass}
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Create a strong password"
                  minLength={8}
                  maxLength={128}
                  autoComplete="new-password"
                  required
                />

                <div className="mt-3">
                  <div className="mb-2 flex gap-1">
                    {[1, 2, 3, 4].map((level) => (
                      <div
                        key={level}
                        className={`h-1.5 flex-1 rounded-full ${
                          strength >= level ? 'bg-blue-600' : 'bg-slate-200'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-xs leading-5 text-slate-500">
                    Use at least 8 characters, an uppercase letter, a number
                    and a special character for a stronger password.
                  </p>
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <label className={labelClass} htmlFor="confirmPassword">
                    Confirm password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((value) => !value)}
                    className="text-sm font-semibold text-blue-700 hover:text-blue-900"
                  >
                    {showConfirmPassword ? 'Hide' : 'Show'}
                  </button>
                </div>

                <input
                  className={`${inputClass} ${
                    form.confirmPassword &&
                    form.confirmPassword !== form.password
                      ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
                      : ''
                  }`}
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={form.confirmPassword}
                  onChange={handleChange}
                  placeholder="Re-enter your password"
                  autoComplete="new-password"
                  required
                  aria-invalid={
                    Boolean(form.confirmPassword) &&
                    form.confirmPassword !== form.password
                  }
                />

                {form.confirmPassword && (
                  <p
                    className={`mt-2 text-xs ${
                      form.confirmPassword === form.password
                        ? 'text-emerald-600'
                        : 'text-red-600'
                    }`}
                  >
                    {form.confirmPassword === form.password
                      ? '✓ Passwords match'
                      : 'Passwords do not match'}
                  </p>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || Boolean(success)}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3.5 font-semibold text-white shadow-lg shadow-blue-700/20 transition hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  Creating account...
                </>
              ) : (
                <>
                  Create {role === 'student' ? 'student' : 'employee'} account
                  <span aria-hidden="true">→</span>
                </>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Already have an account?{' '}
            <Link
              to={`/login/${role}`}
              className="font-semibold text-blue-700 hover:text-blue-900"
            >
              Sign in
            </Link>
          </p>
        </section>

        <footer className="py-6 text-center text-xs text-slate-400">
          © {new Date().getFullYear()} Camerin Innovate. All rights reserved.
        </footer>
      </div>
    </main>
  );
};

export default Register;
