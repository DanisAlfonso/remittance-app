// User search and internal transfer types

export interface SearchResult {
  id: string;
  username?: string;
  displayName: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  memberSince: string;
}

export interface UserSearchResponse {
  success: boolean;
  results: SearchResult[];
  count: number;
}

export interface InternalTransfer {
  id: string;
  reference: string;
  type: 'sent' | 'received';
  amount: number;
  currency: string;
  platformFee: number;
  note?: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  createdAt: string;
  completedAt?: string;
  otherUser: {
    id: string;
    name: string;
    username?: string;
  };
}

export interface InternalTransferHistory {
  success: boolean;
  transfers: InternalTransfer[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export interface CreateInternalTransferRequest {
  recipientId: string;
  amount: number;
  currency: string;
  note?: string;
}

export interface CreateInternalTransferResponse {
  success: boolean;
  message: string;
  transfer: {
    id: string;
    reference: string;
    amount: number;
    currency: string;
    platformFee: number;
    note?: string;
    status: string;
    createdAt: string;
    completedAt?: string;
    sender: {
      id: string;
      name: string;
      username?: string;
    };
    recipient: {
      id: string;
      name: string;
      username?: string;
    };
  };
}

export interface FeeEstimate {
  success: boolean;
  estimate: {
    transferAmount: number;
    platformFee: number;
    totalAmount: number;
    currency: string;
    feeRate: number;
    estimatedAt: string;
  };
}

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  username?: string;
  displayName?: string;
  phone?: string;
  country?: string;
  isSearchable: boolean;
  isActive: boolean;
  emailVerified: boolean;
  phoneVerified: boolean;
  kycStatus: string;
  createdAt: string;
}

export interface UpdateProfileRequest {
  username?: string;
  displayName?: string;
  isSearchable?: boolean;
}

export interface UserSearchParams {
  query?: string;
  email?: string;
  phone?: string;
}