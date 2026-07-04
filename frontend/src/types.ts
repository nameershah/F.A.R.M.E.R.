export interface QueryResponse {
  answer: string;
  escalated: boolean;
  trace: string[];
}

export interface HealthResponse {
  status: string;
  service?: string;
  mongodbLoggingConnected: boolean;
  timestamp?: string;
}
