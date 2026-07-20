const { config } = require('dotenv');
const { resolve } = require('node:path');

config({ path: resolve(__dirname, '.env') });

const apiUrl = process.env.DEV_API_URL || process.env.API_URL || 'http://127.0.0.1:8000';
const target = apiUrl.replace(/\/api\/?$/, '');

/** @type {import('vite').ProxyOptions} */
module.exports = {
  '/api': {
    target,
    secure: false,
    changeOrigin: true,
  },
};
