
import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';

export default function MockInterview() {
  const { courseId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [evaluating, setEvaluating] = useState(false);

  const [error, setError] = useState('');
  const [interview, setInterview] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [messages, setMessages] = useState([]);
  const [transcript, setTranscript] = useState('');

  const [listening, setListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [evaluation, setEvaluation] = useState(null);

  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);

  const transcriptRef = useRef('');
  const submitOnEndRef = useRef(false);

  const questionShownAtRef = useRef(null);
  const firstResponseAtRef = useRef(null);
  const lastSpeechAtRef = useRef(null);

  const firstResponseRef = useRef(0);
  const answerDurationRef = useRef(0);
  const totalPauseRef = useRef(0);
  const longestPauseRef = useRef(0);

  // Check browser speech recognition support
  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechSupported(false);
    }
  }, []);

  // Scroll chat automatically
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: 'smooth'
    });
  }, [messages, listening, submitting]);

  // Load existing active interview after page refresh
  useEffect(() => {
    let cancelled = false;

    async function loadInterview() {
      try {
        const response = await api.get(
          `/student/training-courses/${courseId}/mock-interviews/active`
        );

        if (cancelled) return;

        if (!response.data.exists) {
          setLoading(false);
          return;
        }

        const data = response.data.interview;

        setInterview({
          interview_id: data.interview_id,
          attempt_number: data.attempt_number,
          passing_score: data.passing_score,
          total_questions: data.total_questions
        });

        const recoveredMessages = [];

        data.questions.forEach((question) => {
          recoveredMessages.push({
            role: 'assistant',
            content: question.question_text,
            questionNumber: question.question_number
          });

          if (question.answered) {
            recoveredMessages.push({
              role: 'user',
              content: question.answer_transcript
            });
          }
        });

        setMessages([
          {
            role: 'assistant',
            content: 'Welcome back! Your previous interview progress has been recovered.'
          },
          ...recoveredMessages
        ]);

        setCurrentQuestion(data.current_question);

        if (data.evaluation_pending) {
          setCurrentQuestion(null);
          setError('');
        }

      } catch (err) {
        if (!cancelled) {
          setError(
            err.response?.data?.detail ||
            'Failed to recover your interview.'
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadInterview();

    return () => {
      cancelled = true;
    };
  }, [courseId]);

  // Clean up speech recognition and voice
  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      window.speechSynthesis?.cancel();
    };
  }, []);

  // Speak AI question
  const speakQuestion = (text) => {
    if (!window.speechSynthesis) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);

    utterance.lang = 'en-IN';
    utterance.rate = 0.9;
    utterance.pitch = 1;

    window.speechSynthesis.speak(utterance);
  };

  // Display a new question
  const showQuestion = (question) => {
    setCurrentQuestion(question);
    setTranscript('');
    transcriptRef.current = '';

    questionShownAtRef.current = Date.now();
    firstResponseAtRef.current = null;
    lastSpeechAtRef.current = null;

    firstResponseRef.current = 0;
    answerDurationRef.current = 0;
    totalPauseRef.current = 0;
    longestPauseRef.current = 0;

    setMessages((previous) => [
      ...previous,
      {
        role: 'assistant',
        content: question.question_text,
        questionNumber: question.question_number
      }
    ]);

    speakQuestion(question.question_text);
  };

  // Start interview
  const handleStartInterview = async () => {
    if (starting) return;

    setStarting(true);
    setError('');

    try {
      // Request microphone permission first
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true
      });

      // We only need permission. Raw audio is not stored.
      stream.getTracks().forEach((track) => track.stop());

      const response = await api.post(
        `/student/training-courses/${courseId}/mock-interviews/start`
      );

      setInterview({
        interview_id: response.data.interview_id,
        attempt_number: response.data.attempt_number,
        passing_score: response.data.passing_score,
        total_questions: response.data.total_questions
      });

      setMessages([
        {
          role: 'assistant',
          content: `Your mock interview has started! Attempt ${response.data.attempt_number}. Please answer each question clearly.`
        }
      ]);

      showQuestion(response.data.current_question);

    } catch (err) {
      console.error('Interview start error:', err);

      if (err.name === 'NotAllowedError' ||
          err.name === 'PermissionDeniedError') {
        setError(
          'Microphone permission is required. Please allow microphone access in your browser settings.'
        );
      } else {
        setError(
          err.response?.data?.detail ||
          'Failed to start the mock interview.'
        );
      }
    } finally {
      setStarting(false);
    }
  };

  // Update transcript
  const updateTranscript = (value) => {
    transcriptRef.current = value;
    setTranscript(value);
  };

  // Start microphone and speech recognition
  const handleStartListening = () => {
    if (!speechSupported || listening || submitting) return;

    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    const recognition = new SpeechRecognition();

    recognitionRef.current = recognition;

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-IN';

    submitOnEndRef.current = false;

    recognition.onstart = () => {
      setListening(true);
    };

    recognition.onresult = (event) => {
      const now = Date.now();

      let fullTranscript = '';

      for (let i = 0; i < event.results.length; i++) {
        fullTranscript +=
          event.results[i][0].transcript + ' ';
      }

      updateTranscript(fullTranscript.trim());

      // Track approximate speech timing using final results
      for (
        let i = event.resultIndex;
        i < event.results.length;
        i++
      ) {
        if (event.results[i].isFinal) {
          if (!firstResponseAtRef.current) {
            firstResponseAtRef.current = now;

            firstResponseRef.current =
              questionShownAtRef.current
                ? (now - questionShownAtRef.current) / 1000
                : 0;
          }

          if (lastSpeechAtRef.current) {
            const pause =
              (now - lastSpeechAtRef.current) / 1000;

            if (pause > 1.2) {
              totalPauseRef.current += pause;

              longestPauseRef.current = Math.max(
                longestPauseRef.current,
                pause
              );
            }
          }

          lastSpeechAtRef.current = now;

          answerDurationRef.current =
            (now - firstResponseAtRef.current) / 1000;
        }
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);

      if (event.error !== 'no-speech') {
        setError(
          'Speech recognition encountered an error. Please try again or edit your transcript.'
        );
      }
    };

    recognition.onend = () => {
      setListening(false);

      if (submitOnEndRef.current) {
        submitOnEndRef.current = false;
        handleSubmitAnswer();
      }
    };

    try {
      recognition.start();
    } catch (err) {
      console.error(err);
      setError('Could not start microphone. Please try again.');
      setListening(false);
    }
  };

  // Stop microphone and submit
  const handleStopAndSubmit = () => {
    if (!listening || !recognitionRef.current) return;

    submitOnEndRef.current = true;
    recognitionRef.current.stop();
  };

  // Calculate approximate repeated words
  const calculateRepetitions = (text) => {
    const words = text.toLowerCase().match(/\b[\w']+\b/g) || [];

    let repetitions = 0;

    for (let i = 1; i < words.length; i++) {
      if (words[i] === words[i - 1]) {
        repetitions++;
      }
    }

    return repetitions;
  };

  // Submit answer to backend
  const handleSubmitAnswer = async () => {
    if (
      !currentQuestion ||
      !interview ||
      submitting ||
      !transcriptRef.current.trim()
    ) {
      return;
    }

    setSubmitting(true);
    setError('');

    const answerText = transcriptRef.current.trim();

    const payload = {
      answer_transcript: answerText,
      first_response_seconds: Number(
        firstResponseRef.current.toFixed(2)
      ),
      answer_duration_seconds: Number(
        answerDurationRef.current.toFixed(2)
      ),
      total_pause_seconds: Number(
        totalPauseRef.current.toFixed(2)
      ),
      longest_pause_seconds: Number(
        longestPauseRef.current.toFixed(2)
      ),
      repetition_count: calculateRepetitions(answerText)
    };

    try {
      const response = await api.post(
        `/student/mock-interviews/${interview.interview_id}/questions/${currentQuestion.question_id}/answer`,
        payload
      );

      setMessages((previous) => [
        ...previous,
        {
          role: 'user',
          content: answerText
        }
      ]);

      updateTranscript('');

      if (response.data.evaluation_pending) {
        setCurrentQuestion(null);

        setMessages((previous) => [
          ...previous,
          {
            role: 'assistant',
            content: 'You have completed all six questions! Your answers are being evaluated.'
          }
        ]);

        await evaluateInterview();

      } else if (response.data.next_question) {
        showQuestion(response.data.next_question);
      }

    } catch (err) {
      console.error('Answer submission error:', err);

      setError(
        err.response?.data?.detail ||
        'Failed to submit your answer. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Evaluate completed interview
  
  // Evaluate completed interview
  const evaluateInterview = async () => {
    if (!interview) return;

    setEvaluating(true);
    setError('');

    try {
      await api.post(
        `/student/mock-interviews/${interview.interview_id}/evaluate`
      );

      // Evaluation completed. Return to Training Courses.
      navigate('/student/training-courses');

    } catch (err) {
      console.error('Evaluation error:', err);

      setError(
        err.response?.data?.detail ||
        'Evaluation failed. Please try again.'
      );
    } finally {
      setEvaluating(false);
    }
  };

  // Evaluate after recovering an interview where all questions were answered
  const handleRecoveredEvaluation = async () => {
    await evaluateInterview();
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="font-medium text-slate-500">
          Recovering your interview...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-50 p-4 sm:p-8">
      <div className="mx-auto flex h-[88vh] max-w-4xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">

        {/* Header */}
        <header className="flex items-center gap-3 bg-gradient-to-r from-blue-700 to-indigo-700 px-5 py-4 text-white">

          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-2xl">
            🎙️
          </div>

          <div className="flex-1">
            <h1 className="font-bold sm:text-lg">
              AI Mock Interview
            </h1>

            <p className="text-xs text-blue-100">
              {interview
                ? `Attempt ${interview.attempt_number} · ${interview.total_questions} Questions`
                : 'Prepare for your technical interview'}
            </p>
          </div>

          <button
            onClick={() => navigate('/student/training-courses')}
            className="rounded-lg bg-white/15 px-3 py-2 text-xs font-semibold hover:bg-white/25"
          >
            Exit
          </button>

        </header>

        {/* Chat area */}
        <div
          className="flex-1 space-y-5 overflow-y-auto bg-slate-50 p-4 sm:p-6"
          aria-live="polite"
        >

          {!interview && (
            <div className="rounded-2xl border border-blue-100 bg-white p-6 text-center shadow-sm">

              <div className="mb-4 text-5xl">
                🎤
              </div>

              <h2 className="text-xl font-bold text-slate-900">
                Ready for your Mock Interview?
              </h2>

              <p className="mt-3 text-sm leading-6 text-slate-500">
                You will be asked one introduction question followed by five technical questions based on your resume.
              </p>

              <p className="mt-3 text-sm font-semibold text-blue-700">
                Passing Score: 70 / 100
              </p>

              <button
                onClick={handleStartInterview}
                disabled={starting || !speechSupported}
                className="mt-6 rounded-xl bg-blue-600 px-7 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {starting
                  ? 'Starting Interview...'
                  : 'Allow Microphone & Start'}
              </button>

              {!speechSupported && (
                <p className="mt-4 text-sm text-red-600">
                  Your browser does not support Speech Recognition. Please use Google Chrome or Microsoft Edge.
                </p>
              )}

            </div>
          )}

          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${
                message.role === 'user'
                  ? 'justify-end'
                  : 'justify-start'
              }`}
            >
              <div
                className={`max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-4 py-3 text-sm leading-6 sm:max-w-[75%] ${
                  message.role === 'user'
                    ? 'rounded-br-md bg-blue-600 text-white'
                    : 'rounded-bl-md border border-slate-200 bg-white text-slate-700 shadow-sm'
                }`}
              >
                {message.questionNumber && (
                  <p className="mb-2 text-xs font-bold text-blue-600">
                    QUESTION {message.questionNumber}
                  </p>
                )}

                {message.content}
              </div>
            </div>
          ))}

          {listening && (
            <div className="flex justify-end">
              <div className="rounded-2xl bg-blue-50 px-4 py-3 text-sm text-blue-700">
                <span className="mr-2 animate-pulse">●</span>
                Listening to your answer...
              </div>
            </div>
          )}

          {(submitting || evaluating) && (
            <div className="text-center text-sm font-medium text-slate-500">
              {evaluating
                ? 'AI is evaluating your answers...'
                : 'Submitting your answer...'}
            </div>
          )}

          <div ref={messagesEndRef} />

        </div>

        {/* Error */}
        {error && (
          <div className="border-t border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Answer controls */}
        {currentQuestion && !evaluation && (
          <div className="border-t border-slate-200 bg-white p-4 sm:p-5">

            <textarea
              value={transcript}
              onChange={(event) => updateTranscript(event.target.value)}
              disabled={listening || submitting}
              rows={3}
              placeholder="Your spoken answer will appear here. You can edit it before submitting..."
              className="mb-4 w-full resize-y rounded-xl border border-slate-300 bg-slate-50 p-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:opacity-70"
            />

            <div className="flex flex-wrap items-center justify-between gap-3">

              <div className="flex flex-wrap gap-2">

                {!listening ? (
                  <button
                    onClick={handleStartListening}
                    disabled={!speechSupported || submitting}
                    className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    🎙️ Start Speaking
                  </button>
                ) : (
                  <button
                    onClick={handleStopAndSubmit}
                    className="rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white hover:bg-red-700"
                  >
                    ⏹ Stop & Submit
                  </button>
                )}

                <button
                  onClick={() => speakQuestion(currentQuestion.question_text)}
                  disabled={listening || submitting}
                  className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  🔊 Repeat Question
                </button>

              </div>

              <button
                onClick={handleSubmitAnswer}
                disabled={
                  !transcript.trim() ||
                  listening ||
                  submitting
                }
                className="rounded-xl bg-green-600 px-5 py-3 text-sm font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Submit Answer →'}
              </button>

            </div>

            <p className="mt-3 text-xs text-slate-400">
              Speak clearly. You can edit the transcript before submitting.
            </p>

          </div>
        )}

        {/* Evaluation pending after recovery */}
        {interview &&
          !currentQuestion &&
          !evaluation &&
          !evaluating &&
          messages.length > 0 && (
            <div className="border-t border-slate-200 bg-white p-5 text-center">

              <p className="mb-3 text-sm text-slate-600">
                All questions have been answered. Your evaluation is pending.
              </p>

              <button
                onClick={handleRecoveredEvaluation}
                className="rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700"
              >
                Evaluate My Interview
              </button>

            </div>
          )}

        {/* Final evaluation */}
        {evaluation && (
          <div className="max-h-[45%] overflow-y-auto border-t border-slate-200 bg-white p-5">

            <div className="text-center">

              <h2 className="text-xl font-bold text-slate-900">
                Interview Result
              </h2>

              <p className="mt-3 text-4xl font-bold text-blue-700">
                {evaluation.total_score}/100
              </p>

              <p className={`mt-2 text-lg font-bold ${
                evaluation.status === 'Passed'
                  ? 'text-green-600'
                  : 'text-red-600'
              }`}>
                {evaluation.status}
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Passing Score: {evaluation.passing_score}
              </p>

            </div>

            <div className="mt-6 space-y-3">

              {evaluation.question_results.map((result) => (
                <div
                  key={result.question_number}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                >

                  <div className="flex items-center justify-between gap-3">

                    <p className="text-sm font-bold text-slate-800">
                      Question {result.question_number}
                    </p>

                    <p className="font-bold text-blue-700">
                      {result.score}/100
                    </p>

                  </div>

                  <p className="mt-2 text-sm text-slate-600">
                    {result.question_text}
                  </p>

                  <p className="mt-3 text-sm leading-6 text-slate-500">
                    {result.feedback}
                  </p>

                </div>
              ))}

            </div>

            <button
              onClick={() => navigate('/student/training-courses')}
              className="mt-5 w-full rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
            >
              Back to Training Courses
            </button>

          </div>
        )}

      </div>
    </div>
  );
}