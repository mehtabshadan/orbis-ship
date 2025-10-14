import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import Database from 'better-sqlite3';
import { envService } from './environment.service';

export class DatabaseManager {
    private static instance: DatabaseManager;
    private static initialized: boolean = false;
    private dbPath: string;
    private encryptionKey: string;

    private constructor() {
        console.log('🔧 Initializing DatabaseManager...');

        // Load environment-specific variables
        try {
            this.encryptionKey = envService.getDatabaseEncryptionKey();
            console.log('🔑 Encryption key loaded successfully');
        } catch (error) {
            console.error('❌ Failed to load encryption key:', error);
            // Use default for development
            this.encryptionKey = 'dev_encryption_key_2024_development_orbis_secure';
            console.log('🔑 Using default encryption key for development');
        }

        // Use custom database path if provided, otherwise use default
        try {
            const appDataPath = path.join(os.homedir(), 'AppData', 'Roaming', 'orbis');
            if (!fs.existsSync(appDataPath)) {
                fs.mkdirSync(appDataPath, { recursive: true });
            }
            this.dbPath = path.join(appDataPath, 'orbis.db');

            // Validate that dbPath is properly set
            if (!this.dbPath) {
                throw new Error('Database path could not be determined');
            }

            console.log('DB PATH:', this.dbPath, typeof this.dbPath);

        } catch (error) {
            console.error('Error setting up database path:', error);
            // Fallback to current directory
            this.dbPath = path.join(process.cwd(), 'orbis.db');
            console.log(`📁 Using fallback database path: ${this.dbPath}`);
        }
    }

    public static getInstance(): DatabaseManager {
        if (!DatabaseManager.instance) {
            DatabaseManager.instance = new DatabaseManager();
        }
        return DatabaseManager.instance;
    }

    public async initializeDatabase(): Promise<void> {
        if (DatabaseManager.initialized) {
            return;
        }

        try {
            console.log('🔐 Initializing SQLCipher database...');
            const db = this.getConnection();

            // Create application tables
            console.log('📊 Creating database tables...');

            db.exec(`
                    CREATE TABLE IF NOT EXISTS users (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        username TEXT UNIQUE NOT NULL,
                        email TEXT UNIQUE NOT NULL,
                        password_hash TEXT NOT NULL,
                        role TEXT DEFAULT 'user',
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                    );
                `);

            db.exec(`
                    CREATE TABLE IF NOT EXISTS sessions (
                        id TEXT PRIMARY KEY,
                        user_id INTEGER NOT NULL,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        expires_at DATETIME NOT NULL,
                        FOREIGN KEY (user_id) REFERENCES users (id)
                    );
                `);

            db.exec(`
                    CREATE TABLE IF NOT EXISTS system_settings (
                        key TEXT PRIMARY KEY,
                        value TEXT NOT NULL,
                        description TEXT,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                    );
                `);

            // Insert initial system settings
            const settingsInsert = db.prepare('INSERT OR IGNORE INTO system_settings (key, value, description) VALUES (?, ?, ?)');
            settingsInsert.run('app_version', '1.0.0', 'Application version');
            settingsInsert.run('encryption_type', 'SQLCipher', 'Database encryption method');
            settingsInsert.run('database_initialized', new Date().toISOString(), 'Database initialization timestamp');

            db.close();

            DatabaseManager.initialized = true;
            console.log('✅ Database initialization completed successfully');

        } catch (error) {
            console.error('❌ Database initialization failed:', error);
            throw error;
        }
    }

    public getConnection() {
        try {
            if (!this.dbPath || typeof this.dbPath !== 'string') {
                throw new Error(`Invalid database path type: ${typeof this.dbPath}`);
            }

            // Normalize path for Windows safety
            this.dbPath = path.normalize(this.dbPath);

            // Ensure file exists (important on Windows)
            // if (!fs.existsSync(this.dbPath)) {
            //     console.warn('🆕 Database file not found. Creating new one...');
            //     fs.closeSync(fs.openSync(this.dbPath, 'a'));
            // }

            console.log('📁 DB path final before open:', this.dbPath, JSON.stringify(this.dbPath));

            const db = new Database(this.dbPath);

            db.pragma("cipher='sqlcipher'");
            db.pragma("legacy=4");
            db.pragma(`key='${this.encryptionKey}'`);
            db.pragma('journal_mode = WAL');

            // Test connection
            db.prepare('SELECT count(*) FROM sqlite_master;').get();

            console.log('🔐 Database connection and encryption verified.');
            return db;

        } catch (error) {
            console.error('❌ Failed to connect to encrypted database:', error);
            throw error;
        }
    }


    public async executeQuery(query: string, params: unknown[] = []): Promise<unknown> {
        const db = this.getConnection();
        try {
            const stmt = db.prepare(query);
            if (query.trim().toLowerCase().startsWith('select')) {
                return params.length > 0 ? stmt.all(...params) : stmt.all();
            } else {
                return params.length > 0 ? stmt.run(...params) : stmt.run();
            }
        } finally {
            db.close();
        }
    }

    public async getUser(username: string): Promise<Record<string, unknown> | null> {
        const result = await this.executeQuery(
            'SELECT * FROM users WHERE username = ?',
            [username]
        ) as Record<string, unknown>[];
        return result.length > 0 ? result[0] : null;
    }

    public async getAllUsers(): Promise<Record<string, unknown>[]> {
        return await this.executeQuery(
            'SELECT id, username, email, role, created_at, updated_at FROM users ORDER BY created_at DESC'
        ) as Record<string, unknown>[];
    }

    public async createUser(username: string, email: string, passwordHash: string, role: string = 'user'): Promise<{ lastInsertRowid: number; changes: number }> {
        return this.executeQuery(
            'INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)',
            [username, email, passwordHash, role]
        ) as Promise<{ lastInsertRowid: number; changes: number }>;
    }

    public async getSystemSetting(key: string): Promise<string | null> {
        const result = await this.executeQuery(
            'SELECT value FROM system_settings WHERE key = ?',
            [key]
        ) as Record<string, unknown>[];
        return result.length > 0 ? (result[0].value as string) : null;
    }

    public async setSystemSetting(key: string, value: string, description?: string): Promise<void> {
        await this.executeQuery(
            'INSERT OR REPLACE INTO system_settings (key, value, description, updated_at) VALUES (?, ?, ?, datetime("now"))',
            [key, value, description || '']
        );
    }

    public getDbPath(): string {
        return this.dbPath;
    }
}