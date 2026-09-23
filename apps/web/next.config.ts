import type { NextConfig } from 'next';

import { loadConfig } from '../../packages/config/src/index';

// Next.js evaluates this module before starting the development or production server.
loadConfig();

const nextConfig: NextConfig = {
  transpilePackages: ['@walkertrade/config', '@walkertrade/core'],
};

export default nextConfig;
