/**
 * Shared types for the core layer.
 *
 * One stitch is one bit: 0 = K (knit stitch), 1 = P (purl stitch).
 */
export type Bit = 0 | 1

/** One row of a knitting chart, read left to right. */
export type BitRow = Bit[]

/** A knitting chart: an array of rows, row 0 at the top. */
export type BitMatrix = BitRow[]
