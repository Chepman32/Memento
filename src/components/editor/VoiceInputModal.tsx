import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Animated,
  TouchableWithoutFeedback,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import FeatherIcon from 'react-native-vector-icons/Feather';
import { useThemeStore } from '../../store/themeStore';
import { SPACING, TYPOGRAPHY, RADII } from '../../constants/theme';
import { haptics } from '../../utils/hapticFeedback';
import { sounds } from '../../utils/soundEffects';
import { speechRecognition } from '../../utils/speechRecognition';

interface VoiceInputModalProps {
  visible: boolean;
  slideNumber: number;
  initialText?: string;
  onConfirm: (text: string) => void;
  onCancel: () => void;
}

export const VoiceInputModal: React.FC<VoiceInputModalProps> = ({
  visible,
  slideNumber,
  initialText = '',
  onConfirm,
  onCancel,
}) => {
  const { t } = useTranslation();
  const { colors } = useThemeStore();

  const [text, setText] = useState(initialText);
  const [isRecording, setIsRecording] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionGranted, setPermissionGranted] = useState(false);

  const inputRef = useRef<TextInput>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible) {
      setText(initialText);
      setError(null);
      checkPermissions();

      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 100,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.9,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, initialText]);

  // Pulse animation for recording indicator
  useEffect(() => {
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.3,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isRecording]);

  const checkPermissions = async () => {
    try {
      const available = await speechRecognition.isAvailable();
      if (!available) {
        setError(t('editor.voiceInput.notAvailable'));
        return;
      }

      const permissions = await speechRecognition.requestPermissions();
      setPermissionGranted(permissions.speech && permissions.microphone);

      if (!permissions.speech || !permissions.microphone) {
        setError(t('editor.voiceInput.permissionDenied'));
      }
    } catch (err) {
      setError(t('editor.voiceInput.permissionError'));
    }
  };

  const handlePermissionError = () => {
    Alert.alert(
      t('editor.voiceInput.permissionRequired'),
      t('editor.voiceInput.permissionInstructions'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.openSettings'),
          onPress: () => {
            if (Platform.OS === 'ios') {
              Linking.openURL('app-settings:');
            } else {
              Linking.openSettings();
            }
          },
        },
      ]
    );
  };

  const handleStartRecording = async () => {
    if (!permissionGranted) {
      handlePermissionError();
      return;
    }

    setIsInitializing(true);
    setError(null);
    haptics.medium();

    try {
      // Set up event listeners
      speechRecognition.onResults((result) => {
        setText(result.text);
        if (result.isFinal) {
          handleStopRecording();
        }
      });

      speechRecognition.onError((errorMsg) => {
        setError(errorMsg);
        setIsRecording(false);
        setIsInitializing(false);
        haptics.error();
      });

      speechRecognition.onEnd(() => {
        setIsRecording(false);
        setIsInitializing(false);
      });

      // Start recording
      await speechRecognition.startRecording('en-US'); // TODO: Use user's locale
      setIsRecording(true);
      sounds.tap();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('editor.voiceInput.startError'));
      haptics.error();
    } finally {
      setIsInitializing(false);
    }
  };

  const handleStopRecording = async () => {
    try {
      await speechRecognition.stopRecording();
      setIsRecording(false);
      haptics.light();
      sounds.tap();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('editor.voiceInput.stopError'));
    }
  };

  const handleConfirm = () => {
    if (text.trim()) {
      haptics.success();
      sounds.success();
      onConfirm(text.trim());
      speechRecognition.cleanup();
    }
  };

  const handleCancel = () => {
    haptics.light();
    if (isRecording) {
      handleStopRecording();
    }
    setText(initialText);
    speechRecognition.cleanup();
    onCancel();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleCancel}
    >
      <TouchableWithoutFeedback onPress={handleCancel}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.container}
        >
          <Animated.View style={[styles.overlay, { opacity: fadeAnim }]} />
          <TouchableWithoutFeedback>
            <Animated.View
              style={[
                styles.modalContent,
                {
                  backgroundColor: colors.surface,
                  opacity: fadeAnim,
                  transform: [{ scale: scaleAnim }],
                },
              ]}
            >
              <Text style={[styles.title, { color: colors.text }]}>
                {t('editor.voiceInput.title')}
              </Text>

              <Text style={[styles.slideInfo, { color: colors.textSecondary }]}>
                {t('editor.voiceInput.slideNumber', { number: slideNumber + 1 })}
              </Text>

              {/* Recording Status */}
              <View style={styles.statusContainer}>
                {isRecording && (
                  <View style={styles.recordingIndicator}>
                    <Animated.View
                      style={[
                        styles.recordingDot,
                        { backgroundColor: colors.error, transform: [{ scale: pulseAnim }] },
                      ]}
                    />
                    <Text style={[styles.recordingText, { color: colors.error }]}>
                      {t('editor.voiceInput.recording')}
                    </Text>
                  </View>
                )}

                {error && (
                  <Text style={[styles.errorText, { color: colors.error }]}>
                    {error}
                  </Text>
                )}
              </View>

              {/* Text Input */}
              <TextInput
                ref={inputRef}
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.background,
                    color: colors.text,
                    borderColor: colors.border,
                  },
                ]}
                value={text}
                onChangeText={setText}
                placeholder={t('editor.voiceInput.placeholder')}
                placeholderTextColor={colors.textSecondary}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                autoCapitalize="sentences"
                autoCorrect
                selectionColor={colors.primary}
                editable={!isRecording}
              />

              {/* Microphone Button */}
              <TouchableOpacity
                style={[
                  styles.micButton,
                  {
                    backgroundColor: isRecording ? colors.error : colors.primary,
                  },
                  isInitializing && { opacity: 0.5 },
                ]}
                onPress={isRecording ? handleStopRecording : handleStartRecording}
                disabled={isInitializing || !permissionGranted}
                activeOpacity={0.8}
              >
                {isInitializing ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <FeatherIcon
                    name={isRecording ? 'mic-off' : 'mic'}
                    size={28}
                    color="#FFFFFF"
                  />
                )}
              </TouchableOpacity>

              <Text style={[styles.hint, { color: colors.textSecondary }]}>
                {isRecording
                  ? t('editor.voiceInput.recordingHint')
                  : t('editor.voiceInput.tapToRecord')}
              </Text>

              {/* Action Buttons */}
              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton]}
                  onPress={handleCancel}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>
                    {t('common.cancel')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.button,
                    styles.confirmButton,
                    { backgroundColor: colors.primary },
                    !text.trim() && { opacity: 0.5 },
                  ]}
                  onPress={handleConfirm}
                  activeOpacity={0.7}
                  disabled={!text.trim()}
                >
                  <Text style={styles.confirmButtonText}>
                    {t('common.save')}
                  </Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  modalContent: {
    width: '85%',
    maxWidth: 400,
    borderRadius: RADII.lg,
    padding: SPACING.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  title: {
    ...TYPOGRAPHY.h3,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  slideInfo: {
    ...TYPOGRAPHY.body2,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  statusContainer: {
    minHeight: 30,
    marginBottom: SPACING.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  recordingText: {
    ...TYPOGRAPHY.body2,
    fontWeight: '600',
  },
  errorText: {
    ...TYPOGRAPHY.caption,
    textAlign: 'center',
  },
  input: {
    minHeight: 100,
    maxHeight: 150,
    borderRadius: RADII.md,
    borderWidth: 1,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: 16,
    marginBottom: SPACING.md,
  },
  micButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: SPACING.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  hint: {
    ...TYPOGRAPHY.caption,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  button: {
    flex: 1,
    height: 48,
    borderRadius: RADII.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: 'transparent',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  confirmButton: {},
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
