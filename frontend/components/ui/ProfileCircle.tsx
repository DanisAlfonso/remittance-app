import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';

interface ProfileCircleProps {
  firstName?: string;
  lastName?: string;
  email: string;
  photoUrl?: string;
  size?: number;
  backgroundColor?: string;
  textColor?: string;
  onPress?: () => void;
}

export default function ProfileCircle({ 
  firstName, 
  lastName, 
  email, 
  photoUrl, 
  size = 56,
  backgroundColor = '#007AFF',
  textColor = '#ffffff',
  onPress
}: ProfileCircleProps) {
  const getInitials = (): string => {
    if (firstName && lastName) {
      return `${firstName[0]?.toUpperCase()}${lastName[0]?.toUpperCase()}`;
    }
    if (firstName) {
      return firstName[0]?.toUpperCase() || '';
    }
    return email[0]?.toUpperCase() || '?';
  };

  const circleStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    backgroundColor,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  };

  const textStyle = {
    fontSize: size * 0.4,
    fontWeight: 'bold' as const,
    color: textColor,
  };

  const CircleContent = () => (
    <>
      {photoUrl ? (
        <Image 
          source={{ uri: photoUrl }}
          style={[circleStyle, { backgroundColor: 'transparent' }]}
          resizeMode="cover"
        />
      ) : (
        <Text style={textStyle}>
          {getInitials()}
        </Text>
      )}
    </>
  );

  if (onPress) {
    return (
      <TouchableOpacity style={circleStyle} onPress={onPress}>
        <CircleContent />
      </TouchableOpacity>
    );
  }

  return (
    <View style={circleStyle}>
      <CircleContent />
    </View>
  );
}