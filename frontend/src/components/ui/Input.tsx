import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TextInputProps,
  ViewStyle,
  TextStyle,
  TouchableOpacity,
} from 'react-native';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
  labelStyle?: TextStyle;
  inputStyle?: TextStyle;
  errorStyle?: TextStyle;
  required?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  secureTextEntry?: boolean;
}

const Input: React.FC<InputProps> = ({
  label,
  error,
  containerStyle,
  labelStyle,
  inputStyle,
  errorStyle,
  required = false,
  leftIcon,
  rightIcon,
  secureTextEntry: initialSecureTextEntry = false,
  ...textInputProps
}) => {
  const [secureTextEntry, setSecureTextEntry] = useState(initialSecureTextEntry);
  const [isFocused, setIsFocused] = useState(false);

  const toggleSecureTextEntry = () => {
    setSecureTextEntry(!secureTextEntry);
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text style={[styles.label, labelStyle]}>
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
      )}
      
      <View style={[
        styles.inputContainer,
        isFocused && styles.inputContainerFocused,
        error && styles.inputContainerError,
      ]}>
        {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}
        
        <TextInput
          style={[
            styles.input,
            leftIcon && styles.inputWithLeftIcon,
            (rightIcon || initialSecureTextEntry) && styles.inputWithRightIcon,
            inputStyle,
          ]}
          secureTextEntry={secureTextEntry}
          onFocus={(e) => {
            console.log('Input focused:', label);
            setIsFocused(true);
            textInputProps.onFocus?.(e);
          }}
          onBlur={(e) => {
            console.log('Input blurred:', label);
            setIsFocused(false);
            textInputProps.onBlur?.(e);
          }}
          placeholderTextColor="#6c757d"
          {...textInputProps}
        />
        
        {initialSecureTextEntry && (
          <TouchableOpacity
            style={styles.rightIcon}
            onPress={toggleSecureTextEntry}
          >
            <Text style={styles.eyeIcon}>
              {secureTextEntry ? '👁️' : '🙈'}
            </Text>
          </TouchableOpacity>
        )}
        
        {rightIcon && !initialSecureTextEntry && (
          <View style={styles.rightIcon}>{rightIcon}</View>
        )}
      </View>
      
      {error && (
        <Text style={[styles.error, errorStyle]}>{error}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 8,
  },
  required: {
    color: '#dc3545',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    minHeight: 44,
  },
  inputContainerFocused: {
    borderColor: '#007AFF',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  inputContainerError: {
    borderColor: '#dc3545',
  },
  input: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333333',
  },
  inputWithLeftIcon: {
    paddingLeft: 8,
  },
  inputWithRightIcon: {
    paddingRight: 8,
  },
  leftIcon: {
    paddingLeft: 12,
    paddingRight: 8,
  },
  rightIcon: {
    paddingRight: 12,
    paddingLeft: 8,
  },
  eyeIcon: {
    fontSize: 16,
  },
  error: {
    fontSize: 14,
    color: '#dc3545',
    marginTop: 4,
  },
});

export default Input;