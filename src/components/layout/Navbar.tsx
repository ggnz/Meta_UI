// Navbar.tsx
import { User, Star, Crown, User as UserIcon, Building } from "lucide-react";
import logo from "@/assets/vayneLogo.png";
import brand from "@/assets/vayneBrandLogo.png";
import { useState } from "react";
import { SettingsModal } from "./SettingsModal";

interface NavbarProps {
  onViewChange?: (view: string) => void;
}

interface UserData {
  id: string;
  name: string;
  email: string;
  role: string;
  organization?: {
    id: string;
    name: string;
  };
}

export function Navbar({ onViewChange }: NavbarProps) {
  const [user, setUser] = useState<UserData | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Cargar usuario al montar el componente
  useState(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  });

  // Choose icon depending on user role
  const renderUserIcon = () => {
    if (!user?.role) return <UserIcon className="w-4 h-4 text-muted-foreground" />;

    switch (user.role) {
      case "admin":
        return <Star className="w-4 h-4 text-muted-foreground" />;
      case "dueno":
        return <Crown className="w-4 h-4 text-muted-foreground" />;
      case "colaborador":
        return <User className="w-4 h-4 text-muted-foreground" />;
      default:
        return <UserIcon className="w-4 h-4 text-muted-foreground" />;
    }
  };

  return (
    <>
      <header className="sticky top-0 z-50 h-14 bg-background-dark border-b border-border flex items-center justify-between px-4">
        {/* Logo/Brand */}
        <div className="flex items-center justify-between ps-0">
          <div className="w-8 h-8 flex items-center justify-center mx-1">
            <img
              src={logo}
              alt="Vayne Logo"
              className="h-full object-contain"
            />
          </div>

          <img
            src={brand}
            alt="Vayne Brand Logo"
            className="h-8 object-contain ms-2"
          />
        </div>

        {/* Right side - User actions */}
        {user && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-background">
                {user.name}
              </span>
            </div>

            <div
              className="w-8 h-8 bg-primary rounded-full flex items-center justify-center cursor-pointer hover:bg-primary/20 transition-colors"
              onClick={() => setIsSettingsOpen(true)}
              title="Configuración y Perfil"
            >
              {renderUserIcon()}
            </div>
          </div>
        )}
      </header>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          user={user}
          onUserUpdate={setUser}
        />
      )}
    </>
  );
}