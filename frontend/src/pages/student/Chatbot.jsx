
import { useState, useRef, useEffect } from 'react';
import api from '../../services/api';

export default function Chatbot() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content:
        'Hi! 👋 I am your Job Portal AI Assistant. Ask me anything about using the Job Portal.',
    },
  ]);

  const [question, setQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: 'smooth',
    });
  }, [messages, isLoading]);

  async function handleSend(event) {
    event.preventDefault();

    const trimmedQuestion = question.trim();

    if (!trimmedQuestion || isLoading) return;

    setMessages((previous) => [
      ...previous,
      {
        role: 'user',
        content: trimmedQuestion,
      },
    ]);

    setQuestion('');
    setIsLoading(true);

    try {
      const response = await api.post('/chatbot/ask', {
        question: trimmedQuestion,
      });

      setMessages((previous) => [
        ...previous,
        {
          role: 'assistant',
          content: response.data.answer,
          source_pages: response.data.source_pages || [],
        },
      ]);
    } catch (error) {
      console.error('Chatbot API error:', error);

      let errorMessage =
        'Sorry, something went wrong. Please try again.';

      if (error.response?.status === 401) {
        errorMessage =
          'Your session may have expired. Please log in again.';
      } else if (error.response?.status === 403) {
        errorMessage =
          'You need an active student account to use this assistant.';
      } else if (!error.response) {
        errorMessage =
          'Cannot connect to the backend. Please check whether the FastAPI server is running.';
      } else if (typeof error.response.data?.detail === 'string') {
        errorMessage = error.response.data.detail;
      }

      setMessages((previous) => [
        ...previous,
        {
          role: 'assistant',
          content: errorMessage,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-50 p-4 sm:p-8">
      <div className="mx-auto flex h-[85vh] max-w-4xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">
        <header className="flex items-center gap-3 bg-gradient-to-r from-blue-700 to-indigo-700 px-5 py-4 text-white sm:px-6">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-2xl">
            🤖
          </div>

          <div>
            <h1 className="font-bold sm:text-lg">
              Job Portal AI Assistant
            </h1>
            <p className="mt-1 text-xs text-blue-100">
              Ask questions about the Job Portal
            </p>
          </div>
        </header>

        <div
          className="flex-1 space-y-5 overflow-y-auto bg-slate-50 p-4 sm:p-6"
          aria-live="polite"
        >
          {messages.map((message, index) => (
            <div
              key={`${message.role}-${index}`}
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
                {message.content}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div
                className="rounded-2xl rounded-bl-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500"
                role="status"
              >
                Thinking...
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <form
          onSubmit={handleSend}
          className="border-t border-slate-200 bg-white p-4 sm:p-5"
        >
          <div className="flex items-end gap-3">
            <textarea
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              onKeyDown={(event) => {
                if (
                  event.key === 'Enter' &&
                  !event.shiftKey &&
                  !event.nativeEvent.isComposing
                ) {
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }
              }}
              placeholder="Ask about registration, jobs, or password recovery..."
              rows={1}
              maxLength={1000}
              disabled={isLoading}
              aria-label="Your question"
              className="max-h-32 min-h-12 flex-1 resize-y rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
            />

            <button
              type="submit"
              disabled={!question.trim() || isLoading}
              className="flex h-12 items-center gap-2 rounded-2xl bg-blue-600 px-4 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span>Send</span>
              <span aria-hidden="true">➤</span>
            </button>
          </div>

          <p className="mt-2 text-xs text-slate-400">
            Enter to send · Shift + Enter for a new line
          </p>
        </form>
      </div>
    </div>
  );
}
