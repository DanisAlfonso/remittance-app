import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { Ionicons } from '@expo/vector-icons';
import { exchangeRateHistoryService } from '../../lib/exchangeRateHistory';

const { width: screenWidth } = Dimensions.get('window');

interface TrendData {
  value: number;
  originalValue?: number;
  originalDate?: string;
  originalRate?: number;
  label?: string;
  focused?: boolean;
}

type TimePeriod = '1w' | '1m';

export const ExchangeRateTrendCard: React.FC = () => {
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('1w');
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [currentRate, setCurrentRate] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingCurrentRate, setLoadingCurrentRate] = useState(true);
  const [tooltipPosition, setTooltipPosition] = useState(40); // Percentage from left
  const [stats, setStats] = useState({
    change: 0,
    changePercent: 0,
    trend: 'stable' as 'up' | 'down' | 'stable',
    highest: 0,
    lowest: 0,
    average: 0,
  });
  const [error, setError] = useState<string | null>(null);

  // Fetch current live exchange rate (independent of period)
  const fetchCurrentRate = async () => {
    setLoadingCurrentRate(true);
    try {
      const response = await fetch('https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/eur.json');
      if (response.ok) {
        const data = await response.json();
        if (data.eur?.hnl) {
          setCurrentRate(data.eur.hnl);
        } else {
          // Fallback rate if API structure is different
          setCurrentRate(30.8);
        }
      } else {
        setCurrentRate(30.8); // Fallback rate
      }
    } catch (error) {
      console.warn('Could not fetch current rate, using fallback:', error);
      setCurrentRate(30.8); // Fallback rate
    } finally {
      setLoadingCurrentRate(false);
    }
  };

  const fetchTrendData = async (period: TimePeriod) => {
    setError(null);
    
    // Check if we have cached data first to avoid unnecessary loading state
    const days = period === '1w' ? 7 : 30;
    const cacheKey = `optimized_${days}d`;
    const hasCachedData = exchangeRateHistoryService.hasCachedData(cacheKey);
    
    // Only show loading if we don't have cached data
    if (!hasCachedData) {
      setLoading(true);
    }
    
    try {
      const response = period === '1w' 
        ? await exchangeRateHistoryService.getWeeklyTrend()
        : await exchangeRateHistoryService.getMonthlyTrend();
      
      if (response.success && response.data) {
        const expectedCount = period === '1w' ? 7 : 30;
        console.log(`📊 Chart received ${response.data.length} data points for ${period} (expected ${expectedCount})`);
        // Removed detailed data point logging for performance
        
        // Transform data for the chart
        const chartData: TrendData[] = response.data.map((item) => ({
          value: item.rate,
          label: '', // No labels by default
          // Store original data for tap handling without displaying
          originalDate: item.date,
          originalRate: item.rate,
        }));
        
        console.log(`🎯 Created ${chartData.length} chart data points from ${response.data.length} API data points`);
        
        setTrendData(chartData);
        
        // Don't update current rate from historical data - keep it independent
        
        const calculatedStats = exchangeRateHistoryService.calculateTrendStats(response.data);
        setStats({
          ...calculatedStats,
          trend: calculatedStats.trend as 'up' | 'down' | 'stable'
        });
      } else {
        setError(response.error || 'Failed to fetch exchange rate data');
      }
    } catch (err) {
      setError('Unable to load exchange rate trend');
      console.error('Exchange rate trend error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Fetch current rate only once on component mount
    fetchCurrentRate();
  }, []);

  useEffect(() => {
    fetchTrendData(selectedPeriod);
  }, [selectedPeriod]);

  const getTrendIcon = () => {
    switch (stats.trend) {
      case 'up':
        return <Ionicons name="trending-up" size={20} color="#10B981" />;
      case 'down':
        return <Ionicons name="trending-down" size={20} color="#EF4444" />;
      default:
        return <Ionicons name="remove" size={20} color="#8B5CF6" />;
    }
  };

  const getTrendColor = () => {
    switch (stats.trend) {
      case 'up':
        return '#10B981';
      case 'down':
        return '#EF4444';
      default:
        return '#8B5CF6';
    }
  };


  return (
    <View style={styles.card}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Ionicons name="analytics" size={24} color="#1E40AF" />
            <Text style={styles.title}>EUR → HNL</Text>
          </View>
          
          {/* Period Toggle */}
          <View style={styles.periodToggle}>
            <Pressable
              style={[
                styles.periodButton,
                selectedPeriod === '1w' && styles.periodButtonActive
              ]}
              onPress={() => setSelectedPeriod('1w')}
            >
              <Text style={[
                styles.periodButtonText,
                selectedPeriod === '1w' && styles.periodButtonTextActive
              ]}>1W</Text>
            </Pressable>
            <Pressable
              style={[
                styles.periodButton,
                selectedPeriod === '1m' && styles.periodButtonActive
              ]}
              onPress={() => setSelectedPeriod('1m')}
            >
              <Text style={[
                styles.periodButtonText,
                selectedPeriod === '1m' && styles.periodButtonTextActive
              ]}>1M</Text>
            </Pressable>
          </View>
        </View>

        {/* Current Rate & Trend */}
        <View style={styles.statsContainer}>
          <View style={styles.currentRate}>
            <View style={styles.liveRateContainer}>
              <Text style={styles.rateValue}>
                {loadingCurrentRate ? '---' : currentRate ? currentRate.toFixed(2) : '---'}
              </Text>
              <View style={styles.liveIndicator}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>LIVE</Text>
              </View>
            </View>
            <Text style={styles.rateLabel}>HNL per EUR</Text>
          </View>
          
          <View style={styles.trendStats}>
            <View style={styles.trendIndicator}>
              {getTrendIcon()}
              <Text style={[styles.changeText, { color: getTrendColor() }]}>
                {stats.changePercent > 0 ? '+' : ''}{stats.changePercent.toFixed(2)}%
              </Text>
            </View>
            <Text style={styles.periodLabel}>
              {selectedPeriod === '1w' ? 'Past week' : 'Past month'}
            </Text>
          </View>
        </View>

        {/* Chart */}
        <View style={styles.chartSection}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#1E40AF" />
              <Text style={styles.loadingText}>Loading exchange rate data...</Text>
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={24} color="#EF4444" />
              <Text style={styles.errorText}>{error}</Text>
              <Pressable 
                style={styles.retryButton}
                onPress={() => fetchTrendData(selectedPeriod)}
              >
                <Text style={styles.retryButtonText}>Retry</Text>
              </Pressable>
            </View>
          ) : trendData.length > 0 ? (
            <View style={styles.chartWrapper}>
              <LineChart
                data={(() => {
                  const values = trendData.map(d => d.value);
                  const min = Math.min(...values);
                  const max = Math.max(...values);
                  const range = max - min;
                  // Increased padding to reduce dramatic fluctuations: 50% both sides
                  const topPadding = Math.max(range * 0.5, 0.2);
                  const bottomPadding = Math.max(range * 0.5, 0.2);
                  const baseline = Math.max(0, min - bottomPadding);
                  
                  // Transform data relative to baseline for better Y-axis scaling
                  const transformedData = trendData.map((item) => ({
                    ...item,
                    value: item.value - baseline,
                    originalValue: item.value,
                    label: '',
                  }));
                  
                  console.log(`📈 Transformed ${transformedData.length} data points for chart rendering`);
                  
                  return transformedData;
                })()}
                width={screenWidth - 122} // Match the internal margin of other card elements
                height={200}
                adjustToWidth={true} // Let chart adjust to show all points
                
                // Area Chart Configuration with straight lines
                areaChart={true}
                curved={false}
                isAnimated={true}
                animationDuration={1200}
                
                // Disable constant data point text display
                showValuesAsDataPointsText={false}
                
                // Line styling - reduced thickness for smoother appearance
                color={getTrendColor()}
                thickness={2}
                
                // Improved data points positioning and appearance
                hideDataPoints={false}
                dataPointsColor={getTrendColor()}
                dataPointsRadius={4}
                dataPointsHeight={8}
                dataPointsWidth={8}
                dataPointsShape="circular"
                // Ensure smooth rendering and proper alignment
                curved={false}
                interpolateMissingValues={false}
                // Remove forced spacing to let chart handle naturally
                // spacing={50}
                initialSpacing={0}
                endSpacing={0}
                
                // Area fill gradient
                startFillColor={getTrendColor()}
                endFillColor={getTrendColor()}
                startOpacity={0.3}
                endOpacity={0.05}
                backgroundColor="transparent"
                
                // Y-axis configuration with increased range to smooth fluctuations
                maxValue={(() => {
                  const values = trendData.map(d => d.value);
                  const max = Math.max(...values);
                  const min = Math.min(...values);
                  const range = max - min;
                  const topPadding = Math.max(range * 0.5, 0.2);
                  const bottomPadding = Math.max(range * 0.5, 0.2);
                  return range + topPadding + bottomPadding;
                })()}
                noOfSections={4}
                
                // Custom Y-axis labels with increased range
                yAxisLabelTexts={(() => {
                  const values = trendData.map(d => d.value);
                  const min = Math.min(...values);
                  const max = Math.max(...values);
                  const range = max - min;
                  const topPadding = Math.max(range * 0.5, 0.2);
                  const bottomPadding = Math.max(range * 0.5, 0.2);
                  const baseline = Math.max(0, min - bottomPadding);
                  const totalRange = range + topPadding + bottomPadding;
                  
                  const labels = [];
                  for (let i = 0; i <= 4; i++) {
                    const value = baseline + (totalRange * i / 4);
                    labels.push(value.toFixed(2));
                  }
                  return labels;
                })()}
                
                // Professional grid and axis styling
                hideRules={false}
                rulesType="dashed"
                rulesColor="#D1D5DB"
                rulesThickness={1}
                dashWidth={3}
                dashGap={3}
                hideYAxisText={false}
                yAxisColor="#F3F4F6"
                xAxisColor="#F3F4F6"
                yAxisThickness={1}
                xAxisThickness={1}
                yAxisTextStyle={styles.axisText}
                yAxisTextNumberOfLines={1}
                yAxisLabelWidth={35}
                
                // Proper pointerConfig based on official documentation
                pointerConfig={{
                  // Enable tap-only activation to maintain scrolling
                  activatePointersOnLongPress: true,
                  activatePointersDelay: 100,
                  
                  // Pointer appearance
                  radius: 6,
                  pointer1Color: '#FFFFFF',
                  pointerStripHeight: 220,
                  pointerStripColor: '#9CA3AF',
                  pointerStripWidth: 1,
                  strokeDashArray: [2, 4],
                  
                  // Keep pointer visible after interaction
                  persistPointer: false,
                  
                  // Enable touch events for tooltip
                  pointerEvents: 'auto',
                  
                  // Fixed positioning - tooltip always appears at same location
                  autoAdjustPointerLabelPosition: false,
                  
                  // Simple fixed position tooltip that always works
                  dynamicLegendComponent: (items: any[]) => {
                    console.log('🎯 Dynamic legend triggered with items:', items);
                    
                    if (!items || items.length === 0) {
                      return null;
                    }
                    
                    const item = items[0];
                    
                    // Access the original data directly from the item
                    if (item?.originalDate && item?.originalRate) {
                      return (
                        <View style={styles.fixedTooltipContainer}>
                          <Text style={styles.tooltipSingleLine}>
                            {item.originalRate.toFixed(2)} HNL • {new Date(item.originalDate).toLocaleDateString('en-US', { 
                              weekday: 'short',
                              month: 'short', 
                              day: 'numeric' 
                            })}
                          </Text>
                        </View>
                      );
                    }
                    
                    return null;
                  },
                  
                  // Fixed safe position that never gets cut off
                  dynamicLegendContainerStyle: {
                    position: 'absolute',
                    top: 20,
                    left: 30, // Fixed pixel position - safe from left edge
                    zIndex: 1000,
                  },
                }}
                
                // Disable focus interaction to prevent constant tooltip
                focusEnabled={false}
                showDataPointOnFocus={false}
                showStripOnFocus={false}
              />
            </View>
          ) : (
            <View style={styles.noDataContainer}>
              <Ionicons name="bar-chart" size={48} color="#9CA3AF" />
              <Text style={styles.noDataText}>No data available</Text>
            </View>
          )}
        </View>

        {/* Summary Stats */}
        {!loading && !error && trendData.length > 0 && (
          <View style={styles.summaryStats}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>High</Text>
              <Text style={styles.statValue}>{stats.highest.toFixed(2)}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Low</Text>
              <Text style={styles.statValue}>{stats.lowest.toFixed(2)}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Avg</Text>
              <Text style={styles.statValue}>{stats.average.toFixed(2)}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Change</Text>
              <Text style={[styles.statValue, { color: getTrendColor() }]}>
                {stats.change > 0 ? '+' : ''}{stats.change.toFixed(2)}
              </Text>
            </View>
          </View>
        )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginBottom: 24,
    padding: 24,
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  periodToggle: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 2,
  },
  periodButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    minWidth: 35,
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: '#1E40AF',
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  periodButtonTextActive: {
    color: '#FFFFFF',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  currentRate: {
    flex: 1,
  },
  liveRateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  liveText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#047857',
    letterSpacing: 0.5,
  },
  rateValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1F2937',
  },
  rateLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  trendStats: {
    alignItems: 'flex-end',
  },
  trendIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  changeText: {
    fontSize: 16,
    fontWeight: '700',
  },
  periodLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  chartSection: {
    marginVertical: 16,
    alignItems: 'center',
  },
  chartWrapper: {
    width: '100%',
    alignItems: 'center',
  },
  timelineContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingHorizontal: 20,
  },
  timelineLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  loadingContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
  },
  errorContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  errorText: {
    fontSize: 14,
    color: '#EF4444',
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#1E40AF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  noDataContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  noDataText: {
    fontSize: 16,
    color: '#9CA3AF',
  },
  axisText: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  dataPointLabel: {
    backgroundColor: '#1F2937',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  dataPointText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  focusDataPoint: {
    backgroundColor: '#1E40AF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  focusDateText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  focusValueText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
  },
  googlePointerLabel: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minWidth: 120,
    position: 'absolute',
    top: -60,
    zIndex: 1000,
  },
  pointerArrow: {
    position: 'absolute',
    bottom: -6,
    width: 12,
    height: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderTopWidth: 0,
    borderLeftWidth: 0,
    transform: [{ rotate: '45deg' }],
  },
  googlePointerDate: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  googlePointerValue: {
    color: '#1F2937',
    fontSize: 16,
    fontWeight: '700',
  },
  pointerLabel: {
    backgroundColor: '#1F2937',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  pointerDate: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  pointerValue: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  tooltipContainer: {
    backgroundColor: '#1F2937',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 12,
    minWidth: 180,
    maxWidth: 200,
    borderWidth: 1,
    borderColor: '#374151',
    position: 'absolute',
    top: 20,
    zIndex: 1000,
  },
  tooltipDate: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 2,
  },
  tooltipValue: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  tooltipSingleLine: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  fixedTooltipContainer: {
    backgroundColor: '#1F2937',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 12,
    minWidth: 180,
    maxWidth: 200,
    borderWidth: 1,
    borderColor: '#374151',
  },
});
