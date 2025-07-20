import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import ProfileScreen from '../../app/(dashboard)/profile';
import { useAuthStore } from '../../lib/auth';
import * as biometric from '../../lib/biometric';
import * as api from '../../lib/api';

type AlertButton = {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: (text?: string) => void;
};

// Mock dependencies
jest.mock('../../lib/auth');
jest.mock('../../lib/biometric');
jest.mock('../../lib/api');
jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
  },
}));

// Mock Alert
const mockAlert = {
  alert: jest.fn(),
  prompt: jest.fn(),
};
Alert.alert = mockAlert.alert;
Alert.prompt = mockAlert.prompt;

const mockUseAuthStore = useAuthStore as jest.MockedFunction<typeof useAuthStore>;
const mockBiometric = biometric as jest.Mocked<typeof biometric>;
const mockApi = api as jest.Mocked<typeof api>;

describe('ProfileScreen - Biometric Authentication', () => {
  const mockUser = {
    id: 'test-user-id',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    isActive: true,
    emailVerified: true,
    createdAt: new Date().toISOString(),
  };

  const mockBiometricCapabilities = {
    hasHardware: true,
    isEnrolled: true,
    supportedTypes: [1], // FINGERPRINT
    canUseBiometrics: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock auth store
    mockUseAuthStore.mockReturnValue({
      user: mockUser,
      logout: jest.fn(),
      isLoading: false,
      error: null,
      token: 'mock-token',
      isAuthenticated: true,
      login: jest.fn(),
      register: jest.fn(),
      validateSession: jest.fn(),
      clearError: jest.fn(),
      updateUser: jest.fn(),
      loadStoredAuth: jest.fn(),
    });

    // Mock biometric functions
    mockBiometric.checkBiometricCapabilities.mockResolvedValue(mockBiometricCapabilities);
    mockBiometric.isBiometricEnabled.mockResolvedValue(false);
    mockBiometric.setBiometricEnabled.mockResolvedValue();
    mockBiometric.getBiometricTypeName.mockReturnValue('Touch ID');
    mockBiometric.getBiometricCredentials.mockResolvedValue(null);
    mockBiometric.storeBiometricCredentials.mockResolvedValue();
    mockBiometric.authenticateWithBiometrics.mockResolvedValue({ success: true });

    // Mock API
    (mockApi.apiClient.post as jest.Mock).mockResolvedValue({ status: 200 });
  });

  describe('Biometric Switch Rendering', () => {
    it('should render biometric switch when device supports biometrics', async () => {
      const { findByText } = render(<ProfileScreen />);
      
      await waitFor(() => {
        expect(findByText('Touch ID')).toBeTruthy();
      });
    });

    it('should not render biometric switch when device does not support biometrics', async () => {
      mockBiometric.checkBiometricCapabilities.mockResolvedValue({
        ...mockBiometricCapabilities,
        canUseBiometrics: false,
      });

      const { queryByText } = render(<ProfileScreen />);
      
      await waitFor(() => {
        expect(queryByText('Touch ID')).toBeNull();
      });
    });

    it('should show switch as disabled when biometrics are not enabled', async () => {
      mockBiometric.isBiometricEnabled.mockResolvedValue(false);
      
      const { findByText } = render(<ProfileScreen />);
      
      await waitFor(() => {
        expect(findByText('Enable for faster sign in')).toBeTruthy();
      });
    });

    it('should show switch as enabled when biometrics are enabled', async () => {
      mockBiometric.isBiometricEnabled.mockResolvedValue(true);
      
      const { findByText } = render(<ProfileScreen />);
      
      await waitFor(() => {
        expect(findByText('Quick and secure sign in enabled')).toBeTruthy();
      });
    });
  });

  describe('Biometric Switch Functionality', () => {
    it('should handle switch toggle from disabled to enabled with new credentials', async () => {
      const { getByRole } = render(<ProfileScreen />);
      
      await waitFor(() => {
        expect(mockBiometric.checkBiometricCapabilities).toHaveBeenCalled();
      });

      // Mock password prompt response
      mockAlert.prompt.mockImplementation((title, message, buttons) => {
        // Simulate user entering password
        const enableButton = buttons?.find((b: AlertButton) => b.text === 'Enable');
        if (enableButton && enableButton.onPress) {
          enableButton.onPress('correctpassword');
        }
      });

      const switchComponent = getByRole('switch');
      
      await act(async () => {
        fireEvent(switchComponent, 'valueChange', true);
      });

      await waitFor(() => {
        expect(mockAlert.prompt).toHaveBeenCalledWith(
          'Enter Your Password',
          expect.stringContaining('Please enter your current password to enable Touch ID'),
          expect.any(Array),
          'secure-text',
          '',
          'default'
        );
      });

      await waitFor(() => {
        expect(mockApi.apiClient.post).toHaveBeenCalledWith('/auth/login', {
          email: 'test@example.com',
          password: 'correctpassword',
        });
      });

      await waitFor(() => {
        expect(mockBiometric.storeBiometricCredentials).toHaveBeenCalledWith(
          'test@example.com',
          'correctpassword'
        );
      });

      await waitFor(() => {
        expect(mockBiometric.authenticateWithBiometrics).toHaveBeenCalledWith(
          'Use Touch ID to enable authentication'
        );
      });

      await waitFor(() => {
        expect(mockBiometric.setBiometricEnabled).toHaveBeenCalledWith(true);
      });
    });

    it('should handle switch toggle from disabled to enabled with existing credentials', async () => {
      mockBiometric.getBiometricCredentials.mockResolvedValue({
        email: 'test@example.com',
        password: 'stored-password',
      });

      const { getByRole } = render(<ProfileScreen />);
      
      await waitFor(() => {
        expect(mockBiometric.checkBiometricCapabilities).toHaveBeenCalled();
      });

      const switchComponent = getByRole('switch');
      
      await act(async () => {
        fireEvent(switchComponent, 'valueChange', true);
      });

      // Should skip password prompt since credentials exist
      expect(mockAlert.prompt).not.toHaveBeenCalled();

      await waitFor(() => {
        expect(mockBiometric.authenticateWithBiometrics).toHaveBeenCalledWith(
          'Use Touch ID to enable authentication'
        );
      });

      await waitFor(() => {
        expect(mockBiometric.setBiometricEnabled).toHaveBeenCalledWith(true);
      });
    });

    it('should handle invalid password during enable process', async () => {
      (mockApi.apiClient.post as jest.Mock).mockRejectedValue(new Error('Invalid credentials'));

      const { getByRole } = render(<ProfileScreen />);
      
      await waitFor(() => {
        expect(mockBiometric.checkBiometricCapabilities).toHaveBeenCalled();
      });

      mockAlert.prompt.mockImplementation((title, message, buttons) => {
        const enableButton = buttons?.find((b: AlertButton) => b.text === 'Enable');
        if (enableButton && enableButton.onPress) {
          enableButton.onPress('wrongpassword');
        }
      });

      const switchComponent = getByRole('switch');
      
      await act(async () => {
        fireEvent(switchComponent, 'valueChange', true);
      });

      await waitFor(() => {
        expect(mockAlert.alert).toHaveBeenCalledWith(
          'Invalid Password',
          'The password you entered is incorrect. Please try again.'
        );
      });

      // Should not enable biometrics
      expect(mockBiometric.setBiometricEnabled).not.toHaveBeenCalled();
    });

    it('should handle user cancelling password prompt', async () => {
      const { getByRole } = render(<ProfileScreen />);
      
      await waitFor(() => {
        expect(mockBiometric.checkBiometricCapabilities).toHaveBeenCalled();
      });

      mockAlert.prompt.mockImplementation((title, message, buttons) => {
        const cancelButton = buttons?.find((b: AlertButton) => b.text === 'Cancel');
        if (cancelButton && cancelButton.onPress) {
          cancelButton.onPress();
        }
      });

      const switchComponent = getByRole('switch');
      
      await act(async () => {
        fireEvent(switchComponent, 'valueChange', true);
      });

      await waitFor(() => {
        expect(mockAlert.prompt).toHaveBeenCalled();
      });

      // Should not proceed with enabling
      expect(mockApi.apiClient.post).not.toHaveBeenCalled();
      expect(mockBiometric.setBiometricEnabled).not.toHaveBeenCalled();
    });

    it('should handle biometric authentication failure during enable', async () => {
      mockBiometric.authenticateWithBiometrics.mockResolvedValue({
        success: false,
        error: 'Authentication failed',
        cancelled: false,
      });

      const { getByRole } = render(<ProfileScreen />);
      
      await waitFor(() => {
        expect(mockBiometric.checkBiometricCapabilities).toHaveBeenCalled();
      });

      mockAlert.prompt.mockImplementation((title, message, buttons) => {
        const enableButton = buttons?.find((b: AlertButton) => b.text === 'Enable');
        if (enableButton && enableButton.onPress) {
          enableButton.onPress('correctpassword');
        }
      });

      const switchComponent = getByRole('switch');
      
      await act(async () => {
        fireEvent(switchComponent, 'valueChange', true);
      });

      await waitFor(() => {
        expect(mockAlert.alert).toHaveBeenCalledWith(
          'Authentication Failed',
          'Authentication failed'
        );
      });

      // Should not enable biometrics
      expect(mockBiometric.setBiometricEnabled).not.toHaveBeenCalled();
    });

    it('should handle switch toggle from enabled to disabled', async () => {
      mockBiometric.isBiometricEnabled.mockResolvedValue(true);

      const { getByRole } = render(<ProfileScreen />);
      
      await waitFor(() => {
        expect(mockBiometric.checkBiometricCapabilities).toHaveBeenCalled();
      });

      mockAlert.alert.mockImplementation((title, message, buttons) => {
        const disableButton = buttons?.find((b: AlertButton) => b.text === 'Disable');
        if (disableButton && disableButton.onPress) {
          disableButton.onPress();
        }
      });

      const switchComponent = getByRole('switch');
      
      await act(async () => {
        fireEvent(switchComponent, 'valueChange', false);
      });

      await waitFor(() => {
        expect(mockAlert.alert).toHaveBeenCalledWith(
          'Disable Biometric Authentication?',
          'You will need to use your password to sign in.',
          expect.any(Array)
        );
      });

      await waitFor(() => {
        expect(mockBiometric.setBiometricEnabled).toHaveBeenCalledWith(false);
      });
    });

    it('should handle user cancelling disable confirmation', async () => {
      mockBiometric.isBiometricEnabled.mockResolvedValue(true);

      const { getByRole } = render(<ProfileScreen />);
      
      await waitFor(() => {
        expect(mockBiometric.checkBiometricCapabilities).toHaveBeenCalled();
      });

      mockAlert.alert.mockImplementation((title, message, buttons) => {
        const cancelButton = buttons?.find((b: AlertButton) => b.text === 'Cancel');
        if (cancelButton && cancelButton.onPress) {
          cancelButton.onPress();
        }
      });

      const switchComponent = getByRole('switch');
      
      await act(async () => {
        fireEvent(switchComponent, 'valueChange', false);
      });

      await waitFor(() => {
        expect(mockAlert.alert).toHaveBeenCalled();
      });

      // Should not disable biometrics
      expect(mockBiometric.setBiometricEnabled).not.toHaveBeenCalledWith(false);
    });

    it('should prevent multiple simultaneous toggle operations', async () => {
      const { getByRole } = render(<ProfileScreen />);
      
      await waitFor(() => {
        expect(mockBiometric.checkBiometricCapabilities).toHaveBeenCalled();
      });

      const switchComponent = getByRole('switch');
      
      // Fire multiple rapid toggles
      await act(async () => {
        fireEvent(switchComponent, 'valueChange', true);
        fireEvent(switchComponent, 'valueChange', true);
        fireEvent(switchComponent, 'valueChange', true);
      });

      // Should only process one toggle
      await waitFor(() => {
        expect(mockAlert.prompt).toHaveBeenCalledTimes(1);
      });
    });

    it('should disable switch during loading operations', async () => {
      const { getByRole } = render(<ProfileScreen />);
      
      await waitFor(() => {
        expect(mockBiometric.checkBiometricCapabilities).toHaveBeenCalled();
      });

      // Mock a slow operation
      mockAlert.prompt.mockImplementation((title, message, buttons) => {
        // Don't call any button callback to simulate loading state
      });

      const switchComponent = getByRole('switch');
      
      await act(async () => {
        fireEvent(switchComponent, 'valueChange', true);
      });

      // Switch should be disabled during operation
      expect(switchComponent.props.disabled).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle device without biometric capabilities', async () => {
      mockBiometric.checkBiometricCapabilities.mockResolvedValue({
        hasHardware: false,
        isEnrolled: false,
        supportedTypes: [],
        canUseBiometrics: false,
      });

      const { getByRole } = render(<ProfileScreen />);
      
      // Since device doesn't support biometrics, switch shouldn't exist
      expect(() => getByRole('switch')).toThrow();
    });

    it('should handle API errors during password verification', async () => {
      (mockApi.apiClient.post as jest.Mock).mockRejectedValue({
        response: { status: 500 },
        message: 'Server error',
      });

      const { getByRole } = render(<ProfileScreen />);
      
      await waitFor(() => {
        expect(mockBiometric.checkBiometricCapabilities).toHaveBeenCalled();
      });

      mockAlert.prompt.mockImplementation((title, message, buttons) => {
        const enableButton = buttons?.find((b: AlertButton) => b.text === 'Enable');
        if (enableButton && enableButton.onPress) {
          enableButton.onPress('somepassword');
        }
      });

      const switchComponent = getByRole('switch');
      
      await act(async () => {
        fireEvent(switchComponent, 'valueChange', true);
      });

      await waitFor(() => {
        expect(mockAlert.alert).toHaveBeenCalledWith(
          'Invalid Password',
          'The password you entered is incorrect. Please try again.'
        );
      });
    });

    it('should handle errors during biometric enable/disable operations', async () => {
      mockBiometric.setBiometricEnabled.mockRejectedValue(new Error('Storage error'));

      const { getByRole } = render(<ProfileScreen />);
      
      await waitFor(() => {
        expect(mockBiometric.checkBiometricCapabilities).toHaveBeenCalled();
      });

      mockAlert.prompt.mockImplementation((title, message, buttons) => {
        const enableButton = buttons?.find((b: AlertButton) => b.text === 'Enable');
        if (enableButton && enableButton.onPress) {
          enableButton.onPress('correctpassword');
        }
      });

      const switchComponent = getByRole('switch');
      
      await act(async () => {
        fireEvent(switchComponent, 'valueChange', true);
      });

      await waitFor(() => {
        expect(mockAlert.alert).toHaveBeenCalledWith(
          'Error',
          'An error occurred while updating biometric settings.'
        );
      });
    });
  });
});