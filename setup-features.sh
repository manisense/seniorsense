#!/bin/bash

# Create emergency feature exports
cat > src/features/emergency/index.ts << 'EOL'
export * from './screens/EmergencyScreen';
export * from './screens/SOSScreen';
export * from './components/EmergencyContactsList';
export * from './types';
EOL

# Create navigation index
cat > src/navigation/index.ts << 'EOL'
export * from './stacks/MainStack';
export * from './types';
EOL

# Create services index
cat > src/services/index.ts << 'EOL'
export * from './emergency/emergency.service';
export * from './api/client';
export * from './storage/storage.service';
EOL