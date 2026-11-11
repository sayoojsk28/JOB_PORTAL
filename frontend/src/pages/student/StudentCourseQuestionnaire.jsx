
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

  useEffect(() => {
    const fetchQuestionnaire = async () => {
      try {
        const response = await api.get(
          `/student/training-courses/${courseId}/questionnaire`
        );

        setQuestionnaire(response.data);
      } catch (err) {
        setError(
          err.response?.data?.detail ||
          'Failed to load questionnaire.'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchQuestionnaire();
  }, [courseId]);

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
    totalQuestions > 0 && answeredQuestions === totalQuestions;

  const handleGeneratePDF = () => {
    if (!allAnswered) return;

    // PDF generation will be implemented later.
    console.log('Questionnaire Answers:', answers);
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
                rows={5}
                placeholder="Write your answer here..."
                className="w-full resize-y rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
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
                {allAnswered
                  ? 'All questions have been answered.'
                  : `Please answer all ${totalQuestions} questions to continue.`}
              </p>
            </div>

            <button
              type="button"
              onClick={handleGeneratePDF}
              disabled={!allAnswered}
              className={`rounded-xl px-6 py-3 text-sm font-semibold transition ${
                allAnswered
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'cursor-not-allowed bg-slate-200 text-slate-500'
              }`}
            >
              Generate PDF
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

export default StudentCourseQuestionnaire;
