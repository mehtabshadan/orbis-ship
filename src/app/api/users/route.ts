import { NextRequest, NextResponse } from 'next/server';
import { DatabaseManager } from '../../../../lib/database';
import databaseInitService from '../../../../lib/database-init';

export async function GET() {
  try {
    // Ensure database is initialized
    await databaseInitService.ensureInitialized();
    
    const dbManager = DatabaseManager.getInstance();
    
    // Get all users (excluding password_hash for security)
    const users = await dbManager.getAllUsers() as Array<{
      id: number;
      username: string;
      email: string;
      role: string;
      created_at: string;
      updated_at: string;
    }>;

    return NextResponse.json({
      success: true,
      data: users,
      count: users.length
    });

  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch users',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Ensure database is initialized
    await databaseInitService.ensureInitialized();
    
    const body = await request.json();
    const { username, email, password_hash, role = 'user' } = body;

    if (!username || !email || !password_hash) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required fields: username, email, password_hash' 
        },
        { status: 400 }
      );
    }

    const dbManager = DatabaseManager.getInstance();
    
    // Create new user
    const result = await dbManager.createUser(username, email, password_hash, role);

    return NextResponse.json({
      success: true,
      data: {
        id: result.lastInsertRowid,
        username,
        email,
        role
      }
    });

  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create user',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}