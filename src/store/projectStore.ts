import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Project, Photo, TransitionType, PhotoEffect } from '../types/project.types';

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
      
      // Selectors
      getCurrentProject: () => {
        const { currentProjectId, projects } = get();
        return projects.find(project => project.id === currentProjectId);
      },
      
      getProjectById: (id) => {
        return get().projects.find(project => project.id === id);
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
