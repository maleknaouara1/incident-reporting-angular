import { UserRole } from '../services/auth.service';

export interface UserSummaryDto {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAtUtc: string;
}

// Shared with all staff by GET /api/users/directory (no email)
export interface UserDirectoryEntry {
  id: string;
  fullName: string;
  role: UserRole;
  isActive: boolean;
}
