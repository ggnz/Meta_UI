import { ContactsView } from "@/components/views/ContactsView";
import { useNavigate } from "react-router-dom";

export default function Contacts() {
  const navigate = useNavigate();

  const handleStartConversation = (contactId: string) => {
    navigate("/");
  };

  return <ContactsView onStartConversation={handleStartConversation} />;
}