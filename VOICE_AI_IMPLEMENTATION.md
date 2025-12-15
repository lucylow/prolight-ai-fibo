# Voice AI Implementation - ProLight AI

## 🎤 Voice-Controlled Photography Studio

This implementation adds **voice control** to ProLight AI, allowing photographers to describe lighting setups in natural language and have them automatically converted to FIBO JSON and applied to the 3D preview.

## ✨ Features

- **Real-time Speech-to-Text**: Uses Web Speech API for voice recognition
- **Natural Language Processing**: Google Gemini AI converts voice commands to FIBO JSON
- **Text-to-Speech Feedback**: Confirms setup with natural voice responses
- **Real-time 3D Preview Updates**: Lighting changes instantly reflected in 3D visualization
- **Professional Photography Terms**: Understands terms like "soft key light", "dramatic rim", "85mm f/2.8", etc.

## 🛠 Implementation Details

### Backend (`/backend/app/api/gemini.py`)

- **Endpoint**: `POST /api/gemini/fibo`
- **Request**: 
  ```json
  {
    "prompt": "soft key light from left, 85mm f/2.8",
    "system": "Optional custom system prompt"
  }
  ```
- **Response**:
  ```json
  {
    "fibo": { /* FIBO JSON structure */ },
    "confidence": 0.85,
    "parsed_elements": { /* Metadata */ }
  }
  ```

### Frontend (`/src/components/VoiceFIBOStudio.tsx`)

- Voice recognition using Web Speech API
- Automatic conversion to FIBO JSON via Gemini API
- Real-time updates to lighting store
- TTS confirmation messages
- Error handling and user feedback

### Integration

The component is integrated into the Studio page (`/src/pages/Studio.tsx`) and appears at the top of the controls panel.

## 🚀 Setup Instructions

### 1. Backend Setup

1. **Install dependencies** (already in `requirements.txt`):
   ```bash
   pip install requests google-genai
   ```

2. **Set Gemini API Key** in `.env`:
   ```bash
   GEMINI_API_KEY=your_gemini_api_key_here
   # OR
   GOOGLE_API_KEY=your_gemini_api_key_here
   ```

3. **Get API Key** from [Google AI Studio](https://makersuite.google.com/app/apikey)

4. **Start backend server**:
   ```bash
   cd backend
   uvicorn app.main:app --reload
   ```

### 2. Frontend Setup

1. **Set API Base URL** (if not using default):
   ```bash
   VITE_API_BASE_URL=http://localhost:8000
   ```

2. **Start frontend**:
   ```bash
   npm run dev
   ```

### 3. Browser Requirements

- **Chrome/Edge**: Full support (Web Speech API)
- **Safari**: Full support (Web Speech API)
- **Firefox**: Limited support (may need polyfill)

## 🎯 Usage Examples

### Voice Commands

1. **Basic Lighting**:
   - "soft key light from left"
   - "dramatic rim lighting warm"
   - "three point studio lighting"

2. **Camera Settings**:
   - "85mm portrait f/2.8"
   - "50mm wide angle f/8"
   - "telephoto product shot"

3. **Complete Setup**:
   - "studio three point lighting f2.8 product shot"
   - "dramatic rim lighting warm, white seamless background"
   - "soft window light 50mm natural daylight"

### Workflow

1. Click **"Start Voice Control"** button
2. Speak your lighting setup description
3. System automatically:
   - Converts speech to text
   - Sends to Gemini API for FIBO conversion
   - Updates lighting store
   - Updates 3D preview
   - Confirms with TTS: "Setup complete: 0.9x key light, 85mm portrait"

## 📋 Voice Command Examples

| Voice Command | FIBO Result |
|--------------|-------------|
| "soft key light from left" | Key light: intensity 0.9, direction front-left, softness 0.7 |
| "dramatic rim lighting warm" | Rim light: intensity 1.4, color temp 3200K, direction back |
| "85mm portrait f/2.8" | Camera: fov 28.5, aperture f/2.8, lens portrait |
| "white seamless background" | Environment: white seamless studio background |
| "studio three point lighting" | Key + Fill + Rim lights with balanced ratios |

## 🔧 Technical Details

### Speech Recognition

- Uses `webkitSpeechRecognition` (Chrome/Edge) or `SpeechRecognition` (Safari)
- Continuous listening mode
- Interim results for real-time feedback
- Auto-restarts on errors

### Gemini Integration

- Model: `gemini-2.0-flash-exp`
- Temperature: 0.3 (for consistent results)
- System prompt includes professional photography terminology
- Returns structured FIBO JSON

### State Management

- Integrates with `useLightingStore` (Zustand)
- Updates: `updateLight()`, `updateCamera()`, `updateScene()`
- Real-time sync with 3D preview via `ThreeLightStudio` component

## 🐛 Troubleshooting

### "Speech recognition not supported"
- Use Chrome, Edge, or Safari
- Ensure microphone permissions are granted

### "Gemini API key not configured"
- Set `GEMINI_API_KEY` in backend `.env`
- Restart backend server

### "Failed to convert to FIBO"
- Check backend logs for Gemini API errors
- Verify API key is valid
- Check network connectivity

### Voice not being recognized
- Check microphone permissions
- Ensure browser supports Web Speech API
- Try speaking more clearly or closer to microphone

## 📝 API Reference

### POST `/api/gemini/fibo`

**Request Body**:
```typescript
{
  prompt: string;           // Natural language description
  system?: string;          // Optional custom system prompt
}
```

**Response**:
```typescript
{
  fibo: Record<string, any>; // FIBO JSON structure
  confidence?: number;       // Confidence score (0-1)
  parsed_elements?: {        // Extracted metadata
    has_rim?: boolean;
    has_key?: boolean;
    intensity_modifier?: string;
    color_temp?: number;
  };
}
```

## 🎨 UI Components

- **Voice Control Button**: Toggle listening on/off
- **Transcript Display**: Shows recognized speech in real-time
- **TTS Feedback**: Displays spoken confirmation messages
- **FIBO JSON Preview**: Shows generated FIBO structure
- **Error Display**: Shows errors with helpful messages
- **Help Text**: Example voice commands for users

## 🔮 Future Enhancements

- [ ] Multi-language support (Spanish, French, etc.)
- [ ] Voice command history
- [ ] Custom voice command presets
- [ ] Offline fallback with local command parsing
- [ ] Voice-controlled parameter adjustments ("increase fill 20%")
- [ ] Batch voice commands ("setup A, then setup B")

## 📚 Related Files

- `/backend/app/api/gemini.py` - Gemini API endpoint
- `/src/components/VoiceFIBOStudio.tsx` - Voice control component
- `/src/pages/Studio.tsx` - Studio page integration
- `/src/stores/lightingStore.ts` - Lighting state management
- `/src/components/ThreeLightStudio.tsx` - 3D preview component

---

**Built with**: Web Speech API, Google Gemini AI, React, TypeScript, FastAPI

