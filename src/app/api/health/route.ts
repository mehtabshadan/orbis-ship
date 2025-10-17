// Health check API route
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || 'unknown',
    uptime: process.uptime()
  });
}

export async function HEAD() {
  return new NextResponse(null, { status: 200 });
}