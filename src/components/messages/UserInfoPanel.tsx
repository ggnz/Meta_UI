import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Mail,
  Phone,
  MapPin,
  Building,
  Calendar,
  User,
  MessageCircle,
  X,
  Check,
  ChevronsUpDown,
  Edit,
  ChevronLeft,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { FaFacebookF, FaInstagram, FaWhatsapp } from "react-icons/fa";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";
import { isValidEmail } from "@/utils/mail";
import { updateContact } from "@/api/contacts";
import { getTags } from "@/api/tags";

interface UserInfo {
  id: string;
  name: string;
  email: string;
  phone: string;
  company?: string;
  location?: string;
  joinDate?: string;
  platform: "facebook" | "instagram" | "whatsapp";
  avatar?: string;
  tags: string[];
  totalMessages?: number;
  lastActivity?: string;
  customerScore?: number;
}

interface Tag {
  id: number;
  name: string;
}

interface Contact {
  id: number;
  name: string;
  email: string;
  phone: string;
  company?: string;
  location?: string;
  platform: string;
  lastMessageAt: string;
  tags: Tag[];
  avatar?: string;
}

const platformOptions = [
  { value: "whatsapp", label: "WhatsApp", icon: FaWhatsapp },
  { value: "facebook", label: "Facebook", icon: FaFacebookF },
  { value: "instagram", label: "Instagram", icon: FaInstagram },
];

interface UpdateContactData {
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  location?: string;
  platform?: string;
  lastMessageAt?: string;
  tags?: number[];
}

interface UserInfoPanelProps {
  userInfo: UserInfo | null;
  onClose: () => void;
  isLoading?: boolean;
  onContactUpdated?: () => void; // Add callback for when contact is updated
}

export function UserInfoPanel({
  userInfo,
  onClose,
  isLoading = false,
  onContactUpdated,
}: UserInfoPanelProps) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editContact, setEditContact] = useState<Contact | null>(null);
  const [editTagsPopoverOpen, setEditTagsPopoverOpen] = useState(false);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [editPlatformComboboxOpen, setEditPlatformComboboxOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Load available tags when edit modal opens
  useEffect(() => {
    if (isEditDialogOpen) {
      loadAvailableTags();
    }
  }, [isEditDialogOpen]);

  const loadAvailableTags = async () => {
    try {
      const tags = await getTags();
      setAvailableTags(Array.isArray(tags) ? tags : []);
    } catch (error) {
      console.error("Error loading tags:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las etiquetas",
        variant: "destructive",
      });
    }
  };

  // Convert UserInfo to Contact format for editing
  const convertUserInfoToContact = (userInfo: UserInfo): Contact => {
    return {
      id: parseInt(userInfo.id),
      name: userInfo.name,
      email: userInfo.email,
      phone: userInfo.phone,
      company: userInfo.company,
      location: userInfo.location,
      platform: userInfo.platform,
      lastMessageAt: userInfo.lastActivity || new Date().toISOString(),
      tags: userInfo.tags.map((tag, index) => ({ id: index, name: tag })), // Convert string tags to Tag objects
      avatar: userInfo.avatar,
    };
  };

  const handleEditClick = () => {
    if (userInfo) {
      const contactData = convertUserInfoToContact(userInfo);
      setEditContact(contactData);
      setIsEditDialogOpen(true);
    }
  };

  const handleSaveEditContact = async () => {
    if (!editContact?.name || !editContact?.phone || !editContact?.platform) {
      toast({
        title: "Error",
        description: "Nombre, teléfono y plataforma son obligatorios",
        variant: "destructive",
      });
      return;
    }

    try {
      if (editContact.email && !isValidEmail(editContact.email)) {
        toast({
          title: "Error",
          description: "Por favor ingresa un email válido con @ y dominio",
          variant: "destructive",
        });
        return;
      }

      setIsUpdating(true);

      const updateData: UpdateContactData = {
        name: editContact.name,
        email: editContact.email,
        phone: editContact.phone,
        company: editContact.company,
        location: editContact.location,
        platform: editContact.platform,
        tags: editContact.tags.map((tag) => tag.id),
      };

      await updateContact(editContact.id, updateData);

      setIsEditDialogOpen(false);
      setEditContact(null);

      toast({
        title: "Contacto actualizado",
        description: `${editContact.name} fue actualizado correctamente`,
      });

      // Notify parent component that contact was updated
      if (onContactUpdated) {
        onContactUpdated();
      }
    } catch (error) {
      console.error("Error updating contact:", error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el contacto",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="w-full md:w-80 bg-background border-l border-border overflow-y-auto">
        <div className="p-6 border-b border-border">
          <button
            title="Volver"
            className="p-2 rounded-full bg-background text-sidebar-foreground hover:text-primary shadow-md mb-4"
            onClick={onClose}
          >
            <ChevronLeft />
          </button>
          <div className="text-center">
            <div className="h-[100px] w-[100px] bg-muted rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
              <User className="w-10 h-10 text-muted-foreground" />
            </div>
            <div className="h-8 bg-muted rounded w-3/4 mx-auto mb-2 animate-pulse"></div>
            <div className="h-6 bg-muted rounded w-1/2 mx-auto mb-4 animate-pulse"></div>
            <div className="h-8 bg-muted rounded w-3/5 mx-auto animate-pulse"></div>
          </div>
        </div>
        <div className="p-4 space-y-4">
          <div className="h-60 bg-muted rounded animate-pulse"></div>
          <div className="h-40 bg-muted rounded animate-pulse"></div>
        </div>
      </div>
    );
  }

  if (!userInfo) {
    return (
      <div className="w-full md:w-80 bg-background border-l border-border overflow-y-auto">
        <div className="p-6 border-b border-border">
          <button
            title="Volver"
            className="p-2 rounded-full bg-background text-sidebar-foreground hover:text-primary shadow-md mb-4"
            onClick={onClose}
          >
            <ChevronLeft />
          </button>
          <div className="text-center">
            <div className="h-[100px] w-[100px] bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="w-10 h-10 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold mb-2">No hay información</h2>
            <p className="text-muted-foreground">Selecciona un contacto para ver su información</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full md:w-80 bg-background border-l border-border overflow-y-auto">
      {/* User Profile Header */}
      <div className="p-4 border-b border-border">
        <button
          title="Volver"
          className="p-2 rounded-full bg-background text-sidebar-foreground hover:text-primary shadow-md mb-4"
          onClick={onClose}
        >
          <ChevronLeft />
        </button>
        <div className="text-center">
          <div className="relative inline-block mb-3">
            <Avatar className="h-[100px] w-[100px] mx-auto border border-background-light">
              <AvatarImage src={userInfo.avatar} />
              <AvatarFallback className="text-dark-foreground bg-background-dark text-[30px]">
                {userInfo.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-2 -right-2 w-12 h-12 rounded-full flex items-center justify-center">
              {userInfo.platform === "facebook" && (
                <div className="w-full h-full bg-facebook-primary rounded-full flex items-center justify-center">
                  <FaFacebookF className="w-7 h-7 text-white" />
                </div>
              )}
              {userInfo.platform === "instagram" && (
                <div className="w-full h-full bg-instagram-primary rounded-full flex items-center justify-center">
                  <FaInstagram className="w-7 h-7 text-white" />
                </div>
              )}
              {userInfo.platform === "whatsapp" && (
                <div className="w-full h-full bg-whatsapp-primary rounded-full flex items-center justify-center">
                  <FaWhatsapp className="w-7 h-7 text-white" />
                </div>
              )}
            </div>
          </div>

          <h2 className="text-xl font-semibold mt-3 mb-1">{userInfo.name}</h2>
          <p className="text-muted-foreground text-sm">
            {userInfo.company || "Sin empresa"}
          </p>
        </div>

        <Button 
          className="w-full mt-4" 
          size="sm" 
          onClick={handleEditClick}
        >
          <Edit className="h-4 w-4 mr-2" />
          Editar Contacto
        </Button>
      </div>

      {/* Contact Information */}
      <Card className="m-4 shadow-card">
        <CardHeader>
          <CardTitle className="text-base">Información de Contacto</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center space-x-3">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{userInfo.email}</span>
          </div>
          <div className="flex items-center space-x-3">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{userInfo.phone}</span>
          </div>
          <div className="flex items-center space-x-3">
            <Building className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">
              {userInfo.company || "No especificado"}
            </span>
          </div>
          <div className="flex items-center space-x-3">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">
              {userInfo.location || "No especificado"}
            </span>
          </div>
          {/* Tags */}
          {userInfo.tags && userInfo.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {userInfo.tags.map((tag, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className="text-xs"
                >
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Activity */}
      <Card className="m-4 shadow-card">
        <CardHeader>
          <CardTitle className="text-base">Última Actividad</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{userInfo.lastActivity || "N/A"}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Contact Modal */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-full sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Contacto</DialogTitle>
          </DialogHeader>

          {editContact && (
            <div className="space-y-4">
              {/* Nombre y Teléfono */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Nombre *</Label>
                  <Input
                    id="edit-name"
                    value={editContact.name}
                    onChange={(e) =>
                      setEditContact((prev) =>
                        prev
                          ? {
                              ...prev,
                              name: e.target.value,
                            }
                          : prev
                      )
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-phone">Teléfono *</Label>
                  <Input
                    id="edit-phone"
                    type="tel"
                    inputMode="numeric"
                    value={editContact.phone}
                    onChange={(e) => {
                      const numericValue = e.target.value.replace(/[^0-9+]/g, "");
                      setEditContact((prev) =>
                        prev
                          ? {
                              ...prev,
                              phone: numericValue,
                            }
                          : prev
                      );
                    }}
                  />
                </div>
              </div>

              {/* Email y Empresa */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-email">Correo electrónico</Label>
                  <Input
                    id="edit-email"
                    value={editContact.email}
                    onChange={(e) =>
                      setEditContact((prev) =>
                        prev ? { ...prev, email: e.target.value } : prev
                      )
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-company">Empresa</Label>
                  <Input
                    id="edit-company"
                    value={editContact.company || ""}
                    onChange={(e) =>
                      setEditContact((prev) =>
                        prev
                          ? { ...prev, company: e.target.value }
                          : prev
                      )
                    }
                  />
                </div>
              </div>

              {/* Ubicación */}
              <div className="space-y-2">
                <Label htmlFor="edit-location">Ubicación</Label>
                <Input
                  id="edit-location"
                  value={editContact.location || ""}
                  onChange={(e) =>
                    setEditContact((prev) =>
                      prev
                        ? { ...prev, location: e.target.value }
                        : prev
                    )
                  }
                />
              </div>

              {/* Etiquetas */}
              <div className="space-y-2">
                <Label>Etiquetas</Label>
                <Popover open={editTagsPopoverOpen} onOpenChange={setEditTagsPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={editTagsPopoverOpen}
                      className="w-full justify-between"
                    >
                      {editContact.tags.length > 0
                        ? `${editContact.tags.length} etiqueta(s) seleccionada(s)`
                        : "Seleccionar etiquetas..."}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 py-2 px-2 bg-background space-y-2">
                    <Command>
                      <CommandInput placeholder="Buscar etiquetas..." />
                      <CommandList>
                        <CommandEmpty>No se encontraron etiquetas.</CommandEmpty>
                        <CommandGroup>
                          {availableTags.map((tag) => (
                            <CommandItem
                              className="cursor-pointer"
                              key={tag.id}
                              onSelect={() => {
                                setEditContact((prev) =>
                                  prev
                                    ? {
                                        ...prev,
                                        tags: prev.tags.some((t) => t.id === tag.id)
                                          ? prev.tags.filter((t) => t.id !== tag.id)
                                          : [...prev.tags, tag],
                                      }
                                    : prev
                                );
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  editContact.tags.some((t) => t.id === tag.id)
                                    ? "opacity-100"
                                    : "opacity-0"
                                )}
                              />
                              {tag.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>

                {/* Selected tags display */}
                {editContact.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {editContact.tags.map((tag) => (
                      <Badge
                        key={tag.id}
                        variant="secondary"
                        className="flex items-center gap-1"
                      >
                        {tag.name}
                        <X
                          className="w-3 h-3 ms-3 cursor-pointer"
                          onClick={() => {
                            setEditContact((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    tags: prev.tags.filter((t) => t.id !== tag.id),
                                  }
                                : prev
                            );
                          }}
                        />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Plataforma */}
              <div className="space-y-2">
                <Label htmlFor="edit-platform">Plataforma *</Label>
                <Popover open={editPlatformComboboxOpen} onOpenChange={setEditPlatformComboboxOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={editPlatformComboboxOpen}
                      className="w-full justify-between"
                    >
                      {editContact?.platform
                        ? platformOptions.find(
                            (platform) => platform.value === editContact.platform
                          )?.label
                        : "Seleccionar plataforma..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0 bg-background-light">
                    <Command>
                      <CommandInput placeholder="Buscar plataforma..." />
                      <CommandList>
                        <CommandEmpty>No se encontraron plataformas.</CommandEmpty>
                        <CommandGroup>
                          {platformOptions.map((platform) => {
                            const PlatformIcon = platform.icon;
                            return (
                              <CommandItem
                                key={platform.value}
                                value={platform.value}
                                onSelect={() => {
                                  setEditContact((prev) =>
                                    prev
                                      ? {
                                          ...prev,
                                          platform: platform.value,
                                        }
                                      : prev
                                  );
                                  setEditPlatformComboboxOpen(false);
                                }}
                                className="flex items-center gap-2"
                              >
                                <PlatformIcon className="w-4 h-4" />
                                {platform.label}
                                <Check
                                  className={cn(
                                    "ml-auto h-4 w-4",
                                    editContact?.platform === platform.value
                                      ? "opacity-100"
                                      : "opacity-0"
                                  )}
                                />
                              </CommandItem>
                            );
                          })}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
              disabled={isUpdating}
            >
              Cancelar
            </Button>
            <Button onClick={handleSaveEditContact} disabled={isUpdating}>
              {isUpdating ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}