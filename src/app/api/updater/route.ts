// API route to check for updates
import { NextRequest, NextResponse } from 'next/server';
import { NextJSUpdater } from '../../../../lib/updater';
import updaterConfig from '../../../../lib/updater/config';

let updaterInstance: NextJSUpdater | null = null;

function getUpdaterInstance() {
  if (!updaterInstance) {
    updaterInstance = new NextJSUpdater({
      repo: updaterConfig.repo,
      intervalMs: updaterConfig.intervalMs,
    });
  }
  return updaterInstance;
}

export async function GET() {
  try {
    const updater = getUpdaterInstance();
    const updateInfo = await updater.checkForUpdates();
    
    return NextResponse.json({
      success: true,
      data: updateInfo,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Update check API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to check for updates',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    const updater = getUpdaterInstance();

    switch (action) {
      case 'update':
        // Trigger manual update
        const updateResult = await updater.manualUpdate();
        return NextResponse.json({
          success: true,
          data: { updated: updateResult },
          message: updateResult ? 'Update completed successfully' : 'No updates available',
        });

      case 'start':
        // Start auto-updater
        updater.start();
        return NextResponse.json({
          success: true,
          message: 'Auto-updater started',
        });

      case 'stop':
        // Stop auto-updater
        updater.stop();
        return NextResponse.json({
          success: true,
          message: 'Auto-updater stopped',
        });

      default:
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid action',
            message: 'Supported actions: update, start, stop',
          },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Update action API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to perform update action',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}