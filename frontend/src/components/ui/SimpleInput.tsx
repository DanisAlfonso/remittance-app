import React from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TextInputProps,
} from 'react-native';

interface SimpleInputProps extends TextInputProps {
  label?: string;
  error?: string;
  required?: boolean;
}

const SimpleInput: React.FC<SimpleInputProps> = ({
  label,
  error,
  required = false,
  style,
  ...textInputProps
}) => {
  return (
    <View style={styles.container}>
      {label && (
        <Text style={styles.label}>
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
      )}
      
      <TextInput
        style={[
          styles.input,
          error && styles.inputError,
          style,
        ]}
        placeholderTextColor="#6c757d"
        {...textInputProps}
      />
      
      {error && (
        <Text style={styles.error}>{error}</Text>
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
  input: {
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333333',
    minHeight: 44,
  },
  inputError: {
    borderColor: '#dc3545',
  },
  error: {
    fontSize: 14,
    color: '#dc3545',
    marginTop: 4,
  },
});

export default SimpleInput;