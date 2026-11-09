import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../../services/api';

const CourseConfiguration = () => {
  const { eligibilityId } = useParams();
  const navigate = useNavigate();

  const [jobRole, setJobRole] = useState('');
  const [courseType, setCourseType] = useState('Coding');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (jobRole.trim().length < 2) {
      setError('Please enter a valid job role.');
      return;
    }

    try {
      setLoading(true);
      setError('');

      await api.post(
        `/employee/training-eligibilities/${eligibilityId}/course`,
        {
          job_role: jobRole.trim(),
          course_type: courseType,
        }
      );

      navigate('/employee/training-eligibilities', {
        state: {
          success: 'Training course created. Part 1 generation has started.',
        },
      });
    } catch (err) {
      setError(
        err.response?.data?.detail || 'Failed to create training course.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-[calc(100vh-76px)] bg-slate-50 px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-2xl">

        <Link
          to="/employee/training-eligibilities"
          className="text-sm font-semibold text-blue-700 hover:text-blue-800"
        >
          ← Back to Training Eligible Students
        </Link>

        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">

          <h1 className="text-2xl font-bold text-slate-800">
            Course Configuration
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Configure the training course for the approved student.
          </p>

          {error && (
            <div className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-7 space-y-6">

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Job Role
              </label>

              <input
                type="text"
                value={jobRole}
                onChange={(e) => setJobRole(e.target.value)}
                placeholder="Example: Python Developer"
                maxLength={150}
                required
                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Course Type
              </label>

              <select
                value={courseType}
                onChange={(e) => setCourseType(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="Coding">Coding</option>
                <option value="Non-Coding">Non-Coding</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-blue-700 px-5 py-3 font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Creating Course...' : 'Post Course'}
            </button>

          </form>
        </div>
      </div>
    </main>
  );
};

export default CourseConfiguration;