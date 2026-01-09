import { useState, useMemo, useEffect } from "react";
import { Search, X, Edit2, Trash2, UserPlus, Plus } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  getUsers,
  createUser,
  updateUser,
  deleteUser,
} from "@/api/users";
import { formatDate, formatRole } from "@/utils/formatters";
import { Label } from "@/components/ui/label";
import { isValidEmail } from "@/utils/mail";
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
interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
  lastLogin?: string;
  createdAt: string;
  organization?: {  
    organization_id: number;  
    name: string;
  };
}

interface UserFormData {
  name: string;
  email: string;
  role: string;
  organizationId: number | null;
  organizationName: string;
}

interface Organization {
  organization_id: number;
  name: string;
}

const ROLE_DESCRIPTIONS: Record<string, string> = {
  dueno: "Puede administrar todo el sistema, incluyendo la gestión de admin.",
  admin:
    "Puede gestionar colaboradores, pero no modificar dueños ni otros admin.",
  colaborador:
    "Acceso limitado. No puede realizar cambios en usuarios ni configuraciones.",
};

export function UsersView() {
  const currentUser = useCurrentUser();
  const isOwner = currentUser?.role === 'dueno';

  // Move user-dependent constants inside the component
  const USER_ROLES = isOwner ? ['dueno', 'admin', 'colaborador'] : ['admin', 'colaborador'] as const;

  const DEFAULT_FORM_DATA: UserFormData = {
    name: "",
    email: "",
    role: "colaborador",
    organizationId: isOwner ? null : currentUser.organization?.id || null,
    organizationName: isOwner ? "" : currentUser.organization?.name || "",
  };

  // State
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [selectedOrganization, setSelectedOrganization] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<UserFormData>(DEFAULT_FORM_DATA);
  const [isDeleteUserOpen, setIsDeleteUserOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loadingOrganizations, setLoadingOrganizations] = useState(false);
  const [organizationComboboxOpen, setOrganizationComboboxOpen] = useState(false);

  // Data fetching
  useEffect(() => {
    loadUsers();    
    if (isOwner) {
      loadOrganizations();
    }
  }, [isOwner]);

  const loadUsers = async (): Promise<void> => {
    try {
      setLoading(true);
      const data = await getUsers();      
      setUsers(Array.isArray(data?.data) ? data.data : []);
    } catch (error) {
      console.error("Error loading users:", error);
      if (!(error instanceof SessionExpiredError)) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los usuarios",
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
    if (isModalOpen && !editingUser) {
      setFormData(DEFAULT_FORM_DATA);
    }
  }, [isModalOpen, editingUser]);

  // Filtering
  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchesSearch =
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesRole =
        selectedRoles.length === 0 || selectedRoles.includes(user.role);

      const matchesOrganization =
        selectedOrganization === null || 
        user.organization?.organization_id === selectedOrganization;

      return matchesSearch && matchesRole && matchesOrganization;
    });
  }, [users, searchQuery, selectedRoles, selectedOrganization]);

  // Filter handlers
  const toggleRoleFilter = (role: string): void => {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const clearFilters = (): void => {
    setSearchQuery("");
    setSelectedRoles([]);
    setSelectedOrganization(null);
  };

  // Form handlers
  const resetForm = (): void => {
    setFormData(DEFAULT_FORM_DATA);
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const organizationId = user.organization?.id;
    const organizationName = user.organization?.name;

    setFormData((prev) => ({
      ...prev,
      organizationId: organizationId,
      organizationName: organizationName,
    }));
    setEditingUser(null);
  };

  const openCreateModal = (): void => {
    resetForm();
    setIsModalOpen(true);
  };

  const openEditModal = (user: User): void => {
    setEditingUser(user);
    const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
    const organizationId = currentUser.organization?.id;
    const organizationName = currentUser.organization?.name;
    setFormData({
      name: user.name,
      email: user.email,
      role: user.role,
      organizationId: organizationId,
      organizationName: organizationName,
    });
    setIsModalOpen(true);
  };

  const handleSaveUser = async (): Promise<void> => {
    if (!formData.name.trim() || !formData.email.trim()) {
      toast({
        title: "Error",
        description: "Nombre y correo son obligatorios",
        variant: "destructive",
      });
      return;
    }

    if (isOwner && formData.role !== 'dueno' && !formData.organizationId) {
      toast({
        title: "Error",
        description: "La organización es obligatoria para este rol",
        variant: "destructive",
      });
      return;
    }

    if (!isValidEmail(formData.email)) {
      toast({
        title: "Error",
        description: "Por favor ingresa un email válido con @ y dominio",
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingUser) {
        const updatedUser = await updateUser(editingUser.id, formData);
        setUsers((prev) =>
          prev.map((user) => (user.id === editingUser.id ? updatedUser : user))
        );
        toast({
          title: "Usuario actualizado",
          description: `Se actualizó ${formData.name}`,
        });
      } else {
        const newUser = await createUser(formData);
        setUsers((prev) => [newUser, ...prev]);
        toast({
          title: "Usuario creado",
          description: `Se creó ${formData.name}`,
        });
      }
      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      console.error("Error saving user:", error);
      if (!(error instanceof SessionExpiredError)) {
      toast({
        title: "Error",
        description: "No se pudo guardar el usuario",
        variant: "destructive",
      });
      }
    }
  };

  const handleDeleteUser = async (userId: string): Promise<void> => {
    try {
      await deleteUser(userId);
      setUsers((prev) => prev.filter((user) => user.id !== userId));
      setIsDeleteUserOpen(false);
      toast({
        title: "Eliminado",
        description: "Usuario eliminado",
      });
    } catch (error) {
      console.error("Error deleting user:", error);
      if (!(error instanceof SessionExpiredError)) {
      setIsDeleteUserOpen(false);
      toast({
        title: "Error",
        description: "No se pudo eliminar el usuario",
        variant: "destructive",
      });
      }
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
          <p className="text-muted-foreground">Cargando usuarios...</p>
        </div>
      </div>
    );
  }

  // OrganizationSelect Component
  const OrganizationSelect = ({ 
    formData, 
    setFormData, 
    isOwner 
  }: { 
    formData: UserFormData; 
    setFormData: React.Dispatch<React.SetStateAction<UserFormData>>;
    isOwner: boolean;
  }) => {
    if (!isOwner) {
      return (
        <div className="space-y-2">
          <Label htmlFor="organization">Organización</Label>
          <Input
            id="organization"
            placeholder="Organización"
            disabled
            value={formData.organizationName}
          />
        </div>
      );
    }

    return (
      <div className="space-y-2">
        <Label htmlFor="organization">Organización *</Label>
        <Select
          value={formData.organizationId?.toString() || ""}
          onValueChange={(value) => {
            const orgId = parseInt(value);
            const selectedOrg = organizations.find(org => org.organization_id === orgId);
            setFormData((prev) => ({
              ...prev,
              organizationId: orgId,
              organizationName: selectedOrg?.name || "",
            }));
          }}
          disabled={loadingOrganizations}
        >
          <SelectTrigger>
            <SelectValue placeholder={loadingOrganizations ? "Cargando..." : "Seleccionar organización"} />
          </SelectTrigger>
          <SelectContent className="bg-background">
            {organizations.map((org) => (
              <SelectItem key={org.organization_id} value={org.organization_id.toString()}>
                {org.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Selecciona la organización a la que pertenecerá el usuario
        </p>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <Card className="border-0 shadow-none rounded-none">
        <CardHeader className="flex flex-row items-start justify-between gap-2">
          <div className="flex flex-col gap-1">
            <CardTitle className="text-xl md:text-2xl font-bold">
              Usuarios ({users.length})
            </CardTitle>
            <p className="text-muted-foreground text-sm md:text-base">
              Registra y administra usuarios
            </p>
          </div>

          {/* New/Edit User Modal */}
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreateModal} className="gap-2">
                <Plus className="w-4 h-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingUser ? "Editar Usuario" : "Nuevo Usuario"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nombre *</Label>
                      <Input
                        id="name"
                        placeholder="Ej: Juan Pérez"
                        value={formData.name}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            name: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Correo electrónico *</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="Ej: juan@empresa.com"
                        value={formData.email}
                        onChange={(e) => {
                          const value = e.target.value;
                          setFormData((prev) => ({ ...prev, email: value }));
                        }}                        
                      />                     
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="role">Rol</Label>
                    <Select
                      value={formData.role}
                      onValueChange={(value) =>
                        setFormData((prev) => ({
                          ...prev,
                          role: value,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar rol">
                          {formData.role
                            ? formatRole(formData.role)
                            : "Seleccionar rol"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="bg-background">
                        {USER_ROLES.map((role) => (
                          <SelectItem key={role} value={role}>
                            <div className="flex flex-col justify-start text-left">
                              <span className="font-medium">
                                {formatRole(role)}
                              </span>
                              <span className="text-xs text-muted-foreground mt-1">
                                {ROLE_DESCRIPTIONS[role]}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      El rol determina los permisos y accesos del usuario en el
                      sistema
                    </p>
                  </div>

                  {formData.role !== 'dueno' && (
                    <OrganizationSelect 
                      formData={formData} 
                      setFormData={setFormData}
                      isOwner={isOwner}
                    />
                  )}
                </div>

                {!editingUser ? (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">
                      * El usuario recibirá un correo para configurar su
                      contraseña
                    </p>
                    <p className="text-xs text-muted-foreground">
                      <strong className="text-sm">*</strong> Campos requeridos
                    </p>
                  </div>
                ) : null}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSaveUser}>
                  {editingUser ? "Actualizar" : "Crear"}
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
                placeholder="Buscar por nombre o correo..."
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
              {USER_ROLES.map((role) => (
                <Badge
                  key={role}
                  variant={selectedRoles.includes(role) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleRoleFilter(role)}
                >
                  {formatRole(role)}
                  {selectedRoles.includes(role) && (
                    <X className="w-3 h-3 ml-1" />
                  )}
                </Badge>
              ))}
            </div>

            {(searchQuery || selectedRoles.length > 0 || selectedOrganization !== null) && (
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

          {(searchQuery || selectedRoles.length > 0 || selectedOrganization !== null) && (
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
          {filteredUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center px-4">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                <UserPlus className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">
                No se encontraron usuarios
              </h3>
              <p className="text-muted-foreground">
                {searchQuery || selectedRoles.length > 0 || selectedOrganization !== null
                  ? "Intenta ajustar tu búsqueda"
                  : "Agrega nuevos usuarios"}
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuario</TableHead>
                      <TableHead>Correo</TableHead>
                      <TableHead>Rol</TableHead>
                      {isOwner && <TableHead>Organización</TableHead>}
                      <TableHead>Última Conexión</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="w-8 h-8">
                              <AvatarImage src={user.avatar} alt={user.name} />
                              <AvatarFallback>
                                {user.name
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")}
                              </AvatarFallback>
                            </Avatar>
                            <div className="font-medium">{user.name}</div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{user.email}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              user.role === "admin" ? "default" : "secondary"
                            }
                            className={
                              user.role === "admin"
                                ? "bg-primary"
                                : user.role === "dueno"
                                ? "bg-foreground text-background"
                                : ""
                            }
                          >
                            {formatRole(user.role)}
                          </Badge>
                        </TableCell>
                        {isOwner && (
                          <TableCell className="text-sm">
                            {user.organization?.name || "N/A"}
                          </TableCell>
                        )}
                        <TableCell className="text-sm text-muted-foreground">
                          {user.lastLogin ? formatDate(user.lastLogin) : "N/A"}
                        </TableCell>
                        <TableCell>
                          {(isOwner || user.role !== "dueno") &&(
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openEditModal(user)}
                              title="Editar usuario"
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>

                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setUserToDelete(user);
                                setIsDeleteUserOpen(true);
                              }}
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>                                                
                          </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <Dialog
                open={isDeleteUserOpen}
                onOpenChange={setIsDeleteUserOpen}
              >
                <DialogContent className="bg-background-dark border border-border rounded-md w-96 max-w-[90vw] p-0 overflow-hidden">
                  <DialogHeader className="p-6 pb-4">
                    <div className="text-center">
                      <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Trash2 className="w-6 h-6 text-red-500" />
                      </div>
                      <DialogTitle className="text-lg font-semibold text-foreground mb-2">
                        ¿Eliminar Usuario?
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
                        <li>El usuario "{userToDelete?.name}"</li>
                        <li>Todos sus datos personales</li>
                        <li>Todos sus contactos</li>
                      </ul>
                    </div>
                  </div>

                  <DialogFooter className="p-6 pt-4">
                    <div className="flex gap-3 w-full">
                      <Button
                        variant="outline"
                        onClick={() => setIsDeleteUserOpen(false)}
                        className="flex-1"
                      >
                        Cancelar
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => userToDelete && handleDeleteUser(userToDelete.id)}
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
                {filteredUsers.map((user) => (
                  <Card key={user.id} className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={user.avatar} alt={user.name} />
                          <AvatarFallback>
                            {user.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{user.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {user.email}
                          </div>
                        </div>
                      </div>
                      <Badge
                        variant={
                          user.role === "admin" ? "default" : "secondary"
                        }
                        className={
                          user.role === "admin"
                            ? "bg-primary"
                            : user.role === "dueno"
                            ? "bg-foreground text-background"
                            : ""
                        }
                      >
                        {formatRole(user.role)}
                      </Badge>
                    </div>

                    {isOwner && (
                    <div className="flex justify-between items-center text-sm text-muted-foreground mb-2">
                        <span>Organización:</span>
                        <span>{user.organization?.name || "N/A"}</span>
                      </div>
                    )}

                    <div className="flex justify-between items-center text-sm text-muted-foreground mb-3">
                      <span>Última Conexión:</span>
                      <span>
                        {user.lastLogin ? formatDate(user.lastLogin) : "N/A"}
                      </span>
                    </div>
                    
                    {(isOwner || user.role !== "dueno") &&(
                    <div className="flex gap-2 justify-end">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openEditModal(user)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setUserToDelete(user);
                          setIsDeleteUserOpen(true);
                        }}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>                                             
                    </div>
                    )}
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