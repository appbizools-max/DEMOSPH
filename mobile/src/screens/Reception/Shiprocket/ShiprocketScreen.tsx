import React, { useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Linking, ActivityIndicator
} from 'react-native';
import { WebView } from 'react-native-webview';
import Feather from 'react-native-vector-icons/Feather';

const SHIPROCKET_URL = 'https://app.shiprocket.in';

export const ShiprocketScreen: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const webViewRef = useRef<WebView>(null);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.iconContainer}>
            <Feather name="truck" size={20} color="#ffffff" />
          </View>
          <View>
            <Text style={styles.title}>Shiprocket</Text>
            <Text style={styles.subtitle}>Manage shipments & deliveries</Text>
          </View>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.reloadBtn}
            onPress={() => webViewRef.current?.reload()}
            activeOpacity={0.7}
          >
            <Feather name="refresh-cw" size={14} color="#475569" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.openBtn}
            onPress={() => Linking.openURL(SHIPROCKET_URL)}
            activeOpacity={0.7}
          >
            <Feather name="external-link" size={14} color="#ffffff" />
            <Text style={styles.openBtnText}>Open</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* WebView */}
      <View style={styles.webviewContainer}>
        {isLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#6366f1" />
            <Text style={styles.loadingText}>Loading Shiprocket...</Text>
          </View>
        )}
        <WebView
          ref={webViewRef}
          source={{ uri: SHIPROCKET_URL }}
          style={styles.webview}
          onLoadStart={() => setIsLoading(true)}
          onLoadEnd={() => setIsLoading(false)}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={false}
          scalesPageToFit={true}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 11.5,
    color: '#64748b',
    fontWeight: '500',
    marginTop: 1,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  reloadBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  openBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#6366f1',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  openBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  webviewContainer: {
    flex: 1,
    position: 'relative',
  },
  webview: {
    flex: 1,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
});
