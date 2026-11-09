
import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import api from '../../services/api';

const TrainingEligibleStudents = () => {
  const [eligibilities, setEligibilities] = useState([]);
  const [currentEmployeeId, setCurrentEmployeeId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(null);
  const [success, setSuccess] = useState('');

  const location = useLocation();
  const navigate = useNavigate();

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');

      const [employeeResponse, eligibilityResponse] = await Promise.all([
        api.get('/auth/me'),
        api.get('/employee/training-eligibilities'),
      ]);

      setCurrentEmployeeId(Number(employeeResponse.data.id));
      setEligibilities(eligibilityResponse.data);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        'Failed to load training eligible students.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    if (location.state?.success) {
      setSuccess(location.state.success);
      navigate(location.pathname, { replace: true, state: null });
    }
  }, []);

  const handleClaim = async (eligibilityId) => {
    try {
      setActionLoading(eligibilityId);
      setError('');
      setSuccess('');

      await api.patch(
        `/employee/training-eligibilities/${eligibilityId}/claim`
      );

      setSuccess('Eligibility claimed successfully.');
      await fetchData();
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        'Failed to claim eligibility.'
      );
      await fetchData();
    } finally {
      setActionLoading(null);
    }
  };

  const handleApprove = async (eligibilityId) => {
    try {
      setActionLoading(eligibilityId);
      setError('');

      await api.patch(
        `/employee/training-eligibilities/${eligibilityId}/approve`
      );

      window.alert('Course Approved');

      await fetchData();
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        'Failed to approve eligibility.'
      );
      await fetchData();
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (eligibilityId) => {
    const confirmed = window.confirm(
      'Are you sure you want to reject this training eligibility?'
    );

    if (!confirmed) return;

    try {
      setActionLoading(eligibilityId);
      setError('');
      setSuccess('');

      await api.patch(
        `/employee/training-eligibilities/${eligibilityId}/reject`
      );

      setSuccess('Training eligibility rejected successfully.');
      await fetchData();
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        'Failed to reject eligibility.'
      );
      await fetchData();
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case 'Pending':
        return 'bg-amber-100 text-amber-700';
      case 'Approved':
        return 'bg-emerald-100 text-emerald-700';
      case 'Rejected':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 p-8 text-center">
        <p className="text-slate-500">
          Loading training eligibilities...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-76px)] bg-slate-50 px-4 py-8 sm:px-8 sm:py-10">
      <div className="mx-auto max-w-7xl">

        <div className="mb-8">
          <Link
            to="/employee/dashboard"
            className="text-sm font-semibold text-blue-700 hover:text-blue-800"
          >
            ← Back to Dashboard
          </Link>

          <h1 className="mt-5 text-2xl font-bold text-slate-800 sm:text-3xl">
            Training Eligible Students
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Review eligible students and manage their training approval.
          </p>
        </div>

        {success && (
          <div className="mb-5 rounded-lg bg-emerald-50 p-4 text-sm text-emerald-700">
            {success}
          </div>
        )}

        {error && (
          <div className="mb-5 rounded-lg bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[1050px] text-left text-sm">

            <thead className="bg-slate-100 text-xs uppercase text-slate-600">
              <tr>
                <th className="px-5 py-4">Eligibility ID</th>
                <th className="px-5 py-4">Student</th>
                <th className="px-5 py-4">Email</th>
                <th className="px-5 py-4">Rejected Applications</th>
                <th className="px-5 py-4">Cycle</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">

              {eligibilities.map((item) => {
                const isClaimedByMe =
                  Number(item.claimed_by) === currentEmployeeId;

                const isClaimedByOther =
                  item.claimed_by != null &&
                  !isClaimedByMe;

                const isPending = item.status === 'Pending';
                const isApproved = item.status === 'Approved';
                const isRejected = item.status === 'Rejected';

                return (
                  <tr
                    key={item.eligibility_id}
                    className="hover:bg-slate-50"
                  >

                    <td className="px-5 py-4 font-medium text-slate-700">
                      #{item.eligibility_id}
                    </td>

                    <td className="px-5 py-4 font-semibold text-slate-900">
                      {item.student_name}
                    </td>

                    <td className="px-5 py-4">
                      {item.student_email}
                    </td>

                    <td className="px-5 py-4">
                      {item.rejected_application_count}
                    </td>

                    <td className="px-5 py-4">
                      {item.cycle_number}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusStyle(item.status)}`}
                      >
                        {item.status}
                      </span>

                      {isClaimedByOther && isPending && (
                        <p className="mt-1 text-xs text-slate-500">
                          Claimed by another employee
                        </p>
                      )}
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-2">

                        {isPending && item.claimed_by == null && (
                          <button
                            onClick={() => handleClaim(item.eligibility_id)}
                            disabled={actionLoading === item.eligibility_id}
                            className="rounded-lg bg-blue-700 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
                          >
                            {actionLoading === item.eligibility_id
                              ? 'Claiming...'
                              : 'Claim'}
                          </button>
                        )}

                        {isPending && isClaimedByMe && (
                          <>
                            <button
                              onClick={() => handleApprove(item.eligibility_id)}
                              disabled={actionLoading === item.eligibility_id}
                              className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                            >
                              Approve
                            </button>

                            <button
                              onClick={() => handleReject(item.eligibility_id)}
                              disabled={actionLoading === item.eligibility_id}
                              className="rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                            >
                              {actionLoading === item.eligibility_id
                                ? 'Processing...'
                                : 'Reject'}
                            </button>
                          </>
                        )}

                        {isApproved && item.can_add_course_details && (
                          <button
                            onClick={() =>
                              navigate(
                                `/employee/training-eligibilities/${item.eligibility_id}/course`
                              )
                            }
                            className="rounded-lg bg-blue-700 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-800"
                          >
                            Add Course Details
                          </button>
                        )}

                        {isApproved && item.course_id && (
                          <span className="text-xs font-medium text-emerald-700">
                            Course Created
                          </span>
                        )}

                        {isApproved &&
                          !item.can_add_course_details &&
                          !item.course_id && (
                            <span className="text-xs font-medium text-emerald-700">
                              Approved
                            </span>
                          )}

                        {isRejected && (
                          <span className="text-xs font-medium text-red-700">
                            Rejected
                          </span>
                        )}

                        {isClaimedByOther && isPending && (
                          <span className="text-xs text-slate-500">
                            Unavailable
                          </span>
                        )}

                      </div>
                    </td>
                  </tr>
                );
              })}

            </tbody>
          </table>

          {eligibilities.length === 0 && (
            <p className="py-12 text-center text-slate-500">
              No training eligible students found.
            </p>
          )}

        </div>
      </div>
    </main>
  );
};

export default TrainingEligibleStudents;
