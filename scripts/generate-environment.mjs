import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadEnv } from 'dotenv';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const envPath = resolve(rootDir, '.env');
const browserEnvPath = resolve(rootDir, 'src/environments/environment.ts');
const browserProdEnvPath = resolve(rootDir, 'src/environments/environment.prod.ts');

loadEnv({ path: envPath });

const applicationName = process.env.APPLICATION_NAME?.trim() || 'TashiHomes';
const quote = (value) => `'${value.replaceAll('\\', '\\\\').replaceAll("'", "\\'")}'`;

const renderEnvironment = (production, apiUrl) => `export const environment = {
  production: ${production},
  apiUrl: ${quote(apiUrl)},
  applicationName: ${quote(applicationName)},
  googleMapsApiKey: ${quote(process.env.GOOGLE_MAPS_API_KEY || '')},
};
`;

const devApiUrl = '/api';
const prodApiUrl = process.env.API_URL || 'https://api.tashihomes.in';

writeFileSync(browserEnvPath, renderEnvironment(false, devApiUrl));
writeFileSync(browserProdEnvPath, renderEnvironment(true, prodApiUrl));

console.log(`Synced environment files from ${envPath}`);
