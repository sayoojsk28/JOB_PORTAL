
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

const inputClass =
  'mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100';

const EmployeeEditDetails = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    designation: '',
  });

  const [currentPhoto, setCurrentPhoto] = useState(null);
  const [newPhoto, setNewPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchEmployeeDetails();
  }, []);

  const fetchEmployeeDetails = async () => {
    try {
      const response = await api.get('/employee/my-details');

      setForm({
        full_name: response.data.full_name || '',
        email: response.data.email || '',
        phone: response.data.phone || '',
        designation: response.data.designation || '',
      });

      setCurrentPhoto(response.data.profile_photo || null);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          'Unable to load employee details. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setForm((previous) => ({
      ...previous,
      [e.target.name]: e.target.value,
    }));

    setError('');
    setSuccess('');
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0] || null;

    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];

    if (!allowedTypes.includes(file.type)) {
      setError('Please select a JPG, PNG or WEBP image.');
      e.target.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Profile photo must be smaller than 5 MB.');
      e.target.value = '';
      return;
    }

    setNewPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError('');
    setSuccess('');

    const phone = form.phone.trim();

    if (!/^[0-9+-]+$/.test(phone)) {
      setError(
        'Phone number can contain only digits, plus (+) and hyphens (-).'
      );
      return;
    }

    if (form.full_name.trim().length < 2) {
      setError('Full name must contain at least 2 characters.');
      return;
    }

    if (form.designation.trim().length < 2) {
      setError('Designation must contain at least 2 characters.');
      return;
    }

    const payload = new FormData();

    payload.append('full_name', form.full_name.trim());
    payload.append('email', form.email.trim());
    payload.append('phone', phone);
    payload.append('designation', form.designation.trim());

    if (newPhoto) {
      payload.append('profile_photo', newPhoto);
    }

    setSaving(true);

    try {
      const response = await api.put(
        '/employee/my-details',
        payload
      );

      setSuccess(
        response.data?.message || 'Your details have been updated successfully.'
      );

      await fetchEmployeeDetails();

      setNewPhoto(null);
      setPhotoPreview(null);
    } catch (err) {
      const detail = err.response?.data?.detail;

      setError(
        typeof detail === 'string'
          ? detail
          : Array.isArray(detail)
            ? detail.map((item) => item.msg).join(' ')
            : 'Unable to update your details. Please try again.'
      );
    } finally {
      setSaving(false);
    }
  };

  const displayedPhoto = photoPreview || currentPhoto;

  const photoUrl = displayedPhoto
    ? displayedPhoto.startsWith('blob:')
      ? displayedPhoto
      : `http://127.0.0.1:8000${displayedPhoto}`
    : null;

  return (
    <main className="min-h-[calc(100vh-76px)] bg-slate-50 px-4 py-8 sm:px-8 sm:py-10">
      <div className="mx-auto max-w-3xl">

        <button
          type="button"
          onClick={() => navigate('/employee/dashboard')}
          className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:text-blue-900"
        >
          <span aria-hidden="true">←</span>
          Back to Dashboard
        </button>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

          <div className="bg-gradient-to-r from-blue-950 via-blue-800 to-blue-600 px-6 py-7 text-white sm:px-8">
            <div className="flex items-center gap-4">

              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/15 text-2xl">
                ✏️
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-blue-200">
                  Employee Account
                </p>

                <h1 className="mt-1 text-2xl font-bold">
                  Edit Details
                </h1>
              </div>

            </div>

            <p className="mt-4 max-w-xl text-sm leading-6 text-blue-100">
              View and update your employee account information.
            </p>
          </div>

          {loading ? (
            <div className="p-10 text-center text-sm text-slate-500">
              Loading your details...
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5 p-6 sm:p-8">

              <h2 className="text-lg font-bold text-slate-900">
                Personal Details
              </h2>

              <div>
                <label htmlFor="full_name" className="text-sm font-semibold text-slate-700">
                  Full Name
                </label>

                <input
                  id="full_name"
                  name="full_name"
                  value={form.full_name}
                  onChange={handleChange}
                  className={inputClass}
                  minLength={2}
                  maxLength={100}
                  required
                />
              </div>

              <div>
                <label htmlFor="email" className="text-sm font-semibold text-slate-700">
                  Email Address
                </label>

                <input
                  id="email"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  className={inputClass}
                  required
                />
              </div>

              <div>
                <label htmlFor="phone" className="text-sm font-semibold text-slate-700">
                  Phone Number
                </label>

                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={form.phone}
                  onChange={handleChange}
                  className={inputClass}
                  pattern="[0-9+-]+"
                  title="Only numbers, plus (+) and hyphens (-) are allowed."
                  required
                />
              </div>

              <div>
                <label htmlFor="designation" className="text-sm font-semibold text-slate-700">
                  Designation
                </label>

                <input
                  id="designation"
                  name="designation"
                  value={form.designation}
                  onChange={handleChange}
                  className={inputClass}
                  minLength={2}
                  maxLength={100}
                  required
                />
              </div>

              <div className="border-t border-slate-100 pt-5">

                <h2 className="text-lg font-bold text-slate-900">
                  Profile Photo
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Upload a new photo only if you want to replace your current one.
                </p>

                {photoUrl && (
                  <div className="mt-4">
                    <img
                      src={photoUrl}
                      alt="Employee profile"
                      className="h-24 w-24 rounded-full border border-slate-200 object-cover"
                    />
                  </div>
                )}

                <input
                  id="profile_photo"
                  name="profile_photo"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handlePhotoChange}
                  className={inputClass}
                />

                <p className="mt-2 text-xs text-slate-500">
                  JPG, PNG or WEBP. Maximum size: 5 MB. Leave empty to keep your current photo.
                </p>

                {newPhoto && (
                  <p className="mt-2 text-sm text-emerald-700">
                    New photo selected: {newPhoto.name}
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
                  onClick={() => navigate('/employee/dashboard')}
                  className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-blue-800 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>

              </div>

            </form>
          )}

        </section>

        <p className="mt-5 text-center text-xs text-slate-400">
          Camerin Innovate · Employee Portal
        </p>

      </div>
    </main>
  );
};

export default EmployeeEditDetails;
