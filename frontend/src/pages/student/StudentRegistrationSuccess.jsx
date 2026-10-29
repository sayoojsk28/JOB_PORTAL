
import React from 'react';
import { useNavigate } from 'react-router-dom';

const StudentRegistrationSuccess = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-xl bg-white p-8 text-center shadow-md">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <svg
            className="h-9 w-9 text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.5"
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>

        <h1 className="mb-3 text-2xl font-bold text-gray-900">
          Registration Completed!
        </h1>

        <p className="mb-7 leading-6 text-gray-600">
          Your registration has been completed successfully.
          Please wait for employee approval before accessing your account.
        </p>

        <button
          onClick={() => navigate('/')}
          className="w-full rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
        >
          OK
        </button>
      </div>
    </div>
  );
};

export default StudentRegistrationSuccess;
