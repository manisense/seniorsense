#!/bin/bash

# Create main directory structure
mkdir -p src/{components,screens,navigation,context,features,hooks,services,theme,utils,i18n,types,config,assets}
mkdir -p src/components/{common,layout}
mkdir -p src/features/{emergency,profile,notifications,settings}
mkdir -p src/services/{api,storage,location}

# Move existing components
mv components/* src/components/ 2>/dev/null
mv screens/* src/screens/ 2>/dev/null

# Move context files
mv context/* src/context/ 2>/dev/null

# Move configuration files
mv theme/* src/theme/ 2>/dev/null
mv i18n/* src/i18n/ 2>/dev/null

# Move certificates to assets
mv assets/iitgwificert*.crt src/assets/ 2>/dev/null

# Create necessary base files
touch src/navigation/index.tsx
touch src/navigation/types.ts
touch src/services/api/client.ts
touch src/services/storage/index.ts
touch src/types/index.ts
touch src/config/constants.ts