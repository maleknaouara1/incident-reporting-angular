export enum IncidentStatus {
  New = 1,
  Assigned = 2,
  InProgress = 3,
  Resolved = 4,
  Closed = 5
}

export enum IncidentPriority {
  Low = 1,
  Medium = 2,
  High = 3,
  Critical = 4
}

export enum IncidentCategory {
  Infrastructure = 1,
  Network = 2,
  Security = 3,
  Application = 4,
  Database = 5,
  Access = 6,
  Other = 99
}

export interface IncidentCommentDto {
  id: string;
  message: string;
  authorUserId: string;
  createdAtUtc: string;
}

export interface IncidentDto {
  id: string;
  title: string;
  description: string;
  priority: IncidentPriority;
  status: IncidentStatus;
  category: IncidentCategory;
  createdByUserId: string;
  assignedToUserId: string | null;
  createdAtUtc: string;
  updatedAtUtc: string | null;
  resolvedAtUtc: string | null;
  aiSummary: string | null;
  aiSuggestedResolution: string | null;
  aiConfidenceScore: number | null;
  comments: IncidentCommentDto[];
}

export enum IncidentHistoryAction {
  Created = 1,
  AiAnalysisGenerated = 2,
  Assigned = 3,
  StatusChanged = 4,
  CommentAdded = 5
}

export interface IncidentHistoryDto {
  id: string;
  incidentId: string;
  action: IncidentHistoryAction;
  description: string | null;
  oldValue: string | null;
  newValue: string | null;
  changedByUserId: string | null;
  createdAtUtc: string;
}

export interface CreateIncidentRequest {
  title: string;
  description: string;
  priority: IncidentPriority;
  category: IncidentCategory;
}

export type IncidentSortField = 'createdAtUtc' | 'updatedAtUtc' | 'priority' | 'status' | 'title';

// Query string accepted by GET /api/incidents
export interface IncidentQuery {
  pageNumber?: number;
  pageSize?: number;
  status?: IncidentStatus | null;
  priority?: IncidentPriority | null;
  category?: IncidentCategory | null;
  assignedToUserId?: string | null;
  search?: string | null;
  sortBy?: IncidentSortField;
  sortDescending?: boolean;
}

// Mirrors the API's one-step workflow (IncidentService.IsValidTransition)
export const NEXT_STATUS: Partial<Record<IncidentStatus, IncidentStatus>> = {
  [IncidentStatus.Assigned]: IncidentStatus.InProgress,
  [IncidentStatus.InProgress]: IncidentStatus.Resolved,
  [IncidentStatus.Resolved]: IncidentStatus.Closed
};

export const PRIORITY_LABELS: Record<IncidentPriority, string> = {
  [IncidentPriority.Low]: 'Low',
  [IncidentPriority.Medium]: 'Medium',
  [IncidentPriority.High]: 'High',
  [IncidentPriority.Critical]: 'Critical'
};

export const STATUS_LABELS: Record<IncidentStatus, string> = {
  [IncidentStatus.New]: 'New',
  [IncidentStatus.Assigned]: 'Assigned',
  [IncidentStatus.InProgress]: 'In Progress',
  [IncidentStatus.Resolved]: 'Resolved',
  [IncidentStatus.Closed]: 'Closed'
};

export const CATEGORY_LABELS: Record<IncidentCategory, string> = {
  [IncidentCategory.Infrastructure]: 'Infrastructure',
  [IncidentCategory.Network]: 'Network',
  [IncidentCategory.Security]: 'Security',
  [IncidentCategory.Application]: 'Application',
  [IncidentCategory.Database]: 'Database',
  [IncidentCategory.Access]: 'Access',
  [IncidentCategory.Other]: 'Other'
};

// Turns a label map into [{ value, label }] options for <select>s
export const toOptions = <T extends number>(labels: Record<T, string>) =>
  (Object.entries(labels) as [string, string][]).map(([value, label]) => ({ value: Number(value) as T, label }));


