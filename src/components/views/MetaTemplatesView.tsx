import { useState, useMemo, useEffect } from "react";
import { Search, Plus, Trash2, Eye, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/components/ui/use-toast";
import { FaFacebookF, FaInstagram, FaWhatsapp } from "react-icons/fa";
import { getTemplates, createTemplate, deleteTemplate } from "@/api/templates";
import { formatDate } from "@/utils/formatters";
import { getOrganizations } from "@/api/organizations";
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
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCurrentUser } from "@/hooks/useCurrentUser";

// Types
interface Template {
  id: string;
  name: string;
  platform: "facebook" | "instagram" | "whatsapp";
  status: "aprobada" | "pendiente" | "rechazada";
  command: string;
  content: string;
  createdAt: string;
  variables: string[];
  organization?: {  
    organization_id: number;  
    name: string;
  };
}

interface Organization {
  organization_id: number;
  name: string;
}

interface TemplateFormData {
  name: string;
  platform: "" | "facebook" | "instagram" | "whatsapp";
  language: string;
  content: string;
  command: string;
  variables: string[];
  organization_id: number;
}

// Constants
const PLATFORM_ICONS = {
  facebook: FaFacebookF,
  instagram: FaInstagram,
  whatsapp: FaWhatsapp,
};

const BUBBLE_COLORS = {
  facebook: "bg-[hsl(var(--facebook-primary))]",
  instagram: "bg-[hsl(var(--instagram-primary))]",
  whatsapp: "bg-[hsl(var(--whatsapp-primary))]",
};

const PLATFORMS = ["facebook", "instagram", "whatsapp"] as const;
const STATUSES = ["aprobada", "pendiente", "rechazada"] as const;

const DEFAULT_TEMPLATE: TemplateFormData = {
  name: "",
  platform: "",
  language: "es",
  content: "",
  command: "",
  variables: [],
  organization_id: 0,
};

export function MetaTemplatesView() {  
  const currentUser = useCurrentUser();
  const isOwner = currentUser?.role === 'dueno';

  // State
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newTemplate, setNewTemplate] =
    useState<TemplateFormData>(DEFAULT_TEMPLATE);
  const [isDeleteTemplateOpen, setIsDeleteTemplateOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<any>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrganization, setSelectedOrganization] = useState<number | null>(null);
  const [organizationComboboxOpen, setOrganizationComboboxOpen] = useState(false);
  const [loadingOrganizations, setLoadingOrganizations] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    loadTemplates();    
    if (isOwner) {
      loadOrganizations();
    }
  }, [isOwner]);

  useEffect(() => {
    if (isModalOpen && isOwner) {
      loadOrganizations();
    }
  }, [isModalOpen, isOwner]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const data = await getTemplates();
      setTemplates(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error loading templates:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las plantillas",
        variant: "destructive",
      });
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  };

  const loadOrganizations = async (): Promise<void> => {
  try {
    setLoadingOrganizations(true);
    const data = await getOrganizations();
    console.log("Fetched organizations:", data);
    
    setOrganizations(data);
  } catch (error) {
    console.error("Error loading organizations:", error);
    toast({
      title: "Error",
      description: "No se pudieron cargar las organizaciones",
      variant: "destructive",
    });
  } finally {
    setLoadingOrganizations(false);
  }
};

  // Filtering
  const filteredTemplates = useMemo(() => {
    return templates.filter((template) => {
      const matchesSearch =
        !searchQuery ||
        template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.content.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesPlatform =
        selectedPlatforms.length === 0 ||
        selectedPlatforms.includes(template.platform);

      const matchesStatus =
        selectedStatuses.length === 0 ||
        selectedStatuses.includes(template.status);

      const matchesOrganization =
        selectedOrganization === null ||
        template.organization?.organization_id === selectedOrganization;

      return matchesSearch && matchesPlatform && matchesStatus && matchesOrganization;
    });
  }, [templates, searchQuery, selectedPlatforms, selectedStatuses, selectedOrganization]);

  // Filter handlers
  const togglePlatform = (platform: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platform)
        ? prev.filter((c) => c !== platform)
        : [...prev, platform]
    );
  };

  const toggleStatus = (status: string) => {
    setSelectedStatuses((prev) =>
      prev.includes(status)
        ? prev.filter((s) => s !== status)
        : [...prev, status]
    );
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedPlatforms([]);
    setSelectedStatuses([]);
    setSelectedOrganization(null);
  };

  const extractVariables = (content: string): string[] => {
    const matches = content.match(/\{\{([^}]+)\}\}/g);
    return matches ? matches.map((m) => m.replace(/[{}]/g, "")) : [];
  };

  const handleCreateTemplate = async () => {
    if (!newTemplate.name || !newTemplate.platform || !newTemplate.content) {
      toast({
        title: "Error",
        description: "Completa todos los campos",
        variant: "destructive",
      });
      return;
    }

    try {
      const user = JSON.parse(localStorage.getItem("user"));
      const organizationId = Number(user.organization?.id);

      const variables = extractVariables(newTemplate.content);
      const created = await createTemplate({
        name: newTemplate.name,
        platform: newTemplate.platform,
        command: newTemplate.command,
        content: newTemplate.content,
        variables,
        status: "pendiente",
      });

      const template: Template = {
        id: created.id,
        name: newTemplate.name,
        platform: newTemplate.platform,
        status: "pendiente",
        command: newTemplate.command,
        content: newTemplate.content,
        createdAt: new Date().toISOString(),
        variables,
        organization: {
          organization_id: organizationId,
          name: user?.organization?.name || "",
        },
      };

      setTemplates((prev) => [template, ...prev]);
      setNewTemplate(DEFAULT_TEMPLATE);
      setIsCreateDialogOpen(false);
      toast({ title: "Plantilla creada", description: "Se creó exitosamente" });
    } catch (error) {
      console.error("Error creating template:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo crear la plantilla",
        variant: "destructive",
      });
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    try {
      await deleteTemplate(id);
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      setIsDeleteTemplateOpen(false);
      toast({ title: "Eliminada", description: "Plantilla eliminada" });
    } catch (error) {
      console.error("Error deleting template:", error);
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      setIsDeleteTemplateOpen(false);
      toast({
        title: "Eliminada",
        description: "No se pudo eliminar en API",
      });
    }
  };

  const renderPreviewBubble = (template: Template) => {
    const colorClass = BUBBLE_COLORS[template.platform] || "bg-background-light ";
    let previewContent = template.content;

    template.variables?.forEach((variable) => {
      previewContent = previewContent.replace(
        new RegExp(`\\{\\{${variable}\\}\\}`, "g"),
        `[${variable}]`
      );
    });

    return (
      <div className="max-w-sm mx-auto mt-4">
        <div
          className={`${colorClass} text-white px-4 py-2 rounded-sm shadow-sm max-w-[600px] min-w-[100px] break-words`}
        >
          <p className="text-sm text-background whitespace-pre-line">
            {previewContent}
          </p>
          <div className="flex justify-end mt-2">
            <span className="text-xs text-background">
              {new Date().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        </div>
      </div>
    );
  };

  // Get selected organization name
  const getSelectedOrganizationName = () => {
    if (selectedOrganization === null) return "Todas las organizaciones";
    const org = organizations.find(o => o.organization_id === selectedOrganization);
    return org ? org.name : "Todas las organizaciones";
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex flex-col h-full bg-background items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando plantillas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      <Card className="border-0 shadow-none rounded-none">
        <CardHeader className="flex flex-row items-start justify-between gap-2">
          <div className="flex flex-col gap-1">
            <CardTitle className="text-xl md:text-2xl font-bold">
              Plantillas ({templates.length})
            </CardTitle>
            <p className="text-muted-foreground text-sm md:text-base">
              Administra tus plantillas de mensajes meta
            </p>
          </div>
          {/* New Template Modal */}
          <Dialog
            open={isCreateDialogOpen}
            onOpenChange={setIsCreateDialogOpen}
          >
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Crear Nueva Plantilla</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nombre</Label>
                      <Input
                        id="name"
                        value={newTemplate.name}
                        onChange={(e) =>
                          setNewTemplate((prev) => ({
                            ...prev,
                            name: e.target.value,
                          }))
                        }
                        placeholder="Ej: Saludo de bienvenida"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="platform">Plataforma</Label>
                      <Select
                        value={newTemplate.platform}
                        onValueChange={(value) =>
                          setNewTemplate((prev) => ({
                            ...prev,
                            platform: value as any,
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona canal" />
                        </SelectTrigger>
                        <SelectContent className="bg-background">
                          {PLATFORMS.map((platform) => (
                            <SelectItem key={platform} value={platform}>
                              {platform.charAt(0).toUpperCase() +
                                platform.slice(1)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="command">Comando</Label>
                    <Input
                      id="command"
                      value={
                        newTemplate.command.startsWith("/")
                          ? newTemplate.command
                          : "/" + newTemplate.command
                      }
                      onChange={(e) => {
                        let value = e.target.value;
                        if (!value.startsWith("/"))
                          value = "/" + value.replace(/\//g, "");
                        setNewTemplate((prev) => ({ ...prev, command: value }));
                      }}
                      placeholder="Ej: /bienvenida, /promo, /soporte"
                    />
                    <p className="text-xs text-muted-foreground">
                      Los usuarios usarán este comando para acceder rápidamente
                      a la plantilla
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="content">Contenido</Label>
                  <Textarea
                    id="content"
                    value={newTemplate.content}
                    onChange={(e) =>
                      setNewTemplate((prev) => ({
                        ...prev,
                        content: e.target.value,
                      }))
                    }
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Vista Previa</Label>
                  {renderPreviewBubble({
                    ...newTemplate,
                    id: "preview",
                    status: "pendiente",
                    createdAt: "",
                    variables: extractVariables(newTemplate.content),
                  } as Template)}
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button onClick={handleCreateTemplate}>Crear Plantilla</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>

        {/* Filters */}
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 flex-wrap">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar plantillas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>
            {/* Organization Filter Combobox */}
            {isOwner && organizations.length > 0 && (
              <div className="w-full md:w-auto">
                <Popover open={organizationComboboxOpen} onOpenChange={setOrganizationComboboxOpen}>
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
                  <PopoverContent className="w-full md:w-[250px] p-0 bg-background-light">
                    <Command>
                      <CommandInput placeholder="Buscar organización..." />
                      <CommandList>
                        <CommandEmpty>No se encontraron organizaciones.</CommandEmpty>
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
                                selectedOrganization === null ? "opacity-100" : "opacity-0"
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
                                  selectedOrganization === org.organization_id ? "opacity-100" : "opacity-0"
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

            <div className="flex flex-wrap gap-2 items-center">
              {PLATFORMS.map((platform) => {
                const PlatformIcon = PLATFORM_ICONS[platform];
                return (
                  <Badge
                    key={platform}
                    variant={
                      selectedPlatforms.includes(platform)
                        ? "default"
                        : "outline"
                    }
                    className="cursor-pointer capitalize flex items-center gap-1"
                    onClick={() => togglePlatform(platform)}
                  >
                    <PlatformIcon className="w-3 h-3" />
                    {platform}
                    {selectedPlatforms.includes(platform) && (
                      <X className="w-3 h-3" />
                    )}
                  </Badge>
                );
              })}
            </div>
          </div>

          <div className="block md:hidden border-t my-2"></div>

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 flex-wrap">
            <div className="flex flex-wrap gap-1 md:gap-2 items-center">
              {STATUSES.map((status) => (
                <Badge
                  key={status}
                  variant={
                    selectedStatuses.includes(status) ? "default" : "outline"
                  }
                  className="cursor-pointer capitalize flex items-center gap-1"
                  onClick={() => toggleStatus(status)}
                >
                  {status}
                  {selectedStatuses.includes(status) && (
                    <X className="w-3 h-3" />
                  )}
                </Badge>
              ))}
            </div>

            {(searchQuery ||
              selectedPlatforms.length > 0 ||
              selectedStatuses.length > 0) && (
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

          {(searchQuery ||
            selectedPlatforms.length > 0 ||
            selectedStatuses.length > 0) && (
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

      {/* Content */}
      <div className="flex-1 overflow-hidden px-2 md:px-0">
        <ScrollArea className="h-full">
          {filteredTemplates.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center px-4">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mb-4">
                <Plus className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">
                No se encontraron plantillas
              </h3>
              <p className="text-muted-foreground">
                {searchQuery ||
                selectedPlatforms.length > 0 ||
                selectedStatuses.length > 0
                  ? "Intenta ajustar tu búsqueda o filtros"
                  : "Crea tu primera plantilla para comenzar"}
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Plataforma</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Creado</TableHead>
                      {isOwner && <TableHead>Organización</TableHead>}                      
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTemplates.map((template) => (
                      <TableRow key={template.id}>
                        <TableCell className="font-medium">
                          {template.name}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1 flex-wrap">
                            <Badge
                              className="capitalize flex items-center gap-1 px-3 py-1"
                              variant="outline"
                              style={{
                                borderColor: `hsl(var(--${template.platform}-primary))`,
                                color: `hsl(var(--${template.platform}-primary))`,
                              }}
                            >
                              {(() => {
                                const PlatformIcon =
                                  PLATFORM_ICONS[template.platform];
                                return (
                                  <PlatformIcon
                                    className="w-4 h-4"
                                    style={{
                                      color: `hsl(var(--${template.platform}-primary))`,
                                    }}
                                  />
                                );
                              })()}
                              {template.platform}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              template.status === "aprobada"
                                ? "default"
                                : template.status === "pendiente"
                                ? "secondary"
                                : "destructive"
                            }
                            className="capitalize"
                          >
                            {template.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(template.createdAt)}
                        </TableCell>
                        {isOwner && (
                        <TableCell className="text-sm">
                          {template.organization?.name || "N/A"}
                        </TableCell>
                        )}
                        <TableCell>
                          
                          <div className="flex gap-2">
                            {/* View Template Dialog */}
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <Eye className="w-4 h-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>{template.name}</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div>
                                    <Label>Contenido</Label>
                                    <p className="text-sm mt-1 p-3 bg-muted rounded-md">
                                      {template.content}
                                    </p>
                                  </div>
                                  <div>
                                    <Label>Vista Previa</Label>
                                    <p className="text-xs text-muted-foreground">
                                      {template.command}
                                    </p>
                                    {renderPreviewBubble(template)}
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>

                            {/* Delete */}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setTemplateToDelete(template);
                                setIsDeleteTemplateOpen(true);
                              }}
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

              <Dialog
                open={isDeleteTemplateOpen}
                onOpenChange={setIsDeleteTemplateOpen}
              >
                <DialogContent className="border border-border rounded-md w-96 max-w-[90vw] p-0 overflow-hidden">
                  <DialogHeader className="p-6 pb-4">
                    <div className="text-center">
                      <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Trash2 className="w-6 h-6 text-red-500" />
                      </div>
                      <DialogTitle className="text-lg font-semibold text-foreground mb-2">
                        ¿Eliminar Plantilla?
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
                        <li>La plantilla "{templateToDelete?.name}"</li>
                        <li>El contenido del mensaje</li>
                      </ul>
                    </div>
                  </div>

                  <DialogFooter className="p-6 pt-4">
                    <div className="flex gap-3 w-full">
                      <Button
                        variant="outline"
                        onClick={() => setIsDeleteTemplateOpen(false)}
                        className="flex-1"
                      >
                        Cancelar
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() =>
                          templateToDelete &&
                          handleDeleteTemplate(templateToDelete.id)
                        }
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
                {filteredTemplates.map((template) => (
                  <Card
                    key={template.id}
                    className="p-4 flex flex-col gap-2"
                  >
                    <div className="flex justify-between items-start">
                      <span className="font-medium">{template.name}</span>
                      <Badge
                        variant={
                          template.status === "aprobada"
                            ? "default"
                            : template.status === "pendiente"
                            ? "secondary"
                            : "destructive"
                        }
                        className="capitalize"
                      >
                        {template.status}
                      </Badge>
                    </div>

                    <div className="flex gap-2 flex-wrap items-center mb-2">
                      <Badge
                        className="capitalize"
                        variant="outline"
                        style={{
                          borderColor: `hsl(var(--${template.platform}-primary))`,
                          color: `hsl(var(--${template.platform}-primary))`,
                        }}
                      >
                        {template.platform}
                      </Badge>
                    </div>

                    <div className="flex justify-between items-center text-sm text-muted-foreground mb-2">
                      <span>Creado: </span>
                      <span>{formatDate(template.createdAt)}</span>
                    </div>
                    {isOwner && (
                    <div className="flex justify-between items-center text-sm text-muted-foreground mb-2">
                      <span>Organización:</span>
                      <span>{template.organization?.name || "N/A"}</span>
                    </div>
                    )}
                    <div className="flex gap-2 justify-end">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <Eye className="w-4 h-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>{template.name}</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label>Contenido</Label>
                              <p className="text-sm mt-1 p-3 bg-background-light rounded-md">
                                {template.content}
                              </p>
                            </div>
                            <div className="text-muted-foreground">
                              <Label>Vista Previa</Label>
                              <p className="text-xs text-muted-foreground">
                                {template.command}
                              </p>
                              {renderPreviewBubble(template)}
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>

                      {/* Delete */}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setTemplateToDelete(template);
                          setIsDeleteTemplateOpen(true);
                        }}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
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
