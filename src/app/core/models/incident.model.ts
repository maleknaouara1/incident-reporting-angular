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


