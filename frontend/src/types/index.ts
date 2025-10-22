export interface User {
  id: string;
  discordId: string;
  username: string;
  name?: string;
  email: string;
  avatar?: string;
  isAdmin: boolean;
  isWhitelisted: boolean;
  createdAt: string;
}

export interface Deal {
  id: string;
  dealId: string;
  propertyName: string;
  propertyAddress: string;
  loanAmount: number;
  purchasePrice: number;
  propertyType: string;
  noi?: number;
  dscr?: number;
  requestedLeverage?: number;
  notes?: string;
  status: string;
  ghlOpportunityId?: string;
  pipelineId?: string;
  stageId?: string;
  userId: string;
  createdAt: any; // Firebase Timestamp or string
  updatedAt: any; // Firebase Timestamp or string
  
  // Contact/Sponsor Details
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  contactId?: string;
  businessName?: string;
  streetAddress?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  website?: string;
  timeZone?: string;
  lastActivityDateSalesforce?: string;
  phone?: string;
  contactSource?: string;
  contactType?: string;
  contactDocumentUpload?: string;
  opportunitySource?: string;
  
  // Company Details
  companyName?: string;
  companyPhone?: string;
  companyEmail?: string;
  companyWebsite?: string;
  companyAddress?: string;
  companyState?: string;
  companyCity?: string;
  companyDescription?: string;
  companyPostalCode?: string;
  companyCountry?: string;
  
  // Lead Property Details
  leadPropertyType?: string;
  leadPropertyAddress?: string;
  leadPropertyCity?: string;
  leadPropertyState?: string;
  leadPropertyPurchaseDate?: string;
  
  // Document Fields
  fileUpload?: string;
  
  applicationDate?: string;
  sponsorName?: string;
  sponsorNetWorth?: string;
  sponsorLiquidity?: string;
  
  // Opportunity Details
  opportunityName?: string;
  pipeline?: string;
  stage?: string;
  stageLastUpdated?: string;
  opportunityValue?: number;
  owner?: string;
  followers?: string[];
  tags?: string[];
  additionalContacts?: string[];
  lostReason?: string;
  applicationDocumentUpload?: string;
  applicationAdditionalInformation?: string;
  
  // Contact-level Application Fields
  applicationDealType?: string;
  applicationPropertyType?: string;
  applicationPropertyAddress?: string;
  applicationPropertyVintage?: string;
  applicationSponsorNetWorth?: string;
  applicationSponsorLiquidity?: string;
  applicationLoanRequest?: string;
  
  applicationSubmittedBy?: string;
  discordUsername?: string;
  leadPropertyPurchasePrice?: string;
  leadPropertyNoOfUnits?: string;
  
  // New form fields
  loanRequest?: string;
  additionalInformation?: string;
  
  // Property Details
  propertyAPN?: string;
  propertyVintage?: string;
  propertyStatus?: string;
  numberOfUnits?: number;
  originalPurchaseDate?: string;
  occupancyPercentage?: number;
  appraisedValue?: number;
  debitYield?: number;
  propertyCapEx?: number;
  costBasis?: number;
  managementEntity?: string;
  occupancyPercentageDate?: string;
  
  // Loan Details
  loanType?: string;
  loanTerm?: number;
  interestRate?: number;
  amortizationPeriod?: number;
  prepaymentPenalty?: string;
  loanPurpose?: string;
  borrowingEntity?: string;
  lender?: string;
  unpaidPrincipalBalance?: number;
  dealType?: string;
  investmentType?: string;
  ltv?: number;
  hcOriginationFee?: string;
  ysp?: number;
  processingFee?: string;
  lenderOriginationFee?: string;
  term?: string;
  index?: string;
  indexPercentage?: number;
  spreadPercentage?: number;
  ratePercentage?: number;
  amortization?: string;
  exitFee?: string;
  recourse?: string;
  fixedMaturityDate?: string;
  floatingMaturityDate?: string;
  
  // Additional Financial Details
  capRate?: number;
  cashFlow?: number;
  totalProjectCost?: number;
  renovationCost?: number;
  closingCosts?: number;
  
  // Audit Information
  createdBy?: string;
  createdOn?: string;
  auditLogs?: string;
}

export interface Document {
  id: string;
  filename: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
  tags: string[];
  oneDriveId?: string;
  oneDriveUrl?: string;
  userId: string;
  dealId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Analytics {
  users: {
    total: number;
    whitelisted: number;
    admins: number;
    active: number;
  };
  deals: {
    total: number;
    byStatus: Record<string, number>;
    totalValue: number;
  };
  documents: {
    total: number;
    totalSize: number;
  };
  overview: {
    totalActivity: number;
    recentActivity: number;
  };
  performance: {
    topUsers: Array<{
      id: string;
      name: string;
      dealsCount: number;
    }>;
  };
}

export interface CreateDealData {
  propertyName: string;
  propertyAddress: string;
  loanAmount: number;
  purchasePrice: number;
  propertyType: string;
  noi?: number;
  dscr?: number;
  requestedLeverage?: number;
  notes?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  businessName?: string;
  opportunitySource?: string;
  applicationDate?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface Appointment {
  id: string;
  ghlAppointmentId: string;
  ghlCalendarId: string;
  ghlContactId: string;
  subAccountId: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  appointmentDate: string;
  appointmentTitle: string;
  appointmentNotes?: string;
  assignedToUserId?: string;
  assignedByUserId?: string;
  assignedAt?: string;
  status: 'unassigned' | 'assigned' | 'called' | 'completed' | 'no-answer' | 'rescheduled' | 'cancelled';
  callNotes?: string;
  callOutcome?: 'successful' | 'no-answer' | 'voicemail' | 'reschedule' | 'not-interested';
  callDuration?: number;
  followUpDate?: string;
  appointmentStatusUpdate?: string;
  calledAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TermsAcceptance {
  id: string;
  userId: string;
  acceptedAt: string;
  termsVersion: string;
}

export interface CallNotesData {
  callNotes: string;
  callOutcome: 'successful' | 'no-answer' | 'voicemail' | 'reschedule' | 'not-interested';
  callDuration?: number;
  followUpDate?: string;
  appointmentStatusUpdate?: string;
}

export interface AppointmentFilters {
  status?: string;
  assignedToUserId?: string;
  startDate?: string;
  endDate?: string;
  subAccountId?: string;
}

export interface SubAccount {
  id: string;
  name: string;
  apiKey: string;
  v2Token?: string;
  locationId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}