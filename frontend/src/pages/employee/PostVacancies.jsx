
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../services/api';

function PostVacancies() {
  const { companyId } = useParams();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    required_skills: '',
    qualification: '',
    location: '',
    salary_range: '',
    employment_type: 'Full-time',
    openings: 1,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((previous) => ({
      ...previous,
      [name]: name === 'openings' ? Number(value) : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (formData.openings < 1) {
      setError('Openings must be at least 1.');
      return;
    }

    setLoading(true);

    try {
      await api.post('/vacancies', {
        ...formData,
        company_id: Number(companyId),
      });

      setSuccess('Vacancy posted successfully!');

      setTimeout(() => {
        navigate('/employee/vacancies');
      }, 1200);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          'Failed to post vacancy. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100';

  const labelClass =
    'mb-2 block text-sm font-semibold text-slate-700';

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-4xl">

        <div className="mb-8">
          <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-blue-700">
            Recruitment
          </p>

          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Post a Vacancy
          </h1>

          <p className="mt-2 text-slate-500">
            Create a job opportunity for students to discover and apply.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
        >
          <div className="h-1.5 bg-gradient-to-r from-blue-700 via-blue-500 to-cyan-400" />

          <div className="space-y-7 p-5 sm:p-8">

            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Job Details
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Enter the position and its responsibilities.
              </p>
            </div>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {typeof error === 'string'
                  ? error
                  : JSON.stringify(error)}
              </div>
            )}

            {success && (
              <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
                {success}
              </div>
            )}

            <div>
              <label htmlFor="title" className={labelClass}>
                Job Title *
              </label>
              <input
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                className={inputClass}
                placeholder="e.g. Junior Python Developer"
                required
              />
            </div>

            <div>
              <label htmlFor="description" className={labelClass}>
                Job Description *
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                className={inputClass}
                rows={5}
                placeholder="Describe the role and responsibilities..."
                required
              />
            </div>

            <div>
              <label htmlFor="required_skills" className={labelClass}>
                Required Skills *
              </label>
              <textarea
                id="required_skills"
                name="required_skills"
                value={formData.required_skills}
                onChange={handleChange}
                className={inputClass}
                rows={3}
                placeholder="Python, FastAPI, SQL, Git"
                required
              />
            </div>

            <div>
              <label htmlFor="qualification" className={labelClass}>
                Qualification *
              </label>
              <input
                id="qualification"
                name="qualification"
                value={formData.qualification}
                onChange={handleChange}
                className={inputClass}
                placeholder="e.g. BCA or BSc Computer Science"
                required
              />
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="location" className={labelClass}>
                  Job Location *
                </label>
                <input
                  id="location"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  className={inputClass}
                  placeholder="e.g. Kochi"
                  required
                />
              </div>

              <div>
                <label htmlFor="salary_range" className={labelClass}>
                  Salary Range *
                </label>
                <input
                  id="salary_range"
                  name="salary_range"
                  value={formData.salary_range}
                  onChange={handleChange}
                  className={inputClass}
                  placeholder="e.g. ₹15,000–₹25,000/month"
                  required
                />
              </div>

              <div>
                <label htmlFor="employment_type" className={labelClass}>
                  Employment Type *
                </label>
                <select
                  id="employment_type"
                  name="employment_type"
                  value={formData.employment_type}
                  onChange={handleChange}
                  className={inputClass}
                  required
                >
                  <option value="Full-time">Full-time</option>
                  <option value="Part-time">Part-time</option>
                  <option value="Internship">Internship</option>
                  <option value="Contract">Contract</option>
                </select>
              </div>

              <div>
                <label htmlFor="openings" className={labelClass}>
                  Number of Openings *
                </label>
                <input
                  id="openings"
                  name="openings"
                  type="number"
                  min="1"
                  value={formData.openings}
                  onChange={handleChange}
                  className={inputClass}
                  required
                />
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={loading}
                className="rounded-xl bg-blue-700 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? 'Posting...' : 'Post Vacancy'}
              </button>
            </div>

          </div>
        </form>
      </div>
    </div>
  );
}

export default PostVacancies;
