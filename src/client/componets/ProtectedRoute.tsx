import { FC, ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/AuthProvider";

interface ProtectedRouteProps {
  children: ReactNode;
}

export const ProtectedRoute: FC<ProtectedRouteProps> = ({ children }) => {
  const user = useAuth();
  console.log("je suis dans protected route.");
  console.log(user);
  if (!user.token) {
    // user is not authenticated
    console.log("not logged.");
    return <Navigate to="/login" />;
  }
  return <>{children}</>;
};
