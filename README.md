# Text-to-Speech Web App

A high-quality text-to-speech web application built with Python Flask and Coqui TTS. Convert any text into natural-sounding speech with an intuitive web interface.

## Features

- 🎤 **High-Quality TTS**: Uses Coqui TTS with advanced models for natural speech synthesis
- 🚀 **Fast Processing**: Optimized for quick audio generation
- 💻 **Modern Web Interface**: Beautiful, responsive design with real-time feedback
- 📱 **Mobile Friendly**: Works seamlessly on desktop and mobile devices
- 🔊 **Audio Controls**: Play, pause, and download generated audio
- 📝 **Text Management**: Character counter, clear function, and keyboard shortcuts
- ⚡ **GPU Acceleration**: Automatic GPU detection for faster processing

## Requirements

- Python 3.8 or higher
- CUDA-compatible GPU (optional, for faster processing)
- Modern web browser with audio support

## Installation

1. **Clone or download this repository**
   ```bash
   git clone <repository-url>
   cd TextToAudio
   ```

2. **Create a virtual environment (recommended)**
   ```bash
   python -m venv venv
   
   # On Windows
   venv\Scripts\activate
   
   # On macOS/Linux
   source venv/bin/activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

   **Note**: The first installation may take some time as it downloads the TTS models (several GB).

## Usage

1. **Start the application**
   ```bash
   python app.py
   ```

2. **Open your web browser and navigate to**
   ```
   http://localhost:5000
   ```

3. **Using the app**:
   - Enter or paste your text (up to 5000 characters)
   - Click "Generate Speech" or use `Ctrl+Enter` (Windows) / `Cmd+Enter` (Mac)
   - Wait for processing (first generation may take longer as models load)
   - Play the generated audio directly in the browser
   - Download the audio as a WAV file

## Model Information

The app uses Coqui TTS with the following model priority:
1. **Primary**: Tacotron2-DDC + HiFiGAN v2 (highest quality)
2. **Fallback**: Tacotron2-DCA (good quality, faster)
3. **Fast**: FastPitch (fastest processing)

The app automatically selects the best available model based on your system capabilities.

## API Endpoints

- `GET /` - Main web interface
- `POST /generate_speech` - Generate speech from text
- `GET /download_audio` - Download the last generated audio
- `GET /health` - Check application health status

## Configuration

### Environment Variables

You can customize the app behavior with these environment variables:

```bash
# Optional: Force CPU usage (disable GPU)
export CUDA_VISIBLE_DEVICES=""

# Optional: Change port
export FLASK_PORT=5000
```

### Performance Tips

1. **GPU Usage**: The app automatically uses GPU if available (CUDA). This significantly speeds up generation.

2. **Memory Management**: For long texts or frequent usage, consider restarting the app periodically to free up memory.

3. **Model Caching**: Models are cached after first load, subsequent generations will be faster.

## Troubleshooting

### Common Issues

1. **"CUDA out of memory" error**
   - Try shorter text segments
   - Restart the application
   - Set `CUDA_VISIBLE_DEVICES=""` to force CPU usage

2. **Slow first generation**
   - This is normal - models are being loaded for the first time
   - Subsequent generations will be much faster

3. **Audio not playing**
   - Ensure your browser supports WAV audio
   - Check browser audio permissions
   - Try downloading the audio file directly

4. **Installation issues**
   - Make sure you have Python 3.8+
   - Try installing torch separately: `pip install torch torchaudio`
   - For Windows: May need Visual Studio Build Tools

### Debug Mode

Run in debug mode for detailed error information:
```bash
export FLASK_DEBUG=1
python app.py
```

## System Requirements

### Minimum Requirements
- 4GB RAM
- 2GB free disk space
- Python 3.8+

### Recommended Requirements
- 8GB+ RAM
- NVIDIA GPU with 4GB+ VRAM
- 5GB+ free disk space
- Python 3.9+

## Browser Compatibility

- Chrome 70+
- Firefox 65+
- Safari 12+
- Edge 79+

## License

This project is open source. See the LICENSE file for details.

## Contributing

Contributions are welcome! Please feel free to submit pull requests or open issues for bugs and feature requests.

## Acknowledgments

- [Coqui TTS](https://github.com/coqui-ai/TTS) for the text-to-speech engine
- [Flask](https://flask.palletsprojects.com/) for the web framework
- Font Awesome for icons
- Google Fonts for typography 