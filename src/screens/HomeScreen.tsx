import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import FeatherIcon from 'react-native-vector-icons/Feather';
import ContextMenu from 'react-native-context-menu-view';
import { RootStackParamList } from '../navigation/navigationTypes';
import useProjectStore from '../store/projectStore';
import { useThemeStore } from '../store/themeStore';
import {
  Button,
  IconButton,
  InputModal,
  AnimatedCollapsible,
} from '../components/common';
import { haptics } from '../utils/hapticFeedback';
import { sounds } from '../utils/soundEffects';
import { SPACING, TYPOGRAPHY, SHADOWS, SCREEN_WIDTH } from '../constants/theme';
import { Project, Folder } from '../types/project.types';

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

const CARD_WIDTH = (SCREEN_WIDTH - SPACING.md * 3) / 2;
const CARD_HEIGHT = CARD_WIDTH * 1.4;

// Thumbnail component with error handling
interface ThumbnailImageProps {
  uri: string;
  style: object;
  placeholderStyle: object;
  placeholderText: string;
  placeholderTextStyle: object;
}

const ThumbnailImage: React.FC<ThumbnailImageProps> = ({
  uri,
  style,
  placeholderStyle,
  placeholderText,
  placeholderTextStyle,
}) => {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <View style={placeholderStyle}>
        <Text style={placeholderTextStyle}>{placeholderText}</Text>
      </View>
    );
  }

  return (
    <Image
      source={{ uri }}
      style={style}
      resizeMode="cover"
      onError={() => setHasError(true)}
    />
  );
};

// Modal state type
interface ModalState {
  visible: boolean;
  type: 'createFolder' | 'renameFolder' | 'renameProject' | null;
  title: string;
  message: string;
  initialValue: string;
  confirmText: string;
  targetId?: string;
}

const initialModalState: ModalState = {
  visible: false,
  type: null,
  title: '',
  message: '',
  initialValue: '',
  confirmText: '',
};

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const { t } = useTranslation();
  const { colors } = useThemeStore();
  const {
    projects,
    folders,
    deleteProject,
    setCurrentProject,
    updateProject,
    duplicateProject,
    createFolder,
    renameFolder,
    deleteFolder,
    moveProjectToFolder,
    archiveProject,
  } = useProjectStore();

  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set(['root']),
  );
  const [modalState, setModalState] = useState<ModalState>(initialModalState);

  const toggleFolder = useCallback((folderId: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
    haptics.light();
  }, []);

  const handleCreateNew = useCallback(() => {
    haptics.medium();
    setCurrentProject(null);
    navigation.navigate('ImageSelection', { autoOpenPicker: true });
  }, [navigation, setCurrentProject]);

  const handleOpenProject = useCallback(
    (project: Project) => {
      haptics.light();
      setCurrentProject(project.id);
      navigation.navigate('Editor', { photos: [] });
    },
    [navigation, setCurrentProject],
  );

  const handleDeleteProject = useCallback(
    (projectId: string) => {
      haptics.light();
      Alert.alert(
        t('home.deleteProject'),
        t('home.deleteProjectConfirm'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('common.delete'),
            style: 'destructive',
            onPress: () => {
              haptics.medium();
              deleteProject(projectId);
            },
          },
        ],
      );
    },
    [deleteProject, t],
  );

  const handleRenameProject = useCallback((project: Project) => {
    haptics.light();
    setModalState({
      visible: true,
      type: 'renameProject',
      title: t('home.renameProject'),
      message: t('home.renameProjectMessage'),
      initialValue: project.title,
      confirmText: t('common.save'),
      targetId: project.id,
    });
  }, [t]);

  const handleDuplicateProject = useCallback(
    (projectId: string) => {
      duplicateProject(projectId);
      haptics.success();
    },
    [duplicateProject],
  );

  const handleCreateFolder = useCallback(() => {
    haptics.light();
    setModalState({
      visible: true,
      type: 'createFolder',
      title: t('home.newFolder'),
      message: t('home.newFolderMessage'),
      initialValue: '',
      confirmText: t('common.continue'),
    });
  }, [t]);

  const handleRenameFolder = useCallback((folder: Folder) => {
    if (folder.id === 'root') return;

    haptics.light();
    setModalState({
      visible: true,
      type: 'renameFolder',
      title: t('home.renameFolder'),
      message: t('home.renameFolderMessage'),
      initialValue: folder.name,
      confirmText: t('common.save'),
      targetId: folder.id,
    });
  }, [t]);

  const handleDeleteFolder = useCallback(
    (folderId: string) => {
      if (folderId === 'root') return;

      haptics.light();
      Alert.alert(
        t('home.deleteFolder'),
        t('home.deleteFolderMessage'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('common.delete'),
            style: 'destructive',
            onPress: () => {
              haptics.medium();
              deleteFolder(folderId);
            },
          },
        ],
      );
    },
    [deleteFolder, t],
  );

  const handleModalConfirm = useCallback(
    (value: string) => {
      switch (modalState.type) {
        case 'createFolder':
          createFolder(value);
          haptics.success();
          break;
        case 'renameFolder':
          if (modalState.targetId) {
            renameFolder(modalState.targetId, value);
          }
          break;
        case 'renameProject':
          if (modalState.targetId) {
            updateProject(modalState.targetId, { title: value });
          }
          break;
      }
      setModalState(initialModalState);
    },
    [modalState, createFolder, renameFolder, updateProject],
  );

  const handleModalCancel = useCallback(() => {
    setModalState(initialModalState);
  }, []);

  const handleMoveToFolder = useCallback(
    (projectId: string, folderId: string) => {
      moveProjectToFolder(projectId, folderId);
      haptics.success();
    },
    [moveProjectToFolder],
  );

  const handleArchiveProject = useCallback(
    (projectId: string) => {
      archiveProject(projectId);
      haptics.success();
    },
    [archiveProject],
  );

  const handleOpenSettings = useCallback(() => {
    haptics.light();
    sounds.tap();
    navigation.navigate('Settings');
  }, [navigation]);

  // Get projects for a specific folder
  // "All Projects" (root) shows ALL projects, other folders show only their projects
  const getProjectsInFolder = useCallback(
    (folderId: string) => {
      if (folderId === 'root') {
        // "All Projects" shows everything
        return projects;
      }
      return projects.filter(p => p.folderId === folderId);
    },
    [projects],
  );

  // Build context menu actions with Move to Folder submenu
  const buildContextMenuActions = useCallback(
    (project: Project) => {
      // Filter out current folder, root (All Projects), and Archived folder from move options
      const archivedFolder = folders.find(f => f.name === 'Archived');
      const otherFolders = folders.filter(
        f =>
          f.id !== 'root' &&
          f.id !== (project.folderId || 'root') &&
          f.name !== 'Archived',
      );

      const moveToFolderActions = otherFolders.map(folder => ({
        title: folder.name,
        systemIcon: 'folder',
      }));

      // Check if project is already archived
      const isArchived =
        archivedFolder && project.folderId === archivedFolder.id;

      return [
        {
          title: t('home.contextMenu.rename'),
          systemIcon: 'pencil',
        },
        {
          title: t('home.contextMenu.duplicate'),
          systemIcon: 'doc.on.doc',
        },
        {
          title: t('home.contextMenu.moveToFolder'),
          systemIcon: 'folder',
          inlineChildren: true,
          actions: moveToFolderActions,
        },
        {
          title: isArchived ? t('home.contextMenu.unarchive') : t('home.contextMenu.archive'),
          systemIcon: isArchived ? 'tray.and.arrow.up' : 'archivebox',
        },
        {
          title: t('home.contextMenu.delete'),
          systemIcon: 'trash',
          destructive: true,
        },
      ];
    },
    [folders, t],
  );

  const renderProject = useCallback(
    (item: Project) => {
      const formattedDate = new Date(item.updatedAt).toLocaleDateString(
        'en-US',
        {
          month: 'short',
          day: 'numeric',
        },
      );

      const contextMenuActions = buildContextMenuActions(item);

      const handleContextMenuAction = (
        actionTitle: string,
        indexPath?: number[],
      ) => {
        haptics.medium();

        // Check if it's a folder selection from the submenu
        if (indexPath && indexPath.length === 2 && indexPath[0] === 2) {
          // Index 2 is "Move to Folder", second index is the folder
          const archivedFolder = folders.find(f => f.name === 'Archived');
          const otherFolders = folders.filter(
            f =>
              f.id !== 'root' &&
              f.id !== (item.folderId || 'root') &&
              f.name !== 'Archived',
          );
          const selectedFolder = otherFolders[indexPath[1]];
          if (selectedFolder) {
            handleMoveToFolder(item.id, selectedFolder.id);
          }
          return;
        }

        switch (actionTitle) {
          case t('home.contextMenu.rename'):
            handleRenameProject(item);
            break;
          case t('home.contextMenu.duplicate'):
            handleDuplicateProject(item.id);
            break;
          case t('home.contextMenu.archive'):
            handleArchiveProject(item.id);
            break;
          case t('home.contextMenu.unarchive'):
            // Move back to root folder
            handleMoveToFolder(item.id, 'root');
            break;
          case t('home.contextMenu.delete'):
            handleDeleteProject(item.id);
            break;
        }
      };

      return (
        <ContextMenu
          key={item.id}
          actions={contextMenuActions}
          onPress={e =>
            handleContextMenuAction(e.nativeEvent.name, e.nativeEvent.indexPath)
          }
          previewBackgroundColor={colors.surface}
        >
          <TouchableOpacity
            style={[
              styles.projectCard,
              {
                width: CARD_WIDTH,
                height: CARD_HEIGHT,
                backgroundColor: colors.surface,
              },
            ]}
            onPress={() => handleOpenProject(item)}
            activeOpacity={0.9}
          >
            {/* Thumbnail */}
            <View style={styles.thumbnailContainer}>
              {item.thumbnail ? (
                <ThumbnailImage
                  uri={item.thumbnail}
                  style={styles.thumbnail}
                  placeholderStyle={[
                    styles.thumbnailPlaceholder,
                    { backgroundColor: colors.border },
                  ]}
                  placeholderText={t('home.noPreview')}
                  placeholderTextStyle={[
                    styles.placeholderText,
                    { color: colors.textSecondary },
                  ]}
                />
              ) : (
                <View
                  style={[
                    styles.thumbnailPlaceholder,
                    { backgroundColor: colors.border },
                  ]}
                >
                  <Text
                    style={[
                      styles.placeholderText,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {t('home.noPreview')}
                  </Text>
                </View>
              )}
              {/* Delete button */}
              <View style={styles.deleteButtonContainer}>
                <IconButton
                  icon={
                    <FeatherIcon name="trash-2" size={18} color="#FFFFFF" />
                  }
                  onPress={() => handleDeleteProject(item.id)}
                  size={32}
                  variant="filled"
                  style={{ backgroundColor: colors.error }}
                />
              </View>
            </View>

            {/* Info */}
            <View style={styles.projectInfo}>
              <Text
                style={[styles.projectTitle, { color: colors.text }]}
                numberOfLines={1}
              >
                {item.title}
              </Text>
              <Text
                style={[styles.projectMeta, { color: colors.textSecondary }]}
              >
                {t('home.projectCount', { count: item.photos.length })} • {formattedDate}
              </Text>
            </View>
          </TouchableOpacity>
        </ContextMenu>
      );
    },
    [
      colors,
      folders,
      handleOpenProject,
      handleDeleteProject,
      handleRenameProject,
      handleDuplicateProject,
      handleMoveToFolder,
      handleArchiveProject,
      buildContextMenuActions,
    ],
  );

  const renderFolderHeader = useCallback(
    (folder: Folder, projectCount: number) => {
      const isExpanded = expandedFolders.has(folder.id);
      const isRoot = folder.id === 'root';

      const folderContextActions = isRoot
        ? []
        : [
            { title: t('home.contextMenu.rename'), systemIcon: 'pencil' },
            { title: t('home.contextMenu.delete'), systemIcon: 'trash', destructive: true },
          ];

      const handleFolderContextAction = (actionTitle: string) => {
        haptics.medium();
        switch (actionTitle) {
          case t('home.contextMenu.rename'):
            handleRenameFolder(folder);
            break;
          case t('home.contextMenu.delete'):
            handleDeleteFolder(folder.id);
            break;
        }
      };

      const headerContent = (
        <TouchableOpacity
          style={[styles.folderHeader, { backgroundColor: colors.background }]}
          onPress={() => toggleFolder(folder.id)}
          activeOpacity={0.7}
        >
          <View style={styles.folderHeaderLeft}>
            <FeatherIcon
              name={isExpanded ? 'chevron-down' : 'chevron-right'}
              size={20}
              color={colors.textSecondary}
            />
            <FeatherIcon
              name={isRoot ? 'home' : 'folder'}
              size={20}
              color={colors.primary}
              style={styles.folderIcon}
            />
            <Text style={[styles.folderName, { color: colors.text }]}>
              {isRoot ? t('home.allProjects') : folder.name}
            </Text>
            <Text style={[styles.folderCount, { color: colors.textSecondary }]}>
              ({projectCount})
            </Text>
          </View>
        </TouchableOpacity>
      );

      if (isRoot || folderContextActions.length === 0) {
        return headerContent;
      }

      return (
        <ContextMenu
          actions={folderContextActions}
          onPress={e => handleFolderContextAction(e.nativeEvent.name)}
          previewBackgroundColor={colors.surface}
        >
          {headerContent}
        </ContextMenu>
      );
    },
    [
      colors,
      expandedFolders,
      toggleFolder,
      handleRenameFolder,
      handleDeleteFolder,
    ],
  );

  const renderFolderProjects = useCallback(
    (folder: Folder) => {
      const folderProjects = getProjectsInFolder(folder.id);
      const isExpanded = expandedFolders.has(folder.id);

      if (folderProjects.length === 0) {
        return null;
      }

      // Create rows of 2 projects each
      const rows: Project[][] = [];
      for (let i = 0; i < folderProjects.length; i += 2) {
        rows.push(folderProjects.slice(i, i + 2));
      }

      return (
        <AnimatedCollapsible expanded={isExpanded}>
          <View style={styles.folderProjectsContainer}>
            {rows.map((row, rowIndex) => (
              <View key={rowIndex} style={styles.projectRow}>
                {row.map(project => renderProject(project))}
                {row.length === 1 && <View style={{ width: CARD_WIDTH }} />}
              </View>
            ))}
          </View>
        </AnimatedCollapsible>
      );
    },
    [getProjectsInFolder, expandedFolders, renderProject],
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>
        {t('home.emptyStateTitle')}
      </Text>
      <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
        {t('home.emptyStateSubtitle')}
      </Text>
      <Button
        title={t('home.getStartedButton')}
        onPress={handleCreateNew}
        variant="primary"
        style={styles.emptyButton}
      />
    </View>
  );

  // Sort folders: root first, then alphabetically
  const sortedFolders = [...folders].sort((a, b) => {
    if (a.id === 'root') return -1;
    if (b.id === 'root') return 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {t('home.title')}
          </Text>
        </View>
        <View style={styles.headerRight}>
          <IconButton
            icon={
              <FeatherIcon name="folder-plus" size={24} color={colors.text} />
            }
            onPress={handleCreateFolder}
            size={44}
          />
          <IconButton
            icon={<FeatherIcon name="settings" size={24} color={colors.text} />}
            onPress={handleOpenSettings}
            size={44}
          />
        </View>
      </View>

      {/* Folders and Projects */}
      {projects.length === 0 ? (
        renderEmpty()
      ) : (
        <FlatList
          data={sortedFolders}
          keyExtractor={item => item.id}
          renderItem={({ item: folder }) => {
            const folderProjects = getProjectsInFolder(folder.id);
            return (
              <View>
                {renderFolderHeader(folder, folderProjects.length)}
                {renderFolderProjects(folder)}
              </View>
            );
          }}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* FAB */}
      {projects.length > 0 && (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: colors.primary }, SHADOWS.lg]}
          onPress={handleCreateNew}
          activeOpacity={0.8}
        >
          <FeatherIcon name="plus" size={28} color="#FFFFFF" />
        </TouchableOpacity>
      )}

      {/* Input Modal */}
      <InputModal
        visible={modalState.visible}
        title={modalState.title}
        message={modalState.message}
        initialValue={modalState.initialValue}
        confirmText={modalState.confirmText}
        onConfirm={handleModalConfirm}
        onCancel={handleModalCancel}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
  },
  headerTitle: {
    ...TYPOGRAPHY.h2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  listContainer: {
    paddingBottom: 100,
  },
  folderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  folderHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  folderIcon: {
    marginLeft: SPACING.xs,
    marginRight: SPACING.sm,
  },
  folderName: {
    ...TYPOGRAPHY.body1,
    fontWeight: '600',
  },
  folderCount: {
    ...TYPOGRAPHY.body2,
    marginLeft: SPACING.xs,
  },
  folderProjectsContainer: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
  },
  projectRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  projectCard: {
    overflow: 'hidden',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  thumbnailContainer: {
    flex: 1,
    position: 'relative',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  thumbnailPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  placeholderText: {
    ...TYPOGRAPHY.caption,
  },
  deleteButtonContainer: {
    position: 'absolute',
    top: SPACING.xs,
    right: SPACING.xs,
  },
  projectInfo: {
    padding: SPACING.sm,
  },
  projectTitle: {
    ...TYPOGRAPHY.body1,
    fontWeight: '600',
    marginBottom: 4,
  },
  projectMeta: {
    ...TYPOGRAPHY.caption,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    marginTop: 100,
  },
  emptyTitle: {
    ...TYPOGRAPHY.h2,
    marginBottom: SPACING.sm,
  },
  emptySubtitle: {
    ...TYPOGRAPHY.body1,
    textAlign: 'center',
    marginBottom: SPACING.xl,
  },
  emptyButton: {
    minWidth: 200,
  },
  fab: {
    position: 'absolute',
    bottom: SPACING.xl,
    right: SPACING.md,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default HomeScreen;
