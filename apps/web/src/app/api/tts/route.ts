import { NextRequest, NextResponse } from "next/server";

// High-speed in-memory audio buffer cache (LRU capped at 300 entries)
const ttsCache = new Map<string, { buffer: ArrayBuffer; timestamp: number }>();
const MAX_CACHE_SIZE = 300;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const text = (searchParams.get("text") || "").trim().slice(0, 300);
    const lang = searchParams.get("lang") === "en" ? "en" : "zh";

    if (!text) {
      return new NextResponse("Text parameter is required", { status: 400 });
    }

    const cacheKey = `${lang}:${text}`;
    const cached = ttsCache.get(cacheKey);
    if (cached) {
      return new NextResponse(cached.buffer, {
        status: 200,
        headers: {
          "Content-Type": "audio/mpeg",
          "Cache-Control": "public, max-age=604800, immutable",
        },
      });
    }

    // High quality standard speech synthesis (Mandarin Chinese or American English)
    const targetLang = lang === "zh" ? "zh-CN" : "en-US";
    const googleTtsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${targetLang}&q=${encodeURIComponent(
      text
    )}`;

    const response = await fetch(googleTtsUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        Accept: "audio/mpeg,audio/*;q=0.9,*/*;q=0.5",
      },
    });

    if (response.ok) {
      const arrayBuffer = await response.arrayBuffer();

      // Enforce LRU cap
      if (ttsCache.size >= MAX_CACHE_SIZE) {
        const firstKey = ttsCache.keys().next().value;
        if (firstKey) ttsCache.delete(firstKey);
      }
      ttsCache.set(cacheKey, { buffer: arrayBuffer, timestamp: Date.now() });

      return new NextResponse(arrayBuffer, {
        status: 200,
        headers: {
          "Content-Type": "audio/mpeg",
          "Cache-Control": "public, max-age=604800, immutable",
        },
      });
    }

    // Fallback: If Google TTS returns non-200, try Youdao Chinese voice for short text
    if (lang === "zh" && text.length <= 15) {
      const youdaoUrl = `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(
        text
      )}&le=zh`;
      const ydRes = await fetch(youdaoUrl);
      if (ydRes.ok) {
        const ydBuffer = await ydRes.arrayBuffer();
        return new NextResponse(ydBuffer, {
          status: 200,
          headers: {
            "Content-Type": "audio/mpeg",
            "Cache-Control": "public, max-age=604800, immutable",
          },
        });
      }
    }

    return new NextResponse(`TTS upstream failed with code ${response.status}`, {
      status: response.status,
    });
  } catch (error: any) {
    return new NextResponse(`TTS stream error: ${error?.message || "Unknown"}`, {
      status: 500,
    });
  }
}
