// ArUco "original" dictionary (OpenCV DICT_ARUCO_ORIGINAL): 1024 markers of 5 × 5 bits
// inside a one-cell black border. This is the dictionary in PaperPhicons' aruco1024_px.png.
//
// Each row carries 2 bits of the ID, most significant row first, encoded as one of four
// 5-bit words; 1 is a white cell, 0 black. Checked cell for cell against the PNG sheet in
// tests/tools/paperphicons/aruco.test.ts.

export const ARUCO_ORIGINAL_SIZE = 1024;

const ROW_WORDS = [
	[1, 0, 0, 0, 0],
	[1, 0, 1, 1, 1],
	[0, 1, 0, 0, 1],
	[0, 1, 1, 1, 0],
] as const;

/** The 5 × 5 data cells of marker `id`, as rows of 1 (white) and 0 (black). */
export function arucoOriginalBits(id: number): number[][] {
	if (!Number.isInteger(id) || id < 0 || id >= ARUCO_ORIGINAL_SIZE) {
		throw new RangeError(`ArUco original marker id must be 0–${ARUCO_ORIGINAL_SIZE - 1}, got ${id}`);
	}
	return Array.from({ length: 5 }, (_, row) => [...ROW_WORDS[(id >> (8 - 2 * row)) & 3]]);
}
