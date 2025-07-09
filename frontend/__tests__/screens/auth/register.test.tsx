import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import RegisterScreen from '../../../app/(auth)/register';

// Mock the auth store
const mockUseAuthStore = {
  register: jest.fn(),
  clearError: jest.fn(),
  error: null as string | null,
  isLoading: false,
};

jest.mock('../../../lib/auth', () => ({
  useAuthStore: () => mockUseAuthStore,
}));

describe('RegisterScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuthStore.error = null;
    mockUseAuthStore.isLoading = false;
  });

  describe('Rendering', () => {
    it('renders correctly with all elements', () => {
      const { getByText, getByPlaceholderText, getByTestId } = render(<RegisterScreen />);
      
      expect(getByTestId('button')).toBeTruthy();
      expect(getByText('Join us to start sending money')).toBeTruthy();
      expect(getByPlaceholderText('Enter your first name')).toBeTruthy();
      expect(getByPlaceholderText('Enter your last name')).toBeTruthy();
      expect(getByPlaceholderText('Enter your email')).toBeTruthy();
      expect(getByPlaceholderText('Create a password')).toBeTruthy();
      expect(getByTestId('button')).toBeTruthy();
      expect(getByText(/Already have an account\?/)).toBeTruthy();
    });

    it('renders with loading state', () => {
      mockUseAuthStore.isLoading = true;
      const { getByTestId } = render(<RegisterScreen />);
      
      expect(getByTestId('button-loading')).toBeTruthy();
    });

    it('renders with error state', () => {
      mockUseAuthStore.error = 'Email already exists';
      const { getByText } = render(<RegisterScreen />);
      
      expect(getByText('Email already exists')).toBeTruthy();
    });
  });

  describe('Form Validation', () => {
    it('validates required first name', async () => {
      const { getByPlaceholderText, getByText, getByTestId } = render(<RegisterScreen />);
      
      const firstNameInput = getByPlaceholderText('Enter your first name');
      const submitButton = getByTestId('button');
      
      fireEvent.changeText(firstNameInput, '');
      fireEvent.press(submitButton);
      
      await waitFor(() => {
        expect(getByText('First name is required')).toBeTruthy();
      });
    });

    it('validates required last name', async () => {
      const { getByPlaceholderText, getByText, getByTestId } = render(<RegisterScreen />);
      
      const lastNameInput = getByPlaceholderText('Enter your last name');
      const submitButton = getByTestId('button');
      
      fireEvent.changeText(lastNameInput, '');
      fireEvent.press(submitButton);
      
      await waitFor(() => {
        expect(getByText('Last name is required')).toBeTruthy();
      });
    });

    it('validates email format', async () => {
      const { getByPlaceholderText, getByText, getByTestId } = render(<RegisterScreen />);
      
      const emailInput = getByPlaceholderText('Enter your email');
      const submitButton = getByTestId('button');
      
      fireEvent.changeText(emailInput, 'invalid-email');
      fireEvent.press(submitButton);
      
      await waitFor(() => {
        expect(getByText('Please enter a valid email address')).toBeTruthy();
      });
    });

    it('validates required email field', async () => {
      const { getByPlaceholderText, getByText, getByTestId } = render(<RegisterScreen />);
      
      const emailInput = getByPlaceholderText('Enter your email');
      const submitButton = getByTestId('button');
      
      fireEvent.changeText(emailInput, '');
      fireEvent.press(submitButton);
      
      await waitFor(() => {
        expect(getByText('Email is required')).toBeTruthy();
      });
    });

    it('validates password requirements', async () => {
      const { getByPlaceholderText, getByText, getByTestId } = render(<RegisterScreen />);
      
      const passwordInput = getByPlaceholderText('Create a password');
      const submitButton = getByTestId('button');
      
      fireEvent.changeText(passwordInput, '123');
      fireEvent.press(submitButton);
      
      await waitFor(() => {
        expect(getByText('Password must be at least 8 characters')).toBeTruthy();
      });
    });

    it('validates name length limits', async () => {
      const { getByPlaceholderText, getByText, getByTestId } = render(<RegisterScreen />);
      
      const firstNameInput = getByPlaceholderText('Enter your first name');
      const submitButton = getByTestId('button');
      
      fireEvent.changeText(firstNameInput, 'a'.repeat(51)); // 51 characters
      fireEvent.press(submitButton);
      
      await waitFor(() => {
        expect(getByText('First name must be less than 50 characters')).toBeTruthy();
      });
    });

    it('prevents submission with invalid form', async () => {
      const { getByPlaceholderText, getByText, getByTestId } = render(<RegisterScreen />);
      
      const emailInput = getByPlaceholderText('Enter your email');
      const passwordInput = getByPlaceholderText('Create a password');
      const submitButton = getByTestId('button');
      
      fireEvent.changeText(emailInput, 'invalid-email');
      fireEvent.changeText(passwordInput, '123');
      fireEvent.press(submitButton);
      
      await waitFor(() => {
        expect(mockUseAuthStore.register).not.toHaveBeenCalled();
      });
    });
  });

  describe('Form Submission', () => {
    it('submits form with valid data', async () => {
      mockUseAuthStore.register.mockResolvedValue(true);
      
      const { getByPlaceholderText, getByText, getByTestId } = render(<RegisterScreen />);
      
      const firstNameInput = getByPlaceholderText('Enter your first name');
      const lastNameInput = getByPlaceholderText('Enter your last name');
      const emailInput = getByPlaceholderText('Enter your email');
      const passwordInput = getByPlaceholderText('Create a password');
      const confirmPasswordInput = getByPlaceholderText('Confirm your password');
      const submitButton = getByTestId('button');
      
      fireEvent.changeText(firstNameInput, 'John');
      fireEvent.changeText(lastNameInput, 'Doe');
      fireEvent.changeText(emailInput, 'john.doe@example.com');
      fireEvent.changeText(passwordInput, 'SecurePassword123!');
      fireEvent.changeText(confirmPasswordInput, 'SecurePassword123!');
      fireEvent.press(submitButton);
      
      await waitFor(() => {
        expect(mockUseAuthStore.register).toHaveBeenCalledWith({
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com',
          password: 'SecurePassword123!',
        });
      });
    });

    it('clears error when form is submitted', async () => {
      mockUseAuthStore.register.mockResolvedValue(true);
      
      const { getByPlaceholderText, getByText, getByTestId } = render(<RegisterScreen />);
      
      const firstNameInput = getByPlaceholderText('Enter your first name');
      const lastNameInput = getByPlaceholderText('Enter your last name');
      const emailInput = getByPlaceholderText('Enter your email');
      const passwordInput = getByPlaceholderText('Create a password');
      const confirmPasswordInput = getByPlaceholderText('Confirm your password');
      const submitButton = getByTestId('button');
      
      fireEvent.changeText(firstNameInput, 'John');
      fireEvent.changeText(lastNameInput, 'Doe');
      fireEvent.changeText(emailInput, 'john.doe@example.com');
      fireEvent.changeText(passwordInput, 'SecurePassword123!');
      fireEvent.changeText(confirmPasswordInput, 'SecurePassword123!');
      fireEvent.press(submitButton);
      
      await waitFor(() => {
        expect(mockUseAuthStore.clearError).toHaveBeenCalled();
      });
    });

    it('handles registration failure', async () => {
      mockUseAuthStore.register.mockRejectedValue(new Error('Registration failed'));
      
      const { getByPlaceholderText, getByText, getByTestId } = render(<RegisterScreen />);
      
      const firstNameInput = getByPlaceholderText('Enter your first name');
      const lastNameInput = getByPlaceholderText('Enter your last name');
      const emailInput = getByPlaceholderText('Enter your email');
      const passwordInput = getByPlaceholderText('Create a password');
      const confirmPasswordInput = getByPlaceholderText('Confirm your password');
      const submitButton = getByTestId('button');
      
      fireEvent.changeText(firstNameInput, 'John');
      fireEvent.changeText(lastNameInput, 'Doe');
      fireEvent.changeText(emailInput, 'john.doe@example.com');
      fireEvent.changeText(passwordInput, 'SecurePassword123!');
      fireEvent.changeText(confirmPasswordInput, 'SecurePassword123!');
      fireEvent.press(submitButton);
      
      await waitFor(() => {
        expect(mockUseAuthStore.register).toHaveBeenCalled();
      });
    });
  });

  describe('User Interaction', () => {
    it('updates first name input value', () => {
      const { getByPlaceholderText } = render(<RegisterScreen />);
      
      const firstNameInput = getByPlaceholderText('Enter your first name');
      
      fireEvent.changeText(firstNameInput, 'John');
      
      expect(firstNameInput.props.value).toBe('John');
    });

    it('updates last name input value', () => {
      const { getByPlaceholderText } = render(<RegisterScreen />);
      
      const lastNameInput = getByPlaceholderText('Enter your last name');
      
      fireEvent.changeText(lastNameInput, 'Doe');
      
      expect(lastNameInput.props.value).toBe('Doe');
    });

    it('updates email input value', () => {
      const { getByPlaceholderText } = render(<RegisterScreen />);
      
      const emailInput = getByPlaceholderText('Enter your email');
      
      fireEvent.changeText(emailInput, 'user@example.com');
      
      expect(emailInput.props.value).toBe('user@example.com');
    });

    it('updates password input value', () => {
      const { getByPlaceholderText } = render(<RegisterScreen />);
      
      const passwordInput = getByPlaceholderText('Create a password');
      
      fireEvent.changeText(passwordInput, 'mypassword');
      
      expect(passwordInput.props.value).toBe('mypassword');
    });

    it('toggles password visibility', () => {
      const { getByPlaceholderText, getByTestId } = render(<RegisterScreen />);
      
      const passwordInput = getByPlaceholderText('Create a password');
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
    it('has login link', () => {
      const { getByText } = render(<RegisterScreen />);
      
      expect(getByText('Sign in')).toBeTruthy();
    });
  });

  describe('Error Handling', () => {
    it('displays registration error', () => {
      mockUseAuthStore.error = 'User already exists';
      
      const { getByText } = render(<RegisterScreen />);
      
      expect(getByText('User already exists')).toBeTruthy();
    });

    it('clears validation errors when input changes', async () => {
      const { getByPlaceholderText, getByText, getByTestId, queryByText } = render(<RegisterScreen />);
      
      const firstNameInput = getByPlaceholderText('Enter your first name');
      const submitButton = getByTestId('button');
      
      // Trigger validation error
      fireEvent.changeText(firstNameInput, '');
      fireEvent.press(submitButton);
      
      await waitFor(() => {
        expect(getByText('First name is required')).toBeTruthy();
      });
      
      // Clear error by entering valid name
      fireEvent.changeText(firstNameInput, 'John');
      
      await waitFor(() => {
        expect(queryByText('First name is required')).toBeNull();
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper input labels', () => {
      const { getByText } = render(<RegisterScreen />);
      
      expect(getByText('First Name *')).toBeTruthy();
      expect(getByText('Last Name *')).toBeTruthy();
      expect(getByText('Email *')).toBeTruthy();
      expect(getByText('Password *')).toBeTruthy();
    });

    it('has proper button accessibility', () => {
      const { getByTestId } = render(<RegisterScreen />);
      
      expect(getByTestId('button')).toBeTruthy();
    });
  });
});