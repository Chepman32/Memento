import { useEffect, useRef, useState, useCallback } from 'react';
import { useProjectStore } from '../store/projectStore';
import { haptics } from '../utils/hapticFeedback';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface UseAutosaveOptions {
  debounceMs?: number;
  onSaveStart?: () => void;
  onSaveComplete?: () => void;
  onSaveError?: (error: any) => void;
}

export const useAutosave = (projectId: string | undefined, options: UseAutosaveOptions = {}) => {
  const { debounceMs = 1500, onSaveStart, onSaveComplete, onSaveError } = options;

  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastProjectStateRef = useRef<string | null>(null);

  const { getCurrentProject } = useProjectStore();

  // Clear any pending save on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Save function with status updates
  const performSave = useCallback(async () => {
    if (!projectId) return;

    try {
      setSaveStatus('saving');
      onSaveStart?.();

      // The actual save is handled by Zustand's persist middleware
      // We just need to update the status
      await new Promise(resolve => setTimeout(resolve, 300)); // Simulate save time

      setSaveStatus('saved');
      setLastSaved(new Date());
      onSaveComplete?.();

      // Reset to idle after showing saved status
      setTimeout(() => {
        setSaveStatus('idle');
      }, 2000);

    } catch (error) {
      console.error('Autosave error:', error);
      setSaveStatus('error');
      onSaveError?.(error);

      // Reset to idle after showing error
      setTimeout(() => {
        setSaveStatus('idle');
      }, 3000);
    }
  }, [projectId, onSaveStart, onSaveComplete, onSaveError]);

  // Debounced save trigger
  const triggerSave = useCallback(() => {
    // Clear any existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set status to indicate changes are pending
    if (saveStatus === 'saved' || saveStatus === 'idle') {
      setSaveStatus('idle');
    }

    // Schedule the save
    saveTimeoutRef.current = setTimeout(() => {
      performSave();
    }, debounceMs);
  }, [debounceMs, performSave, saveStatus]);

  // Monitor project changes and trigger saves
  useEffect(() => {
    if (!projectId) return;

    const currentProject = getCurrentProject();
    if (!currentProject) return;

    // Serialize project state for comparison
    const currentState = JSON.stringify({
      photos: currentProject.photos,
      transitions: currentProject.transitions,
      settings: currentProject.settings,
      title: currentProject.title,
    });

    // Check if state has changed
    if (lastProjectStateRef.current && lastProjectStateRef.current !== currentState) {
      triggerSave();
    }

    lastProjectStateRef.current = currentState;
  }, [projectId, getCurrentProject, triggerSave]);

  // Force save function for immediate saves (e.g., on screen exit)
  const forceSave = useCallback(async () => {
    // Clear any pending debounced save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }

    // Perform immediate save
    await performSave();
  }, [performSave]);

  return {
    saveStatus,
    lastSaved,
    forceSave,
  };
};