import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useParams } from "react-router-dom";
import { resetPassword } from "@/api/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowLeft, OctagonX } from "lucide-react";
import chatWallpaper from "@/assets/chatWallpaper.png";

interface ResetPasswordViewProps {
  onViewChange: (view: string) => void;
}

export function ResetPasswordView({ onViewChange }: ResetPasswordViewProps) {
  const { token } = useParams<{ token: string }>();
  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
  });

  const [isSubmitted, setIsSubmitted] = useState(false);
  const [passwordMismatch, setPasswordMismatch] = useState(false);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    const newPassword = field === "password" ? value : formData.password;
    const newConfirmPassword =
      field === "confirmPassword" ? value : formData.confirmPassword;

    setPasswordMismatch(newPassword !== newConfirmPassword);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      alert("Token no encontrado en la URL");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setPasswordMismatch(true);
      return;
    }

    try {
      await resetPassword(token, formData.password);

      setIsSubmitted(true);
    } catch (err: any) {
      console.error(err);
      alert(
        err?.response?.data?.message ||
          "Ocurrió un error al restablecer la contraseña"
      );
    }
  };

  if (isSubmitted) {
    return (
      <div className="bg-background-light flex items-center justify-center min-h-full bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">
              Listo
            </CardTitle>
            <CardDescription className="text-center">
              Tu contraseña ha sido restablecida con éxito.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                Ahora puedes iniciar sesión con tu nueva contraseña.
              </p>
              <Button
                variant="link"
                className="w-full"
                onClick={() => onViewChange("login")}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Volver a iniciar sesión
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="chat-wallpaper flex items-center justify-center min-h-full bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            Reestablecer contraseña
          </CardTitle>
          <CardDescription className="text-center">
            Introduce tu nueva contraseña y confírmala para continuar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <span className="ml-2 text-red-500">*</span>
              <Input
                id="password"
                type="password"
                placeholder="Crea una contraseña"
                value={formData.password}
                onChange={(e) => handleInputChange("password", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirma tu contraseña"
                value={formData.confirmPassword}
                onChange={(e) =>
                  handleInputChange("confirmPassword", e.target.value)
                }
                required
              />
            </div>

            {passwordMismatch && (
              <div className="flex items-center text-sm text-red-500">
                <OctagonX className="w-5 h-5" />
                <span className="ml-2">Las contraseñas no coinciden</span>
              </div>
            )}

            <Button type="submit" className="w-full">
              Reestablecer contraseña
            </Button>
          </form>

          <div className="mt-4 text-center">
            <Button
              variant="link"
              className="text-sm"
              onClick={() => onViewChange("login")}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver a iniciar sesión
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
