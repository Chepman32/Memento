import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Project,
  Photo,
  TransitionType,
  PhotoEffect,
  Transition,
  Folder,
} from '../types/project.types';

// Generate unique ID
const generateId = () => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// Default project settings
const DEFAULT_PROJECT_SETTINGS = {
  defaultDuration: 5, // seconds
  defaultTransition: 'fade' as TransitionType,
  exportQuality: '1080p' as const,
  resolution: '9:16' as const,
};

interface ProjectState {
  // State
  projects: Project[];
  folders: Folder[];
  currentProjectId: string | null;
  isLoading: boolean;
  error: string | null;
  history: Project[][];
  historyIndex: number;

  // Actions
  createProject: (title?: string) => Promise<Project>;
  duplicateProject: (id: string) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  setCurrentProject: (id: string | null) => void;
  addPhotos: (
    photos: { uri: string; width: number; height: number }[],
  ) => Promise<void>;
  removePhoto: (projectId: string, photoId: string) => void;
  updatePhoto: (
    projectId: string,
    photoId: string,
    updates: Partial<Photo>,
  ) => void;
  reorderPhotos: (
    projectId: string,
    fromIndex: number,
    toIndex: number,
  ) => void;
  updateProjectSettings: (
    projectId: string,
    settings: Partial<typeof DEFAULT_PROJECT_SETTINGS>,
  ) => void;
  moveProjectToFolder: (projectId: string, folderId: string | null) => void;
  archiveProject: (projectId: string) => void;

  // Transition actions
  addTransition: (
    projectId: string,
    photoIndex: number,
    transitionType: TransitionType,
  ) => void;
  removeTransition: (projectId: string, transitionId: string) => void;
  updateTransition: (
    projectId: string,
    transitionId: string,
    updates: Partial<Transition>,
  ) => void;

  // Folder actions
  createFolder: (name: string, parentId?: string | null) => Folder | null;
  renameFolder: (id: string, name: string) => void;
  deleteFolder: (id: string) => void;

  // Undo/Redo
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  saveToHistory: () => void;

  // Selectors
  getCurrentProject: () => Project | undefined;
  getProjectById: (id: string) => Project | undefined;
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (set, get) => ({
      projects: [],
      folders: [
        {
          id: 'root',
          name: 'All Projects',
          parentId: null,
        },
      ],
      currentProjectId: null,
      isLoading: false,
      error: null,
      history: [],
      historyIndex: -1,

      createProject: async (title = 'Untitled Project') => {
        const newProject: Project = {
          id: generateId(),
          title,
          createdAt: new Date(),
          updatedAt: new Date(),
          photos: [],
          transitions: [],
          settings: { ...DEFAULT_PROJECT_SETTINGS },
          thumbnail: '',
          duration: 0,
          folderId: 'root',
        };

        set(state => ({
          projects: [...state.projects, newProject],
          currentProjectId: newProject.id,
        }));

        return newProject;
      },

      duplicateProject: id => {
        const source = get().projects.find(p => p.id === id);
        if (!source) return;

        const clonePhotos = source.photos.map((photo, index) => ({
          ...photo,
          id: generateId(),
          order: index,
        }));

        const cloneTransitions = (source.transitions || []).map(transition => ({
          ...transition,
          id: generateId(),
        }));

        const duplicated: Project = {
          ...source,
          id: generateId(),
          title: `${source.title} Copy`,
          createdAt: new Date(),
          updatedAt: new Date(),
          photos: clonePhotos,
          transitions: cloneTransitions,
        };

        set(state => ({
          projects: [...state.projects, duplicated],
        }));
      },

      updateProject: (id, updates) => {
        get().saveToHistory();
        set(state => ({
          projects: state.projects.map(project =>
            project.id === id
              ? { ...project, ...updates, updatedAt: new Date() }
              : project,
          ),
        }));
      },

      deleteProject: id => {
        set(state => ({
          projects: state.projects.filter(project => project.id !== id),
          currentProjectId:
            state.currentProjectId === id ? null : state.currentProjectId,
        }));
      },

      setCurrentProject: id => {
        set({ currentProjectId: id });
      },

      moveProjectToFolder: (projectId, folderId) => {
        const targetFolderId = folderId || 'root';
        const folderExists = get().folders.some(f => f.id === targetFolderId);
        if (!folderExists) return;

        get().updateProject(projectId, { folderId: targetFolderId });
      },

      archiveProject: projectId => {
        // Check if "Archived" folder exists, create if not
        let archivedFolder = get().folders.find(
          f => f.name === 'Archived' && f.parentId === null,
        );

        if (!archivedFolder) {
          archivedFolder = get().createFolder('Archived', null);
        }

        if (archivedFolder) {
          get().updateProject(projectId, { folderId: archivedFolder.id });
        }
      },

      addPhotos: async assets => {
        const { currentProjectId, updateProject, getProjectById } = get();

        if (!currentProjectId) {
          console.error('No project selected');
          return;
        }

        const project = getProjectById(currentProjectId);
        if (!project) return;

        // Ensure transitions array exists
        if (!project.transitions) {
          project.transitions = [];
        }

        // Process each photo
        const newPhotos: Photo[] = [];

        for (const asset of assets) {
          try {
            // In a real app, you would copy the file to your app's directory
            // For now, we'll just use the URI directly
            const photoUri = asset.uri;

            newPhotos.push({
              id: generateId(),
              uri: photoUri,
              width: asset.width || 0,
              height: asset.height || 0,
              duration: project.settings.defaultDuration,
              transition: project.settings.defaultTransition,
              effects: [],
              order: project.photos.length + newPhotos.length,
            });
          } catch (error) {
            console.error('Error processing photo:', error);
          }
        }

        if (newPhotos.length === 0) return;

        const updatedProject = {
          ...project,
          photos: [...project.photos, ...newPhotos],
          updatedAt: new Date(),
        };

        // Set the first photo as the thumbnail if it's the first one
        if (project.photos.length === 0 && newPhotos.length > 0) {
          updatedProject.thumbnail = newPhotos[0].uri;
        }

        updateProject(currentProjectId, updatedProject);
      },

      removePhoto: (projectId, photoId) => {
        const project = get().projects.find(p => p.id === projectId);
        if (!project) return;

        const updatedPhotos = project.photos
          .filter(photo => photo.id !== photoId)
          .map((photo, index) => ({
            ...photo,
            order: index,
          }));

        // Update thumbnail if the removed photo was the thumbnail
        let thumbnail = project.thumbnail;
        if (thumbnail === photoId) {
          thumbnail = updatedPhotos[0]?.uri || '';
        }

        get().updateProject(projectId, {
          photos: updatedPhotos,
          thumbnail,
        });
      },

      updatePhoto: (projectId, photoId, updates) => {
        const project = get().projects.find(p => p.id === projectId);
        if (!project) return;

        const updatedPhotos = project.photos.map(photo =>
          photo.id === photoId ? { ...photo, ...updates } : photo,
        );

        get().updateProject(projectId, {
          photos: updatedPhotos,
        });
      },

      reorderPhotos: (projectId, fromIndex, toIndex) => {
        const project = get().projects.find(p => p.id === projectId);
        if (!project) return;

        const result = Array.from(project.photos);
        const [removed] = result.splice(fromIndex, 1);
        result.splice(toIndex, 0, removed);

        // Update the order property
        const updatedPhotos = result.map((photo, index) => ({
          ...photo,
          order: index,
        }));

        get().updateProject(projectId, {
          photos: updatedPhotos,
        });
      },

      updateProjectSettings: (projectId, settings) => {
        const project = get().projects.find(p => p.id === projectId);
        if (!project) return;

        get().updateProject(projectId, {
          settings: {
            ...project.settings,
            ...settings,
          },
        });
      },

      createFolder: (name, parentId = 'root') => {
        const parentExists =
          parentId === null || get().folders.some(f => f.id === parentId);
        if (!parentExists) return null;

        const newFolder: Folder = {
          id: generateId(),
          name: name.trim() || 'New Folder',
          parentId,
        };

        set(state => ({
          folders: [...state.folders, newFolder],
        }));

        return newFolder;
      },

      renameFolder: (id, name) => {
        set(state => ({
          folders: state.folders.map(folder =>
            folder.id === id
              ? { ...folder, name: name.trim() || folder.name }
              : folder,
          ),
        }));
      },

      deleteFolder: id => {
        // Don't allow deleting the root folder
        if (id === 'root') return;

        // Move all projects in this folder to root
        const projectsInFolder = get().projects.filter(p => p.folderId === id);
        projectsInFolder.forEach(p => {
          get().updateProject(p.id, { folderId: 'root' });
        });

        // Delete the folder
        set(state => ({
          folders: state.folders.filter(folder => folder.id !== id),
        }));
      },

      // Transition Actions
      addTransition: (projectId, photoIndex, transitionType) => {
        const project = get().projects.find(p => p.id === projectId);
        if (!project) return;

        // Ensure transitions array exists
        if (!project.transitions) {
          project.transitions = [];
        }

        // Create new transition object
        const newTransition: Transition = {
          id: generateId(),
          type: transitionType,
          duration: 1, // Default 1 second transition
          order: photoIndex, // Attach to the photo at photoIndex
        };

        // Replace any existing transition at the same index but keep others untouched
        const preservedTransitions = project.transitions.filter(
          t => t.order !== photoIndex,
        );

        get().updateProject(projectId, {
          transitions: [...preservedTransitions, newTransition].sort(
            (a, b) => a.order - b.order,
          ),
        });
      },

      removeTransition: (projectId, transitionId) => {
        const project = get().projects.find(p => p.id === projectId);
        if (!project || !project.transitions) return;

        const transitionToRemove = project.transitions.find(
          t => t.id === transitionId,
        );
        if (!transitionToRemove) return;

        // Remove transition and update orders
        const updatedTransitions = project.transitions.filter(
          t => t.id !== transitionId,
        );

        get().updateProject(projectId, {
          transitions: updatedTransitions.sort((a, b) => a.order - b.order),
        });
      },

      updateTransition: (projectId, transitionId, updates) => {
        const project = get().projects.find(p => p.id === projectId);
        if (!project || !project.transitions) return;

        const updatedTransitions = project.transitions.map(transition =>
          transition.id === transitionId
            ? { ...transition, ...updates }
            : transition,
        );

        get().updateProject(projectId, {
          transitions: updatedTransitions,
        });
      },

      // Undo/Redo
      saveToHistory: () => {
        const state = get();
        const newHistory = state.history.slice(0, state.historyIndex + 1);
        newHistory.push(JSON.parse(JSON.stringify(state.projects)));

        // Keep only last 20 states
        if (newHistory.length > 20) {
          newHistory.shift();
        }

        set({
          history: newHistory,
          historyIndex: newHistory.length - 1,
        });
      },

      undo: () => {
        const state = get();
        if (state.historyIndex > 0) {
          const previousState = state.history[state.historyIndex - 1];
          set({
            projects: JSON.parse(JSON.stringify(previousState)),
            historyIndex: state.historyIndex - 1,
          });
        }
      },

      redo: () => {
        const state = get();
        if (state.historyIndex < state.history.length - 1) {
          const nextState = state.history[state.historyIndex + 1];
          set({
            projects: JSON.parse(JSON.stringify(nextState)),
            historyIndex: state.historyIndex + 1,
          });
        }
      },

      canUndo: () => {
        const state = get();
        return state.historyIndex > 0;
      },

      canRedo: () => {
        const state = get();
        return state.historyIndex < state.history.length - 1;
      },

      // Selectors
      getCurrentProject: () => {
        const { currentProjectId, projects } = get();
        const project = projects.find(
          project => project.id === currentProjectId,
        );
        // Ensure transitions array exists for backward compatibility
        if (project && !project.transitions) {
          project.transitions = [];
        }
        return project;
      },

      getProjectById: id => {
        const project = get().projects.find(project => project.id === id);
        // Ensure transitions array exists for backward compatibility
        if (project && !project.transitions) {
          project.transitions = [];
        }
        return project;
      },
    }),
    {
      name: 'slidemint-projects',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: state => ({
        projects: state.projects,
        folders: state.folders,
        currentProjectId: state.currentProjectId,
      }),
    },
  ),
);

export default useProjectStore;

// Named export for convenience
export { useProjectStore };
