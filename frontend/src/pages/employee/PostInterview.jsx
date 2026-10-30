
import { useState } from 'react';
import api from '../../services/api';
import { useNavigate } from 'react-router-dom';
import { useLocation } from 'react-router-dom';

const PostInterview = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const applicationId = location.state?.application_id;
    const [formData, setFormData] = useState({
    interview_date: '',
    interview_time: '',
    mode: 'Online',
    meeting_link_or_venue: '',
    notes: '',
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

    try {
      setLoading(true);

      const payload = {
  ...formData,
  application_id: Number(applicationId),
};

      await api.post('/employee/interviews', payload);

      window.alert('Interview posted successfully!');
      navigate('/employee/interviews');

      setFormData({
        application_id: '',
        interview_date: '',
        interview_time: '',
        mode: 'Online',
        meeting_link_or_venue: '',
        notes: '',
      });

    } catch (err) {
      console.error('Interview posting error:', err);

      window.alert(
        err.response?.data?.detail ||
        'Unable to post interview. Please try again.'
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
            Post Interview
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Add interview details for a selected student application.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
        >

          

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Interview Date
              </label>

              <input
                type="date"
                name="interview_date"
                value={formData.interview_date}
                onChange={handleChange}
                required
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Interview Time
              </label>

              <input
                type="time"
                name="interview_time"
                value={formData.interview_time}
                onChange={handleChange}
                required
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Interview Mode
            </label>

            <select
              name="mode"
              value={formData.mode}
              onChange={handleChange}
              required
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="Online">Online</option>
              <option value="Offline">Offline</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Meeting Link / Venue
            </label>

            <input
              type="text"
              name="meeting_link_or_venue"
              value={formData.meeting_link_or_venue}
              onChange={handleChange}
              required
              placeholder="Enter meeting link or interview venue"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Additional Notes (Optional)
            </label>

            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows="4"
              placeholder="Enter any additional interview instructions..."
              className="w-full resize-none rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Posting Interview...' : 'Post Interview'}
          </button>

        </form>
      </div>
    </div>
  );
};

export default PostInterview;
