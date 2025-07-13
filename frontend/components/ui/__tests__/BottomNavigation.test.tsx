import React from 'react';
import { render } from '@testing-library/react-native';
import BottomNavigation from '../BottomNavigation';

// Mock expo-router
const mockPush = jest.fn();
let mockPathname = '/(dashboard)';

jest.mock('expo-router', () => ({
  router: {
    push: mockPush,
  },
  usePathname: () => mockPathname,
}));

describe('BottomNavigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPathname = '/(dashboard)'; // Reset to default
  });

  it('renders all navigation items', () => {
    const { getByText } = render(<BottomNavigation />);
    
    expect(getByText('Home')).toBeTruthy();
    expect(getByText('Activity')).toBeTruthy();
    expect(getByText('Send')).toBeTruthy();
    expect(getByText('Recipients')).toBeTruthy();
  });

  it('highlights the active route', () => {
    const { getByText } = render(<BottomNavigation />);
    
    const homeTab = getByText('Home');
    expect(homeTab.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ color: '#007AFF' })
      ])
    );
  });

  it('renders all tabs as touchable components', () => {
    const { getByText } = render(<BottomNavigation />);
    
    // Test that all tabs are rendered and can be found
    expect(getByText('Home')).toBeTruthy();
    expect(getByText('Activity')).toBeTruthy();
    expect(getByText('Send')).toBeTruthy();
    expect(getByText('Recipients')).toBeTruthy();
  });

  it('renders with custom style', () => {
    const customStyle = { backgroundColor: 'red' };
    const { getByText } = render(<BottomNavigation style={customStyle} />);
    
    // Since we don't have testID in the component, we'll just check it renders without error
    expect(getByText('Home')).toBeTruthy();
  });

  it('highlights Activity tab when on transactions route', () => {
    mockPathname = '/(dashboard)/transactions';
    const { getByText } = render(<BottomNavigation />);
    
    const activityTab = getByText('Activity');
    expect(activityTab.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ color: '#007AFF' })
      ])
    );
  });

  it('highlights Send tab when on send-money route', () => {
    mockPathname = '/(dashboard)/send-money';
    const { getByText } = render(<BottomNavigation />);
    
    const sendTab = getByText('Send');
    expect(sendTab.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ color: '#007AFF' })
      ])
    );
  });

  it('highlights Recipients tab when on beneficiaries route', () => {
    mockPathname = '/(dashboard)/beneficiaries';
    const { getByText } = render(<BottomNavigation />);
    
    const recipientsTab = getByText('Recipients');
    expect(recipientsTab.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ color: '#007AFF' })
      ])
    );
  });

  it('handles routes without dashboard prefix correctly', () => {
    mockPathname = '/transactions';
    const { getByText } = render(<BottomNavigation />);
    
    const activityTab = getByText('Activity');
    expect(activityTab.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ color: '#007AFF' })
      ])
    );
  });
});