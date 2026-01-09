import { useState, useMemo, useEffect } from "react";
import {
  Search,
  X,
  MessageCircle,
  MessageSquare,
  Plus,
  PencilIcon,
  Trash2,
  Check,
  ChevronsUpDown,
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { FaFacebookF, FaInstagram, FaWhatsapp } from "react-icons/fa";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  getContacts,
  createContact,
  updateContact,
  deleteContact,
} from "@/api/contacts";
import { getTags } from "@/api/tags";
import { cn } from "@/lib/utils";
import { isValidEmail } from "@/utils/mail";
import { getOrganizations } from "@/api/organizations";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { SessionExpiredError } from "@/api/client";

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
  organization?: {
    organization_id: number;
    name: string;
  };
}

interface Organization {
  organization_id: number;
  name: string;
}

interface CreateContactData {
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  location?: string;
  platform?: string;
  lastMessageAt?: string;
  tags?: number[];
  organizationId: number | null;
  organizationName: string;
}

interface UpdateContactData {
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  location?: string;
  platform?: string;
  lastMessageAt?: string;
  tags?: number[];
  organizationId: number | null;
  organizationName: string;
}

const platformIcons = {
  facebook: FaFacebookF,
  instagram: FaInstagram,
  whatsapp: FaWhatsapp,
};

// Helper function to get platforms from platform
const getPlatformsFromPlatform = (platform: string): string[] => {
  return [platform.toLowerCase()];
};

// Helper function to format last contact time
const formatLastContact = (lastMessageAt: string): string => {
  const date = new Date(lastMessageAt);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  if (date.toDateString() === now.toDateString()) {
    return `Hoy a las ${date.toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  }

  if (date.toDateString() === yesterday.toDateString()) {
    return `Ayer a las ${date.toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  }

  const diffInDays = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffInDays < 7) {
    return date
      .toLocaleDateString("es-ES", { weekday: "long" })
      .replace(/^\w/, (c) => c.toUpperCase());
  }

  return date.toLocaleDateString("es-ES");
};

const platformOptions = [
  { value: "whatsapp", label: "WhatsApp", icon: FaWhatsapp },
  { value: "facebook", label: "Facebook", icon: FaFacebookF },
  { value: "instagram", label: "Instagram", icon: FaInstagram },
];

interface ContactsViewProps {
  onStartConversation?: (contactId: string) => void;
}

export function ContactsView({ onStartConversation }: ContactsViewProps) {
  const currentUser = useCurrentUser();
  const isOwner = currentUser?.role === 'dueno';

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [selectedOrganization, setSelectedOrganization] = useState<
    number | null
  >(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editContact, setEditContact] = useState<Contact | null>(null);
  const [deleteContactId, setDeleteContactId] = useState<number | null>(null);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [tagsPopoverOpen, setTagsPopoverOpen] = useState(false);
  const [editTagsPopoverOpen, setEditTagsPopoverOpen] = useState(false);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loadingOrganizations, setLoadingOrganizations] = useState(false);
  const [organizationComboboxOpen, setOrganizationComboboxOpen] =
    useState(false);
  const [platformComboboxOpen, setPlatformComboboxOpen] = useState(false);
  const [editPlatformComboboxOpen, setEditPlatformComboboxOpen] =
    useState(false);

  // Load contacts and organizations
  useEffect(() => {
    loadContacts();    
    if (isOwner) {
      loadOrganizations();
    }
  }, [isOwner]);

  const loadContacts = async () => {
    try {
      setLoading(true);
      const contactsData = await getContacts();
      setContacts(contactsData);
    } catch (error) {
      console.error("Error loading contacts:", error);
      if (!(error instanceof SessionExpiredError)) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los contactos",
        variant: "destructive",
      });
      }
    } finally {
      setLoading(false);
    }
  };

  const loadOrganizations = async (): Promise<void> => {
    try {
      setLoadingOrganizations(true);
      const data = await getOrganizations();
      setOrganizations(data);
    } catch (error) {
      console.error("Error loading organizations:", error);
      if (!(error instanceof SessionExpiredError)) {
      toast({
        title: "Error",
        description: "No se pudieron cargar las organizaciones",
        variant: "destructive",
      });
      }
    } finally {
      setLoadingOrganizations(false);
    }
  };

  useEffect(() => {
    const loadAllTags = async () => {
      try {
        const allTagsFromDB = await getTags();
        setAvailableTags(Array.isArray(allTagsFromDB) ? allTagsFromDB : []);
      } catch (error) {
        console.error("Error loading all tags:", error);
        if (!(error instanceof SessionExpiredError)) {
        toast({
          title: "Error",
          description: "No se pudieron cargar todas las etiquetas",
          variant: "destructive",
        });
        }
      }
    };

    loadAllTags();
  }, []);

  const allTags = Array.from(
    new Set(contacts.flatMap((contact) => contact.tags.map((tag) => tag.name)))
  );

  const allPlatforms = Array.from(
    new Set(
      contacts.flatMap((contact) => getPlatformsFromPlatform(contact.platform))
    )
  );

  // State for new contact
  const [newContact, setNewContact] = useState<CreateContactData>({
    name: "",
    email: "",
    phone: "",
    platform: "",
    company: "",
    location: "",
    tags: [],
    organizationId: isOwner ? null : currentUser.organization?.id || null,
    organizationName: isOwner ? "" : currentUser.organization?.name || "",
  });

  // Reset new contact form when dialog opens/closes
  useEffect(() => {
    if (isCreateDialogOpen) {
      setNewContact({
        name: "",
        email: "",
        phone: "",
        company: "",
        platform: "",
        location: "",
        tags: [],
        organizationId: isOwner ? null : currentUser.organization?.id || null,
        organizationName: isOwner ? "" : currentUser.organization?.name || "",
      });
    }
  }, [isCreateDialogOpen]);

  const filteredContacts = useMemo(() => {
    return contacts.filter((contact) => {
      // Search by name, phone, or email
      const matchesSearch =
        searchQuery === "" ||
        contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.phone.includes(searchQuery) ||
        contact.email.toLowerCase().includes(searchQuery.toLowerCase());

      // Filter by tags
      const matchesTags =
        selectedTags.length === 0 ||
        selectedTags.some((tag) => contact.tags.some((t) => t.name === tag));

      // Filter by platforms
      const matchesPlatforms =
        selectedPlatforms.length === 0 ||
        selectedPlatforms.some((platform) =>
          getPlatformsFromPlatform(contact.platform).includes(platform)
        );

      // Filter by organization
      const matchesOrganization =
        selectedOrganization === null ||
        contact.organization?.organization_id === selectedOrganization;

      return (
        matchesSearch && matchesTags && matchesPlatforms && matchesOrganization
      );
    });
  }, [
    contacts,
    searchQuery,
    selectedTags,
    selectedPlatforms,
    selectedOrganization,
  ]);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const togglePlatform = (platform: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platform)
        ? prev.filter((c) => c !== platform)
        : [...prev, platform]
    );
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedTags([]);
    setSelectedPlatforms([]);
    setSelectedOrganization(null);
  };

  const handleStartConversation = (contactId: string) => {
    onStartConversation?.(contactId);
  };

  // Handle create contact
  const handleCreateContact = async () => {
    if (!newContact.name || !newContact.phone) {
      toast({
        title: "Error",
        description: "Nombre y teléfono son obligatorios",
        variant: "destructive",
      });
      return;
    }

    try {
      // Check if email is provided and validate it
      if (newContact.email && !isValidEmail(newContact.email)) {
        toast({
          title: "Error",
          description: "Por favor ingresa un email válido con @ y dominio",
          variant: "destructive",
        });
        return;
      }

      console.log("Creating contact with data:", newContact);

      await createContact(newContact);

      // Reset form
      setNewContact({
        name: "",
        email: "",
        phone: "",
        company: "",
        platform: "",
        location: "",
        tags: [],
        organizationId: isOwner ? null : currentUser.organization?.id || null,
        organizationName: isOwner ? "" : currentUser.organization?.name || "",
      });
      setIsCreateDialogOpen(false);

      // Reload contacts
      await loadContacts();

      toast({
        title: "Contacto creado",
        description: `${newContact.name} fue agregado correctamente`,
      });
    } catch (error) {
      console.error("Error creating contact:", error);
      if (!(error instanceof SessionExpiredError)) {
      toast({
        title: "Error",
        description: "No se pudo crear el contacto",
        variant: "destructive",
      });
      }
    }
  };

  // Handle edit contact
  const handleEditContact = (contact: Contact) => {
    setEditContact(contact);
    setNewContact({
      name: contact.name,
      email: contact.email,
      phone: contact.phone,
      company: contact.company || "",
      location: contact.location || "",
      platform: contact.platform || "",
      tags: contact.tags.map((tag) => tag.id),
      organizationId: contact.organization?.organization_id || null,
      organizationName: contact.organization?.name || "",
    });
    setIsEditDialogOpen(true);
  };

  const handleSaveEditContact = async () => {
    if (!editContact?.name || !editContact?.phone) {
      toast({
        title: "Error",
        description: "Nombre y teléfono son obligatorios",
        variant: "destructive",
      });
      return;
    }

    try {
      if (!isValidEmail(editContact.email)) {
        toast({
          title: "Error",
          description: "Por favor ingresa un email válido con @ y dominio",
          variant: "destructive",
        });
        return;
      }

      const updateData: UpdateContactData = {
        name: editContact.name,
        email: editContact.email,
        phone: editContact.phone,
        company: editContact.company,
        location: editContact.location,
        platform: editContact.platform,
        tags: editContact.tags.map((tag) => tag.id),
        organizationId: newContact.organizationId,
        organizationName: newContact.organizationName,
      };

      await updateContact(editContact.id, updateData);

      setIsEditDialogOpen(false);
      setEditContact(null);

      // Reload contacts
      await loadContacts();

      toast({
        title: "Contacto actualizado",
        description: `${editContact.name} fue actualizado correctamente`,
      });
    } catch (error) {
      console.error("Error updating contact:", error);
      if (!(error instanceof SessionExpiredError)) {
      toast({
        title: "Error",
        description: "No se pudo actualizar el contacto",
        variant: "destructive",
      });
      }
    }
  };

  // Handle delete contact
  const handleDeleteContact = (contactId: number) => {
    setDeleteContactId(contactId);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteContact = async () => {
    if (!deleteContactId) return;

    try {
      await deleteContact(deleteContactId);

      setIsDeleteDialogOpen(false);
      setDeleteContactId(null);

      // Reload contacts
      await loadContacts();

      toast({
        title: "Contacto eliminado",
        description: "El contacto fue eliminado correctamente",
      });
    } catch (error) {
      console.error("Error deleting contact:", error);
      if (!(error instanceof SessionExpiredError)) {
      toast({
        title: "Error",
        description: "No se pudo eliminar el contacto",
        variant: "destructive",
      });
      }
    }
  };

  // Get selected organization name
  const getSelectedOrganizationName = () => {
    if (selectedOrganization === null) return "Todas las organizaciones";
    const org = organizations.find(
      (o) => o.organization_id === selectedOrganization
    );
    return org ? org.name : "Todas las organizaciones";
  };

  if (loading) {
    return (
      <div className="flex flex-col h-full bg-background items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando contactos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Card Header */}
      <Card className="border-0 shadow-none rounded-none">
        <CardHeader className="flex flex-row items-start justify-between gap-2">
          <div className="flex flex-col gap-1">
            <CardTitle className="text-xl md:text-2xl font-bold">
              Contactos ({contacts.length})
            </CardTitle>
            <p className="text-muted-foreground text-sm md:text-base">
              Registra y administra contactos
            </p>
          </div>

          <Dialog
            open={isCreateDialogOpen}
            onOpenChange={setIsCreateDialogOpen}
          >
            <DialogTrigger asChild>
              <Button className="gap-2" title="Nuevo Contacto">
                <Plus className="w-4 h-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-full sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>Crear Nuevo Contacto</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {/* Nombre y Teléfono */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nombre *</Label>
                    <Input
                      id="name"
                      value={newContact.name || ""}
                      onChange={(e) =>
                        setNewContact((prev) => ({
                          ...prev,
                          name: e.target.value,
                        }))
                      }
                      placeholder="Ej. María García"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Teléfono *</Label>
                    <Input
                      id="phone"
                      value={newContact.phone || ""}
                      onChange={(e) => {
                        const numericValue = e.target.value.replace(
                          /[^0-9+]/g,
                          ""
                        );
                        setNewContact((prev) => ({
                          ...prev,
                          phone: numericValue,
                        }));
                      }}
                      type="tel"
                      inputMode="tel"
                      placeholder="+34 600 000 000"
                    />
                  </div>
                </div>

                {/* Email y Empresa */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Correo electrónico</Label>
                    <Input
                      id="email"
                      value={newContact.email || ""}
                      onChange={(e) =>
                        setNewContact((prev) => ({
                          ...prev,
                          email: e.target.value,
                        }))
                      }
                      placeholder="correo@ejemplo.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company">Empresa</Label>
                    <Input
                      id="company"
                      value={newContact.company || ""}
                      onChange={(e) =>
                        setNewContact((prev) => ({
                          ...prev,
                          company: e.target.value,
                        }))
                      }
                      placeholder="Nombre de la empresa"
                    />
                  </div>
                </div>

                {/* Ubicación */}
                <div className="space-y-2">
                  <Label htmlFor="location">Ubicación</Label>
                  <Input
                    id="location"
                    value={newContact.location || ""}
                    onChange={(e) =>
                      setNewContact((prev) => ({
                        ...prev,
                        location: e.target.value,
                      }))
                    }
                    placeholder="Ciudad, País"
                  />
                </div>

                {/* Etiquetas */}
                <div className="space-y-2">
                  <Label>Etiquetas</Label>
                  <Popover
                    open={tagsPopoverOpen}
                    onOpenChange={setTagsPopoverOpen}
                  >
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={tagsPopoverOpen}
                        className="w-full justify-between"
                      >
                        {newContact.tags && newContact.tags.length > 0
                          ? `${newContact.tags.length} etiqueta(s) seleccionada(s)`
                          : "Seleccionar etiquetas..."}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 py-2 px-2 bg-background space-y-2">
                      <Command>
                        <CommandInput placeholder="Buscar etiquetas..." />
                        <CommandList>
                          <CommandEmpty>
                            No se encontraron etiquetas.
                          </CommandEmpty>
                          <CommandGroup>
                            {availableTags.map((tag) => (
                              <CommandItem
                                className="cursor-pointer"
                                key={tag.id}
                                onSelect={() => {
                                  setNewContact((prev) => ({
                                    ...prev,
                                    tags: prev.tags?.includes(tag.id)
                                      ? prev.tags.filter((id) => id !== tag.id)
                                      : [...(prev.tags || []), tag.id],
                                  }));
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    newContact.tags?.includes(tag.id)
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
                  {newContact.tags && newContact.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {newContact.tags.map((tagId) => {
                        const tag = availableTags.find((t) => t.id === tagId);
                        return tag ? (
                          <Badge
                            key={tagId}
                            variant="secondary"
                            className="flex items-center gap-1 text-background"
                          >
                            {tag.name}
                            <X
                              className="w-3 h-3 ms-3 cursor-pointer"
                              onClick={() => {
                                setNewContact((prev) => ({
                                  ...prev,
                                  tags:
                                    prev.tags?.filter((id) => id !== tagId) ||
                                    [],
                                }));
                              }}
                            />
                          </Badge>
                        ) : null;
                      })}
                    </div>
                  )}
                </div>

                {/* Plataforma */}
                <div className="space-y-2">
                  <Label htmlFor="platform">Plataforma *</Label>
                  <Popover
                    open={platformComboboxOpen}
                    onOpenChange={setPlatformComboboxOpen}
                  >
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={platformComboboxOpen}
                        className="w-full justify-between"
                      >
                        {newContact.platform
                          ? platformOptions.find(
                              (platform) =>
                                platform.value === newContact.platform
                            )?.label
                          : "Seleccionar plataforma..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0 ">
                      <Command>
                        <CommandInput placeholder="Buscar plataforma..." />
                        <CommandList>
                          <CommandEmpty>
                            No se encontraron plataformas.
                          </CommandEmpty>
                          <CommandGroup>
                            {platformOptions.map((platform) => {
                              const PlatformIcon = platform.icon;
                              return (
                                <CommandItem
                                  key={platform.value}
                                  value={platform.value}
                                  onSelect={() => {
                                    setNewContact((prev) => ({
                                      ...prev,
                                      platform: platform.value,
                                    }));
                                    setPlatformComboboxOpen(false);
                                  }}
                                  className="flex items-center gap-2"
                                >
                                  <PlatformIcon className="w-4 h-4" />
                                  {platform.label}
                                  <Check
                                    className={cn(
                                      "ml-auto h-4 w-4",
                                      newContact.platform === platform.value
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

                <p className="text-xs text-muted-foreground">
                  <strong className="text-sm">*</strong> Campos requeridos
                </p>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button className="mb-3 mb-md-0" onClick={handleCreateContact} variant="secondary">
                  Guardar Contacto
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>

        {/* Filters Section */}
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 flex-wrap">
            {/* Search */}
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, teléfono o email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>

            {/* Organization Filter Combobox */}
            {isOwner && organizations.length > 0 && (
              <div className="w-full md:w-auto">
                <Popover
                  open={organizationComboboxOpen}
                  onOpenChange={setOrganizationComboboxOpen}
                >
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={organizationComboboxOpen}
                      className="w-full md:w-[250px] justify-between"
                    >
                      {getSelectedOrganizationName()}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full md:w-[250px] p-0">
                    <Command>
                      <CommandInput placeholder="Buscar organización..." />
                      <CommandList>
                        <CommandEmpty>
                          No se encontraron organizaciones.
                        </CommandEmpty>
                        <CommandGroup>
                          <CommandItem
                            value="all"
                            onSelect={() => {
                              setSelectedOrganization(null);
                              setOrganizationComboboxOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedOrganization === null
                                  ? "opacity-100"
                                  : "opacity-0"
                              )}
                            />
                            Todas las organizaciones
                          </CommandItem>
                          {organizations.map((org) => (
                            <CommandItem
                              key={org.organization_id}
                              value={org.name}
                              onSelect={() => {
                                setSelectedOrganization(org.organization_id);
                                setOrganizationComboboxOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  selectedOrganization === org.organization_id
                                    ? "opacity-100"
                                    : "opacity-0"
                                )}
                              />
                              {org.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            )}

            {/* Platform Filters */}
            <div className="flex flex-wrap gap-1 md:gap-2 items-center">
              {allPlatforms.map((platform) => {
                const PlatformIcon =
                  platformIcons[platform as keyof typeof platformIcons];
                return (
                  <Badge
                    key={platform}
                    variant={
                      selectedPlatforms.includes(platform)
                        ? "default"
                        : "outline"
                    }
                    className="cursor-pointer flex items-center gap-1"
                    onClick={() => togglePlatform(platform)}
                  >
                    <PlatformIcon className="w-3 h-3" />
                    <span className="capitalize">{platform}</span>
                    {selectedPlatforms.includes(platform) && (
                      <X className="w-3 h-3" />
                    )}
                  </Badge>
                );
              })}
            </div>

            {/* Clear Filters Button (desktop only) */}
            {(searchQuery ||
              selectedTags.length > 0 ||
              selectedPlatforms.length > 0 ||
              selectedOrganization !== null) && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearFilters}
                className="hidden md:inline-flex"
              >
                Limpiar Filtros
              </Button>
            )}
          </div>

          {/* Divider for mobile */}
          <div className="block md:hidden border-t my-2"></div>

          {/* Tags Filter */}
          <div className="flex flex-wrap gap-2 items-center">
            {allTags.map((tag) => (
              <Badge
                key={tag}
                variant={selectedTags.includes(tag) ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => toggleTag(tag)}
              >
                {tag}
                {selectedTags.includes(tag) && <X className="w-3 h-3 ml-1" />}
              </Badge>
            ))}
          </div>

          {/* Clear Filters Button (mobile only, at bottom) */}
          {(searchQuery ||
            selectedTags.length > 0 ||
            selectedPlatforms.length > 0 ||
            selectedOrganization !== null) && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearFilters}
              className="block md:hidden w-full"
            >
              Limpiar Filtros
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Contacts Table */}
      <div className="flex-1 overflow-hidden px-2 md:px-0">
        <ScrollArea className="h-full">
          {filteredContacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center px-4">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mb-4">
                <MessageCircle className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">
                No se encontraron contactos
              </h3>
              <p className="text-muted-foreground">
                {searchQuery ||
                selectedTags.length > 0 ||
                selectedPlatforms.length > 0 ||
                selectedOrganization !== null
                  ? "Intenta ajustar tu búsqueda o filtros"
                  : "Comienza agregando algunos contactos a tu directorio"}
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block">
                <Table className="min-w-full">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Contacto</TableHead>
                      <TableHead>Plataforma</TableHead>
                      <TableHead>Teléfono</TableHead>
                      <TableHead>Empresa</TableHead>
                      <TableHead>Último Contacto</TableHead>
                      <TableHead>Etiquetas</TableHead>
                      {isOwner && <TableHead>Organización</TableHead>}
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredContacts.map((contact) => (
                      <TableRow key={contact.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="w-8 h-8">
                              <AvatarImage
                                src={contact.avatar}
                                alt={contact.name}
                              />
                              <AvatarFallback>
                                {contact.name
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">{contact.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {contact.email}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1 flex-wrap">
                            {getPlatformsFromPlatform(contact.platform).map(
                              (platform) => {
                                const PlatformIcon =
                                  platformIcons[
                                    platform as keyof typeof platformIcons
                                  ];
                                return (
                                  <Badge
                                    key={platform}
                                    variant="outline"
                                    style={{
                                      borderColor: `hsl(var(--${platform}-primary))`,
                                      color: `hsl(var(--${platform}-primary))`,
                                    }}
                                    className="cursor-pointer px-3 py-1 flex items-center gap-1"
                                    onClick={() => togglePlatform(platform)}
                                  >
                                    <PlatformIcon
                                      key={platform}
                                      className="w-4 h-4"
                                      style={{
                                        color: `hsl(var(--${platform}-primary))`,
                                      }}
                                    />
                                    <span className="capitalize">
                                      {platform}
                                    </span>
                                  </Badge>
                                );
                              }
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {contact.phone}
                        </TableCell>
                        <TableCell className="text-sm">
                          {contact.company || "-"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatLastContact(contact.lastMessageAt)}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-2 max-w-60 overflow-y-auto">
                            {contact.tags.map((tag) => (
                              <Badge
                                key={tag.id}
                                variant="secondary"
                                className="text-xs text-background"
                              >
                                {tag.name}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        {isOwner && (
                          <TableCell className="text-sm">
                            {contact.organization?.name || "N/A"}
                          </TableCell>
                        )}
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() =>
                                handleStartConversation(contact.id.toString())
                              }
                              className="gap-2"
                            >
                              <MessageSquare className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="hover:text-primary"
                              onClick={() => handleEditContact(contact)}
                            >
                              <PencilIcon className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                handleDeleteContact(contact.id);
                                setIsDeleteDialogOpen(true);
                              }}
                              className="gap-2"
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Edit Dialog */}
              <Dialog
                open={isEditDialogOpen}
                onOpenChange={setIsEditDialogOpen}
              >
                <DialogContent>
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
                              const numericValue = e.target.value.replace(
                                /[^0-9]/g,
                                ""
                              );
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
                        <Popover
                          open={editTagsPopoverOpen}
                          onOpenChange={setEditTagsPopoverOpen}
                        >
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
                                <CommandEmpty>
                                  No se encontraron etiquetas.
                                </CommandEmpty>
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
                                                tags: prev.tags.some(
                                                  (t) => t.id === tag.id
                                                )
                                                  ? prev.tags.filter(
                                                      (t) => t.id !== tag.id
                                                    )
                                                  : [...prev.tags, tag],
                                              }
                                            : prev
                                        );
                                      }}
                                    >
                                      <Check
                                        className={cn(
                                          "mr-2 h-4 w-4",
                                          editContact.tags.some(
                                            (t) => t.id === tag.id
                                          )
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
                                className="flex items-center gap-1 text-background"
                              >
                                {tag.name}
                                <X
                                  className="w-3 h-3 ms-3 cursor-pointer"
                                  onClick={() => {
                                    setEditContact((prev) =>
                                      prev
                                        ? {
                                            ...prev,
                                            tags: prev.tags.filter(
                                              (t) => t.id !== tag.id
                                            ),
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
                        <Popover
                          open={editPlatformComboboxOpen}
                          onOpenChange={setEditPlatformComboboxOpen}
                        >
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={editPlatformComboboxOpen}
                              className="w-full justify-between"
                            >
                              {editContact?.platform
                                ? platformOptions.find(
                                    (platform) =>
                                      platform.value === editContact.platform
                                  )?.label
                                : "Seleccionar plataforma..."}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-full p-0 bg-background-light">
                            <Command>
                              <CommandInput placeholder="Buscar plataforma..." />
                              <CommandList>
                                <CommandEmpty>
                                  No se encontraron plataformas.
                                </CommandEmpty>
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
                                            editContact?.platform ===
                                              platform.value
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
                    >
                      Cancelar
                    </Button>
                    <Button onClick={handleSaveEditContact} variant="secondary">
                      Guardar Cambios
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* Delete Confirmation Dialog */}
              <Dialog
                open={isDeleteDialogOpen}
                onOpenChange={setIsDeleteDialogOpen}
              >
                <DialogContent className="border border-border  rounded-md w-96 max-w-[90vw] p-0 overflow-hidden">
                  <DialogHeader className="p-6 pb-4">
                    <div className="text-center">
                      <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Trash2 className="w-6 h-6 text-red-500" />
                      </div>
                      <DialogTitle className="text-lg font-semibold text-foreground mb-2">
                        ¿Eliminar Contacto?
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
                        Se eliminará permanentemente:
                      </p>
                      <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                        <li>Toda la información del contacto</li>
                      </ul>
                    </div>
                  </div>

                  <DialogFooter className="p-6 pt-4">
                    <div className="flex gap-3 w-full">
                      <Button
                        variant="outline"
                        onClick={() => setIsDeleteDialogOpen(false)}
                        className="flex-1"
                      >
                        Cancelar
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={confirmDeleteContact}
                        className="flex-1"
                      >
                        Sí, Eliminar
                      </Button>
                    </div>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-4 mt-4 mx-4">
                {filteredContacts.map((contact) => (
                  <Card
                    key={contact.id}
                    className="p-4 flex flex-col gap-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10">
                          <AvatarImage
                            src={contact.avatar}
                            alt={contact.name}
                          />
                          <AvatarFallback>
                            {contact.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{contact.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {contact.email}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          onClick={() =>
                            handleStartConversation(contact.id.toString())
                          }
                        >
                          <MessageSquare className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEditContact(contact)}
                        >
                          <PencilIcon className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            handleDeleteContact(contact.id);
                            setIsDeleteDialogOpen(true);
                          }}
                          className="gap-2"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 text-sm">
                      {/* First row: Teléfono & Platforms */}
                      <div className="grid grid-cols-2 gap-4 items-center">
                        <div>
                          <span className="font-medium"></span> {contact.phone}
                        </div>
                        <div className="flex flex-wrap gap-2 justify-end">
                          {getPlatformsFromPlatform(contact.platform).map(
                            (platform) => {
                              const PlatformIcon =
                                platformIcons[
                                  platform as keyof typeof platformIcons
                                ];
                              return (
                                <PlatformIcon
                                  key={platform}
                                  className="w-4 h-4"
                                />
                              );
                            }
                          )}
                        </div>
                      </div>

                      {/* Second row: Company & Last contact */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="font-medium">Empresa:</span>{" "}
                          {contact.company || "-"}
                        </div>
                      </div>

                      {/* Third row: Organization (for owners) */}
                      {isOwner && (
                        <div className="flex justify-between items-center text-sm text-muted-foreground">
                          <span>Organización:</span>
                          <span>{contact.organization?.name || "N/A"}</span>
                        </div>
                      )}

                      <div className="flex justify-between text-muted-foreground">
                        <span className="me-1">Última Conexión:</span>{" "}
                        {formatLastContact(contact.lastMessageAt)}
                      </div>

                      {/* Fourth row: Tags */}
                      <div className="flex flex-wrap gap-2">
                        {contact.tags.map((tag) => (
                          <Badge
                            key={tag.id}
                            variant="secondary"
                            className="text-xs text-background"
                          >
                            {tag.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}
