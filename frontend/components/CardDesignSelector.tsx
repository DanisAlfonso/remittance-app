import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CardDesigns, CardDesignProps } from './CardDesigns';

export type CardDesignType = 'classic' | 'premium' | 'midnight' | 'ocean';

interface CardDesignSelectorProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (design: CardDesignType) => void;
  selectedDesign: CardDesignType;
  cardProps: CardDesignProps;
}

const designInfo = {
  classic: {
    name: 'Classic RemitPay',
    description: 'Professional blue gradient with RemitPay branding',
    icon: 'business' as const,
  },
  premium: {
    name: 'Premium Gold',
    description: 'Luxury gold gradient for premium users',
    icon: 'diamond' as const,
  },
  midnight: {
    name: 'Midnight Black',
    description: 'Sleek dark theme for sophisticated look',
    icon: 'moon' as const,
  },
  ocean: {
    name: 'Ocean Green',
    description: 'Fresh green gradient inspired by nature',
    icon: 'water' as const,
  },
};

export default function CardDesignSelector({
  visible,
  onClose,
  onSelect,
  selectedDesign,
  cardProps,
}: CardDesignSelectorProps) {
  const [previewDesign, setPreviewDesign] = useState<CardDesignType>(selectedDesign);

  const handleSelect = () => {
    onSelect(previewDesign);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={onClose}>
            <Ionicons name="close" size={24} color="#1E3A8A" />
          </Pressable>
          <Text style={styles.title}>Choose Card Design</Text>
          <Pressable onPress={handleSelect}>
            <Text style={styles.selectButton}>Select</Text>
          </Pressable>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Card Preview */}
          <View style={styles.previewSection}>
            <Text style={styles.sectionTitle}>Preview</Text>
            <View style={styles.cardPreview}>
              {CardDesigns[previewDesign](cardProps)}
            </View>
          </View>

          {/* Design Options */}
          <View style={styles.designSection}>
            <Text style={styles.sectionTitle}>Available Designs</Text>
            <View style={styles.designGrid}>
              {(Object.keys(designInfo) as CardDesignType[]).map((design) => {
                const info = designInfo[design];
                const isSelected = previewDesign === design;
                
                return (
                  <Pressable
                    key={design}
                    style={[
                      styles.designOption,
                      isSelected && styles.designOptionSelected
                    ]}
                    onPress={() => setPreviewDesign(design)}
                  >
                    <View style={styles.designThumbnail}>
                      <View style={[styles.miniCard, { transform: [{ scale: 0.25 }] }]}>
                        {CardDesigns[design]({
                          ...cardProps,
                          cardNumber: '**** **** **** ****',
                          holderName: 'PREVIEW',
                        })}
                      </View>
                    </View>
                    
                    <View style={styles.designInfo}>
                      <View style={styles.designHeader}>
                        <Ionicons 
                          name={info.icon} 
                          size={20} 
                          color={isSelected ? '#3B82F6' : '#6B7280'} 
                        />
                        <Text style={[
                          styles.designName,
                          isSelected && styles.designNameSelected
                        ]}>
                          {info.name}
                        </Text>
                      </View>
                      <Text style={styles.designDescription}>{info.description}</Text>
                    </View>

                    {isSelected && (
                      <View style={styles.selectedIndicator}>
                        <Ionicons name="checkmark-circle" size={24} color="#3B82F6" />
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E3A8A',
  },
  selectButton: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3B82F6',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  previewSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E3A8A',
    marginBottom: 16,
  },
  cardPreview: {
    alignItems: 'center',
    padding: 20,
  },
  designSection: {
    flex: 1,
  },
  designGrid: {
    gap: 16,
  },
  designOption: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  designOptionSelected: {
    borderColor: '#3B82F6',
    backgroundColor: '#EFF6FF',
  },
  designThumbnail: {
    width: 80,
    height: 50,
    marginRight: 16,
    overflow: 'hidden',
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniCard: {
    width: 300,
    height: 190,
  },
  designInfo: {
    flex: 1,
    gap: 4,
  },
  designHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  designName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  designNameSelected: {
    color: '#1E40AF',
  },
  designDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 18,
  },
  selectedIndicator: {
    marginLeft: 12,
  },
});