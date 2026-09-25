// Browser-only file helpers: saving exports and reading uploads. Nothing leaves the browser.

/** Save a blob under a file name via a temporary download link. */
export function downloadBlob(blob: Blob, filename: string): void {
	const url = URL.createObjectURL(blob);
	const link = document.createElement('a');
	link.href = url;
	link.download = filename;
	document.body.append(link);
	link.click();
	link.remove();
	// Give the browser time to start the download before the URL is released.
	setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/**
 * Save several files one after another. Browsers may block rapid multiple downloads, so
 * each is spaced out slightly; the first download may ask the user for permission.
 */
export async function downloadAll(files: { name: string; blob: Blob }[]): Promise<void> {
	for (const file of files) {
		downloadBlob(file.blob, file.name);
		await new Promise((resolve) => setTimeout(resolve, 300));
	}
}

function read<T extends string>(file: Blob, method: 'readAsDataURL' | 'readAsText'): Promise<T> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(reader.result as T);
		reader.onerror = () => reject(reader.error ?? new Error('Could not read the file.'));
		reader[method](file);
	});
}

/** Read an uploaded file (e.g. an image) as a data URL. */
export function readAsDataUrl(file: Blob): Promise<string> {
	return read(file, 'readAsDataURL');
}

/** Read an uploaded text file (e.g. CSV or JSON). */
export function readAsText(file: Blob): Promise<string> {
	return read(file, 'readAsText');
}
