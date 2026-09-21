export interface SetupStepStatus {
  basic_info: boolean;
  pricing: boolean;
  room_types: boolean;
  amenities: boolean;
  facilities: boolean;
  media: boolean;
  policies: boolean;
}

export interface PropertySetupSteps {
  steps: SetupStepStatus;
  completed_steps: string[];
  percent_complete: number;
  is_complete: boolean;
}

