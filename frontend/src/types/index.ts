export interface User {
  id: number | string;
  email: string;
  firstName: string;
  lastName: string;
  createdAt?: string;
  school?: string;
  formation?: string;
  studyYear?: string;
  alternanceRhythm?: string;
  desiredStartDate?: string;
  linkedinUrl?: string;
}

export interface Application {
  id: number;
  companyName: string;
  position: string;
  status: 'pending' | 'interview' | 'accepted' | 'rejected';
  applicationDate?: string;
  responseDate?: string;
  notes?: string;
  location?: string;
  salaryRange?: string;
  jobUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface DashboardStatistics {
  total: number;
  statusDistribution: {
    pending?: number;
    interview?: number;
    accepted?: number;
    rejected?: number;
  };
  monthlyData: Array<{
    month: string;
    count: number;
  }>;
  responseRate: number;
  responded: number;
  pending: number;
  interview: number;
  accepted: number;
  rejected: number;
}

