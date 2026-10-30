
import { useState } from 'react';
import api from '../../services/api';
import { useNavigate, useLocation } from 'react-router-dom';


const PostResult = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const interviewId = location.state?.interview_id;

  const [formData, setFormData] = useState({
    result: 'Selected',
    score: '',
    feedback: '',
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!interviewId) {
      window.alert('Interview ID is missing. Please select an interview first.');
      return;
    }

    try {
      setLoading(true);

      const payload = {
        interview_id: Number(interviewId),
        result: formData.result,
        score: formData.score === '' ? null : Number(formData.score),
        feedback: formData.feedback.trim() || null,
      };

      await api.post('/employee/interview-results', payload);

      window.alert('Interview result posted successfully!');

      navigate('/employee/interview-results');

    } catch (err) {
      console.error('Result posting error:', err);

      window.alert(
        err.response?.data?.detail ||
        'Unable to post result. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-2xl">

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-800">
            Post Interview Result
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Enter the result details received from the company.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
        >

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Interview Result
            </label>

            <select
              name="result"
              value={formData.result}
              onChange={handleChange}
              required
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="Selected">Selected</option>
              <option value="Rejected">Rejected</option>
              <option value="On Hold">On Hold</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Score (Optional)
            </label>

            <input
              type="number"
              step="any"
              name="score"
              value={formData.score}
              onChange={handleChange}
              placeholder="Enter score"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Feedback (Optional)
            </label>

            <textarea
              name="feedback"
              value={formData.feedback}
              onChange={handleChange}
              rows="4"
              placeholder="Enter company feedback..."
              className="w-full resize-none rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Posting Result...' : 'Post Result'}
          </button>

        </form>
      </div>
    </div>
  );
};

export default PostResult;
