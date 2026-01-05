export interface ScheduledClass {
  schedule_id: string;
  name: string;
  createdAt: string;
  startTime: string;
  endTime: string;
  date: string;
}

// Alias for backward compatibility
export type ScheduleItem = ScheduledClass;

export interface NewScheduledClass {
  name: string;
  startTime: string;
  endTime: string;
  date: string;
  schedule_id?: string; // Make schedule_id optional for new schedules, required for editing
}

export interface ScheduleFormRef {
  triggerValidation: () => Promise<boolean>;
  isLoading: () => boolean;
}

export interface ScheduleProps {
  onLoadingChange?: (loading: boolean) => void;
}
