import NetInfo from '@react-native-community/netinfo';
import Constants from 'expo-constants';
import { database } from './database';
import { Transaction, Account, Debt } from '../types';

interface FinancialData {
  totalIncome: number;
  totalExpense: number;
  netSavings: number;
  savingsRate: number;
  topCategories: Array<{ 
    name: string; 
    amount: number; 
    percentage: number; 
    transactionCount: number;
  }>;
  monthlyTrend: Array<{ 
    month: string; 
    income: number; 
    expense: number; 
    net: number;
    transactionCount: number;
    avgTransactionSize: number;
    savingsRate: number;
  }>;
  accountBalances: Array<{ 
    name: string; 
    balance: number; 
    type: string;
    emoji?: string;
    color?: string;
  }>;
  recentTransactions: Array<{ 
    date: string; 
    amount: number; 
    title: string;
    description: string;
    category: string; 
    categoryIcon: string;
    type: string; 
    accountName: string;
    toAccountName?: string;
    status: string;
  }>;
  totalDebts: number;
  totalAssets: number;
  // Optional enhanced metrics
  monthlyIncomeAverage?: number;
  monthlyExpenseAverage?: number;
  incomeStability?: number;
  expenseStability?: number;
  emergencyFundNeeded?: number;
  emergencyFundCoverage?: number;
  totalOwedToUs?: number;
  netWorth?: number;
  debtToAssetRatio?: number;
  liquidityRatio?: number;
  // Detailed debt information
  activeDebts?: Array<{
    id: string;
    type: 'got' | 'gave';
    personName: string;
    amount: number;
    description?: string;
    date: Date;
    dueDate?: Date;
    accountName?: string;
  }>;
  completedDebts?: Array<{
    id: string;
    type: 'got' | 'gave';
    personName: string;
    amount: number;
    description?: string;
    completedDate: Date;
  }>;
}

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

interface ConnectivityState {
  isConnected: boolean;
  isInternetReachable: boolean;
}

class AIService {
  private readonly API_KEY = 'AIzaSyAUGk2qiTwg1KWzFmQ15QELkjHhKNzzxsE';
  private readonly baseURL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
  private chatContext: ChatMessage[] = [];
  
  // Helper function to get comprehensive date/time information
  private getDateTimeContext(): string {
    const now = new Date();
    const currentMonth = now.getMonth() + 1; // 1-based month
    const currentYear = now.getFullYear();
    const currentDate = now.getDate();
    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
    const daysRemaining = daysInMonth - currentDate;
    
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    
    const currentMonthName = monthNames[currentMonth - 1];
    const progressPercentage = ((currentDate / daysInMonth) * 100).toFixed(1);
    
    // Calculate how many months since oldest transaction
    const oldestTransaction = database.getTransactions().reduce((oldest, transaction) => {
      const transactionDate = new Date(transaction.date);
      return transactionDate < oldest ? transactionDate : oldest;
    }, now);
    
    const monthsSinceStart = ((now.getTime() - oldestTransaction.getTime()) / (1000 * 60 * 60 * 24 * 30.44)).toFixed(1);
    
    return `
CURRENT DATE & TIME CONTEXT:
📅 Today: ${now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
⏰ Current Time: ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
📊 Month Progress: ${currentMonthName} ${currentYear} - Day ${currentDate} of ${daysInMonth} (${progressPercentage}% complete)
⏳ Days Remaining in Month: ${daysRemaining} days
🗓️ Financial Data Period: ${monthsSinceStart} months of transaction history
📈 Quarter: Q${Math.ceil(currentMonth / 3)} of ${currentYear}
🔄 Week of Year: Week ${Math.ceil((currentDate + new Date(currentYear, 0, 1).getDay()) / 7)}
    `.trim();
  }

  // Helper function to get user context
  private getUserContext(): string {
    const userName = database.getUserName();
    return userName ? `\n👤 User Name: ${userName}` : '';
  }

  async checkConnectivity(): Promise<ConnectivityState> {
    try {
      const state = await NetInfo.fetch();
      return {
        isConnected: state.isConnected ?? false,
        isInternetReachable: state.isInternetReachable ?? false
      };
    } catch (error) {
      return {
        isConnected: false,
        isInternetReachable: false
      };
    }
  }

  private async makeRequest(prompt: string, isAnalysis = false): Promise<string> {
    // Check internet connectivity first
    const connectivity = await this.checkConnectivity();
    if (!connectivity.isConnected || !connectivity.isInternetReachable) {
      throw new Error('CONNECTIVITY_ERROR');
    }

    try {
      const response = await fetch(`${this.baseURL}?key=${this.API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: isAnalysis ? 0.3 : 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: isAnalysis ? 2048 : 1024,
          },
          safetySettings: [
            {
              category: "HARM_CATEGORY_HARASSMENT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_HATE_SPEECH",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_DANGEROUS_CONTENT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            }
          ]
        }),
      });

      if (!response.ok) {
        throw new Error(`AI_API_ERROR: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.candidates && data.candidates[0] && data.candidates[0].content) {
        return data.candidates[0].content.parts[0].text;
      } else {
        throw new Error('AI_RESPONSE_FORMAT_ERROR');
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('AI_API_ERROR')) {
        throw error;
      }
      throw new Error('AI_REQUEST_FAILED');
    }
  }

     private extractUserFinancialData(): FinancialData {
    try {
      // Get all data from database with proper names
      const transactions: Transaction[] = database.getTransactions();
      const accounts: Account[] = database.getAccounts();
      const debts: Debt[] = database.getDebts();
      const categories = database.getCategories();
      
      // Create category lookup map for ID to name conversion
      const categoryMap = new Map<string, { name: string; type: string; icon: string; color: string }>();
      categories.forEach(cat => {
        categoryMap.set(cat.id, { 
          name: cat.name, 
          type: cat.type, 
          icon: cat.icon, 
          color: cat.color 
        });
      });
      
      // Create account lookup map for ID to name conversion
      const accountMap = new Map<string, { name: string; type: string; emoji?: string }>();
      accounts.forEach(acc => {
        accountMap.set(acc.id, { 
          name: acc.name, 
          type: acc.type, 
          emoji: acc.emoji 
        });
      });
      
      // Calculate totals for current month
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      
      const monthlyTransactions = transactions.filter(t => {
        const transactionDate = new Date(t.date);
        return transactionDate.getMonth() === currentMonth && 
               transactionDate.getFullYear() === currentYear;
      });
      
      const totalIncome = monthlyTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
      
      const totalExpense = monthlyTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
      
      const netSavings = totalIncome - totalExpense;
      const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0;
      
      // Calculate category breakdown with REAL NAMES
      const categoryTotals: { [key: string]: { amount: number; name: string; count: number } } = {};
      monthlyTransactions
        .filter(t => t.type === 'expense')
        .forEach(t => {
          const categoryInfo = categoryMap.get(t.categoryId);
          const categoryName = categoryInfo?.name || 'Unknown Category';
          const categoryKey = categoryName;
          
          if (!categoryTotals[categoryKey]) {
            categoryTotals[categoryKey] = { amount: 0, name: categoryName, count: 0 };
          }
          categoryTotals[categoryKey].amount += t.amount;
          categoryTotals[categoryKey].count += 1;
        });
      
      const topCategories = Object.values(categoryTotals)
        .map(cat => ({
          name: cat.name,
          amount: cat.amount,
          percentage: totalExpense > 0 ? (cat.amount / totalExpense) * 100 : 0,
          transactionCount: cat.count
        }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 8); // Get top 8 categories for better analysis
      
      // Calculate monthly trend (last 6 months) with detailed info
      const monthlyTrend = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthYear = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        
        const monthTransactions = transactions.filter(t => {
          const tDate = new Date(t.date);
          return tDate.getMonth() === date.getMonth() && 
                 tDate.getFullYear() === date.getFullYear();
        });
        
        const income = monthTransactions
          .filter(t => t.type === 'income')
          .reduce((sum, t) => sum + t.amount, 0);
        
        const expense = monthTransactions
          .filter(t => t.type === 'expense')
          .reduce((sum, t) => sum + t.amount, 0);
        
        const transactionCount = monthTransactions.length;
        const avgTransactionSize = transactionCount > 0 ? (income + expense) / transactionCount : 0;
        
        monthlyTrend.push({
          month: monthYear,
          income,
          expense,
          net: income - expense,
          transactionCount,
          avgTransactionSize,
          savingsRate: income > 0 ? ((income - expense) / income) * 100 : 0
        });
      }
      
      // Account balances with REAL NAMES and additional info
      const accountBalances = accounts.map(acc => ({
        name: acc.name,
        balance: acc.balance,
        type: acc.type,
        emoji: acc.emoji || (acc.type === 'card' ? '💳' : '💵'),
        color: acc.type === 'card' ? (acc as any).color : undefined
      }));
      
      // Recent transactions with REAL NAMES and full details (last 25 for better context)
      const recentTransactions = transactions
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 25)
        .map(t => {
          const categoryInfo = categoryMap.get(t.categoryId);
          const accountInfo = accountMap.get(t.accountId);
          const toAccountInfo = t.toAccountId ? accountMap.get(t.toAccountId) : null;
          
          return {
            date: new Date(t.date).toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric',
              weekday: 'short'
            }),
            amount: t.amount,
            title: t.title || 'Untitled Transaction',
            description: t.description || '',
            category: categoryInfo?.name || 'Unknown Category',
            categoryIcon: categoryInfo?.icon || '📝',
            type: t.type,
            accountName: accountInfo?.name || 'Unknown Account',
            toAccountName: toAccountInfo?.name || null,
            status: t.status
          };
        });
      
      // Calculate debt details with person names (ONLY ACTIVE DEBTS)
      const totalDebts = debts
        .filter(d => d.type === 'got' && d.status === 'active') // Only active money we owe to others
        .reduce((sum, d) => sum + d.amount, 0);
      
      const totalOwedToUs = debts
        .filter(d => d.type === 'gave' && d.status === 'active') // Only active money others owe to us
        .reduce((sum, d) => sum + d.amount, 0);
      
      const totalAssets = accounts.reduce((sum, acc) => sum + acc.balance, 0);
      
      // Prepare detailed debt information
      const activeDebts = debts
        .filter(d => d.status === 'active')
        .map(debt => {
          const accountInfo = accountMap.get(debt.accountId);
          return {
            id: debt.id,
            type: debt.type,
            personName: debt.personName,
            amount: debt.amount,
            description: debt.description,
            date: debt.date,
            dueDate: debt.dueDate,
            accountName: accountInfo?.name
          };
        });

      const completedDebts = debts
        .filter(d => d.status === 'completed')
        .slice(0, 10) // Last 10 completed debts
        .map(debt => ({
          id: debt.id,
          type: debt.type,
          personName: debt.personName,
          amount: debt.amount,
          description: debt.description,
          completedDate: debt.updatedAt
        }));
      
      // Additional financial health metrics
      const monthlyIncomeAvg = monthlyTrend.reduce((sum, m) => sum + m.income, 0) / monthlyTrend.length;
      const monthlyExpenseAvg = monthlyTrend.reduce((sum, m) => sum + m.expense, 0) / monthlyTrend.length;
      const incomeStability = this.calculateStability(monthlyTrend.map(m => m.income));
      const expenseStability = this.calculateStability(monthlyTrend.map(m => m.expense));
      
      // Emergency fund calculation (3-6 months expenses)
      const emergencyFundNeeded = monthlyExpenseAvg * 3; // Conservative 3 months
      const emergencyFundCoverage = totalAssets > 0 ? totalAssets / emergencyFundNeeded : 0;
      
      return {
        // Core metrics
        totalIncome,
        totalExpense,
        netSavings,
        savingsRate,
        
        // Enhanced category analysis
        topCategories,
        
        // Enhanced monthly trend with stability metrics
        monthlyTrend: monthlyTrend as any,
        
        // Enhanced account info
        accountBalances: accountBalances as any,
        
        // Detailed recent transactions
        recentTransactions: recentTransactions as any,
        
        // Debt analysis
        totalDebts,
        totalAssets,
        
        // Additional metrics for AI analysis
        ...(monthlyIncomeAvg && {
          monthlyIncomeAverage: monthlyIncomeAvg,
          monthlyExpenseAverage: monthlyExpenseAvg,
          incomeStability,
          expenseStability,
          emergencyFundNeeded,
          emergencyFundCoverage,
          totalOwedToUs,
          netWorth: totalAssets - totalDebts + totalOwedToUs,
          debtToAssetRatio: totalAssets > 0 ? (totalDebts / totalAssets) * 100 : 0,
          liquidityRatio: monthlyExpenseAvg > 0 ? totalAssets / monthlyExpenseAvg : 0,
          // Detailed debt information
          activeDebts,
          completedDebts
        })
      };
      
    } catch (error) {
      throw new Error('DATA_EXTRACTION_ERROR');
    }
  }

  // Helper method to calculate stability (lower values = more stable)
  private calculateStability(values: number[]): number {
    if (values.length < 2) return 0;
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    
    return mean > 0 ? (stdDev / mean) * 100 : 0; // Coefficient of variation as percentage
  }

  // Helper method to clean and format AI responses
  private formatAIResponse(text: string): string {
    if (!text) return '';
    
    // Remove markdown formatting that doesn't render well in React Native
    let formatted = text
      // Remove **bold** formatting and replace with clean text
      .replace(/\*\*(.*?)\*\*/g, '$1')
      // Remove *italic* formatting
      .replace(/\*(.*?)\*/g, '$1')
      // Remove ### headers and replace with clean text
      .replace(/###\s*(.*)/g, '$1')
      // Remove ## headers
      .replace(/##\s*(.*)/g, '$1')
      // Remove # headers
      .replace(/#\s*(.*)/g, '$1')
      // Remove backticks for code
      .replace(/`(.*?)`/g, '$1')
      // Remove triple backticks for code blocks
      .replace(/```[\s\S]*?```/g, '')
      // Remove link formatting [text](url)
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      // Remove underline formatting
      .replace(/__(.*?)__/g, '$1')
      // Remove strikethrough formatting
      .replace(/~~(.*?)~~/g, '$1')
      // Remove bullet points and list formatting
      .replace(/^\s*[-*+]\s+/gm, '• ')
      // Remove numbered lists
      .replace(/^\s*\d+\.\s+/gm, '• ')
      // Clean up HTML tags if any
      .replace(/<[^>]*>/g, '')
      // Clean up multiple spaces
      .replace(/\s+/g, ' ')
      // Clean up multiple line breaks
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      // Trim whitespace
      .trim();
    
    return formatted;
  }

  // Helper method to add formatting instructions to AI prompts
  private addFormattingInstructions(prompt: string): string {
    const formattingInstructions = `

RESPONSE FORMATTING REQUIREMENTS:
- Always use the Azerbaijani manat currency symbol ₼ when referring to money.
- When displaying monetary amounts, place the ₼ symbol after the number (e.g., "456 ₼", not "₼456").
- Use plain text only, no Markdown formatting (no **, *, #, backticks, etc.)
- Use simple punctuation and line breaks for emphasis
- For lists, use bullet points (•) or numbers
- Keep responses clear and readable in plain text format
- Avoid special characters that might not render properly
- Use emojis sparingly and only when they add clear value
`;
    
    return prompt + formattingInstructions;
  }

  async analyzeFinancialData(): Promise<AIAnalysisResponse> {
    const financialData = this.extractUserFinancialData();
    const userName = database.getUserName();
    
    // Get all debts for detailed analysis
    const allDebts = database.getDebts();
    const activeDebts = allDebts.filter(d => d.status === 'active');
    const completedDebts = allDebts.filter(d => d.status === 'completed');
    
    // Organize debts by type
    const activeBorrowedDebts = activeDebts.filter(d => d.type === 'got');
    const activeLentDebts = activeDebts.filter(d => d.type === 'gave');
    
    const prompt = `You are an expert personal financial advisor AI analyzing ${userName ? `${userName}'s` : 'a user\'s'} complete financial profile. Provide detailed insights with personalized recommendations.

${this.getDateTimeContext()}${this.getUserContext()}

📊 COMPLETE FINANCIAL ANALYSIS
===============================

💰 CURRENT MONTH PERFORMANCE:
- Total Income: ₼${financialData.totalIncome.toFixed(2)}
- Total Expenses: ₼${financialData.totalExpense.toFixed(2)}
- Net Savings: ₼${financialData.netSavings.toFixed(2)}
- Savings Rate: ${financialData.savingsRate.toFixed(1)}%

📈 SPENDING BREAKDOWN BY CATEGORY:
${financialData.topCategories.map(cat => 
  `- ${cat.name}: ₼${cat.amount.toFixed(2)} (${cat.percentage.toFixed(1)}%) [${cat.transactionCount} transactions]`
).join('\n')}

📅 6-MONTH FINANCIAL TREND:
${financialData.monthlyTrend.map(month => 
  `- ${month.month}: Income ₼${month.income.toFixed(2)}, Expenses ₼${month.expense.toFixed(2)}, Net ₼${month.net.toFixed(2)}, Savings Rate ${month.savingsRate.toFixed(1)}% [${month.transactionCount} transactions]`
).join('\n')}

🏦 ACCOUNT PORTFOLIO:
${financialData.accountBalances.map(acc => 
  `- ${acc.emoji} ${acc.name} (${acc.type}): ₼${acc.balance.toFixed(2)}`
).join('\n')}

💳 DEBT MANAGEMENT OVERVIEW:
===============================
📊 DEBT SUMMARY:
- Total Money You Owe: ₼${financialData.totalDebts.toFixed(2)} (${activeBorrowedDebts.length} active debts)
- Total Money Owed to You: ₼${((financialData as any).totalOwedToUs || 0).toFixed(2)} (${activeLentDebts.length} active debts)
- Net Debt Position: ₼${(((financialData as any).totalOwedToUs || 0) - financialData.totalDebts).toFixed(2)}

💸 ACTIVE BORROWED MONEY (You Owe):
${activeBorrowedDebts.length > 0 ? activeBorrowedDebts.map(debt => 
  `- ₼${debt.amount.toFixed(2)} to ${debt.personName}${debt.dueDate ? ` (Due: ${debt.dueDate.toLocaleDateString()})` : ''} - "${debt.description || 'No description'}" [Created: ${debt.date.toLocaleDateString()}]`
).join('\n') : '- No active borrowed money'}

💰 ACTIVE LENT MONEY (Others Owe You):
${activeLentDebts.length > 0 ? activeLentDebts.map(debt => 
  `- ₼${debt.amount.toFixed(2)} from ${debt.personName}${debt.dueDate ? ` (Due: ${debt.dueDate.toLocaleDateString()})` : ''} - "${debt.description || 'No description'}" [Created: ${debt.date.toLocaleDateString()}]`
).join('\n') : '- No active lent money'}

📋 RECENT DEBT ACTIVITY:
${completedDebts.length > 0 ? 
  `Recently Completed Debts (Last 5):
${completedDebts.slice(0, 5).map(debt => 
  `- ₼${debt.amount.toFixed(2)} ${debt.type === 'got' ? 'borrowed from' : 'lent to'} ${debt.personName} - COMPLETED [${debt.updatedAt.toLocaleDateString()}]`
).join('\n')}` : '- No recently completed debts'}

📝 RECENT TRANSACTION ACTIVITY:
${financialData.recentTransactions.slice(0, 25).map(t => 
  `- ${t.date}: "${t.title}" ${t.type === 'income' || t.type === 'borrowed' ? '+' : '-'}₼${t.amount.toFixed(2)} via ${t.accountName} → ${t.category} ${t.categoryIcon} ${t.description ? '(' + t.description + ')' : ''}`
).join('\n')}

💵 FINANCIAL POSITION SUMMARY:
- Total Assets: ₼${financialData.totalAssets.toFixed(2)}
- Total Debts Owed: ₼${financialData.totalDebts.toFixed(2)}
- Money Owed to User: ₼${((financialData as any).totalOwedToUs || 0).toFixed(2)}
- Net Worth: ₼${((financialData as any).netWorth || (financialData.totalAssets - financialData.totalDebts)).toFixed(2)}
- Debt-to-Asset Ratio: ${((financialData as any).debtToAssetRatio?.toFixed(1) || '0.0')}%

📊 ADVANCED METRICS:
- Average Monthly Income: ₼${((financialData as any).monthlyIncomeAverage?.toFixed(2) || 'N/A')}
- Average Monthly Expenses: ₼${((financialData as any).monthlyExpenseAverage?.toFixed(2) || 'N/A')}
- Income Stability: ${((financialData as any).incomeStability?.toFixed(1) || 'N/A')}% variation
- Expense Stability: ${((financialData as any).expenseStability?.toFixed(1) || 'N/A')}% variation
- Emergency Fund Coverage: ${((financialData as any).emergencyFundCoverage?.toFixed(1) || 'N/A')} months
- Liquidity Ratio: ${((financialData as any).liquidityRatio?.toFixed(1) || 'N/A')} months of expenses

ANALYSIS TASK:
Provide a comprehensive financial health analysis in the following JSON format. Be specific and use the actual numbers provided. Pay special attention to debt management and provide specific recommendations for debt repayment strategies:

{
  "summary": "2-3 sentence overall financial health assessment using specific numbers, including debt position",
  "insights": [
    {
      "type": "success|warning|alert|info",
      "title": "Specific insight title",
      "description": "Detailed analysis with actual numbers and percentages, including debt-specific insights",
      "recommendation": "Specific actionable advice including debt management strategies"
    }
  ],
  "score": "Financial health score from 0-100 based on the data (consider debt burden in scoring)",
  "nextSteps": ["Specific action 1 (include debt actions if applicable)", "Specific action 2", "Specific action 3"]
}

ANALYSIS CRITERIA:
- ${userName ? `Address ${userName} personally in the analysis` : 'Use a personal tone'}
- Use the date/time context to provide time-aware insights (e.g., "This month you've spent X", "With Y days left in the month")
- Evaluate savings rate (excellent >20%, good 10-20%, needs improvement <10%)
- Assess spending patterns and identify optimization opportunities  
- Review account balances and cash flow trends
- IMPORTANT: Analyze debt position thoroughly:
  * If user owes money: Provide repayment strategies and timeline recommendations
  * If others owe user: Suggest collection strategies and follow-up timing
  * Consider debt-to-asset ratio in overall financial health assessment
  * Factor debt burden into financial health score (high debt = lower score)
- Provide specific, actionable recommendations based on their situation
- Be encouraging but realistic about areas needing improvement
- Focus on practical Azerbaijani financial context and goals
- Use clear, simple language without markdown formatting
- Always use the Azerbaijani manat currency symbol ₼ when referring to money.
- When displaying monetary amounts, place the ₼ symbol after the number (e.g., "456 ₼", not "₼456").
- Include time-based recommendations (e.g., "By month-end", "For the remaining X days")
- Provide debt-specific advice: repayment schedules, priority debts, collection strategies

Please respond with ONLY the JSON object.`;

    try {
      const formattedPrompt = this.addFormattingInstructions(prompt);
      const response = await this.makeRequest(formattedPrompt, true);
      
      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      
      const analysisResult = JSON.parse(jsonMatch[0]);
      
      // Validate and ensure proper structure with formatted text
      return {
        summary: this.formatAIResponse(analysisResult.summary || 'Financial analysis completed successfully.'),
        insights: Array.isArray(analysisResult.insights) ? analysisResult.insights.map((insight: any) => ({
          ...insight,
          title: this.formatAIResponse(insight.title || ''),
          description: this.formatAIResponse(insight.description || ''),
          recommendation: insight.recommendation ? this.formatAIResponse(insight.recommendation) : undefined
        })) : [],
        score: typeof analysisResult.score === 'number' ? 
               Math.max(0, Math.min(100, analysisResult.score)) : 75,
        nextSteps: Array.isArray(analysisResult.nextSteps) ? 
                  analysisResult.nextSteps.map((step: any) => this.formatAIResponse(step)) : []
      };
      
    } catch (error) {
      throw error;
    }
  }

  async chatWithAI(message: string): Promise<string> {
    const financialData = this.extractUserFinancialData();
    const userName = database.getUserName();
    
    // Get all debts for chat context
    const allDebts = database.getDebts();
    const activeDebts = allDebts.filter(d => d.status === 'active');
    const activeBorrowedDebts = activeDebts.filter(d => d.type === 'got');
    const activeLentDebts = activeDebts.filter(d => d.type === 'gave');
    
    // Add user message to context
    this.chatContext.push({
      id: Date.now().toString(),
      type: 'user',
      content: message,
      timestamp: new Date()
    });
    
    // Keep only last 10 messages for context
    if (this.chatContext.length > 10) {
      this.chatContext = this.chatContext.slice(-10);
    }
    
    const prompt = `You are a personal financial advisor AI assistant for a Azerbaijani user${userName ? ` named ${userName}` : ''}. Answer their question using their actual financial data and current date/time context.

${this.getDateTimeContext()}${this.getUserContext()}

CURRENT FINANCIAL CONTEXT:
💰 Monthly Overview: Income ₼${financialData.totalIncome.toFixed(2)}, Expenses ₼${financialData.totalExpense.toFixed(2)}, Net ₼${financialData.netSavings.toFixed(2)} (${financialData.savingsRate.toFixed(1)}% savings rate)
📊 Top Spending: ${financialData.topCategories.slice(0, 4).map(cat => `${cat.name} ₼${cat.amount.toFixed(2)} (${cat.transactionCount} transactions)`).join(', ')}
🏦 Accounts: ${financialData.accountBalances.map(acc => `${acc.emoji || '💳'} ${acc.name} ₼${acc.balance.toFixed(2)}`).join(', ')}
💳 Debt Overview: You owe ₼${financialData.totalDebts.toFixed(2)} (${activeBorrowedDebts.length} active), Others owe you ₼${((financialData as any).totalOwedToUs || 0).toFixed(2)} (${activeLentDebts.length} active)
${activeDebts.length > 0 ? `📋 Active Debts: ${activeDebts.slice(0, 3).map(debt => 
  `₼${debt.amount.toFixed(2)} ${debt.type === 'got' ? 'borrowed from' : 'lent to'} ${debt.personName}${debt.dueDate ? ` (Due: ${debt.dueDate.toLocaleDateString()})` : ''}`
).join(', ')}` : ''}
📝 Recent Activity: ${financialData.recentTransactions.slice(0, 8).map(t => `${t.date}: "${t.title}" ${t.type === 'income' || t.type === 'borrowed' ? '+' : '-'}₼${t.amount.toFixed(2)} via ${t.accountName} → ${t.category}`).join(' | ')}
📈 Financial Health: Net Worth ₼${((financialData as any).netWorth || (financialData.totalAssets - financialData.totalDebts)).toFixed(2)}, Emergency Fund ${((financialData as any).emergencyFundCoverage?.toFixed(1) || 'N/A')} months
📊 Monthly Trends: ${financialData.monthlyTrend.slice(-3).map(month => `${month.month}: Income ₼${month.income.toFixed(2)}, Expenses ₼${month.expense.toFixed(2)}, Net ₼${month.net.toFixed(2)} (${month.savingsRate.toFixed(1)}% savings)`).join(' | ')}

RECENT CONVERSATION:
${this.chatContext.slice(-5).map(msg => `${msg.type.toUpperCase()}: ${msg.content}`).join('\n')}

USER QUESTION: ${message}

INSTRUCTIONS:
- Always address the user by name if available (${userName ? `call them ${userName}` : 'use a friendly tone'}).
- Use the current date/time context to provide time-aware responses (e.g., "This month you have X days left", "Since you started tracking Y months ago").
- Always prioritize the user's request or instruction, exactly as they phrased it.
- Provide helpful, personalized responses focused strictly on what the user is asking for.
- Use financial data only if it is directly necessary to fulfill the user's request.
- If the user is asking for specific information, provide that first — clearly and directly.
- Do not offer suggestions, savings tips, or analysis unless the user explicitly asks for them.
- Be concise and specific (4–8 sentences max), respond in natural, conversational tone.
- Consider Azerbaijani financial context when applicable.
- 🎯 PRIMARY GOAL: Respect and follow the user's intent precisely and only expand if invited.
- Keep the response short and clear, but not overly minimal — aim for clarity over brevity.
- Do not use generic politeness unless necessary; instead, focus on answering the user's question thoroughly.
- When needed, briefly explain the reasoning or numbers behind the answer in a direct and simple way.
- Never say "I don't know the date/time" or similar - you have complete date/time context above.
- You may occasionally use natural, respectful forms of address when appropriate, but do not overuse them.
- Do not include greetings such as "Hi", "Hello", or "Salam" and others..
- If user asks about debts, provide specific information about who owes what and when payments are due.

FORMATTING REQUIREMENTS FOR LISTS AND DATA:
- Always use the Azerbaijani manat currency symbol ₼ when referring to money.
- When displaying monetary amounts, place the ₼ symbol after the number (e.g., "456 ₼", not "₼456").
- When showing spending/categories/accounts, use bullet points (•).
- Format amounts clearly with consistent formatting
- Order by amount (highest first) when showing financial data
- Keep each line short and scannable
- Group similar information together
- For summarizing, add helpful context like "En büyük harcamalarınız X ve Y"
- Always respond in the same language the user used in their question.

Please respond naturally as a helpful and obedient financial assistant:`;

    try {
      const formattedPrompt = this.addFormattingInstructions(prompt);
      const response = await this.makeRequest(formattedPrompt, false);
      const cleanResponse = this.formatAIResponse(response);
      
      // Add AI response to context
      this.chatContext.push({
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: cleanResponse,
        timestamp: new Date()
      });
      
      return cleanResponse;
      
    } catch (error) {
      throw error;
    }
  }

  clearChatContext(): void {
    this.chatContext = [];
  }

  getChatContext(): ChatMessage[] {
    return [...this.chatContext];
  }

  // For testing and fallback scenarios
  getSampleFinancialData(): FinancialData {
    return {
      totalIncome: 4022,
      totalExpense: 624,
      netSavings: 3398,
      savingsRate: 84.5,
      topCategories: [
        { name: 'Food & Dining', amount: 324, percentage: 51.9, transactionCount: 8 },
        { name: 'Transportation', amount: 150, percentage: 24.0, transactionCount: 4 },
        { name: 'Entertainment', amount: 95, percentage: 15.2, transactionCount: 3 },
        { name: 'Shopping', amount: 55, percentage: 8.8, transactionCount: 2 }
      ],
      monthlyTrend: [
        { month: 'Jan 24', income: 3800, expense: 720, net: 3080, transactionCount: 25, avgTransactionSize: 180, savingsRate: 81.1 },
        { month: 'Feb 24', income: 3900, expense: 680, net: 3220, transactionCount: 23, avgTransactionSize: 199, savingsRate: 82.6 },
        { month: 'Mar 24', income: 4100, expense: 590, net: 3510, transactionCount: 21, avgTransactionSize: 223, savingsRate: 85.6 },
        { month: 'Apr 24', income: 4000, expense: 650, net: 3350, transactionCount: 24, avgTransactionSize: 194, savingsRate: 83.8 },
        { month: 'May 24', income: 4200, expense: 700, net: 3500, transactionCount: 26, avgTransactionSize: 188, savingsRate: 83.3 },
        { month: 'Jun 24', income: 4022, expense: 624, net: 3398, transactionCount: 22, avgTransactionSize: 211, savingsRate: 84.5 }
      ],
      accountBalances: [
        { name: 'Main Account', balance: 12500, type: 'card', emoji: '💳', color: '#00D2AA' },
        { name: 'Savings', balance: 8900, type: 'card', emoji: '💰', color: '#4CAF50' },
        { name: 'Cash', balance: 340, type: 'cash', emoji: '💵' }
      ],
      recentTransactions: [
        { date: 'Jun 15, Sat', amount: 45, title: 'Lunch at Restaurant', description: 'Business lunch', category: 'Food & Dining', categoryIcon: '🍽️', type: 'expense', accountName: 'Main Account', status: 'success' },
        { date: 'Jun 14, Fri', amount: 4022, title: 'Monthly Salary', description: 'Company payroll', category: 'Salary', categoryIcon: '💼', type: 'income', accountName: 'Main Account', status: 'success' },
        { date: 'Jun 13, Thu', amount: 120, title: 'Gas Station', description: 'Weekly fuel', category: 'Transportation', categoryIcon: '⛽', type: 'expense', accountName: 'Main Account', status: 'success' }
      ],
      totalDebts: 0,
      totalAssets: 21740,
      monthlyIncomeAverage: 4004,
      monthlyExpenseAverage: 661,
      incomeStability: 3.8,
      expenseStability: 8.2,
      emergencyFundNeeded: 1983,
      emergencyFundCoverage: 11.0,
      totalOwedToUs: 0,
      netWorth: 21740,
      debtToAssetRatio: 0,
      liquidityRatio: 32.9,
      activeDebts: [
        { id: 'd1', type: 'got', personName: 'John Doe', amount: 1000, date: new Date('2024-05-01') },
        { id: 'd2', type: 'gave', personName: 'Jane Smith', amount: 500, date: new Date('2024-04-15') }
      ],
      completedDebts: [
        { id: 'c1', type: 'got', personName: 'Alice Johnson', amount: 2000, completedDate: new Date('2024-06-15') }
      ]
    };
  }
}

export const aiService = new AIService(); 