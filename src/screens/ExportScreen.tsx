import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/navigationTypes';
import useProjectStore from '../store/projectStore';
import { useThemeStore } from '../store/themeStore';
import { usePurchaseStore } from '../store/purchaseStore';
import { Button, Card, LoadingSpinner } from '../components/common';
import { haptics } from '../utils/hapticFeedback';
import { sounds } from '../utils/soundEffects';
import { videoEncoder } from '../utils/videoEncoder';
import { gifGenerator } from '../utils/gifGenerator';
import { ExportQuality, ResolutionPreset } from '../types/project.types';
import { PremiumFeature } from '../types/purchase.types';
import { SPACING, RADII, TYPOGRAPHY } from '../constants/theme';
import RNFS from 'react-native-fs';

type ExportScreenRouteProp = RouteProp<RootStackParamList, 'Export'>;
type ExportScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Export'>;

type ExportFormat = 'video' | 'gif';

const ExportScreen: React.FC = () => {
  const navigation = useNavigation<ExportScreenNavigationProp>();
  const route = useRoute<ExportScreenRouteProp>();
  const { projectId } = route.params;

  const { colors } = useThemeStore();
  const { getProjectById } = useProjectStore();
  const { purchaseState, hasFeature } = usePurchaseStore();

  const project = getProjectById(projectId);

  const [format, setFormat] = useState<ExportFormat>('video');
  const [quality, setQuality] = useState<ExportQuality>(ExportQuality.MEDIUM);
  const [resolution, setResolution] = useState<ResolutionPreset>(ResolutionPreset.LANDSCAPE);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  const handleFormatSelect = (selectedFormat: ExportFormat) => {
    haptics.selection();
    setFormat(selectedFormat);
  };

  const handleQualitySelect = (selectedQuality: ExportQuality) => {
    if (selectedQuality === ExportQuality.HIGH && !hasFeature(PremiumFeature.EXPORT_4K)) {
      navigation.navigate('Paywall');
      return;
    }
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
    sounds.tap();
    setIsExporting(true);
    setExportProgress(0);

    try {
      const timestamp = Date.now();
      const filename = `memento_${timestamp}.${format === 'video' ? 'mp4' : 'gif'}`;
      const outputPath = `${RNFS.DocumentDirectoryPath}/${filename}`;

      if (format === 'video') {
        const result = await videoEncoder.encodeVideo({
          project,
          outputPath,
          quality,
          resolution,
          includeWatermark: !hasFeature(PremiumFeature.NO_WATERMARK),
          onProgress: (progress) => {
            setExportProgress(progress);
          },
        });

        if (result.success) {
          sounds.exportComplete();
          haptics.success();
          Alert.alert('Export Complete', 'Your video has been saved successfully!', [
            { text: 'OK', onPress: () => navigation.goBack() },
          ]);
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
          onProgress: (progress) => {
            setExportProgress(progress);
          },
        });

        if (result.success) {
          sounds.exportComplete();
          haptics.success();
          Alert.alert(
            'Export Complete',
            `GIF saved (${gifGenerator.formatFileSize(result.fileSize || 0)})`,
            [{ text: 'OK', onPress: () => navigation.goBack() }]
          );
        } else {
          throw new Error(result.error || 'GIF creation failed');
        }
      }
    } catch (error) {
      sounds.error();
      haptics.error();
      Alert.alert('Export Failed', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  const handleClose = () => {
    if (isExporting) {
      Alert.alert('Cancel Export?', 'Are you sure you want to cancel the export?', [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          style: 'destructive',
          onPress: () => {
            videoEncoder.cancelEncoding();
            navigation.goBack();
          },
        },
      ]);
    } else {
      navigation.goBack();
    }
  };

  if (!project) {
    return null;
  }

  const duration = videoEncoder.calculateDuration(project);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleClose} disabled={isExporting}>
          <Text style={[styles.closeButton, { color: colors.text }]}>×</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Export</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Project info */}
        <View style={styles.projectInfo}>
          <Text style={[styles.projectTitle, { color: colors.text }]}>{project.title}</Text>
          <Text style={[styles.projectMeta, { color: colors.textSecondary }]}>
            {project.photos.length} photos • {duration}s
          </Text>
        </View>

        {/* Format selection */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Format</Text>
          <View style={styles.optionRow}>
            <OptionCard
              title="Video (MP4)"
              subtitle="High quality"
              selected={format === 'video'}
              onPress={() => handleFormatSelect('video')}
            />
            <OptionCard
              title="GIF"
              subtitle="Animated"
              selected={format === 'gif'}
              onPress={() => handleFormatSelect('gif')}
            />
          </View>
        </View>

        {/* Quality selection */}
        {format === 'video' && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Quality</Text>
            <View style={styles.optionRow}>
              <OptionCard
                title="HD"
                subtitle="720p"
                selected={quality === ExportQuality.LOW}
                onPress={() => handleQualitySelect(ExportQuality.LOW)}
              />
              <OptionCard
                title="Full HD"
                subtitle="1080p"
                selected={quality === ExportQuality.MEDIUM}
                onPress={() => handleQualitySelect(ExportQuality.MEDIUM)}
              />
              <OptionCard
                title="4K"
                subtitle="Ultra HD"
                selected={quality === ExportQuality.HIGH}
                onPress={() => handleQualitySelect(ExportQuality.HIGH)}
                locked={!hasFeature(PremiumFeature.EXPORT_4K)}
              />
            </View>
          </View>
        )}

        {/* Resolution selection */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Aspect Ratio</Text>
          <View style={styles.optionRow}>
            <OptionCard
              title="Square"
              subtitle="1:1"
              selected={resolution === ResolutionPreset.SQUARE}
              onPress={() => handleResolutionSelect(ResolutionPreset.SQUARE)}
            />
            <OptionCard
              title="Portrait"
              subtitle="9:16"
              selected={resolution === ResolutionPreset.PORTRAIT}
              onPress={() => handleResolutionSelect(ResolutionPreset.PORTRAIT)}
            />
          </View>
          <View style={styles.optionRow}>
            <OptionCard
              title="Landscape"
              subtitle="16:9"
              selected={resolution === ResolutionPreset.LANDSCAPE}
              onPress={() => handleResolutionSelect(ResolutionPreset.LANDSCAPE)}
            />
            <OptionCard
              title="Cinema"
              subtitle="21:9"
              selected={resolution === ResolutionPreset.CINEMA}
              onPress={() => handleResolutionSelect(ResolutionPreset.CINEMA)}
            />
          </View>
        </View>
      </ScrollView>

      {/* Export button */}
      <View style={[styles.footer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        {isExporting ? (
          <View style={styles.exportingContainer}>
            <LoadingSpinner size={40} />
            <Text style={[styles.exportingText, { color: colors.text }]}>
              Exporting... {Math.round(exportProgress)}%
            </Text>
          </View>
        ) : (
          <Button title="Export Now" onPress={handleExport} variant="primary" fullWidth />
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
  locked?: boolean;
}

const OptionCard: React.FC<OptionCardProps> = ({ title, subtitle, selected, onPress, locked }) => {
  const { colors } = useThemeStore();

  return (
    <Card
      style={[
        styles.optionCard,
        { borderColor: selected ? colors.primary : colors.border, borderWidth: 2 },
      ]}
      onPress={onPress}
    >
      <Text style={[styles.optionTitle, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.optionSubtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
      {locked && (
        <View style={styles.lockBadge}>
          <Text style={styles.lockIcon}>🔒</Text>
        </View>
      )}
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
  lockBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  lockIcon: {
    fontSize: 16,
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
