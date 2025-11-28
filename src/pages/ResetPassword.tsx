import { ResetPasswordView } from "@/components/auth/ResetPassword";
import { useNavigate } from "react-router-dom";

export default function ResetPassword() {
  const navigate = useNavigate();

  const handleViewChange = (view: string) => {
    navigate(`/${view === "messages" ? "" : view}`);
  };

  return <ResetPasswordView onViewChange={handleViewChange} />;
}