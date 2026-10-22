export function interpretCommand(text) {
  if (typeof text !== "string" || !text.trim() || text.length > 2000)
    throw new Error("Invalid command");
  const input = text.trim();
  const registration =
    /^(?:i\s+)?(?:put|placed|stored)\s+(?:my\s+)?(.+?)\s+(?:in|on|inside|at)\s+(?:the\s+)?(.+?)[.!]?$/iu.exec(
      input,
    ) ??
    /^(?:אני\s+)?(?:שמתי|הנחתי|אחסנתי)\s+(?:את\s+)?(.+?)\s+ב((?:חדר|מגיר[הת]|קופס[הת]|ארון|ארונית|שידה|מדף|מטבח|סלון|משרד|תיק|כיס|מחסן|מזווה|רכב|כספת|בוידעם|מרפסת|בית).*?)[.!]?$/u.exec(
      input,
    );
  if (!registration) return { kind: "search", query: input };
  const name = registration[1].trim().replace(/\s+שלי$/u, ""),
    location = registration[2].trim();
  if (!name || name.length > 100 || !location || location.length > 2000)
    throw new Error("Invalid suggestion");
  return { kind: "record", name, location };
}
export function createRecognition({
  Recognition,
  language,
  onResult,
  onError,
  onEnd = () => {},
}) {
  const speech = new Recognition();
  speech.lang = language;
  speech.continuous = false;
  speech.interimResults = false;
  speech.onresult = (event) => {
    const transcript = event.results?.[0]?.[0]?.transcript;
    if (transcript) onResult(transcript);
  };
  speech.onerror = () => onError();
  speech.onend = () => onEnd();
  return { start: () => speech.start(), abort: () => speech.abort() };
}
