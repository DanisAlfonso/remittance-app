import React from 'react';
import {
  View,
  StyleSheet,
  ViewStyle,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

interface LayoutProps {
  children: React.ReactNode;
  style?: ViewStyle;
  safeArea?: boolean;
  scrollable?: boolean;
  keyboardAvoidingView?: boolean;
  backgroundColor?: string;
  padding?: number;
}

const Layout: React.FC<LayoutProps> = ({
  children,
  style,
  safeArea = true,
  scrollable = false,
  keyboardAvoidingView = false,
  backgroundColor = '#f8f9fa',
  padding = 16,
}) => {
  const containerStyle: ViewStyle = {
    flex: 1,
    backgroundColor,
    ...(padding > 0 && { padding }),
    ...style,
  };

  const Container = safeArea ? SafeAreaView : View;
  
  const renderContent = () => {
    if (scrollable) {
      return (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollViewContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          {children}
        </ScrollView>
      );
    }
    
    return children;
  };

  if (keyboardAvoidingView) {
    return (
      <Container style={containerStyle}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoidingView}
        >
          {renderContent()}
        </KeyboardAvoidingView>
      </Container>
    );
  }

  return (
    <Container style={containerStyle}>
      {renderContent()}
    </Container>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
});

export default Layout;