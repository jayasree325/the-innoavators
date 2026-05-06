/**
 * translator.js — Core logic for dashboard translation
 */

document.addEventListener('DOMContentLoaded', () => {
  if (typeof Auth !== 'undefined') Auth.requireAuth();
  if (typeof UI !== 'undefined') UI.initTheme();

  // Elements
  const sourceLang = document.getElementById('source-lang');
  const targetLang = document.getElementById('target-lang');
  const sourceText = document.getElementById('source-text');
  const targetText = document.getElementById('target-text');
  const translateBtn = document.getElementById('translate-btn');
  const swapBtn = document.getElementById('swap-btn');
  const voiceBtn = document.getElementById('voice-input-btn');
  const speakBtn = document.getElementById('speak-btn');
  const copyBtn = document.getElementById('copy-btn');
  const explainBox = document.getElementById('explanation-box');
  const emotionBadge = document.getElementById('emotion-badge');
  const toneSelect = document.getElementById('tone-select');

  // API Key Check
  const keyOverlay = document.getElementById('api-key-overlay');
  const keyInput = document.getElementById('api-key-input');
  const saveKeyBtn = document.getElementById('save-key-btn');

  if (keyOverlay && saveKeyBtn) {
    if (!window.API.getKey()) {
      keyOverlay.style.display = 'flex';
    }
    saveKeyBtn.addEventListener('click', () => {
      if (keyInput.value.trim()) {
        localStorage.setItem('ling_api_key', keyInput.value.trim());
        keyOverlay.style.display = 'none';
        UI.showToast('API Key saved', 'success');
      }
    });
  }

  // Logout
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) logoutBtn.addEventListener('click', () => Auth.logout());

  // User Profile
  const userName = document.getElementById('user-name');
  if (userName && Auth.getUser()) {
    userName.textContent = Auth.getUser().name;
  }

  // Theme toggle
  const themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      UI.toggleTheme();
    });
  }

  // Swap Languages
  if (swapBtn) {
    swapBtn.addEventListener('click', () => {
      const temp = sourceLang.value;
      if (temp !== 'auto') {
        sourceLang.value = targetLang.value;
        targetLang.value = temp;
      }
      const tempText = sourceText.value;
      sourceText.value = targetText.textContent;
      if (targetText.textContent !== 'Translation will appear here...') {
         doTranslation();
      }
    });
  }

  // Voice Input
  let isRecording = false;
  if (voiceBtn && Voice.supported) {
    voiceBtn.addEventListener('click', () => {
      if (isRecording) {
        Voice.stopRecording();
      } else {
        isRecording = true;
        voiceBtn.classList.add('recording');
        sourceText.placeholder = "Listening...";
        Voice.startRecording(
          sourceLang.value,
          (text, isFinal) => {
            sourceText.value = text;
            if (isFinal) doTranslation();
          },
          () => {
            isRecording = false;
            voiceBtn.classList.remove('recording');
            sourceText.placeholder = "Enter text to translate...";
          },
          (err) => {
            console.error(err);
            UI.showToast('Voice recognition error', 'error');
            isRecording = false;
            voiceBtn.classList.remove('recording');
          }
        );
      }
    });
  } else if (voiceBtn) {
    voiceBtn.style.display = 'none';
  }

  // Speak Output
  if (speakBtn) {
    speakBtn.addEventListener('click', () => {
      const text = targetText.textContent;
      if (text && text !== 'Translation will appear here...') {
        Voice.speak(text, targetLang.value);
      }
    });
  }

  // Copy Output
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      const text = targetText.textContent;
      if (text && text !== 'Translation will appear here...') {
        navigator.clipboard.writeText(text);
        UI.showToast('Copied to clipboard', 'success');
      }
    });
  }

  // Translation Function
  async function doTranslation() {
    const text = sourceText.value.trim();
    if (!text) return;

    if (!window.API.getKey()) {
      UI.showToast('Please set your Gemini API key in settings', 'warning');
      if (keyOverlay) keyOverlay.style.display = 'flex';
      return;
    }

    translateBtn.innerHTML = '<i class="ph ph-spinner animate-spin"></i> Translating...';
    targetText.innerHTML = '<div class="skeleton" style="height: 20px; width: 80%; margin-bottom: 10px;"></div><div class="skeleton" style="height: 20px; width: 60%;"></div>';
    explainBox.classList.remove('active');
    if (emotionBadge) emotionBadge.style.display = 'none';

    try {
      const sourceName = sourceLang.value === 'auto' ? 'auto' : sourceLang.options[sourceLang.selectedIndex].text;
      const targetName = targetLang.options[targetLang.selectedIndex].text;

      const result = await window.API.translate(
        text, 
        sourceName, 
        targetName, 
        toneSelect ? toneSelect.value : 'neutral'
      );
      
      // Typewriter effect
      targetText.innerHTML = '';
      typeWriter(result.translation, targetText, 0);

      if (result.englishExplanation) {
        explainBox.innerHTML = `<strong>Context:</strong> ${result.englishExplanation}`;
        explainBox.classList.add('active');
      }

      if (result.emotion && emotionBadge) {
        const emojis = { happy: '😊', sad: '😢', angry: '😠', neutral: '😐', surprised: '😲', fearful: '😨', disgusted: '🤢', excited: '🤩' };
        emotionBadge.textContent = `${emojis[result.emotion] || '😐'} ${result.emotion}`;
        emotionBadge.style.display = 'inline-flex';
      }

    } catch (err) {
      console.error(err);
      targetText.innerHTML = `<span style="color: var(--error)">Error: ${err.message}</span>`;
      UI.showToast('Translation failed', 'error');
    } finally {
      translateBtn.innerHTML = 'Translate ✨';
    }
  }

  function typeWriter(text, element, i) {
    if (i < text.length) {
      element.innerHTML += text.charAt(i);
      setTimeout(() => typeWriter(text, element, i + 1), 20); // typing speed
    }
  }

  if (translateBtn) {
    translateBtn.addEventListener('click', doTranslation);
  }

  // Auto translate on typing pause (debounce)
  let timeout = null;
  if (sourceText) {
    sourceText.addEventListener('input', () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        if (sourceText.value.trim().length > 0) {
           // doTranslation(); // Optional: enable auto-translate
        }
      }, 1000);
    });

    sourceText.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === 'Enter') {
        doTranslation();
      }
    });
  }
});
