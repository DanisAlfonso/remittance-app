// Mock missing functions
global.setImmediate = global.setImmediate || ((fn, ...args) => global.setTimeout(fn, 0, ...args));

// Mock fetch
global.fetch = jest.fn();

// Mock AbortController
global.AbortController = class AbortController {
  constructor() {
    this.signal = {
      aborted: false,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    };
  }
  abort() {
    this.signal.aborted = true;
  }
};

// Mock expo-secure-store
jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(() => Promise.resolve()),
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

// Mock expo-router
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    navigate: jest.fn(),
    canGoBack: jest.fn(() => false),
  }),
  usePathname: () => '/test',
  useLocalSearchParams: () => ({}),
  useGlobalSearchParams: () => ({}),
  useFocusEffect: jest.fn((callback) => {
    // Execute the callback immediately in tests
    if (typeof callback === 'function') {
      const cleanupFn = callback();
      // If callback returns a cleanup function, we can call it later if needed
      return cleanupFn;
    }
  }),
  Link: ({ children, href, ...props }) => {
    const React = require('react');
    const { TouchableOpacity, Text } = require('react-native');
    return React.createElement(TouchableOpacity, {
      ...props,
      onPress: () => console.log(`Navigate to ${href}`),
    }, React.createElement(Text, {}, children));
  },
  Redirect: ({ href }) => {
    const React = require('react');
    const { Text } = require('react-native');
    return React.createElement(Text, {}, `Redirecting to ${href}`);
  },
  Stack: ({ children, ...props }) => {
    const React = require('react');
    const { View } = require('react-native');
    return React.createElement(View, props, children);
  },
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    navigate: jest.fn(),
    canGoBack: jest.fn(() => false),
  },
}));

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});