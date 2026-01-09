import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import logo from "@/assets/vayneLogo.png";
import { login } from "@/api/auth";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { OctagonX } from "lucide-react";
import { FaWhatsapp, FaFacebook, FaInstagram } from "react-icons/fa";
import chatWallpaper from "@/assets/chatWallpaper.png"; // Importa la imagen

interface LoginViewProps {
  onViewChange: (view: string) => void;
}

export function LoginView({ onViewChange }: LoginViewProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [isBackgroundLoaded, setIsBackgroundLoaded] = useState(false);

  useEffect(() => {
    const img = new Image();
    img.src = chatWallpaper;
    img.onload = () => setIsBackgroundLoaded(true);
    img.onerror = () => setIsBackgroundLoaded(true); 
  }, []);

  // Cargar credenciales guardadas al montar el componente
  useEffect(() => {
    const savedEmail = localStorage.getItem("rememberedEmail");

    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const data = await login(email, password);

      // Guardar tokens
      localStorage.setItem("accessToken", data.accessToken);
      localStorage.setItem("refreshToken", data.refreshToken);
      localStorage.setItem("user", JSON.stringify(data.user));
      localStorage.setItem("role", data.user.role);

      if (rememberMe) {
        localStorage.setItem("rememberedEmail", email);
      } else {
        localStorage.removeItem("rememberedEmail");
      }

      // Redirigir
      navigate("/");
    } catch (err: any) {
      console.error("Login failed:", err.response?.data || err);

      if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError("Ocurrió un error al iniciar sesión");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
     <div 
      className="bg-background-light flex mx-0 md:px-40 flex-col lg:flex-row min-h-screen relative transition-opacity duration-500"
    >
      {/* Left side - rotating logo */}
      <div className="flex-[0.5] flex items-center justify-center overflow-hidden relative order-1 lg:order-none">
        <img
          src={logo}
          alt="Logo"
          className="w-28 h-28 lg:w-96 lg:h-96 object-contain"
        />
      </div>

      {/* Middle text section */}
      <div className="flex-[1] flex items-center justify-center overflow-hidden relative order-3 lg:order-none">
        <div className="space-y-3 lg:space-y-10 px-4 text-center ">
          <p className="text-md lg:text-md font-semibold text-foreground">
            Todas tus conversaciones. Todos tus clientes.
          </p>
          <p className="text-lg lg:text-xl font-semibold text-foreground">
            Una sola plataforma.
          </p>

          <div className="flex justify-center space-x-6 lg:space-x-8 mt-6">
            <FaWhatsapp className="text-green-500 w-6 h-6 lg:w-14 lg:h-14" />
            <FaInstagram className="text-pink-500 w-6 h-6 lg:w-14 lg:h-14" />
            <FaFacebook className="text-blue-600 w-6 h-6 lg:w-14 lg:h-14" />
          </div>
        </div>
      </div>

      {/* Right side - login form */}
      <div className="flex lg:flex-[1] lg:items-center p-4 order-2 lg:order-none">
        <Card className="w-full md:h-auto bg-background backdrop-blur-sm">
          <CardHeader className="space-y-1">
            <CardTitle className="text-muted text-xl lg:text-2xl font-bold text-center">
              Bienvenido de nuevo
            </CardTitle>
            <CardDescription className="text-muted text-center text-sm lg:text-base">
              Introduce tus credenciales para acceder a tu cuenta
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
                  className="text-muted bg-background/80"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Introduce tu contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="text-muted bg-background/80"
                />
              </div>

              {/* Checkbox Recordarme */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="rememberMe"
                  checked={rememberMe}
                  onCheckedChange={(checked) =>
                    setRememberMe(checked as boolean)
                  }
                />
                <Label
                  htmlFor="rememberMe"
                  className="text-sm font-normal cursor-pointer"
                >
                  Recordarme
                </Label>
              </div>

              {/* Error message */}
              {error && (
                <div className="flex items-center text-sm text-red-500 space-x-2">
                  <OctagonX className="w-4 h-4" />
                  <span>{error}</span>
                </div>
              )}

              <Button variant="secondary" type="submit" className="w-full" disabled={loading}>
                {loading ? "Iniciando sesión..." : "Iniciar sesión"}
              </Button>
            </form>

            <div className="mt-4 space-y-2">
              <div className="text-center">
                <Button
                  variant="link"
                  className="text-sm"
                  onClick={() => onViewChange("forgot-password")}
                >
                  Olvidaste tu contraseña?
                </Button>
              </div>
              <div className="text-center text-sm text-muted-foreground">
                No tienes una cuenta?{" "}
                <Button
                  variant="link"
                  className="p-0 h-auto text-sm"
                  onClick={() => onViewChange("register")}
                >
                  Registrarse
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
