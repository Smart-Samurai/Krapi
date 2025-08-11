import { BackendSDK } from "@krapi/sdk";
import { DatabaseAdapterService } from "@/services/database-adapter.service";
import { AuthAdapterService } from "@/services/auth-adapter.service";
import { StorageAdapterService } from "@/services/storage-adapter.service";
import { EmailAdapterService } from "@/services/email-adapter.service";

// Create service instances
const databaseService = DatabaseAdapterService.getInstance();
const authService = AuthAdapterService.getInstance();
const storageService = StorageAdapterService.getInstance();
const emailService = EmailAdapterService.getInstance();

// Create and export the backend SDK instance
export const backendSDK = new BackendSDK({
  databaseService,
  authService,
  storageService,
  emailService,
});
