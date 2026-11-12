
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

export default function StudentEditProfile() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    date_of_birth: '',
    gender: '',
    address: '',
    qualification: '',
    department: '',
    year_of_passing: '',
    skills: '',
  });

  const [currentPhoto, setCurrentPhoto] = useState(null);
  const [newPhoto, setNewPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await api.get('/student/my-profile');
        const student = response.data;

        setFormData({
          full_name: student.full_name || '',
          email: student.email || '',
          phone: student.phone || '',
          date_of_birth: student.date_of_birth || '',
          gender: student.gender || '',
          address: student.address || '',
          qualification: student.qualification || '',
          department: student.department || '',
          year_of_passing: student.year_of_passing || '',
          skills: student.skills || '',
        });

        setCurrentPhoto(student.profile_photo || null);
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

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png'];

    if (!allowedTypes.includes(file.type)) {
      setError('Only JPG and PNG images are allowed.');
      e.target.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Profile photo must be smaller than 5 MB.');
      e.target.value = '';
      return;
    }

    setError('');
    setNewPhoto(file);

    const previewUrl = URL.createObjectURL(file);
    setPhotoPreview(previewUrl);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (saving) return;

    setSaving(true);
    setError('');
    setSuccess('');

    const payload = new FormData();

    Object.entries(formData).forEach(([key, value]) => {
      payload.append(key, value);
    });

    if (newPhoto) {
      payload.append('profile_photo', newPhoto);
    }

    try {
      await api.put('/student/my-profile', payload);

      setSuccess('Profile updated successfully.');

      setTimeout(() => {
        navigate('/student/my-profile');
      }, 1000);
    } catch (err) {
      setError(
        err.response?.data?.detail || 'Unable to update your profile.'
      );
    } finally {
      setSaving(false);
    }
  };

  const displayedPhoto = photoPreview
    ? photoPreview
    : currentPhoto
      ? `http://127.0.0.1:8000/${currentPhoto.replace(/^\/+/, '')}`
      : null;

  useEffect(() => {
    return () => {
      if (photoPreview) {
        URL.revokeObjectURL(photoPreview);
      }
    };
  }, [photoPreview]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-slate-500">Loading your profile...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-50 px-5 py-8">
      <main className="mx-auto max-w-4xl">

        <button
          type="button"
          onClick={() => navigate('/student/my-profile')}
          className="mb-6 text-sm font-semibold text-slate-600 hover:text-blue-700"
        >
          ← Back to Profile
        </button>

        <section className="rounded-3xl bg-white p-6 shadow-sm sm:p-8">

          <h1 className="text-2xl font-bold text-slate-800">
            Edit Your Profile
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Update your personal and educational details.
          </p>

          {error && (
            <div className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {success && (
            <div className="mt-5 rounded-lg bg-green-50 p-3 text-sm text-green-700">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-7 space-y-5">

            {/* Profile Photo */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Profile Photo
              </label>

              {displayedPhoto && (
                <img
                  src={displayedPhoto}
                  alt="Profile"
                  className="mb-4 h-24 w-24 rounded-xl border object-cover"
                />
              )}

              <input
                type="file"
                accept="image/jpeg,image/png"
                onChange={handlePhotoChange}
                className="w-full rounded-lg border border-slate-300 p-3 text-sm"
              />

              <p className="mt-1 text-xs text-slate-500">
                JPG or PNG, maximum 5 MB. Leave empty to keep your current photo.
              </p>
            </div>

            {/* Full Name */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Full Name
              </label>
              <input
                type="text"
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                minLength={2}
                maxLength={100}
                required
                className="w-full rounded-lg border border-slate-300 p-3"
              />
            </div>

            {/* Email */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full rounded-lg border border-slate-300 p-3"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Phone
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                minLength={7}
                maxLength={20}
                required
                className="w-full rounded-lg border border-slate-300 p-3"
              />
            </div>

            {/* Date of Birth */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Date of Birth
              </label>
              <input
                type="date"
                name="date_of_birth"
                value={formData.date_of_birth}
                onChange={handleChange}
                required
                className="w-full rounded-lg border border-slate-300 p-3"
              />
            </div>

            {/* Gender */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Gender
              </label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                required
                className="w-full rounded-lg border border-slate-300 p-3"
              >
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Address */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Address
              </label>
              <textarea
                name="address"
                value={formData.address}
                onChange={handleChange}
                minLength={5}
                maxLength={500}
                required
                rows={3}
                className="w-full rounded-lg border border-slate-300 p-3"
              />
            </div>

            {/* Qualification */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Qualification
              </label>
              <input
                type="text"
                name="qualification"
                value={formData.qualification}
                onChange={handleChange}
                minLength={2}
                maxLength={100}
                required
                className="w-full rounded-lg border border-slate-300 p-3"
              />
            </div>

            {/* Department */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Department
              </label>
              <input
                type="text"
                name="department"
                value={formData.department}
                onChange={handleChange}
                minLength={2}
                maxLength={100}
                required
                className="w-full rounded-lg border border-slate-300 p-3"
              />
            </div>

            {/* Year of Passing */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Year of Passing
              </label>
              <input
                type="number"
                name="year_of_passing"
                value={formData.year_of_passing}
                onChange={handleChange}
                min={1950}
                max={2100}
                required
                className="w-full rounded-lg border border-slate-300 p-3"
              />
            </div>

            {/* Skills */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Skills
              </label>
              <textarea
                name="skills"
                value={formData.skills}
                onChange={handleChange}
                minLength={1}
                maxLength={1000}
                required
                rows={4}
                className="w-full rounded-lg border border-slate-300 p-3"
              />
            </div>

            {/* Buttons */}
            <div className="flex flex-col gap-3 pt-4 sm:flex-row">

              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>

              <button
                type="button"
                onClick={() => navigate('/student/my-profile')}
                disabled={saving}
                className="rounded-xl border border-slate-300 px-6 py-3 font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>

            </div>

          </form>
        </section>
      </main>
    </div>
  );
}
