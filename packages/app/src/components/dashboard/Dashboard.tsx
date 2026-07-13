import {
  CalendarIcon,
  Pencil1Icon,
  PlusIcon,
  TrashIcon,
} from '@radix-ui/react-icons';
import {
  Button,
  Card,
  Dialog,
  Flex,
  Grid,
  Heading,
  Text,
  TextField,
} from '@radix-ui/themes';
import { useSetAtom } from 'jotai';
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
import { selectedSchemaIdAtom } from '@/atoms/modules/sidebar';

import * as styles from './Dashboard.styles';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const projects = useProjects();
  const updateProjects = useUpdateProjects();
  const addProject = useAddProject();
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();
  const setSelectedProjectId = useSetSelectedProjectId();
  const setSelectedSchemaId = useSetAtom(selectedSchemaIdAtom);

  // Create Project Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');

  // Edit Project Modal State
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingId, setEditingId] = useState('');
  const [editProjectName, setEditProjectName] = useState('');
  const [editProjectDesc, setEditProjectDesc] = useState('');

  useEffect(() => {
    updateProjects();
    // Clear selected project and schema when on the dashboard
    setSelectedProjectId(null);
    setSelectedSchemaId(null);
  }, [updateProjects, setSelectedProjectId, setSelectedSchemaId]);

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

        <Dialog.Root open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <Dialog.Trigger>
            <Button size="3" variant="solid">
              <PlusIcon width="16" height="16" /> Nuevo Proyecto
            </Button>
          </Dialog.Trigger>
          <Dialog.Content style={{ maxWidth: 450 }}>
            <Dialog.Title>Nuevo Proyecto</Dialog.Title>
            <Dialog.Description size="2" mb="4">
              Crea un nuevo proyecto para agrupar múltiples esquemas de bases de
              datos.
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
