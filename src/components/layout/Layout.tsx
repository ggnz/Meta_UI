import { Navbar } from "./Navbar";
import { NavigationSidebar } from "./NavigationSidebar";
import { useLocation, useNavigate } from "react-router-dom";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleViewChange = (view: string) => {
    navigate(`/${view === "messages" ? "" : view}`);
  };

  // Get current view from pathname
  const getCurrentView = () => {
    const path = location.pathname;
    if (path === "/") return "messages";
    return path.slice(1); // remove leading slash
  };

  const currentView = getCurrentView();
  const isAuthView = ["login", "register", "forgot-password"].includes(currentView);

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      <Navbar onViewChange={handleViewChange} />
      <div className="flex flex-1 overflow-hidden">
        {/* Hide navigation sidebar for auth views */}
        {!isAuthView && (
          <NavigationSidebar 
            activeView={currentView}
            onViewChange={handleViewChange}
          />
        )}
        <div className="flex-1 overflow-hidden md:h-auto">
          {children}
        </div>
      </div>
    </div>
  );
}