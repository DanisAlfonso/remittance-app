import React from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import Layout from '../components/ui/Layout';
import Button from '../components/ui/Button';
import useAuthStore from '../store/authStore';

const DashboardScreen: React.FC = () => {
  const { user, logout } = useAuthStore();

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: logout,
        },
      ]
    );
  };

  return (
    <Layout safeArea backgroundColor="#ffffff">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Dashboard</Text>
          <Text style={styles.subtitle}>
            Welcome back, {user?.firstName}!
          </Text>
        </View>

        <View style={styles.content}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Account Balance</Text>
            <Text style={styles.balanceText}>$0.00</Text>
            <Text style={styles.cardSubtitle}>Available Balance</Text>
          </View>

          <View style={styles.actionsContainer}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            
            <Button
              title="Send Money"
              onPress={() => Alert.alert('Coming Soon', 'Send money feature will be available soon')}
              style={styles.actionButton}
            />
            
            <Button
              title="Add Money"
              onPress={() => Alert.alert('Coming Soon', 'Add money feature will be available soon')}
              variant="outline"
              style={styles.actionButton}
            />
            
            <Button
              title="Transaction History"
              onPress={() => Alert.alert('Coming Soon', 'Transaction history will be available soon')}
              variant="outline"
              style={styles.actionButton}
            />
          </View>
        </View>

        <View style={styles.footer}>
          <Button
            title="Logout"
            onPress={handleLogout}
            variant="outline"
            style={styles.logoutButton}
          />
        </View>
      </View>
    </Layout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  card: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardTitle: {
    fontSize: 16,
    color: '#6c757d',
    marginBottom: 8,
  },
  balanceText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#28a745',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#6c757d',
  },
  actionsContainer: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 16,
  },
  actionButton: {
    marginBottom: 12,
  },
  footer: {
    paddingTop: 20,
  },
  logoutButton: {
    borderColor: '#dc3545',
  },
});

export default DashboardScreen;