import { useContext } from "react";
import { Navigate } from "react-router-dom";
import { USER_TYPES } from "../../constants";
import { ICurrentUser } from "../../interfaces";
import { AuthContext } from "../AuthContext";

interface PrivateRouteProps {
  children: React.ReactNode;
}

const PrivateRouteTeacher = (props: PrivateRouteProps) => {
  const { currentUser } = useContext(AuthContext);

  return !!currentUser ? (
    isUserAdmin(currentUser) ? (
      props.children
    ) : (
      <Navigate to="/no-access" />
    )
  ) : (
    <Navigate to="/login" />
  );
};

export default PrivateRouteTeacher;

function isUserAdmin(currentUser: ICurrentUser) {
  return currentUser.userType === USER_TYPES.TEACHER;
}
