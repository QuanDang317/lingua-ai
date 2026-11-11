"use client";

import React from "react";
import { cn } from "@/lib/utils";

export interface IpaBadgeProps {
  phonetic?: string | null;
  language?: "en" | "zh" | string;
  className?: string;
  size?: "sm" | "md" | "lg";
  /** If true, renders without outer background/border card (bare phonetic with colored delimiters) */
  bare?: boolean;
}

/**
 * Checks if a phonetic string contains IPA symbols or delimiters
 */
function isIpaPhonetic(str: string): boolean {
  return /[\/\[\]ˈˌːɪiːeæɑːɒɔːʊuːʌɜːəeɪaɪɔɪəʊaʊɪəeəʊəpbtkdfθðszʃʒhtʃdʒmnŋlrjw‿\|]/.test(str);
}

/**
 * Cleans and normalizes an IPA transcription into a single clean Cambridge-style string
 * without ugly undertie curves (‿) or fragmented /.../ | /.../ blocks.
 */
function normalizeIpa(raw: string): { opening: string; content: string; closing: string } {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { opening: "", content: "", closing: "" };
  }

  let opening = "/";
  let closing = "/";
  let body = trimmed;

  if (body.startsWith("[") && body.endsWith("]") && body.length >= 2) {
    opening = "[";
    closing = "]";
    body = body.slice(1, -1).trim();
  } else {
    // Strip outer slashes if present
    body = body.replace(/^\/+|\/+$/g, "").trim();
  }

  // Remove any internal stray slashes around pipe separators, replace undertie (‿) with clean space,
  // and convert pipe separators (|) into a natural pause comma
  body = body
    .replace(/\s*\/\s*\|\s*\/\s*/g, ", ")
    .replace(/\s*\|\s*/g, ", ")
    .replace(/[‿⁀_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return { opening, content: body, closing };
}

/**
 * Cambridge Dictionary Standard Phonetic Component
 *
 * - Font: "Inter", "Segoe UI", "Lucida Sans Unicode", "DejaVu Sans", sans-serif
 * - Natural word wrapping (max-w-full break-words) so it never overflows cards at +110% or +122% zoom
 * - No ugly linking arcs (‿) or fragmented multiple slashes
 */
export function IpaBadge({
  phonetic,
  language = "en",
  className,
  size = "md",
  bare = false,
}: IpaBadgeProps) {
  if (!phonetic || !phonetic.trim()) {
    return null;
  }

  const raw = phonetic.trim();

  // If Chinese Pinyin or explicitly not English
  const isEn = language === "en" || (language !== "zh" && isIpaPhonetic(raw));
  if (!isEn) {
    return (
      <span
        className={cn(
          "font-mono font-medium text-[#0F766E] dark:text-teal-400 text-xs tracking-normal break-words",
          className
        )}
      >
        {raw}
      </span>
    );
  }

  const { opening, content: innerText, closing } = normalizeIpa(raw);

  const sizeClasses = {
    sm: "text-xs py-0.5 px-2",
    md: "text-sm py-1 px-2.5",
    lg: "text-sm sm:text-base py-1 px-3",
  }[size];

  const innerContent = (
    <>
      {opening && (
        <span className="text-[#94A3B8] dark:text-slate-500 font-normal select-none mr-[1px]">
          {opening}
        </span>
      )}
      <span className="text-[#334155] dark:text-slate-300 font-normal font-ipa tracking-[0.015em] leading-[1.6]">
        {innerText}
      </span>
      {closing && (
        <span className="text-[#94A3B8] dark:text-slate-500 font-normal select-none ml-[1px]">
          {closing}
        </span>
      )}
    </>
  );

  if (bare) {
    return (
      <span
        className={cn(
          "inline-block max-w-full break-words font-ipa tracking-[0.015em] leading-[1.6]",
          sizeClasses,
          className
        )}
      >
        {innerContent}
      </span>
    );
  }

  return (
    <div
      className={cn(
        "inline-block max-w-full break-words rounded-[6px] border border-[#CBD5E1] dark:border-slate-800 bg-[#F8FAFC] dark:bg-slate-900/60 shadow-none font-ipa tracking-[0.015em] leading-[1.6]",
        sizeClasses,
        className
      )}
    >
      {innerContent}
    </div>
  );
}

export default IpaBadge;
