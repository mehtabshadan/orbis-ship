// Database health check and initialization API
import { NextResponse } from 'next/server';
import databaseInitService from '../../../../lib/database-init';
import { DatabaseManager } from '../../../../lib/database';

export async function GET() {
  try {
    // Ensure database is initialized (lazy initialization)
    await databaseInitService.ensureInitialized();
    
    // Test database connection
    const database = DatabaseManager.getInstance();
    const version = await database.getSystemSetting('app_version');
    const initTimestamp = await database.getSystemSetting('database_initialized');
    
    return NextResponse.json({
      success: true,
      data: {
        status: 'connected',
        isInitialized: databaseInitService.isReady(),
        appVersion: version,
        initializedAt: initTimestamp,
        dbPath: database.getDbPath(),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Database health check failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Database connection failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        isInitialized: databaseInitService.isReady(),
      },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    // Force database initialization
    console.log('[api/database] Manual database initialization requested');
    await databaseInitService.initialize();
    
    return NextResponse.json({
      success: true,
      message: 'Database initialized successfully',
      isInitialized: databaseInitService.isReady(),
    });
  } catch (error) {
    console.error('Database initialization failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Database initialization failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}