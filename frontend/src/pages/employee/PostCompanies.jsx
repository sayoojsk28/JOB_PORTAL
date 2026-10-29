
import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';

const initialForm = {
  name: '',
  industry: '',
  address: '',
  website: '',
  contact_number: '',
  email: '',
  size: '',
  description: '',
};

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100';

const labelClass = 'mb-2 block text-sm font-semibold text-slate-700';

const PostCompanies = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState(initialForm);
  const [logo, setLogo] = useState(null);
  const [logoPreview, setLogoPreview] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!logo) {
      setLogoPreview('');
      return;
    }

    const previewUrl = URL.createObjectURL(logo);
    setLogoPreview(previewUrl);

    return () => URL.revokeObjectURL(previewUrl);
  }, [logo]);

  const handleChange = (e) => {
    setForm((previous) => ({
      ...previous,
      [e.target.name]: e.target.value,
    }));
  };

  const handleLogoChange = (e) => {
    setError('');
    const selectedFile = e.target.files?.[0];

    if (!selectedFile) {
      setLogo(null);
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];

    if (!allowedTypes.includes(selectedFile.type)) {
      setError('Please select a JPG, PNG or WEBP image.');
      e.target.value = '';
      setLogo(null);
      return;
    }

    if (selectedFile.size > 5 * 1024 * 1024) {
      setError('Logo size must be 5 MB or less.');
      e.target.value = '';
      setLogo(null);
      return;
    }

    setLogo(selectedFile);
  };

  
const handleSubmit = async (e) => {
  e.preventDefault();
  setError('');
  setSuccess('');
  setLoading(true);

  const payload = new FormData();

  Object.entries(form).forEach(([key, value]) => {
    payload.append(
      key,
      typeof value === 'string' ? value.trim() : value ?? ''
    );
  });

  if (logo) {
    payload.append('logo', logo);
  }

  
try {
  const response = await api.post('/companies', payload);

  console.log('Company registration successful:', response.data);

  alert('Company registered successfully!');

  navigate('/employee/companies');
} catch (err) {
  console.error('Company registration error:', err.response?.data || err);

  const detail = err.response?.data?.detail;

  setError(
    typeof detail === 'string'
      ? detail
      : Array.isArray(detail)
        ? detail.map((item) => item.msg).join(' ')
        : 'Company registration failed. Please check your details and try again.'
  );
} finally {
  setLoading(false);
}
};


  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-100 px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto w-full max-w-3xl">
        <header className="mb-8 text-center">
          <Link
            to="/employee/dashboard"
            className="inline-flex items-center rounded-lg px-3 py-2 text-sm font-medium text-slate-500 transition hover:bg-white hover:text-blue-700"
          >
            ← Back to dashboard
          </Link>

          <p className="mt-5 text-sm font-bold uppercase tracking-[0.2em] text-blue-700">
            Camerin Innovate
          </p>

          <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Register a company
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-500 sm:text-base">
            Add company details to start creating recruitment opportunities.
          </p>
        </header>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/60 sm:p-8">
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
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-lg font-bold text-slate-900">
                Company information
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Enter the company's basic details.
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className={labelClass} htmlFor="name">
                  Company name
                </label>
                <input
                  className={inputClass}
                  id="name"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Enter company name"
                  maxLength={200}
                  required
                />
              </div>

              <div>
                <label className={labelClass} htmlFor="industry">
                  Industry
                </label>
                <input
                  className={inputClass}
                  id="industry"
                  name="industry"
                  value={form.industry}
                  onChange={handleChange}
                  placeholder="e.g. Information Technology"
                  maxLength={100}
                  required
                />
              </div>

              <div>
                <label className={labelClass} htmlFor="email">
                  Company email
                </label>
                <input
                  className={inputClass}
                  id="email"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="hr@company.com"
                  autoComplete="email"
                  required
                />
              </div>

              <div>
                <label className={labelClass} htmlFor="contact_number">
                  Contact number
                </label>
                <input
                  className={inputClass}
                  id="contact_number"
                  name="contact_number"
                  type="tel"
                  value={form.contact_number}
                  onChange={handleChange}
                  placeholder="Enter contact number"
                  maxLength={20}
                  required
                />
              </div>

              <div>
                <label className={labelClass} htmlFor="website">
                  Website <span className="font-normal text-slate-400">(Optional)</span>
                </label>
                <input
                  className={inputClass}
                  id="website"
                  name="website"
                  type="url"
                  value={form.website}
                  onChange={handleChange}
                  placeholder="https://company.com"
                />
              </div>

              <div>
                <label className={labelClass} htmlFor="size">
                  Company size <span className="font-normal text-slate-400">(Optional)</span>
                </label>
                <select
                  className={inputClass}
                  id="size"
                  name="size"
                  value={form.size}
                  onChange={handleChange}
                >
                  <option value="">Select company size</option>
                  <option value="1-10">1–10 employees</option>
                  <option value="11-50">11–50 employees</option>
                  <option value="50-100">50–100 employees</option>
                  <option value="101-500">101–500 employees</option>
                  <option value="500+">500+ employees</option>
                </select>
              </div>
            </div>

            <div>
              <label className={labelClass} htmlFor="address">
                Company address
              </label>
              <textarea
                className={inputClass}
                id="address"
                name="address"
                value={form.address}
                onChange={handleChange}
                placeholder="Enter the complete company address"
                maxLength={500}
                rows={3}
                required
              />
            </div>

            <div>
              <label className={labelClass} htmlFor="description">
                Company description{' '}
                <span className="font-normal text-slate-400">(Optional)</span>
              </label>
              <textarea
                className={inputClass}
                id="description"
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="Describe the company and its work"
                rows={4}
              />
            </div>

            <div className="border-t border-slate-100 pt-5">
              <h2 className="text-lg font-bold text-slate-900">
                Company logo
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Upload a JPG, PNG or WEBP image. Maximum size: 5 MB.
              </p>
            </div>

            <div>
              <label className={labelClass} htmlFor="logo">
                Upload logo <span className="font-normal text-slate-400">(Optional)</span>
              </label>
              <input
                className={inputClass}
                id="logo"
                name="logo"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleLogoChange}
              />

              {logoPreview && (
                <div className="mt-4 flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <img
                    src={logoPreview}
                    alt="Selected company logo preview"
                    className="h-20 w-20 rounded-xl border border-slate-200 bg-white object-contain p-1"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="break-all text-sm font-semibold text-slate-700">
                      {logo?.name}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {logo ? (logo.size / 1024).toFixed(1) + ' KB' : ''}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setLogo(null);
                      const fileInput = document.getElementById('logo');
                      if (fileInput) fileInput.value = '';
                    }}
                    className="text-sm font-semibold text-red-600 hover:text-red-800"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>

           

            <button
              type="submit"
              disabled={loading || Boolean(success)}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3.5 font-semibold text-white shadow-lg shadow-blue-700/20 transition hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  Registering company...
                </>
              ) : (
                <>
                  Register company
                  <span aria-hidden="true">→</span>
                </>
              )}
            </button>
          </form>
        </section>

        <footer className="py-6 text-center text-xs text-slate-400">
          © {new Date().getFullYear()} Camerin Innovate. All rights reserved.
        </footer>
      </div>
    </main>
  );
};

export default PostCompanies;
