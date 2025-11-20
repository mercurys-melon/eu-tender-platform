// Common types for all tender procedures

export interface TenderCommonInput {
  title: string;
  internalRef?: string;
  cpv: string[];
  description: string;
  valueEstimate?: number;
  duration?: {
    months?: number;
    start?: string;
    end?: string;
  };
  documents: Array<{
    path: string;
    audience: 'all' | 'prequalified' | 'invited';
  }>;
  tildelingskriterier: Array<{
    name: string;
    weight?: number;
    type: 'price' | 'quality' | 'cost' | 'other';
  }>;
}

export interface QAConfig {
  qaDeadline: string;
  qaScope: 'application' | 'tender' | 'both';
}

export interface DeadlineConfig {
  submissionDeadline: string;
  blockLateSubmissions?: boolean;
}

export interface ESPDConfig {
  useESPD: boolean;
  exclusionGroundsPreset?: 'standardDK' | 'standardEU' | 'custom';
  selectionCriteria: Array<{
    type: 'economic' | 'technical' | 'experience' | 'other';
    value: string;
  }>;
  specialConditions?: string[];
}

// Specific types for each procedure

export interface RestrictedSpecific {
  minInvite?: number;
  maxInvite?: number;
}

export interface NegotiatedSpecific {
  minInvite?: number;
  maxInvite?: number;
  requireInitialOffers?: boolean;
  rounds?: number;
}

export interface QualificationSystemSpecific {
  openEnded: true;
  categories: string[];
}

// Input types for each flow

export interface OpenTenderInput extends TenderCommonInput {
  espd: ESPDConfig;
  qa: QAConfig;
  deadlines: DeadlineConfig;
}

export interface RestrictedTenderInput extends TenderCommonInput {
  espd: ESPDConfig;
  qaApplication: QAConfig;
  applicationDeadline: string;
  minInvite?: number;
  maxInvite?: number;
}

export interface NegotiatedProcedureInput extends TenderCommonInput {
  espd: ESPDConfig;
  qaApplication: QAConfig;
  applicationDeadline: string;
  minInvite?: number;
  maxInvite?: number;
  requireInitialOffers?: boolean;
  rounds?: number;
  qaTender?: QAConfig;
  initialOfferDeadline?: string;
  finalOfferDeadline?: string;
  justification?: string; // Why negotiation is needed
}

export interface QualificationSystemInput extends Omit<TenderCommonInput, 'tildelingskriterier' | 'valueEstimate' | 'duration'> {
  espd: ESPDConfig;
  openEnded: true;
  categories: string[];
}

export interface AwardNoticeInput {
  tenderTitle: string;
  winnerName: string;
  winnerRegNo?: string;
  contractValue?: number;
}

// Internal types for workflow management

export interface TenderState {
  id?: string;
  title: string;
  status: 'draft' | 'published' | 'evaluating' | 'awarded' | 'completed';
  procedure: 'open' | 'restricted' | 'negotiated' | 'qualification';
  currentStep: string;
  tedReference?: string;
}

export interface ApplicationState {
  id: string;
  supplierName: string;
  status: 'submitted' | 'evaluated' | 'accepted' | 'rejected' | 'invited';
  espdScore?: number;
  evaluationNotes?: string;
}

export interface NegotiationRound {
  roundNumber: number;
  deadline: string;
  participants: string[];
  documents?: string[];
  completed: boolean;
}

// Configuration types

export interface BlockBidConfig {
  baseUrl: string;
  email: string;
  password: string;
  timezone: string;
  language: string;
  artifactsDir: string;
}

export interface TestConfig {
  headless: boolean;
  slowMo: number;
  timeout: number;
  retries: number;
  workers: number;
}

// Error types

export interface ErrorContext {
  testName: string;
  step: string;
  selectorHints?: any[];
  pageUrl?: string;
  timestamp: string;
}

// Utility types

export type TenderProcedure = 'open' | 'restricted' | 'negotiated' | 'qualification';
export type DocumentAudience = 'all' | 'prequalified' | 'invited';
export type AwardCriterionType = 'price' | 'quality' | 'cost' | 'other';
export type ESPDPreset = 'standardDK' | 'standardEU' | 'custom';
export type QAScope = 'application' | 'tender' | 'both';
export type TenderStatus = 'draft' | 'published' | 'evaluating' | 'awarded' | 'completed';
export type ApplicationStatus = 'submitted' | 'evaluated' | 'accepted' | 'rejected' | 'invited';

// Form field types

export interface FormField {
  name: string;
  value: string | number | boolean | string[];
  required: boolean;
  type: 'text' | 'number' | 'date' | 'select' | 'checkbox' | 'radio' | 'file' | 'textarea';
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// API response types

export interface TEDResponse {
  success: boolean;
  reference?: string;
  message?: string;
  errors?: string[];
}

export interface UploadResponse {
  success: boolean;
  fileId?: string;
  fileName: string;
  errors?: string[];
}
