/**
 * Settings Components
 *
 * Components for the system settings page.
 *
 * @module components/settings
 */

export {
  generalSettingsSchema,
  securitySettingsSchema,
  emailSettingsSchema,
  databaseSettingsSchema,
  defaultSettings,
} from "./types";

export { useSettings } from "./useSettings";

export type {
  GeneralSettingsData,
  SecuritySettingsData,
  EmailSettingsData,
  DatabaseSettingsData,
  SystemSettings,
} from "./types";

export type { UseSettingsReturn } from "./useSettings";

