import type { Transfer } from '../types/transfer';

/**
 * Determines if a transfer is incoming (receive) or outgoing (send)
 */
export const getTransferType = (transfer: Transfer): 'send' | 'receive' => {
  return transfer.sourceAmount > 0 ? 'receive' : 'send';
};

/**
 * Extracts the recipient/sender name from a transfer
 * 
 * This is the single source of truth for display names across the app.
 * 
 * For outgoing transfers: Shows recipient name
 * For incoming transfers: Shows sender name
 */
export const getTransferDisplayName = (transfer: Transfer): string => {
  const transferType = getTransferType(transfer);
  
  if (transferType === 'receive') {
    // For incoming transfers, show sender name
    
    // First priority: Check recipient.name (backend populates this with sender name for inbound transfers)
    if (transfer.recipient?.name && transfer.recipient.name !== 'Unknown' && transfer.recipient.name !== 'Recipient') {
      return transfer.recipient.name;
    }
    
    // Second priority: Parse from description
    if (transfer.description?.includes('Received from ')) {
      const senderName = transfer.description.replace('Received from ', '').trim();
      if (senderName && senderName.length > 2) {
        return senderName;
      }
    }
    
    // Third priority: Parse from reference
    if (transfer.reference?.includes('Received from ')) {
      const senderName = transfer.reference.replace('Received from ', '').trim();
      if (senderName && senderName.length > 2) {
        return senderName;
      }
    }
    
    // Legacy fallbacks
    if (transfer.description?.includes('Transfer from ')) {
      const senderName = transfer.description.replace('Transfer from ', '').trim();
      if (senderName && senderName.length > 2) {
        return senderName;
      }
    }
    
    if (transfer.reference?.includes('Transfer from ')) {
      const senderName = transfer.reference.replace('Transfer from ', '').trim();
      if (senderName && senderName.length > 2) {
        return senderName;
      }
    }
    
    // Fallback for incoming transfers
    return 'App user';
  } else {
    // For outgoing transfers, show recipient name
    
    if (transfer.recipient?.name && transfer.recipient.name !== 'Unknown' && transfer.recipient.name !== 'Recipient') {
      const name = transfer.recipient.name;
      const iban = transfer.recipient.iban || transfer.recipient.accountNumber;
      
      if (iban && iban.length >= 4) {
        return `${name} (${iban.slice(-4)})`;
      }
      return name;
    }
    
    // Parse from description for outgoing
    if (transfer.description?.includes('Transfer to ')) {
      const recipientName = transfer.description.replace('Transfer to ', '').trim();
      if (recipientName && recipientName.length > 2) {
        return recipientName;
      }
    }
    
    if (transfer.reference?.includes('Transfer to ')) {
      const recipientName = transfer.reference.replace('Transfer to ', '').trim();
      if (recipientName && recipientName.length > 2) {
        return recipientName;
      }
    }
    
    // Fallback for outgoing transfers
    return 'Recipient';
  }
};

/**
 * Comprehensive currency symbol mapping - single source of truth
 */
const CURRENCY_SYMBOLS: Record<string, string> = {
  'EUR': '€',
  'USD': '$',
  'HNL': 'L', // Honduran Lempira
  'GBP': '£',
  'CAD': 'C$',
  'AUD': 'A$',
  'JPY': '¥',
  'CHF': 'Fr',
  'CNY': '¥',
  'SEK': 'kr',
  'NZD': 'NZ$',
};

/**
 * Get currency symbol for a given currency code
 */
export const getCurrencySymbol = (currencyCode: string): string => {
  return CURRENCY_SYMBOLS[currencyCode] || currencyCode;
};

/**
 * Formats currency amount with proper symbol
 */
export const formatTransferAmount = (amount: number, currencyCode: string): string => {
  const symbol = getCurrencySymbol(currencyCode);
  return `${symbol}${Math.abs(amount).toFixed(2)}`;
};

/**
 * Gets the display text for transfer type
 */
export const getTransferTypeText = (transfer: Transfer): string => {
  const transferType = getTransferType(transfer);
  return transferType === 'send' ? 'Money sent' : 'Money received';
};