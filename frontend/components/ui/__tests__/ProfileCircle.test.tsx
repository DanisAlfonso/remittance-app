import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import ProfileCircle from '../ProfileCircle';

describe('ProfileCircle', () => {
  it('displays initials from first and last name', () => {
    const { getByText } = render(
      <ProfileCircle
        firstName="John"
        lastName="Doe"
        email="john.doe@example.com"
      />
    );
    
    expect(getByText('JD')).toBeTruthy();
  });

  it('displays first letter from email when no name provided', () => {
    const { getByText } = render(
      <ProfileCircle
        email="test@example.com"
      />
    );
    
    expect(getByText('T')).toBeTruthy();
  });

  it('displays first name initial when only first name provided', () => {
    const { getByText } = render(
      <ProfileCircle
        firstName="Alice"
        email="alice@example.com"
      />
    );
    
    expect(getByText('A')).toBeTruthy();
  });

  it('handles custom size and colors', () => {
    const { getByText } = render(
      <ProfileCircle
        firstName="Bob"
        email="bob@example.com"
        size={80}
        backgroundColor="#ff0000"
        textColor="#00ff00"
      />
    );
    
    const text = getByText('B');
    expect(text.props.style.fontSize).toBe(32); // 80 * 0.4
    expect(text.props.style.color).toBe('#00ff00');
  });

  it('displays photo when photoUrl is provided', () => {
    const { queryByText } = render(
      <ProfileCircle
        firstName="Jane"
        lastName="Smith"
        email="jane@example.com"
        photoUrl="https://example.com/photo.jpg"
      />
    );
    
    // Should not display initials when photo is provided
    expect(queryByText('JS')).toBeNull();
  });

  it('calls onPress when tapped', () => {
    const mockOnPress = jest.fn();
    const { getByText } = render(
      <ProfileCircle
        firstName="John"
        lastName="Doe"
        email="john@example.com"
        onPress={mockOnPress}
      />
    );
    
    const circle = getByText('JD');
    fireEvent.press(circle);
    
    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  it('does not call onPress when no onPress prop provided', () => {
    const { getByText } = render(
      <ProfileCircle
        firstName="John"
        lastName="Doe"
        email="john@example.com"
      />
    );
    
    const circle = getByText('JD');
    // Should not throw error when pressed without onPress
    expect(() => fireEvent.press(circle)).not.toThrow();
  });
});