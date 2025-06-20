import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { formatCurrency } from '../utils/currency';
import { database } from '../utils/database';
import { Category, CategoryType } from '../types';

export default function CategoriesScreen() {
  const { theme } = useTheme();
  const [selectedType, setSelectedType] = useState<CategoryType>('expense');
  const [categories, setCategories] = useState<Category[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCategories();
  }, [selectedType]);

  const loadCategories = () => {
    try {
      setIsLoading(true);
      const categoryData = database.getCategories(selectedType);
      setCategories(categoryData);
    } catch (error) {
      console.error('Error loading categories:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    loadCategories();
    setRefreshing(false);
  };

  const getCategoryStats = (categoryId: string) => {
    // Get real statistics from database
    return database.getCategoryStats(categoryId, 1); // Last 1 month
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      color: theme.colors.text,
      marginBottom: theme.spacing.md,
    },
    typeSelector: {
      flexDirection: 'row',
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.xs,
    },
    typeButton: {
      flex: 1,
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      borderRadius: theme.borderRadius.sm,
      alignItems: 'center',
    },
    activeTypeButton: {
      backgroundColor: theme.colors.primary,
    },
    typeButtonText: {
      fontSize: 16,
      fontWeight: '500',
      color: theme.colors.textSecondary,
    },
    activeTypeButtonText: {
      color: 'white',
    },
    content: {
      flex: 1,
      padding: theme.spacing.md,
    },
    categoryGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.md,
    },
    categoryCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.md,
      width: '47%',
      ...theme.shadows.small,
    },
    categoryHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: theme.spacing.md,
    },
    categoryIcon: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: theme.spacing.md,
    },
    categoryInfo: {
      flex: 1,
    },
    categoryName: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: theme.spacing.xs,
    },
    categoryCount: {
      fontSize: 12,
      color: theme.colors.textSecondary,
    },
    categoryAmount: {
      fontSize: 18,
      fontWeight: 'bold',
      color: theme.colors.text,
      textAlign: 'center',
    },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: theme.spacing.xl,
      marginTop: theme.spacing.xl,
    },
    emptyIcon: {
      marginBottom: theme.spacing.md,
    },
    emptyText: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginBottom: theme.spacing.xs,
    },
    emptySubtext: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      textAlign: 'center',
    },
    addButton: {
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.md,
      margin: theme.spacing.md,
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'center',
      ...theme.shadows.medium,
    },
    addButtonText: {
      color: 'white',
      fontSize: 16,
      fontWeight: '600',
      marginLeft: theme.spacing.sm,
    },
  });

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons 
        name="folder-outline" 
        size={64} 
        color={theme.colors.textSecondary} 
        style={styles.emptyIcon}
      />
      <Text style={styles.emptyText}>
        No {selectedType} categories yet
      </Text>
      <Text style={styles.emptySubtext}>
        Add categories to organize your transactions
      </Text>
    </View>
  );

  const renderCategoryCard = (category: Category) => {
    const stats = getCategoryStats(category.id);
    
    return (
      <TouchableOpacity key={category.id} style={styles.categoryCard}>
        <View style={styles.categoryHeader}>
          <View style={[styles.categoryIcon, { backgroundColor: category.color + '20' }]}>
            <Ionicons name={category.icon as any} size={24} color={category.color} />
          </View>
          <View style={styles.categoryInfo}>
            <Text style={styles.categoryName}>{category.name}</Text>
            <Text style={styles.categoryCount}>
              {stats.transactionCount} transactions
            </Text>
          </View>
        </View>
        <Text style={[
          styles.categoryAmount,
          { color: selectedType === 'income' ? theme.colors.success : theme.colors.error }
        ]}>
          {formatCurrency(stats.totalAmount)}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Categories</Text>
        <View style={styles.typeSelector}>
          <TouchableOpacity
            style={[
              styles.typeButton,
              selectedType === 'expense' && styles.activeTypeButton,
            ]}
            onPress={() => setSelectedType('expense')}
          >
            <Text style={[
              styles.typeButtonText,
              selectedType === 'expense' && styles.activeTypeButtonText,
            ]}>
              Expense
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.typeButton,
              selectedType === 'income' && styles.activeTypeButton,
            ]}
            onPress={() => setSelectedType('income')}
          >
            <Text style={[
              styles.typeButtonText,
              selectedType === 'income' && styles.activeTypeButtonText,
            ]}>
              Income
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {categories.length > 0 ? (
          <View style={styles.categoryGrid}>
            {categories.map(renderCategoryCard)}
          </View>
        ) : (
          renderEmptyState()
        )}
      </ScrollView>

      {/* Add Category Button */}
      <TouchableOpacity style={styles.addButton}>
        <Ionicons name="add" size={20} color="white" />
        <Text style={styles.addButtonText}>Add Category</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
} 