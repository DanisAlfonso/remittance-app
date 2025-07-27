import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

export interface BiometricCapabilities {
  hasHardware: boolean;
  isEnrolled: boolean;
  supportedTypes: LocalAuthentication.AuthenticationType[];
  canUseBiometrics: boolean;
}

export interface BiometricAuthResult {
  success: boolean;
  error?: string;
  cancelled?: boolean;
}

const BIOMETRIC_ENABLED_KEY = 'biometric_enabled';
const BIOMETRIC_CREDENTIALS_KEY = 'biometric_credentials';

/**
 * Check device biometric capabilities
 */
export const checkBiometricCapabilities = async (): Promise<BiometricCapabilities> => {
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
    
    return {
      hasHardware,
      isEnrolled,
      supportedTypes,
      canUseBiometrics: hasHardware && isEnrolled,
    };
  } catch (error) {
    console.error('Error checking biometric capabilities:', error);
    return {
      hasHardware: false,
      isEnrolled: false,
      supportedTypes: [],
      canUseBiometrics: false,
    };
  }
};

/**
 * Authenticate user with biometrics
 */
export const authenticateWithBiometrics = async (
  reason: string = 'Please authenticate to continue'
): Promise<BiometricAuthResult> => {
  try {
    const capabilities = await checkBiometricCapabilities();
    
    if (!capabilities.canUseBiometrics) {
      return {
        success: false,
        error: 'Biometric authentication is not available on this device',
      };
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: reason,
      cancelLabel: 'Cancel',
      fallbackLabel: 'Use Password',
      disableDeviceFallback: false,
    });

    if (result.success) {
      return { success: true };
    } else {
      return {
        success: false,
        cancelled: result.error === 'user_cancel' || result.error === 'app_cancel' || result.error === 'system_cancel',
        error: result.error,
      };
    }
  } catch (error) {
    console.error('Biometric authentication error:', error);
    return {
      success: false,
      error: 'Authentication failed',
    };
  }
};

/**
 * Check if user has enabled biometric authentication
 */
export const isBiometricEnabled = async (): Promise<boolean> => {
  try {
    const enabled = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
    return enabled === 'true';
  } catch {
    return false;
  }
};

/**
 * Enable or disable biometric authentication
 */
export const setBiometricEnabled = async (enabled: boolean): Promise<void> => {
  try {
    await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, enabled.toString());
    
    // If disabling, also remove stored credentials
    if (!enabled) {
      await SecureStore.deleteItemAsync(BIOMETRIC_CREDENTIALS_KEY);
    }
  } catch (error) {
    console.error('Error setting biometric preference:', error);
    throw error;
  }
};

/**
 * Store user credentials for biometric authentication
 */
export const storeBiometricCredentials = async (email: string, password: string): Promise<void> => {
  try {
    const credentials = JSON.stringify({ email, password });
    await SecureStore.setItemAsync(BIOMETRIC_CREDENTIALS_KEY, credentials);
  } catch (error) {
    console.error('Error storing biometric credentials:', error);
    throw error;
  }
};

/**
 * Retrieve stored credentials for biometric authentication
 */
export const getBiometricCredentials = async (): Promise<{ email: string; password: string } | null> => {
  try {
    const credentials = await SecureStore.getItemAsync(BIOMETRIC_CREDENTIALS_KEY);
    if (credentials) {
      return JSON.parse(credentials);
    }
    return null;
  } catch (error) {
    console.error('Error retrieving biometric credentials:', error);
    return null;
  }
};

/**
 * Get user-friendly biometric type name
 * For devices with multiple types, use generic term to avoid confusion
 */
export const getBiometricTypeName = (types: LocalAuthentication.AuthenticationType[]): string => {
  // Check if device has multiple biometric types
  const hasMultiple = types.length > 1;
  
  if (hasMultiple) {
    // For devices with multiple types, use generic terms to avoid confusion
    return 'Biometric Authentication';
  }
  
  // For single biometric type devices, be specific
  if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
    return 'Touch ID';
  }
  if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
    return 'Face ID';
  }
  if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
    return 'Iris ID';
  }
  return 'Biometric';
};

/**
 * Get appropriate icon name for biometric type
 * Use generic icon for devices with multiple types to avoid confusion
 */
export const getBiometricIconName = (types: LocalAuthentication.AuthenticationType[]) => {
  // Check if device has multiple biometric types
  const hasMultiple = types.length > 1;
  
  if (hasMultiple) {
    // For devices with multiple types, use generic security icon
    return 'shield-checkmark' as const;
  }
  
  // For single biometric type devices, use specific icons
  if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
    return 'finger-print' as const;
  }
  if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
    return 'scan' as const;
  }
  if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
    return 'eye' as const;
  }
  return 'shield-checkmark' as const;
};

/**
 * Clear all biometric data (for account switching only)
 */
export const clearBiometricData = async (): Promise<void> => {
  try {
    await SecureStore.deleteItemAsync(BIOMETRIC_ENABLED_KEY);
    await SecureStore.deleteItemAsync(BIOMETRIC_CREDENTIALS_KEY);
  } catch (error) {
    console.error('Error clearing biometric data:', error);
    // Don't throw error to avoid breaking logout flow
  }
};

/**
 * Check if stored biometric credentials match current user
 * If not, clear them to prevent cross-user contamination
 */
export const validateBiometricUser = async (currentUserEmail: string): Promise<void> => {
  try {
    const credentials = await getBiometricCredentials();
    if (credentials && credentials.email !== currentUserEmail) {
      // Different user - clear biometric data
      console.log('Different user detected, clearing biometric data');
      await clearBiometricData();
    }
  } catch (error) {
    console.error('Error validating biometric user:', error);
  }
};