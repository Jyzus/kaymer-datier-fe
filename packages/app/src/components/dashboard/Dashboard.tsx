import {
  CalendarIcon,
  ExclamationTriangleIcon,
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
  Grid,
  Heading,
  Table,
  Text,
  TextField,
} from '@radix-ui/themes';
import React, { useEffect, useState } from 'react';
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
      alert('Error creating project');
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
      alert('Error updating project');
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
        alert('Error deleting project');
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
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  };

  return (
    <div css={styles.container}>
      {/* Header */}
      <div css={styles.header}>
        <Flex direction="column" gap="1">
          <Heading size="8" css={styles.title}>
            Mis Proyectos Base de Datos
          </Heading>
          <Text size="2" color="gray">
            Administra y modela tus esquemas visuales con asistencia de IA
          </Text>
        </Flex>

        <Flex align="center" gap="3">
          {/* API Keys Dialog */}
          <Dialog.Root open={isApiKeyOpen} onOpenChange={setIsApiKeyOpen}>
            <Dialog.Trigger>
              <Button
                size="3"
                variant="soft"
                color="gray"
                onClick={handleOpenApiKeys}
              >
                API Keys
              </Button>
            </Dialog.Trigger>
            <Dialog.Content style={{ maxWidth: 600 }}>
              <Dialog.Title>Gestión de API Keys (M2M)</Dialog.Title>
              <Dialog.Description size="2" mb="4">
                Administra tus claves de acceso para conectar Planifier Docs,
                workers y herramientas externas.
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
                    claro:
                    <br />
                    <code
                      style={{
                        userSelect: 'all',
                        wordBreak: 'break-all',
                        display: 'block',
                        marginTop: 6,
                        padding: '4px 8px',
                        background: 'var(--green-3)',
                        borderRadius: 4,
                      }}
                    >
                      {createdKey}
                    </code>
                  </Callout.Text>
                </Callout.Root>
              )}

              <form onSubmit={handleCreateApiKey} style={{ marginBottom: 16 }}>
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
                  <Button variant="soft" color="gray" type="button">
                    Cerrar
                  </Button>
                </Dialog.Close>
              </Flex>
            </Dialog.Content>
          </Dialog.Root>

          {/* Nuevo Proyecto Dialog */}
          <Dialog.Root open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <Dialog.Trigger>
              <Button size="3" variant="solid">
                <PlusIcon width="16" height="16" /> Nuevo Proyecto
              </Button>
            </Dialog.Trigger>
            <Dialog.Content style={{ maxWidth: 450 }}>
              <Dialog.Title>Nuevo Proyecto</Dialog.Title>
              <Dialog.Description size="2" mb="4">
                Crea un nuevo proyecto para agrupar múltiples esquemas de bases
                de datos.
              </Dialog.Description>

              <form onSubmit={handleCreateProject}>
                <Flex direction="column" gap="3">
                  <label>
                    <Text as="div" size="2" mb="1" weight="bold">
                      Nombre del Proyecto
                    </Text>
                    <TextField.Input
                      required
                      placeholder="Ej. Proyecto A"
                      value={newProjectName}
                      onChange={e =>
                        setNewProjectName((e.target as HTMLInputElement).value)
                      }
                    />
                  </label>
                  <label>
                    <Text as="div" size="2" mb="1" weight="bold">
                      Descripción (opcional)
                    </Text>
                    <TextField.Input
                      placeholder="Ej. Sistema de autenticación y ventas"
                      value={newProjectDesc}
                      onChange={e =>
                        setNewProjectDesc((e.target as HTMLInputElement).value)
                      }
                    />
                  </label>
                </Flex>

                <Flex gap="3" mt="4" justify="end">
                  <Dialog.Close>
                    <Button variant="soft" color="gray" type="button">
                      Cancelar
                    </Button>
                  </Dialog.Close>
                  <Button type="submit">Crear Proyecto</Button>
                </Flex>
              </form>
            </Dialog.Content>
          </Dialog.Root>

          {/* User Profile & Logout */}
          <Flex
            align="center"
            gap="2"
            style={{
              borderLeft: '1px solid var(--gray-6)',
              paddingLeft: '12px',
            }}
          >
            <Text size="2" color="gray" weight="medium">
              {currentUser?.first_name || currentUser?.email || 'Usuario'}
            </Text>
            <Button
              size="2"
              variant="ghost"
              color="red"
              onClick={() => api.logout()}
            >
              Salir
            </Button>
          </Flex>
        </Flex>
      </div>

      {/* Grid of projects */}
      {projects.length === 0 ? (
        <Flex
          direction="column"
          align="center"
          justify="center"
          style={{ flexGrow: 1, minHeight: 300 }}
          gap="4"
        >
          <Text size="4" color="gray">
            No tienes proyectos creados todavía.
          </Text>
          <Button size="3" onClick={() => setIsCreateOpen(true)}>
            <PlusIcon width="16" height="16" /> Crear mi primer proyecto
          </Button>
        </Flex>
      ) : (
        <Grid css={styles.grid}>
          {projects.map(project => (
            <Card
              key={project.id}
              css={styles.card}
              onClick={() => handleCardClick(project.id)}
            >
              <div css={styles.cardBody}>
                <Flex justify="between" align="start" gap="2">
                  <Heading
                    size="5"
                    weight="bold"
                    style={{ color: 'var(--accent-11)' }}
                  >
                    {project.name}
                  </Heading>
                  <Flex gap="1">
                    <button
                      type="button"
                      css={styles.editButton}
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
                      css={styles.actionButton}
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
                    minHeight: '40px',
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
                    width="14"
                    height="14"
                    style={{ color: 'var(--gray-8)' }}
                  />
                  <Text size="1" color="gray">
                    Actualizado: {formatDate(project.updatedAt)}
                  </Text>
                </Flex>
              </div>
            </Card>
          ))}
        </Grid>
      )}

      {/* Edit Project Dialog */}
      <Dialog.Root open={isEditOpen} onOpenChange={setIsEditOpen}>
        <Dialog.Content style={{ maxWidth: 450 }}>
          <Dialog.Title>Editar Proyecto</Dialog.Title>
          <Dialog.Description size="2" mb="4">
            Modifica la información del proyecto seleccionado.
          </Dialog.Description>

          <form onSubmit={handleEditProject}>
            <Flex direction="column" gap="3">
              <label>
                <Text as="div" size="2" mb="1" weight="bold">
                  Nombre del Proyecto
                </Text>
                <TextField.Input
                  required
                  placeholder="Ej. Proyecto A"
                  value={editProjectName}
                  onChange={e =>
                    setEditProjectName((e.target as HTMLInputElement).value)
                  }
                />
              </label>
              <label>
                <Text as="div" size="2" mb="1" weight="bold">
                  Descripción (opcional)
                </Text>
                <TextField.Input
                  placeholder="Ej. Sistema de autenticación y ventas"
                  value={editProjectDesc}
                  onChange={e =>
                    setEditProjectDesc((e.target as HTMLInputElement).value)
                  }
                />
              </label>
            </Flex>

            <Flex gap="3" mt="4" justify="end">
              <Dialog.Close>
                <Button variant="soft" color="gray" type="button">
                  Cancelar
                </Button>
              </Dialog.Close>
              <Button type="submit">Guardar Cambios</Button>
            </Flex>
          </form>
        </Dialog.Content>
      </Dialog.Root>
    </div>
  );
};

export default Dashboard;
