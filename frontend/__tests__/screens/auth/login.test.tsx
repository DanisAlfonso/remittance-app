import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import LoginScreen from '../../../app/(auth)/login';

// Mock the auth store
const mockUseAuthStore = {
  login: jest.fn(),
  clearError: jest.fn(),
  error: null as string | null,
  isLoading: false,
};

jest.mock('../../../lib/auth', () => ({
  useAuthStore: () => mockUseAuthStore,
}));

describe('LoginScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuthStore.error = null;
    mockUseAuthStore.isLoading = false;
  });

  describe('Rendering', () => {
    it('renders correctly with all elements', () => {
      const { getByText, getByPlaceholderText } = render(<LoginScreen />);
      
      expect(getByText('Welcome Back')).toBeTruthy();
      expect(getByText('Sign in to your account')).toBeTruthy();
      expect(getByPlaceholderText('Enter your email')).toBeTruthy();
      expect(getByPlaceholderText('Enter your password')).toBeTruthy();
      expect(getByText('Sign In')).toBeTruthy();
      expect(getByText(/Don't have an account\?/)).toBeTruthy();
    });

    it('renders with loading state', () => {
      mockUseAuthStore.isLoading = true;
      const { getByTestId } = render(<LoginScreen />);
      
      expect(getByTestId('button-loading')).toBeTruthy();
    });

    it('renders with error state', () => {
      mockUseAuthStore.error = 'Invalid credentials';
      const { getByText } = render(<LoginScreen />);
      
      expect(getByText('Invalid credentials')).toBeTruthy();
    });
  });

  describe('Form Validation', () => {
    it('validates email format', async () => {
      const { getByPlaceholderText, getByText } = render(<LoginScreen />);
      
      const emailInput = getByPlaceholderText('Enter your email');
      const submitButton = getByText('Sign In');
      
      fireEvent.changeText(emailInput, 'invalid-email');
      fireEvent.press(submitButton);
      
      await waitFor(() => {
        expect(getByText('Please enter a valid email address')).toBeTruthy();
      });
    });

    it('validates required email field', async () => {
      const { getByPlaceholderText, getByText } = render(<LoginScreen />);
      
      const emailInput = getByPlaceholderText('Enter your email');
      const submitButton = getByText('Sign In');
      
      fireEvent.changeText(emailInput, '');
      fireEvent.press(submitButton);
      
      await waitFor(() => {
        expect(getByText('Email is required')).toBeTruthy();
      });
    });

    it('validates required password field', async () => {
      const { getByPlaceholderText, getByText } = render(<LoginScreen />);
      
      const passwordInput = getByPlaceholderText('Enter your password');
      const submitButton = getByText('Sign In');
      
      fireEvent.changeText(passwordInput, '');
      fireEvent.press(submitButton);
      
      await waitFor(() => {
        expect(getByText('Password is required')).toBeTruthy();
      });
    });

    it('validates minimum password length', async () => {
      const { getByPlaceholderText, getByText } = render(<LoginScreen />);
      
      const passwordInput = getByPlaceholderText('Enter your password');
      const submitButton = getByText('Sign In');
      
      fireEvent.changeText(passwordInput, '123');
      fireEvent.press(submitButton);
      
      await waitFor(() => {
        expect(getByText('Password must be at least 8 characters')).toBeTruthy();
      });
    });

    it('prevents submission with invalid form', async () => {
      const { getByPlaceholderText, getByText } = render(<LoginScreen />);
      
      const emailInput = getByPlaceholderText('Enter your email');
      const passwordInput = getByPlaceholderText('Enter your password');
      const submitButton = getByText('Sign In');
      
      fireEvent.changeText(emailInput, 'invalid-email');
      fireEvent.changeText(passwordInput, '123');
      fireEvent.press(submitButton);
      
      await waitFor(() => {
        expect(mockUseAuthStore.login).not.toHaveBeenCalled();
      });
    });
  });

  describe('Form Submission', () => {
    it('submits form with valid data', async () => {
      mockUseAuthStore.login.mockResolvedValue(true);
      
      const { getByPlaceholderText, getByText } = render(<LoginScreen />);
      
      const emailInput = getByPlaceholderText('Enter your email');
      const passwordInput = getByPlaceholderText('Enter your password');
      const submitButton = getByText('Sign In');
      
      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'password123');
      fireEvent.press(submitButton);
      
      await waitFor(() => {
        expect(mockUseAuthStore.login).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password123',
        });
      });
    });

    it('clears error when form is submitted', async () => {
      mockUseAuthStore.login.mockResolvedValue(true);
      
      const { getByPlaceholderText, getByText } = render(<LoginScreen />);
      
      const emailInput = getByPlaceholderText('Enter your email');
      const passwordInput = getByPlaceholderText('Enter your password');
      const submitButton = getByText('Sign In');
      
      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'password123');
      fireEvent.press(submitButton);
      
      await waitFor(() => {
        expect(mockUseAuthStore.clearError).toHaveBeenCalled();
      });
    });

    it('handles login failure', async () => {
      mockUseAuthStore.login.mockRejectedValue(new Error('Login failed'));
      
      const { getByPlaceholderText, getByText } = render(<LoginScreen />);
      
      const emailInput = getByPlaceholderText('Enter your email');
      const passwordInput = getByPlaceholderText('Enter your password');
      const submitButton = getByText('Sign In');
      
      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'password123');
      fireEvent.press(submitButton);
      
      await waitFor(() => {
        expect(mockUseAuthStore.login).toHaveBeenCalled();
      });
    });
  });

  describe('User Interaction', () => {
    it('updates email input value', () => {
      const { getByPlaceholderText } = render(<LoginScreen />);
      
      const emailInput = getByPlaceholderText('Enter your email');
      
      fireEvent.changeText(emailInput, 'user@example.com');
      
      expect(emailInput.props.value).toBe('user@example.com');
    });

    it('updates password input value', () => {
      const { getByPlaceholderText } = render(<LoginScreen />);
      
      const passwordInput = getByPlaceholderText('Enter your password');
      
      fireEvent.changeText(passwordInput, 'mypassword');
      
      expect(passwordInput.props.value).toBe('mypassword');
    });

    it('toggles password visibility', () => {
      const { getByPlaceholderText, getByTestId } = render(<LoginScreen />);
      
      const passwordInput = getByPlaceholderText('Enter your password');
      const toggleButton = getByTestId('password-right-icon-button');
      
      // Initially password should be hidden
      expect(passwordInput.props.secureTextEntry).toBe(true);
      
      // Toggle password visibility
      fireEvent.press(toggleButton);
      
      // Password should now be visible
      expect(passwordInput.props.secureTextEntry).toBe(false);
    });
  });

  describe('Navigation', () => {
    it('has register link', () => {
      const { getByText } = render(<LoginScreen />);
      
      expect(getByText('Sign up')).toBeTruthy();
    });
  });

  describe('Error Handling', () => {
    it('displays authentication error', () => {
      mockUseAuthStore.error = 'Invalid email or password';
      
      const { getByText } = render(<LoginScreen />);
      
      expect(getByText('Invalid email or password')).toBeTruthy();
    });

    it('clears validation errors when input changes', async () => {
      const { getByPlaceholderText, getByText, queryByText } = render(<LoginScreen />);
      
      const emailInput = getByPlaceholderText('Enter your email');
      const submitButton = getByText('Sign In');
      
      // Trigger validation error
      fireEvent.changeText(emailInput, 'invalid-email');
      fireEvent.press(submitButton);
      
      await waitFor(() => {
        expect(getByText('Please enter a valid email address')).toBeTruthy();
      });
      
      // Clear error by entering valid email
      fireEvent.changeText(emailInput, 'valid@example.com');
      
      await waitFor(() => {
        expect(queryByText('Please enter a valid email address')).toBeNull();
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper input labels', () => {
      const { getByText } = render(<LoginScreen />);
      
      expect(getByText('Email *')).toBeTruthy();
      expect(getByText('Password *')).toBeTruthy();
    });

    it('has proper button accessibility', () => {
      const { getByTestId } = render(<LoginScreen />);
      
      expect(getByTestId('button')).toBeTruthy();
    });
  });
});