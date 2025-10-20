import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/navigationTypes';
import useProjectStore from '../store/projectStore';
import { useThemeStore } from '../store/themeStore';
import { usePurchaseStore } from '../store/purchaseStore';
import { Button, IconButton, Card } from '../components/common';
import { haptics } from '../utils/hapticFeedback';
import { sounds } from '../utils/soundEffects';
import { SPACING, RADII, TYPOGRAPHY, SHADOWS, SCREEN_WIDTH } from '../constants/theme';
import { Project } from '../types/project.types';

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

const CARD_WIDTH = (SCREEN_WIDTH - SPACING.md * 3) / 2;
const CARD_HEIGHT = CARD_WIDTH * 1.4;

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const { colors } = useThemeStore();
  const { projects, deleteProject, setCurrentProject } = useProjectStore();
  const { purchaseState } = usePurchaseStore();

  const handleCreateNew = useCallback(() => {
    haptics.medium();
    sounds.tap();
    navigation.navigate('ImageSelection');
  }, [navigation]);

  const handleOpenProject = useCallback(
    (project: Project) => {
      haptics.light();
      sounds.tap();
      setCurrentProject(project.id);
      navigation.navigate('Editor', { photos: [] });
    },
    [navigation, setCurrentProject]
  );

  const handleDeleteProject = useCallback(
    (projectId: string) => {
      haptics.medium();
      deleteProject(projectId);
    },
    [deleteProject]
  );

  const handleOpenSettings = useCallback(() => {
    haptics.light();
    sounds.tap();
    navigation.navigate('Settings');
  }, [navigation]);

  const renderProject = useCallback(
    ({ item }: { item: Project }) => {
      const formattedDate = new Date(item.updatedAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });

      return (
        <Card
          style={[styles.projectCard, { width: CARD_WIDTH, height: CARD_HEIGHT }]}
          onPress={() => handleOpenProject(item)}
          padding={false}
        >
          {/* Thumbnail */}
          <View style={styles.thumbnailContainer}>
            {item.thumbnail ? (
              <Image source={{ uri: item.thumbnail }} style={styles.thumbnail} resizeMode="cover" />
            ) : (
              <View style={[styles.thumbnailPlaceholder, { backgroundColor: colors.border }]}>
                <Text style={[styles.placeholderText, { color: colors.textSecondary }]}>
                  No Preview
                </Text>
              </View>
            )}
            {/* Delete button */}
            <View style={styles.deleteButtonContainer}>
              <IconButton
                icon={<Text style={styles.deleteIcon}>🗑️</Text>}
                onPress={() => handleDeleteProject(item.id)}
                size={32}
                variant="filled"
                style={{ backgroundColor: colors.error }}
              />
            </View>
          </View>

          {/* Info */}
          <View style={styles.projectInfo}>
            <Text style={[styles.projectTitle, { color: colors.text }]} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={[styles.projectMeta, { color: colors.textSecondary }]}>
              {item.photos.length} photos • {formattedDate}
            </Text>
          </View>
        </Card>
      );
    },
    [colors, handleOpenProject, handleDeleteProject]
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>No Projects Yet</Text>
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
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Memento</Text>
          {purchaseState.isPremium && (
            <Text style={[styles.premiumBadge, { color: colors.primary }]}>⭐ Premium</Text>
          )}
        </View>
        <IconButton
          icon={<Text style={styles.settingsIcon}>⚙️</Text>}
          onPress={handleOpenSettings}
          size={44}
        />
      </View>

      {/* Projects grid */}
      <FlatList
        data={projects}
        renderItem={renderProject}
        keyExtractor={(item) => item.id}
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
          <Text style={styles.fabIcon}>+</Text>
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
  premiumBadge: {
    ...TYPOGRAPHY.caption,
    fontWeight: '600',
    marginTop: 4,
  },
  settingsIcon: {
    fontSize: 24,
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
  },
  thumbnailContainer: {
    flex: 1,
    position: 'relative',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  thumbnailPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    ...TYPOGRAPHY.caption,
  },
  deleteButtonContainer: {
    position: 'absolute',
    top: SPACING.xs,
    right: SPACING.xs,
  },
  deleteIcon: {
    fontSize: 16,
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
  fabIcon: {
    fontSize: 32,
    color: '#FFFFFF',
    fontWeight: '300',
  },
});

export default HomeScreen;
