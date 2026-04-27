import fs from "fs";

// Sonnet 4.6 pricing (USD per token)
const SONNET_PRICING = {
  input: 3.0 / 1_000_000,
  cacheCreate: 3.75 / 1_000_000,
  cacheRead: 0.30 / 1_000_000,
  output: 15.0 / 1_000_000,
};

export interface UsageSummary {
  inputTokens: number;
  cacheCreateTokens: number;
  cacheReadTokens: number;
  outputTokens: number;
  costUsd: number;
}

export function parseUsageFromLog(logPath: string): UsageSummary | null {
  let raw: string;
  try {
    raw = fs.readFileSync(logPath, "utf-8");
  } catch {
    return null;
  }

  let inputTokens = 0;
  let cacheCreateTokens = 0;
  let cacheReadTokens = 0;
  let outputTokens = 0;

  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    let obj: Record<string, unknown>;
    try {
      obj = JSON.parse(trimmed);
    } catch {
      continue;
    }

    // Usage lives in stream_event > event > usage (message_start)
    // and stream_event > event > usage (message_delta)
    if (obj.type === "stream_event") {
      const ev = obj.event as Record<string, unknown> | undefined;
      if (!ev) continue;

      // message_start carries input + cache tokens
      if (ev.type === "message_start") {
        const msg = ev.message as Record<string, unknown> | undefined;
        const usage = (msg?.usage ?? ev.usage) as Record<string, number> | undefined;
        if (usage) {
          inputTokens += usage.input_tokens ?? 0;
          cacheCreateTokens += usage.cache_creation_input_tokens ?? 0;
          cacheReadTokens += usage.cache_read_input_tokens ?? 0;
          outputTokens += usage.output_tokens ?? 0;
        }
      }

      // message_delta carries incremental output tokens
      if (ev.type === "message_delta") {
        const usage = ev.usage as Record<string, number> | undefined;
        if (usage) {
          outputTokens += usage.output_tokens ?? 0;
        }
      }
    }
  }

  if (inputTokens === 0 && outputTokens === 0 && cacheCreateTokens === 0) {
    return null;
  }

  const costUsd =
    inputTokens * SONNET_PRICING.input +
    cacheCreateTokens * SONNET_PRICING.cacheCreate +
    cacheReadTokens * SONNET_PRICING.cacheRead +
    outputTokens * SONNET_PRICING.output;

  return { inputTokens, cacheCreateTokens, cacheReadTokens, outputTokens, costUsd };
}
