import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, usePathname } from 'expo-router';
import { Feather } from '@expo/vector-icons';

interface BottomNavigationProps {
  style?: ViewStyle;
}

interface NavItem {
  name: string;
  label: string;
  route: string;
  icon: keyof typeof Feather.glyphMap;
}

const navItems: NavItem[] = [
  {
    name: 'home',
    label: 'Home',
    route: '/(dashboard)',
    icon: 'home'
  },
  {
    name: 'transactions',
    label: 'Activity',
    route: '/(dashboard)/transactions',
    icon: 'activity'
  },
  {
    name: 'send',
    label: 'Send',
    route: '/(dashboard)/send-money',
    icon: 'send'
  },
  {
    name: 'beneficiaries',
    label: 'Recipients',
    route: '/(dashboard)/beneficiaries',
    icon: 'users'
  }
];

export default function BottomNavigation({ style }: BottomNavigationProps) {
  const pathname = usePathname();

  const isActive = (route: string) => {
    if (route === '/(dashboard)') {
      return pathname === '/(dashboard)' || pathname === '/' || pathname === '/index';
    }
    
    // For dashboard sub-routes, check both with and without the (dashboard) prefix
    if (route.startsWith('/(dashboard)/')) {
      const routeWithoutPrefix = route.replace('/(dashboard)', '');
      return pathname === route || pathname === routeWithoutPrefix;
    }
    
    return pathname === route;
  };

  const handleNavigation = (route: string) => {
    // Don't navigate if we're already on the same route
    if (isActive(route)) {
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    router.push(route as any);
  };

  return (
    <SafeAreaView edges={['bottom']} style={[styles.container, style]}>
      <View style={styles.navigationBar}>
        {navItems.map((item) => {
          const active = isActive(item.route);
          return (
            <TouchableOpacity
              key={item.name}
              style={styles.navItem}
              onPress={() => handleNavigation(item.route)}
              activeOpacity={0.7}
            >
              <View style={styles.navIconContainer}>
                <Feather 
                  name={item.icon} 
                  size={18} 
                  color={active ? '#007AFF' : '#9ca3af'} 
                />
              </View>
              <Text style={[styles.navLabel, active && styles.activeLabel]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderTopWidth: 0.5,
    borderTopColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
  },
  navigationBar: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 4,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  navIconContainer: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  navLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: '#9ca3af',
    textAlign: 'center',
  },
  activeLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#007AFF',
    textAlign: 'center',
  },
});