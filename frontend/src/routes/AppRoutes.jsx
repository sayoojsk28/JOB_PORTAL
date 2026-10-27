
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Landing from '../pages/Landing';
import Login from '../pages/Login';
import Register from '../pages/Register';
import Profile from '../pages/Profile';
import ProtectedRoute from '../components/ProtectedRoute';
import AdminDashboard from '../pages/Dashboard/AdminDashboard';
import RecruiterDashboard from '../pages/Dashboard/RecruiterDashboard';
import JobSeekerDashboard from '../pages/Dashboard/JobSeekerDashboard';
import JobList from '../pages/Jobs/JobList';
import JobDetails from '../pages/Jobs/JobDetails';
import CreateJob from '../pages/Jobs/CreateJob';
import PendingEmployees from '../pages/Dashboard/PendingEmployees';

const AppRoutes = () => {
  return (
    <Routes>
      {/* Public Routes */}
      
	<Route path="/" element={<Landing />} />
	<Route path="/login/:role" element={<Login />} />
	<Route path="/register" element={<Register />} />
	<Route path="/register/:role" element={<Register />} />
	<Route path="/jobs" element={<JobList />} />
	<Route path="/jobs/:id" element={<JobDetails />} />


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
</Route>

      <Route element={<ProtectedRoute allowedRoles={['employee']} />}>
        <Route path="/employee/dashboard" element={<RecruiterDashboard />} />
        <Route path="/employee/jobs/create" element={<CreateJob />} />
      </Route>

      <Route element={<ProtectedRoute allowedRoles={['student']} />}>
        <Route path="/student/dashboard" element={<JobSeekerDashboard />} />
      </Route>
    </Routes>
  );
};

export default AppRoutes;
