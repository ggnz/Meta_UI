import { RegisterView } from "@/components/auth/RegisterView";
import { useNavigate } from "react-router-dom";

export default function Register() {
  const navigate = useNavigate();

  const handleViewChange = (view: string) => {
    navigate(`/${view === "messages" ? "" : view}`);
  };

  return <RegisterView onViewChange={handleViewChange} />;
}