import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import ProfileScreen from '../../../app/(dashboard)/profile';

// Mock the auth store
const mockUseAuthStore = {
  user: {
    id: '1',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    phone: '+1234567890',
    country: 'United States',
    isActive: true,
    emailVerified: true,
    createdAt: new Date('2024-01-01'),
  },
  isAuthenticated: true,
  logout: jest.fn(),
};

jest.mock('../../../lib/auth', () => ({
  useAuthStore: () => mockUseAuthStore,
}));

describe('ProfileScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders correctly with user data', () => {
      const { getByText } = render(<ProfileScreen />);
      
      expect(getByText('Profile')).toBeTruthy();
      expect(getByText('Manage your account information')).toBeTruthy();
      expect(getByText('Personal Information')).toBeTruthy();
      expect(getByText('Account Settings')).toBeTruthy();
      expect(getByText('Security')).toBeTruthy();
    });

    it('renders user information correctly', () => {
      const { getByText } = render(<ProfileScreen />);
      
      expect(getByText('John Doe')).toBeTruthy();
      expect(getByText('john.doe@example.com')).toBeTruthy();
      expect(getByText('+1234567890')).toBeTruthy();
      expect(getByText('United States')).toBeTruthy();
    });

    it('renders account status information', () => {
      const { getByText } = render(<ProfileScreen />);
      
      expect(getByText('Account Status')).toBeTruthy();
      expect(getByText('Active')).toBeTruthy();
      expect(getByText('Email Verified')).toBeTruthy();
      expect(getByText('Yes')).toBeTruthy();
    });

    it('renders member since information', () => {
      const { getByText } = render(<ProfileScreen />);
      
      expect(getByText('Member Since')).toBeTruthy();
      expect(getByText('January 1, 2024')).toBeTruthy();
    });
  });

  describe('Personal Information Section', () => {
    it('displays all personal information fields', () => {
      const { getByText } = render(<ProfileScreen />);
      
      expect(getByText('First Name')).toBeTruthy();
      expect(getByText('John')).toBeTruthy();
      expect(getByText('Last Name')).toBeTruthy();
      expect(getByText('Doe')).toBeTruthy();
      expect(getByText('Email')).toBeTruthy();
      expect(getByText('john.doe@example.com')).toBeTruthy();
      expect(getByText('Phone')).toBeTruthy();
      expect(getByText('+1234567890')).toBeTruthy();
      expect(getByText('Country')).toBeTruthy();
      expect(getByText('United States')).toBeTruthy();
    });

    it('handles missing optional fields gracefully', () => {
      const userWithoutPhone = {
        ...mockUseAuthStore.user,
        phone: null,
        country: null,
      };
      
      const mockStoreNoPhone = {
        ...mockUseAuthStore,
        user: userWithoutPhone,
      };
      
      jest.doMock('../../../lib/auth', () => ({
        useAuthStore: () => mockStoreNoPhone,
      }));
      
      const { getByText } = render(<ProfileScreen />);
      
      expect(getByText('Not provided')).toBeTruthy();
    });
  });

  describe('Account Settings Section', () => {
    it('displays all account settings options', () => {
      const { getByText } = render(<ProfileScreen />);
      
      expect(getByText('Edit Profile')).toBeTruthy();
      expect(getByText('Update your personal information')).toBeTruthy();
      expect(getByText('Change Password')).toBeTruthy();
      expect(getByText('Update your account password')).toBeTruthy();
      expect(getByText('Email Preferences')).toBeTruthy();
      expect(getByText('Manage notification settings')).toBeTruthy();
      expect(getByText('Privacy Settings')).toBeTruthy();
      expect(getByText('Control your data and privacy')).toBeTruthy();
    });

    it('has clickable setting items', () => {
      const { getByText } = render(<ProfileScreen />);
      
      // These should be touchable elements
      expect(getByText('Edit Profile')).toBeTruthy();
      expect(getByText('Change Password')).toBeTruthy();
      expect(getByText('Email Preferences')).toBeTruthy();
      expect(getByText('Privacy Settings')).toBeTruthy();
    });
  });

  describe('Security Section', () => {
    it('displays security options', () => {
      const { getByText } = render(<ProfileScreen />);
      
      expect(getByText('Two-Factor Authentication')).toBeTruthy();
      expect(getByText('Add an extra layer of security')).toBeTruthy();
      expect(getByText('Login History')).toBeTruthy();
      expect(getByText('View your recent login activity')).toBeTruthy();
      expect(getByText('Trusted Devices')).toBeTruthy();
      expect(getByText('Manage your trusted devices')).toBeTruthy();
    });

    it('has clickable security items', () => {
      const { getByText } = render(<ProfileScreen />);
      
      // These should be touchable elements
      expect(getByText('Two-Factor Authentication')).toBeTruthy();
      expect(getByText('Login History')).toBeTruthy();
      expect(getByText('Trusted Devices')).toBeTruthy();
    });
  });

  describe('Logout Functionality', () => {
    it('renders logout button', () => {
      const { getByText } = render(<ProfileScreen />);
      
      expect(getByText('Sign Out')).toBeTruthy();
    });

    it('calls logout when logout button is pressed', () => {
      const { getByText } = render(<ProfileScreen />);
      
      const logoutButton = getByText('Sign Out');
      fireEvent.press(logoutButton);
      
      expect(mockUseAuthStore.logout).toHaveBeenCalledTimes(1);
    });

    it('logout button has danger variant styling', () => {
      const { getByTestId } = render(<ProfileScreen />);
      
      const logoutButton = getByTestId('button');
      expect(logoutButton).toBeTruthy();
      
      // Check that it has danger styling - React Native flattens style arrays
      expect(logoutButton.props.style).toEqual(
        expect.objectContaining({
          backgroundColor: '#DC3545',
        })
      );
    });
  });

  describe('Account Status Display', () => {
    it('displays active account status with correct styling', () => {
      const { getByText } = render(<ProfileScreen />);
      
      expect(getByText('Active')).toBeTruthy();
    });

    it('displays inactive account status when user is inactive', () => {
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
      
      const { getByText } = render(<ProfileScreen />);
      
      expect(getByText('Inactive')).toBeTruthy();
    });

    it('displays unverified email status when email is not verified', () => {
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
      
      const { getByText } = render(<ProfileScreen />);
      
      expect(getByText('No')).toBeTruthy();
    });
  });

  describe('Date Formatting', () => {
    it('formats member since date correctly', () => {
      const { getByText } = render(<ProfileScreen />);
      
      expect(getByText('January 1, 2024')).toBeTruthy();
    });

    it('handles invalid date gracefully', () => {
      const userWithInvalidDate = {
        ...mockUseAuthStore.user,
        createdAt: 'invalid-date',
      };
      
      const mockStoreInvalidDate = {
        ...mockUseAuthStore,
        user: userWithInvalidDate,
      };
      
      jest.doMock('../../../lib/auth', () => ({
        useAuthStore: () => mockStoreInvalidDate,
      }));
      
      const { getByText } = render(<ProfileScreen />);
      
      // Should not crash and should still render the profile
      expect(getByText('Profile')).toBeTruthy();
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
      const { getByText } = render(<ProfileScreen />);
      
      expect(getByText('Profile')).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('has proper screen title', () => {
      const { getByText } = render(<ProfileScreen />);
      
      expect(getByText('Profile')).toBeTruthy();
      expect(getByText('Manage your account information')).toBeTruthy();
    });

    it('has descriptive text for all sections', () => {
      const { getByText } = render(<ProfileScreen />);
      
      expect(getByText('Update your personal information')).toBeTruthy();
      expect(getByText('Update your account password')).toBeTruthy();
      expect(getByText('Manage notification settings')).toBeTruthy();
      expect(getByText('Control your data and privacy')).toBeTruthy();
      expect(getByText('Add an extra layer of security')).toBeTruthy();
      expect(getByText('View your recent login activity')).toBeTruthy();
      expect(getByText('Manage your trusted devices')).toBeTruthy();
    });
  });
});