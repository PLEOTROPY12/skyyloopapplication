import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import AuthCallback from "@/pages/AuthCallback";
import Login from "@/pages/Login";
import Layout from "@/components/Layout";
import Bookings from "@/pages/Bookings";
import CreateBooking from "@/pages/CreateBooking";
import Agents from "@/pages/Agents";
import Jumps from "@/pages/Jumps";
import Transactions from "@/pages/Transactions";
import CalendarPage from "@/pages/CalendarPage";
import Profile from "@/pages/Profile";

const Protected = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading)
    return (
      <div className="min-h-screen grid place-items-center text-slate-500" data-testid="auth-loading">
        Loading...
      </div>
    );
  return user ? children : <Navigate to="/login" replace />;
};

function AppRouter() {
  const location = useLocation();
  if (location.hash?.includes("session_id=")) return <AuthCallback />;
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<Protected><Layout /></Protected>}>
        <Route path="/" element={<Bookings />} />
        <Route path="/bookings/new" element={<CreateBooking />} />
        <Route path="/agents" element={<Agents />} />
        <Route path="/jumps" element={<Jumps />} />
        <Route path="/transactions" element={<Transactions />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/profile" element={<Profile />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRouter />
        <Toaster position="top-center" richColors />
      </AuthProvider>
    </BrowserRouter>
  );
}
