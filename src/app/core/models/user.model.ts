import { UserRole } from '../services/auth.service';

export interface UserSummaryDto {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAtUtc: string;
}
