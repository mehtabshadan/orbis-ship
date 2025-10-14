import { NextResponse } from 'next/server';
import { DatabaseManager } from '../../../../../lib/database';
import databaseInitService from '../../../../../lib/database-init';
import * as crypto from 'crypto';

export async function POST() {
  try {
    // Ensure database is initialized
    await databaseInitService.ensureInitialized();
    
    const dbManager = DatabaseManager.getInstance();
    
    // Sample users data
    const sampleUsers = [
      { username: 'admin', email: 'admin@example.com', role: 'admin' },
      { username: 'john_doe', email: 'john@example.com', role: 'user' },
      { username: 'jane_smith', email: 'jane@example.com', role: 'moderator' },
      { username: 'bob_wilson', email: 'bob@example.com', role: 'user' },
      { username: 'alice_brown', email: 'alice@example.com', role: 'user' },
    ];

    const createdUsers = [];

    for (const userData of sampleUsers) {
      try {
        // Create a simple hash for demo purposes (in production, use proper bcrypt)
        const passwordHash = crypto.createHash('sha256').update('password123').digest('hex');
        
        const result = await dbManager.createUser(
          userData.username,
          userData.email,
          passwordHash,
          userData.role
        );

        createdUsers.push({
          id: result.lastInsertRowid,
          ...userData
        });
      } catch (err) {
        // User might already exist, skip
        console.log(`User ${userData.username} already exists, skipping...`, err);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Created ${createdUsers.length} sample users`,
      data: createdUsers
    });

  } catch (error) {
    console.error('Error creating sample users:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create sample users',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}