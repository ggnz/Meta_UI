// src/components/PlatformCard.tsx
import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X, Unplug } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import type { Page, PlatformInfo } from "@/api/connections";
import apiClient from "@/api/client";
type Props = {
  platformId: string;
  platform: PlatformInfo & {
    name: string;
    color: string;
    icon: JSX.Element;
    description: string;
  };
  userId: string;

  fetchItems: (userId: string) => Promise<Page[]>;
  selectItem: (userId: string, id: string) => Promise<void>;
  disconnectItem: (userId: string, id: string) => Promise<void>;
  disconnectPlatform: (platformId: string) => Promise<void>;
  updatePlatform: (platformId: string, newData: Partial<any>) => void;
};

export function PlatformCard({
  platformId,
  platform,
  userId,
  fetchItems,
  selectItem,
  disconnectItem,
  disconnectPlatform,
  updatePlatform,
}: Props) {
  const [availableItems, setAvailableItems] = useState<Page[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string>("");
  const [loadingItemId, setLoadingItemId] = useState<string | null>(null);
  const [loadingPlatform, setLoadingPlatform] = useState(false);
  const BASE_URL = apiClient.defaults.baseURL;

  const handleFetchItems = async () => {
    try {
      const items = await fetchItems(userId);
      setAvailableItems(items);
      if (items.length) setSelectedItemId(items[0].id);
    } catch (err) {
      console.error(err);
      toast({
        title: "Error",
        description: "No se pudieron obtener elementos",
      });
    }
  };

  const handleSelectItem = async () => {
    if (!selectedItemId) return;
    setLoadingPlatform(true);
    try {
      await selectItem(userId, selectedItemId);
      toast({
        title: "Conectado",
        description: "Elemento conectado correctamente",
      });

      // Update parent state
      updatePlatform(platformId, {
        status: "connected",
        account_connected: true,
        pages: [
          ...(platform.pages || []),
          availableItems.find((i) => i.id === selectedItemId),
        ],
      });

      // Optionally clear availableItems
      setAvailableItems([]);
      setSelectedItemId("");
    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: "No se pudo conectar" });
    } finally {
      setLoadingPlatform(false);
    }
  };

  const handleDisconnectItem = async (id: string, name: string) => {
    setLoadingItemId(id);
    try {
      await disconnectItem(userId, id);
      toast({
        title: "Desconectado",
        description: `"${name}" se ha desconectado`,
      });

      // Update parent state
      updatePlatform(platformId, {
        pages: (platform.pages || []).filter(
          (p) => p.page_id !== id && p.id !== id
        ),
        // Optionally, if no pages left, change status
        status:
          (platform.pages?.length || 0) === 1
            ? "account_only"
            : platform.status,
        account_connected:
          (platform.pages?.length || 0) === 1
            ? true
            : platform.account_connected,
      });
    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: "No se pudo desconectar" });
    } finally {
      setLoadingItemId(null);
    }
  };

  const handleDisconnectPlatform = async () => {
    setLoadingPlatform(true);
    try {
      await disconnectPlatform(platformId);
      toast({
        title: "Desconectado",
        description: `Se desconectó ${platform.name}`,
      });

      // Update parent state
      updatePlatform(platformId, {
        status: "disabled",
        account_connected: false,
        pages: [],
      });
    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: "No se pudo desconectar" });
    } finally {
      setLoadingPlatform(false);
    }
  };

  return (
    <Card className="p-2">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${platform.color}25` }}
            >
              {platform.icon}
            </div>
            <div>
              <CardTitle className="text-lg">{platform.name}</CardTitle>
              {platform.handle && (
                <p className="text-sm" style={{ color: platform.color }}>
                  {platform.handle}
                </p>
              )}
            </div>
          </div>
          <Badge
            variant={platform.account_connected ? "default" : "outline"}
            className={
              platform.account_connected ? "bg-green-300 text-green-900" : ""
            }
          >
            {platform.status === "connected"
              ? "Conectado"
              : platform.status === "account_only"
              ? "Cuenta conectada"
              : platform.status === "needs_reauth"
              ? "Reautenticación requerida"
              : "Desconectado"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <CardDescription>{platform.description}</CardDescription>

        <div className="flex flex-col gap-2 mt-2">
          {platform.status === "disabled" && (
            <Button
              size="sm"
              className="flex-1 py-2"
              disabled={loadingPlatform}
              onClick={async () => {
                try {
                  setLoadingPlatform(true);

                  if (platform.configure_method === "POST") {
                    const res = await apiClient.post(platform.configure_url);

                     if (res.data?.requiresAuth && res.data?.authUrl) {
                        window.location.href = res.data.authUrl;
                        return;
                      }
                    console.log("Connected:", res.data);
                  } else {
                    window.location.href = `${BASE_URL}${platform.configure_url}`;
                  }
                } catch (error) {
                  console.error("Error connecting:", error);
                } finally {
                  setLoadingPlatform(false);
                }
              }}
            >
              {loadingPlatform ? "Conectando..." : `Conectar ${platform.name}`}
            </Button>
          )}

          {platform.status === "needs_reauth" && (
            <Button
              asChild
              size="sm"
              className="flex-1 py-2"
              disabled={loadingPlatform}
            >
              <a href={platform.configure_url || "#"}>
                {loadingPlatform
                  ? "Procesando..."
                  : `Reconectar ${platform.name}`}
              </a>
            </Button>
          )}

          {platform.status === "account_only" && (
            <>
              <CardDescription>
                <>
                  <p className="text-sm text-muted-foreground mb-2">
                    Seleccionar la <span className="font-semibold">página</span>{" "}
                    que deseas gestionar:
                  </p>
                </>
              </CardDescription>
              {availableItems.length === 0 && (
                <Button
                  size="sm"
                  className="flex-1 py-2"
                  onClick={handleFetchItems}
                  disabled={loadingPlatform}
                >
                  {loadingPlatform ? "Cargando..." : "Seleccionar elemento"}
                </Button>
              )}

              {availableItems.length > 0 && (
                <div className="mt-2 space-y-2">
                  <Select
                    value={selectedItemId}
                    onValueChange={setSelectedItemId}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent className="bg-background-light">
                      {availableItems.map((i) => (
                        <SelectItem key={i.id} value={i.id}>
                          {i.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    className="w-full py-2"
                    onClick={handleSelectItem}
                    disabled={loadingPlatform}
                  >
                    {loadingPlatform ? "Conectando..." : "Conectar"}
                  </Button>
                </div>
              )}
            </>
          )}

          {platform.pages?.length > 0 && (
            <ul
              className="list-disc list-inside text-sm ps-4 my-4"
              style={{
                color: platform.color, // text color
                borderLeft: `4px solid ${platform.color}`, // left border color
              }}
            >
              <span className="text-muted-foreground text-sm">Tu pagina:</span>
              {platform.pages.map((p: any) => (
                <li
                  key={p.page_id || p.id}
                  className="flex items-center justify-between "
                >
                  <span className="text-foreground text-lg">
                    {p.page_name || p.name}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Desconectar página"
                    onClick={() =>
                      handleDisconnectItem(
                        p.page_id || p.id,
                        p.page_name || p.name
                      )
                    }
                    disabled={loadingItemId === (p.page_id || p.id)}
                  >
                    {loadingItemId === (p.page_id || p.id) ? (
                      <span className="animate-spin w-4 h-4 border-2 border-gray-300 border-t-gray-500 rounded-full" />
                    ) : (
                      <X className="w-4 h-4 text-red-500" />
                    )}
                  </Button>
                </li>
              ))}
            </ul>
          )}

          {(platform.status === "account_only" ||
            platform.status === "connected") && (
            <Button
              size="sm"
              variant="outline"
              className="flex-1 py-2"
              onClick={handleDisconnectPlatform}
              disabled={loadingPlatform}
            >
              <Unplug/>
              {loadingPlatform
                ? "Desconectando..."
                : `Desconectar ${platform.name}`}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
