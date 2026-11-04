
import React from 'react';
import { Routes, Route } from 'react-router-dom';

import Landing from '../pages/Landing';
import Login from '../pages/Login';
import Register from '../pages/Register';
import Profile from '../pages/Profile';

import ProtectedRoute from '../components/ProtectedRoute';

import AdminDashboard from '../pages/Dashboard/AdminDashboard';
import PendingEmployees from '../pages/Dashboard/PendingEmployees';
import ViewEmployees from '../pages/Dashboard/ViewEmployees';
import ChangePassword from '../pages/Dashboard/ChangePassword';
import AuditLogs from '../pages/Dashboard/AuditLogs';
import EmployeeStatus from '../pages/Dashboard/EmployeeStatus';
import ViewStudents from '../pages/Dashboard/ViewStudents';
import SendAnnouncements from '../pages/Dashboard/SendAnnouncements';
import AdminStudentFeedback from '../pages/Dashboard/AdminStudentFeedback';
import AdminFeedbackDetails from '../pages/Dashboard/AdminFeedbackDetails';

import StudentDashboard from '../pages/student/StudentDashboard';
import StudentRegistrationSuccess from '../pages/student/StudentRegistrationSuccess';
import Chatbot from '../pages/student/Chatbot';
import ViewVacanciesSt from '../pages/student/ViewVacanciesSt';
import UploadResume from '../pages/student/UploadResume';
import ViewConfirmedInterview from '../pages/student/ViewConfirmedInterview';
import ViewInterviewResults from '../pages/student/ViewInterviewResults';
import StudentFeedback from '../pages/Student/StudentFeedback';

import PostCompanies from '../pages/employee/PostCompanies';
import ViewCompanies from '../pages/employee/ViewCompanies';
import Dashboard from '../pages/employee/Dashboard';
import PostVacancies from '../pages/employee/PostVacancies';
import ViewVacancies from '../pages/employee/ViewVacancies';
import ViewApplication from '../pages/employee/ViewApplications';
import PostInterview from '../pages/employee/PostInterview';
import ViewInterview from '../pages/employee/ViewInterview';
import PostResult from '../pages/employee/PostResults';
import PublishResult from '../pages/employee/PublishResults';
import ViewAcceptedCompanies from '../pages/employee/ViewAcceptedCompanies';
import EmployeeChangePassword from '../pages/employee/ChangePassword';
import ViewAdminAnnouncements from '../pages/employee/ViewAdminAnnouncements';
import EmployeeSendAnnouncements from '../pages/employee/SendAnnouncements';
import PendingStudents from '../pages/employee/PendingStudents';
import EmployeeViewStudents from '../pages/employee/ViewStudents';
import StudentStatus from '../pages/employee/StudentStatus';
import StudentProfile from '../pages/employee/StudentProfile';
import StudentMyProfile from '../pages/student/StudentMyProfile';
import ViewAnnouncements from '../pages/student/ViewAnnouncements';
import AppliedJobsHistory from '../pages/student/AppliedJobsHistory';
import StudentChangePassword from '../pages/student/StudentChangePassword';


const AppRoutes = () => {
  return (
    <Routes>

      {/* Public Routes */}

      <Route path="/" element={<Landing />} />

      <Route path="/login/:role" element={<Login />} />

      <Route path="/register" element={<Register />} />

      <Route path="/register/:role" element={<Register />} />

      <Route
        path="/student/registration-success"
        element={<StudentRegistrationSuccess />}
      />


      {/* Common Protected Routes */}

      <Route element={<ProtectedRoute allowedRoles={['student', 'employee']} />}>
        <Route path="/profile" element={<Profile />} />
      </Route>


      {/* Admin Protected Routes */}

      <Route element={<ProtectedRoute allowedRoles={['admin']} />}>

        <Route path="/admin/dashboard" element={<AdminDashboard />} />

        <Route
          path="/admin/employees/pending"
          element={<PendingEmployees />}
        />

        <Route
          path="/admin/employees"
          element={<ViewEmployees />}
        />

        <Route
          path="/admin/change-password"
          element={<ChangePassword />}
        />

        <Route
          path="/admin/audit-logs"
          element={<AuditLogs />}
        />

        <Route
          path="/admin/employee-status"
          element={<EmployeeStatus />}
        />

        <Route
          path="/admin/students"
          element={<ViewStudents />}
        />

        <Route
          path="/admin/student-feedback/:feedbackId"
          element={<AdminFeedbackDetails />}
        />

        <Route
          path="/admin/announcements"
          element={<SendAnnouncements />}
        />

        <Route
          path="/admin/student-feedback"
          element={<AdminStudentFeedback />}
        />

      </Route>


      {/* Student Protected Routes */}

      <Route element={<ProtectedRoute allowedRoles={['student']} />}>

        <Route
          path="/student/dashboard"
          element={<StudentDashboard />}
        />

        <Route
          path="/student/chatbot"
          element={<Chatbot />}
        />

        <Route
          path="/student/vacancies"
          element={<ViewVacanciesSt />}
        />

        <Route
          path="/student/upload-resume/:vacancyId"
          element={<UploadResume />}
        />

        <Route
          path="/student/interviews"
          element={<ViewConfirmedInterview />}
        />

        <Route
          path="/student/interview-results"
          element={<ViewInterviewResults />}
        />

        <Route
          path="/student/feedback"
          element={<StudentFeedback />}
        />

        <Route
  path="/student/my-profile"
  element={<StudentMyProfile />}
/>
<Route
  path="/student/announcements"
  element={<ViewAnnouncements />}
/>
<Route
  path="/student/applied-jobs-history"
  element={<AppliedJobsHistory />}
/>
<Route
  path="/student/change-password"
  element={<StudentChangePassword />}
/>

      </Route>


      {/* Employee Protected Routes */}

      <Route element={<ProtectedRoute allowedRoles={['employee']} />}>

        <Route
          path="/employee/dashboard"
          element={<Dashboard />}
        />

        <Route
          path="/employee/pending-students"
          element={<PendingStudents />}
        />

        <Route
          path="/employee/change-password"
          element={<EmployeeChangePassword />}
        />

        <Route
          path="/employee/announcements"
          element={<ViewAdminAnnouncements />}
        />

        <Route
          path="/employee/send-announcements"
          element={<EmployeeSendAnnouncements />}
        />

      </Route>


      {/* Employee Routes */}

      <Route
        path="/employee/companies/create"
        element={<PostCompanies />}
      />

      <Route
        path="/employee/companies"
        element={<ViewCompanies />}
      />

      <Route
        path="/employee/companies/:companyId/vacancies/create"
        element={<PostVacancies />}
      />

      <Route
        path="/employee/vacancies"
        element={<ViewVacancies />}
      />

      <Route
        path="/employee/applications"
        element={<ViewApplication />}
      />

      <Route
        path="/employee/post-interview"
        element={<PostInterview />}
      />

      <Route
        path="/employee/interviews"
        element={<ViewInterview />}
      />

      <Route
        path="/employee/post-result"
        element={<PostResult />}
      />

      <Route
        path="/employee/interview-results"
        element={<PublishResult />}
      />

      <Route
        path="/employee/accepted-companies"
        element={<ViewAcceptedCompanies />}
      />

      <Route
        path="/employee/audit-logs"
        element={<AuditLogs />}
      />
      <Route path="/employee/students" element={<EmployeeViewStudents />} />
      <Route
  path="/employee/students/status-history"
  element={<StudentStatus />}
/>

<Route
  path="/employee/students/:studentId"
  element={<StudentProfile />}
/>
    </Routes>
  );
};

export default AppRoutes;
