import { useEffect, useState } from "react";
import {
  MessageSquare,
  Waypoints,
  Users,
  LogOut,
  Tags,
  Building,
  FileText,
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
    icon: Users,
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

export function NavigationSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<string>(""); 
  const totalUnread = useUnreadBadge();

  useEffect(() => {
    const userRole = localStorage.getItem("role");
    if (userRole) {
      setRole(userRole);    
    }
  }, []);

  const allowedItems = navigationItems.filter((item) =>
    item.roles.includes(role)
  );

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("role");

    setOpen(false);
    navigate("/login");
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden md:flex flex-col w-20 bg-background-dark border-r border-border h-full">
        {/* Nav items */}
        <div className="flex-1 flex flex-col py-0">
          {allowedItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.id}
                to={item.path}
                className={cn(
                  "w-full p-4 flex flex-col items-center gap-1 text-xs transition-colors group",
                  "hover:bg-background/20 hover:text-primary",
                  isActive
                    ? "bg-background/10 text-background border-r-4 border-primary"
                    : "text-background"
                )}
                title={item.label}
              >
                <div className="relative">
                  <item.icon className="w-5 h-5" />
                  {item.id === "messages" && totalUnread > 0 && (
                    <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full" />
                  )}
                </div>
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </div>

        {/* Logout */}
        <div className="border-t border-border p-4">
          <button
            onClick={() => setOpen(true)}
            className="w-full p-2 flex flex-col items-center gap-1 text-xs text-background hover:bg-background/50 hover:text-destructive transition-colors rounded-md"
          >
            <LogOut className="w-4 h-4" />
            <span>Salir</span>
          </button>
        </div>
      </div>

      {/* Mobile Bottom Navbar */}
      <div className="fixed bottom-0 left-0 w-full bg-background-dark border-t border-border flex justify-around md:hidden z-50">
        {allowedItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.id}
              to={item.path}
              className={cn(
                "flex text-sidebar-foreground flex-col items-center justify-center p-2 text-xs transition-colors",
                isActive
                  ? "text-primary"
                  : "text-background hover:text-primary"
              )}
              title={item.label}
            >
              <div className="relative">
                <item.icon className="w-5 h-5" />
                {item.id === "messages" && totalUnread > 0 && (
                  <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full" />
                )}
              </div>
               {/*<span className="truncate text-[10px]">{item.label}</span>*/}
            </Link>
          );
        })}

        {/* Logout icon */}
        <button
          onClick={() => setOpen(true)}
          className="hidden sm:flex flex-col items-center justify-center p-2 text-background hover:text-destructive transition-colors"
          title="Salir"
        >
          <LogOut className="w-5 h-5" />
          <span className="truncate text-[10px]">Salir</span>
        </button>
      </div>

      {/* Logout Modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Seguro que quieres salir?</DialogTitle>
            <DialogDescription>
              Al salir, tu sesión se cerrará y regresarás a la página de inicio
              de sesión.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleLogout}>
              Salir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
