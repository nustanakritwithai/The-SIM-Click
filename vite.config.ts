import { defineConfig } from 'vite';
export default defineConfig({ base: process.env.VITE_BASE_PATH || '/The-SIM-Click/', cacheDir: '.test-output/vite', build: { target: 'es2022' } });
