import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { aiService } from '../utils/aiService';
import { database } from '../utils/database';
import { formatCurrency } from '../utils/currency';
import NetInfo from '@react-native-community/netinfo';
const { width } = Dimensions.get('window');

interface ChatMessage {
  id: string;
  type: 'user' | 'ai' | 'system';
  content: string;
  timestamp: Date;
}

interface AIAnalysisResponse {
  summary: string;
  insights: Array<{
    type: 'success' | 'warning' | 'alert' | 'info';
    title: string;
    description: string;
    recommendation?: string;
  }>;
  score: number;
  nextSteps: string[];
}

export default function AIAnalysisScreen({ navigation }: { navigation: any }) {
  const { theme } = useTheme();
  const scrollViewRef = useRef<ScrollView>(null);
  
  // Connection State
  const [isConnected, setIsConnected] = useState(true);
  const [isInternetReachable, setIsInternetReachable] = useState(true);
  
  // Analysis State
  const [analysis, setAnalysis] = useState<AIAnalysisResponse | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  
  // Chat State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isChatting, setIsChatting] = useState(false);

  useEffect(() => {
    checkConnectivityAndAnalyze();
    

    
    // Listen to network changes
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected ?? false);
      setIsInternetReachable(state.isInternetReachable ?? false);
    });
    
    return () => unsubscribe();
  }, []);

  const checkConnectivityAndAnalyze = async () => {
    try {
      const connectivity = await aiService.checkConnectivity();
      setIsConnected(connectivity.isConnected);
      setIsInternetReachable(connectivity.isInternetReachable);
      
      if (connectivity.isConnected && connectivity.isInternetReachable) {
        loadAIAnalysis();
      } else {
        setAnalysisError('CONNECTIVITY_ERROR');
      }
    } catch (error) {
      setAnalysisError('CONNECTIVITY_ERROR');
    }
  };

  const loadAIAnalysis = async () => {
    if (!isConnected || !isInternetReachable) {
      setAnalysisError('CONNECTIVITY_ERROR');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError(null);
    
    try {
      const analysisResult = await aiService.analyzeFinancialData();
      setAnalysis(analysisResult);
      setHasAnalyzed(true);
      
      // Add welcome system message with user name
      const userName = database.getUserName();
      const welcomeMessage: ChatMessage = {
        id: 'welcome',
        type: 'system',
        content: `${userName ? `Hello ${userName}! ` : ''}Your financial data has been analyzed! Feel free to ask me any questions about your finances. I can help with budget optimization, savings strategies, investment advice, time-based planning, and more. I have complete knowledge of your transactions, current month progress, and spending patterns.`,
        timestamp: new Date()
      };
      setChatMessages([welcomeMessage]);
      
    } catch (error) {
      setHasAnalyzed(true);
      setAnalysisError(getErrorMessage(error));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getErrorMessage = (error: any): string => {
    if (error?.message?.includes('CONNECTIVITY_ERROR')) {
      return 'CONNECTIVITY_ERROR';
    } else if (error?.message?.includes('AI_API_ERROR')) {
      return 'AI_API_ERROR';
    } else if (error?.message?.includes('DATA_EXTRACTION_ERROR')) {
      return 'DATA_EXTRACTION_ERROR';
    } else {
      return 'GENERAL_ERROR';
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || !isConnected || !isInternetReachable) return;
    
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: inputMessage.trim(),
      timestamp: new Date(),
    };
    
    setChatMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsChatting(true);
    
    try {
      const aiResponse = await aiService.chatWithAI(userMessage.content);
      
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: aiResponse,
        timestamp: new Date(),
      };
      
      setChatMessages(prev => [...prev, aiMessage]);
      
      // Auto-scroll to bottom
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
      
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'system',
        content: 'Sorry, I couldn\'t process your message. Please check your internet connection and try again.',
        timestamp: new Date(),
      };
      
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsChatting(false);
    }
  };

  const retryAnalysis = () => {
    setAnalysisError(null);
    setHasAnalyzed(false);
    checkConnectivityAndAnalyze();
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'success': return 'checkmark-circle';
      case 'warning': return 'warning';
      case 'alert': return 'alert-circle';
      default: return 'information-circle';
    }
  };

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'success': return theme.colors.success;
      case 'warning': return theme.colors.warning;
      case 'alert': return theme.colors.error;
      default: return theme.colors.primary;
    }
  };

  const renderErrorState = () => {
    let title = '';
    let message = '';
    let icon = 'alert-circle';
    let iconColor = theme.colors.error;
    
    switch (analysisError) {
      case 'CONNECTIVITY_ERROR':
        title = 'No Internet Connection';
        message = 'AI analysis requires an active internet connection. Please check your connection and try again.';
        icon = 'wifi-off';
        iconColor = theme.colors.warning;
        break;
      case 'AI_API_ERROR':
        title = 'AI Service Unavailable';
        message = 'The AI analysis service is temporarily unavailable. Please try again later.';
        icon = 'server-offline';
        iconColor = theme.colors.error;
        break;
      case 'DATA_EXTRACTION_ERROR':
        title = 'Data Processing Error';
        message = 'There was an issue processing your financial data. Please ensure you have some transactions recorded.';
        icon = 'document-text-outline';
        iconColor = theme.colors.warning;
        break;
      default:
        title = 'Analysis Failed';
        message = 'An unexpected error occurred while analyzing your data. Please try again.';
        icon = 'alert-circle';
        iconColor = theme.colors.error;
        break;
    }
    
    return (
      <View style={styles.errorContainer}>
        <Ionicons name={icon as any} size={64} color={iconColor} />
        <Text style={styles.errorTitle}>{title}</Text>
        <Text style={styles.errorMessage}>{message}</Text>
        
        <TouchableOpacity style={styles.retryButton} onPress={retryAnalysis}>
          <Ionicons name="refresh" size={20} color="white" />
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
        
        {!isConnected && (
          <TouchableOpacity 
            style={[styles.retryButton, styles.secondaryButton]} 
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={20} color={theme.colors.primary} />
            <Text style={[styles.retryButtonText, { color: theme.colors.primary }]}>Go Back</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderChatMessage = (message: ChatMessage) => {
    const isUser = message.type === 'user';
    const isSystem = message.type === 'system';
    const isAI = message.type === 'ai';
    
    // Advanced content parsing for professional formatting
    const formatContent = (content: string) => {
      if (!content || content.trim().length === 0) return null;
      
      // First, let's handle the specific patterns in AI responses
      let processedContent = content
        // Handle bullet points with various spacing
        .replace(/\s*•\s*/g, '|BULLET|')
        // Break after periods followed by capital letters (new sentences)
        .replace(/\.\s+([A-Z])/g, '.|NEWLINE|$1')
        // Break after colons when followed by bullet points
        .replace(/:\s*\|BULLET\|/g, ':|NEWLINE||BULLET|')
        // Handle "En büyük harcamalarınız:" pattern specifically
        .replace(/(En büyük harcamalarınız|En büyük|Ana Nakit|Son işlemleriniz):/gi, '|NEWLINE|$1:|NEWLINE|');
      
      // Split by our markers
      const parts = processedContent.split(/\|NEWLINE\||\|BULLET\|/).filter(part => part.trim());
      
      let formattedComponents: any[] = [];
      let isBulletSection = false;
      
      parts.forEach((part, index) => {
        const trimmedPart = part.trim();
        if (!trimmedPart) return;
        
        // Detect if this starts a bullet section
        if (trimmedPart.toLowerCase().includes('harcama') && trimmedPart.includes(':')) {
          isBulletSection = true;
          // Add the header
          formattedComponents.push(
            <Text key={`header-${index}`} style={[
              styles.messageText,
              styles.sectionHeader,
              isUser && styles.userMessageText,
              isSystem && styles.systemMessageText,
              formattedComponents.length > 0 && styles.paragraphSpacing
            ]}>
              {trimmedPart}
            </Text>
          );
          return;
        }
        
        // Check if this looks like a bullet point (contains category: amount pattern)
        if (isBulletSection && (trimmedPart.includes(':') && (trimmedPart.includes('manat') || trimmedPart.includes('$')))) {
          formattedComponents.push(
            <View key={`bullet-${index}`} style={styles.bulletPoint}>
              <Text style={[styles.bulletIcon, isUser && { color: 'white' }]}>•</Text>
              <Text style={[
                styles.bulletText,
                isUser && styles.userMessageText,
                isSystem && styles.systemMessageText
              ]}>
                {trimmedPart}
              </Text>
            </View>
          );
        } else {
          // Regular paragraph
          if (trimmedPart.length > 10) { // Avoid very short fragments
            isBulletSection = false;
            formattedComponents.push(
              <Text key={`paragraph-${index}`} style={[
                styles.messageText,
                isUser && styles.userMessageText,
                isSystem && styles.systemMessageText,
                formattedComponents.length > 0 && styles.paragraphSpacing
              ]}>
                {trimmedPart}
              </Text>
            );
          }
        }
      });
      
      // Fallback to original content if parsing failed
      if (formattedComponents.length === 0) {
        return (
          <Text style={[
            styles.messageText,
            isUser && styles.userMessageText,
            isSystem && styles.systemMessageText
          ]}>
            {content}
          </Text>
        );
      }
      
      return formattedComponents;
    };
    
    return (
      <View key={message.id} style={[
        styles.messageContainer,
        isUser && styles.userMessage,
        isSystem && styles.systemMessage
      ]}>
        <View style={[
          styles.messageBubble,
          isUser && styles.userBubble,
          isSystem && styles.systemBubble,
          isAI && styles.aiBubble
        ]}>
          {isAI && (
            <View style={styles.aiIcon}>
              <Ionicons name="sparkles" size={14} color={theme.colors.primary} />
            </View>
          )}
          <View style={styles.messageContent}>
            {formatContent(message.content)}
          </View>
        </View>
        <Text style={[styles.messageTime, isUser && styles.userMessageTime]}>
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    );
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.xl + 20,
      paddingBottom: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border + '20',
    },
    headerTop: {
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    backButton: {
    //   padding: theme.spacing.sm,
      marginRight: theme.spacing.sm,
      marginTop: theme.spacing.sm,
    },
    headerContent: {
      flex: 1,
      alignItems: 'flex-start',
    },
    title: {
      fontSize: 28,
      fontWeight: '700',
      color: theme.colors.text,
      marginBottom: theme.spacing.sm,
      textAlign: 'left',
      alignSelf: 'flex-start',
    },
    subtitle: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      textAlign: 'left',
      alignSelf: 'flex-start',
      marginLeft: 5, // backButton genişliği (24 + padding)
    },
    
    // Main Content
    mainContent: {
      flex: 1,
      paddingHorizontal: theme.spacing.lg,
    },
    analysisContainer: {
      marginBottom: theme.spacing.xl,
    },
    chatContainer: {
      marginTop: theme.spacing.lg,
    },
    scoreCard: {
      flexDirection: 'row',
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.lg,
      marginHorizontal: theme.spacing.lg,
      marginVertical: theme.spacing.md,
      alignItems: 'center',
      ...theme.shadows?.medium,
    },
    scoreInfo: {
      flex: 1,
    },
    scoreNumber: {
      fontSize: 32,
      fontWeight: '700',
      color: theme.colors.success,
    },
    scoreLabel: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginTop: theme.spacing.xs,
    },
    summaryText: {
      flex: 2,
      fontSize: 14,
      color: theme.colors.text,
      lineHeight: 20,
      marginLeft: theme.spacing.lg,
    },
    
    insightsContainer: {
      marginTop: theme.spacing.md,
    },
    insightCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.sm,
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    insightContent: {
      flex: 1,
      marginLeft: theme.spacing.sm,
    },
    insightTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: theme.spacing.xs,
    },
    insightDescription: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      lineHeight: 16,
    },
    

    messageContainer: {
      marginVertical: theme.spacing.xs,
      alignItems: 'flex-start',
    },
    userMessage: {
      alignItems: 'flex-end',
    },
    systemMessage: {
      alignItems: 'center',
    },
    messageBubble: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.md,
      maxWidth: width * 0.75,
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    userBubble: {
      backgroundColor: theme.colors.primary,
    },
    systemBubble: {
      backgroundColor: theme.colors.warning + '20',
      borderWidth: 1,
      borderColor: theme.colors.warning + '40',
    },
    aiIcon: {
      marginRight: theme.spacing.xs,
      marginTop: 2,
    },
    messageText: {
      fontSize: 14,
      color: theme.colors.text,
      lineHeight: 20,
      flex: 1,
    },
    userMessageText: {
      color: 'white',
    },
    systemMessageText: {
      color: theme.colors.warning,
      fontWeight: '500',
      textAlign: 'center',
    },
    messageTime: {
      fontSize: 11,
      color: theme.colors.textSecondary,
      marginTop: theme.spacing.xs,
      marginLeft: theme.spacing.sm,
    },
    userMessageTime: {
      marginLeft: 0,
      marginRight: theme.spacing.sm,
    },
    
    // Input Section
    inputSection: {
      borderTopWidth: 1,
      borderTopColor: theme.colors.border + '20',
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      backgroundColor: theme.colors.surface,
      marginTop: theme.spacing.md,
    },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'flex-end',
    },
    textInput: {
      flex: 1,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.lg,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      fontSize: 14,
      color: theme.colors.text,
      maxHeight: 100,
      backgroundColor: theme.colors.background,
    },
    sendButton: {
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.md,
      marginLeft: theme.spacing.sm,
      justifyContent: 'center',
      alignItems: 'center',
    },
    sendButtonDisabled: {
      backgroundColor: theme.colors.border,
    },
    
    // Loading States
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      marginTop: theme.spacing.md,
    },
    chatLoading: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: theme.spacing.md,
    },
    chatLoadingText: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginLeft: theme.spacing.sm,
    },
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: theme.spacing.lg,
    },
    errorTitle: {
      fontSize: 24,
      fontWeight: '700',
      color: theme.colors.text,
      marginBottom: theme.spacing.md,
    },
    errorMessage: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      textAlign: 'center',
    },
    retryButton: {
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.md,
      marginTop: theme.spacing.lg,
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    retryButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: 'white',
      marginLeft: theme.spacing.sm,
    },
    secondaryButton: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    insightRecommendation: {
      fontSize: 13,
      color: theme.colors.primary,
      marginTop: theme.spacing.xs,
      fontStyle: 'italic',
      lineHeight: 18,
    },
    nextStepsContainer: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.lg,
      marginTop: theme.spacing.md,
    },
    nextStepsTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: theme.spacing.md,
    },
    nextStepItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: theme.spacing.sm,
    },
    nextStepNumber: {
      backgroundColor: theme.colors.primary,
      color: 'white',
      fontSize: 12,
      fontWeight: '600',
      borderRadius: 12,
      width: 24,
      height: 24,
      textAlign: 'center',
      lineHeight: 24,
      marginRight: theme.spacing.sm,
    },
    nextStepText: {
      fontSize: 14,
      color: theme.colors.text,
      flex: 1,
      lineHeight: 20,
    },
    
    // Enhanced Chat Message Styles
    aiBubble: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border + '40',
    },
    messageContent: {
      flex: 1,
    },
    messageTextSpaced: {
      marginTop: theme.spacing.xs,
    },
    bulletPoint: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginVertical: 2,
    },
    bulletIcon: {
      fontSize: 14,
      color: theme.colors.primary,
      marginRight: theme.spacing.xs,
      marginTop: 2,
      minWidth: 16,
    },
    bulletText: {
      fontSize: 14,
      color: theme.colors.text,
      lineHeight: 20,
      flex: 1,
    },
    paragraphSpacing: {
      marginTop: theme.spacing.sm,
    },
    sectionHeader: {
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: theme.spacing.xs,
    },
  });

  if (isAnalyzing && !hasAnalyzed) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Ionicons name="sparkles" size={64} color={theme.colors.primary} />
          <Text style={styles.loadingText}>AI is analyzing your financial data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (analysisError) {
    return renderErrorState();
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
            </TouchableOpacity>
            <Text style={styles.title}>👾 AI Financial Analysis</Text>
          </View>
          <Text style={styles.subtitle}>Personalized insights for your financial health</Text>
        </View>

        {/* Main Content */}
        <ScrollView 
          ref={scrollViewRef}
          style={styles.mainContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Analysis Results */}
          {analysis && (
            <View style={styles.analysisContainer}>
              {/* Score Card */}
              <View style={styles.scoreCard}>
                <View style={styles.scoreInfo}>
                  <Text style={styles.scoreNumber}>{analysis.score}</Text>
                  <Text style={styles.scoreLabel}>Health Score</Text>
                </View>
                <Text style={styles.summaryText}>{analysis.summary}</Text>
              </View>

              {/* All Insights */}
              <View style={styles.insightsContainer}>
                {analysis.insights.map((insight, index) => (
                  <View key={index} style={styles.insightCard}>
                    <Ionicons 
                      name={getInsightIcon(insight.type) as any} 
                      size={20} 
                      color={getInsightColor(insight.type)} 
                    />
                    <View style={styles.insightContent}>
                      <Text style={styles.insightTitle}>{insight.title}</Text>
                      <Text style={styles.insightDescription}>
                        {insight.description}
                      </Text>
                      {insight.recommendation && (
                        <Text style={styles.insightRecommendation}>
                          💡 {insight.recommendation}
                        </Text>
                      )}
                    </View>
                  </View>
                ))}
              </View>

              {/* Next Steps */}
              {analysis.nextSteps && analysis.nextSteps.length > 0 && (
                <View style={styles.nextStepsContainer}>
                  <Text style={styles.nextStepsTitle}>🎯 Recommended Actions</Text>
                  {analysis.nextSteps.map((step, index) => (
                    <View key={index} style={styles.nextStepItem}>
                      <Text style={styles.nextStepNumber}>{index + 1}</Text>
                      <Text style={styles.nextStepText}>{step}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Chat Messages */}
          {hasAnalyzed && (
            <View style={styles.chatContainer}>
              {chatMessages.map(renderChatMessage)}
              
              {isChatting && (
                <View style={styles.chatLoading}>
                  <ActivityIndicator size="small" color={theme.colors.primary} />
                  <Text style={styles.chatLoadingText}>AI is thinking...</Text>
                </View>
              )}
            </View>
          )}
        </ScrollView>

        {/* Chat Input - Only show after analysis is complete */}
        {hasAnalyzed && (
          <View style={styles.inputSection}>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.textInput}
                value={inputMessage}
                onChangeText={setInputMessage}
                placeholder="Ask about your finances... (e.g., 'How can I save more?')"
                placeholderTextColor={theme.colors.textSecondary}
                multiline
              />
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  (!inputMessage.trim() || isChatting) && styles.sendButtonDisabled
                ]}
                onPress={sendMessage}
                disabled={!inputMessage.trim() || isChatting}
              >
                <Ionicons 
                  name="send" 
                  size={20} 
                  color={(!inputMessage.trim() || isChatting) ? theme.colors.textSecondary : 'white'} 
                />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}