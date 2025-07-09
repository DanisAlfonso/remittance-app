import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import SimpleInput from '../SimpleInput';

describe('SimpleInput Component', () => {
  describe('Basic Functionality', () => {
    it('renders correctly with value', () => {
      const { getByTestId } = render(
        <SimpleInput value="test value" onChangeText={() => {}} />
      );
      
      const input = getByTestId('text-input');
      expect(input).toBeTruthy();
      expect(input.props.value).toBe('test value');
    });

    it('calls onChangeText when text changes', () => {
      const mockOnChangeText = jest.fn();
      const { getByTestId } = render(
        <SimpleInput value="" onChangeText={mockOnChangeText} />
      );
      
      fireEvent.changeText(getByTestId('text-input'), 'new text');
      expect(mockOnChangeText).toHaveBeenCalledWith('new text');
    });

    it('displays placeholder text', () => {
      const { getByTestId } = render(
        <SimpleInput 
          value="" 
          onChangeText={() => {}} 
          placeholder="Enter text here"
        />
      );
      
      const input = getByTestId('text-input');
      expect(input.props.placeholder).toBe('Enter text here');
    });
  });

  describe('Label', () => {
    it('displays label when provided', () => {
      const { getByTestId } = render(
        <SimpleInput 
          value="" 
          onChangeText={() => {}} 
          label="Test Label"
        />
      );
      
      const label = getByTestId('input-label');
      expect(label).toBeTruthy();
      expect(label).toHaveTextContent('Test Label');
    });

    it('does not display label when not provided', () => {
      const { queryByTestId } = render(
        <SimpleInput value="" onChangeText={() => {}} />
      );
      
      expect(queryByTestId('input-label')).toBeNull();
    });

    it('displays required asterisk when required', () => {
      const { getByTestId } = render(
        <SimpleInput 
          value="" 
          onChangeText={() => {}} 
          label="Required Field"
          required
        />
      );
      
      const label = getByTestId('input-label');
      expect(label).toHaveTextContent('Required Field *');
    });
  });

  describe('Error State', () => {
    it('displays error message when error is provided', () => {
      const { getByTestId } = render(
        <SimpleInput 
          value="" 
          onChangeText={() => {}} 
          error="This field is required"
        />
      );
      
      const error = getByTestId('input-error');
      expect(error).toBeTruthy();
      expect(error).toHaveTextContent('This field is required');
    });

    it('does not display error message when no error', () => {
      const { queryByTestId } = render(
        <SimpleInput value="" onChangeText={() => {}} />
      );
      
      expect(queryByTestId('input-error')).toBeNull();
    });
  });

  describe('Password Field', () => {
    it('shows password toggle button for password field', () => {
      const { getByTestId } = render(
        <SimpleInput 
          value="password123" 
          onChangeText={() => {}} 
          secureTextEntry
        />
      );
      
      const toggleButton = getByTestId('right-icon-button');
      expect(toggleButton).toBeTruthy();
    });

    it('toggles password visibility when toggle button is pressed', () => {
      const { getByTestId } = render(
        <SimpleInput 
          value="password123" 
          onChangeText={() => {}} 
          secureTextEntry
        />
      );
      
      const input = getByTestId('text-input');
      const toggleButton = getByTestId('right-icon-button');
      
      // Initially password should be hidden
      expect(input.props.secureTextEntry).toBe(true);
      
      // Press toggle button
      fireEvent.press(toggleButton);
      
      // Password should now be visible
      expect(input.props.secureTextEntry).toBe(false);
    });
  });

  describe('Disabled State', () => {
    it('is not editable when disabled', () => {
      const { getByTestId } = render(
        <SimpleInput 
          value="test" 
          onChangeText={() => {}} 
          disabled
        />
      );
      
      const input = getByTestId('text-input');
      expect(input.props.editable).toBe(false);
    });
  });

  describe('Keyboard Types', () => {
    it('applies correct keyboard type for email', () => {
      const { getByTestId } = render(
        <SimpleInput 
          value="" 
          onChangeText={() => {}} 
          keyboardType="email-address"
        />
      );
      
      const input = getByTestId('text-input');
      expect(input.props.keyboardType).toBe('email-address');
    });

    it('applies correct keyboard type for numeric', () => {
      const { getByTestId } = render(
        <SimpleInput 
          value="" 
          onChangeText={() => {}} 
          keyboardType="numeric"
        />
      );
      
      const input = getByTestId('text-input');
      expect(input.props.keyboardType).toBe('numeric');
    });
  });

  describe('Auto Capitalize', () => {
    it('applies correct auto capitalize setting', () => {
      const { getByTestId } = render(
        <SimpleInput 
          value="" 
          onChangeText={() => {}} 
          autoCapitalize="none"
        />
      );
      
      const input = getByTestId('text-input');
      expect(input.props.autoCapitalize).toBe('none');
    });
  });

  describe('Multiline', () => {
    it('supports multiline input', () => {
      const { getByTestId } = render(
        <SimpleInput 
          value="" 
          onChangeText={() => {}} 
          multiline
          numberOfLines={3}
        />
      );
      
      const input = getByTestId('text-input');
      expect(input.props.multiline).toBe(true);
      expect(input.props.numberOfLines).toBe(3);
    });
  });

  describe('Character Count', () => {
    it('displays character count when maxLength is set', () => {
      const { getByTestId } = render(
        <SimpleInput 
          value="test" 
          onChangeText={() => {}} 
          maxLength={10}
        />
      );
      
      const characterCount = getByTestId('character-count');
      expect(characterCount).toBeTruthy();
      expect(characterCount).toHaveTextContent('4/10');
    });

    it('does not display character count when maxLength is not set', () => {
      const { queryByTestId } = render(
        <SimpleInput value="test" onChangeText={() => {}} />
      );
      
      expect(queryByTestId('character-count')).toBeNull();
    });
  });

  describe('Size Variants', () => {
    it('applies small size styles', () => {
      const { getByTestId } = render(
        <SimpleInput 
          value="" 
          onChangeText={() => {}} 
          size="small"
        />
      );
      
      const input = getByTestId('text-input');
      expect(input.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            height: 40,
            fontSize: 14,
          }),
        ])
      );
    });

    it('applies medium size styles', () => {
      const { getByTestId } = render(
        <SimpleInput 
          value="" 
          onChangeText={() => {}} 
          size="medium"
        />
      );
      
      const input = getByTestId('text-input');
      expect(input.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            height: 48,
            fontSize: 16,
          }),
        ])
      );
    });

    it('applies large size styles', () => {
      const { getByTestId } = render(
        <SimpleInput 
          value="" 
          onChangeText={() => {}} 
          size="large"
        />
      );
      
      const input = getByTestId('text-input');
      expect(input.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            height: 56,
            fontSize: 18,
          }),
        ])
      );
    });
  });

  describe('Focus States', () => {
    it('handles focus events correctly', () => {
      const { getByTestId } = render(
        <SimpleInput value="" onChangeText={() => {}} />
      );
      
      const input = getByTestId('text-input');
      
      // Focus the input
      fireEvent(input, 'focus');
      
      // Blur the input
      fireEvent(input, 'blur');
      
      // No errors should occur
      expect(input).toBeTruthy();
    });
  });

  describe('Icons', () => {
    it('displays left icon when provided', () => {
      const { getByTestId } = render(
        <SimpleInput 
          value="" 
          onChangeText={() => {}} 
          leftIcon="📧"
        />
      );
      
      const container = getByTestId('input-container');
      expect(container).toBeTruthy();
    });

    it('displays right icon when provided', () => {
      const { getByTestId } = render(
        <SimpleInput 
          value="" 
          onChangeText={() => {}} 
          rightIcon="❌"
          onRightIconPress={() => {}}
        />
      );
      
      const iconButton = getByTestId('right-icon-button');
      expect(iconButton).toBeTruthy();
    });

    it('calls onRightIconPress when right icon is pressed', () => {
      const mockOnRightIconPress = jest.fn();
      const { getByTestId } = render(
        <SimpleInput 
          value="" 
          onChangeText={() => {}} 
          rightIcon="❌"
          onRightIconPress={mockOnRightIconPress}
        />
      );
      
      const iconButton = getByTestId('right-icon-button');
      fireEvent.press(iconButton);
      
      expect(mockOnRightIconPress).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility', () => {
    it('has correct testIDs', () => {
      const { getByTestId } = render(
        <SimpleInput 
          value="" 
          onChangeText={() => {}} 
          label="Test Label"
          error="Test Error"
        />
      );
      
      expect(getByTestId('input-container')).toBeTruthy();
      expect(getByTestId('input-label')).toBeTruthy();
      expect(getByTestId('text-input')).toBeTruthy();
      expect(getByTestId('input-error')).toBeTruthy();
    });
  });
});