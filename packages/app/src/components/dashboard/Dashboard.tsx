import {
  CalendarIcon,
  CheckIcon,
  CopyIcon,
  CubeIcon,
  ExclamationTriangleIcon,
  ExitIcon,
  LayersIcon,
  LightningBoltIcon,
  LockClosedIcon,
  MagnifyingGlassIcon,
  Pencil1Icon,
  PlusIcon,
  ReloadIcon,
  RocketIcon,
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
  useProjectsLoading,
  useSetSelectedProjectId,
  useUpdateProject,
  useUpdateProjects,
} from '@/atoms/modules/project';
import { api, getCurrentUser } from '@/utils/api';

import { ApiKeyModal } from './ApiKeyModal';
import * as styles from './Dashboard.styles';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const projects = useProjects();
  const isLoading = useProjectsLoading();
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
          {/* API Keys Trigger Button */}
          <Button
            size="3"
            variant="surface"
            color="gray"
            onClick={() => setIsApiKeyOpen(true)}
            style={{ cursor: 'pointer', fontWeight: 500 }}
          >
            <LockClosedIcon width="15" height="15" />
            API Keys
          </Button>

          {/* New Modern API Keys Modal */}
          <ApiKeyModal open={isApiKeyOpen} onOpenChange={setIsApiKeyOpen} />

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

      {/* Search & Counter Bar (Only rendered when user has projects) */}
      {projects.length > 0 && (
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
      )}

      {/* Main Content: Skeleton, Onboarding Hero, Search Empty, or Projects Grid */}
      {isLoading && projects.length === 0 ? (
        <div css={styles.skeletonGrid}>
          <div css={styles.skeletonCard} />
          <div css={styles.skeletonCard} />
          <div css={styles.skeletonCard} />
        </div>
      ) : projects.length === 0 ? (
        <div css={styles.onboardingContainer}>
          <div css={styles.onboardingHighlight} />
          <div css={styles.onboardingIconWrapper}>
            <LayersIcon width="36" height="36" />
          </div>
          <Heading
            size="7"
            weight="bold"
            mb="2"
            style={{ color: 'var(--gray-12)', letterSpacing: '-0.02em' }}
          >
            Bienvenido a Datier
          </Heading>
          <Text
            size="3"
            color="gray"
            mb="5"
            style={{ maxWidth: 540, lineHeight: 1.6 }}
          >
            Comienza creando tu primer proyecto para modelar diagramas ERD,
            diseñar bases de datos relacionales y generar esquemas SQL asistidos
            por inteligencia artificial.
          </Text>
          <Button
            size="3"
            variant="solid"
            onClick={() => setIsCreateOpen(true)}
            style={{
              cursor: 'pointer',
              fontWeight: 600,
              padding: '0 28px',
              height: 44,
              fontSize: 15,
              background:
                'linear-gradient(135deg, var(--accent-9), var(--accent-10))',
              boxShadow: '0 8px 20px -4px var(--accent-a6)',
            }}
          >
            <PlusIcon width="18" height="18" /> Crear mi primer proyecto
          </Button>

          <div css={styles.featuresGrid}>
            <div css={styles.featureCard}>
              <Flex
                align="center"
                gap="2"
                style={{ color: 'var(--accent-11)' }}
              >
                <LayersIcon width="18" height="18" />
                <Text size="2" weight="bold">
                  Modelado Visual
                </Text>
              </Flex>
              <Text size="1" color="gray">
                Diseña entidades, tipos de datos, claves foráneas y relaciones
                con facilidad.
              </Text>
            </div>

            <div css={styles.featureCard}>
              <Flex
                align="center"
                gap="2"
                style={{ color: 'var(--accent-11)' }}
              >
                <LightningBoltIcon width="18" height="18" />
                <Text size="2" weight="bold">
                  IA Copilot
                </Text>
              </Flex>
              <Text size="1" color="gray">
                Describe tu modelo en lenguaje natural y deja que la IA genere
                las tablas.
              </Text>
            </div>

            <div css={styles.featureCard}>
              <Flex
                align="center"
                gap="2"
                style={{ color: 'var(--accent-11)' }}
              >
                <RocketIcon width="18" height="18" />
                <Text size="2" weight="bold">
                  Multi-Dialecto
                </Text>
              </Flex>
              <Text size="1" color="gray">
                Exporta e importa DDL compatible con PostgreSQL, MySQL, SQLite y
                más.
              </Text>
            </div>
          </div>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div css={styles.searchEmptyCard}>
          <Flex
            align="center"
            justify="center"
            style={{
              width: 52,
              height: 52,
              borderRadius: 16,
              background: 'var(--gray-4)',
              color: 'var(--gray-10)',
              marginBottom: 16,
            }}
          >
            <MagnifyingGlassIcon width="24" height="24" />
          </Flex>
          <Heading size="4" mb="1" weight="medium">
            No se encontraron proyectos
          </Heading>
          <Text size="2" color="gray" mb="4">
            No hay proyectos que coincidan con &ldquo;{searchQuery}&rdquo;.
          </Text>
          <Button
            size="2"
            variant="soft"
            color="gray"
            onClick={() => setSearchQuery('')}
            style={{ cursor: 'pointer' }}
          >
            Limpiar búsqueda
          </Button>
        </div>
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
