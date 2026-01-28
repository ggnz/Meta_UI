import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { OctagonX, Building, User, ArrowRight, ArrowLeft, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createOrganization } from "@/api/organizations";
import { register } from "@/api/auth";

interface RegisterViewProps {
  onViewChange: (view: string) => void;
}

type FormStep = "organization" | "user" | "password";

export function RegisterView({ onViewChange }: RegisterViewProps) {
  const [currentStep, setCurrentStep] = useState<FormStep>("organization");
  const [organizationData, setOrganizationData] = useState({
    name: "",
  });
  const [userData, setUserData] = useState({
    firstName: "",
    lastName: "",
    email: "",
  });
  const [passwordData, setPasswordData] = useState({
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleOrganizationInputChange = (field: string, value: string) => {
    setOrganizationData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleUserInputChange = (field: string, value: string) => {
    setUserData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handlePasswordInputChange = (field: string, value: string) => {
    setPasswordData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleCreateOrganizationAndUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // Validar que las contraseñas coincidan
    if (passwordData.password !== passwordData.confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }

    // Validar requisitos de la nueva contraseña
    const validation = validatePassword(passwordData.password);
    if (!validation.isValid) {
      setError(`Contraseña inválida: ${validation.errors.join(", ")}`);
      return;
    }

    if (!organizationData.name.trim()) {
      setError("El nombre de la organización es requerido");
      return;
    }

    if (
      !userData.firstName.trim() ||
      !userData.lastName.trim() ||
      !userData.email.trim()
    ) {
      setError("Todos los campos de usuario son requeridos");
      return;
    }

    setLoading(true);
    try {
      // Step 1: Create organization first
      const organization = await createOrganization({
        name: organizationData.name.trim(),
      });

      // Step 2: Create user with owner role for the organization
      const user = await register({
        name: `${userData.firstName.trim()} ${userData.lastName.trim()}`,
        email: userData.email.trim(),
        password: passwordData.password,
        organizationId: organization.organization_id,
      });

      console.log("User created:", user);

      // Handle tokens and redirect
      if (user.accessToken && user.refreshToken) {
        localStorage.setItem("accessToken", user.accessToken);
        localStorage.setItem("refreshToken", user.refreshToken);
        localStorage.setItem("user", JSON.stringify(user.user || user));
        localStorage.setItem("role", user.user.role);
        localStorage.removeItem("rememberedEmail");
      } else {
        localStorage.setItem(
          "user",
          JSON.stringify({
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            organizationId: organization.id,
          })
        );
      }

      navigate("/");
    } catch (err: any) {
      console.error("Registration failed:", err.response?.data || err);

      if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else if (err.response?.status === 500) {
        setError(
          "Error del servidor. Verifica que el backend esté funcionando correctamente."
        );
      } else {
        setError("Ocurrió un error al crear la cuenta");
      }
    } finally {
      setLoading(false);
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

  const handleNextStep = () => {
    setError(null);
    if (currentStep === "organization") {
      if (!organizationData.name.trim()) {
        setError("El nombre de la organización es requerido");
        return;
      }
      setCurrentStep("user");
    } else if (currentStep === "user") {
      if (
        !userData.firstName.trim() ||
        !userData.lastName.trim() ||
        !userData.email.trim()
      ) {
        setError("Todos los campos de usuario son requeridos");
        return;
      }
      setCurrentStep("password");
    }
  };

  const handlePreviousStep = () => {
    setError(null);
    if (currentStep === "password") {
      setCurrentStep("user");
    } else if (currentStep === "user") {
      setCurrentStep("organization");
    }
  };

  const isStepValid = () => {
    switch (currentStep) {
      case "organization":
        return organizationData.name.trim() !== "";
      case "user":
        return (
          userData.firstName.trim() !== "" &&
          userData.lastName.trim() !== "" &&
          userData.email.trim() !== ""
        );
      case "password":
        return (
          passwordData.password !== "" &&
          passwordData.confirmPassword !== "" &&
          passwordData.password === passwordData.confirmPassword &&
          validatePassword(passwordData.password).isValid
        );
      default:
        return false;
    }
  };

  return (
    <div className="bg-background-light flex items-center justify-center min-h-full  p-4">
      <Card className="w-full max-w-md bg-background">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            {currentStep === "organization"
              ? "Crear Organización"
              : currentStep === "user"
              ? "Completar Registro"
              : "Crear Contraseña"}
          </CardTitle>
          <CardDescription className="text-center">
            {currentStep === "organization"
              ? "Crea tu organización para comenzar"
              : currentStep === "user"
              ? "Completa tu información personal"
              : "Crea una contraseña segura"}
          </CardDescription>

          {/* Progress indicator */}
          <div className="flex justify-center space-x-2 mt-4">
            <div
              className={`flex items-center ${
                currentStep === "organization"
                  ? "text-primary"
                  : "text-muted-foreground"
              }`}
            >
              <Building className="w-4 h-4 mr-1" />
              <span className="text-sm">Organización</span>
            </div>
            <div className="text-muted-foreground">
              <ArrowRight className="mt-0.5 w-4 h-5" />
            </div>
            <div
              className={`flex items-center ${
                currentStep === "user"
                  ? "text-primary"
                  : "text-muted-foreground"
              }`}
            >
              <User className="w-4 h-4 mr-1" />
              <span className="text-sm">Usuario</span>
            </div>
            <div className="text-muted-foreground">
              <ArrowRight className="mt-0.5 w-4 h-5" />
            </div>
            <div
              className={`flex items-center ${
                currentStep === "password"
                  ? "text-primary"
                  : "text-muted-foreground"
              }`}
            >
              <Lock className="w-4 h-4 mr-1" />
              <span className="text-sm">Contraseña</span>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* Organization Form */}
          {currentStep === "organization" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleNextStep();
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="organizationName">
                  Nombre de la Organización
                </Label>
                <Input
                  id="organizationName"
                  placeholder="Mi Empresa S.A."
                  value={organizationData.name}
                  onChange={(e) =>
                    handleOrganizationInputChange("name", e.target.value)
                  }
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Este será el nombre de tu empresa o organización en la
                  plataforma
                </p>
              </div>

              {/* Error message */}
              {error && (
                <div className="flex items-center text-sm text-red-500 space-x-2">
                  <OctagonX className="w-4 h-4" />
                  <span>{error}</span>
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                variant="secondary"
                disabled={!organizationData.name.trim()}
              >
                Continuar <ArrowRight className="ml-2 w-4 h-4" />
              </Button>

              <div className="mt-4 text-center text-sm text-muted-foreground">
                ¿Ya tienes una organización?{" "}
                <Button
                  variant="link"
                  className="p-0 h-auto text-sm"
                  onClick={() => onViewChange("login")}
                >
                  Iniciar sesión
                </Button>
              </div>
            </form>
          )}

          {/* User Form */}
          {currentStep === "user" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleNextStep();
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">
                  Organización:{" "}
                  <span className="font-medium text-foreground">
                    {organizationData.name}
                  </span>
                </Label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Nombre</Label>
                  <Input
                    id="firstName"
                    placeholder="John"
                    value={userData.firstName}
                    onChange={(e) =>
                      handleUserInputChange("firstName", e.target.value)
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Apellido</Label>
                  <Input
                    id="lastName"
                    placeholder="Doe"
                    value={userData.lastName}
                    onChange={(e) =>
                      handleUserInputChange("lastName", e.target.value)
                    }
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Correo electrónico</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="john@example.com"
                  value={userData.email}
                  onChange={(e) =>
                    handleUserInputChange("email", e.target.value)
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Rol</Label>
                <Input
                  id="role"
                  disabled
                  placeholder="Administrador (asignado automáticamente)"
                  required
                />
              </div>

              {/* Error message */}
              {error && (
                <div className="flex items-center text-sm text-red-500 space-x-2">
                  <OctagonX className="w-4 h-4" />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={handlePreviousStep}
                >
                  <ArrowLeft className="mr-2 w-4 h-4" />
                  Atrás
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  variant="secondary"
                  disabled={!isStepValid()}
                >
                  Continuar <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </div>

              <div className="mt-4 text-center text-sm text-muted-foreground">
                ¿Ya tienes una cuenta?{" "}
                <Button
                  variant="link"
                  className="p-0 h-auto text-sm"
                  onClick={() => onViewChange("login")}
                >
                  Iniciar sesión
                </Button>
              </div>
            </form>
          )}

          {/* Password Form */}
          {currentStep === "password" && (
            <form
              onSubmit={handleCreateOrganizationAndUser}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Crea una contraseña"
                  value={passwordData.password}
                  onChange={(e) =>
                    handlePasswordInputChange("password", e.target.value)
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirma tu contraseña"
                  value={passwordData.confirmPassword}
                  onChange={(e) =>
                    handlePasswordInputChange("confirmPassword", e.target.value)
                  }
                  required
                />
              </div>

              <div className="bg-muted/20 rounded-md p-3 mt-2">
                <p className="text-xs font-medium text-foreground mb-2">
                  Requisitos de la contraseña:
                </p>
                <div className="text-xs text-muted-foreground space-y-1">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-1.5 h-1.5 rounded-full ${
                        passwordData.password.length >= 6
                          ? "bg-green-500"
                          : "bg-muted-foreground"
                      }`}
                    ></div>
                    <span>Mínimo 6 caracteres</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-1.5 h-1.5 rounded-full ${
                        /[A-Z]/.test(passwordData.password)
                          ? "bg-green-500"
                          : "bg-muted-foreground"
                      }`}
                    ></div>
                    <span>1 letra mayúscula</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-1.5 h-1.5 rounded-full ${
                        /[a-z]/.test(passwordData.password)
                          ? "bg-green-500"
                          : "bg-muted-foreground"
                      }`}
                    ></div>
                    <span>1 letra minúscula</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-1.5 h-1.5 rounded-full ${
                        /[0-9]/.test(passwordData.password)
                          ? "bg-green-500"
                          : "bg-muted-foreground"
                      }`}
                    ></div>
                    <span>1 número</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-1.5 h-1.5 rounded-full ${
                        /[!@#$%^&*]/.test(passwordData.password)
                          ? "bg-green-500"
                          : "bg-muted-foreground"
                      }`}
                    ></div>
                    <span>1 carácter especial (!@#$%^&*)</span>
                  </div>
                </div>
              </div>

              {/* Error message */}
              {error && (
                <div className="flex items-center text-sm text-red-500 space-x-2">
                  <OctagonX className="w-4 h-4" />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={handlePreviousStep}
                  disabled={loading}
                >
                  <ArrowLeft className="mr-2 w-4 h-4" />
                  Atrás
                </Button>
                <Button 
                  type="submit" 
                  className="flex-1" 
                  disabled={loading || !isStepValid()}
                >
                  {loading ? "Creando cuenta..." : "Crear cuenta"}
                </Button>
              </div>

              <div className="mt-4 text-center text-sm text-muted-foreground">
                ¿Ya tienes una cuenta?{" "}
                <Button
                  variant="link"
                  className="p-0 h-auto text-sm"
                  onClick={() => onViewChange("login")}
                >
                  Iniciar sesión
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}