import { AppDatabaseService } from './appDatabaseService';

let localService: AppDatabaseService | null = null;

export function getAppDatabaseService(): AppDatabaseService {
  if (!localService) {
    localService = new AppDatabaseService();
  }
  return localService;
}
