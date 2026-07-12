import { debounce } from 'lodash-es';

import { api } from '@/utils/api';

export type SchemaEntity = {
  id: string;
  projectId: string;
  name: string;
  value: string;
  createAt: number;
  updateAt: number;
};

export async function addSchemaEntity(
  db: any,
  projectId: string,
  entityValue: Pick<SchemaEntity, 'name'>
): Promise<SchemaEntity> {
  const result = await api.createSchema(projectId, entityValue.name);
  return {
    id: result.id,
    projectId: result.projectId,
    name: result.name,
    value: result.value,
    createAt: new Date(result.createdAt).getTime(),
    updateAt: new Date(result.updatedAt).getTime(),
  };
}

const debouncedSaveMap = new Map<string, (value: string) => void>();

export async function updateSchemaEntity(
  db: any,
  id: string,
  entityValue: Partial<Pick<SchemaEntity, 'value' | 'name'>>
) {
  if (entityValue.name !== undefined) {
    await api.updateSchema(id, { name: entityValue.name });
  }

  if (entityValue.value !== undefined) {
    let debouncedSave = debouncedSaveMap.get(id);
    if (!debouncedSave) {
      debouncedSave = debounce(async (val: string) => {
        try {
          await api.updateSchema(id, { value: val });
        } catch (error) {
          console.error('Error auto-saving schema:', error);
        }
      }, 2000);
      debouncedSaveMap.set(id, debouncedSave);
    }
    debouncedSave(entityValue.value);
  }
  return true;
}

export async function deleteSchemaEntity(db: any, id: string) {
  await api.deleteSchema(id);
}

export async function getSchemaEntity(
  db: any,
  id: string
): Promise<SchemaEntity | undefined> {
  const result = await api.getSchema(id);
  return {
    id: result.id,
    projectId: result.projectId,
    name: result.name,
    value: result.value,
    createAt: new Date(result.createdAt).getTime(),
    updateAt: new Date(result.updatedAt).getTime(),
  };
}

export async function getSchemaEntities(
  db: any,
  projectId: string
): Promise<Array<Omit<SchemaEntity, 'value'>>> {
  const list = await api.getSchemas(projectId);
  return list.map(item => ({
    id: item.id,
    projectId: item.projectId,
    name: item.name,
    createAt: new Date(item.createdAt).getTime(),
    updateAt: new Date(item.updatedAt).getTime(),
  }));
}
