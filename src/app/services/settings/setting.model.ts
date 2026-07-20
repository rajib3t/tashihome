export interface SettingItem {
  name: string;
  value: string;
}

export interface SettingsResponse {
  status: string;
  message: string;
  data: SettingItem[];
}

// Example usage:
// const resp: SettingsResponse = ...
// resp.data.forEach(item => console.log(item.name, item.value));
