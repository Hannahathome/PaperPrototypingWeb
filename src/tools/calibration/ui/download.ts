// Wires the download button on the calibration page to the three-file export.
import { buildExportFiles } from '../../../lib/export';
import { downloadAll } from '../../../lib/files';
import { calibrationTestSheet } from '../core/sheet';

export function setupDownload(button: HTMLButtonElement, status: HTMLElement): void {
	button.addEventListener('click', async () => {
		button.disabled = true;
		status.textContent = 'Preparing files…';
		try {
			const files = buildExportFiles(calibrationTestSheet(), 'calibration');
			await downloadAll(files);
			status.textContent = `Downloaded ${files.map((f) => f.name).join(', ')}.`;
		} catch (error) {
			status.textContent = `Something went wrong: ${error instanceof Error ? error.message : String(error)}`;
		} finally {
			button.disabled = false;
		}
	});
}
