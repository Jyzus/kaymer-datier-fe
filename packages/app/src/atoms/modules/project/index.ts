import { atom, useAtomValue, useSetAtom } from 'jotai';
import { atomWithImmer } from 'jotai-immer';

import { api, Project } from '@/utils/api';

export const projectsAtom = atomWithImmer<Project[]>([]);
export const selectedProjectIdAtom = atom<string | null>(null);

const updateProjectsAtom = atom(null, async (get, set) => {
  try {
    const list = await api.getProjects();
    set(projectsAtom, list);
  } catch (error) {
    console.error('Error fetching projects:', error);
  }
});

const addProjectAtom = atom(
  null,
  async (get, set, payload: { name: string; description?: string }) => {
    try {
      const newProj = await api.createProject(
        payload.name,
        payload.description
      );
      set(projectsAtom, draft => {
        draft.unshift(newProj); // Add to the top
      });
      return newProj;
    } catch (error) {
      console.error('Error creating project:', error);
      throw error;
    }
  }
);

const updateProjectAtom = atom(
  null,
  async (
    get,
    set,
    payload: { id: string; name?: string; description?: string }
  ) => {
    const prevList = get(projectsAtom);

    // Optimistic update
    set(projectsAtom, draft => {
      const proj = draft.find(p => p.id === payload.id);
      if (proj) {
        if (payload.name !== undefined) proj.name = payload.name;
        if (payload.description !== undefined)
          proj.description = payload.description;
      }
    });

    try {
      const updated = await api.updateProject(
        payload.id,
        payload.name,
        payload.description
      );
      return updated;
    } catch (error) {
      // Revert on error
      set(projectsAtom, prevList);
      console.error('Error updating project:', error);
      throw error;
    }
  }
);

const deleteProjectAtom = atom(null, async (get, set, id: string) => {
  const prevList = get(projectsAtom);
  const selectedId = get(selectedProjectIdAtom);

  set(projectsAtom, draft => {
    const index = draft.findIndex(p => p.id === id);
    if (index !== -1) draft.splice(index, 1);
  });

  try {
    await api.deleteProject(id);
    if (selectedId === id) {
      set(selectedProjectIdAtom, null);
    }
  } catch (error) {
    set(projectsAtom, prevList);
    console.error('Error deleting project:', error);
    throw error;
  }
});

export const useProjects = () => useAtomValue(projectsAtom);
export const useSelectedProjectId = () => useAtomValue(selectedProjectIdAtom);
export const useSetSelectedProjectId = () => useSetAtom(selectedProjectIdAtom);
export const useUpdateProjects = () => useSetAtom(updateProjectsAtom);
export const useAddProject = () => useSetAtom(addProjectAtom);
export const useUpdateProject = () => useSetAtom(updateProjectAtom);
export const useDeleteProject = () => useSetAtom(deleteProjectAtom);
