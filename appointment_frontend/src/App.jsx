// App shell — React Router routes for ZenFlow (customer, organiser, admin).
import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import LandingPage from './pages/LandingPage.jsx';
import LoginPage from './pages/auth/LoginPage.jsx';
import SignupPage from './pages/auth/SignupPage.jsx';
import OTPVerifyPage from './pages/auth/OTPVerifyPage.jsx';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage.jsx';
import HomePage from './pages/customer/HomePage.jsx';
import ClassDetailPage from './pages/customer/ClassDetailPage.jsx';
import BookingFlowPage from './pages/customer/BookingFlowPage.jsx';
import BookingConfirmPage from './pages/customer/BookingConfirmPage.jsx';
import ProfilePage from './pages/customer/ProfilePage.jsx';
import DashboardPage from './pages/organiser/DashboardPage.jsx';
import CreateAppointmentPage from './pages/organiser/CreateAppointmentPage.jsx';
import EditAppointmentPage from './pages/organiser/EditAppointmentPage.jsx';
import ManageResourcesPage from './pages/organiser/ManageResourcesPage.jsx';
import WorkingHoursPage from './pages/organiser/WorkingHoursPage.jsx';
import BookingsListPage from './pages/organiser/BookingsListPage.jsx';
import ReportsPage from './pages/organiser/ReportsPage.jsx';
import AdminDashboardPage from './pages/admin/AdminDashboardPage.jsx';
import UserManagementPage from './pages/admin/UserManagementPage.jsx';

export default function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/verify-otp" element={<OTPVerifyPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />

      {/* Customer protected routes */}
      <Route element={<ProtectedRoute roles={['customer']} />}>
        <Route path="/home" element={<HomePage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Route>

      <Route element={<ProtectedRoute roles={['customer', 'organiser', 'admin']} />}>
        <Route path="/classes/:id" element={<ClassDetailPage />} />
        <Route path="/book/:appointmentTypeId" element={<BookingFlowPage />} />
        <Route path="/book/share/:token" element={<BookingFlowPage />} />
        <Route path="/booking/confirm" element={<BookingConfirmPage />} />
      </Route>


      <Route element={<ProtectedRoute roles={['organiser', 'admin']} />}>
        <Route path="/organiser" element={<DashboardPage />} />
        <Route path="/organiser/new" element={<CreateAppointmentPage />} />
        <Route path="/organiser/edit/:id" element={<EditAppointmentPage />} />
        <Route path="/organiser/appointments/:appointmentTypeId/resources" element={<ManageResourcesPage />} />
        <Route path="/organiser/resources/:id/hours/:aptId" element={<WorkingHoursPage />} />
        <Route path="/organiser/bookings/:appointmentTypeId" element={<BookingsListPage />} />
        <Route path="/organiser/reports" element={<ReportsPage />} />
      </Route>

      <Route element={<ProtectedRoute roles={['admin']} />}>
        <Route path="/admin" element={<AdminDashboardPage />} />
        <Route path="/admin/users" element={<UserManagementPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
