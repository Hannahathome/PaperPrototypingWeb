// Passing a shapes file from one web app to another in the same browser (e.g.
// DataPhysicalisation → PaperPolyhedra). Stored in localStorage for a moment and read once.
// Storage can be unavailable (private windows, blocked site data), so every call is guarded;
// downloading the JSON file always works as a fallback.

const KEY = 'paperprototyping:handoff';
/** A handoff older than this is ignored. */
const MAX_AGE_MS = 10 * 60 * 1000;

export interface Handoff {
	from: string;
	json: string;
	at: number;
}

/** Store a shapes JSON for the next app. Returns false when storage is unavailable. */
export function sendHandoff(from: string, json: string): boolean {
	try {
		localStorage.setItem(KEY, JSON.stringify({ from, json, at: Date.now() } satisfies Handoff));
		return true;
	} catch {
		return false;
	}
}

/** Read and remove a waiting handoff, or null. */
export function takeHandoff(): Handoff | null {
	try {
		const text = localStorage.getItem(KEY);
		localStorage.removeItem(KEY);
		if (!text) return null;
		const handoff = JSON.parse(text) as Handoff;
		return Date.now() - handoff.at < MAX_AGE_MS && typeof handoff.json === 'string' ? handoff : null;
	} catch {
		return null;
	}
}
