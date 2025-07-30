/**
 * Exchange Rate History Service
 * 
 * Fetches historical exchange rate data for EUR-HNL trends
 * Uses ExchangeRate-API for real historical data with 6-hour caching
 */

import * as SecureStore from 'expo-secure-store';

interface HistoricalRateData {
  date: string;
  rate: number;
  timestamp: number;
}

interface HistoricalResponse {
  success: boolean;
  data?: HistoricalRateData[];
  error?: string;
}

export class ExchangeRateHistoryService {
  // ExchangeRate-API for real historical data
  private readonly apiKey = '277a4201a5eca527be7d2a0b';
  private readonly baseUrl = 'https://v6.exchangerate-api.com/v6';
  
  // Cache to reduce API usage and preserve credits
  private cache = new Map<string, { data: HistoricalRateData[], timestamp: number }>();
  private readonly cacheValidityHours = 6; // Cache data for 6 hours to preserve API credits
  
  /**
   * Load cached data from persistent storage (expo-secure-store)
   */
  private async loadFromPersistentCache(cacheKey: string): Promise<{ data: HistoricalRateData[], timestamp: number } | null> {
    try {
      const stored = await SecureStore.getItemAsync(`exchange_cache_${cacheKey}`);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.warn('Failed to load persistent cache:', error);
    }
    return null;
  }

  /**
   * Save data to persistent storage (expo-secure-store)
   */
  private async saveToPersistentCache(cacheKey: string, data: HistoricalRateData[]): Promise<void> {
    try {
      const cacheData = {
        data,
        timestamp: Date.now()
      };
      await SecureStore.setItemAsync(`exchange_cache_${cacheKey}`, JSON.stringify(cacheData));
      
      // Also store in memory cache
      this.cache.set(cacheKey, cacheData);
    } catch (error) {
      console.warn('Failed to save persistent cache:', error);
      
      // Fallback to memory cache only
      this.cache.set(cacheKey, { data, timestamp: Date.now() });
    }
  }

  /**
   * Check if cached data is still valid (checks both memory and persistent cache)
   */
  private async isCacheValid(cacheKey: string): Promise<boolean> {
    // Check memory cache first
    let cached = this.cache.get(cacheKey);
    
    // If not in memory, try persistent cache
    if (!cached) {
      const persistentCached = await this.loadFromPersistentCache(cacheKey);
      if (persistentCached) {
        // Restore to memory cache
        cached = persistentCached;
        this.cache.set(cacheKey, persistentCached);
      }
    }
    
    if (!cached) {
      return false;
    }
    
    const cacheAge = Date.now() - cached.timestamp;
    const maxAge = this.cacheValidityHours * 60 * 60 * 1000; // Convert hours to milliseconds
    return cacheAge < maxAge;
  }

  /**
   * Public method to check if we have valid cached data (for UI optimization)
   */
  async hasCachedData(cacheKey: string): Promise<boolean> {
    return this.isCacheValid(cacheKey);
  }

  /**
   * Store current real rate for building historical database
   */
  private async storeCurrentRateForHistory(currentRate: number): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const todayKey = `daily_rate_${today}`;
      
      // Store today's rate if we don't have it yet
      const existingRate = await SecureStore.getItemAsync(todayKey);
      if (!existingRate) {
        await SecureStore.setItemAsync(todayKey, JSON.stringify({
          date: today,
          rate: currentRate,
          timestamp: Date.now()
        }));
      }
    } catch (error) {
      console.warn('Failed to store current rate for history:', error);
    }
  }

  /**
   * Load previously stored real rates to build historical chart
   */
  private async loadStoredHistoricalRates(days: number): Promise<HistoricalRateData[]> {
    const rates: HistoricalRateData[] = [];
    const today = new Date();
    
    try {
      for (let i = 0; i < days; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const dayKey = `daily_rate_${dateStr}`;
        
        const storedRate = await SecureStore.getItemAsync(dayKey);
        if (storedRate) {
          const rateData = JSON.parse(storedRate);
          rates.unshift({
            date: dateStr,
            rate: rateData.rate,
            timestamp: date.getTime()
          });
        }
      }
      
      
    } catch (error) {
      console.warn('Failed to load stored historical rates:', error);
    }
    
    return rates;
  }

  /**
   * Force clear cache to get fresh API data (for testing/debugging)
   */
  async clearCache(): Promise<void> {
    this.cache.clear();
    
    try {
      const cacheKeys = [
        'exchange_cache_real_api_7d',
        'exchange_cache_real_api_30d',
        'exchange_cache_optimized_7d',
        'exchange_cache_optimized_30d',
        'exchange_cache_real_api_365d'
      ];
      
      for (const key of cacheKeys) {
        await SecureStore.deleteItemAsync(key);
      }
      
    } catch (error) {
      console.warn('⚠️ Error clearing persistent cache:', error);
    }
  }

  /**
   * Get historical exchange rates for the past N days
   */
  async getHistoricalRates(days: number = 7): Promise<HistoricalResponse> {
    const cacheKey = `real_api_${days}d`;
    
    // Check cache first to reduce API usage and preserve credits
    const isCacheValidResult = await this.isCacheValid(cacheKey);
    
    if (isCacheValidResult) {
      const cached = this.cache.get(cacheKey) || await this.loadFromPersistentCache(cacheKey);
      if (cached) {
        return {
          success: true,
          data: cached.data
        };
      }
    }
    
    try {
      const rates: HistoricalRateData[] = [];
      const today = new Date();
      
      // Get current rate first for the most recent data point
      const currentRateResponse = await fetch(`${this.baseUrl}/${this.apiKey}/latest/EUR`);
      if (!currentRateResponse.ok) {
        throw new Error(`ExchangeRate-API current rate failed: ${currentRateResponse.status}`);
      }
      
      const currentData = await currentRateResponse.json();
      const currentRate = currentData.conversion_rates?.HNL;
      
      if (!currentRate) {
        throw new Error('HNL rate not found in current API response');
      }
      
      for (let i = 0; i < days; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        
        const year = date.getFullYear();
        const month = date.getMonth() + 1; // JavaScript months are 0-indexed
        const day = date.getDate();
        const dateStr = date.toISOString().split('T')[0];
        
        try {
          let rate: number;
          
          if (i === 0) {
            // Today: use current rate for most up-to-date data
            rate = currentRate;
          } else {
            // Historical dates: use correct API format
            const historicalUrl = `${this.baseUrl}/${this.apiKey}/history/EUR/${year}/${month}/${day}`;
            
            const historicalResponse = await fetch(historicalUrl);
            
            if (historicalResponse.ok) {
              const historicalData = await historicalResponse.json();
              rate = historicalData.conversion_rates?.HNL || currentRate;
            } else {
              rate = currentRate; // Fallback to current rate
            }
          }
          
          rates.unshift({ // Add to beginning to maintain chronological order
            date: dateStr,
            rate: Math.round(rate * 10000) / 10000, // 4 decimal places
            timestamp: date.getTime()
          });
          
          // Add small delay between API calls to be respectful
          if (i > 0 && i < days - 1) {
            await new Promise(resolve => setTimeout(resolve, 200));
          }
          
        } catch {
          // Fallback to current rate
          rates.unshift({
            date: dateStr,
            rate: Math.round(currentRate * 10000) / 10000,
            timestamp: date.getTime()
          });
        }
      }
      
      // Cache the real API data with persistent storage
      await this.saveToPersistentCache(cacheKey, rates);
      
      return {
        success: true,
        data: rates
      };
      
    } catch (error) {
      console.error('Error fetching real exchange rates from ExchangeRate-API:', error);
      
      return {
        success: false,
        error: `Failed to fetch real exchange rates: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
  
  
  /**
   * Get exchange rate trend for past week (7 days)
   */
  async getWeeklyTrend(): Promise<HistoricalResponse> {
    return this.getHistoricalRates(7);
  }
  
  /**
   * Get exchange rate trend for past month (30 days)
   */
  async getMonthlyTrend(): Promise<HistoricalResponse> {
    return this.getHistoricalRates(30);
  }
  
  /**
   * Get exchange rate trend for past year (365 days)
   */
  async getYearlyTrend(): Promise<HistoricalResponse> {
    return this.getHistoricalRates(365);
  }
  
  /**
   * Calculate trend statistics
   */
  calculateTrendStats(data: HistoricalRateData[]) {
    if (data.length < 2) {
      return {
        change: 0,
        changePercent: 0,
        trend: 'stable' as const,
        highest: 0,
        lowest: 0,
        average: 0
      };
    }
    
    const rates = data.map(d => d.rate);
    const first = rates[0];
    const last = rates[rates.length - 1];
    const change = last - first;
    const changePercent = (change / first) * 100;
    
    const highest = Math.max(...rates);
    const lowest = Math.min(...rates);
    const average = rates.reduce((sum, rate) => sum + rate, 0) / rates.length;
    
    const trend = changePercent > 0.1 ? 'up' : changePercent < -0.1 ? 'down' : 'stable';
    
    return {
      change: Math.round(change * 10000) / 10000,
      changePercent: Math.round(changePercent * 100) / 100,
      trend,
      highest: Math.round(highest * 10000) / 10000,
      lowest: Math.round(lowest * 10000) / 10000,
      average: Math.round(average * 10000) / 10000
    };
  }
}

export const exchangeRateHistoryService = new ExchangeRateHistoryService();