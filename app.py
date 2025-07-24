import os
import io
import base64
from flask import Flask, render_template, request, jsonify, send_file
import tempfile
import pyttsx3
from gtts import gTTS
import soundfile as sf
import numpy as np
from werkzeug.utils import secure_filename
import threading
import time
import uuid
import shutil

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size

# Initialize pyttsx3 engine for offline TTS
pyttsx3_engine = None
engine_lock = threading.Lock()
available_voices = []

# Language and accent configurations
LANGUAGE_CONFIG = {
    'english': {
        'code': 'en',
        'name': 'English',
        'accents': {
            'usa': {
                'name': 'American',
                'tld': 'com',
                'code': 'en-US'
            },
            'uk': {
                'name': 'British',
                'tld': 'co.uk',
                'code': 'en-GB'
            },
            'india': {
                'name': 'Indian',
                'tld': 'co.in',
                'code': 'en-IN'
            }
        }
    },
    'marathi': {
        'code': 'mr',
        'name': 'मराठी (Marathi)',
        'accents': {
            'india': {
                'name': 'Indian',
                'tld': 'co.in',
                'code': 'mr-IN'
            }
        }
    }
}

# Voice gender configurations for different accents
VOICE_CONFIG = {
    'english': {
        'usa': {
            'female': ['com', 'us'],
            'male': ['com', 'us']
        },
        'uk': {
            'female': ['co.uk', 'com'],
            'male': ['co.uk', 'ie']
        },
        'india': {
            'female': ['co.in', 'com'],
            'male': ['co.in', 'co.za']
        }
    },
    'marathi': {
        'india': {
            'female': ['co.in'],
            'male': ['co.in']
        }
    }
}

def get_pyttsx3_engine():
    global pyttsx3_engine, available_voices
    if pyttsx3_engine is None:
        with engine_lock:
            if pyttsx3_engine is None:
                try:
                    pyttsx3_engine = pyttsx3.init()
                    # Get available voices and categorize them
                    voices = pyttsx3_engine.getProperty('voices')
                    available_voices = []
                    
                    if voices:
                        for i, voice in enumerate(voices):
                            voice_info = {
                                'id': voice.id,
                                'name': voice.name,
                                'index': i,
                                'gender': 'unknown',
                                'language': 'english',  # pyttsx3 mainly supports English
                                'accent': 'system'
                            }
                            
                            # Try to determine gender from voice name/id
                            name_lower = voice.name.lower()
                            if any(keyword in name_lower for keyword in ['female', 'woman', 'zira', 'hazel', 'susan', 'anna', 'eva', 'cortana']):
                                voice_info['gender'] = 'female'
                            elif any(keyword in name_lower for keyword in ['male', 'man', 'david', 'mark', 'george', 'james']):
                                voice_info['gender'] = 'male'
                            
                            # Try to determine accent from voice name
                            if any(keyword in name_lower for keyword in ['us', 'american', 'united states']):
                                voice_info['accent'] = 'usa'
                            elif any(keyword in name_lower for keyword in ['uk', 'british', 'england']):
                                voice_info['accent'] = 'uk'
                            elif any(keyword in name_lower for keyword in ['india', 'indian']):
                                voice_info['accent'] = 'india'
                            
                            available_voices.append(voice_info)
                        
                        # Set default voice (prefer female if available)
                        default_voice = None
                        for voice in available_voices:
                            if voice['gender'] == 'female':
                                default_voice = voice
                                break
                        if not default_voice and available_voices:
                            default_voice = available_voices[0]
                        
                        if default_voice:
                            pyttsx3_engine.setProperty('voice', default_voice['id'])
                    
                    # Set speech rate and volume for better quality
                    pyttsx3_engine.setProperty('rate', 180)  # Speed of speech
                    pyttsx3_engine.setProperty('volume', 1.0)  # Volume (0.0 to 1.0)
                    print(f"Pyttsx3 engine initialized successfully with {len(available_voices)} voices")
                    
                except Exception as e:
                    print(f"Error initializing pyttsx3: {e}")
                    pyttsx3_engine = None
    return pyttsx3_engine

def set_pyttsx3_voice(gender='female', language='english', accent='usa'):
    """Set pyttsx3 voice based on gender, language and accent preference"""
    engine = get_pyttsx3_engine()
    if engine and available_voices:
        # Find voice by preferences (language, accent, gender)
        preferred_voices = []
        
        # First try to match language, accent, and gender
        for v in available_voices:
            if (v['language'] == language and 
                v['accent'] == accent and 
                v['gender'] == gender):
                preferred_voices.append(v)
        
        # If no exact match, try language and gender
        if not preferred_voices:
            for v in available_voices:
                if v['language'] == language and v['gender'] == gender:
                    preferred_voices.append(v)
        
        # If still no match, try just gender
        if not preferred_voices:
            preferred_voices = [v for v in available_voices if v['gender'] == gender]
        
        # Final fallback to any available voice
        if not preferred_voices:
            preferred_voices = available_voices
        
        if preferred_voices:
            selected_voice = preferred_voices[0]
            engine.setProperty('voice', selected_voice['id'])
            return selected_voice['name']
    return None

# Create necessary directories
os.makedirs('uploads', exist_ok=True)
os.makedirs('static/audio', exist_ok=True)

print("Text-to-Speech Web App initialized with multi-language and accent support")
print("Languages: English, Marathi")
print("Accents: USA, UK, Indian")
print("Voices: Male and Female for each accent")

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/generate_speech', methods=['POST'])
def generate_speech():
    try:
        data = request.get_json()
        text = data.get('text', '').strip()
        tts_engine = data.get('engine', 'gtts')  # Default to gTTS
        voice_gender = data.get('voice_gender', 'female')  # Default to female
        language = data.get('language', 'english')  # Default to English
        accent = data.get('accent', 'usa')  # Default to USA
        
        if not text:
            return jsonify({'error': 'No text provided'}), 400
        
        if len(text) > 5000:
            return jsonify({'error': 'Text too long. Maximum 5000 characters allowed.'}), 400
        
        print(f"Generating speech for text: {text[:50]}... using {tts_engine} with {voice_gender} {language} ({accent}) voice")
        
        # Generate unique filename to avoid conflicts
        unique_id = str(uuid.uuid4())[:8]
        output_path = os.path.join('static', 'audio', f'output_{unique_id}.wav')
        voice_used = None
        
        if tts_engine == 'gtts':
            success, voice_used = generate_with_gtts(text, output_path, voice_gender, language, accent)
            if not success:
                print("gTTS failed, falling back to pyttsx3")
                success, voice_used = generate_with_pyttsx3(text, output_path, voice_gender, language, accent)
        else:
            success, voice_used = generate_with_pyttsx3(text, output_path, voice_gender, language, accent)
            if not success:
                print("pyttsx3 failed, falling back to gTTS")
                success, voice_used = generate_with_gtts(text, output_path, voice_gender, language, accent)
        
        if not success:
            return jsonify({'error': 'Failed to generate speech with both engines'}), 500
        
        # Read the generated audio file
        with open(output_path, 'rb') as audio_file:
            audio_data = audio_file.read()
        
        # Convert to base64 for web transmission
        audio_base64 = base64.b64encode(audio_data).decode('utf-8')
        
        # Clean up the temporary file
        try:
            os.remove(output_path)
            # Also try to remove MP3 version if it exists
            mp3_path = output_path.replace('.wav', '.mp3')
            if os.path.exists(mp3_path):
                os.remove(mp3_path)
        except:
            pass
        
        print("Speech generation completed successfully")
        
        return jsonify({
            'success': True,
            'audio_data': audio_base64,
            'message': 'Speech generated successfully!',
            'engine_used': tts_engine,
            'voice_used': voice_used,
            'voice_gender': voice_gender,
            'language': language,
            'accent': accent
        })
        
    except Exception as e:
        print(f"Error generating speech: {str(e)}")
        return jsonify({'error': f'Error generating speech: {str(e)}'}), 500

def generate_with_gtts(text, output_path, voice_gender='female', language='english', accent='usa'):
    """Generate speech using Google Text-to-Speech (online)"""
    try:
        # Get language configuration
        lang_config = LANGUAGE_CONFIG.get(language, LANGUAGE_CONFIG['english'])
        accent_config = lang_config['accents'].get(accent, lang_config['accents']['usa'] if 'usa' in lang_config['accents'] else list(lang_config['accents'].values())[0])
        
        # Get voice configuration for gender and accent
        voice_config = VOICE_CONFIG.get(language, {}).get(accent, {}).get(voice_gender, ['com'])
        selected_tld = voice_config[0] if voice_config else accent_config['tld']
        
        # Create descriptive voice name
        accent_name = accent_config['name']
        lang_name = lang_config['name']
        voice_name = f"Google {lang_name} ({voice_gender.title()} - {accent_name})"
        
        # Create gTTS object
        tts = gTTS(
            text=text, 
            lang=lang_config['code'], 
            slow=False, 
            tld=selected_tld
        )
        
        # Save to a temporary MP3 file first
        temp_mp3 = output_path.replace('.wav', '.mp3')
        tts.save(temp_mp3)
        
        # Copy MP3 as WAV (browsers handle both formats)
        shutil.copy(temp_mp3, output_path)
        
        return True, voice_name
        
    except Exception as e:
        print(f"gTTS error: {e}")
        return False, None

def generate_with_pyttsx3(text, output_path, voice_gender='female', language='english', accent='usa'):
    """Generate speech using pyttsx3 (offline)"""
    try:
        engine = get_pyttsx3_engine()
        if engine is None:
            return False, None
        
        # Set voice based on preferences
        voice_name = set_pyttsx3_voice(voice_gender, language, accent)
        if not voice_name:
            voice_name = f"System TTS ({voice_gender.title()} {accent.upper()})"
        
        # Note: pyttsx3 primarily supports English, so for Marathi it will use English pronunciation
        if language == 'marathi':
            voice_name += " (English pronunciation)"
        
        # Save to file
        engine.save_to_file(text, output_path)
        engine.runAndWait()
        
        # Wait a bit for file to be written
        time.sleep(0.5)
        
        # Check if file was created and has content
        if os.path.exists(output_path) and os.path.getsize(output_path) > 0:
            return True, voice_name
        else:
            print("pyttsx3 failed to create audio file")
            return False, None
            
    except Exception as e:
        print(f"pyttsx3 error: {e}")
        return False, None

@app.route('/download_audio')
def download_audio():
    try:
        # Find the most recent audio file
        audio_dir = os.path.join('static', 'audio')
        audio_files = [f for f in os.listdir(audio_dir) if f.startswith('output_') and (f.endswith('.wav') or f.endswith('.mp3'))]
        
        if not audio_files:
            return jsonify({'error': 'No audio file found'}), 404
        
        # Get the most recent file
        audio_files.sort(key=lambda f: os.path.getmtime(os.path.join(audio_dir, f)), reverse=True)
        latest_file = os.path.join(audio_dir, audio_files[0])
        
        return send_file(latest_file, as_attachment=True, download_name=f'generated_speech.{audio_files[0].split(".")[-1]}')
    except Exception as e:
        return jsonify({'error': f'Error downloading file: {str(e)}'}), 500

@app.route('/health')
def health():
    gtts_available = True
    pyttsx3_available = get_pyttsx3_engine() is not None
    
    return jsonify({
        'status': 'healthy',
        'engines': {
            'gtts': gtts_available,
            'pyttsx3': pyttsx3_available
        },
        'primary_engine': 'gtts' if gtts_available else 'pyttsx3',
        'available_voices': len(available_voices),
        'languages': list(LANGUAGE_CONFIG.keys()),
        'total_voice_combinations': sum(len(lang['accents']) * 2 for lang in LANGUAGE_CONFIG.values())
    })

@app.route('/languages')
def get_languages():
    """Get available languages and their accents"""
    return jsonify({
        'languages': LANGUAGE_CONFIG
    })

@app.route('/engines')
def get_engines():
    """Get available TTS engines with language and accent support"""
    engines = []
    
    # Check gTTS availability
    try:
        from gtts import gTTS
        engines.append({
            'id': 'gtts',
            'name': 'Google Text-to-Speech',
            'description': 'High-quality online TTS (requires internet)',
            'quality': 'high',
            'speed': 'medium',
            'languages': list(LANGUAGE_CONFIG.keys()),
            'voice_options': ['female', 'male'],
            'accent_support': True
        })
    except:
        pass
    
    # Check pyttsx3 availability
    if get_pyttsx3_engine() is not None:
        voice_options = []
        female_voices = [v for v in available_voices if v['gender'] == 'female']
        male_voices = [v for v in available_voices if v['gender'] == 'male']
        
        if female_voices:
            voice_options.append('female')
        if male_voices:
            voice_options.append('male')
        if not voice_options:
            voice_options = ['default']
        
        engines.append({
            'id': 'pyttsx3',
            'name': 'System TTS',
            'description': 'Offline system-based TTS (English only)',
            'quality': 'medium',
            'speed': 'fast',
            'languages': ['english'],  # pyttsx3 mainly supports English
            'voice_options': voice_options,
            'accent_support': False,
            'voices_detail': available_voices
        })
    
    return jsonify({'engines': engines})

@app.route('/voices')
def get_voices():
    """Get detailed voice information"""
    voices_info = {
        'gtts': {},
        'pyttsx3': {
            'female': [v['name'] for v in available_voices if v['gender'] == 'female'],
            'male': [v['name'] for v in available_voices if v['gender'] == 'male'],
            'other': [v['name'] for v in available_voices if v['gender'] == 'unknown']
        }
    }
    
    # Build gTTS voice info for each language and accent
    for lang_key, lang_config in LANGUAGE_CONFIG.items():
        voices_info['gtts'][lang_key] = {}
        for accent_key, accent_config in lang_config['accents'].items():
            voices_info['gtts'][lang_key][accent_key] = {
                'female': f"Google {lang_config['name']} Female ({accent_config['name']})",
                'male': f"Google {lang_config['name']} Male ({accent_config['name']})"
            }
    
    return jsonify(voices_info)

if __name__ == '__main__':
    print("Starting Multi-Language Text-to-Speech Web App...")
    print("Available engines:")
    print("- gTTS: Google Text-to-Speech (online, high quality)")
    print("- pyttsx3: System TTS (offline, good quality)")
    print("\nLanguage & Accent Support:")
    print("- English: USA, UK, Indian accents")
    print("- Marathi: Indian accent")
    print("- Male & Female voices for all combinations")
    print("\nNavigate to http://localhost:5000 to use the app")
    app.run(debug=True, host='0.0.0.0', port=5000) 