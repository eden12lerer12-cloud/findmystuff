import { interpretCommand, createRecognition } from "./voice-core.js";
export function setupVoice({ t, getLanguage, onSearch, onDraft }) {
  const $ = (id) => document.getElementById(id);
  let speech = null,
    session = 0;
  const Recognition =
    window.SpeechRecognition ?? window.webkitSpeechRecognition;
  function stop() {
    session++;
    const current = speech;
    speech = null;
    current?.abort();
    $("voice-start").disabled = false;
  }
  $("open-voice").onclick = () => {
    $("voice-form").reset();
    $("voice-error").textContent = "";
    $("voice-transcript").textContent = "";
    $("voice-microphone").hidden = !Recognition;
    $("voice-unavailable").hidden = !!Recognition;
    $("voice-dialog").showModal();
  };
  $("voice-dialog").addEventListener("close", stop);
  $("voice-close").onclick = () => $("voice-dialog").close();
  $("voice-start").onclick = () => {
    if (!Recognition || !$("voice-consent").checked) {
      $("voice-error").textContent = t("voiceConsentRequired");
      return;
    }
    stop();
    $("voice-error").textContent = "";
    $("voice-start").disabled = true;
    $("voice-transcript").textContent = t("voiceListening");
    const token = session;
    try {
      speech = createRecognition({
        Recognition,
        language: getLanguage() === "he" ? "he-IL" : "en-US",
        onResult: (text) => {
          if (token !== session) return;
          $("voice-text").value = text;
          $("voice-transcript").textContent = t("voiceReview");
          stop();
        },
        onEnd: () => {
          if (token === session) stop();
        },
        onError: () => {
          if (token !== session) return;
          $("voice-error").textContent = t("voiceError");
          stop();
        },
      });
      speech.start();
    } catch {
      $("voice-error").textContent = t("voiceError");
      stop();
    }
  };
  $("voice-stop").onclick = () => {
    stop();
    $("voice-transcript").textContent = "";
  };
  $("voice-form").onsubmit = (event) => {
    event.preventDefault();
    stop();
    try {
      const suggestion = interpretCommand($("voice-text").value);
      $("voice-dialog").close();
      if (suggestion.kind === "search") onSearch(suggestion.query);
      else onDraft(suggestion);
    } catch {
      $("voice-error").textContent = t("voiceError");
    }
  };
  return { cancel: stop };
}
