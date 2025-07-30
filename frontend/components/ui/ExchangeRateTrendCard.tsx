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
  hideDataPoint?: boolean;
}

export const ExchangeRateTrendCard: React.FC = () => {
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [currentRate, setCurrentRate] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingCurrentRate, setLoadingCurrentRate] = useState(true);
  // const [tooltipPosition, setTooltipPosition] = useState(40); // Unused - percentage from left
  const [stats, setStats] = useState({
    change: 0,
    changePercent: 0,
    trend: 'stable' as 'up' | 'down' | 'stable',
    highest: 0,
    lowest: 0,
    average: 0,
  });
  const [error, setError] = useState<string | null>(null);
  

  // Fetch current live exchange rate using ExchangeRate-API (independent of period)
  const fetchCurrentRate = async () => {
    setLoadingCurrentRate(true);
    try {
      const response = await fetch('https://v6.exchangerate-api.com/v6/277a4201a5eca527be7d2a0b/latest/EUR');
      if (response.ok) {
        const data = await response.json();
        if (data.conversion_rates?.HNL) {
          setCurrentRate(data.conversion_rates.HNL);
        } else {
          setCurrentRate(30.8);
        }
      } else {
        setCurrentRate(30.8);
      }
    } catch {
      setCurrentRate(30.8);
    } finally {
      setLoadingCurrentRate(false);
    }
  };

  const fetchTrendData = async () => {
    setError(null);
    
    // Always use monthly data (30 days)
    const days = 30;
    const cacheKey = `real_api_${days}d`;
    const hasCachedData = await exchangeRateHistoryService.hasCachedData(cacheKey);
    
    // Only show loading if we don't have cached data
    if (!hasCachedData) {
      setLoading(true);
    }
    
    try {
      const response = await exchangeRateHistoryService.getMonthlyTrend();
      
      if (response.success && response.data) {
        // Transform data for the chart - only show data point for today
        const chartData: TrendData[] = response.data!.map((item, index) => {
          const isToday = index === response.data!.length - 1;
          return {
            value: item.rate,
            label: '',
            originalDate: item.date,
            originalRate: item.rate,
            hideDataPoint: !isToday,
          };
        });
        
        setTrendData(chartData);
        
        const calculatedStats = exchangeRateHistoryService.calculateTrendStats(response.data);
        setStats({
          ...calculatedStats,
          trend: calculatedStats.trend as 'up' | 'down' | 'stable'
        });
      } else {
        setError(response.error || 'Failed to fetch exchange rate data');
      }
    } catch {
      setError('Unable to load exchange rate trend');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initializeWithRealData = async () => {
      fetchCurrentRate();
      fetchTrendData();
    };
    
    initializeWithRealData();
  }, []);

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
          
          {/* No period toggle - 1M only */}
          <View style={styles.periodLabel}>
            <Text style={styles.periodLabelText}>1M</Text>
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
            <Text style={styles.periodDescription}>
              Past month
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
                onPress={() => fetchTrendData()}
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
                  // const topPadding = Math.max(range * 0.5, 0.2); // Unused
                  const bottomPadding = Math.max(range * 0.5, 0.2);
                  const baseline = Math.max(0, min - bottomPadding);
                  
                  // Transform data relative to baseline for better Y-axis scaling
                  const transformedData = trendData.map((item) => ({
                    ...item,
                    value: item.value - baseline,
                    originalValue: item.value,
                    label: '',
                  }));
                  
                  return transformedData;
                })()}
                width={screenWidth - 80} // Use more screen space, minimal margins
                height={200}
                adjustToWidth={true} // Let chart adjust properly
                
                // Smooth line chart like real finance apps (Apple Stocks, Trading212, etc.)
                areaChart={true}
                curved={true} // Smooth curves like professional finance apps
                isAnimated={true}
                animationDuration={800}
                
                // Disable constant data point text display
                showValuesAsDataPointsText={false}
                
                // Line styling - reduced thickness for smoother appearance
                color={getTrendColor()}
                thickness={2}
                
                // Show only today's data point using color array approach
                hideDataPoints={false}
                dataPointsColor={trendData.map((_, index) => {
                  const isToday = index === trendData.length - 1;
                  return isToday ? getTrendColor() : 'transparent';
                }).join(',')}
                dataPointsRadius={6}
                dataPointsHeight={12}
                dataPointsWidth={12}
                
                // Chart spacing and layout configuration
                interpolateMissingValues={false}
                // Fit all data points without scrolling
                spacing={(() => {
                  const availableWidth = screenWidth - 80 - 60; // Account for Y-axis labels and margins
                  const dataPoints = trendData.length;
                  if (dataPoints <= 1) { return 50; } // Default spacing for single point
                  
                  // Calculate spacing to fit all points without scrolling
                  const calculatedSpacing = Math.floor(availableWidth / (dataPoints - 1));
                  
                  // Allow smaller spacing for 1M view to fit all data
                  return Math.max(8, calculatedSpacing); // Minimum 8px instead of 20px
                })()}
                initialSpacing={5}
                endSpacing={5}
                
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
                  dynamicLegendComponent: (items: Array<{ originalDate?: string; originalRate?: number }>) => {
                    console.log('🎯 Dynamic legend triggered with items:', items);
                    
                    if (!items || items.length === 0) {
                      return null;
                    }
                    
                    const item = items[0];
                    
                    // Access the original data directly from the item
                    if (item?.originalDate && item?.originalRate) {
                      const isToday = new Date(item.originalDate).toDateString() === new Date().toDateString();
                      
                      return (
                        <View style={styles.fixedTooltipContainer}>
                          <Text style={styles.tooltipSingleLine}>
                            {item.originalRate.toFixed(2)} HNL • {isToday ? 'Today' : new Date(item.originalDate).toLocaleDateString('en-US', { 
                              weekday: 'short',
                              month: 'short', 
                              day: 'numeric' 
                            })}
                            {isToday && (
                              <Text style={styles.todayBadge}> LIVE</Text>
                            )}
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
  periodLabel: {
    backgroundColor: '#1E40AF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  periodLabelText: {
    fontSize: 14,
    fontWeight: '600',
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
  periodDescription: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  chartSection: {
    marginVertical: 16,
    marginHorizontal: 4, // Reduced margin to use more screen space
    alignItems: 'center',
    overflow: 'hidden',
  },
  chartWrapper: {
    width: '100%',
    alignItems: 'center',
    overflow: 'hidden', // Prevent any overflow
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
  // Today badge in tooltip
  todayBadge: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  // Single data point for today only (minimalist design)
  todayOnlyDataPoint: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
});
