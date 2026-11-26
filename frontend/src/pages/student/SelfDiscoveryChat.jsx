import ReactMarkdown from 'react-markdown';
import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import api from '../../services/api';

const MODES = [
  {
    id: 'interests_motivations',
    title: 'Interests & Motivations',
    description: 'Explore what interests you and what motivates you.'
  },
  {
    id: 'preferences_work_style',
    title: 'Preferences & Work Style',
    description: 'Discover how you prefer to work, learn, and collaborate.'
  },
  {
    id: 'experiences_strengths',
    title: 'Experiences & Strengths',
    description: 'Reflect on your experiences, abilities, and strengths.'
  },
  {
    id: 'challenges_self_reflection',
    title: 'Challenges & Self Reflection',
    description: 'Explore challenges, personal growth, and areas you want to improve.'
  }
];

const MIN_MESSAGES = 5;

function SelfDiscoveryChat() {
  const { courseId } = useParams();
  const navigate = useNavigate();

  const [selectedMode, setSelectedMode] = useState(MODES[0].id);
  const [histories, setHistories] = useState({});
  const [counts, setCounts] = useState({});
  const [completedModes, setCompletedModes] = useState({});
  const [continueAvailable, setContinueAvailable] = useState(false);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState('');
  const [continueLoading, setContinueLoading] = useState(false);

  // Load existing session and all four mode histories
  useEffect(() => {
    const loadSession = async () => {
      try {
        setInitialLoading(true);
        setError('');

        const response = await api.post(
          `/student/training-courses/${courseId}/self-discovery/start`
        );

        const data = response.data;

        setHistories(data.mode_histories || {});
        setCounts(data.mode_message_counts || {});
        setCompletedModes(data.mode_completion || {});
        setContinueAvailable(
          data.continue_course_available || false
        );

      } catch (err) {
        setError(
          err.response?.data?.detail ||
          'Failed to load Self Discovery session.'
        );
      } finally {
        setInitialLoading(false);
      }
    };

    loadSession();
  }, [courseId]);

  const currentHistory = histories[selectedMode] || [];

  const handleSend = async () => {
  const messageText = input.trim();

  if (!messageText || loading) return;

  const activeMode = selectedMode;

  // Immediately display the student's message
  setHistories((previous) => ({
    ...previous,
    [activeMode]: [
      ...(previous[activeMode] || []),
      {
        role: 'user',
        message: messageText
      }
    ]
  }));

  // Clear input immediately
  setInput('');

  try {
    setLoading(true);
    setError('');

    const response = await api.post(
      `/student/training-courses/${courseId}/self-discovery/chat`,
      {
        mode: activeMode,
        message: messageText
      }
    );

    const data = response.data;

    // Display AI response after generation
    setHistories((previous) => ({
      ...previous,
      [activeMode]: [
        ...(previous[activeMode] || []),
        {
          role: 'assistant',
          message: data.reply
        }
      ]
    }));

    // Update progress counts
    setCounts(data.mode_message_counts || {});
    setCompletedModes(data.mode_completion || {});
    setContinueAvailable(
      data.continue_course_available || false
    );

  } catch (err) {
    setError(
      err.response?.data?.detail ||
      'Failed to get AI response. Please try again.'
    );

    // Restore the message in the input in case of failure
    setInput(messageText);

  } finally {
    setLoading(false);
  }
};

  const handleContinue = async () => {
  try {
    setContinueLoading(true);
    setError('');

    await api.post(
      `/student/training-courses/${courseId}/self-discovery/continue`
    );

    navigate(
      `/student/training-courses/${courseId}/mock-interview`
    );

  } catch (err) {
    const detail = err.response?.data?.detail;

    if (detail && typeof detail === 'object') {
      const incompleteModes = detail.incomplete_modes || {};

      const modeNames = Object.entries(incompleteModes)
        .map(([modeId, count]) => {
          const mode = MODES.find((item) => item.id === modeId);

          return `${mode?.title || modeId}: ${count}/5`;
        });

      setError(
        `${detail.message || 'Please complete all modes.'} ${modeNames.join(', ')}`
      );
    } else {
      setError(
        detail || 'Failed to continue course. Please try again.'
      );
    }

  } finally {
    setContinueLoading(false);
  }
};

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const currentMode = MODES.find(
    (mode) => mode.id === selectedMode
  );

  const currentCount = counts[selectedMode] || 0;

  if (initialLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
          <p className="mt-4 text-sm text-slate-600">
            Loading Self Discovery Studio...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-3 py-5 sm:px-6 sm:py-8">

      <div className="mx-auto max-w-7xl">

        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-700">
              AI Training Programme
            </p>

            <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">
              Self Discovery Studio
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Explore yourself through guided conversations.
            </p>
          </div>

          <button
            onClick={() =>
              navigate(
                `/student/training-courses/${courseId}/self-discovery`
              )
            }
            className="self-start rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            ← Welcome Page
          </button>

        </div>

        {/* Overall progress */}
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="font-semibold text-slate-900">
              Your Self Discovery Progress
            </h2>

            <p className="text-sm text-slate-500">
              {Object.values(completedModes).filter(Boolean).length} of 4 modes completed
            </p>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">

            {MODES.map((mode) => {
              const count = counts[mode.id] || 0;
              const completed = completedModes[mode.id] || false;

              return (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => setSelectedMode(mode.id)}
                  className={`rounded-xl border p-4 text-left transition ${
                    selectedMode === mode.id
                      ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-200'
                      : 'border-slate-200 bg-white hover:border-blue-300'
                  }`}
                >

                  <div className="flex items-start justify-between gap-2">

                    <p className="text-sm font-semibold text-slate-800">
                      {mode.title}
                    </p>

                    {completed && (
                      <span className="text-green-600">
                        ✓
                      </span>
                    )}

                  </div>

                  <p className="mt-2 text-xs text-slate-500">
                    {count}/{MIN_MESSAGES} responses
                  </p>

                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full transition-all ${
                        completed ? 'bg-green-500' : 'bg-blue-500'
                      }`}
                      style={{
                        width: `${Math.min(
                          (count / MIN_MESSAGES) * 100,
                          100
                        )}%`
                      }}
                    />
                  </div>

                  <p className={`mt-2 text-xs font-medium ${
                    completed ? 'text-green-600' : 'text-slate-500'
                  }`}>
                    {completed ? 'Completed minimum' : `${MIN_MESSAGES - count} more required`}
                  </p>

                </button>
              );
            })}

          </div>

        </div>

        {/* Chat section */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

          {/* Selected mode header */}
          <div className="border-b border-slate-200 bg-white p-5">

            <h2 className="text-lg font-bold text-slate-900">
              {currentMode?.title}
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {currentMode?.description}
            </p>

            <div className="mt-3 inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
              {currentCount} student responses
            </div>

          </div>

          {/* Messages */}
          <div className="min-h-[350px] max-h-[60vh] space-y-4 overflow-y-auto bg-slate-50 p-4 sm:p-6">

            {currentHistory.length === 0 && (
              <div className="flex min-h-[300px] items-center justify-center">
                <div className="max-w-md text-center">

                  <div className="mb-3 text-4xl">
                    💬
                  </div>

                  <h3 className="font-semibold text-slate-800">
                    Let's start exploring
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Share your thoughts, experiences, or anything
                    relevant to this topic. The AI guide will respond
                    and continue the conversation naturally.
                  </p>

                </div>
              </div>
            )}

            {currentHistory.map((message, index) => (
              <div
                key={`${selectedMode}-${index}`}
                className={`flex ${
                  message.role === 'user'
                    ? 'justify-end'
                    : 'justify-start'
                }`}
              >

                <div
                  className={`max-w-[90%] rounded-2xl p-4 sm:max-w-[80%] ${
                    message.role === 'user'
                      ? 'rounded-br-md bg-blue-600 text-white'
                      : 'rounded-bl-md border border-slate-200 bg-white text-slate-800'
                  }`}
                >

                  <p className={`mb-2 text-xs font-semibold ${
                    message.role === 'user'
                      ? 'text-blue-100'
                      : 'text-blue-700'
                  }`}>
                    {message.role === 'user' ? 'You' : 'AI Guide'}
                  </p>

                  <div className="text-sm leading-7 break-words">
  <ReactMarkdown
    components={{
      p: ({ children }) => (
        <p className="mb-3 last:mb-0">
          {children}
        </p>
      ),
      strong: ({ children }) => (
        <strong className="font-bold">
          {children}
        </strong>
      ),
      em: ({ children }) => (
        <em>{children}</em>
      ),
      ul: ({ children }) => (
        <ul className="mb-3 list-disc pl-6 space-y-1">
          {children}
        </ul>
      ),
      ol: ({ children }) => (
        <ol className="mb-3 list-decimal pl-6 space-y-1">
          {children}
        </ol>
      ),
      li: ({ children }) => (
        <li>{children}</li>
      ),
      h1: ({ children }) => (
        <h1 className="mb-2 text-lg font-bold">
          {children}
        </h1>
      ),
      h2: ({ children }) => (
        <h2 className="mb-2 text-base font-bold">
          {children}
        </h2>
      ),
      h3: ({ children }) => (
        <h3 className="mb-2 font-bold">
          {children}
        </h3>
      ),
    }}
  >
    {message.message || message.content || ''}
  </ReactMarkdown>
</div>

                </div>

              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-md border border-slate-200 bg-white p-4">

                  <p className="mb-2 text-xs font-semibold text-blue-700">
                    AI Guide
                  </p>

                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <span className="animate-pulse">●</span>
                    <span>Thinking...</span>
                  </div>

                </div>
              </div>
            )}

          </div>

          {/* Error */}
          {error && (
            <div className="border-t border-slate-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Message input */}
          <div className="border-t border-slate-200 bg-white p-4 sm:p-5">

            <div className="flex items-end gap-3">

              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Share your thoughts..."
                rows={2}
                maxLength={5000}
                disabled={loading}
                className="max-h-40 min-h-[52px] flex-1 resize-y rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
              />

              <button
                type="button"
                onClick={handleSend}
                disabled={loading || !input.trim()}
                className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? 'Sending...' : 'Send'}
              </button>

            </div>

            <p className="mt-2 text-xs text-slate-400">
              Enter to send · Shift + Enter for a new line
            </p>

          </div>

        </div>

        {/* Continue Course */}
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

            <div>
              <h3 className="font-semibold text-slate-900">
                Continue to Mock Interview
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Complete at least 5 responses in each of the four modes.
              </p>
            </div>

            <button
  type="button"
  onClick={handleContinue}
  disabled={!continueAvailable || continueLoading || loading}
  className={`rounded-xl px-6 py-3 font-semibold transition ${
    continueAvailable && !continueLoading
      ? 'bg-green-600 text-white hover:bg-green-700'
      : 'cursor-not-allowed bg-slate-200 text-slate-500'
  }`}
>
  {continueLoading
    ? 'Completing...'
    : continueAvailable
      ? 'Continue Course →'
      : 'Complete All 4 Modes'}
</button>

          </div>

          {continueAvailable && (
            <p className="mt-3 rounded-lg bg-green-50 p-3 text-sm text-green-700">
              All four modes have reached the minimum response
              requirement. You are ready to continue.
            </p>
          )}

        </div>

      </div>
    </div>
  );
}

export default SelfDiscoveryChat;