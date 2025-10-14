// Database initialization service - runs on server startup (RUNTIME ONLY)
import { DatabaseManager } from './database';

class DatabaseInitService {
  private static instance: DatabaseInitService | null = null;
  private isInitialized = false;
  private isInitializing = false;
  private initPromise: Promise<void> | null = null;

  private constructor() {}

  public static getInstance(): DatabaseInitService {
    if (!DatabaseInitService.instance) {
      DatabaseInitService.instance = new DatabaseInitService();
    }
    return DatabaseInitService.instance;
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('[database-init] Database already initialized');
      return;
    }

    // If already initializing, wait for the existing promise
    if (this.isInitializing && this.initPromise) {
      console.log('[database-init] Database initialization in progress, waiting...');
      return this.initPromise;
    }

    // Only initialize on server-side and during runtime (not build)
    if (typeof window !== 'undefined') {
      console.warn('[database-init] Skipping database initialization on client-side');
      return;
    }

    // Skip during build process - be more specific about when to skip
    if (process.env.NEXT_PHASE === 'phase-production-build' || 
        process.env.NEXT_PHASE === 'phase-development-build') {
      console.log('[database-init] Skipping database initialization during build phase');
      return;
    }

    this.isInitializing = true;
    this.initPromise = this.performInitialization();
    
    try {
      await this.initPromise;
    } finally {
      this.isInitializing = false;
      this.initPromise = null;
    }
  }

  private async performInitialization(): Promise<void> {
    try {
      console.log('[database-init] Starting database initialization...');
      
      const database = DatabaseManager.getInstance();
      await database.initializeDatabase();
      
      this.isInitialized = true;
      console.log('[database-init] ✅ Database initialization completed successfully');
    } catch (error) {
      console.error('[database-init] ❌ Database initialization failed:', error);
      throw error;
    }
  }

  public isReady(): boolean {
    return this.isInitialized;
  }

  public async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }
}

export const databaseInitService = DatabaseInitService.getInstance();
export default databaseInitService;