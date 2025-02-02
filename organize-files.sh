#!/bin/bash

# First, create feature-based structure
mkdir -p src/features/emergency/{components,screens,services,types}
mkdir -p src/features/profile/{components,screens,services,types}
mkdir -p src/features/settings/{components,screens,services,types}

# Move screen-specific files to their feature directories
mv src/screens/EmergencyScreen.tsx src/features/emergency/screens/ 2>/dev/null
mv src/screens/SOSScreen.tsx src/features/emergency/screens/ 2>/dev/null
mv src/components/EmergencyContactsList.tsx src/features/emergency/components/ 2>/dev/null

# Move shared components to common components directory
mkdir -p src/components/common
mkdir -p src/components/layout

# Move navigation setup
mkdir -p src/navigation/stacks
mv src/navigation/MainStack.tsx src/navigation/stacks/ 2>/dev/null
mv NavigationParamList.ts src/navigation/types.ts 2>/dev/null

# Organize theme and styling
mkdir -p src/theme/{constants,types}
mv src/theme/index.ts src/theme/types/theme.types.ts 2>/dev/null

# Setup services structure
mkdir -p src/services/{emergency,auth,storage,api}

# Create and organize hooks
mkdir -p src/hooks/{common,emergency}

# Cleanup empty directories
find . -type d -empty -delete

echo "Feature-based organization completed!"

# Move assets to src/assets
mv assets/* src/assets/ 2>/dev/null
rmdir assets 2>/dev/null

# Move components
mv components/* src/components/ 2>/dev/null
rmdir components 2>/dev/null

# Move screens
mv screens/* src/screens/ 2>/dev/null
rmdir screens 2>/dev/null

# Move context files
mv context/* src/context/ 2>/dev/null
rmdir context 2>/dev/null

# Move theme files
mv theme/* src/theme/ 2>/dev/null
rmdir theme 2>/dev/null

# Move navigation files
mv NavigationParamList.ts src/navigation/ 2>/dev/null
mv src/NavigationParamList.ts src/navigation/ 2>/dev/null

# Move app files to src root
mv app.ts src/ 2>/dev/null
mv app.css src/ 2>/dev/null

# Move type definitions
mv types/* src/types/ 2>/dev/null
rmdir types 2>/dev/null

# Move i18n files
mv i18n/* src/i18n/ 2>/dev/null
rmdir i18n 2>/dev/null

# Move features
mv features/* src/features/ 2>/dev/null
rmdir features 2>/dev/null

# Move services
mv services/* src/services/ 2>/dev/null
rmdir services 2>/dev/null

# Move utils
mv utils/* src/utils/ 2>/dev/null
rmdir utils 2>/dev/null

# Clean up any .DS_Store files
find . -name ".DS_Store" -delete

echo "Project structure reorganization completed!"