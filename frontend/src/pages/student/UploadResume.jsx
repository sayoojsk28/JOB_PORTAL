
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../services/api';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { useNavigate } from 'react-router-dom';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

function UploadResume() {
  const { vacancyId } = useParams();

  const [vacancy, setVacancy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [resumeFile, setResumeFile] = useState(null);
  const [numPages, setNumPages] = useState(null);
  const [previewError, setPreviewError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchVacancy = async () => {
      try {
        setLoading(true);
        setError('');

        const response = await api.get('/student/vacancies');

        const selectedVacancy = response.data.find(
          (item) => String(item.id) === String(vacancyId)
        );

        if (!selectedVacancy) {
          setError('Vacancy not found.');
          return;
        }

        setVacancy(selectedVacancy);
      } catch (err) {
  console.error('Vacancy fetch error:', err);
  setError(
    err.response?.data?.detail ||
    err.message ||
    'Unable to load vacancy details.'
  );
} finally {
        setLoading(false);
      }
    };

    fetchVacancy();
  }, [vacancyId]);

  if (loading) {
    return <div className="p-8 text-center">Loading job details...</div>;
  }

  if (error) {
    return <div className="p-8 text-center text-red-600">{error}</div>;
  }

  if (!vacancy) {
    return null;
  }

  
return (
  <main className="mx-auto w-full max-w-[1400px] px-5 py-10 sm:px-8 lg:px-10">
    <section className="w-full">
      <h1 className="mb-5 border-b border-slate-200 pb-3 text-3xl font-bold tracking-tight text-slate-900">
        About the Job Role
      </h1>

      <p className="w-full whitespace-pre-line text-base leading-8 text-slate-700">
        {vacancy.description || 'No job description provided.'}
      </p>
    </section>

    
{/* Resume Upload and Preview */}
<section className="mt-12 border-t border-slate-200 pt-8">
  <div className="mb-6">
    <h2 className="text-2xl font-bold text-slate-900">
      Your Resume
    </h2>
    <p className="mt-2 text-sm leading-6 text-slate-500">
      Upload your resume, review the document, and send it for this job application.
      PDF files only.
    </p>
  </div>

  <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
    {/* A4 Preview */}
    <div className="flex justify-center rounded-2xl border border-slate-200 bg-slate-100 p-4 sm:p-8">
      <div className="relative flex aspect-[210/297] w-full max-w-[480px] flex-col overflow-hidden bg-white shadow-xl ring-1 ring-slate-200">
        {resumeFile ? (
          <Document
            file={resumeFile}
            onLoadSuccess={({ numPages }) => {
              setNumPages(numPages);
              setPreviewError('');
            }}
            onLoadError={() => {
              setPreviewError('Unable to preview this PDF. Please choose a valid PDF file.');
              setNumPages(null);
            }}
            loading={
              <div className="flex h-full items-center justify-center p-6 text-sm text-slate-500">
                Preparing preview...
              </div>
            }
            error={
              <div className="flex h-full items-center justify-center p-6 text-center text-sm text-red-600">
                Could not load this PDF.
              </div>
            }
            className="flex h-full flex-col items-center"
          >
            <Page
              pageNumber={1}
              width={460}
              renderTextLayer={false}
              renderAnnotationLayer={false}
              className="max-w-full"
            />
          </Document>
        ) : (
          <>
            <div className="h-3 bg-blue-700" />

            <div className="flex flex-1 flex-col p-6 sm:p-9">
              <div className="border-b-2 border-slate-200 pb-5">
                <div className="mb-3 h-3 w-2/5 rounded bg-slate-800" />
                <div className="h-2 w-3/5 rounded bg-slate-300" />
                <div className="mt-2 h-2 w-1/2 rounded bg-slate-200" />
              </div>

              <div className="mt-7">
                <div className="mb-4 h-2 w-1/3 rounded bg-blue-200" />
                <div className="space-y-3">
                  <div className="h-2 w-full rounded bg-slate-100" />
                  <div className="h-2 w-full rounded bg-slate-100" />
                  <div className="h-2 w-4/5 rounded bg-slate-100" />
                </div>
              </div>

              <div className="mt-7">
                <div className="mb-4 h-2 w-2/5 rounded bg-blue-200" />
                <div className="space-y-3">
                  <div className="h-2 w-full rounded bg-slate-100" />
                  <div className="h-2 w-11/12 rounded bg-slate-100" />
                  <div className="h-2 w-3/4 rounded bg-slate-100" />
                </div>
              </div>

              <div className="mt-7">
                <div className="mb-4 h-2 w-1/4 rounded bg-blue-200" />
                <div className="space-y-3">
                  <div className="h-2 w-full rounded bg-slate-100" />
                  <div className="h-2 w-4/5 rounded bg-slate-100" />
                </div>
              </div>

              <div className="mt-auto border-t border-slate-100 pt-4">
                <p className="text-center text-[10px] tracking-widest text-slate-300">
                  YOUR RESUME PREVIEW
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>

    {/* Upload Controls */}
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
        <icon name="file-up" size="xl" />
      </div>

      <h3 className="text-lg font-semibold text-slate-900">
        Upload your resume
      </h3>

      <p className="mt-2 text-sm leading-6 text-slate-500">
        Choose a PDF file to preview the first page before sending it.
      </p>

      <input
        id="resume-file"
        type="file"
        accept=".pdf,application/pdf"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];

          if (!file) return;

          setPreviewError('');
          setNumPages(null);

          if (
            file.type !== 'application/pdf' &&
            !file.name.toLowerCase().endsWith('.pdf')
          ) {
            setResumeFile(null);
            setPreviewError('Please select a PDF file.');
            return;
          }

          setResumeFile(file);
        }}
      />

      <label
        htmlFor="resume-file"
        className="mt-6 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-blue-700 px-4 py-3 text-sm font-semibold text-blue-700 transition hover:bg-blue-50"
      >
        <icon name="upload" size="sm" />
        Upload for preview
      </label>

      {resumeFile && (
        <div className="mt-4 break-words rounded-lg bg-slate-50 p-3">
          <p className="text-xs font-medium text-slate-500">
            Selected file
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-800">
            {resumeFile.name}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {(resumeFile.size / (1024 * 1024)).toFixed(2)} MB
          </p>
          {numPages && (
            <p className="mt-2 text-xs text-emerald-700">
              Preview ready · {numPages} page(s)
            </p>
          )}
        </div>
      )}

      {previewError && (
        <p role="alert" className="mt-3 text-sm text-red-600">
          {previewError}
        </p>
      )}

      <button
        type="button"
        disabled={!resumeFile || !numPages || !!previewError}
        onClick={() => {
          window.alert('Resume sent!');
          navigate('/student/vacancies');
        }}
        className="mt-4 w-full rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
      >
        Send resume
      </button>

      <p className="mt-3 text-center text-xs leading-5 text-slate-400">
        Review your resume before sending.
      </p>
    </div>
  </div>
</section>

  </main>
);

}

export default UploadResume;
