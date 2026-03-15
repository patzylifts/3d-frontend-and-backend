import { Navigate, Outlet } from "react-router-dom";

const isAuthenticated = () => !!localStorage.getItem("access_token");

// For admin routes, pass `adminOnly={true}`
export default function PrivateRouter({ redirectTo = "/login", adminOnly = false }) {
  const token = localStorage.getItem("access_token");
  if (!token) return <Navigate to={redirectTo} replace />;

  // Decode JWT to check user role
  if (adminOnly) {
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      if (!payload.is_staff) {
        // Not admin → redirect
        return <Navigate to="/" replace />;
      }
    } catch (err) {
      return <Navigate to={redirectTo} replace />;
    }
  }

  return <Outlet />;
}