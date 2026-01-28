import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, OctagonX } from "lucide-react";
import { forgotPassword } from "@/api/auth";
import chatWallpaper from "@/assets/chatWallpaper.png";

interface ForgotPasswordViewProps {
  onViewChange: (view: string) => void;
}

export function ForgotPasswordView({ onViewChange }: ForgotPasswordViewProps) {
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await forgotPassword(email);
      setIsSubmitted(true);
    } catch (err: any) {
      console.error("Forgot password failed:", err);
      setError(err.response?.data?.message || "Error al enviar el enlace");
    }
  };

  if (isSubmitted) {
    return (
      <div className="bg-background-light flex items-center justify-center min-h-full bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">Revisa tu correo electrónico</CardTitle>
            <CardDescription className="text-center">
              Hemos enviado un enlace para restablecer la contraseña a <strong>{email}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                Si no recibiste el correo electrónico, revisa tu carpeta de spam o intenta nuevamente.
              </p>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setIsSubmitted(false)}
              >
                Intenta de nuevo
              </Button>
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
    <div className="bg-background-light flex items-center justify-center min-h-full p-4">
      <Card className="w-full max-w-md bg-background">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Olvidaste tu contraseña</CardTitle>
          <CardDescription className="text-center">
            Introduce tu dirección de correo electrónico y te enviaremos un enlace para restablecer tu contraseña
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Correo electrónico</Label>
              <Input
                id="email"
                type="email"
                placeholder="Introduce tu correo electrónico"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {error && (
              <div className="flex items-center text-sm">
                <OctagonX className="w-4 h-4 text-red-500" />
                <span className="ml-2 text-red-500">{error}</span>
              </div>
            )}

            <Button type="submit" variant="secondary" className="w-full">
              Enviar enlace de restablecimiento
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
