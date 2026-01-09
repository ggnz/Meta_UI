import { useState, useMemo, useEffect } from "react";
import { Search, X, Edit2, Trash2, Building, Plus, Users } from "lucide-react";
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
  getOrganizations,
  createOrganization,
  updateOrganization,
  deleteOrganization,
  getOrganizationUsers,
} from "@/api/organizations";
import { SessionExpiredError } from "@/api/client";
import { Label } from "@/components/ui/label";

// Types
interface Organization {
  organization_id: number;
  name: string;
  created_at?: string;
  user_count?: number;
}

interface OrganizationFormData {
  name: string;
}

// Constants
const DEFAULT_FORM_DATA: OrganizationFormData = {
  name: "",
};

export function OrganizationsView() {
  // State
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrganization, setEditingOrganization] =
    useState<Organization | null>(null);
  const [formData, setFormData] =
    useState<OrganizationFormData>(DEFAULT_FORM_DATA);
  const [userCounts, setUserCounts] = useState<Record<number, number>>({});
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  // Data fetching
  useEffect(() => {
    loadOrganizations();
  }, []);

  const loadOrganizations = async (): Promise<void> => {
    try {
      setLoading(true);
      const data = await getOrganizations();
      setOrganizations(Array.isArray(data) ? data : []);

      // Load user counts for each organization
      if (Array.isArray(data)) {
        const counts: Record<number, number> = {};
        for (const org of data) {
          try {
            const users = await getOrganizationUsers(org.organization_id);
            counts[org.organization_id] = Array.isArray(users)
              ? users.length
              : 0;
          } catch (error) {
            console.error(
              `Error loading users for organization ${org.organization_id}:`,
              error
            );
            counts[org.organization_id] = 0;
          }
        }
        setUserCounts(counts);
      }
    } catch (error) {
      console.error("Error loading organizations:", error);
      // Don't show error toast if session expired (it's already handled by the interceptor)
      if (!(error instanceof SessionExpiredError)) {
        toast({
          title: "Error",
          description: "No se pudieron cargar las organizaciones",
          variant: "destructive",
        });
      }
      setOrganizations([]);
    } finally {
      setLoading(false);
    }
  };

  // Filtering
  const filteredOrganizations = useMemo(() => {
    return organizations.filter((org) => {
      const matchesSearch = org.name
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase());
      return matchesSearch;
    });
  }, [organizations, searchQuery]);

  // Filter handlers
  const clearFilters = (): void => {
    setSearchQuery("");
  };

  // Form handlers
  const resetForm = (): void => {
    setFormData(DEFAULT_FORM_DATA);
    setEditingOrganization(null);
  };

  const openCreateModal = (): void => {
    resetForm();
    setIsModalOpen(true);
  };

  const openEditModal = (org: Organization): void => {
    setEditingOrganization(org);
    setFormData({ name: org.name });
    setIsModalOpen(true);
  };

  const handleSaveOrganization = async (): Promise<void> => {
    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "El nombre de la organización es obligatorio",
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingOrganization) {
        const updatedOrganization = await updateOrganization(
          editingOrganization.organization_id,
          {
            name: formData.name.trim(),
          }
        );
        setOrganizations((prev) =>
          prev.map((org) =>
            org.organization_id === editingOrganization.organization_id
              ? updatedOrganization
              : org
          )
        );
        toast({
          title: "Organización actualizada",
          description: `Se actualizó "${formData.name}"`,
        });
      } else {
        const newOrganization = await createOrganization({
          name: formData.name.trim(),
        });
        setOrganizations((prev) => [newOrganization, ...prev]);
        toast({
          title: "Organización creada",
          description: `Se creó "${formData.name}"`,
        });
      }
      setIsModalOpen(false);
      resetForm();
    } catch (error: any) {
      console.error("Error saving organization:", error);

      // Don't show error toast if session expired (it's already handled by the interceptor)
      if (error instanceof SessionExpiredError) {
        return;
      }

      // Check for duplicate name error
      if (
        error?.response?.data?.message?.includes(
          "Ya existe una organización con este nombre"
        )
      ) {
        toast({
          title: "Error",
          description: "Ya existe una organización con este nombre",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "No se pudo guardar la organización",
          variant: "destructive",
        });
      }
    }
  };

  const handleDeleteOrganization = async (
    organizationId: number
  ): Promise<void> => {
    setLoading(true);
    try {
      await deleteOrganization(organizationId);
      setOrganizations((prev) =>
        prev.filter((org) => org.organization_id !== organizationId)
      );
      setIsDeleteConfirmOpen(false);
      toast({
        title: "Eliminada",
        description: "Organización eliminada correctamente",
      });
    } catch (error: any) {
      console.error("Error deleting organization:", error);

      // Don't show error toast if session expired (it's already handled by the interceptor)
      if (error instanceof SessionExpiredError) {
        return;
      }

      if (
        error?.response?.data?.message?.includes("tiene usuarios asociados")
      ) {
        toast({
          title: "Error",
          description:
            "No se puede eliminar una organización que tiene usuarios asociados",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "No se pudo eliminar la organización",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex flex-col h-full bg-background items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando organizaciones...</p>
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
              Organizaciones ({organizations.length})
            </CardTitle>
            <p className="text-muted-foreground text-sm md:text-base">
              Gestiona las organizaciones del sistema
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
                  {editingOrganization
                    ? "Editar Organización"
                    : "Nueva Organización"}
                </DialogTitle>
              </DialogHeader>
              <div className="flex flex-col gap-4">
                <div className="space-y-2">
                  <Label htmlFor="organization-name">Nombre</Label>
                  <Input
                    id="organization-name"
                    placeholder="Nombre de la organización"
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
                <Button onClick={handleSaveOrganization}>
                  {editingOrganization ? "Actualizar" : "Crear"}
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
                placeholder="Buscar organizaciones..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>

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
          {filteredOrganizations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center px-4">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                <Building className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">
                No se encontraron organizaciones
              </h3>
              <p className="text-muted-foreground">
                {searchQuery
                  ? "Intenta ajustar tu búsqueda"
                  : "Crea la primera organización"}
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
                      <TableHead>Usuarios</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrganizations.map((org) => (
                      <TableRow key={org.organization_id}>
                        <TableCell className="text-sm text-muted-foreground">
                          {org.organization_id}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                              <Building className="w-4 h-4 text-primary" />
                            </div>
                            <div className="font-medium">{org.name}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm">
                              {userCounts[org.organization_id] || 0} usuarios
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openEditModal(org)}
                              title="Editar organización"
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              title="Eliminar organización"
                              onClick={() => {
                                setEditingOrganization(org);
                                setIsDeleteConfirmOpen(true);
                              }}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <Dialog
                open={isDeleteConfirmOpen}
                onOpenChange={setIsDeleteConfirmOpen}
              >
                <DialogContent className="bg-background-dark border border-border rounded-md w-96 max-w-[90vw] p-0 overflow-hidden">
                  <DialogHeader className="p-6 pb-4">
                    <div className="text-center">
                      <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Trash2 className="w-6 h-6 text-red-500" />
                      </div>
                      <DialogTitle className="text-lg font-semibold text-foreground mb-2">
                        ¿Eliminar Organización?
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
                    {/* User count warning */}
                    {editingOrganization &&
                      userCounts[
                        editingOrganization.organization_id
                      ] > 0 && (
                        <div className="bg-red-500/10 border border-red-500/20 rounded-md p-3 mb-3">
                          <div className="flex items-center gap-2 text-red-500 mb-1">
                            <Users className="w-4 h-4" />
                            <span className="text-sm font-medium">
                              {
                                userCounts[
                                  editingOrganization
                                    .organization_id
                                ]
                              }{" "}
                              usuario(s) afectado(s)
                            </span>
                          </div>
                          <p className="text-xs text-red-500/80">
                            Esta organización tiene usuarios
                            asociados que perderán acceso al
                            sistema.
                          </p>
                        </div>
                      )}

                    <div className="bg-muted/30 rounded-md p-3">
                      <p className="mb-2 text-sm">
                        Se eliminarán permanentemente:
                      </p>
                      <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                        <li>
                          Todos los usuarios de la organización
                        </li>
                        <li>
                          Todas las conversaciones y mensajes
                        </li>
                        <li>Todos los contactos y etiquetas</li>
                        <li>Todas las plantillas de mensajes</li>
                      </ul>
                    </div>
                  </div>

                  <DialogFooter className="p-6 pt-4">
                    <div className="flex gap-3 w-full">
                      <Button
                        variant="outline"
                        onClick={() =>
                          setIsDeleteConfirmOpen(false)
                        }
                        className="flex-1"
                        disabled={loading}
                      >
                        Cancelar
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() =>
                          handleDeleteOrganization(
                            editingOrganization!.organization_id
                          )
                        }
                        className="flex-1"
                        disabled={loading}
                      >
                        {loading
                          ? "Eliminando..."
                          : "Sí, Eliminar"}
                      </Button>
                    </div>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-4 mt-4 mx-4">
                {filteredOrganizations.map((org) => (
                  <Card key={org.organization_id} className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                          <Building className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <div className="font-medium">{org.name}</div>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                            <Users className="w-3 h-3" />
                            <span>
                              {userCounts[org.organization_id] || 0} usuarios
                            </span>
                          </div>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        #{org.organization_id}
                      </Badge>
                    </div>

                    <div className="flex justify-end items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openEditModal(org)}
                        title="Editar organización"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        title="Eliminar organización"
                        onClick={() => {
                          setEditingOrganization(org);
                          setIsDeleteConfirmOpen(true);
                        }}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
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
