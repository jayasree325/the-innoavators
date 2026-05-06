/**
 * conversation.js — Logic for two-person Conversation Mode
 */

document.addEventListener('DOMContentLoaded', () => {
  if (typeof Auth !== 'undefined') Auth.requireAuth();
  if (typeof UI !== 'undefined') UI.initTheme();

  // Elements
  const p1Lang = document.getElementById('p1-lang');
  const p2Lang = document.getElementById('p2-lang');
  
  const p1Chat = document.getElementById('p1-chat');
  const p2Chat = document.getElementById('p2-chat');
  
  const p1Input = document.getElementById('p1-input');
  const p2Input = document.getElementById('p2-input');
  
  const p1Send = document.getElementById('p1-send');
  const p2Send = document.getElementById('p2-send');
  
  const p1Mic = document.getElementById('p1-mic');
  const p2Mic = document.getElementById('p2-mic');

  // Chat History state
  const conversationHistory = []; // { speaker: 'Person 1', text: '...', lang: 'en' }

  // Theme toggle
  const themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', () => UI.toggleTheme());
  }

  // Helper to scroll to bottom
  function scrollToBottom(el) {
    el.scrollTop = el.scrollHeight;
  }

  // Create message element
  function createMessageEl(text, type) {
    const div = document.createElement('div');
    div.className = `message ${type}`;
    div.textContent = text;
    return div;
  }

  // Core Send Function
  async function sendMessage(senderId, text) {
    if (!text.trim()) return;
    
    if (!window.API.getKey()) {
      UI.showToast('Please set your Gemini API key in settings', 'warning');
      return;
    }

    const isP1 = senderId === 'p1';
    
    const sourceLangEl = isP1 ? p1Lang : p2Lang;
    const targetLangEl = isP1 ? p2Lang : p1Lang;
    
    const sourceChat = isP1 ? p1Chat : p2Chat;
    const targetChat = isP1 ? p2Chat : p1Chat;
    
    const sourceInput = isP1 ? p1Input : p2Input;

    const sourceLangName = sourceLangEl.options[sourceLangEl.selectedIndex].text.replace(/ \(.*\)/, '');
    const targetLangName = targetLangEl.options[targetLangEl.selectedIndex].text.replace(/ \(.*\)/, '');

    // 1. Show original message on Sender's side
    sourceChat.appendChild(createMessageEl(text, 'msg-mine'));
    sourceInput.value = '';
    scrollToBottom(sourceChat);

    // 2. Show loading on Receiver's side
    const loadingEl = createMessageEl('...', 'msg-theirs');
    loadingEl.style.opacity = '0.5';
    targetChat.appendChild(loadingEl);
    scrollToBottom(targetChat);

    // Disable inputs while translating
    p1Input.disabled = true;
    p2Input.disabled = true;

    try {
      const result = await window.API.translateConversation(
        text,
        sourceLangName,
        targetLangName,
        conversationHistory
      );

      // Add to history
      conversationHistory.push({
        speaker: isP1 ? 'Person 1' : 'Person 2',
        text: text,
        lang: sourceLangName
      });

      // 3. Update Receiver's side with translation
      targetChat.removeChild(loadingEl);
      targetChat.appendChild(createMessageEl(result.translation, 'msg-theirs'));
      scrollToBottom(targetChat);

      // Speak the translated text out loud for the receiver!
      Voice.speak(result.translation, targetLangEl.value);

    } catch (err) {
      console.error(err);
      targetChat.removeChild(loadingEl);
      UI.showToast('Failed to translate message', 'error');
    } finally {
      p1Input.disabled = false;
      p2Input.disabled = false;
      (isP1 ? p2Input : p1Input).focus(); // Auto focus to the other person!
    }
  }

  // Event Listeners for text input
  p1Send.addEventListener('click', () => sendMessage('p1', p1Input.value));
  p2Send.addEventListener('click', () => sendMessage('p2', p2Input.value));

  p1Input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendMessage('p1', p1Input.value);
  });
  p2Input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendMessage('p2', p2Input.value);
  });

  // Event Listeners for Voice input
  function setupVoice(micBtn, langEl, inputEl, senderId) {
    if (!Voice.supported) {
      micBtn.style.display = 'none';
      return;
    }
    
    let isRecording = false;
    micBtn.addEventListener('click', () => {
      if (isRecording) {
        Voice.stopRecording();
      } else {
        isRecording = true;
        micBtn.style.color = 'var(--error)';
        inputEl.placeholder = "Listening...";
        
        Voice.startRecording(
          langEl.value,
          (text, isFinal) => {
            inputEl.value = text;
            if (isFinal) {
              Voice.stopRecording();
              sendMessage(senderId, text);
            }
          },
          () => {
            isRecording = false;
            micBtn.style.color = '';
            inputEl.placeholder = "Type a message...";
          },
          (err) => {
            console.error(err);
            isRecording = false;
            micBtn.style.color = '';
            inputEl.placeholder = "Type a message...";
          }
        );
      }
    });
  }

  setupVoice(p1Mic, p1Lang, p1Input, 'p1');
  setupVoice(p2Mic, p2Lang, p2Input, 'p2');

});
