
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Landing from '../pages/Landing';
import Login from '../pages/Login';
import Register from '../pages/Register';
import Profile from '../pages/Profile';
import ProtectedRoute from '../components/ProtectedRoute';
import AdminDashboard from '../pages/Dashboard/AdminDashboard';
// import RecruiterDashboard from '../pages/Dashboard/RecruiterDashboard';
import StudentDashboard from '../pages/student/StudentDashboard';
// import JobList from '../pages/Jobs/JobList';
// import JobDetails from '../pages/Jobs/JobDetails';
// import CreateJob from '../pages/Jobs/CreateJob';
import PendingEmployees from '../pages/Dashboard/PendingEmployees';
import ViewEmployees from '../pages/Dashboard/ViewEmployees';
import ChangePassword from '../pages/Dashboard/ChangePassword';
import StudentRegistrationSuccess from '../pages/student/StudentRegistrationSuccess';
import Chatbot from '../pages/student/Chatbot';
import PostCompanies from '../pages/employee/PostCompanies';
import ViewCompanies from '../pages/employee/ViewCompanies';
import Dashboard from '../pages/employee/Dashboard';
import PostVacancies from '../pages/employee/PostVacancies';
import ViewVacancies from '../pages/employee/ViewVacancies';
import ViewVacanciesSt from '../pages/student/ViewVacanciesSt';
import UploadResume from '../pages/student/UploadResume';
import ViewApplication from '../pages/employee/ViewApplications';
import PostInterview from "../pages/employee/PostInterview";
import ViewInterview from "../pages/employee/ViewInterview";
import ViewConfirmedInterview from '../pages/student/ViewConfirmedInterview';
import PostResult from '../pages/employee/PostResults';
import PublishResult from '../pages/employee/PublishResults';
import ViewInterviewResults from '../pages/student/ViewInterviewResults';
import ViewAcceptedCompanies from '../pages/employee/ViewAcceptedCompanies';

const AppRoutes = () => {
  return (
    <Routes>
      {/* Public Routes */}
      
	<Route path="/" element={<Landing />} />
	<Route path="/login/:role" element={<Login />} />
	<Route path="/register" element={<Register />} />
	<Route path="/register/:role" element={<Register />} />
	{/* <Route path="/jobs" element={<JobList />} />
	<Route path="/jobs/:id" element={<JobDetails />} /> */}
  <Route
      path="/student/registration-success"
      element={<StudentRegistrationSuccess />}
  />


      {/* Protected Routes */}
      <Route element={<ProtectedRoute allowedRoles={['student', 'employee']} />}>
        <Route path="/profile" element={<Profile />} />
      </Route>

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
</Route>

      <Route element={<ProtectedRoute allowedRoles={['employee']} />}>
        {/* <Route path="/employee/dashboard" element={<RecruiterDashboard />} /> */}
        {/* <Route path="/employee/jobs/create" element={<CreateJob />} /> */}
      </Route>

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
      </Route>
      <Route
  path="/employee/companies/create"
  element={<PostCompanies />}
/>
<Route
  path="/employee/companies"
  element={<ViewCompanies />}
/>
<Route element={<ProtectedRoute allowedRoles={['employee']} />}>
  <Route path="/employee/dashboard" element={<Dashboard />} />
</Route>

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
<Route path="/employee/post-interview" element={<PostInterview />} />
<Route path="/employee/interviews" element={<ViewInterview />} />
<Route
  path="/employee/post-result"
  element={<PostResult />}
/>
<Route
  path="/employee/interview-results"
  element={<PublishResult />}
/>
<Route path="/employee/accepted-companies" element={<ViewAcceptedCompanies />} />

    </Routes>
  );
};

export default AppRoutes;
