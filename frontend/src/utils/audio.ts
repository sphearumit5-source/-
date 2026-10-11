// Utility functions for audio feedback

/**
 * Speak a short message using the Web Speech API.
 * The message is spoken in Khmer (km‑KH).
 * If the browser does not support speech synthesis, the function does nothing.
 */
export function speakSuccess(message: string): void {
  if (!('speechSynthesis' in window)) return;

  const utterance = new SpeechSynthesisUtterance(message);
  utterance.lang = 'km‑KH';

  // Try to select a Khmer voice if available
  const voices = window.speechSynthesis.getVoices();
  const khmerVoice = voices.find(v => v.lang.startsWith('km'));
  if (khmerVoice) {
    utterance.voice = khmerVoice;
  }

  // Some browsers load voices asynchronously; speak after a short delay
  setTimeout(() => {
    window.speechSynthesis.speak(utterance);
  }, 0);
}