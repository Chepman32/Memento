import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/navigationTypes';
import useProjectStore from '../store/projectStore';
import { useThemeStore } from '../store/themeStore';
import { Button, Card, LoadingSpinner } from '../components/common';
import { haptics } from '../utils/hapticFeedback';
import { videoEncoder } from '../utils/videoEncoder';
import { gifGenerator } from '../utils/gifGenerator';
import { photoLibrary } from '../utils/photoLibrary';
import { isFFmpegAvailable } from '../utils/ffmpegBridge';
import { ExportQuality, ResolutionPreset } from '../types/project.types';
import { SPACING, RADII, TYPOGRAPHY } from '../constants/theme';
import RNFS from 'react-native-fs';

type ExportScreenRouteProp = RouteProp<RootStackParamList, 'Export'>;
type ExportScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'Export'
>;

type ExportFormat = 'video' | 'gif';

const ExportScreen: React.FC = () => {
  const navigation = useNavigation<ExportScreenNavigationProp>();
  const route = useRoute<ExportScreenRouteProp>();
  const { projectId } = route.params;
  const { t } = useTranslation();

  const { colors } = useThemeStore();
  const { getProjectById } = useProjectStore();

  const project = getProjectById(projectId);

  const [format, setFormat] = useState<ExportFormat>('video');
  const [quality, setQuality] = useState<ExportQuality>(ExportQuality.MEDIUM);
  const [resolution, setResolution] = useState<ResolutionPreset>(
    ResolutionPreset.LANDSCAPE,
  );
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [ffmpegAvailable, setFfmpegAvailable] = useState(true);

  useEffect(() => {
    const availability = isFFmpegAvailable();
    setFfmpegAvailable(availability.available);

    if (!availability.available) {
      Alert.alert(
        t('export.ffmpegUnavailable'),
        t('export.ffmpegUnavailableMessage'),
        [
          {
            text: t('common.ok'),
            onPress: () => navigation.goBack(),
          },
        ],
      );
    }
  }, [t, navigation]);

  const handleFormatSelect = (selectedFormat: ExportFormat) => {
    haptics.selection();
    setFormat(selectedFormat);
  };

  const handleQualitySelect = (selectedQuality: ExportQuality) => {
    haptics.selection();
    setQuality(selectedQuality);
  };

  const handleResolutionSelect = (selectedResolution: ResolutionPreset) => {
    haptics.selection();
    setResolution(selectedResolution);
  };

  const handleExport = async () => {
    if (!project) return;

    haptics.medium();
    setIsExporting(true);
    setExportProgress(0);

    try {
      // Use TemporaryDirectoryPath for FFmpeg output
      const outputDir = RNFS.TemporaryDirectoryPath;

      const timestamp = Date.now();
      const filename = `slidemint_${timestamp}.${
        format === 'video' ? 'mp4' : 'gif'
      }`;
      const outputPath = `${outputDir}${filename}`;

      if (format === 'video') {
        const result = await videoEncoder.encodeVideo({
          project,
          outputPath,
          quality,
          resolution,
          includeWatermark: false, // App is free - no watermark
          onProgress: progress => {
            setExportProgress(progress);
          },
        });

        if (result.success) {
          // Save to photo library
          try {
            await photoLibrary.saveToPhotoLibrary(outputPath);
            haptics.success();

            Alert.alert(
              t('export.exportComplete'),
              t('export.videoSaved'),
              [
                {
                  text: t('common.ok'),
                  onPress: () => navigation.goBack(),
                },
                {
                  text: t('export.showInGallery'),
                  onPress: async () => {
                    try {
                      await photoLibrary.openPhotosApp();
                      navigation.goBack();
                    } catch (error) {
                      console.error('Failed to open Photos app:', error);
                      navigation.goBack();
                    }
                  },
                },
              ],
            );
          } catch (saveError) {
            console.error('Failed to save to photo library:', saveError);
            Alert.alert(
              t('export.exportComplete'),
              t('export.videoSaveError'),
              [{ text: t('common.ok'), onPress: () => navigation.goBack() }],
            );
          }
        } else {
          throw new Error(result.error || 'Export failed');
        }
      } else {
        const result = await gifGenerator.createGif({
          project,
          outputPath,
          width: 480,
          height: 480,
          fps: 10,
          colors: 256,
          optimize: true,
          includeWatermark: false, // App is free - no watermark
          onProgress: progress => {
            setExportProgress(progress);
          },
        });

        if (result.success) {
          // Save to photo library
          try {
            await photoLibrary.saveToPhotoLibrary(outputPath);
            haptics.success();

            Alert.alert(
              t('export.exportComplete'),
              t('export.gifSaved', { size: gifGenerator.formatFileSize(result.fileSize || 0) }),
              [
                {
                  text: t('common.ok'),
                  onPress: () => navigation.goBack(),
                },
                {
                  text: t('export.showInGallery'),
                  onPress: async () => {
                    try {
                      await photoLibrary.openPhotosApp();
                      navigation.goBack();
                    } catch (error) {
                      console.error('Failed to open Photos app:', error);
                      navigation.goBack();
                    }
                  },
                },
              ],
            );
          } catch (saveError) {
            console.error('Failed to save to photo library:', saveError);
            Alert.alert(
              t('export.exportComplete'),
              t('export.gifSaveError', { size: gifGenerator.formatFileSize(result.fileSize || 0) }),
              [{ text: t('common.ok'), onPress: () => navigation.goBack() }],
            );
          }
        } else {
          throw new Error(result.error || 'GIF creation failed');
        }
      }
    } catch (error) {
      haptics.error();
      Alert.alert(
        t('export.error'),
        error instanceof Error ? error.message : t('errors.generic'),
      );
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  const handleClose = () => {
    if (isExporting) {
      Alert.alert(
        t('export.cancelExport'),
        t('export.cancelExportMessage'),
        [
          { text: t('common.no'), style: 'cancel' },
          {
            text: t('common.yes'),
            style: 'destructive',
            onPress: () => {
              videoEncoder.cancelEncoding();
              navigation.goBack();
            },
          },
        ],
      );
    } else {
      navigation.goBack();
    }
  };

  if (!project) {
    return null;
  }

  const duration = videoEncoder.calculateDuration(project);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleClose} disabled={isExporting}>
          <Text style={[styles.closeButton, { color: colors.text }]}>×</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('export.title')}</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Project info */}
        <View style={styles.projectInfo}>
          <Text style={[styles.projectTitle, { color: colors.text }]}>
            {project.title}
          </Text>
          <Text style={[styles.projectMeta, { color: colors.textSecondary }]}>
            {t('export.projectMeta', { count: project.photos.length, duration })}
          </Text>
        </View>

        {/* Format selection */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {t('export.format')}
          </Text>
          <View style={styles.optionRow}>
            <OptionCard
              title={t('export.formats.video')}
              subtitle={t('export.formats.videoSubtitle')}
              selected={format === 'video'}
              onPress={() => handleFormatSelect('video')}
            />
            <OptionCard
              title={t('export.formats.gif')}
              subtitle={t('export.formats.gifSubtitle')}
              selected={format === 'gif'}
              onPress={() => handleFormatSelect('gif')}
            />
          </View>
        </View>

        {/* Quality selection */}
        {format === 'video' && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {t('export.quality')}
            </Text>
            <View style={styles.optionRow}>
              <OptionCard
                title={t('export.qualities.720p')}
                subtitle={t('export.qualities.720pSubtitle')}
                selected={quality === ExportQuality.LOW}
                onPress={() => handleQualitySelect(ExportQuality.LOW)}
              />
              <OptionCard
                title={t('export.qualities.1080p')}
                subtitle={t('export.qualities.1080pSubtitle')}
                selected={quality === ExportQuality.MEDIUM}
                onPress={() => handleQualitySelect(ExportQuality.MEDIUM)}
              />
              <OptionCard
                title={t('export.qualities.4K')}
                subtitle={t('export.qualities.4KSubtitle')}
                selected={quality === ExportQuality.HIGH}
                onPress={() => handleQualitySelect(ExportQuality.HIGH)}
              />
            </View>
          </View>
        )}

        {/* Resolution selection */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {t('export.aspectRatio')}
          </Text>
          <View style={styles.optionRow}>
            <OptionCard
              title={t('export.resolutions.1:1')}
              subtitle={t('export.resolutions.1:1Subtitle')}
              selected={resolution === ResolutionPreset.SQUARE}
              onPress={() => handleResolutionSelect(ResolutionPreset.SQUARE)}
            />
            <OptionCard
              title={t('export.resolutions.9:16')}
              subtitle={t('export.resolutions.9:16Subtitle')}
              selected={resolution === ResolutionPreset.PORTRAIT}
              onPress={() => handleResolutionSelect(ResolutionPreset.PORTRAIT)}
            />
          </View>
          <View style={styles.optionRow}>
            <OptionCard
              title={t('export.resolutions.16:9')}
              subtitle={t('export.resolutions.16:9Subtitle')}
              selected={resolution === ResolutionPreset.LANDSCAPE}
              onPress={() => handleResolutionSelect(ResolutionPreset.LANDSCAPE)}
            />
            <OptionCard
              title={t('export.resolutions.21:9')}
              subtitle={t('export.resolutions.21:9Subtitle')}
              selected={resolution === ResolutionPreset.CINEMA}
              onPress={() => handleResolutionSelect(ResolutionPreset.CINEMA)}
            />
          </View>
        </View>
      </ScrollView>

      {/* Export button */}
      <View
        style={[
          styles.footer,
          { backgroundColor: colors.surface, borderTopColor: colors.border },
        ]}
      >
        {isExporting ? (
          <View style={styles.exportingContainer}>
            <LoadingSpinner size={40} />
            <Text style={[styles.exportingText, { color: colors.text }]}>
              {t('export.exportingProgress', { percent: Math.round(exportProgress) })}
            </Text>
          </View>
        ) : (
          <Button
            title={t('export.exportNow')}
            onPress={handleExport}
            variant="primary"
            fullWidth
            disabled={!ffmpegAvailable}
          />
        )}
      </View>
    </SafeAreaView>
  );
};

// Option Card Component
interface OptionCardProps {
  title: string;
  subtitle: string;
  selected: boolean;
  onPress: () => void;
}

const OptionCard: React.FC<OptionCardProps> = ({
  title,
  subtitle,
  selected,
  onPress,
}) => {
  const { colors } = useThemeStore();

  return (
    <Card
      style={[
        styles.optionCard,
        {
          borderColor: selected ? colors.primary : colors.border,
          borderWidth: 2,
        },
      ]}
      onPress={onPress}
    >
      <Text style={[styles.optionTitle, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.optionSubtitle, { color: colors.textSecondary }]}>
        {subtitle}
      </Text>
    </Card>
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
    paddingVertical: SPACING.sm,
  },
  closeButton: {
    fontSize: 36,
    fontWeight: '300',
  },
  headerTitle: {
    ...TYPOGRAPHY.h3,
  },
  content: {
    padding: SPACING.md,
  },
  projectInfo: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  projectTitle: {
    ...TYPOGRAPHY.h3,
    marginBottom: 4,
  },
  projectMeta: {
    ...TYPOGRAPHY.body2,
  },
  section: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    ...TYPOGRAPHY.h4,
    marginBottom: SPACING.md,
  },
  optionRow: {
    flexDirection: 'row',
    marginBottom: SPACING.sm,
  },
  optionCard: {
    flex: 1,
    marginHorizontal: SPACING.xs,
    padding: SPACING.md,
    alignItems: 'center',
    position: 'relative',
  },
  optionTitle: {
    ...TYPOGRAPHY.body1,
    fontWeight: '600',
    marginBottom: 4,
  },
  optionSubtitle: {
    ...TYPOGRAPHY.caption,
  },
  footer: {
    padding: SPACING.md,
    borderTopWidth: 1,
  },
  exportingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
  },
  exportingText: {
    ...TYPOGRAPHY.body1,
    marginLeft: SPACING.md,
  },
});

export default ExportScreen;
