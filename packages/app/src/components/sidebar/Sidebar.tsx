import { ArrowLeftIcon, PlusIcon } from '@radix-ui/react-icons';
import {
  Button,
  Dialog,
  Flex,
  ScrollArea,
  Select,
  Text,
  TextField,
} from '@radix-ui/themes';
import { useAtomValue } from 'jotai';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useUpdateCollaborativeSessionAll } from '@/atoms/modules/collaborative';
import { useSelectedProjectId } from '@/atoms/modules/project';
import {
  useAddSchemaEntity,
  useSchemaEntities,
  useUpdateSchemaEntities,
} from '@/atoms/modules/schema';
import { sidebarSashAtom } from '@/atoms/modules/sidebar-sash';
import DatabaseBadge from '@/components/database-badge/DatabaseBadge';
import SidebarItem from '@/components/sidebar/sidebar-item/SidebarItem';
import { DATABASE_VENDORS, DatabaseVendor } from '@/utils/api';

import * as styles from './Sidebar.styles';

interface SidebarProps {}

const Sidebar: React.FC<SidebarProps> = () => {
  const navigate = useNavigate();
  const schemaEntities = useSchemaEntities();
  const updateSchemaEntities = useUpdateSchemaEntities();
  const updateCollaborativeSessionAll = useUpdateCollaborativeSessionAll();
  const addSchemaEntity = useAddSchemaEntity();
  const projectId = useSelectedProjectId();
  const sashState = useAtomValue(sidebarSashAtom);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [database, setDatabase] = useState<DatabaseVendor | ''>('');

  const canCreate = name.trim().length > 0 && database !== '';

  const resetForm = () => {
    setName('');
    setDatabase('');
  };

  const handleOpenChange = (open: boolean) => {
    setIsCreateOpen(open);
    if (!open) resetForm();
  };

  const handleCreateSchema = (event: React.FormEvent) => {
    event.preventDefault();
    if (!canCreate) return;
    addSchemaEntity({
      name: name.trim(),
      database: database as DatabaseVendor,
    });
    setIsCreateOpen(false);
    resetForm();
  };

  useEffect(() => {
    updateSchemaEntities();
    updateCollaborativeSessionAll();
  }, [projectId, updateSchemaEntities, updateCollaborativeSessionAll]);

  return (
    <>
      <Flex
        css={[styles.root, sashState.open ? null : styles.hide]}
        direction="column"
      >
        <Flex css={styles.header} direction="column" gap="2">
          <Button
            css={styles.backButton}
            size="2"
            variant="soft"
            color="gray"
            onClick={() => navigate('/')}
            title="Volver a todos los proyectos"
          >
            <ArrowLeftIcon width="15" height="15" /> Volver a proyectos
          </Button>

          <Dialog.Root open={isCreateOpen} onOpenChange={handleOpenChange}>
            <Dialog.Trigger>
              <Button css={styles.addButton} size="2" variant="solid">
                <PlusIcon width="16" height="16" /> Crear esquema
              </Button>
            </Dialog.Trigger>
            <Dialog.Content style={{ maxWidth: 450 }}>
              <Dialog.Title>Crear esquema</Dialog.Title>
              <Dialog.Description size="2" mb="4">
                Elige un nombre y el motor de base de datos. El motor se fija al
                crear y define los tipos de datos disponibles.
              </Dialog.Description>

              <form onSubmit={handleCreateSchema}>
                <Flex direction="column" gap="3">
                  <label>
                    <Text as="div" size="2" mb="1" weight="bold">
                      Nombre del esquema
                    </Text>
                    <TextField.Input
                      required
                      autoFocus
                      placeholder="Ej. gia_branding"
                      value={name}
                      onChange={e =>
                        setName((e.target as HTMLInputElement).value)
                      }
                    />
                  </label>
                  <label>
                    <Text as="div" size="2" mb="1" weight="bold">
                      Motor de base de datos
                    </Text>
                    <Select.Root
                      value={database || undefined}
                      onValueChange={value =>
                        setDatabase(value as DatabaseVendor)
                      }
                    >
                      <Select.Trigger
                        style={{ width: '100%' }}
                        placeholder="Selecciona un motor…"
                      />
                      <Select.Content>
                        {DATABASE_VENDORS.map(vendor => (
                          <Select.Item key={vendor} value={vendor}>
                            <Flex align="center" gap="2">
                              <DatabaseBadge vendor={vendor} size={16} />
                              {vendor}
                            </Flex>
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select.Root>
                  </label>
                </Flex>

                <Flex gap="3" mt="4" justify="end">
                  <Dialog.Close>
                    <Button variant="soft" color="gray" type="button">
                      Cancelar
                    </Button>
                  </Dialog.Close>
                  <Button type="submit" disabled={!canCreate}>
                    Crear esquema
                  </Button>
                </Flex>
              </form>
            </Dialog.Content>
          </Dialog.Root>
        </Flex>

        <Flex css={styles.sectionHeader} align="center" justify="between">
          <Text css={styles.sectionLabel}>Esquemas</Text>
          {schemaEntities.length > 0 ? (
            <Text css={styles.count}>{schemaEntities.length}</Text>
          ) : null}
        </Flex>

        <ScrollArea scrollbars="vertical">
          <Flex css={styles.contentArea} direction="column" gap="1">
            {schemaEntities.length === 0 ? (
              <Text css={styles.emptyState} size="1">
                Aún no hay esquemas. Crea el primero para empezar a diseñar tu
                base de datos.
              </Text>
            ) : (
              schemaEntities.map(entity => (
                <SidebarItem key={entity.id} entity={entity} />
              ))
            )}
          </Flex>
        </ScrollArea>
      </Flex>
      <Flex css={[styles.empty, sashState.open ? styles.hide : null]}></Flex>
    </>
  );
};

export default Sidebar;
