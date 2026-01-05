import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  SafeAreaView,
  Alert,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import FeatherIcon from 'react-native-vector-icons/Feather';
import ContextMenu from 'react-native-context-menu-view';
import { RootStackParamList } from '../navigation/navigationTypes';
import useProjectStore from '../store/projectStore';
import { useThemeStore } from '../store/themeStore';
import { Button, IconButton } from '../components/common';
import { haptics } from '../utils/hapticFeedback';
import { sounds } from '../utils/soundEffects';
import { SPACING, TYPOGRAPHY, SHADOWS, SCREEN_WIDTH } from '../constants/theme';
import { Project } from '../types/project.types';

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

const CARD_WIDTH = (SCREEN_WIDTH - SPACING.md * 3) / 2;
const CARD_HEIGHT = CARD_WIDTH * 1.4;

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const { colors } = useThemeStore();
  const {
    projects,
    deleteProject,
    setCurrentProject,
    updateProject,
    duplicateProject,
  } = useProjectStore();

  const handleCreateNew = useCallback(() => {
    haptics.medium();
    sounds.tap();
    setCurrentProject(null);
    navigation.navigate('ImageSelection', { autoOpenPicker: true });
  }, [navigation, setCurrentProject]);

  const handleOpenProject = useCallback(
    (project: Project) => {
      haptics.light();
      sounds.tap();
      setCurrentProject(project.id);
      navigation.navigate('Editor', { photos: [] });
    },
    [navigation, setCurrentProject],
  );

  const handleDeleteProject = useCallback(
    (projectId: string) => {
      Alert.alert(
        'Delete Project',
        'Are you sure you want to delete this project?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => {
              haptics.medium();
              deleteProject(projectId);
            },
          },
        ],
      );
    },
    [deleteProject],
  );

  const handleRenameProject = useCallback(
    (project: Project) => {
      if (Platform.OS !== 'ios') {
        Alert.alert(
          'Rename Project',
          'Renaming is available on iOS only right now.',
        );
        return;
      }

      Alert.prompt(
        'Rename Project',
        'Enter a new name',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Save',
            onPress: text => {
              if (text && text.trim()) {
                updateProject(project.id, { title: text.trim() });
              }
            },
          },
        ],
        'plain-text',
        project.title,
      );
    },
    [updateProject],
  );

  const handleDuplicateProject = useCallback(
    (projectId: string) => {
      duplicateProject(projectId);
      haptics.success();
    },
    [duplicateProject],
  );

  const handleOpenSettings = useCallback(() => {
    haptics.light();
    sounds.tap();
    navigation.navigate('Settings');
  }, [navigation]);

  const renderProject = useCallback(
    ({ item }: { item: Project }) => {
      const formattedDate = new Date(item.updatedAt).toLocaleDateString(
        'en-US',
        {
          month: 'short',
          day: 'numeric',
        },
      );

      const contextMenuActions = [
        {
          title: 'Rename',
          systemIcon: 'pencil',
        },
        {
          title: 'Duplicate',
          systemIcon: 'doc.on.doc',
        },
        {
          title: 'Delete',
          systemIcon: 'trash',
          destructive: true,
        },
      ];

      const handleContextMenuAction = (actionTitle: string) => {
        haptics.medium();
        switch (actionTitle) {
          case 'Rename':
            handleRenameProject(item);
            break;
          case 'Duplicate':
            handleDuplicateProject(item.id);
            break;
          case 'Delete':
            handleDeleteProject(item.id);
            break;
        }
      };

      return (
        <ContextMenu
          actions={contextMenuActions}
          onPress={e => handleContextMenuAction(e.nativeEvent.name)}
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
                <Image
                  source={{ uri: item.thumbnail }}
                  style={styles.thumbnail}
                  resizeMode="cover"
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
                    No Preview
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
                {item.photos.length} photos • {formattedDate}
              </Text>
            </View>
          </TouchableOpacity>
        </ContextMenu>
      );
    },
    [
      colors,
      handleOpenProject,
      handleDeleteProject,
      handleRenameProject,
      handleDuplicateProject,
    ],
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>
        No Projects Yet
      </Text>
      <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
        Create your first memory slideshow
      </Text>
      <Button
        title="Get Started"
        onPress={handleCreateNew}
        variant="primary"
        style={styles.emptyButton}
      />
    </View>
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            SlideMint
          </Text>
        </View>
        <IconButton
          icon={<FeatherIcon name="settings" size={24} color={colors.text} />}
          onPress={handleOpenSettings}
          size={44}
        />
      </View>

      {/* Projects grid */}
      <FlatList
        data={projects}
        renderItem={renderProject}
        keyExtractor={item => item.id}
        numColumns={2}
        contentContainerStyle={styles.projectsGrid}
        columnWrapperStyle={styles.columnWrapper}
        ListEmptyComponent={renderEmpty}
        showsVerticalScrollIndicator={false}
      />

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
  projectsGrid: {
    padding: SPACING.md,
    paddingBottom: 100,
  },
  columnWrapper: {
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
