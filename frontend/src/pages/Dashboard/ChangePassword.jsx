
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

const ChangePassword = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });

  const [showPasswords, setShowPasswords] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (form.new_password.length < 8) {
      setError('New password must be at least 8 characters long.');
      return;
    }

    if (form.new_password !== form.confirm_password) {
      setError('New password and confirmation do not match.');
      return;
    }

    if (form.current_password === form.new_password) {
      setError('New password must be different from current password.');
      return;
    }

    setLoading(true);

    try {
      const response = await api.post('/auth/admin/change-password', {
        current_password: form.current_password,
        new_password: form.new_password,
      });

      setSuccess(
        response.data?.message || 'Password changed successfully.'
      );

      setForm({
        current_password: '',
        new_password: '',
        confirm_password: '',
      });
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          'Unable to change password. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    'mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100';

  return (
    <main className="min-h-[calc(100vh-76px)] bg-slate-50 px-4 py-8 sm:px-8 sm:py-10">
      <div className="mx-auto max-w-3xl">
        <button
          type="button"
          onClick={() => navigate('/admin/dashboard')}
          className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:text-blue-900"
        >
          <span aria-hidden="true">←</span>
          Back to Dashboard
        </button>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="bg-gradient-to-r from-blue-950 via-blue-800 to-blue-600 px-6 py-7 text-white sm:px-8">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/15 text-2xl">
                🔐
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-blue-200">
                  Account Security
                </p>
                <h1 className="mt-1 text-2xl font-bold">
                  Change Password
                </h1>
              </div>
            </div>

            <p className="mt-4 max-w-xl text-sm leading-6 text-blue-100">
              Update your administrator password to keep your account secure.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 p-6 sm:p-8">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-slate-900">
                Password Details
              </h2>

              <button
                type="button"
                onClick={() => setShowPasswords(!showPasswords)}
                className="text-sm font-semibold text-blue-700 hover:text-blue-900"
              >
                {showPasswords ? 'Hide passwords' : 'Show passwords'}
              </button>
            </div>

            <div>
              <label
                htmlFor="current_password"
                className="text-sm font-semibold text-slate-700"
              >
                Current Password
              </label>
              <input
                id="current_password"
                name="current_password"
                type={showPasswords ? 'text' : 'password'}
                autoComplete="current-password"
                value={form.current_password}
                onChange={handleChange}
                className={inputClass}
                placeholder="Enter your current password"
                required
              />
            </div>

            <div>
              <label
                htmlFor="new_password"
                className="text-sm font-semibold text-slate-700"
              >
                New Password
              </label>
              <input
                id="new_password"
                name="new_password"
                type={showPasswords ? 'text' : 'password'}
                autoComplete="new-password"
                value={form.new_password}
                onChange={handleChange}
                className={inputClass}
                placeholder="Enter your new password"
                minLength={8}
                maxLength={128}
                required
              />

              <p className="mt-2 text-xs text-slate-500">
                Use at least 8 characters.
              </p>

              {form.new_password.length > 0 && (
                <div className="mt-3">
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="text-slate-500">Password length</span>
                    <span className="font-semibold text-slate-700">
                      {form.new_password.length}/8 minimum
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full transition-all ${
                        form.new_password.length >= 8
                          ? 'w-full bg-emerald-500'
                          : 'bg-amber-400'
                      }`}
                      style={{
                        width: `${Math.min(
                          (form.new_password.length / 8) * 100,
                          100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div>
              <label
                htmlFor="confirm_password"
                className="text-sm font-semibold text-slate-700"
              >
                Confirm New Password
              </label>
              <input
                id="confirm_password"
                name="confirm_password"
                type={showPasswords ? 'text' : 'password'}
                autoComplete="new-password"
                value={form.confirm_password}
                onChange={handleChange}
                className={inputClass}
                placeholder="Re-enter your new password"
                required
              />

              {form.confirm_password.length > 0 && (
                <p
                  className={`mt-2 text-xs font-medium ${
                    form.confirm_password === form.new_password
                      ? 'text-emerald-700'
                      : 'text-rose-600'
                  }`}
                >
                  {form.confirm_password === form.new_password
                    ? 'Passwords match'
                    : 'Passwords do not match'}
                </p>
              )}
            </div>

            {error && (
              <div
                role="alert"
                className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
              >
                {error}
              </div>
            )}

            {success && (
              <div
                role="status"
                className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
              >
                {success}
              </div>
            )}

            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => navigate('/admin/dashboard')}
                className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={loading}
                className="rounded-xl bg-blue-800 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </form>
        </section>

        <p className="mt-5 text-center text-xs text-slate-400">
          Camerin Innovate · Administration Portal
        </p>
      </div>
    </main>
  );
};

export default ChangePassword;
