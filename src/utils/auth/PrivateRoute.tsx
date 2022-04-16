import { useContext } from "react";
import { Navigate } from "react-router-dom";
import MainLayout from "../../layouts/MainLayout";
import { AuthContext } from "./AuthContext";

interface Props {
  component: React.ComponentType;
  path?: string;
  name: string;
}
const PrivateRoute: React.FC<Props> = ({ component: RouteComponent, name }) => {
  const { currentUser } = useContext(AuthContext);

  if (!currentUser && !localStorage.getItem("token")) {
    return <Navigate to="/login" />;
  }

  return (
    <MainLayout name={name}>
      <RouteComponent />
    </MainLayout>
  );
};

export default PrivateRoute;
