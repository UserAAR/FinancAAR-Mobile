import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { database } from '../utils/database';

// Configure notifications for local only
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export type NotificationCategory = 
  | 'routine_reminder'
  | 'critical_alert'
  | 'finance_tip'
  | 'motivation'
  | 'saving_tip'
  | 'friendly_message';

export interface NotificationTemplate {
  category: NotificationCategory;
  title: string;
  body: string;
  icon?: string;
  requiresCalculation?: boolean;
  calculationFn?: () => boolean;
  personalizable?: boolean;
}

export class LocalNotificationService {
  private static instance: LocalNotificationService;
  private isInitialized = false;
  private dailyNotificationIds: string[] = [];

  private constructor() {}

  static getInstance(): LocalNotificationService {
    if (!LocalNotificationService.instance) {
      LocalNotificationService.instance = new LocalNotificationService();
    }
    return LocalNotificationService.instance;
  }

  // Notification templates organized by category
  private getNotificationTemplates(): NotificationTemplate[] {
    return [
      // Routine Reminders
      {
        category: 'routine_reminder',
        title: 'Daily Check-in 📊',
        body: 'Have you tracked any income or expenses today?',
        requiresCalculation: true,
        calculationFn: () => this.hasNoTransactionsToday(),
        personalizable: true,
      },
      {
        category: 'routine_reminder',
        title: 'Missing in Action 😴',
        body: "You haven't logged any transactions for 2 days. Don't let your habits slip!",
        requiresCalculation: true,
        calculationFn: () => this.hasNoTransactionsForDays(2),
        personalizable: true,
      },
      {
        category: 'routine_reminder',
        title: 'New Month, Fresh Start! 🗓️',
        body: "It's a new month! Time to plan your budget and set new financial goals.",
        requiresCalculation: true,
        calculationFn: () => this.isNewMonthStart(),
      },
      {
        category: 'routine_reminder',
        title: 'Zero Spending Day! ⭐',
        body: 'No expenses today? Give yourself a gold star for great self-control!',
        requiresCalculation: true,
        calculationFn: () => this.hasNoExpensesToday(),
        personalizable: true,
      },
      {
        category: 'routine_reminder',
        title: 'Keep the Streak! 🔥',
        body: 'Log at least one small transaction today to maintain your financial tracking habit.',
        personalizable: true,
      },

      // Critical Alerts
      {
        category: 'critical_alert',
        title: 'Low Cash Alert! 💸',
        body: 'Your cash balance has dropped below ₼50. Time to top up!',
        requiresCalculation: true,
        calculationFn: () => this.isCashBalanceLow(50),
      },
      {
        category: 'critical_alert',
        title: 'Card Balance Warning ⚠️',
        body: 'One of your cards has less than ₼20 remaining. Check your balances!',
        requiresCalculation: true,
        calculationFn: () => this.hasLowCardBalance(20),
      },

      // Finance Facts & Tips
      {
        category: 'finance_tip',
        title: 'Financial Wisdom 💡',
        body: 'Categorizing expenses increases awareness and helps you save up to 15% more.',
      },
      {
        category: 'finance_tip',
        title: 'Smart Saving Tip 🎯',
        body: 'Saving 10% of your income directly builds a powerful saving habit over time.',
      },
      {
        category: 'finance_tip',
        title: 'Money Fact 📈',
        body: 'Small daily expenses can add up to 30% of monthly spending. Track them wisely!',
      },
      {
        category: 'finance_tip',
        title: 'Cash vs Digital 💳',
        body: 'Using cash makes you 12-18% more conscious about spending than digital payments.',
      },
      {
        category: 'finance_tip',
        title: 'Financial Truth 💰',
        body: 'If you don\'t manage your money, someone else will - and not in your favor!',
      },

      // Motivational Messages
      {
        category: 'motivation',
        title: 'Building Habits 🌱',
        body: 'Every small financial record you make today is building tomorrow\'s wealth habits.',
      },
      {
        category: 'motivation',
        title: 'Financial Freedom 🗽',
        body: 'Disciplined spending today equals financial freedom tomorrow. You\'re on the right path!',
      },
      {
        category: 'motivation',
        title: 'One Step Forward ⭐',
        body: 'Another day, another opportunity to take control of your finances. You\'ve got this!',
      },

      // Saving Suggestions
      {
        category: 'saving_tip',
        title: 'Daily Challenge 💪',
        body: 'Try saving just ₼1 every day this month. That\'s ₼30 in your pocket!',
      },
      {
        category: 'saving_tip',
        title: 'Before You Buy 🤔',
        body: 'Ask yourself: "Is this a need or a want?" This simple question can save 40% on impulse buys.',
      },
      {
        category: 'saving_tip',
        title: 'Shopping Smart 📝',
        body: 'Making a shopping list before going out reduces unnecessary spending by 40%. Try it!',
      },
      {
        category: 'saving_tip',
        title: 'Small Spends, Big Impact 📊',
        body: 'Those ₼5 coffee purchases? They add up to ₼150 monthly. Track the small stuff too!',
      },

      // Friendly Messages
      {
        category: 'friendly_message',
        title: 'We Miss You! 😢',
        body: 'Your financial tracker has been quiet for 3 days. Come back and see your progress!',
        requiresCalculation: true,
        calculationFn: () => this.hasNotOpenedAppForDays(3),
        personalizable: true,
      },
      {
        category: 'friendly_message',
        title: 'Coffee Break Time ☕',
        body: 'Grab your coffee and take a quick look at your finances. Just 1 minute needed!',
      },
      {
        category: 'friendly_message',
        title: 'Quick Check-in 📱',
        body: 'Just 1 minute to log your income today. Simple, quick, and so worth it!',
        personalizable: true,
      },
    ];
  }

  // Initialize notification service
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Request permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('❌ Notification permission not granted');
        return;
      }

      // Configure for Android (local notifications only)
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'FinancAAR Local Notifications',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#00D2AA',
        });
      }

      this.isInitialized = true;
      
      // Schedule daily notifications
      await this.scheduleDailyNotifications();
      
      console.log('✅ Local notification service initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize local notifications:', error);
    }
  }

  // Schedule 2-3 random notifications per day using simpler approach
  async scheduleDailyNotifications(): Promise<void> {
    try {
      // Cancel existing notifications
      await this.cancelAllScheduledNotifications();

      const templates = this.getNotificationTemplates();
      const userName = database.getUserName() || 'Friend';

      // Schedule for next 7 days
      for (let day = 0; day < 7; day++) {
        const notificationsPerDay = Math.random() > 0.5 ? 3 : 2; // Randomly 2 or 3 notifications
        const usedCategories: Set<NotificationCategory> = new Set();
        
        for (let i = 0; i < notificationsPerDay; i++) {
          // Get random time between 9 AM and 11 PM
          // Random integer in [9, 23] → 9 AM to 11 PM inclusive
          const hour = 9 + Math.floor(Math.random() * 15);
          const minute = Math.floor(Math.random() * 60);
          
          const scheduledDate = new Date();
          scheduledDate.setDate(scheduledDate.getDate() + day);
          scheduledDate.setHours(hour, minute, 0, 0);

          // Skip if time has passed today
          if (day === 0 && scheduledDate < new Date()) {
            continue;
          }

          // Select notification from different category each time
          const availableTemplates = templates.filter(t => !usedCategories.has(t.category));
          if (availableTemplates.length === 0) break;

          const template = availableTemplates[Math.floor(Math.random() * availableTemplates.length)];
          usedCategories.add(template.category);

          // Schedule notification with simplified approach
          await this.scheduleSimpleNotification(template, scheduledDate, userName);
        }
      }

      console.log('📅 Daily local notifications scheduled successfully');
    } catch (error) {
      console.error('❌ Failed to schedule daily notifications:', error);
    }
  }

  // Schedule a simple notification that works with Expo Go
  private async scheduleSimpleNotification(
    template: NotificationTemplate, 
    scheduledDate: Date, 
    userName: string
  ): Promise<void> {
    try {
      const personalizedBody = template.personalizable 
        ? `${userName}, ${template.body.toLowerCase()}`
        : template.body;

      // Calculate seconds until notification should fire
      const secondsUntilNotification = Math.max(
        Math.floor((scheduledDate.getTime() - Date.now()) / 1000),
        1 // Minimum 1 second
      );

      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title: template.title,
          body: personalizedBody,
          sound: 'default',
          data: { 
            category: template.category,
            scheduledFor: scheduledDate.toISOString(),
          },
        },
        trigger: {
          type: 'date',
          date: scheduledDate,
        } as any,
      });

      this.dailyNotificationIds.push(identifier);
      console.log(`📲 Scheduled notification "${template.title}" for ${scheduledDate.toLocaleString()}`);
    } catch (error) {
      console.error('❌ Failed to schedule notification:', error);
    }
  }

  // Send immediate notification
  async sendImmediateNotification(
    title: string, 
    body: string, 
    data?: any
  ): Promise<void> {
    if (!this.isInitialized) {
      console.log('⚠️ Notification service not initialized');
      return;
    }

    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: 'default',
          data,
        },
        trigger: null, // Send immediately
      });
      console.log(`📲 Immediate notification sent: ${title}`);
    } catch (error) {
      console.error('❌ Failed to send immediate notification:', error);
    }
  }

  // Cancel all scheduled notifications
  async cancelAllScheduledNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      this.dailyNotificationIds = [];
      console.log('🗑️ All scheduled notifications cancelled');
    } catch (error) {
      console.error('❌ Failed to cancel notifications:', error);
    }
  }

  // Calculation functions for data-driven notifications
  private hasNoTransactionsToday(): boolean {
    try {
      const today = new Date().toISOString().split('T')[0];
      const transactions = database.getTransactions(50);
      return !transactions.some(t => t.date.toISOString().split('T')[0] === today);
    } catch {
      return false;
    }
  }

  private hasNoTransactionsForDays(days: number): boolean {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      const transactions = database.getTransactions(100);
      return !transactions.some(t => t.date >= cutoffDate);
    } catch {
      return false;
    }
  }

  private isNewMonthStart(): boolean {
    const today = new Date();
    return today.getDate() === 1;
  }

  private hasNoExpensesToday(): boolean {
    try {
      const today = new Date().toISOString().split('T')[0];
      const transactions = database.getTransactions(50);
      return !transactions.some(t => 
        (t.type === 'expense' || t.type === 'lent') && 
        t.date.toISOString().split('T')[0] === today
      );
    } catch {
      return false;
    }
  }

  private isCashBalanceLow(threshold: number): boolean {
    try {
      const accounts = database.getAccounts();
      const cashAccounts = accounts.filter(a => a.type === 'cash');
      return cashAccounts.some(a => a.balance < threshold);
    } catch {
      return false;
    }
  }

  private hasLowCardBalance(threshold: number): boolean {
    try {
      const accounts = database.getAccounts();
      const cardAccounts = accounts.filter(a => a.type === 'card');
      return cardAccounts.some(a => a.balance < threshold);
    } catch {
      return false;
    }
  }

  private hasNotOpenedAppForDays(days: number): boolean {
    // This would need to be tracked in app settings/database
    // For now, we'll use last transaction as proxy
    return this.hasNoTransactionsForDays(days);
  }

  // Get notification permission status
  async getPermissionStatus(): Promise<'granted' | 'denied' | 'undetermined'> {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      return status as 'granted' | 'denied' | 'undetermined';
    } catch {
      return 'undetermined';
    }
  }

  // Request notification permissions
  async requestPermissions(): Promise<boolean> {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      return status === 'granted';
    } catch {
      return false;
    }
  }

  // Get scheduled notifications count for debugging
  async getScheduledNotificationsCount(): Promise<number> {
    try {
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      return scheduled.length;
    } catch {
      return 0;
    }
  }

  // Public helper: return a random notification (title & body) for testing purposes
  getRandomNotification(userName: string = 'Friend'): { title: string; body: string } {
    const templates = this.getNotificationTemplates();
    const template = templates[Math.floor(Math.random() * templates.length)];
    const body = template.personalizable
      ? `${userName}, ${template.body.toLowerCase()}`
      : template.body;
    return { title: template.title, body };
  }
}

export const localNotificationService = LocalNotificationService.getInstance(); 