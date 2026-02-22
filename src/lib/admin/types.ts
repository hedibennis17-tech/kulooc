// ============================================================
// KULOOC Admin — Types & Rôles
// ============================================================

export type AdminRole =
  | 'super_admin'
  | 'admin'
  | 'agent'
  | 'developer'
  | 'consultant'
  | 'manager';

export interface AdminUser {
  uid: string;
  email: string;
  name: string;
  role: AdminRole;
  avatar?: string;
  createdAt: Date;
  lastLogin?: Date;
  isActive: boolean;
}

export type RolePermissions = {
  canRead: boolean;
  canWrite: boolean;
  canDelete: boolean;
  canApproveDocuments: boolean;
  canActivateAccounts: boolean;
  canBlockAccounts: boolean;
  canBanAccounts: boolean;
  canAssignRoles: boolean;
  canSendSMS: boolean;
  canSendEmail: boolean;
  canViewFinancials: boolean;
  canManagePromotions: boolean;
  canAccessDispatch: boolean;
  canViewReports: boolean;
  canManageDevelopment: boolean;
};

export const ROLE_PERMISSIONS: Record<AdminRole, RolePermissions> = {
  super_admin: {
    canRead: true,
    canWrite: true,
    canDelete: true,
    canApproveDocuments: true,
    canActivateAccounts: true,
    canBlockAccounts: true,
    canBanAccounts: true,
    canAssignRoles: true,
    canSendSMS: true,
    canSendEmail: true,
    canViewFinancials: true,
    canManagePromotions: true,
    canAccessDispatch: true,
    canViewReports: true,
    canManageDevelopment: true,
  },
  admin: {
    canRead: true,
    canWrite: true,
    canDelete: true,
    canApproveDocuments: true,
    canActivateAccounts: true,
    canBlockAccounts: true,
    canBanAccounts: true,
    canAssignRoles: false,
    canSendSMS: true,
    canSendEmail: true,
    canViewFinancials: true,
    canManagePromotions: true,
    canAccessDispatch: true,
    canViewReports: true,
    canManageDevelopment: false,
  },
  agent: {
    canRead: true,
    canWrite: true,
    canDelete: false,
    canApproveDocuments: true,
    canActivateAccounts: false,
    canBlockAccounts: false,
    canBanAccounts: false,
    canAssignRoles: false,
    canSendSMS: true,
    canSendEmail: true,
    canViewFinancials: false,
    canManagePromotions: false,
    canAccessDispatch: true,
    canViewReports: false,
    canManageDevelopment: false,
  },
  developer: {
    canRead: true,
    canWrite: true,
    canDelete: false,
    canApproveDocuments: false,
    canActivateAccounts: false,
    canBlockAccounts: false,
    canBanAccounts: false,
    canAssignRoles: false,
    canSendSMS: false,
    canSendEmail: false,
    canViewFinancials: false,
    canManagePromotions: false,
    canAccessDispatch: false,
    canViewReports: true,
    canManageDevelopment: true,
  },
  consultant: {
    canRead: true,
    canWrite: false,
    canDelete: false,
    canApproveDocuments: false,
    canActivateAccounts: false,
    canBlockAccounts: false,
    canBanAccounts: false,
    canAssignRoles: false,
    canSendSMS: false,
    canSendEmail: false,
    canViewFinancials: true,
    canManagePromotions: false,
    canAccessDispatch: false,
    canViewReports: true,
    canManageDevelopment: false,
  },
  manager: {
    canRead: true,
    canWrite: false,
    canDelete: false,
    canApproveDocuments: false,
    canActivateAccounts: false,
    canBlockAccounts: false,
    canBanAccounts: false,
    canAssignRoles: false,
    canSendSMS: false,
    canSendEmail: false,
    canViewFinancials: true,
    canManagePromotions: false,
    canAccessDispatch: false,
    canViewReports: true,
    canManageDevelopment: false,
  },
};

export const ROLE_LABELS: Record<AdminRole, string> = {
  super_admin: 'Super Administrateur',
  admin: 'Administrateur',
  agent: 'Agent',
  developer: 'Développeur',
  consultant: 'Consultant',
  manager: 'Gestionnaire',
};

export const ROLE_COLORS: Record<AdminRole, string> = {
  super_admin: 'bg-red-100 text-red-800 border-red-200',
  admin: 'bg-purple-100 text-purple-800 border-purple-200',
  agent: 'bg-blue-100 text-blue-800 border-blue-200',
  developer: 'bg-green-100 text-green-800 border-green-200',
  consultant: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  manager: 'bg-gray-100 text-gray-800 border-gray-200',
};

// Super Admin email — seul lui peut assigner des rôles
export const SUPER_ADMIN_EMAIL = 'hedibennis17@gmail.com';

// Types pour les modules
export type DriverStatus = 'active' | 'inactive' | 'standby' | 'blocked' | 'deactivated' | 'confirmed' | 'investigating' | 'pending';
export type DriverTier = 'standard' | 'gold' | 'premium' | 'platinum' | 'diamond';
export type ClientTier = 'regular' | 'premium' | 'gold' | 'subscription';
export type DocumentStatus = 'pending' | 'approved' | 'rejected' | 'standby' | 'expired';
export type TransactionStatus = 'completed' | 'pending' | 'refunded' | 'failed';
export type RideStatus = 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled' | 'scheduled';

export interface DashboardStats {
  totalRides: number;
  ridesToday: number;
  ridesInProgress: number;
  scheduledRides: number;
  totalRevenue: number;
  revenueToday: number;
  activeDrivers: number;
  totalDrivers: number;
  totalClients: number;
  newClientsToday: number;
  pendingDocuments: number;
  pendingComplaints: number;
}

export interface Transaction {
  id: string;
  rideId: string;
  passengerId: string;
  passengerName: string;
  driverId: string;
  driverName: string;
  amount: number;
  tax: number;
  total: number;
  status: TransactionStatus;
  paymentMethod: string;
  createdAt: Date;
  completedAt?: Date;
  pickup: string;
  destination: string;
  distance: number;
  duration: number;
}

export interface Client {
  id: string;
  uid: string;
  name: string;
  email: string;
  phone: string;
  tier: ClientTier;
  totalRides: number;
  totalSpent: number;
  rating: number;
  joinedAt: Date;
  lastRide?: Date;
  isBlocked: boolean;
  notes?: string;
}

export interface Driver {
  id: string;
  uid: string;
  name: string;
  email: string;
  phone: string;
  status: DriverStatus;
  tier: DriverTier;
  vehicle: {
    make: string;
    model: string;
    year: number;
    plate: string;
    color: string;
    type: string;
  };
  documents: {
    license: DocumentStatus;
    insurance: DocumentStatus;
    registration: DocumentStatus;
    criminal_check: DocumentStatus;
    profile_photo: DocumentStatus;
  };
  stats: {
    totalRides: number;
    rating: number;
    acceptanceRate: number;
    completionRate: number;
    totalEarnings: number;
    earningsToday: number;
    earningsThisWeek: number;
    earningsThisMonth: number;
  };
  wallet: {
    balance: number;
    pendingPayout: number;
    totalPaidOut: number;
  };
  rewards: {
    points: number;
    level: string;
    badges: string[];
  };
  complaints: number;
  warnings: number;
  joinedAt: Date;
  lastActive?: Date;
  location?: { lat: number; lng: number };
  notes?: string;
}

export interface Vehicle {
  id: string;
  driverId: string;
  driverName: string;
  make: string;
  model: string;
  year: number;
  plate: string;
  color: string;
  type: string;
  mileage: number;
  condition: 'excellent' | 'good' | 'fair' | 'poor';
  documents: {
    registration: { status: DocumentStatus; expiresAt?: Date };
    insurance: { status: DocumentStatus; expiresAt?: Date };
    inspection: { status: DocumentStatus; expiresAt?: Date };
  };
  isActive: boolean;
  addedAt: Date;
}

export interface Promotion {
  id: string;
  title: string;
  description: string;
  type: 'ride_bonus' | 'earnings_bonus' | 'referral' | 'seasonal';
  target: 'all_drivers' | 'specific_drivers' | 'all_clients' | 'specific_clients';
  targetIds?: string[];
  condition: string;
  reward: number;
  rewardType: 'cash' | 'points' | 'percentage';
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  usageCount: number;
  maxUsage?: number;
  createdBy: string;
  createdAt: Date;
}

export interface Message {
  id: string;
  from: string;
  fromName: string;
  fromRole: AdminRole;
  to: string;
  toName: string;
  subject: string;
  body: string;
  isRead: boolean;
  createdAt: Date;
  attachments?: string[];
}

export interface Notification {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  isRead: boolean;
  createdAt: Date;
  link?: string;
}
