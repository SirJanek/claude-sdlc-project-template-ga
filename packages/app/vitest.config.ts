import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';
import { unitTestConfig } from '../../vitest.shared';

export default defineConfig({ plugins: [react()], test: unitTestConfig({ environment: 'jsdom' }) });
