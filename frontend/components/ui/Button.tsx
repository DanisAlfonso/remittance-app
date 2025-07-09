import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle, ActivityIndicator } from 'react-native';

interface ButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'outline';
  size?: 'small' | 'medium' | 'large';
  fullWidth?: boolean;
  testID?: string;
}

export default function Button({
  title,
  onPress,
  loading = false,
  disabled = false,
  style,
  textStyle,
  variant = 'primary',
  size = 'medium',
  fullWidth = false,
  testID,
}: ButtonProps) {
  const isDisabled = disabled || loading;

  const getButtonStyle = (): ViewStyle[] => {
    const baseStyle: ViewStyle[] = [styles.button];
    
    // Size styles
    switch (size) {
      case 'small':
        baseStyle.push(styles.smallButton);
        break;
      case 'large':
        baseStyle.push(styles.largeButton);
        break;
      default:
        baseStyle.push(styles.mediumButton);
    }

    // Variant styles
    switch (variant) {
      case 'secondary':
        baseStyle.push(styles.secondaryButton);
        break;
      case 'danger':
        baseStyle.push(styles.dangerButton);
        break;
      case 'success':
        baseStyle.push(styles.successButton);
        break;
      case 'outline':
        baseStyle.push(styles.outlineButton);
        break;
      default:
        baseStyle.push(styles.primaryButton);
    }

    // Full width
    if (fullWidth) {
      baseStyle.push(styles.fullWidthButton);
    }

    // Disabled state
    if (isDisabled) {
      baseStyle.push(styles.disabledButton);
    }

    return baseStyle;
  };

  const getTextStyle = (): TextStyle[] => {
    const baseStyle: TextStyle[] = [styles.text];
    
    // Size text styles
    switch (size) {
      case 'small':
        baseStyle.push(styles.smallText);
        break;
      case 'large':
        baseStyle.push(styles.largeText);
        break;
      default:
        baseStyle.push(styles.mediumText);
    }

    // Variant text styles
    switch (variant) {
      case 'secondary':
        baseStyle.push(styles.secondaryText);
        break;
      case 'danger':
        baseStyle.push(styles.dangerText);
        break;
      case 'success':
        baseStyle.push(styles.successText);
        break;
      case 'outline':
        baseStyle.push(styles.outlineText);
        break;
      default:
        baseStyle.push(styles.primaryText);
    }

    return baseStyle;
  };

  const buttonStyles = [...getButtonStyle(), style];
  
  return (
    <TouchableOpacity
      style={buttonStyles}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.85}
      testID={testID || "button"}
    >
      {loading ? (
        <ActivityIndicator 
          color={variant === 'secondary' || variant === 'outline' ? '#007AFF' : '#ffffff'} 
          size={size === 'small' ? 'small' : 'small'} 
          testID="button-loading"
        />
      ) : (
        <Text 
          style={[...getTextStyle(), textStyle]}
          testID="button-text"
        >
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  
  // Size styles
  smallButton: {
    height: 36,
    paddingHorizontal: 12,
    minWidth: 80,
  },
  mediumButton: {
    height: 48,
    paddingHorizontal: 16,
    minWidth: 100,
  },
  largeButton: {
    height: 56,
    paddingHorizontal: 24,
    minWidth: 120,
  },
  
  // Variant styles
  primaryButton: {
    backgroundColor: '#007AFF',
  },
  secondaryButton: {
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  dangerButton: {
    backgroundColor: '#DC3545',
  },
  successButton: {
    backgroundColor: '#28A745',
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  
  // State styles
  disabledButton: {
    backgroundColor: '#9CA3AF',
    borderColor: '#9CA3AF',
    shadowOpacity: 0,
    elevation: 0,
  },
  
  // Layout styles
  fullWidthButton: {
    width: '100%',
  },
  
  // Text base
  text: {
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  
  // Text size styles
  smallText: {
    fontSize: 14,
  },
  mediumText: {
    fontSize: 16,
  },
  largeText: {
    fontSize: 18,
  },
  
  // Text variant styles
  primaryText: {
    color: '#FFFFFF',
  },
  secondaryText: {
    color: '#495057',
  },
  dangerText: {
    color: '#FFFFFF',
  },
  successText: {
    color: '#FFFFFF',
  },
  outlineText: {
    color: '#007AFF',
  },
});