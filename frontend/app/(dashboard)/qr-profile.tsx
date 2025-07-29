import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Share, Dimensions, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import { useAuthStore } from '../../lib/auth';
import ProfileCircle from '../../components/ui/ProfileCircle';
import AppIcon from '../../assets/icon.png';

const { width } = Dimensions.get('window');
const QR_SIZE = Math.min(width * 0.7, 300);

export default function QRProfileScreen() {
  const { user } = useAuthStore();
  const params = useLocalSearchParams();
  const [isProcessing, setIsProcessing] = useState(false);
  const qrRef = useRef<unknown>(null);

  // Use current user or provided user data
  const displayUser = params.userId && params.name 
    ? {
        id: params.userId as string,
        firstName: (params.name as string).split(' ')[0] || '',
        lastName: (params.name as string).split(' ').slice(1).join(' ') || '',
        username: params.username as string || '',
        email: params.email as string || '',
      }
    : {
        id: user?.id || '',
        firstName: user?.firstName || '',
        lastName: user?.lastName || '',
        username: user?.username || '',
        email: user?.email || '',
      };

  // Generate payment URL (similar to Wise format)
  const paymentUrl = `https://remittance.app/pay/${displayUser.username || displayUser.id}`;
  
  const fullName = `${displayUser.firstName} ${displayUser.lastName}`.trim();
  const displayUsername = displayUser.username ? `@${displayUser.username}` : `@${displayUser.id}`;

  const handleShare = async () => {
    try {
      setIsProcessing(true);
      
      // Try native share first
      if (await Sharing.isAvailableAsync()) {
        await Share.share({
          message: `Send money to ${fullName} ${displayUsername}\\n${paymentUrl}`,
          url: paymentUrl,
          title: `Pay ${fullName}`,
        });
      } else {
        Alert.alert('Sharing not available', 'Sharing is not available on this device');
      }
    } catch (error) {
      console.error('Share error:', error);
      Alert.alert('Share Failed', 'Failed to share payment link');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = async () => {
    try {
      setIsProcessing(true);
      
      // Request media library permissions
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant permission to save images to your gallery');
        return;
      }

      // Generate QR code as base64
      qrRef.current?.toDataURL((dataURL: string) => {
        const saveQRCode = async () => {
          try {
            // Save to file system first
            const filename = `${displayUser.username || displayUser.id}_payment_qr.png`;
            const fileUri = FileSystem.documentDirectory + filename;
            
            await FileSystem.writeAsStringAsync(fileUri, dataURL, {
              encoding: FileSystem.EncodingType.Base64,
            });

            // Save to media library
            const asset = await MediaLibrary.createAssetAsync(fileUri);
            await MediaLibrary.createAlbumAsync('Remittance QR Codes', asset, false);
            
            Alert.alert('Success', 'QR code saved to your gallery!');
          } catch (error) {
            console.error('Save error:', error);
            Alert.alert('Save Failed', 'Failed to save QR code to gallery');
          }
        };
        
        saveQRCode();
      });
    } catch (error) {
      console.error('Download error:', error);
      Alert.alert('Download Failed', 'Failed to download QR code');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleScanQR = () => {
    router.push('/(dashboard)/qr-scanner');
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.headerButton}
          onPress={() => router.back()}
        >
          <Ionicons name="close" size={24} color="#1E293B" />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Payment QR Code</Text>
        
        <TouchableOpacity 
          style={styles.headerButton}
          onPress={handleShare}
          disabled={isProcessing}
        >
          <Ionicons name="share-outline" size={24} color="#3B82F6" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* User Profile Section */}
        <View style={styles.profileSection}>
        <View style={styles.avatarContainer}>
          <ProfileCircle
            firstName={displayUser.firstName}
            lastName={displayUser.lastName}
            email={displayUser.email}
            size={120}
            backgroundColor="#3B82F6"
          />
          <View style={styles.verifiedBadge}>
            <Ionicons name="checkmark-circle" size={28} color="#10B981" />
          </View>
        </View>
        
        <Text style={styles.userName}>{fullName}</Text>
        <Text style={styles.userHandle}>{displayUsername}</Text>
        
        {displayUser.username && (
          <View style={styles.usernameContainer}>
            <Ionicons name="at-circle" size={20} color="#3B82F6" />
            <Text style={styles.usernameText}>{displayUsername}</Text>
          </View>
        )}
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.shareButton]}
          onPress={handleShare}
          disabled={isProcessing}
        >
          <View style={styles.buttonIconContainer}>
            <Ionicons name="share" size={24} color="#FFFFFF" />
          </View>
          <Text style={styles.buttonText}>Share</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.actionButton, styles.downloadButton]}
          onPress={handleDownload}
          disabled={isProcessing}
        >
          <View style={styles.buttonIconContainer}>
            <Ionicons name="download" size={24} color="#FFFFFF" />
          </View>
          <Text style={styles.buttonText}>Save</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.actionButton, styles.scanButton]}
          onPress={handleScanQR}
          disabled={isProcessing}
        >
          <View style={styles.buttonIconContainer}>
            <Ionicons name="qr-code" size={24} color="#FFFFFF" />
          </View>
          <Text style={styles.buttonText}>Scan</Text>
        </TouchableOpacity>
      </View>

      {/* QR Code Section */}
      <View style={styles.qrSection}>
        <View style={styles.qrContainer}>
          <QRCode
            ref={qrRef}
            value={paymentUrl}
            size={QR_SIZE}
            color="#1E293B"
            backgroundColor="#FFFFFF"
            logo={AppIcon}
            logoSize={QR_SIZE * 0.15}
            logoBackgroundColor="transparent"
            logoBorderRadius={10}
            enableLinearGradient={false}
          />
        </View>
        
        <Text style={styles.qrLabel}>
          Scan to send money to {displayUser.firstName || 'this user'}
        </Text>
        <Text style={styles.qrUrl}>{paymentUrl}</Text>
      </View>

        {/* Footer Info */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Share this QR code with anyone who wants to send you money securely
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 32,
  },
  
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
  },

  // Profile Section
  profileSection: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: '#FFFFFF',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 2,
  },
  userName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
    textAlign: 'center',
  },
  userHandle: {
    fontSize: 18,
    color: '#64748B',
    fontWeight: '500',
    marginBottom: 12,
  },
  usernameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  usernameText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3B82F6',
  },

  // QR Code Section
  qrSection: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 32,
    backgroundColor: '#FFFFFF',
    minHeight: 300,
  },
  qrContainer: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 24,
    shadowColor: '#1E293B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 12,
    marginBottom: 24,
  },
  qrLabel: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 8,
    paddingHorizontal: 20,
  },
  qrUrl: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    fontFamily: 'monospace',
  },

  // Action Buttons
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    gap: 12,
    backgroundColor: '#FFFFFF',
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
  },
  shareButton: {
    backgroundColor: '#10B981',
  },
  downloadButton: {
    backgroundColor: '#3B82F6',
  },
  scanButton: {
    backgroundColor: '#8B5CF6',
  },
  buttonIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Footer
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
  },
  footerText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
  },
});