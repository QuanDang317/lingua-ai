import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Global reference cache to prevent Chromium V8 garbage collection bug
const activeUtterances = new Set<SpeechSynthesisUtterance>();
let activeAudioElement: HTMLAudioElement | null = null;
let isVoicesListenerRegistered = false;

export interface SpeakAudioOptions {
  rate?: number;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: () => void;
}

/**
 * Stop any active native speech synthesis or HTML5 fallback audio playback
 */
export function stopNativeAudio(): void {
  if (typeof window !== "undefined") {
    if ("speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // ignore
      }
    }
    activeUtterances.clear();
  }
  if (activeAudioElement) {
    try {
      activeAudioElement.pause();
      activeAudioElement.currentTime = 0;
    } catch {
      // ignore
    }
    activeAudioElement = null;
  }
}

/**
 * Play high-definition fallback audio stream via internal Next.js TTS route
 * with automatic fallback to direct stream and backend proxy.
 */
function playFallbackAudio(
  text: string,
  lang: "en" | "zh",
  options?: SpeakAudioOptions
): void {
  try {
    stopNativeAudio();
    const cleanText = text.trim();
    if (!cleanText) return;

    // Use Next.js internal API route (same origin, always active, no referer/CORS blocks)
    const primaryUrl = `/api/tts?text=${encodeURIComponent(
      cleanText.slice(0, 300)
    )}&lang=${lang}`;

    const audio = new Audio();
    try {
      // Suppress referrer to prevent upstream blocks
      (audio as any).referrerPolicy = "no-referrer";
    } catch {
      // ignore
    }
    audio.src = primaryUrl;
    activeAudioElement = audio;

    if (options?.rate && options.rate > 0) {
      audio.playbackRate = options.rate;
    }

    audio.onplay = () => {
      options?.onStart?.();
    };

    audio.onended = () => {
      activeAudioElement = null;
      options?.onEnd?.();
    };

    audio.onerror = () => {
      // Secondary fallback: Direct Google TTS with client=tw-ob
      const targetLang = lang === "zh" ? "zh-CN" : "en-US";
      const directUrl = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${targetLang}&q=${encodeURIComponent(
        cleanText.slice(0, 300)
      )}`;

      const secondaryAudio = new Audio();
      try {
        (secondaryAudio as any).referrerPolicy = "no-referrer";
      } catch {
        // ignore
      }
      secondaryAudio.src = directUrl;
      activeAudioElement = secondaryAudio;

      if (options?.rate && options.rate > 0) {
        secondaryAudio.playbackRate = options.rate;
      }

      secondaryAudio.onplay = () => {
        options?.onStart?.();
      };
      secondaryAudio.onended = () => {
        activeAudioElement = null;
        options?.onEnd?.();
      };
      secondaryAudio.onerror = () => {
        activeAudioElement = null;
        options?.onError?.();
      };

      const p = secondaryAudio.play();
      if (p !== undefined) {
        p.catch(() => {
          activeAudioElement = null;
          options?.onError?.();
        });
      }
    };

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        // Triggers audio.onerror handler above
      });
    }
  } catch (err) {
    console.warn("Audio fallback init error:", err);
    options?.onError?.();
  }
}

/**
 * Dual-Engine Native Audio Speaker
 * Combines Web Speech API (with Chromium GC protection, voice selection, & resume)
 * and High-Definition Audio Streaming to guarantee speech works on any browser & OS.
 */
export function speakNativeAudio(
  text: string,
  lang: "en" | "zh" = "zh",
  optionsOrRate: SpeakAudioOptions | number = 0.95
): void {
  if (typeof window === "undefined" || !text) {
    return;
  }

  const options: SpeakAudioOptions =
    typeof optionsOrRate === "number"
      ? { rate: optionsOrRate }
      : optionsOrRate;

  const rate = options.rate ?? 0.95;

  // If browser does not have SpeechSynthesis, stream immediately
  if (!("speechSynthesis" in window)) {
    playFallbackAudio(text, lang, options);
    return;
  }

  try {
    stopNativeAudio();

    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }

    // Register voices listener once
    if (!isVoicesListenerRegistered && typeof window.speechSynthesis.onvoiceschanged !== "undefined") {
      window.speechSynthesis.onvoiceschanged = () => {};
      isVoicesListenerRegistered = true;
    }

    // Check if browser has a native voice installed for this language
    let matchedVoice: SpeechSynthesisVoice | undefined;
    const voices = window.speechSynthesis.getVoices();
    if (voices && voices.length > 0) {
      const targetPrefix = lang === "zh" ? "zh" : "en";
      matchedVoice = voices.find((v) => {
        const vLang = v.lang.toLowerCase().replace("_", "-");
        return vLang.startsWith(targetPrefix);
      });
    }

    // CRITICAL: On Windows without Chinese language pack installed,
    // window.speechSynthesis has no Chinese voice and stays completely silent!
    // Immediately stream high-definition native pronunciation via audio stream!
    if (lang === "zh" && !matchedVoice) {
      playFallbackAudio(text, lang, options);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang === "zh" ? "zh-CN" : "en-US";
    utterance.rate = rate;

    if (matchedVoice) {
      utterance.voice = matchedVoice;
    }

    let hasStarted = false;
    let fallbackTriggered = false;

    // Prevent Chromium GC bug: retain utterance reference
    activeUtterances.add(utterance);

    utterance.onstart = () => {
      hasStarted = true;
      options.onStart?.();
    };

    utterance.onend = () => {
      activeUtterances.delete(utterance);
      if (!fallbackTriggered) {
        options.onEnd?.();
      }
    };

    utterance.onerror = () => {
      activeUtterances.delete(utterance);
      if (!hasStarted && !fallbackTriggered) {
        fallbackTriggered = true;
        playFallbackAudio(text, lang, options);
      } else {
        options.onError?.();
      }
    };

    setTimeout(() => {
      try {
        window.speechSynthesis.speak(utterance);
      } catch {
        if (!fallbackTriggered) {
          fallbackTriggered = true;
          playFallbackAudio(text, lang, options);
        }
      }
    }, 10);

    // Watchdog: If browser doesn't start speaking within 300ms, fallback to audio stream!
    setTimeout(() => {
      if (!hasStarted && !fallbackTriggered) {
        fallbackTriggered = true;
        activeUtterances.delete(utterance);
        try {
          window.speechSynthesis.cancel();
        } catch {
          // ignore
        }
        playFallbackAudio(text, lang, options);
      }
    }, 300);
  } catch (err) {
    console.warn("SpeechSynthesis error, falling back to audio stream:", err);
    playFallbackAudio(text, lang, options);
  }
}
