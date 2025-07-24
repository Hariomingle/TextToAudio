document.addEventListener('DOMContentLoaded', function() {
    const textInput = document.getElementById('textInput');
    const charCount = document.getElementById('charCount');
    const generateBtn = document.getElementById('generateBtn');
    const clearBtn = document.getElementById('clearBtn');
    const languageSelect = document.getElementById('languageSelect');
    const accentSelect = document.getElementById('accentSelect');
    const voiceGenderSelect = document.getElementById('voiceGenderSelect');
    const engineSelect = document.getElementById('engineSelect');
    const languageInfo = document.getElementById('languageInfo');
    const accentInfo = document.getElementById('accentInfo');
    const voiceInfo = document.getElementById('voiceInfo');
    const engineInfo = document.getElementById('engineInfo');
    const languageDescription = document.getElementById('languageDescription');
    const accentDescription = document.getElementById('accentDescription');
    const voiceDescription = document.getElementById('voiceDescription');
    const engineDescription = document.getElementById('engineDescription');
    const engineUsed = document.getElementById('engineUsed');
    const voiceUsed = document.getElementById('voiceUsed');
    const languageUsed = document.getElementById('languageUsed');
    const accentUsed = document.getElementById('accentUsed');
    const loading = document.getElementById('loading');
    const outputSection = document.getElementById('outputSection');
    const audioPlayer = document.getElementById('audioPlayer');
    const downloadBtn = document.getElementById('downloadBtn');
    const playBtn = document.getElementById('playBtn');
    const errorMessage = document.getElementById('errorMessage');
    const successMessage = document.getElementById('successMessage');
    const errorText = document.getElementById('errorText');
    const successText = document.getElementById('successText');

    // Language configurations
    const languageConfig = {
        'english': {
            name: 'English',
            accents: {
                'usa': { name: 'American', flag: '🇺🇸' },
                'uk': { name: 'British', flag: '🇬🇧' },
                'india': { name: 'Indian', flag: '🇮🇳' }
            }
        },
        'marathi': {
            name: 'मराठी (Marathi)',
            accents: {
                'india': { name: 'Indian', flag: '🇮🇳' }
            }
        }
    };

    // Engine descriptions
    const engineDescriptions = {
        'gtts': {
            description: 'High-quality online TTS',
            icon: 'fas fa-wifi',
            quality: 'High Quality',
            note: 'Limited voice gender distinction'
        },
        'pyttsx3': {
            description: 'Offline system-based TTS',
            icon: 'fas fa-desktop',
            quality: 'Good Quality',
            note: 'Distinct male/female voices (English only)'
        }
    };

    // Voice descriptions with limitations
    const voiceDescriptions = {
        'female': {
            description: 'Female voice',
            icon: 'fas fa-female',
            note: 'Voice availability varies by language'
        },
        'male': {
            description: 'Male voice',
            icon: 'fas fa-male',
            note: 'Voice availability varies by language'
        }
    };

    // Voice capabilities (will be loaded from server)
    let voiceCapabilities = {};

    // Load available languages, engines, and voice capabilities on startup
    loadLanguages();
    loadEngines();
    loadVoiceCapabilities();

    // Character counter
    textInput.addEventListener('input', function() {
        const count = textInput.value.length;
        charCount.textContent = count;
        
        if (count > 4800) {
            charCount.style.color = '#dc3545';
        } else if (count > 4000) {
            charCount.style.color = '#ffc107';
        } else {
            charCount.style.color = '#666';
        }
    });

    // Language selection change
    languageSelect.addEventListener('change', function() {
        updateAccentOptions();
        updateLanguageInfo();
        updateSampleText();
        updateVoiceWarning();
    });

    // Accent selection change
    accentSelect.addEventListener('change', function() {
        updateAccentInfo();
        updateVoiceWarning();
    });

    // Voice gender selection change
    voiceGenderSelect.addEventListener('change', function() {
        updateVoiceInfo();
        updateVoiceWarning();
    });

    // Engine selection change
    engineSelect.addEventListener('change', function() {
        updateEngineInfo();
        updateLanguageOptions();
        updateVoiceWarning();
    });

    // Clear button functionality
    clearBtn.addEventListener('click', function() {
        textInput.value = '';
        charCount.textContent = '0';
        charCount.style.color = '#666';
        hideMessages();
        outputSection.style.display = 'none';
    });

    // Generate speech button
    generateBtn.addEventListener('click', function() {
        const text = textInput.value.trim();
        
        if (!text) {
            showError('Please enter some text to convert to speech.');
            return;
        }

        if (text.length > 5000) {
            showError('Text too long. Maximum 5000 characters allowed.');
            return;
        }

        const selectedLanguage = languageSelect.value;
        const selectedAccent = accentSelect.value;
        const selectedVoiceGender = voiceGenderSelect.value;
        const selectedEngine = engineSelect.value;
        
        generateSpeech(text, selectedEngine, selectedVoiceGender, selectedLanguage, selectedAccent);
    });

    // Play button functionality
    playBtn.addEventListener('click', function() {
        if (audioPlayer.src) {
            audioPlayer.play();
        }
    });

    // Download button functionality
    downloadBtn.addEventListener('click', function() {
        window.open('/download_audio', '_blank');
    });

    // Enter key to generate (Ctrl+Enter or Cmd+Enter)
    textInput.addEventListener('keydown', function(e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            generateBtn.click();
        }
    });

    function loadVoiceCapabilities() {
        fetch('/voice_capabilities')
            .then(response => response.json())
            .then(data => {
                voiceCapabilities = data;
                updateVoiceWarning();
            })
            .catch(error => {
                console.warn('Could not load voice capabilities:', error);
            });
    }

    function loadLanguages() {
        fetch('/languages')
            .then(response => response.json())
            .then(data => {
                if (data.languages) {
                    // Update language configurations
                    Object.assign(languageConfig, data.languages);
                    updateAccentOptions();
                    updateLanguageInfo();
                }
            })
            .catch(error => {
                console.warn('Could not load languages:', error);
            });
    }

    function loadEngines() {
        fetch('/engines')
            .then(response => response.json())
            .then(data => {
                if (data.engines && data.engines.length > 0) {
                    // Clear existing options
                    engineSelect.innerHTML = '';
                    
                    // Add available engines
                    data.engines.forEach(engine => {
                        const option = document.createElement('option');
                        option.value = engine.id;
                        
                        const icon = engine.id === 'gtts' ? '🌐' : '💻';
                        const status = engine.limitations ? 'Limited voices' : 'Multi-voice';
                        option.textContent = `${icon} ${engine.name} (${status})`;
                        option.dataset.languages = JSON.stringify(engine.languages || ['english']);
                        option.dataset.accentSupport = engine.accent_support;
                        option.dataset.limitations = engine.limitations || '';
                        
                        engineSelect.appendChild(option);
                    });
                    
                    updateEngineInfo();
                    updateLanguageOptions();
                }
            })
            .catch(error => {
                console.warn('Could not load engines:', error);
                updateEngineInfo();
            });
    }

    function updateLanguageOptions() {
        const selectedOption = engineSelect.options[engineSelect.selectedIndex];
        if (selectedOption && selectedOption.dataset.languages) {
            const supportedLanguages = JSON.parse(selectedOption.dataset.languages);
            
            // Clear existing language options
            languageSelect.innerHTML = '';
            
            // Add supported languages
            supportedLanguages.forEach(langKey => {
                const langConfig = languageConfig[langKey];
                if (langConfig) {
                    const option = document.createElement('option');
                    option.value = langKey;
                    
                    const flag = langKey === 'english' ? '🇺🇸' : '🇮🇳';
                    option.textContent = `${flag} ${langConfig.name}`;
                    
                    languageSelect.appendChild(option);
                }
            });
        }
        
        updateAccentOptions();
        updateLanguageInfo();
        updateVoiceWarning();
    }

    function updateAccentOptions() {
        const selectedLanguage = languageSelect.value;
        const selectedEngine = engineSelect.value;
        const selectedOption = engineSelect.options[engineSelect.selectedIndex];
        const accentSupport = selectedOption ? selectedOption.dataset.accentSupport === 'true' : true;
        
        const langConfig = languageConfig[selectedLanguage];
        if (langConfig && langConfig.accents) {
            // Clear existing accent options
            accentSelect.innerHTML = '';
            
            // Add available accents
            Object.keys(langConfig.accents).forEach(accentKey => {
                const accentConfig = langConfig.accents[accentKey];
                const option = document.createElement('option');
                option.value = accentKey;
                option.textContent = `${accentConfig.flag || '🌍'} ${accentConfig.name}`;
                accentSelect.appendChild(option);
            });
            
            // Disable accent selection for engines that don't support it
            accentSelect.disabled = !accentSupport && selectedEngine === 'pyttsx3';
            if (accentSelect.disabled) {
                accentSelect.style.opacity = '0.6';
                accentInfo.style.opacity = '0.6';
            } else {
                accentSelect.style.opacity = '1';
                accentInfo.style.opacity = '1';
            }
        }
        
        updateAccentInfo();
        updateVoiceWarning();
    }

    function updateVoiceWarning() {
        const selectedLanguage = languageSelect.value;
        const selectedAccent = accentSelect.value;
        const selectedEngine = engineSelect.value;
        const selectedGender = voiceGenderSelect.value;
        
        // Check voice capabilities
        const capabilities = voiceCapabilities[selectedLanguage]?.[selectedAccent];
        
        let warningText = '';
        let warningColor = '#666';
        
        if (selectedLanguage === 'marathi' && selectedEngine === 'gtts') {
            warningText = '⚠️ Same voice for both male and female';
            warningColor = '#ffc107';
        } else if (selectedEngine === 'gtts' && capabilities && !capabilities.gtts_distinct_voices) {
            warningText = '⚠️ Limited voice variation available';
            warningColor = '#ffc107';
        } else if (selectedEngine === 'pyttsx3' && capabilities && capabilities.pyttsx3_distinct_voices) {
            warningText = '✓ Distinct male/female voices available';
            warningColor = '#28a745';
        } else if (selectedEngine === 'pyttsx3' && selectedLanguage === 'marathi') {
            warningText = '⚠️ English pronunciation for Marathi text';
            warningColor = '#ffc107';
        }
        
        if (warningText) {
            voiceDescription.innerHTML = `
                <i class="${voiceDescriptions[selectedGender].icon}"></i>
                ${voiceDescriptions[selectedGender].description}
                <br><small style="color: ${warningColor}">${warningText}</small>
            `;
        } else {
            updateVoiceInfo();
        }
    }

    function updateLanguageInfo() {
        const selectedLanguage = languageSelect.value;
        const langConfig = languageConfig[selectedLanguage];
        
        if (langConfig) {
            languageDescription.textContent = `${langConfig.name} language support`;
        }
    }

    function updateAccentInfo() {
        const selectedLanguage = languageSelect.value;
        const selectedAccent = accentSelect.value;
        const langConfig = languageConfig[selectedLanguage];
        
        if (langConfig && langConfig.accents && langConfig.accents[selectedAccent]) {
            const accentConfig = langConfig.accents[selectedAccent];
            accentDescription.textContent = `${accentConfig.name} accent`;
        }
    }

    function updateVoiceInfo() {
        const selectedVoice = voiceGenderSelect.value;
        const voiceData = voiceDescriptions[selectedVoice];
        
        if (voiceData) {
            voiceDescription.innerHTML = `
                <i class="${voiceData.icon}"></i>
                ${voiceData.description}
            `;
            voiceInfo.title = voiceData.note;
        }
    }

    function updateEngineInfo() {
        const selectedEngine = engineSelect.value;
        const engineData = engineDescriptions[selectedEngine];
        
        if (engineData) {
            engineDescription.innerHTML = `
                <i class="${engineData.icon}"></i>
                ${engineData.description}
            `;
            engineInfo.title = engineData.note;
        }
    }

    function updateSampleText() {
        const selectedLanguage = languageSelect.value;
        
        if (selectedLanguage === 'marathi') {
            textInput.placeholder = "मराठी मजकूर येथे लिहा... (Example: नमस्कार! हे आमचे मराठी TTS अॅप आहे।)";
        } else {
            textInput.placeholder = "Type or paste your text here... (Max 5000 characters)";
        }
    }

    function generateSpeech(text, engine, voiceGender, language, accent) {
        // Show loading state
        loading.style.display = 'block';
        outputSection.style.display = 'none';
        generateBtn.disabled = true;
        generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
        hideMessages();

        // Make API request
        fetch('/generate_speech', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                text: text,
                engine: engine,
                voice_gender: voiceGender,
                language: language,
                accent: accent
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Create audio blob from base64 data
                const audioData = atob(data.audio_data);
                const audioArray = new Uint8Array(audioData.length);
                for (let i = 0; i < audioData.length; i++) {
                    audioArray[i] = audioData.charCodeAt(i);
                }
                
                // Detect file type and create appropriate blob
                let mimeType = 'audio/wav';
                if (data.engine_used === 'gtts') {
                    mimeType = 'audio/mpeg';
                }
                
                const audioBlob = new Blob([audioArray], { type: mimeType });
                const audioUrl = URL.createObjectURL(audioBlob);
                
                // Update audio player
                audioPlayer.src = audioUrl;
                
                // Show generation details
                const engineName = data.engine_used === 'gtts' ? 'Google TTS' : 'System TTS';
                const voiceGenderIcon = data.voice_gender === 'female' ? '👩' : '👨';
                const voiceGenderText = data.voice_gender.charAt(0).toUpperCase() + data.voice_gender.slice(1);
                const languageName = languageConfig[data.language]?.name || data.language;
                const accentName = languageConfig[data.language]?.accents[data.accent]?.name || data.accent;
                const accentFlag = languageConfig[data.language]?.accents[data.accent]?.flag || '🌍';
                
                engineUsed.innerHTML = `<i class="fas fa-cog"></i> ${engineName}`;
                voiceUsed.innerHTML = `<i class="fas fa-user"></i> ${voiceGenderIcon} ${voiceGenderText}`;
                languageUsed.innerHTML = `<i class="fas fa-language"></i> ${languageName}`;
                accentUsed.innerHTML = `<i class="fas fa-map-marker-alt"></i> ${accentFlag} ${accentName}`;
                
                if (data.voice_used) {
                    voiceUsed.innerHTML += ` (${data.voice_used})`;
                }
                
                // Show output section
                outputSection.style.display = 'block';
                
                // Show success message with warning if applicable
                let message = data.message || 'Speech generated successfully!';
                if (data.warning) {
                    message += ` ${data.warning}`;
                }
                showSuccess(message);
                
                // Scroll to output
                outputSection.scrollIntoView({ behavior: 'smooth' });
            } else {
                showError(data.error || 'An error occurred while generating speech.');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showError('Network error. Please check your connection and try again.');
        })
        .finally(() => {
            // Hide loading state
            loading.style.display = 'none';
            generateBtn.disabled = false;
            generateBtn.innerHTML = '<i class="fas fa-play"></i> Generate Speech';
        });
    }

    function showError(message) {
        hideMessages();
        errorText.textContent = message;
        errorMessage.style.display = 'flex';
        errorMessage.scrollIntoView({ behavior: 'smooth' });
        
        // Auto-hide after 10 seconds
        setTimeout(() => {
            errorMessage.style.display = 'none';
        }, 10000);
    }

    function showSuccess(message) {
        hideMessages();
        successText.textContent = message;
        successMessage.style.display = 'flex';
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            successMessage.style.display = 'none';
        }, 5000);
    }

    function hideMessages() {
        errorMessage.style.display = 'none';
        successMessage.style.display = 'none';
    }

    // Sample text examples
    const sampleTexts = {
        english: [
            "Hello! Welcome to our multi-language text-to-speech generator. Experience natural voices in different accents.",
            "The quick brown fox jumps over the lazy dog. Try different accents to hear regional variations.",
            "Technology connects people across cultures and languages. Our app supports multiple accents and voice types.",
            "Discover the beauty of spoken language with our advanced TTS system featuring American, British, and Indian accents."
        ],
        marathi: [
            "नमस्कार! आमच्या मराठी TTS अॅप मध्ये आपले स्वागत आहे। हे उच्च दर्जाची वाक् संश्लेषण तंत्रज्ञान वापरते.",
            "मराठी भाषेतील मजकूराचे ऑडिओमध्ये रूपांतर करा. आमचे तंत्रज्ञान नैसर्गिक आवाज निर्माण करते.",
            "तंत्रज्ञान आपल्या जीवनाला सुलभ बनवते। आता मराठी भाषेतही उच्च दर्जाचे TTS अनुभवा.",
            "भाषा ही संस्कृतीची वाहक आहे. आमच्या TTS तंत्रज्ञानाद्वारे मराठी भाषेचा आनंद लुटा."
        ]
    };

    // Add sample text functionality
    textInput.addEventListener('focus', function() {
        if (!textInput.value) {
            const selectedLanguage = languageSelect.value;
            const langSamples = sampleTexts[selectedLanguage] || sampleTexts.english;
            const randomSample = langSamples[Math.floor(Math.random() * langSamples.length)];
            textInput.placeholder = `Try: "${randomSample}"`;
        }
    });

    textInput.addEventListener('blur', function() {
        updateSampleText();
    });

    // Check if browser supports audio
    if (!audioPlayer.canPlayType('audio/wav') && !audioPlayer.canPlayType('audio/mpeg')) {
        showError('Your browser does not support audio playback. Please use a modern browser.');
    }

    // Add keyboard shortcut hints
    const isApple = /Mac|iPod|iPhone|iPad/.test(navigator.platform);
    const shortcutKey = isApple ? 'Cmd' : 'Ctrl';
    textInput.title = `${shortcutKey}+Enter to generate speech`;

    // Initialize all info displays on page load
    updateLanguageInfo();
    updateAccentInfo();
    updateVoiceInfo();
    updateEngineInfo();
    updateSampleText();
}); 