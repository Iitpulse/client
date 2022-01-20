import { useContext } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "./AuthContext";

interface PrivateRouteProps {
  children: React.ReactNode;
}

const PrivateRoute = (props: PrivateRouteProps) => {
  const { currentUser } = useContext(AuthContext);
  return !!currentUser ? props.children : <Navigate to="/login" />;
};

export default PrivateRoute;
