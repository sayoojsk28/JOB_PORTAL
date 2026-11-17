
import { useEffect, useState } from 'react';
import api from '../../services/api';

export default function StudentMockInterviewResults() {
  const [results, setResults] = useState([]);
  const [selectedResult, setSelectedResult] = useState(null);
  const [report, setReport] = useState(null);

  const [loading, setLoading] = useState(true);
  const [reportLoading, setReportLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchResults();
  }, []);

  const fetchResults = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await api.get(
        '/student/mock-interview-results'
      );

      setResults(response.data);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        'Failed to load mock interview results.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (interviewId) => {
    try {
      setReportLoading(true);
      setError('');
      setSelectedResult(interviewId);
      setReport(null);

      const response = await api.get(
        `/student/mock-interview-results/${interviewId}`
      );

      setReport(response.data);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        'Failed to load interview report.'
      );
      setSelectedResult(null);
    } finally {
      setReportLoading(false);
    }
  };

  const handleBack = () => {
    setSelectedResult(null);
    setReport(null);
    setError('');
  };

  const formatDate = (date) => {
    if (!date) return '—';

    return new Date(date).toLocaleString();
  };

  const formatMetric = (value, suffix = '') => {
    if (value === null || value === undefined) return '—';

    return `${value}${suffix}`;
  };

  const statusStyle = (status) => {
    return status === 'Passed'
      ? 'bg-green-100 text-green-700'
      : 'bg-red-100 text-red-700';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-600">
          Loading mock interview results...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-5 py-8 sm:px-8">
      <div className="mx-auto max-w-7xl">

        {/* REPORT DETAILS VIEW */}
        {selectedResult !== null ? (
          <>
            <button
              onClick={handleBack}
              className="mb-6 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              ← Back to Results
            </button>

            {reportLoading ? (
              <div className="rounded-xl bg-white p-10 text-center shadow-sm">
                <p className="text-slate-600">
                  Loading your detailed AI evaluation report...
                </p>
              </div>
            ) : report ? (
              <>
                {/* REPORT HEADER */}
                <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
                    <div>
                      <h1 className="text-2xl font-bold text-slate-800">
                        Mock Interview Report
                      </h1>

                      <p className="mt-2 text-slate-500">
                        {report.job_role} · {report.course_type}
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        Attempt {report.attempt_number}
                      </p>
                    </div>

                    <div className="text-left sm:text-right">
                      <p className="text-sm text-slate-500">
                        Final Score
                      </p>

                      <p className="text-3xl font-bold text-slate-800">
                        {report.total_score}/100
                      </p>

                      <span
                        className={`mt-2 inline-block rounded-full px-4 py-1 text-sm font-semibold ${statusStyle(report.status)}`}
                      >
                        {report.status}
                      </span>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-4 border-t border-slate-100 pt-5 sm:grid-cols-2">
                    <div>
                      <p className="text-xs text-slate-500">
                        Passing Score
                      </p>
                      <p className="mt-1 font-semibold text-slate-800">
                        {report.passing_score}/100
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-500">
                        Completed At
                      </p>
                      <p className="mt-1 font-semibold text-slate-800">
                        {formatDate(report.completed_at)}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-500">
                        Published At
                      </p>
                      <p className="mt-1 font-semibold text-slate-800">
                        {formatDate(report.published_at)}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-500">
                        Questions Evaluated
                      </p>
                      <p className="mt-1 font-semibold text-slate-800">
                        {report.questions?.length || 0}
                      </p>
                    </div>
                  </div>
                </div>

                {/* QUESTION-WISE REPORT */}
                <div className="mb-5">
                  <h2 className="text-xl font-bold text-slate-800">
                    Question-wise Evaluation
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Review your answers and AI-generated feedback.
                  </p>
                </div>

                <div className="space-y-6">
                  {report.questions?.map((question) => (
                    <div
                      key={question.question_number}
                      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                    >
                      <div className="border-b border-slate-100 bg-slate-50 p-5">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                              Question {question.question_number}
                            </span>

                            <span className="ml-3 rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                              {question.question_type}
                            </span>
                          </div>

                          <p className="font-bold text-slate-800">
                            {question.score ?? '—'}/100
                          </p>
                        </div>

                        <h3 className="mt-3 font-semibold leading-relaxed text-slate-800">
                          {question.question_text}
                        </h3>
                      </div>

                      <div className="space-y-5 p-5">

                        {/* STUDENT ANSWER */}
                        <div>
                          <h4 className="mb-2 text-sm font-semibold text-slate-700">
                            Your Answer
                          </h4>

                          <div className="rounded-xl bg-slate-50 p-4 text-sm leading-relaxed text-slate-700">
                            {question.answer_transcript || 'No answer available.'}
                          </div>
                        </div>

                        {/* AI SCORE BREAKDOWN */}
                        <div>
                          <h4 className="mb-3 text-sm font-semibold text-slate-700">
                            AI Evaluation Breakdown
                          </h4>

                          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                            {[
                              {
                                label: 'Technical Correctness',
                                value: question.evaluation?.technical_correctness,
                                max: 40,
                              },
                              {
                                label: 'Relevance',
                                value: question.evaluation?.relevance,
                                max: 20,
                              },
                              {
                                label: 'Technical Depth',
                                value: question.evaluation?.technical_depth,
                                max: 20,
                              },
                              {
                                label: 'Explanation Clarity',
                                value: question.evaluation?.explanation_clarity,
                                max: 10,
                              },
                            ].map((item) => (
                              <div
                                key={item.label}
                                className="rounded-xl border border-slate-200 p-4"
                              >
                                <p className="text-xs text-slate-500">
                                  {item.label}
                                </p>

                                <p className="mt-2 text-lg font-bold text-slate-800">
                                  {item.value ?? '—'}
                                  <span className="text-sm font-normal text-slate-400">
                                    /{item.max}
                                  </span>
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* AI FEEDBACK */}
                        <div>
                          <h4 className="mb-2 text-sm font-semibold text-slate-700">
                            AI Feedback
                          </h4>

                          <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm leading-relaxed text-slate-700">
                            {question.feedback || 'No feedback available.'}
                          </div>
                        </div>

                        {/* SPEECH METRICS */}
                        <div>
                          <h4 className="mb-3 text-sm font-semibold text-slate-700">
                            Speech Analysis
                          </h4>

                          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                            {[
                              {
                                label: 'First Response',
                                value: formatMetric(
                                  question.first_response_seconds,
                                  ' sec'
                                ),
                              },
                              {
                                label: 'Answer Duration',
                                value: formatMetric(
                                  question.answer_duration_seconds,
                                  ' sec'
                                ),
                              },
                              {
                                label: 'Total Pause',
                                value: formatMetric(
                                  question.total_pause_seconds,
                                  ' sec'
                                ),
                              },
                              {
                                label: 'Longest Pause',
                                value: formatMetric(
                                  question.longest_pause_seconds,
                                  ' sec'
                                ),
                              },
                              {
                                label: 'Repetitions',
                                value: formatMetric(
                                  question.repetition_count
                                ),
                              },
                            ].map((metric) => (
                              <div
                                key={metric.label}
                                className="rounded-xl bg-slate-50 p-3"
                              >
                                <p className="text-xs text-slate-500">
                                  {metric.label}
                                </p>

                                <p className="mt-2 text-sm font-semibold text-slate-800">
                                  {metric.value}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>

                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : null}
          </>
        ) : (

          /* RESULTS LIST VIEW */
          <>
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-slate-800 sm:text-3xl">
                Mock Interview Results
              </h1>

              <p className="mt-2 text-sm text-slate-500">
                View your published AI mock interview results and detailed feedback.
              </p>
            </div>

            {error && (
              <div className="mb-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">
                {error}
              </div>
            )}

            {results.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
                <div className="text-4xl">🎯</div>

                <h2 className="mt-4 text-lg font-semibold text-slate-800">
                  No Published Results Yet
                </h2>

                <p className="mt-2 text-sm text-slate-500">
                  Your mock interview results will appear here after your employee publishes them.
                </p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[850px] text-left text-sm">
                    <thead className="bg-slate-100 text-slate-600">
                      <tr>
                        <th className="px-5 py-4">Course</th>
                        <th className="px-5 py-4">Attempt</th>
                        <th className="px-5 py-4">Final Mark</th>
                        <th className="px-5 py-4">Status</th>
                        <th className="px-5 py-4">Completed At</th>
                        <th className="px-5 py-4">Action</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {results.map((item) => (
                        <tr
                          key={item.interview_id}
                          className="hover:bg-slate-50"
                        >
                          <td className="px-5 py-4">
                            <p className="font-semibold text-slate-800">
                              {item.job_role}
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              {item.course_type}
                            </p>
                          </td>

                          <td className="px-5 py-4">
                            {item.attempt_number}
                          </td>

                          <td className="px-5 py-4 font-semibold text-slate-800">
                            {item.total_score}/100
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyle(item.status)}`}
                            >
                              {item.status}
                            </span>
                          </td>

                          <td className="px-5 py-4 text-slate-600">
                            {formatDate(item.completed_at)}
                          </td>

                          <td className="px-5 py-4">
                            <button
                              onClick={() => handleViewDetails(item.interview_id)}
                              className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white transition hover:bg-blue-700"
                            >
                              View Details
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

      </div>
    </div>
  );
}
