#!/bin/bash

# Create base configuration files
cat > src/config/constants.ts << 'EOL'
export const API_BASE_URL = process.env.API_BASE_URL || 'https://api.example.com';
export const APP_VERSION = '1.0.0';
export const DEFAULT_LANGUAGE = 'en';
EOL

# Create service setup
cat > src/services/api/client.ts << 'EOL'
import axios from 'axios';
import { API_BASE_URL } from '../../config/constants';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});
EOL

# Create types index
cat > src/types/index.ts << 'EOL'
export interface User {
  id: string;
  name: string;
  email: string;
}

export interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  relationship: string;
}

export * from '../features/emergency/types';
export * from '../features/profile/types';
export * from '../features/notifications/types';
EOL