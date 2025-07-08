import React, { useState } from 'react';
import { View, TextInput, Text, StyleSheet, Alert } from 'react-native';

interface TestInputProps {
  label?: string;
  placeholder?: string;
}

const TestInput: React.FC<TestInputProps> = ({ label, placeholder }) => {
  const [value, setValue] = useState('');
  
  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={setValue}
        placeholder={placeholder}
        placeholderTextColor="#999"
        onFocus={() => {
          console.log('TestInput focused');
          Alert.alert('Focus', 'Input was focused');
        }}
        onBlur={() => {
          console.log('TestInput blurred');
        }}
        onTouchStart={() => {
          console.log('TestInput touched');
        }}
        editable={true}
        selectTextOnFocus={true}
      />
      <Text style={styles.value}>Current value: {value}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    margin: 20,
    padding: 10,
    backgroundColor: '#f0f0f0',
  },
  label: {
    fontSize: 16,
    marginBottom: 5,
    color: '#333',
  },
  input: {
    borderWidth: 2,
    borderColor: '#007AFF',
    borderRadius: 5,
    padding: 10,
    fontSize: 16,
    backgroundColor: '#fff',
    minHeight: 50,
  },
  value: {
    marginTop: 5,
    fontSize: 14,
    color: '#666',
  },
});

export default TestInput;