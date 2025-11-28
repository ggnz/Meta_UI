import { LoginView } from "@/components/auth/LoginView";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const navigate = useNavigate();

  const handleViewChange = (view: string) => {
    navigate(`/${view === "messages" ? "" : view}`);
  };

  return <LoginView onViewChange={handleViewChange} />;
}