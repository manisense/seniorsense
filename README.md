# Senior Wellness App

A comprehensive mobile application designed to help seniors manage their health, medications, and emergency situations.

## Features

- **Medicine Reminders**: Set and manage medication reminders
- **Health Tracking**: Monitor vital health metrics
- **Emergency SOS**: Quick access to emergency contacts and services
- **Medicine Identifier**: Identify medicines using AI and get information in your preferred language
- **Fall Detection**: Automatically detect falls and alert emergency contacts

## Medicine Identifier Feature

The Medicine Identifier feature allows users to take a photo of a medicine or tablet and get information about it using Google's Gemini AI. The information is provided in the user's preferred language and can be read aloud using text-to-speech.

### Setup Instructions

1. **Get a Google Gemini API Key**:
   - Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Create a new API key
   - Copy the API key

2. **Configure the API Key**:
   - Option 1: Update the `.env` file with your API key:
     ```
     GEMINI_API_KEY=your_gemini_api_key_here
     ```
   - Option 2: Update the `app.json` file:
     ```json
     "extra": {
       "GEMINI_API_KEY": "your_gemini_api_key_here"
     }
     ```

3. **Install Dependencies**:
   ```bash
   npm install
   ```

4. **Run the App**:
   ```bash
   npm start
   ```

### Using the Medicine Identifier

1. Navigate to the Medicine Identifier screen from the home screen
2. Select your preferred language for the result
3. Take a photo of a medicine or select an image from your gallery
4. Wait for the AI to analyze the image
5. View the identification result
6. Use the text-to-speech feature to listen to the result
7. Copy or share the result as needed

### Privacy Information

- Images are sent securely to Google Gemini API for identification
- Images are not stored permanently and are only used for identification
- No personal data is collected or shared with third parties

## Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/senior-wellness-app.git

# Navigate to the project directory
cd senior-wellness-app

# Install dependencies
npm install

# Start the development server
npm start
```

## Technologies Used

- React Native
- Expo
- React Navigation
- React Native Paper
- Google Gemini API
- Expo Camera and Image Picker
- React Native TTS (Text-to-Speech)

## License

This project is licensed under the MIT License - see the LICENSE file for details.