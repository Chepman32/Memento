import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Project, Photo, TransitionType, PhotoEffect, Transition } from '../types/project.types';

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
  currentProjectId: string | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  createProject: (title?: string) => Promise<Project>;
  updateProject: (id: string, updates: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  setCurrentProject: (id: string | null) => void;
  addPhotos: (photos: { uri: string; width: number; height: number }[]) => Promise<void>;
  removePhoto: (projectId: string, photoId: string) => void;
  updatePhoto: (projectId: string, photoId: string, updates: Partial<Photo>) => void;
  reorderPhotos: (projectId: string, fromIndex: number, toIndex: number) => void;
  updateProjectSettings: (projectId: string, settings: Partial<typeof DEFAULT_PROJECT_SETTINGS>) => void;

  // Transition actions
  addTransition: (projectId: string, photoIndex: number, transitionType: TransitionType) => void;
  removeTransition: (projectId: string, transitionId: string) => void;
  updateTransition: (projectId: string, transitionId: string, updates: Partial<Transition>) => void;

  // Selectors
  getCurrentProject: () => Project | undefined;
  getProjectById: (id: string) => Project | undefined;
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (set, get) => ({
      projects: [],
      currentProjectId: null,
      isLoading: false,
      error: null,
      
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
        };

        set((state) => ({
          projects: [...state.projects, newProject],
          currentProjectId: newProject.id,
        }));

        return newProject;
      },
      
      updateProject: (id, updates) => {
        set((state) => ({
          projects: state.projects.map((project) =>
            project.id === id
              ? { ...project, ...updates, updatedAt: new Date() }
              : project
          ),
        }));
      },
      
      deleteProject: (id) => {
        set((state) => ({
          projects: state.projects.filter((project) => project.id !== id),
          currentProjectId: state.currentProjectId === id ? null : state.currentProjectId,
        }));
      },
      
      setCurrentProject: (id) => {
        set({ currentProjectId: id });
      },
      
      addPhotos: async (assets) => {
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
          photo.id === photoId ? { ...photo, ...updates } : photo
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
          order: photoIndex, // Insert before the photo at photoIndex
        };

        // Update order of existing transitions that come after
        const updatedTransitions = project.transitions.map(t =>
          t.order >= photoIndex ? { ...t, order: t.order + 1 } : t
        );

        get().updateProject(projectId, {
          transitions: [...updatedTransitions, newTransition].sort((a, b) => a.order - b.order),
        });
      },

      removeTransition: (projectId, transitionId) => {
        const project = get().projects.find(p => p.id === projectId);
        if (!project || !project.transitions) return;

        const transitionToRemove = project.transitions.find(t => t.id === transitionId);
        if (!transitionToRemove) return;

        // Remove transition and update orders
        const updatedTransitions = project.transitions
          .filter(t => t.id !== transitionId)
          .map(t => (t.order > transitionToRemove.order ? { ...t, order: t.order - 1 } : t));

        get().updateProject(projectId, {
          transitions: updatedTransitions,
        });
      },

      updateTransition: (projectId, transitionId, updates) => {
        const project = get().projects.find(p => p.id === projectId);
        if (!project || !project.transitions) return;

        const updatedTransitions = project.transitions.map(transition =>
          transition.id === transitionId ? { ...transition, ...updates } : transition
        );

        get().updateProject(projectId, {
          transitions: updatedTransitions,
        });
      },

      // Selectors
      getCurrentProject: () => {
        const { currentProjectId, projects } = get();
        const project = projects.find(project => project.id === currentProjectId);
        // Ensure transitions array exists for backward compatibility
        if (project && !project.transitions) {
          project.transitions = [];
        }
        return project;
      },

      getProjectById: (id) => {
        const project = get().projects.find(project => project.id === id);
        // Ensure transitions array exists for backward compatibility
        if (project && !project.transitions) {
          project.transitions = [];
        }
        return project;
      },
    }),
    {
      name: 'memento-projects',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        projects: state.projects,
        currentProjectId: state.currentProjectId,
      }),
    }
  )
);

export default useProjectStore;

// Named export for convenience
export { useProjectStore };
