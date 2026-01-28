import { useEffect, useState } from "react";
import {
  MessageSquare,
  Waypoints,
  Users,
  LogOut,
  Tags,
  Building,
  FileText,
  Contact,
  User as UserIcon,
  Star,
  Crown,
  User,
  MoreVertical,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useUnreadBadge } from "@/hooks/useUnreadBadge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DialogDescription } from "@radix-ui/react-dialog";
import { SettingsModal } from "./SettingsModal";

/* ===================== NAV CONFIG ===================== */

const navigationItems = [
  {
    id: "messages",
    label: "Mensajes",
    icon: MessageSquare,
    path: "/",
    roles: ["admin", "dueno", "colaborador"],
  },
  {
    id: "contacts",
    label: "Contactos",
    icon: Contact,
    path: "/contacts",
    roles: ["admin", "dueno", "colaborador"],
  },
  {
    id: "connections",
    label: "Conexiones",
    icon: Waypoints,
    path: "/connections",
    roles: ["admin", "dueno"],
  },
  {
    id: "templates",
    label: "Plantillas",
    icon: FileText,
    path: "/templates",
    roles: ["admin", "dueno"],
  },
  {
    id: "users",
    label: "Usuarios",
    icon: Users,
    path: "/users",
    roles: ["admin", "dueno"],
  },
  {
    id: "tags",
    label: "Etiquetas",
    icon: Tags,
    path: "/tags",
    roles: ["admin", "dueno"],
  },
  {
    id: "organizations",
    label: "Org",
    icon: Building,
    path: "/organizations",
    roles: ["dueno"],
  },
];

interface UserData {
  id: string;
  name: string;
  email: string;
  role: string;
}

/* ===================== COMPONENT ===================== */

export function NavigationSidebar() {
  const MOBILE_MAX_ITEMS = 4;

  const location = useLocation();
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<string>("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<UserData | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const totalUnread = useUnreadBadge();

  /* ===================== EFFECTS ===================== */

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const storedRole = localStorage.getItem("role");

    if (storedUser) setUser(JSON.parse(storedUser));
    if (storedRole) setRole(storedRole);
  }, []);

  useEffect(() => {
    setIsSettingsOpen(false);
    setMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!mobileMenuOpen) return;

    const close = () => setMobileMenuOpen(false);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [mobileMenuOpen]);

  /* ===================== DERIVED ===================== */

  const allowedItems = navigationItems.filter((i) =>
    i.roles.includes(role)
  );

  const mobileNavItems = allowedItems.slice(0, MOBILE_MAX_ITEMS);
  const mobileMoreItems = allowedItems.slice(MOBILE_MAX_ITEMS);

  /* ===================== ACTIONS ===================== */

  const handleLogout = () => {
    localStorage.clear();
    setOpen(false);
    navigate("/login");
  };

  const renderUserIcon = () => {
    switch (user?.role) {
      case "admin":
        return <Star className="w-4 h-4" />;
      case "dueno":
        return <Crown className="w-4 h-4" />;
      case "colaborador":
        return <User className="w-4 h-4" />;
      default:
        return <UserIcon className="w-4 h-4" />;
    }
  };

  /* ===================== JSX ===================== */

  return (
    <>
      {/* ===================== DESKTOP SIDEBAR ===================== */}
      <div className="hidden md:flex flex-col w-20 bg-background-dark border-r border-border h-full">
        {user && (
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="w-full p-4 flex flex-col items-center gap-1 text-xs text-background hover:bg-background/20"
          >
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              {renderUserIcon()}
            </div>
            <span>Perfil</span>
          </button>
        )}

        <div className="flex-1 flex flex-col">
          {allowedItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.id}
                to={item.path}
                className={cn(
                  "w-full p-4 flex flex-col items-center gap-1 text-xs transition-colors",
                  isActive
                    ? "bg-background/10 text-background border-r-4 border-primary"
                    : "text-background hover:bg-background/20 hover:text-primary"
                )}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>

        <button
          onClick={() => setOpen(true)}
          className="w-full p-4 flex flex-col items-center gap-1 text-xs text-background hover:bg-background/20 hover:text-destructive"
        >
          <LogOut className="w-4 h-4" />
          <span>Salir</span>
        </button>
      </div>

      {/* ===================== MOBILE NAVBAR ===================== */}
      <div className="fixed bottom-0 left-0 w-full bg-background-dark border-t border-border flex justify-around md:hidden z-50">

        {mobileNavItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.id}
              to={item.path}
              onClick={() => setMobileMenuOpen(false)}
              className={cn(
                "p-3",
                isActive ? "text-primary" : "text-background"
              )}
            >
              <div className="relative">
                <item.icon className="w-5 h-5" />
                {item.id === "messages" && totalUnread > 0 && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
                )}
              </div>
            </Link>
          );
        })}

        {mobileMoreItems.length > 0 && (
          <div className="relative">
            <button
            title="Más"
              onClick={(e) => {
                e.stopPropagation();
                setMobileMenuOpen((v) => !v);
              }}
              className="p-3 text-background"
            >
              <MoreVertical className="w-5 h-5" />
            </button>

            {mobileMenuOpen && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute bottom-14 right-0 w-56 bg-background border border-border rounded-md shadow-xl"
              >
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setIsSettingsOpen(true);
                  }}
                  className="w-full px-4 py-3 flex items-center gap-3 text-sm hover:bg-background/20"
                >
                  <UserIcon className="w-4 h-4" />
                  Perfil
                </button>

                {mobileMoreItems.map((item) => (
                  <Link
                    key={item.id}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full px-4 py-3 flex items-center gap-3 text-sm hover:bg-background/20"
                  >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                ))}

                <div className="border-t border-border" />

                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setOpen(true);
                  }}
                  className="w-full px-4 py-3 flex items-center gap-3 text-sm text-destructive hover:bg-background/20"
                >
                  <LogOut className="w-4 h-4" />
                  Salir
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ===================== LOGOUT DIALOG ===================== */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Seguro que quieres salir?</DialogTitle>
            <DialogDescription>
              Al salir, tu sesión se cerrará.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleLogout}>
              Salir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===================== SETTINGS MODAL ===================== */}
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
