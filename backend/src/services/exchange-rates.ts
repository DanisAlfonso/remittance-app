/**
 * Exchange Rate Service
 * 
 * Fetches real-time exchange rates using multiple APIs:
 * 1. ExchangeRate-API.com (paid subscription with API key)
 * 2. GitHub fawazahmed0/exchange-api (free, no API key)
 * 
 * Implements caching and fallback mechanisms for reliability.
 */

interface ExchangeRateResponse {
  success?: boolean;
  base?: string;
  date?: string;
  rates?: Record<string, number>;
  result?: string;
  conversion_rate?: number;
  conversion_result?: number;
}

interface ExchangeRateError {
  error: string;
  error_description: string;
}

export class ExchangeRateService {
  private readonly exchangeRateApiKey = process.env.EXCHANGE_RATE_API_KEY || 'c489362015b50ffea49f9bb4';
  private readonly exchangeRateApiUrl = 'https://v6.exchangerate-api.com/v6';
  private readonly githubApiUrl = 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies';
  
  private rateCache: Map<string, { rate: number; timestamp: number; expires: number }> = new Map();
  private readonly cacheValidityMs = 5 * 60 * 1000; // 5 minutes

  /**
   * Get current exchange rate between two currencies
   */
  async getExchangeRate(fromCurrency: string, toCurrency: string): Promise<{
    success: boolean;
    rate?: number;
    inverseRate?: number;
    source?: string;
    timestamp?: number;
    error?: ExchangeRateError;
  }> {
    try {
      const from = fromCurrency.toUpperCase();
      const to = toCurrency.toUpperCase();
      const cacheKey = `${from}-${to}`;
      const cached = this.rateCache.get(cacheKey);
      
      // Return cached rate if still valid
      if (cached && Date.now() < cached.expires) {
        console.log(`📊 [EXCHANGE-RATE] Using cached rate: ${from} → ${to} = ${cached.rate}`);
        return {
          success: true,
          rate: cached.rate,
          inverseRate: 1 / cached.rate,
          source: 'cache',
          timestamp: cached.timestamp
        };
      }

      console.log(`💱 [EXCHANGE-RATE] Fetching real-time rate: ${from} → ${to}`);

      // Try ExchangeRate-API first (paid subscription, more reliable)
      let rateResult = await this.fetchFromExchangeRateAPI(from, to);
      
      // Fallback to GitHub API if primary fails
      if (!rateResult.success) {
        console.log('⚠️  ExchangeRate-API failed, trying GitHub API...');
        rateResult = await this.fetchFromGitHubAPI(from, to);
      }

      if (!rateResult.success || !rateResult.rate) {
        throw new Error(`Exchange rate not available for ${from} → ${to}`);
      }

      const { rate, source } = rateResult;
      const inverseRate = 1 / rate;
      const timestamp = Date.now();

      // Cache the rate
      this.rateCache.set(cacheKey, {
        rate,
        timestamp,
        expires: timestamp + this.cacheValidityMs
      });

      // Also cache the inverse rate
      this.rateCache.set(`${to}-${from}`, {
        rate: inverseRate,
        timestamp,
        expires: timestamp + this.cacheValidityMs
      });

      console.log(`✅ [EXCHANGE-RATE] Fetched: 1 ${from} = ${rate} ${to} (${source})`);
      console.log(`   Inverse: 1 ${to} = ${inverseRate.toFixed(6)} ${from}`);

      return {
        success: true,
        rate,
        inverseRate,
        source,
        timestamp
      };

    } catch (error) {
      console.error(`❌ [EXCHANGE-RATE] Failed to get rate ${fromCurrency} → ${toCurrency}:`, error);
      
      return {
        success: false,
        error: {
          error: 'EXCHANGE_RATE_FETCH_FAILED',
          error_description: `Failed to fetch exchange rate for ${fromCurrency} to ${toCurrency}: ${error instanceof Error ? error.message : 'Unknown error'}`
        }
      };
    }
  }

  /**
   * Fetch from ExchangeRate-API.com (primary source - paid subscription)
   */
  private async fetchFromExchangeRateAPI(fromCurrency: string, toCurrency: string): Promise<{
    success: boolean;
    rate?: number;
    source?: string;
  }> {
    try {
      console.log(`🔗 [EXCHANGE-RATE] Calling ExchangeRate-API: ${fromCurrency} → ${toCurrency}`);
      
      const url = `${this.exchangeRateApiUrl}/${this.exchangeRateApiKey}/pair/${fromCurrency}/${toCurrency}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json() as ExchangeRateResponse;
      
      if (data.result === 'success' && data.conversion_rate) {
        return {
          success: true,
          rate: data.conversion_rate,
          source: 'exchangerate-api.com'
        };
      } else {
        throw new Error(`API returned result: ${data.result}`);
      }
    } catch (error) {
      console.error('❌ ExchangeRate-API failed:', error);
      return { success: false };
    }
  }

  /**
   * Fetch from GitHub fawazahmed0/exchange-api (fallback source - free)
   */
  private async fetchFromGitHubAPI(fromCurrency: string, toCurrency: string): Promise<{
    success: boolean;
    rate?: number;
    source?: string;
  }> {
    try {
      console.log(`🔗 [EXCHANGE-RATE] Calling GitHub API: ${fromCurrency} → ${toCurrency}`);
      
      const from = fromCurrency.toLowerCase();
      const to = toCurrency.toLowerCase();
      const url = `${this.githubApiUrl}/${from}.json`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data[from] && data[from][to]) {
        return {
          success: true,
          rate: data[from][to],
          source: 'github.com/fawazahmed0'
        };
      } else {
        throw new Error(`Currency pair ${from}/${to} not found in response`);
      }
    } catch (error) {
      console.error('❌ GitHub API failed:', error);
      return { success: false };
    }
  }

  /**
   * Convert amount from one currency to another
   */
  async convertCurrency(
    amount: number,
    fromCurrency: string,
    toCurrency: string
  ): Promise<{
    success: boolean;
    convertedAmount?: number;
    rate?: number;
    originalAmount?: number;
    fromCurrency?: string;
    toCurrency?: string;
    timestamp?: number;
    source?: string;
    error?: ExchangeRateError;
  }> {
    if (fromCurrency.toUpperCase() === toCurrency.toUpperCase()) {
      return {
        success: true,
        convertedAmount: amount,
        rate: 1,
        originalAmount: amount,
        fromCurrency: fromCurrency.toUpperCase(),
        toCurrency: toCurrency.toUpperCase(),
        timestamp: Date.now(),
        source: 'same-currency'
      };
    }

    const rateResult = await this.getExchangeRate(fromCurrency, toCurrency);
    
    if (!rateResult.success || !rateResult.rate) {
      return {
        success: false,
        error: rateResult.error
      };
    }

    const convertedAmount = amount * rateResult.rate;

    console.log(`💰 [CONVERSION] ${amount} ${fromCurrency.toUpperCase()} = ${convertedAmount.toFixed(2)} ${toCurrency.toUpperCase()}`);

    return {
      success: true,
      convertedAmount,
      rate: rateResult.rate,
      originalAmount: amount,
      fromCurrency: fromCurrency.toUpperCase(),
      toCurrency: toCurrency.toUpperCase(),
      timestamp: rateResult.timestamp,
      source: rateResult.source
    };
  }

  /**
   * Get exchange rates for EUR and HNL specifically (for OBP-API configuration)
   */
  async getEURHNLRates(): Promise<{
    success: boolean;
    eurToHnl?: number;
    hnlToEur?: number;
    source?: string;
    timestamp?: number;
    error?: ExchangeRateError;
  }> {
    try {
      const rateResult = await this.getExchangeRate('EUR', 'HNL');
      
      if (!rateResult.success) {
        return {
          success: false,
          error: rateResult.error
        };
      }

      return {
        success: true,
        eurToHnl: rateResult.rate,
        hnlToEur: rateResult.inverseRate,
        source: rateResult.source,
        timestamp: rateResult.timestamp
      };
    } catch (error) {
      return {
        success: false,
        error: {
          error: 'EUR_HNL_RATE_FAILED',
          error_description: `Failed to get EUR/HNL rates: ${error instanceof Error ? error.message : 'Unknown error'}`
        }
      };
    }
  }

  /**
   * Clear exchange rate cache
   */
  clearCache(): void {
    this.rateCache.clear();
    console.log('🗑️  [EXCHANGE-RATE] Cache cleared');
  }

  /**
   * Get cache status for debugging
   */
  getCacheStatus(): {
    size: number;
    entries: Array<{
      pair: string;
      rate: number;
      age: number;
      expiresIn: number;
    }>;
  } {
    const now = Date.now();
    const entries = Array.from(this.rateCache.entries()).map(([pair, data]) => ({
      pair,
      rate: data.rate,
      age: now - data.timestamp,
      expiresIn: data.expires - now
    }));

    return {
      size: this.rateCache.size,
      entries
    };
  }
}

// Export singleton instance
export const exchangeRateService = new ExchangeRateService();