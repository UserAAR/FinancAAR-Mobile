import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { generateFile, shareFile, ExportFormat, saveToDownloads } from '../utils/exporter';
import Toast from '../components/Toast';

export default function ReportsScreen() {
  const { theme } = useTheme();
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('csv');
  const [isGenerating, setIsGenerating] = useState(false);
  type ToastType = 'success' | 'error' | 'warning' | 'info';
  const [toastState, setToastState] = useState<{
    visible: boolean;
    type: ToastType;
    title: string;
    message: string;
  }>({
    visible: false,
    type: 'success',
    title: '',
    message: '',
  });

  const handleGenerate = async () => {
    try {
      setIsGenerating(true);
      const uri = await generateFile({
        types: ['transactions', 'debts', 'balances', 'categories'],
        format: selectedFormat,
      });

      // Try to copy the file to the Downloads folder (Android only)
      const savedPath = await saveToDownloads(uri);

      // Show toast for saved location
      setToastState({
        visible: true,
        type: 'success',
        title: 'Report Generated',
        message:
          savedPath && Platform.OS === 'android'
            ? `Saved to Downloads folder as ${savedPath.split('/').pop()}`
            : 'Report generated successfully.',
      });

      // Present share sheet so user can immediately share or save to preferred location
      await shareFile(uri);
    } catch (error: any) {
      setToastState({
        visible: true,
        type: 'error',
        title: 'Generation Failed',
        message: error?.message || 'Unable to generate report.',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const closeToast = () => {
    setToastState({ ...toastState, visible: false });
  };

  const formatOptions: { label: string; value: ExportFormat; icon: keyof typeof Ionicons.glyphMap }[] = [
    { label: 'CSV', value: 'csv', icon: 'document-text' },
    { label: 'Excel', value: 'xlsx', icon: 'logo-microsoft' },
    { label: 'PDF', value: 'pdf', icon: 'document' },
  ];

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
      padding: theme.spacing.lg,
    },
    title: {
      fontSize: 22,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: theme.spacing.lg,
    },
    optionRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: theme.spacing.lg,
    },
    optionButton: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: theme.spacing.md,
      marginHorizontal: theme.spacing.sm,
      borderRadius: theme.borderRadius.lg,
      borderWidth: 1.5,
    },
    generateButton: {
      backgroundColor: theme.colors.primary,
      paddingVertical: theme.spacing.md,
      borderRadius: theme.borderRadius.lg,
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'center',
    },
    generateButtonText: {
      color: 'white',
      fontSize: 18,
      fontWeight: '600',
      marginLeft: theme.spacing.sm,
    },
  });

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Financial Reports</Text>

        <Text style={{ color: theme.colors.textSecondary, marginBottom: theme.spacing.sm }}>
          Select format
        </Text>
        <View style={styles.optionRow}>
          {formatOptions.map(opt => {
            const isActive = selectedFormat === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.optionButton,
                  {
                    backgroundColor: isActive ? theme.colors.primary : theme.colors.surface,
                    borderColor: isActive ? theme.colors.primary : theme.colors.border,
                  },
                ]}
                onPress={() => setSelectedFormat(opt.value)}
              >
                <Ionicons
                  name={opt.icon}
                  size={24}
                  color={isActive ? 'white' : theme.colors.textSecondary}
                />
                <Text
                  style={{
                    color: isActive ? 'white' : theme.colors.textSecondary,
                    marginTop: theme.spacing.xs,
                    fontWeight: '600',
                  }}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          style={styles.generateButton}
          onPress={handleGenerate}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <ActivityIndicator color="white" />
          ) : (
            <Ionicons name="download" size={24} color="white" />
          )}
          <Text style={styles.generateButtonText}>
            {isGenerating ? 'Generating...' : 'Generate Report'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <Toast
        visible={toastState.visible}
        type={toastState.type}
        title={toastState.title}
        message={toastState.message}
        onDismiss={closeToast}
      />
    </View>
  );
} 