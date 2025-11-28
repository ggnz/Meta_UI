// src/views/ConnectionsView.tsx
import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";
import { FaFacebookF, FaInstagram, FaWhatsapp } from "react-icons/fa";
import {
  getConnectionsSummary,
  deleteConnectionsPlatform,
  getFacebookPages,
  postFacebookPage,
  disconnectFacebookPage,
  getInstagramAccounts,
  postInstagramAccount,
  disconnectInstagramAccount,
  getWhatsappNumbers,
  postWhatsappNumber,
  disconnectWhatsappNumber,
  type ConnectionsResponse,
} from "@/api/connections";
import { PlatformCard } from "@/components/connections/PlatformCard";

const PLATFORM_CONFIG = {
  facebook: {
    name: "Facebook Messenger",
    icon: <FaFacebookF className="w-5 h-5" style={{ color: "#1877f2" }} />,
    color: "#1877f2",
    description: "Conecte su cuenta de Facebook para gestionar mensajes",
    fetchItems: getFacebookPages,
    selectItem: postFacebookPage,
    disconnectItem: disconnectFacebookPage,
  },
  instagram: {
    name: "Instagram",
    icon: <FaInstagram className="w-5 h-5" style={{ color: "#e4405f" }} />,
    color: "#e4405f",
    description: "Conecte su cuenta de Instagram para gestionar mensajes",
    fetchItems: getInstagramAccounts,
    selectItem: postInstagramAccount,
    disconnectItem: disconnectInstagramAccount,
  },
  whatsapp: {
    name: "WhatsApp Business",
    icon: <FaWhatsapp className="w-5 h-5" style={{ color: "#25d366" }} />,
    color: "#25d366",
    description:
      "Conecte su cuenta de WhatsApp Business para gestionar mensajes",
    fetchItems: getWhatsappNumbers,
    selectItem: postWhatsappNumber,
    disconnectItem: disconnectWhatsappNumber,
  },
};

export function ConnectionsView() {
  const [platforms, setPlatforms] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const userId = "1";

  const fetchConnections = async () => {
    try {
      setIsLoading(true);
      const data: ConnectionsResponse = await getConnectionsSummary(userId);
      const mapped = Object.entries(data).map(([id, info]) => ({
        id,
        ...PLATFORM_CONFIG[id as keyof typeof PLATFORM_CONFIG],
        ...info,
      }));
      setPlatforms(mapped);
    } catch (err) {
      console.error("Error fetching connections", err);
      toast({
        title: "Error",
        description: "No se pudieron cargar las conexiones.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const disconnectPlatform = async (platformId: string) => {
    await deleteConnectionsPlatform(platformId, userId);
    setPlatforms((prev) =>
      prev.map((p) =>
        p.id === platformId
          ? { ...p, status: "disabled", account_connected: false, pages: [] }
          : p
      )
    );
  };

  const disconnectItem = async (platformId: string, itemId: string) => {
    if (platformId === "facebook") {
      await disconnectFacebookPage(userId, itemId);
    } else if (platformId === "instagram") {
      await disconnectInstagramAccount(userId, itemId);
    } else if (platformId === "whatsapp") {
      await disconnectWhatsappNumber(userId, itemId);
    }

    setPlatforms((prev) =>
      prev.map((p) =>
        p.id === platformId
          ? {
              ...p,
              pages: p.pages.filter((page: any) => page.page_id !== itemId),
            }
          : p
      )
    );
  };

  useEffect(() => {
    fetchConnections();
  }, []);

  const updatePlatform = (platformId: string, newData: Partial<any>) => {
    setPlatforms((prev) =>
      prev.map((p) => (p.id === platformId ? { ...p, ...newData } : p))
    );
  };

   return (
    <div className="flex h-full bg-background flex-col">
      <Card className="border-0 shadow-none rounded-none">
        <CardHeader>
          <CardTitle className="text-xl md:text-2xl font-bold">
            Conexiones de plataforma
          </CardTitle>
          <p className="text-muted-foreground text-sm md:text-base">
            Conecta tus plataformas de redes sociales para gestionar todas las
            conversaciones en un solo lugar
          </p>
        </CardHeader>
      </Card>

      <div className="flex-1 overflow-y-auto m-6">
        {isLoading ? (
          <div className="flex flex-col h-full items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-muted-foreground">Cargando conexiones...</p>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {platforms.map((platform) => (
              <PlatformCard
                key={platform.id}
                platformId={platform.id}
                platform={platform}
                userId={userId}
                fetchItems={platform.fetchItems}
                selectItem={platform.selectItem}
                disconnectItem={(uid, itemId) =>
                  disconnectItem(platform.id, itemId)
                }
                disconnectPlatform={() => disconnectPlatform(platform.id)}
                updatePlatform={updatePlatform}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}