import * as dotenv from 'dotenv';

export class EnvironmentService {
    private static instance: EnvironmentService;
    private static loaded: boolean = false;
    private environment: string;

    private constructor() {
        this.environment = this.detectEnvironment();
        this.loadEnvironmentConfig();
    }

    public static getInstance(): EnvironmentService {
        if (!EnvironmentService.instance) {
            EnvironmentService.instance = new EnvironmentService();
        }
        return EnvironmentService.instance;
    }

    private detectEnvironment(): string {
        return process.env.NODE_ENV || 'development';
    }

    private loadEnvironmentConfig(): void {
        if (EnvironmentService.loaded) {
            return;
        }

        const envFile = this.getEnvironmentFilePath();
        
        // Load environment variables from the appropriate file
        const result = dotenv.config({ path: envFile });
        
        // If the specific env file doesn't exist, try to load from .env as fallback
        if (result.error) {
            console.warn(`⚠️  Could not load ${envFile}, trying .env as fallback`);
            const fallbackResult = dotenv.config({ path: '.env' });
            
            if (fallbackResult.error) {
                console.warn(`⚠️  Could not load .env fallback file either`);
            }
        }
        
        console.log(`🔧 Environment: ${this.environment}, Config file: ${envFile}`);
        EnvironmentService.loaded = true;
    }

    private getEnvironmentFilePath(): string {
        return this.environment === 'production' ? '.env.production' : '.env.development';
    }

    /**
     * Get environment variable value
     * @param key Environment variable key
     * @param defaultValue Default value if not found
     * @returns Environment variable value or default
     */
    public get(key: string, defaultValue?: string): string {
        const value = process.env[key];
        if (value === undefined) {
            if (defaultValue !== undefined) {
                return defaultValue;
            }
            throw new Error(`Environment variable '${key}' is required but not found`);
        }
        return value;
    }

    /**
     * Get environment variable value as boolean
     * @param key Environment variable key
     * @param defaultValue Default value if not found
     * @returns Boolean value
     */
    public getBoolean(key: string, defaultValue?: boolean): boolean {
        const value = process.env[key];
        if (value === undefined) {
            if (defaultValue !== undefined) {
                return defaultValue;
            }
            throw new Error(`Environment variable '${key}' is required but not found`);
        }
        return value.toLowerCase() === 'true' || value === '1';
    }

    /**
     * Get environment variable value as number
     * @param key Environment variable key
     * @param defaultValue Default value if not found
     * @returns Number value
     */
    public getNumber(key: string, defaultValue?: number): number {
        const value = process.env[key];
        if (value === undefined) {
            if (defaultValue !== undefined) {
                return defaultValue;
            }
            throw new Error(`Environment variable '${key}' is required but not found`);
        }
        const numValue = Number(value);
        if (isNaN(numValue)) {
            throw new Error(`Environment variable '${key}' must be a valid number, got: ${value}`);
        }
        return numValue;
    }

    /**
     * Get optional environment variable value
     * @param key Environment variable key
     * @param defaultValue Default value if not found
     * @returns Environment variable value or default
     */
    public getOptional(key: string, defaultValue: string = ''): string {
        return process.env[key] || defaultValue;
    }

    /**
     * Check if we're in production environment
     */
    public isProduction(): boolean {
        return this.environment === 'production';
    }

    /**
     * Check if we're in development environment
     */
    public isDevelopment(): boolean {
        return this.environment === 'development';
    }

    /**
     * Check if we're in test environment
     */
    public isTest(): boolean {
        return this.environment === 'test';
    }

    /**
     * Get current environment name
     */
    public getEnvironment(): string {
        return this.environment;
    }

    /**
     * Get database encryption key
     */
    public getDatabaseEncryptionKey(): string {
        return this.get('DATABASE_ENCRYPTION_KEY');
    }

    /**
     * Get database path override (optional)
     */
    public getDatabasePath(): string | null {
        return this.getOptional('DATABASE_PATH') || null;
    }

    /**
     * Get application port
     */
    public getPort(): number {
        return this.getNumber('PORT', 3000);
    }

    /**
     * Get application host
     */
    public getHost(): string {
        return this.getOptional('HOST', 'localhost');
    }

    /**
     * Get log level
     */
    public getLogLevel(): string {
        return this.getOptional('LOG_LEVEL', this.isDevelopment() ? 'debug' : 'info');
    }
}

// Export a singleton instance for convenience
export const envService = EnvironmentService.getInstance();