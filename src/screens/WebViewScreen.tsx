import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/navigationTypes';
import { useThemeStore } from '../store/themeStore';
import { haptics } from '../utils/hapticFeedback';
import { SPACING, TYPOGRAPHY } from '../constants/theme';

type WebViewScreenRouteProp = RouteProp<RootStackParamList, 'WebView'>;
type WebViewScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'WebView'
>;

const WebViewScreen: React.FC = () => {
  const navigation = useNavigation<WebViewScreenNavigationProp>();
  const route = useRoute<WebViewScreenRouteProp>();
  const { url, title } = route.params;
  const { colors } = useThemeStore();

  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const webViewRef = useRef<WebView>(null);

  const handleClose = () => {
    haptics.light();
    navigation.goBack();
  };

  const handleLoadStart = () => {
    setIsLoading(true);
    setHasError(false);
  };

  const handleLoadEnd = () => {
    setIsLoading(false);
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  const handleRetry = () => {
    haptics.light();
    setHasError(false);
    webViewRef.current?.reload();
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
          <Text style={[styles.closeButtonText, { color: colors.text }]}>×</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
          {title}
        </Text>
        <View style={{ width: 44 }} />
      </View>

      {/* WebView */}
      <View style={styles.webViewContainer}>
        <WebView
          ref={webViewRef}
          source={{ uri: url }}
          onLoadStart={handleLoadStart}
          onLoadEnd={handleLoadEnd}
          onError={handleError}
          style={[styles.webView, { backgroundColor: colors.background }]}
          startInLoadingState={true}
          renderLoading={() => null}
        />

        {/* Loading Indicator */}
        {isLoading && !hasError && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        )}

        {/* Error State */}
        {hasError && (
          <View style={[styles.errorContainer, { backgroundColor: colors.background }]}>
            <Text style={[styles.errorTitle, { color: colors.text }]}>
              Failed to Load
            </Text>
            <Text style={[styles.errorMessage, { color: colors.textSecondary }]}>
              Unable to load the content. Please check your internet connection.
            </Text>
            <TouchableOpacity
              style={[styles.retryButton, { backgroundColor: colors.primary }]}
              onPress={handleRetry}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
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
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
  },
  closeButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  closeButtonText: {
    fontSize: 36,
    fontWeight: '300',
  },
  headerTitle: {
    ...TYPOGRAPHY.h3,
    flex: 1,
    textAlign: 'center',
  },
  webViewContainer: {
    flex: 1,
    position: 'relative',
  },
  webView: {
    flex: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  errorTitle: {
    ...TYPOGRAPHY.h3,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  errorMessage: {
    ...TYPOGRAPHY.body1,
    textAlign: 'center',
    marginBottom: SPACING.xl,
  },
  retryButton: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    borderRadius: 8,
  },
  retryButtonText: {
    ...TYPOGRAPHY.body1,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});

export default WebViewScreen;
