import React from 'react';
import { render } from '@testing-library/react-native';
import DashboardScreen from '../../../app/(dashboard)/index';

// Mock the auth store
const mockUseAuthStore = {
  user: {
    id: '1',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    isActive: true,
    emailVerified: true,
  },
  isAuthenticated: true,
  logout: jest.fn(),
};

jest.mock('../../../lib/auth', () => ({
  useAuthStore: () => mockUseAuthStore,
}));

describe('DashboardScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders correctly with user data', () => {
      const { getByText } = render(<DashboardScreen />);
      
      expect(getByText('Welcome back, John!')).toBeTruthy();
      expect(getByText('Dashboard')).toBeTruthy();
      expect(getByText('Quick Actions')).toBeTruthy();
      expect(getByText('Send Money')).toBeTruthy();
      expect(getByText('Add Beneficiary')).toBeTruthy();
      expect(getByText('View Transactions')).toBeTruthy();
    });

    it('renders account overview section', () => {
      const { getByText } = render(<DashboardScreen />);
      
      expect(getByText('Account Overview')).toBeTruthy();
      expect(getByText('Account Status')).toBeTruthy();
      expect(getByText('Active')).toBeTruthy();
      expect(getByText('Email Verification')).toBeTruthy();
      expect(getByText('Verified')).toBeTruthy();
    });

    it('renders recent activity section', () => {
      const { getByText } = render(<DashboardScreen />);
      
      expect(getByText('Recent Activity')).toBeTruthy();
      expect(getByText('No recent activity')).toBeTruthy();
      expect(getByText('Your transaction history will appear here')).toBeTruthy();
    });

    it('renders navigation links', () => {
      const { getByText } = render(<DashboardScreen />);
      
      expect(getByText('Profile')).toBeTruthy();
      expect(getByText('Transactions')).toBeTruthy();
      expect(getByText('Beneficiaries')).toBeTruthy();
    });
  });

  describe('User Information Display', () => {
    it('displays correct user name', () => {
      const { getByText } = render(<DashboardScreen />);
      
      expect(getByText('Welcome back, John!')).toBeTruthy();
    });

    it('displays user email', () => {
      const { getByText } = render(<DashboardScreen />);
      
      expect(getByText('john.doe@example.com')).toBeTruthy();
    });

    it('displays account status correctly', () => {
      const { getByText } = render(<DashboardScreen />);
      
      expect(getByText('Active')).toBeTruthy();
    });

    it('displays email verification status', () => {
      const { getByText } = render(<DashboardScreen />);
      
      expect(getByText('Verified')).toBeTruthy();
    });
  });

  describe('Account Status Variations', () => {
    it('displays inactive account status', () => {
      const inactiveUser = {
        ...mockUseAuthStore.user,
        isActive: false,
      };
      
      const mockStoreInactive = {
        ...mockUseAuthStore,
        user: inactiveUser,
      };
      
      jest.doMock('../../../lib/auth', () => ({
        useAuthStore: () => mockStoreInactive,
      }));
      
      const { getByText } = render(<DashboardScreen />);
      
      expect(getByText('Inactive')).toBeTruthy();
    });

    it('displays unverified email status', () => {
      const unverifiedUser = {
        ...mockUseAuthStore.user,
        emailVerified: false,
      };
      
      const mockStoreUnverified = {
        ...mockUseAuthStore,
        user: unverifiedUser,
      };
      
      jest.doMock('../../../lib/auth', () => ({
        useAuthStore: () => mockStoreUnverified,
      }));
      
      const { getByText } = render(<DashboardScreen />);
      
      expect(getByText('Not Verified')).toBeTruthy();
    });
  });

  describe('Quick Actions', () => {
    it('renders all quick action buttons', () => {
      const { getByText } = render(<DashboardScreen />);
      
      expect(getByText('Send Money')).toBeTruthy();
      expect(getByText('Add Beneficiary')).toBeTruthy();
      expect(getByText('View Transactions')).toBeTruthy();
    });

    it('has proper button styling', () => {
      const { getByTestId } = render(<DashboardScreen />);
      
      // Check that buttons are rendered
      const buttons = getByTestId('button');
      expect(buttons).toBeTruthy();
    });
  });

  describe('Recent Activity', () => {
    it('shows empty state when no recent activity', () => {
      const { getByText } = render(<DashboardScreen />);
      
      expect(getByText('No recent activity')).toBeTruthy();
      expect(getByText('Your transaction history will appear here')).toBeTruthy();
    });
  });

  describe('Navigation Section', () => {
    it('renders navigation items', () => {
      const { getByText } = render(<DashboardScreen />);
      
      expect(getByText('Profile')).toBeTruthy();
      expect(getByText('Manage your account settings')).toBeTruthy();
      expect(getByText('Transactions')).toBeTruthy();
      expect(getByText('View your transaction history')).toBeTruthy();
      expect(getByText('Beneficiaries')).toBeTruthy();
      expect(getByText('Manage your recipients')).toBeTruthy();
    });
  });

  describe('Error Handling', () => {
    it('handles missing user data gracefully', () => {
      const mockStoreNoUser = {
        ...mockUseAuthStore,
        user: null,
      };
      
      jest.doMock('../../../lib/auth', () => ({
        useAuthStore: () => mockStoreNoUser,
      }));
      
      // Should not crash when user is null
      const { getByText } = render(<DashboardScreen />);
      
      expect(getByText('Dashboard')).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('has proper screen title', () => {
      const { getByText } = render(<DashboardScreen />);
      
      expect(getByText('Dashboard')).toBeTruthy();
    });

    it('has descriptive text for navigation items', () => {
      const { getByText } = render(<DashboardScreen />);
      
      expect(getByText('Manage your account settings')).toBeTruthy();
      expect(getByText('View your transaction history')).toBeTruthy();
      expect(getByText('Manage your recipients')).toBeTruthy();
    });
  });
});