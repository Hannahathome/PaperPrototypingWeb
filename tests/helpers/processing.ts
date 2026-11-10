// Processing's scale constants, used only to read Processing reference exports in tests.
// They must not be used in src/ (see CLAUDE.md, rule 2).

/** Processing's `MM`: px per mm at 72 DPI, as written in Param.pde (slightly short of 72/25.4). */
export const PROCESSING_MM = 2.8346;
/** Processing's `MM_V`: px per mm at 96 DPI for cut files. */
export const PROCESSING_MM_V = PROCESSING_MM * (96 / 72);
