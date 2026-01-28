import {
  User,
  Star,
  Crown,
  LogOut,
  User as UserIcon,
  KeyRound,
  ChevronLeft,
  Building,
  OctagonX,
  Trash2,
} from "lucide-react";
import { useState, useEffect } from "react";
import { changePassword } from "@/api/auth";
import { updateUser } from "@/api/users";
import { updateOrganization, deleteOrganization } from "@/api/organizations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { isValidEmail } from "@/utils/mail";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  onUserUpdate: (user: any) => void;
}

export function SettingsModal({
  isOpen,
  onClose,
  user,
  onUserUpdate,
}: SettingsModalProps) {
  const [err, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<
    "menu" | "profile" | "password" | "organization"
  >("menu");
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const { toast } = useToast();

  // Estados para los formularios
  const [profileData, setProfileData] = useState({
    name: "",
    email: "",
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [organizationData, setOrganizationData] = useState({
    name: "",
  });

  // Cargar datos cuando el modal se abre o el usuario cambia
  useEffect(() => {
    if (isOpen && user) {
      setProfileData({
        name: user.name || "",
        email: user.email || "",
      });
      setOrganizationData({
        name: user.organization?.name || "",
      });
    }
  }, [isOpen, user]);

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case "admin":
        return "Administrador";
      case "dueno":
        return "Dueño";
      case "colaborador":
        return "Colaborador";
      default:
        return "Usuario";
    }
  };

  const renderUserIcon = () => {
    if (!user?.role)
      return <UserIcon className="w-4 h-4 text-muted-foreground" />;

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

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsLoading(true);
    setError(null);
    try {
      if (!isValidEmail(profileData.email)) {
        toast({
          title: "Error",
          description: "Por favor ingresa un email válido con @ y dominio",
          variant: "destructive",
        });
        return;
      }

      await updateUser(user.id, {
        name: profileData.name,
        email: profileData.email,
      });

      const updatedUserData = {
        ...user,
        name: profileData.name,
        email: profileData.email,
      };

      onUserUpdate(updatedUserData);

      localStorage.setItem("user", JSON.stringify(updatedUserData));

      toast({
        title: "Perfil actualizado",
        description: "Tu información se ha actualizado correctamente",
        variant: "default",
      });

      setActiveSection("menu");
    } catch (error: any) {
      console.error("Error updating profile:", error);
      setError(error.message || "Error al actualizar el perfil");
    } finally {
      setIsLoading(false);
    }
  };

  const validatePassword = (
    password: string
  ): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (password.length < 6) {
      errors.push("Mínimo 6 caracteres");
    }
    if (!/[A-Z]/.test(password)) {
      errors.push("Al menos 1 letra mayúscula");
    }
    if (!/[a-z]/.test(password)) {
      errors.push("Al menos 1 letra minúscula");
    }
    if (!/[0-9]/.test(password)) {
      errors.push("Al menos 1 número");
    }
    if (!/[!@#$%^&*]/.test(password)) {
      errors.push("Al menos 1 carácter especial (!@#$%^&*)");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  };

  const handlePasswordChange = async () => {
    setError(null);

    // Validar que las contraseñas coincidan
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }

    // Validar requisitos de la nueva contraseña
    const validation = validatePassword(passwordData.newPassword);
    if (!validation.isValid) {
      setError(`Contraseña inválida: ${validation.errors.join(", ")}`);
      return;
    }

    // Validar que la nueva contraseña sea diferente a la actual
    if (passwordData.newPassword === passwordData.currentPassword) {
      setError("La nueva contraseña debe ser diferente a la actual");
      return;
    }

    setIsLoading(true);
    try {
      await changePassword(
        passwordData.currentPassword,
        passwordData.newPassword
      );

      toast({
        title: "Contraseña actualizada",
        description: "Tu contraseña se ha cambiado correctamente",
        variant: "default",
      });

      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setActiveSection("menu");
    } catch (error: any) {
      console.error("Error changing password:", error);
      if (error.response?.data?.message) {
        setError(error.response.data.message);
      } else if (error.message) {
        setError(error.message);
      } else {
        setError("Error al cambiar la contraseña");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleOrganizationUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsLoading(true);
    setError(null);
    try {
      const organizationId = user.organization?.id;

      if (!organizationId) {
        throw new Error("No se pudo identificar la organización");
      }

      const updatedOrganization = await updateOrganization(organizationId, {
        name: organizationData.name,
      });

      // Actualizar el usuario con la nueva organización
      const updatedUser = {
        ...user,
        organization: {
          ...user.organization,
          name: updatedOrganization.name,
        },
      };

      onUserUpdate(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));

      toast({
        title: "Organización actualizada",
        description: "Tu información se ha actualizado correctamente",
        variant: "default",
      });

      setActiveSection("menu");
    } catch (error: any) {
      console.error("Error updating organization:", error);
      setError(error.message || "Error al actualizar la organización");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteOrganization = async () => {
    if (!user) return;

    setIsLoading(true);
    setError(null);
    try {
      const organizationId = user.organization?.id;

      if (!organizationId) {
        throw new Error("No se pudo identificar la organización");
      }

      // Llamar al endpoint de eliminación
      await deleteOrganization(organizationId);

      toast({
        title: "Organización eliminada",
        description: "La organización y todos sus datos han sido eliminados",
        variant: "default",
      });

      // Cerrar sesión ya que la organización ya no existe
      handleLogout();
    } catch (error: any) {
      console.error("Error deleting organization:", error);
      setError(error.message || "Error al eliminar la organización");
    } finally {
      setIsLoading(false);
      setIsDeleteConfirmOpen(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("role");
    window.location.href = "/login";
  };

  const closeModal = () => {
    onClose();
    setActiveSection("menu");
    setError(null);
    setPasswordData({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-20 flex items-start justify-center md:justify-start md:ps-20">
      {/* Backdrop */}
      <div className="absolute inset-0" onClick={closeModal} />

      {/* Modal Content */}
      <div
        className="
          relative bg-background border border-border shadow-xl
          w-full h-[100dvh] max-w-none rounded-none
          md:w-80 md:h-auto md:max-w-[90vw] md:rounded-r-md md:mr-5
        "
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border md:p-4">
          <div className="flex items-center gap-3 flex-1">
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
              {renderUserIcon()}
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-muted">{user.name}</h3>
              <p className="text-sm text-muted">
                {getRoleDisplayName(user.role)}
              </p>
              <p className="text-xs text-secondary mt-4 flex items-center gap-1 font-semibold">
                <Building className="w-4 h-4" />
                {organizationData.name}
              </p>
            </div>
          </div>
        </div>

        {/* Menu Principal */}
        {activeSection === "menu" && (
          <div className="flex-1 overflow-y-auto">
            {/* Settings Options */}
            <div className="p-2">
              <button
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-muted hover:bg-background-light rounded-md transition-colors"
                onClick={() => {
                  setActiveSection("profile");
                  setError(null);
                }}
              >
                <UserIcon className="w-4 h-4" />
                Información de Perfil
              </button>

              <button
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-muted hover:bg-background-light rounded-md transition-colors"
                onClick={() => setActiveSection("password")}
              >
                <KeyRound className="w-4 h-4" />
                Cambiar tu contraseña
              </button>

              {user.role === "admin" && (
                <button
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-muted hover:bg-background-light rounded-md transition-colors"
                  onClick={() => {
                    setActiveSection("organization");
                    setError(null);
                  }}
                >
                  <Building className="w-4 h-4" />
                  Mi Organización
                </button>
              )}
            </div>

            {/* Footer - Logout */}
            <div className="p-2 border-t border-border">
              <button
                className="w-full flex items-center gap-3 font-semibold px-3 py-2 text-sm text-red-600 hover:bg-background-light rounded-md"
                onClick={handleLogout}
              >
                <LogOut className="w-4 h-4" />
                Salir
              </button>
            </div>
          </div>
        )}

        {/* Formulario de Edición de Perfil */}
        {activeSection === "profile" && (
          <div className="p-2">
            <button
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-foreground hover:bg-background-light rounded-md transition-colors"
              onClick={() => {
                setActiveSection("menu");
                setError(null);
              }}
            >
              <ChevronLeft className="w-4 h-4" />
              Información de Perfil
            </button>

            <div className="space-y-4 p-2">
              <div>
                <label className="text-xs text-foreground mb-1 ms-1">
                  Nombre
                </label>
                <Input
                  title="Nombre"
                  type="text"
                  value={profileData.name}
                  onChange={(e) =>
                    setProfileData((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-1 border border-border rounded-md bg-background text-sm text-foreground"
                  required
                />
              </div>

              <div>
                <label className="text-xs text-foreground mb-1 ms-1">
                  Correo electrónico
                </label>
                <Input
                  title="Correo electrónico"
                  type="email"
                  value={profileData.email}
                  onChange={(e) =>
                    setProfileData((prev) => ({
                      ...prev,
                      email: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-1 border border-border rounded-md bg-background text-sm text-foreground"
                  required
                />
              </div>

              {err && (
                <div className="flex items-center text-sm text-red-500 space-x-2">
                  <OctagonX className="w-4 h-4" />
                  <span>{err}</span>
                </div>
              )}
              <div className="flex justify-end">
                <Button
                  onClick={handleProfileUpdate}
                  variant="ghost"
                  className="hover:text-primary"
                >
                  {isLoading ? "Actualizando..." : "Actualizar"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Formulario de Cambio de Contraseña */}
        {activeSection === "password" && (
          <div className="p-2">
            <button
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-foreground hover:bg-background-light rounded-md transition-colors"
              onClick={() => {
                setActiveSection("menu");
                setError(null);
                passwordData.currentPassword = null;
                passwordData.newPassword = null;
                passwordData.confirmPassword = null;
              }}
            >
              <ChevronLeft className="w-4 h-4" />
              Cambiar tu contraseña
            </button>

            <div className="space-y-4 p-2">
              <div>
                <label className="text-xs text-foreground mb-1 ms-1">
                  Contraseña Actual
                </label>
                <Input
                  title="currentPassword"
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) =>
                    setPasswordData((prev) => ({
                      ...prev,
                      currentPassword: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-1 border border-border rounded-md bg-background text-sm text-foreground"
                  required
                />
              </div>

              <div>
                <label className="text-xs text-foreground mb-1 ms-1">
                  Nueva Contraseña
                </label>
                <Input
                  title="newPassword"
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) =>
                    setPasswordData((prev) => ({
                      ...prev,
                      newPassword: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-1 border border-border rounded-md bg-background text-sm text-foreground"
                  required
                  minLength={6}
                />
              </div>

              <div>
                <label className="text-xs text-foreground mb-1 ms-1">
                  Confirmar Nueva Contraseña
                </label>
                <Input
                  title="confirmPassword"
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) =>
                    setPasswordData((prev) => ({
                      ...prev,
                      confirmPassword: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-1 border border-border rounded-md bg-background text-sm text-foreground"
                  required
                  minLength={6}
                />
              </div>

              {/* En la sección de contraseña, después de los inputs */}
              <div className="bg-background-light rounded-md p-3 mt-2">
                <p className="text-xs font-medium text-foreground mb-2">
                  Requisitos de la contraseña:
                </p>
                <div className="text-xs text-muted-foreground space-y-1">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-1.5 h-1.5 rounded-full ${
                        passwordData.newPassword.length >= 6
                          ? "bg-green-500"
                          : "bg-muted"
                      }`}
                    ></div>
                    <span>Mínimo 6 caracteres</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-1.5 h-1.5 rounded-full ${
                        /[A-Z]/.test(passwordData.newPassword)
                          ? "bg-green-500"
                          : "bg-muted"
                      }`}
                    ></div>
                    <span>1 letra mayúscula</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-1.5 h-1.5 rounded-full ${
                        /[a-z]/.test(passwordData.newPassword)
                          ? "bg-green-500"
                          : "bg-muted"
                      }`}
                    ></div>
                    <span>1 letra minúscula</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-1.5 h-1.5 rounded-full ${
                        /[0-9]/.test(passwordData.newPassword)
                          ? "bg-green-500"
                          : "bg-muted"
                      }`}
                    ></div>
                    <span>1 número</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-1.5 h-1.5 rounded-full ${
                        /[!@#$%^&*]/.test(passwordData.newPassword)
                          ? "bg-green-500"
                          : "bg-muted"
                      }`}
                    ></div>
                    <span>1 carácter especial (!@#$%^&*)</span>
                  </div>
                </div>
              </div>

              {/* Error message */}
              {err && (
                <div className="flex items-center text-sm text-red-500 space-x-2">
                  <OctagonX className="w-4 h-4" />
                  <span>{err}</span>
                </div>
              )}

              <div className="flex justify-end">
                <Button
                  onClick={handlePasswordChange}
                  variant="ghost"
                  className="hover:text-primary"
                  disabled={isLoading}
                >
                  {isLoading ? "Actualizando..." : "Actualizar"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Formulario de Edición de Oraganizacion */}
        {activeSection === "organization" && (
          <div className="p-2">
            <button
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-foreground hover:bg-muted rounded-md transition-colors"
              onClick={() => {
                setActiveSection("menu");
                setError(null);
              }}
            >
              <ChevronLeft className="w-4 h-4" />
              Mi Organización
            </button>

            <div className="space-y-4 p-2">
              <div>
                <label className="text-xs text-foreground mb-1 ms-1">
                  Nombre
                </label>
                <Input
                  title="name"
                  type="text"
                  value={organizationData.name}
                  onChange={(e) =>
                    setOrganizationData((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-1 border border-border rounded-md bg-background text-sm text-foreground"
                  required
                />
              </div>

              {err && (
                <div className="flex items-center text-sm text-red-500 space-x-2">
                  <OctagonX className="w-4 h-4" />
                  <span>{err}</span>
                </div>
              )}

              <div className="flex justify-between">
                <Button
                  onClick={() => setIsDeleteConfirmOpen(true)}
                  variant="ghost"
                  className="text-destructive hover:text-destructive/80"
                  disabled={isLoading}
                >
                  {isLoading ? "Eliminando..." : "Eliminar Organización"}
                </Button>
                {/* Modal de confirmación para eliminar organización */}
                {isDeleteConfirmOpen && (
                  <div className="fixed inset-0 z-[60] flex items-center justify-center">
                    {/* Backdrop */}
                    <div
                      className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                      onClick={() => setIsDeleteConfirmOpen(false)}
                    />

                    {/* Modal Content */}
                    <Dialog
                      open={isDeleteConfirmOpen}
                      onOpenChange={setIsDeleteConfirmOpen}
                    >
                      <DialogContent className="border border-border rounded-md w-96 max-w-[90vw] p-0 overflow-hidden">
                        <DialogHeader className="p-6 pb-4">
                          <div className="text-center">
                            <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                              <Trash2 className="w-6 h-6 text-red-500" />
                            </div>
                            <DialogTitle className="text-lg font-semibold text-foreground mb-2">
                              ¿Eliminar Organización?
                            </DialogTitle>
                            <p className="text-sm text-muted-foreground">
                              Esta acción{" "}
                              <span className="text-red-500 font-medium">
                                no se puede deshacer
                              </span>
                              .
                            </p>
                          </div>
                        </DialogHeader>

                        <div className="px-6">
                          <div className="bg-background-light rounded-md p-3">
                            <p className="mb-2 text-sm">
                              Se eliminarán permanentemente:
                            </p>
                            <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                              <li>Todos los usuarios de la organización</li>
                              <li>Todas las conversaciones y mensajes</li>
                              <li>Todos los contactos y etiquetas</li>
                              <li>Todas las plantillas de mensajes</li>
                              <li>Tus datos de usuario actual</li>
                            </ul>
                          </div>
                        </div>

                        <DialogFooter className="p-6 pt-4">
                          <div className="flex gap-3 w-full">
                            <Button
                              variant="outline"
                              onClick={() => setIsDeleteConfirmOpen(false)}
                              className="flex-1"
                              disabled={isLoading}
                            >
                              Cancelar
                            </Button>
                            <Button
                              variant="destructive"
                              onClick={handleDeleteOrganization}
                              className="flex-1"
                              disabled={isLoading}
                            >
                              {isLoading ? "Eliminando..." : "Sí, Eliminar"}
                            </Button>
                          </div>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                )}
                <Button
                  onClick={handleOrganizationUpdate}
                  variant="ghost"
                  className="hover:text-primary"
                >
                  {isLoading ? "Actualizando..." : "Actualizar"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
