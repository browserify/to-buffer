/**
 * Converts a string, Array of bytes, Buffer, Uint8Array, or DataView into a Buffer.
 *
 * @param data - The input data to convert to a Buffer.
 * @param encoding - The character encoding to use when `data` is a string.
 * @returns A Buffer containing the input data.
 * @throws {RangeError} If `data` is an array with values outside the range 0–255 or non-integer values.
 * @throws {TypeError} If `data` is not a supported type.
 */
declare function toBuffer(data: string | number[] | Buffer | Uint8Array | DataView, encoding?: BufferEncoding): Buffer;

export = toBuffer;
