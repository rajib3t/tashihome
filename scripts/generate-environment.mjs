import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const rootDir = process.cwd();
const envPath = resolve(rootDir, '.env');
const devPath = resolve(rootDir, 'src/environments/environment.ts');
const prodPath = resolve(rootDir, 'src/environments/environment.prod.ts');

function parseEnv(contents) {
  const result = {};

  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const equalsIndex = trimmed.indexOf('=');
    if (equalsIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, equalsIndex).trim();
    let value = trimmed.slice(equalsIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    result[key] = value;
  }

  return result;
}

function toTsString(value) {
  return JSON.stringify(value ?? '');
}

const fallbackApplicationName = 'TashiHome 1.0';
const fallbackApiUrl = '/api';

let env = {};
if (existsSync(envPath)) {
  env = parseEnv(readFileSync(envPath, 'utf8'));
}

const applicationName = env.APPLICATION_NAME || fallbackApplicationName;
const apiUrl = env.API_URL || fallbackApiUrl;

const ts = (production) => `export const environment = {
  production: ${production},
  apiUrl: ${toTsString(apiUrl)},
  applicationName: ${toTsString(applicationName)},
};
`;

writeFileSync(devPath, ts(false));
writeFileSync(prodPath, ts(true));
