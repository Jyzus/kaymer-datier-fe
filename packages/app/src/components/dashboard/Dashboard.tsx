import {
  CalendarIcon,
  CubeIcon,
  ExclamationTriangleIcon,
  ExitIcon,
  LockClosedIcon,
  MagnifyingGlassIcon,
  Pencil1Icon,
  PlusIcon,
  TrashIcon,
} from '@radix-ui/react-icons';
import {
  Badge,
  Button,
  Callout,
  Card,
  Dialog,
  Flex,
  Heading,
  Table,
  Text,
  TextField,
} from '@radix-ui/themes';
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  useAddProject,
  useDeleteProject,
  useProjects,
  useSetSelectedProjectId,
  useUpdateProject,
  useUpdateProjects,
} from '@/atoms/modules/project';
import { api, ApiKeyItem, getCurrentUser } from '@/utils/api';

import * as styles from './Dashboard.styles';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const projects = useProjects();
  const updateProjects = useUpdateProjects();
  const addProject = useAddProject();
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();
  const setSelectedProjectId = useSetSelectedProjectId();

  // Current User
  const currentUser = getCurrentUser();

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  // Create Project Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');

  // Edit Project Modal State
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingId, setEditingId] = useState('');
  const [editProjectName, setEditProjectName] = useState('');
  const [editProjectDesc, setEditProjectDesc] = useState('');

  // API Keys Modal State
  const [isApiKeyOpen, setIsApiKeyOpen] = useState(false);
  const [apiKeys, setApiKeys] = useState<ApiKeyItem[]>([]);
  const [newKeyName, setNewKeyName] = useState('');
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [apiKeyLoading, setApiKeyLoading] = useState(false);
  const [apiKeyError, setApiKeyError] = useState<string | null>(null);

  const handleOpenApiKeys = async () => {
    setIsApiKeyOpen(true);
    setCreatedKey(null);
    setApiKeyError(null);
    try {
      setApiKeyLoading(true);
      const res = await api.getApiKeys();
      setApiKeys(res.keys || []);
    } catch (err: any) {
      setApiKeyError(err.message || 'Error al cargar API keys');
    } finally {
      setApiKeyLoading(false);
    }
  };

  const handleCreateApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;
    try {
      setApiKeyLoading(true);
      const res = await api.createApiKey(newKeyName.trim(), 'subscription');
      setCreatedKey(res.api_key);
      setNewKeyName('');
      const list = await api.getApiKeys();
      setApiKeys(list.keys || []);
    } catch (err: any) {
      alert(err.message || 'Error creando API key');
    } finally {
      setApiKeyLoading(false);
    }
  };

  const handleRevokeApiKey = async (id: string) => {
    if (confirm('¿Revocar esta API key permanentemente?')) {
      try {
        await api.revokeApiKey(id);
        const list = await api.getApiKeys();
        setApiKeys(list.keys || []);
      } catch (err: any) {
        alert(err.message || 'Error revocando API key');
      }
    }
  };

  useEffect(() => {
    updateProjects();
    // Clear selected project when on the dashboard
    setSelectedProjectId(null);
  }, [updateProjects, setSelectedProjectId]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    try {
      await addProject({
        name: newProjectName,
        description: newProjectDesc,
      });
      setNewProjectName('');
      setNewProjectDesc('');
      setIsCreateOpen(false);
    } catch (err) {
      alert('Error al crear el proyecto');
    }
  };

  const handleEditProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editProjectName.trim()) return;

    try {
      await updateProject({
        id: editingId,
        name: editProjectName,
        description: editProjectDesc,
      });
      setIsEditOpen(false);
    } catch (err) {
      alert('Error al actualizar el proyecto');
    }
  };

  const handleDeleteProject = async (
    e: React.MouseEvent,
    id: string,
    name: string
  ) => {
    e.stopPropagation(); // Avoid triggering card navigation
    if (
      confirm(
        `¿Estás seguro de eliminar el proyecto "${name}"? Se eliminarán todos sus esquemas asociados.`
      )
    ) {
      try {
        await deleteProject(id);
      } catch (err) {
        alert('Error al eliminar el proyecto');
      }
    }
  };

  const handleOpenEdit = (
    e: React.MouseEvent,
    id: string,
    name: string,
    desc: string | null
  ) => {
    e.stopPropagation(); // Avoid triggering card navigation
    setEditingId(id);
    setEditProjectName(name);
    setEditProjectDesc(desc || '');
    setIsEditOpen(true);
  };

  const handleCardClick = (id: string) => {
    setSelectedProjectId(id);
    navigate(`/project/${id}`);
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(d);
  };

  const filteredProjects = useMemo(() => {
    if (!searchQuery.trim()) return projects;
    const q = searchQuery.toLowerCase().trim();
    return projects.filter(
      p =>
        p.name.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q))
    );
  }, [projects, searchQuery]);

  const userInitial = (
    currentUser?.first_name?.[0] ||
    currentUser?.email?.[0] ||
    'U'
  ).toUpperCase();

  return (
    <div css={styles.container}>
      {/* Top Header */}
      <div css={styles.header}>
        <Flex direction="column" gap="1">
          <Heading size="8" css={styles.title}>
            Mis Proyectos
          </Heading>
          <Text size="2" color="gray">
            Modelado visual de bases de datos y esquemas asistido por IA
          </Text>
        </Flex>

        <Flex align="center" gap="3" wrap="wrap">
          {/* API Keys Dialog */}
          <Dialog.Root open={isApiKeyOpen} onOpenChange={setIsApiKeyOpen}>
            <Dialog.Trigger>
              <Button
                size="3"
                variant="surface"
                color="gray"
                onClick={handleOpenApiKeys}
                style={{ cursor: 'pointer', fontWeight: 500 }}
              >
                <LockClosedIcon width="15" height="15" />
                API Keys
              </Button>
            </Dialog.Trigger>
            <Dialog.Content style={{ maxWidth: 620, borderRadius: 16 }}>
              <Dialog.Title>Gestión de API Keys (M2M)</Dialog.Title>
              <Dialog.Description size="2" mb="4">
                Administra tus claves de acceso para conectar Planifier Docs,
                scripts de migración y servicios externos.
              </Dialog.Description>

              {apiKeyError && (
                <Callout.Root color="red" mb="3" size="1">
                  <Callout.Icon>
                    <ExclamationTriangleIcon />
                  </Callout.Icon>
                  <Callout.Text>{apiKeyError}</Callout.Text>
                </Callout.Root>
              )}

              {createdKey && (
                <Callout.Root color="green" mb="3">
                  <Callout.Text>
                    <strong>¡Nueva API Key generada con éxito!</strong>
                    <br />
                    Guárdala ahora. Por seguridad, no se volverá a mostrar en
                    texto claro:
                    <br />
                    <code
                      style={{
                        userSelect: 'all',
                        wordBreak: 'break-all',
                        display: 'block',
                        marginTop: 8,
                        padding: '6px 10px',
                        background: 'var(--green-3)',
                        borderRadius: 6,
                        fontFamily: 'monospace',
                      }}
                    >
                      {createdKey}
                    </code>
                  </Callout.Text>
                </Callout.Root>
              )}

              <form onSubmit={handleCreateApiKey} style={{ marginBottom: 20 }}>
                <Flex gap="2">
                  <TextField.Input
                    placeholder="Nombre de la clave (ej. Planifier Integration)"
                    value={newKeyName}
                    onChange={e => setNewKeyName(e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <Button
                    type="submit"
                    disabled={apiKeyLoading || !newKeyName.trim()}
                    style={{ cursor: 'pointer' }}
                  >
                    Generar Clave
                  </Button>
                </Flex>
              </form>

              <Text size="2" weight="bold" mb="2" as="div">
                Claves Activas
              </Text>

              {apiKeys.length === 0 ? (
                <Text size="2" color="gray">
                  No tienes API keys generadas.
                </Text>
              ) : (
                <Table.Root size="1">
                  <Table.Header>
                    <Table.Row>
                      <Table.ColumnHeaderCell>Nombre</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>Prefijo</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>Ámbito</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>Acciones</Table.ColumnHeaderCell>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {apiKeys.map(k => (
                      <Table.Row key={k.id}>
                        <Table.Cell>{k.name}</Table.Cell>
                        <Table.Cell>
                          <Badge color="gray">{k.key_prefix}...</Badge>
                        </Table.Cell>
                        <Table.Cell>
                          <Badge color="blue">{k.scope_type}</Badge>
                        </Table.Cell>
                        <Table.Cell>
                          <Button
                            size="1"
                            variant="ghost"
                            color="red"
                            type="button"
                            onClick={() => handleRevokeApiKey(k.id)}
                            style={{ cursor: 'pointer' }}
                          >
                            Revocar
                          </Button>
                        </Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table.Root>
              )}

              <Flex justify="end" mt="4">
                <Dialog.Close>
                  <Button
                    variant="soft"
                    color="gray"
                    type="button"
                    style={{ cursor: 'pointer' }}
                  >
                    Cerrar
                  </Button>
                </Dialog.Close>
              </Flex>
            </Dialog.Content>
          </Dialog.Root>

          {/* Nuevo Proyecto Dialog */}
          <Dialog.Root open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <Dialog.Trigger>
              <Button
                size="3"
                variant="solid"
                style={{
                  cursor: 'pointer',
                  fontWeight: 600,
                  background:
                    'linear-gradient(135deg, var(--accent-9), var(--accent-10))',
                }}
              >
                <PlusIcon width="16" height="16" /> Nuevo Proyecto
              </Button>
            </Dialog.Trigger>
            <Dialog.Content style={{ maxWidth: 460, borderRadius: 16 }}>
              <Dialog.Title>Nuevo Proyecto</Dialog.Title>
              <Dialog.Description size="2" mb="4">
                Crea un nuevo proyecto para modelar tus tablas y relaciones ERD.
              </Dialog.Description>

              <form onSubmit={handleCreateProject}>
                <Flex direction="column" gap="3">
                  <label>
                    <Text as="div" size="2" mb="1" weight="medium">
                      Nombre del Proyecto
                    </Text>
                    <TextField.Input
                      required
                      placeholder="Ej. Tienda Online"
                      value={newProjectName}
                      onChange={e =>
                        setNewProjectName((e.target as HTMLInputElement).value)
                      }
                    />
                  </label>
                  <label>
                    <Text as="div" size="2" mb="1" weight="medium">
                      Descripción (opcional)
                    </Text>
                    <TextField.Input
                      placeholder="Ej. Modelado de clientes, pedidos y pagos"
                      value={newProjectDesc}
                      onChange={e =>
                        setNewProjectDesc((e.target as HTMLInputElement).value)
                      }
                    />
                  </label>
                </Flex>

                <Flex gap="3" mt="4" justify="end">
                  <Dialog.Close>
                    <Button
                      variant="soft"
                      color="gray"
                      type="button"
                      style={{ cursor: 'pointer' }}
                    >
                      Cancelar
                    </Button>
                  </Dialog.Close>
                  <Button type="submit" style={{ cursor: 'pointer' }}>
                    Crear Proyecto
                  </Button>
                </Flex>
              </form>
            </Dialog.Content>
          </Dialog.Root>

          {/* User Profile & Logout */}
          <div css={styles.userPill}>
            <Flex
              align="center"
              justify="center"
              style={{
                width: 26,
                height: 26,
                borderRadius: '50%',
                background:
                  'linear-gradient(135deg, var(--accent-9), var(--accent-11))',
                color: 'white',
                fontWeight: 700,
                fontSize: 12,
              }}
            >
              {userInitial}
            </Flex>
            <Text size="2" color="gray" weight="medium">
              {currentUser?.first_name ||
                currentUser?.email?.split('@')[0] ||
                'Usuario'}
            </Text>
            <button
              type="button"
              css={styles.iconButton}
              title="Cerrar sesión"
              onClick={() => api.logout()}
              style={{ marginLeft: 4 }}
            >
              <ExitIcon width="14" height="14" />
            </button>
          </div>
        </Flex>
      </div>

      {/* Search & Counter Bar */}
      <div css={styles.searchBar}>
        <TextField.Root style={{ maxWidth: 360, width: '100%' }}>
          <TextField.Slot>
            <MagnifyingGlassIcon height="16" width="16" />
          </TextField.Slot>
          <TextField.Input
            placeholder="Buscar proyectos..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </TextField.Root>

        <Text size="2" color="gray">
          {filteredProjects.length}{' '}
          {filteredProjects.length === 1
            ? 'proyecto encontrado'
            : 'proyectos encontrados'}
        </Text>
      </div>

      {/* Grid of projects */}
      {filteredProjects.length === 0 ? (
        <Card
          style={{
            padding: 48,
            borderRadius: 16,
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--color-surface, var(--gray-2))',
            border: '1px dashed var(--gray-a6)',
            marginTop: 20,
          }}
        >
          <Flex
            align="center"
            justify="center"
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: 'var(--gray-4)',
              color: 'var(--gray-10)',
              marginBottom: 16,
            }}
          >
            <CubeIcon width="28" height="28" />
          </Flex>
          <Heading size="4" mb="1" weight="medium">
            {searchQuery.trim()
              ? 'No hay proyectos que coincidan con la búsqueda'
              : 'Aún no tienes ningún proyecto'}
          </Heading>
          <Text size="2" color="gray" mb="4" style={{ maxWidth: 360 }}>
            {searchQuery.trim()
              ? 'Intenta con otro término o limpia el filtro de búsqueda.'
              : 'Comienza creando tu primer proyecto para modelar tablas y generar esquemas SQL.'}
          </Text>
          <Button
            size="3"
            onClick={() => {
              if (searchQuery.trim()) {
                setSearchQuery('');
              } else {
                setIsCreateOpen(true);
              }
            }}
            style={{ cursor: 'pointer' }}
          >
            {searchQuery.trim()
              ? 'Limpiar búsqueda'
              : '+ Crear mi primer proyecto'}
          </Button>
        </Card>
      ) : (
        <div css={styles.grid}>
          {filteredProjects.map(project => (
            <div
              key={project.id}
              css={styles.card}
              onClick={() => handleCardClick(project.id)}
            >
              <div css={styles.cardHighlight} />
              <div css={styles.cardBody}>
                <Flex justify="between" align="start" gap="2">
                  <Flex align="center" gap="2" style={{ overflow: 'hidden' }}>
                    <Flex
                      align="center"
                      justify="center"
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        background: 'var(--accent-a3)',
                        color: 'var(--accent-11)',
                        flexShrink: 0,
                      }}
                    >
                      <CubeIcon width="18" height="18" />
                    </Flex>
                    <Heading
                      size="4"
                      weight="bold"
                      style={{
                        color: 'var(--gray-12)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {project.name}
                    </Heading>
                  </Flex>

                  <Flex gap="1">
                    <button
                      type="button"
                      css={styles.iconButton}
                      title="Editar proyecto"
                      onClick={e =>
                        handleOpenEdit(
                          e,
                          project.id,
                          project.name,
                          project.description
                        )
                      }
                    >
                      <Pencil1Icon width="15" height="15" />
                    </button>
                    <button
                      type="button"
                      css={styles.deleteButton}
                      title="Eliminar proyecto"
                      onClick={e =>
                        handleDeleteProject(e, project.id, project.name)
                      }
                    >
                      <TrashIcon width="15" height="15" />
                    </button>
                  </Flex>
                </Flex>

                <Text
                  size="2"
                  color="gray"
                  style={{
                    minHeight: '38px',
                    lineHeight: '1.4',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                  }}
                >
                  {project.description || 'Sin descripción'}
                </Text>
              </div>

              <div css={styles.cardFooter}>
                <Flex align="center" gap="1">
                  <CalendarIcon
                    width="13"
                    height="13"
                    style={{ color: 'var(--gray-8)' }}
                  />
                  <Text size="1" color="gray">
                    {formatDate(project.updatedAt)}
                  </Text>
                </Flex>
                <Badge size="1" variant="soft" color="indigo">
                  PostgreSQL
                </Badge>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Project Dialog */}
      <Dialog.Root open={isEditOpen} onOpenChange={setIsEditOpen}>
        <Dialog.Content style={{ maxWidth: 460, borderRadius: 16 }}>
          <Dialog.Title>Editar Proyecto</Dialog.Title>
          <Dialog.Description size="2" mb="4">
            Modifica la información del proyecto seleccionado.
          </Dialog.Description>

          <form onSubmit={handleEditProject}>
            <Flex direction="column" gap="3">
              <label>
                <Text as="div" size="2" mb="1" weight="medium">
                  Nombre del Proyecto
                </Text>
                <TextField.Input
                  required
                  placeholder="Ej. Tienda Online"
                  value={editProjectName}
                  onChange={e =>
                    setEditProjectName((e.target as HTMLInputElement).value)
                  }
                />
              </label>
              <label>
                <Text as="div" size="2" mb="1" weight="medium">
                  Descripción (opcional)
                </Text>
                <TextField.Input
                  placeholder="Ej. Modelado de clientes, pedidos y pagos"
                  value={editProjectDesc}
                  onChange={e =>
                    setEditProjectDesc((e.target as HTMLInputElement).value)
                  }
                />
              </label>
            </Flex>

            <Flex gap="3" mt="4" justify="end">
              <Dialog.Close>
                <Button
                  variant="soft"
                  color="gray"
                  type="button"
                  style={{ cursor: 'pointer' }}
                >
                  Cancelar
                </Button>
              </Dialog.Close>
              <Button type="submit" style={{ cursor: 'pointer' }}>
                Guardar Cambios
              </Button>
            </Flex>
          </form>
        </Dialog.Content>
      </Dialog.Root>
    </div>
  );
};

export default Dashboard;
