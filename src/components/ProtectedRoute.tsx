import React, { useContext } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../contexts/AuthContext";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { toast } from "sonner";

interface ProtectedRouteProps {
  children: React.ReactElement;
  roles?: ("admin" | "editor" | "viewer")[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, roles }) => {
  const auth = useContext(AuthContext);

  if (!auth) {
    return <Navigate to="/sign-in" replace />;
  }

  if (auth.loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  if (!auth.user) {
    return <Navigate to="/sign-in" replace />;
  }

  if (roles && roles.length > 0 && !roles.includes(auth.user.role)) {
    toast.error("You don't have permission to access this page");
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;
