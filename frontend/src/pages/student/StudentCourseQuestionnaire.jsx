
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';

function StudentCourseQuestionnaire() {
  const { courseId } = useParams();
  const navigate = useNavigate();

  const [questionnaire, setQuestionnaire] = useState(null);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [generating, setGenerating] = useState(false);
  const [generationError, setGenerationError] = useState('');
  const [pdfUrl, setPdfUrl] = useState('');
  const [submissionId, setSubmissionId] = useState(null);
  const [submissionExists, setSubmissionExists] = useState(false);

  const [completing, setCompleting] = useState(false);
  const [completionError, setCompletionError] = useState('');

  // Load questionnaire and recover existing submission after refresh
  useEffect(() => {
    let cancelled = false;

    const fetchQuestionnaire = async () => {
      try {
        setLoading(true);

        const response = await api.get(
          `/student/training-courses/${courseId}/questionnaire`
        );

        if (cancelled) return;

        setQuestionnaire(response.data);

        // Check whether a submission already exists
        const submissionResponse = await api.get(
          `/student/training-courses/${courseId}/submission`
        );

        if (cancelled) return;

        if (submissionResponse.data.exists) {
          setSubmissionExists(true);
          setSubmissionId(submissionResponse.data.submission_id);

          // Retrieve the previously generated PDF
          try {
            const pdfResponse = await api.get(
              submissionResponse.data.pdf_url,
              {
                responseType: 'blob'
              }
            );

            if (cancelled) return;

            const blob = new Blob(
              [pdfResponse.data],
              { type: 'application/pdf' }
            );

            const objectUrl = URL.createObjectURL(blob);
            setPdfUrl(objectUrl);

          } catch (pdfErr) {
            if (!cancelled) {
              setGenerationError(
                'Your submission exists, but the PDF could not be retrieved. Please refresh and try again.'
              );
            }
          }
        }

      } catch (err) {
        if (!cancelled) {
          setError(
            err.response?.data?.detail ||
            'Failed to load questionnaire.'
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchQuestionnaire();

    return () => {
      cancelled = true;
    };
  }, [courseId]);

  // Clean up generated PDF URL
  useEffect(() => {
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl]);

  const handleAnswerChange = (questionId, value) => {
    setAnswers((previous) => ({
      ...previous,
      [questionId]: value
    }));
  };

  const totalQuestions = questionnaire?.questions?.length || 0;

  const answeredQuestions = questionnaire?.questions?.filter(
    (question) => answers[question.id]?.trim()
  ).length || 0;

  const allAnswered =
    totalQuestions === 20 &&
    answeredQuestions === totalQuestions;

  // Generate PDF
  const handleGeneratePDF = async () => {
    if (
      !allAnswered ||
      generating ||
      pdfUrl ||
      submissionExists
    ) {
      return;
    }

    setGenerating(true);
    setGenerationError('');

    try {
      const submissionAnswers = questionnaire.questions.map(
        (question) => ({
          question_id: question.id,
          answer: answers[question.id].trim()
        })
      );

      const response = await api.post(
        `/student/training-courses/${courseId}/generate-pdf`,
        {
          answers: submissionAnswers
        }
      );

      setSubmissionId(response.data.submission_id);
      setSubmissionExists(true);

      // Fetch authenticated PDF
      const pdfResponse = await api.get(
        response.data.pdf_url,
        {
          responseType: 'blob'
        }
      );

      const blob = new Blob(
        [pdfResponse.data],
        { type: 'application/pdf' }
      );

      const objectUrl = URL.createObjectURL(blob);

      setPdfUrl(objectUrl);

    } catch (err) {
      setGenerationError(
        err.response?.data?.detail ||
        'Failed to generate PDF. Please try again.'
      );
    } finally {
      setGenerating(false);
    }
  };

  // Complete course
  const handleCompleteCourse = async () => {
    if (completing || !pdfUrl) return;

    setCompleting(true);
    setCompletionError('');

    try {
      await api.post(
        `/student/training-courses/${courseId}/complete`
      );

      navigate('/student/training-courses');

    } catch (err) {
      setCompletionError(
        err.response?.data?.detail ||
        'Failed to complete the course. Please try again.'
      );
    } finally {
      setCompleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-sm font-medium text-slate-500">
          Loading questionnaire...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-4xl rounded-xl border border-red-200 bg-red-50 p-5 text-red-600">
          {error}

          <button
            onClick={() => navigate('/student/training-courses')}
            className="mt-4 block font-semibold text-blue-700"
          >
            Back to Courses
          </button>
        </div>
      </div>
    );
  }

  if (!questionnaire || totalQuestions === 0) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-4xl rounded-xl bg-white p-8 text-center shadow-sm">
          <p className="text-slate-600">
            No questions available for this course.
          </p>

          <button
            onClick={() => navigate('/student/training-courses')}
            className="mt-4 font-semibold text-blue-700"
          >
            Back to Courses
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-5xl">

        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/student/training-courses')}
            className="mb-5 text-sm font-semibold text-blue-700 hover:text-blue-900"
          >
            ← Back to Courses
          </button>

          <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-blue-700">
            AI Training Programme
          </p>

          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Course Questionnaire
          </h1>

          <p className="mt-2 text-slate-500">
            Answer all the questions below carefully.
          </p>

          <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="font-semibold text-slate-800">
                Course ID: #{questionnaire.course_id}
              </p>

              <p className="text-sm font-semibold text-blue-700">
                {answeredQuestions} / {totalQuestions} Answered
              </p>
            </div>

            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-blue-600 transition-all duration-300"
                style={{
                  width: `${(answeredQuestions / totalQuestions) * 100}%`
                }}
              />
            </div>
          </div>
        </div>

        {/* Questions */}
        <div className="space-y-5">
          {questionnaire.questions.map((question) => (
            <article
              key={question.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
            >
              <div className="mb-4 flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-sm font-bold text-blue-700">
                  {question.question_number}
                </span>

                <h2 className="pt-1 text-base font-semibold leading-relaxed text-slate-800">
                  {question.question_text}
                </h2>
              </div>

              <textarea
                value={answers[question.id] || ''}
                onChange={(e) =>
                  handleAnswerChange(question.id, e.target.value)
                }
                disabled={
                  generating ||
                  !!pdfUrl ||
                  submissionExists
                }
                rows={5}
                placeholder="Write your answer here..."
                className="w-full resize-y rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-70"
              />
            </article>
          ))}
        </div>

        {/* Generate PDF */}
        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="font-bold text-slate-900">
                Complete Your Questionnaire
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {pdfUrl
                  ? 'Your questionnaire report has been generated.'
                  : submissionExists
                    ? 'Your existing submission is being recovered.'
                    : allAnswered
                      ? 'All questions have been answered.'
                      : `Please answer all ${totalQuestions} questions to continue.`}
              </p>
            </div>

            {!pdfUrl && !submissionExists && (
              <button
                type="button"
                onClick={handleGeneratePDF}
                disabled={!allAnswered || generating}
                className={`rounded-xl px-6 py-3 text-sm font-semibold transition ${
                  allAnswered && !generating
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'cursor-not-allowed bg-slate-200 text-slate-500'
                }`}
              >
                {generating ? 'Generating PDF...' : 'Generate PDF'}
              </button>
            )}
          </div>

          {generating && (
            <p className="mt-4 text-sm text-blue-700">
              AI is analysing your answers and generating your report.
              Please wait...
            </p>
          )}

          {generationError && (
            <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
              {generationError}
            </p>
          )}

          {/* Generated or recovered PDF */}
          {pdfUrl && (
            <div className="mt-6 border-t border-slate-200 pt-5">
              <div className="rounded-xl bg-green-50 p-4">
                <p className="font-semibold text-green-800">
                  PDF Generated Successfully!
                </p>

                <p className="mt-1 text-sm text-green-700">
                  Your questionnaire answers and AI report are ready.
                </p>

                <a
                  href={pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center gap-2 font-semibold text-blue-700 underline hover:text-blue-900"
                >
                  View Generated PDF ↗
                </a>

                <p className="mt-2 text-xs text-slate-500">
                  Submission ID: #{submissionId}
                </p>

                <button
                  type="button"
                  onClick={handleCompleteCourse}
                  disabled={completing}
                  className={`mt-5 w-full rounded-xl px-6 py-3 text-sm font-semibold transition ${
                    completing
                      ? 'cursor-not-allowed bg-slate-300 text-slate-500'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  {completing
                    ? 'Completing Course...'
                    : 'Complete Course'}
                </button>

                {completionError && (
                  <p className="mt-3 text-sm text-red-600">
                    {completionError}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

export default StudentCourseQuestionnaire;
