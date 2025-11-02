/**
 * KRAPI Client SDK - Easy Import
 * 
 * This file provides an easy-to-import client SDK for React, Vue, Angular, and other apps.
 * Similar to Appwrite - just import and use!
 * 
 * @example
 * ```typescript
 * // In your React app
 * import { KrapiClient } from '@krapi/sdk/client';
 * 
 * const krapi = new KrapiClient({
 *   endpoint: 'http://localhost:3470',
 *   apiKey: 'your-api-key'
 * });
 * 
 * const projects = await krapi.projects.list();
 * ```
 */

export { KrapiClient, type KrapiClientConfig, type ApiResponse } from './src/client';
export { default } from './src/client';
