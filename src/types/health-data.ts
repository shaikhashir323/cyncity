export interface HealthData {
  stepCount: number;
  heartRate: number;
  activeCalories: number;
  bloodOxygen: number;
  sleepHours: number;
  distance: number;
  restingHeartRate: number;
  floorsClimbed: number;
  location?: string; // e.g., "City Park, near the main entrance"
  activityStatus?: string; // e.g., "Resting", "Walking"
}