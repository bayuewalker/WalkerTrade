import { NextResponse } from 'next/server';

import { loadConfig } from '@walkertrade/config';

export function GET() {
  const config = loadConfig();

  return NextResponse.json({
    service: 'walkertrade-web',
    status: 'ok',
    environment: config.NODE_ENV,
  });
}
