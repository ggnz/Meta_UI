import { ForgotPasswordView } from "@/components/auth/ForgotPassword";
import { useNavigate } from "react-router-dom";

export default function ForgotPassword() {
  const navigate = useNavigate();

  const handleViewChange = (view: string) => {
    navigate(`/${view === "messages" ? "" : view}`);
  };

  return <ForgotPasswordView onViewChange={handleViewChange} />;
}