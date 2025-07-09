import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import Button from '../Button';

describe('Button Component', () => {
  describe('Basic Functionality', () => {
    it('renders correctly with title', () => {
      const { getByTestId } = render(
        <Button title="Test Button" onPress={() => {}} />
      );
      
      expect(getByTestId('button-text')).toBeTruthy();
      expect(getByTestId('button-text')).toHaveTextContent('Test Button');
    });

    it('calls onPress when pressed', () => {
      const mockOnPress = jest.fn();
      const { getByTestId } = render(
        <Button title="Test Button" onPress={mockOnPress} />
      );
      
      fireEvent.press(getByTestId('button'));
      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });

    it('does not call onPress when disabled', () => {
      const mockOnPress = jest.fn();
      const { getByTestId } = render(
        <Button title="Test Button" onPress={mockOnPress} disabled />
      );
      
      fireEvent.press(getByTestId('button'));
      expect(mockOnPress).not.toHaveBeenCalled();
    });

    it('does not call onPress when loading', () => {
      const mockOnPress = jest.fn();
      const { getByTestId } = render(
        <Button title="Test Button" onPress={mockOnPress} loading />
      );
      
      fireEvent.press(getByTestId('button'));
      expect(mockOnPress).not.toHaveBeenCalled();
    });
  });

  describe('Loading State', () => {
    it('shows loading indicator when loading', () => {
      const { getByTestId, queryByTestId } = render(
        <Button title="Test Button" onPress={() => {}} loading />
      );
      
      expect(getByTestId('button-loading')).toBeTruthy();
      expect(queryByTestId('button-text')).toBeNull();
    });

    it('hides loading indicator when not loading', () => {
      const { getByTestId, queryByTestId } = render(
        <Button title="Test Button" onPress={() => {}} loading={false} />
      );
      
      expect(queryByTestId('button-loading')).toBeNull();
      expect(getByTestId('button-text')).toBeTruthy();
    });
  });

  describe('Variants', () => {
    it('renders primary variant correctly', () => {
      const { getByTestId } = render(
        <Button title="Primary" onPress={() => {}} variant="primary" />
      );
      
      const button = getByTestId('button');
      expect(button).toBeTruthy();
      expect(button.props.style).toEqual(
        expect.objectContaining({
          backgroundColor: '#007AFF',
        })
      );
    });

    it('renders secondary variant correctly', () => {
      const { getByTestId } = render(
        <Button title="Secondary" onPress={() => {}} variant="secondary" />
      );
      
      const button = getByTestId('button');
      expect(button).toBeTruthy();
      expect(button.props.style).toEqual(
        expect.objectContaining({
          backgroundColor: '#F8F9FA',
        })
      );
    });

    it('renders danger variant correctly', () => {
      const { getByTestId } = render(
        <Button title="Danger" onPress={() => {}} variant="danger" />
      );
      
      const button = getByTestId('button');
      expect(button).toBeTruthy();
      expect(button.props.style).toEqual(
        expect.objectContaining({
          backgroundColor: '#DC3545',
        })
      );
    });

    it('renders success variant correctly', () => {
      const { getByTestId } = render(
        <Button title="Success" onPress={() => {}} variant="success" />
      );
      
      const button = getByTestId('button');
      expect(button).toBeTruthy();
      expect(button.props.style).toEqual(
        expect.objectContaining({
          backgroundColor: '#28A745',
        })
      );
    });

    it('renders outline variant correctly', () => {
      const { getByTestId } = render(
        <Button title="Outline" onPress={() => {}} variant="outline" />
      );
      
      const button = getByTestId('button');
      expect(button).toBeTruthy();
      expect(button.props.style).toEqual(
        expect.objectContaining({
            backgroundColor: 'transparent',
            borderWidth: 2,
            borderColor: '#007AFF',
        })
      );
    });
  });

  describe('Sizes', () => {
    it('renders small size correctly', () => {
      const { getByTestId } = render(
        <Button title="Small" onPress={() => {}} size="small" />
      );
      
      const button = getByTestId('button');
      expect(button).toBeTruthy();
      expect(button.props.style).toEqual(
        expect.objectContaining({
            height: 36,
            minWidth: 80,
        })
      );
    });

    it('renders medium size correctly', () => {
      const { getByTestId } = render(
        <Button title="Medium" onPress={() => {}} size="medium" />
      );
      
      const button = getByTestId('button');
      expect(button).toBeTruthy();
      expect(button.props.style).toEqual(
        expect.objectContaining({
            height: 48,
            minWidth: 100,
        })
      );
    });

    it('renders large size correctly', () => {
      const { getByTestId } = render(
        <Button title="Large" onPress={() => {}} size="large" />
      );
      
      const button = getByTestId('button');
      expect(button).toBeTruthy();
      expect(button.props.style).toEqual(
        expect.objectContaining({
            height: 56,
            minWidth: 120,
        })
      );
    });
  });

  describe('Full Width', () => {
    it('renders full width correctly', () => {
      const { getByTestId } = render(
        <Button title="Full Width" onPress={() => {}} fullWidth />
      );
      
      const button = getByTestId('button');
      expect(button).toBeTruthy();
      expect(button.props.style).toEqual(
        expect.objectContaining({
            width: '100%',
        })
      );
    });
  });

  describe('Disabled State', () => {
    it('applies disabled styling when disabled', () => {
      const { getByTestId } = render(
        <Button title="Disabled" onPress={() => {}} disabled />
      );
      
      const button = getByTestId('button');
      expect(button).toBeTruthy();
      expect(button.props.style).toEqual(
        expect.objectContaining({
            backgroundColor: '#9CA3AF',
        })
      );
    });

    it('is not clickable when disabled', () => {
      const { getByTestId } = render(
        <Button title="Disabled" onPress={() => {}} disabled />
      );
      
      const button = getByTestId('button');
      expect(button.props.accessibilityState?.disabled).toBe(true);
    });
  });

  describe('Custom Styles', () => {
    it('applies custom button style', () => {
      const customStyle = { backgroundColor: '#FF0000' };
      const { getByTestId } = render(
        <Button title="Custom" onPress={() => {}} style={customStyle} />
      );
      
      const button = getByTestId('button');
      expect(button.props.style).toEqual(
        expect.objectContaining(customStyle)
      );
    });

    it('applies custom text style', () => {
      const customTextStyle = { color: '#FF0000' };
      const { getByTestId } = render(
        <Button title="Custom Text" onPress={() => {}} textStyle={customTextStyle} />
      );
      
      const text = getByTestId('button-text');
      expect(text.props.style).toEqual(
        expect.arrayContaining([expect.objectContaining(customTextStyle)])
      );
    });
  });

  describe('Accessibility', () => {
    it('has correct testID', () => {
      const { getByTestId } = render(
        <Button title="Test" onPress={() => {}} />
      );
      
      expect(getByTestId('button')).toBeTruthy();
      expect(getByTestId('button-text')).toBeTruthy();
    });

    it('has correct accessibility attributes', () => {
      const { getByTestId } = render(
        <Button title="Test" onPress={() => {}} />
      );
      
      const button = getByTestId('button');
      expect(button.props.accessible).toBe(true);
    });
  });
});