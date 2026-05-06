/**
 * voice.js — Speech to Text and Text to Speech
 */

const Voice = (() => {
  let recognition = null;
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  
  if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
  }

  function startRecording(lang, onResult, onEnd, onError) {
    if (!recognition) {
      if (onError) onError(new Error("Speech recognition not supported in this browser."));
      return;
    }
    
    recognition.lang = lang === 'auto' ? 'en-US' : lang; // fallback to en-US if auto
    
    recognition.onresult = (event) => {
      let finalTranscript = '';
      let interimTranscript = '';
      
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }
      if (onResult) onResult(finalTranscript || interimTranscript, event.results[event.resultIndex].isFinal);
    };

    recognition.onerror = (e) => {
      if (onError) onError(e);
    };

    recognition.onend = () => {
      if (onEnd) onEnd();
    };

    recognition.start();
  }

  function stopRecording() {
    if (recognition) recognition.stop();
  }

  function speak(text, lang) {
    if (!window.speechSynthesis) return;
    
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    window.speechSynthesis.speak(utterance);
  }

  return { startRecording, stopRecording, speak, supported: !!SpeechRecognition };
})();

window.Voice = Voice;
