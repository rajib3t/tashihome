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

const parseBooleanEnv = (val, defaultValue) => {
  if (val === undefined || val === null || val === '') return defaultValue;
  return val.toString().trim().toLowerCase() === 'true' || val.toString().trim() === '1';
};

const devDisablePayment = parseBooleanEnv(process.env.DISABLE_PAYMENT, false);
const prodDisablePayment = parseBooleanEnv(process.env.DISABLE_PAYMENT, true);

const renderEnvironment = (production, apiUrl, disablePayment) => `export const environment = {
  production: ${production},
  apiUrl: ${quote(apiUrl)},
  applicationName: ${quote(applicationName)},
  googleMapsApiKey: ${quote(process.env.GOOGLE_MAPS_API_KEY || '')},
  assetUrl: ${quote(process.env.ASSET_URL || '')},
  disablePayment: ${disablePayment}
};
`;

const devApiUrl = '/api';
const prodApiUrl = process.env.API_URL || 'https://api.tashihomes.in';

writeFileSync(browserEnvPath, renderEnvironment(false, devApiUrl, devDisablePayment));
writeFileSync(browserProdEnvPath, renderEnvironment(true, prodApiUrl, prodDisablePayment));

console.log(`Synced environment files from ${envPath}`);
