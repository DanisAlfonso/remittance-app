import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { transferService } from '../../lib/transfer';

interface TransferProcessingProps {
  amount: string;
  currency: string;
  recipientName: string;
  transferId?: string;
  onComplete: () => void;
}

const TransferProcessing: React.FC<TransferProcessingProps> = ({
  amount,
  currency,
  recipientName,
  transferId,
  onComplete,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0.8));
  const [progressAnim] = useState(new Animated.Value(0));
  const [useRealStatusUpdates] = useState(!!transferId);

  const steps = [
    { 
      title: 'Initiating Transfer...', 
      description: 'Creating quote and validating recipient details',
      duration: 1500,
      wiseStatus: 'processing'
    },
    { 
      title: 'Converting Currency...', 
      description: 'Processing exchange and calculating fees',
      duration: 2000,
      wiseStatus: 'funds_converted'
    },
    { 
      title: 'Sending Payment...', 
      description: 'Transfer sent to recipient bank',
      duration: 2500,
      wiseStatus: 'outgoing_payment_sent'
    },
    { 
      title: 'Transfer Complete!', 
      description: 'Money successfully delivered',
      duration: 1500,
      wiseStatus: 'incoming_payment_sent'
    },
  ];

  useEffect(() => {
    // Initial animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }),
    ]).start();

    if (useRealStatusUpdates && transferId) {
      // Use real Wise API status simulation for enhanced realism
      console.log('🎯 Using real transfer status simulation');
      simulateRealTransferProgress();
    } else {
      // Fallback to mock progression
      console.log('🎭 Using mock transfer progression');
      simulateMockTransferProgress();
    }
  }, []);

  const simulateRealTransferProgress = async () => {
    if (!transferId) {
      return;
    }
    
    try {
      let stepIndex = 0;
      
      for (const step of steps) {
        setCurrentStep(stepIndex);
        
        // Animate progress bar
        Animated.timing(progressAnim, {
          toValue: (stepIndex + 1) / steps.length,
          duration: step.duration,
          useNativeDriver: false,
        }).start();

        // Simulate real Wise status update
        if (stepIndex < steps.length - 1) {
          try {
            await transferService.simulateTransferStatus(transferId, step.wiseStatus);
            console.log(`✅ Status updated to: ${step.wiseStatus}`);
          } catch (error) {
            console.warn('Status simulation failed:', error);
          }
        }

        // Wait for step duration
        await new Promise(resolve => setTimeout(resolve, step.duration));
        stepIndex++;
      }
      
      // Complete the transfer
      setTimeout(() => {
        onComplete();
      }, 500);
      
    } catch (error) {
      console.error('Real transfer simulation error:', error);
      // Fallback to mock simulation
      simulateMockTransferProgress();
    }
  };

  const simulateMockTransferProgress = () => {
    let stepIndex = 0;
    const stepTimer = setInterval(() => {
      if (stepIndex < steps.length) {
        setCurrentStep(stepIndex);
        
        // Animate progress bar
        Animated.timing(progressAnim, {
          toValue: (stepIndex + 1) / steps.length,
          duration: steps[stepIndex].duration,
          useNativeDriver: false,
        }).start();

        stepIndex++;
      } else {
        clearInterval(stepTimer);
        // Complete after a short delay
        setTimeout(() => {
          onComplete();
        }, 500);
      }
    }, 100);
  };

  const getCurrentStepProgress = () => {
    const totalSteps = steps.length;
    return ((currentStep + 1) / totalSteps) * 100;
  };

  return (
    <Animated.View 
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      {/* Success Icon Animation */}
      <View style={styles.iconContainer}>
        <Animated.View 
          style={[
            styles.iconWrapper,
            currentStep === steps.length - 1 && styles.successIcon,
          ]}
        >
          <Text style={styles.iconText}>
            {currentStep === steps.length - 1 ? '✓' : '💸'}
          </Text>
        </Animated.View>
      </View>

      {/* Transfer Amount */}
      <View style={styles.amountContainer}>
        <Text style={styles.amountLabel}>Sending</Text>
        <Text style={styles.amountValue}>{amount} {currency}</Text>
        <Text style={styles.recipientText}>to {recipientName}</Text>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressTrack}>
          <Animated.View 
            style={[
              styles.progressBar,
              {
                width: progressAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                }),
              },
            ]}
          />
        </View>
        <Text style={styles.progressText}>
          {Math.round(getCurrentStepProgress())}% Complete
        </Text>
      </View>

      {/* Current Step */}
      <View style={styles.stepContainer}>
        <Text style={styles.stepTitle}>
          {steps[currentStep]?.title || 'Processing...'}
        </Text>
        <Text style={styles.stepDescription}>
          {steps[currentStep]?.description || 'Please wait...'}
        </Text>
      </View>

      {/* Processing Dots Animation */}
      <View style={styles.dotsContainer}>
        {[0, 1, 2].map((index) => (
          <ProcessingDot key={index} delay={index * 200} />
        ))}
      </View>

      {/* Security Notice */}
      <View style={styles.securityNotice}>
        <Text style={styles.securityText}>
          🔒 Your transfer is secured with bank-grade encryption
        </Text>
      </View>
    </Animated.View>
  );
};

const ProcessingDot: React.FC<{ delay: number }> = ({ delay }) => {
  const [opacity] = useState(new Animated.Value(0.3));

  useEffect(() => {
    const animate = () => {
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start(() => animate());
    };

    const timer = setTimeout(animate, delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <Animated.View 
      style={[styles.dot, { opacity }]} 
    />
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 32,
  },
  iconContainer: {
    marginBottom: 32,
  },
  iconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#e3f2fd',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  successIcon: {
    backgroundColor: '#e8f5e8',
  },
  iconText: {
    fontSize: 32,
  },
  amountContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  amountLabel: {
    fontSize: 16,
    color: '#6c757d',
    marginBottom: 8,
  },
  amountValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 8,
  },
  recipientText: {
    fontSize: 16,
    color: '#333333',
  },
  progressContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 32,
  },
  progressTrack: {
    width: '100%',
    height: 6,
    backgroundColor: '#e9ecef',
    borderRadius: 3,
    marginBottom: 12,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 14,
    color: '#6c757d',
    fontWeight: '500',
  },
  stepContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 8,
    textAlign: 'center',
  },
  stepDescription: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#007AFF',
    marginHorizontal: 4,
  },
  securityNotice: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    marginTop: 20,
  },
  securityText: {
    fontSize: 14,
    color: '#495057',
    textAlign: 'center',
    fontWeight: '500',
  },
});

export default TransferProcessing;