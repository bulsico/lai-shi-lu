import fs from "fs";
import path from "path";

const STATE_DIR = path.resolve(process.cwd(), "data/tmp/sessions");

export function ensureStateDir() {
  fs.mkdirSync(STATE_DIR, { recursive: true });
}

interface SessionState {
  pid: number;
  startedAt: number;
  address: string;
  finishedAt?: number;
  exitCode?: number;
  error?: string;
}

function statePath(sessionId: string) {
  return path.join(STATE_DIR, `${sessionId}.json`);
}

export function logPathFor(sessionId: string) {
  ensureStateDir();
  return path.join(STATE_DIR, `${sessionId}.log`);
}

export function writeState(sessionId: string, state: SessionState) {
  ensureStateDir();
  fs.writeFileSync(statePath(sessionId), JSON.stringify(state));
}

export function readState(sessionId: string): SessionState | null {
  try {
    return JSON.parse(fs.readFileSync(statePath(sessionId), "utf-8"));
  } catch {
    return null;
  }
}

export function isRunning(sessionId: string): boolean {
  const state = readState(sessionId);
  if (!state) return false;
  if (state.finishedAt) return false;
  try {
    process.kill(state.pid, 0);
    return true;
  } catch {
    return false;
  }
}
