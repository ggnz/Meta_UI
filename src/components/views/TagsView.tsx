import { useState, useMemo, useEffect } from "react";
import { Search, X, Edit2, Trash2, TagIcon, Plus } from "lucide-react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  getTags,
  createTag,
  updateTag,
  deleteTag,
} from "@/api/tags";
import { Label } from "@/components/ui/label";
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
import { SessionExpiredError } from "@/api/client";

// Types
interface Tag {
  id: number;
  name: string;
  organization?: {  
    organization_id: number;  
    name: string;
  };
}

interface TagFormData {
  name: string;
}

interface Organization {
  organization_id: number;
  name: string;
}

// Constants
const DEFAULT_FORM_DATA: TagFormData = {
  name: "",
};

export function TagsView() {
  const currentUser = useCurrentUser();
  const isOwner = currentUser?.role === 'dueno';
  // State
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [formData, setFormData] = useState<TagFormData>(DEFAULT_FORM_DATA);
  const [isDeleteTagOpen, setIsDeleteTagOpen] = useState(false);
  const [tagToDelete, setTagToDelete] = useState<Tag | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrganization, setSelectedOrganization] = useState<number | null>(null);
  const [organizationComboboxOpen, setOrganizationComboboxOpen] = useState(false);
  const [loadingOrganizations, setLoadingOrganizations] = useState(false);

  // Data fetching
  useEffect(() => {
    loadTags();    
    if (isOwner) {
      loadOrganizations();
    }
  }, [isOwner]);

  useEffect(() => {
    if (isModalOpen && isOwner) {
      loadOrganizations();
    }
  }, [isModalOpen, isOwner]);

  const loadTags = async (): Promise<void> => {
    try {
      setLoading(true);
      const data = await getTags();      
      setTags(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error loading tags:", error);
      if (!(error instanceof SessionExpiredError)) {
      toast({
        title: "Error",
        description: "No se pudieron cargar las etiquetas",
        variant: "destructive",
      });
      }
      setTags([]);
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

  // Filtering
  const filteredTags = useMemo(() => {
    return tags.filter((tag) => {
      const matchesSearch = tag.name
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase());

      const matchesOrganization =
        selectedOrganization === null ||
        tag.organization?.organization_id === selectedOrganization;

      
      return matchesSearch && matchesOrganization;
    });
  }, [tags, searchQuery, selectedOrganization]);

  // Filter handlers
  const clearFilters = (): void => {
    setSearchQuery("");
    setSelectedOrganization(null);
  };

  // Form handlers
  const resetForm = (): void => {
    setFormData(DEFAULT_FORM_DATA);
    setEditingTag(null);
  };

  const openCreateModal = (): void => {
    resetForm();
    setIsModalOpen(true);
  };

  const openEditModal = (tag: Tag): void => {
    setEditingTag(tag);
    setFormData({ name: tag.name });
    setIsModalOpen(true);
  };

  const handleSaveTag = async (): Promise<void> => {
    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "El nombre de la etiqueta es obligatorio",
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingTag) {
        const updatedTag = await updateTag(editingTag.id, {
          name: formData.name.trim(),
        });
        setTags((prev) =>
          prev.map((tag) => (tag.id === editingTag.id ? updatedTag : tag))
        );
        toast({
          title: "Etiqueta actualizada",
          description: `Se actualizó "${formData.name}"`,
        });
      } else {
        const newTag = await createTag({
          name: formData.name.trim(),
        });
        setTags((prev) => [newTag, ...prev]);
        toast({
          title: "Etiqueta creada",
          description: `Se creó "${formData.name}"`,
        });
      }
      setIsModalOpen(false);
      resetForm();
    } catch (error: any) {
      console.error("Error saving tag:", error);

      // Don't show error toast if session expired (it's already handled by the interceptor)
      if (error instanceof SessionExpiredError) {
        return;
      }

      // Check for duplicate name error
      if (
        error?.response?.data?.message?.includes(
          "Ya existe una etiqueta con este nombre"
        )
      ) {
        toast({
          title: "Error",
          description:
            "Ya existe una etiqueta con este nombre en tu organización",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "No se pudo guardar la etiqueta",
          variant: "destructive",
        });
      }
    }
  };

  const handleDeleteTag = async (tagId: number): Promise<void> => {
    try {
      await deleteTag(tagId);
      setTags((prev) => prev.filter((tag) => tag.id !== tagId));
      setIsDeleteTagOpen(false);
      toast({
        title: "Eliminada",
        description: "Etiqueta eliminada",
      });
    } catch (error) {
      console.error("Error deleting tag:", error);
      // Don't show error toast if session expired (it's already handled by the interceptor)
      if (error instanceof SessionExpiredError) {
        return;
      }
      setIsDeleteTagOpen(false);
      toast({
        title: "Error",
        description: "No se pudo eliminar la etiqueta",
        variant: "destructive",
      });
    }
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
          <p className="text-muted-foreground">Cargando etiquetas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <Card className="border-0 shadow-none rounded-none">
        <CardHeader className="flex flex-row items-start justify-between gap-2">
          <div className="flex flex-col gap-1">
            <CardTitle className="text-xl md:text-2xl font-bold">
              Etiquetas ({tags.length})
            </CardTitle>
            <p className="text-muted-foreground text-sm md:text-base">
              Organiza contactos con etiquetas
            </p>
          </div>

          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreateModal} className="gap-2">
                <Plus className="w-4 h-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingTag ? "Editar Etiqueta" : "Nueva Etiqueta"}
                </DialogTitle>
              </DialogHeader>
              <div className="flex flex-col gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Nombre</Label>

                  <Input
                    placeholder="Nombre de la etiqueta"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSaveTag}>
                  {editingTag ? "Actualizar" : "Crear"}
                </Button>
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
                placeholder="Buscar etiquetas..."
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

            {searchQuery && (
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

          {searchQuery && (
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
          {filteredTags.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center px-4">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                <TagIcon className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">
                No se encontraron etiquetas
              </h3>
              <p className="text-muted-foreground">
                {searchQuery
                  ? "Intenta ajustar tu búsqueda"
                  : "Agrega nuevas etiquetas"}
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Nombre</TableHead>
                      {isOwner && <TableHead>Organización</TableHead>}
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTags.map((tag) => (
                      <TableRow key={tag.id}>
                        <TableCell className="text-sm text-muted-foreground">
                          {tag.id}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                              <TagIcon className="w-4 h-4 text-primary" />
                            </div>
                            <div className="font-medium">{tag.name}</div>
                          </div>
                        </TableCell>
                        {isOwner && (
                        <TableCell className="text-sm">
                          {tag.organization?.name || "N/A"}
                        </TableCell>
                        )}
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openEditModal(tag)}
                              title="Editar etiqueta"
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>

                            {/* Delete */}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setTagToDelete(tag);
                                setIsDeleteTagOpen(true);
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
              <Dialog open={isDeleteTagOpen} onOpenChange={setIsDeleteTagOpen}>
                <DialogContent className="bg-background-dark border border-border rounded-md w-96 max-w-[90vw] p-0 overflow-hidden">
                  <DialogHeader className="p-6 pb-4">
                    <div className="text-center">
                      <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Trash2 className="w-6 h-6 text-red-500" />
                      </div>
                      <DialogTitle className="text-lg font-semibold text-foreground mb-2">
                        ¿Eliminar Etiqueta?
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
                    <div className="bg-muted/30 rounded-md p-3">
                      <p className="mb-2 text-sm">
                        Se eliminará permanentemente:
                      </p>
                      <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                        <li>La etiqueta "{tagToDelete?.name}"</li>
                        <li>Las asociaciones con contactos</li>
                      </ul>
                    </div>
                  </div>

                  <DialogFooter className="p-6 pt-4">
                    <div className="flex gap-3 w-full">
                      <Button
                        variant="outline"
                        onClick={() => setIsDeleteTagOpen(false)}
                        className="flex-1"
                      >
                        Cancelar
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() =>
                          tagToDelete && handleDeleteTag(tagToDelete.id)
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
                {filteredTags.map((tag) => (
                  <Card key={tag.id} className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                          <TagIcon className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <div className="font-medium">{tag.name}</div>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        #{tag.id}
                      </Badge>
                  
                    </div>

                      {isOwner && (
                      <div className="flex justify-between items-center text-sm text-muted-foreground mb-2">
                        <span>Organización:</span>
                        <span>{tag.organization?.name || "N/A"}</span>
                      </div>
                      )}

                      <div className="flex gap-2 justify-end">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openEditModal(tag)}
                          title="Editar etiqueta"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setTagToDelete(tag);
                            setIsDeleteTagOpen(true);
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
