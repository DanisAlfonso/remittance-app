import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, ViewStyle, TextStyle, TouchableOpacity } from 'react-native';

interface SimpleInputProps {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoComplete?: 'email' | 'password' | 'name' | 'tel' | 'off';
  error?: string;
  required?: boolean;
  disabled?: boolean;
  multiline?: boolean;
  numberOfLines?: number;
  maxLength?: number;
  style?: ViewStyle;
  inputStyle?: TextStyle;
  leftIcon?: string;
  rightIcon?: string;
  onRightIconPress?: () => void;
  size?: 'small' | 'medium' | 'large';
  testID?: string;
}

export default function SimpleInput({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  autoComplete,
  error,
  required = false,
  disabled = false,
  multiline = false,
  numberOfLines = 1,
  maxLength,
  style,
  inputStyle,
  leftIcon,
  rightIcon,
  onRightIconPress,
  size = 'medium',
  testID,
}: SimpleInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          container: styles.smallContainer,
          input: styles.smallInput,
          label: styles.smallLabel,
        };
      case 'large':
        return {
          container: styles.largeContainer,
          input: styles.largeInput,
          label: styles.largeLabel,
        };
      default:
        return {
          container: styles.mediumContainer,
          input: styles.mediumInput,
          label: styles.mediumLabel,
        };
    }
  };

  const sizeStyles = getSizeStyles();
  const isPasswordField = secureTextEntry;
  const showPassword = isPasswordField && !isPasswordVisible;

  return (
    <View style={[styles.container, sizeStyles.container, style]} testID="input-container">
      {label && (
        <Text style={[styles.label, sizeStyles.label]} testID="input-label">
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
      )}
      
      <View style={[
        styles.inputContainer,
        isFocused && styles.inputContainerFocused,
        error && styles.inputContainerError,
        disabled && styles.inputContainerDisabled,
      ]}>
        {leftIcon && (
          <View style={styles.leftIconContainer}>
            <Text style={styles.icon}>{leftIcon}</Text>
          </View>
        )}
        
        <TextInput
          style={[
            styles.input,
            sizeStyles.input,
            leftIcon && styles.inputWithLeftIcon,
            (rightIcon || isPasswordField) && styles.inputWithRightIcon,
            multiline && styles.multilineInput,
            disabled && styles.inputDisabled,
            inputStyle,
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          secureTextEntry={showPassword}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoComplete={autoComplete}
          autoCorrect={false}
          multiline={multiline}
          numberOfLines={numberOfLines}
          maxLength={maxLength}
          editable={!disabled}
          placeholderTextColor="#9CA3AF"
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          testID="text-input"
        />
        
        {(rightIcon || isPasswordField) && (
          <TouchableOpacity
            style={styles.rightIconContainer}
            onPress={isPasswordField ? 
              () => setIsPasswordVisible(!isPasswordVisible) : 
              onRightIconPress
            }
            testID={testID ? `${testID}-right-icon-button` : "right-icon-button"}
          >
            <Text style={styles.icon}>
              {isPasswordField ? 
                (isPasswordVisible ? '🙈' : '👁️') : 
                rightIcon
              }
            </Text>
          </TouchableOpacity>
        )}
      </View>
      
      {error && (
        <Text style={styles.errorText} testID="input-error">
          {error}
        </Text>
      )}
      
      {maxLength && (
        <Text style={styles.characterCount} testID="character-count">
          {value.length}/{maxLength}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  
  // Size variants
  smallContainer: {
    marginBottom: 12,
  },
  mediumContainer: {
    marginBottom: 16,
  },
  largeContainer: {
    marginBottom: 20,
  },
  
  // Label styles
  label: {
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  smallLabel: {
    fontSize: 14,
  },
  mediumLabel: {
    fontSize: 16,
  },
  largeLabel: {
    fontSize: 18,
  },
  
  required: {
    color: '#DC2626',
  },
  
  // Input container
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  
  inputContainerFocused: {
    borderColor: '#007AFF',
    shadowColor: '#007AFF',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  
  inputContainerError: {
    borderColor: '#DC2626',
  },
  
  inputContainerDisabled: {
    backgroundColor: '#F9FAFB',
    borderColor: '#E5E7EB',
  },
  
  // Input styles
  input: {
    flex: 1,
    color: '#1F2937',
    fontSize: 16,
    fontWeight: '400',
    paddingHorizontal: 16,
  },
  
  smallInput: {
    height: 40,
    fontSize: 14,
    paddingHorizontal: 12,
  },
  
  mediumInput: {
    height: 48,
    fontSize: 16,
    paddingHorizontal: 16,
  },
  
  largeInput: {
    height: 56,
    fontSize: 18,
    paddingHorizontal: 20,
  },
  
  inputWithLeftIcon: {
    paddingLeft: 4,
  },
  
  inputWithRightIcon: {
    paddingRight: 4,
  },
  
  multilineInput: {
    height: 'auto',
    minHeight: 48,
    paddingVertical: 12,
    textAlignVertical: 'top',
  },
  
  inputDisabled: {
    color: '#9CA3AF',
  },
  
  // Icon containers
  leftIconContainer: {
    paddingLeft: 12,
    paddingRight: 8,
  },
  
  rightIconContainer: {
    paddingLeft: 8,
    paddingRight: 12,
  },
  
  icon: {
    fontSize: 20,
    color: '#6B7280',
  },
  
  // Error and helper text
  errorText: {
    fontSize: 14,
    color: '#DC2626',
    marginTop: 6,
    fontWeight: '500',
  },
  
  characterCount: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'right',
    marginTop: 4,
  },
});