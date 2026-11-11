import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

function StudentTrainingCourses() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const response = await api.get('/student/training-courses');
        console.log("COURSE API RESPONSE:", response.data);

        setCourses(
  Array.isArray(response.data)
    ? response.data
    : response.data.courses || []
);
      } catch (err) {
        setError(
          err.response?.data?.detail ||
            'Failed to load training courses.'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-sm font-medium text-slate-500">
          Loading your courses...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-600">
          {typeof error === 'string' ? error : JSON.stringify(error)}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">

        {/* Page heading */}
        <div className="mb-8">
          <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-blue-700">
            AI Training Programme
          </p>

          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                View Courses
              </h1>

              <p className="mt-2 text-slate-500">
                Explore your assigned training courses and improve your job skills.
              </p>
            </div>

            <div className="inline-flex w-fit items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-xl">
                📚
              </span>

              <div>
                <p className="text-xs text-slate-500">
                  Available courses
                </p>
                <p className="text-xl font-bold text-slate-900">
                  {courses.length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Empty state */}
        {courses.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-3xl">
              📚
            </div>

            <h2 className="text-lg font-semibold text-slate-800">
              No training courses available
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Your assigned training courses will appear here once they are approved.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">
                Your training courses
              </h2>

              <p className="text-sm text-slate-500">
                {courses.length} course(s)
              </p>
            </div>

            {/* Course cards */}
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              {courses.map((course) => (
                <article
                  key={course.course_id}
                  className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition duration-200 hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl hover:shadow-slate-200/60"
                >
                  <div className="h-1.5 bg-gradient-to-r from-blue-700 via-blue-500 to-cyan-400" />

                  <div className="p-5 sm:p-6">

                    {/* Course title */}
                    <div className="flex items-start gap-4">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-2xl">
                        💻
                      </div>

                      <div className="min-w-0 flex-1">
                        <h3 className="break-words text-lg font-bold text-slate-900 transition group-hover:text-blue-700">
                          {course.job_role}
                        </h3>

                        <p className="mt-1 text-sm text-slate-500">
                          Course ID: #{course.course_id}
                        </p>

                        <span className="mt-2 inline-flex rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                          {course.course_status || 'Active'}
                        </span>
                      </div>
                    </div>

                    {/* Course details */}
                    <div className="mt-5 flex flex-wrap gap-2">
                      <span className="rounded-lg bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700">
                        {course.course_type}
                      </span>

                      <span className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
                        📋 Enrollment #{course.enrollment_id}
                      </span>
                    </div>

                    {/* Enrollment information */}
                    <div className="mt-5 grid grid-cols-1 gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                          Enrolled on
                        </p>

                        <p className="mt-1 text-sm text-slate-700">
                          {course.enrolled_at
                            ? new Date(course.enrolled_at).toLocaleDateString()
                            : 'Not available'}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                          Progress status
                        </p>

                        <p className="mt-1 text-sm font-semibold text-blue-700">
                          {course.enrollment_status || 'Active'}
                        </p>
                      </div>
                    </div>

                    {/* Course action - content will be added later */}
                    <div className="mt-5 border-t border-slate-100 pt-4">
                      <button
  type="button"
  onClick={() =>
    navigate(`/student/training-courses/${course.course_id}`)
  }
  className="w-full rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
>
  Access Course
</button>
                    </div>

                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default StudentTrainingCourses;
