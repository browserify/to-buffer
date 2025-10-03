'use strict';

var Buffer = require('safe-buffer').Buffer;
var isArray = require('isarray');
var typedArrayBuffer = require('typed-array-buffer');

var isView = ArrayBuffer.isView || function isView(obj) {
	try {
		typedArrayBuffer(obj);
		return true;
	} catch (e) {
		return false;
	}
};

var useUint8Array = typeof Uint8Array !== 'undefined';
var useArrayBuffer = typeof ArrayBuffer !== 'undefined'
	&& typeof Uint8Array !== 'undefined';
// Check if we're on a big-endian system
var isBigEndian = (function() {
	var buffer = new ArrayBuffer(2);
	new DataView(buffer).setInt16(0, 256, true); // little-endian
	return new Int16Array(buffer)[0] !== 256;
})();

var useFromArrayBuffer = useArrayBuffer && (Buffer.prototype instanceof Uint8Array || Buffer.TYPED_ARRAY_SUPPORT) && !isBigEndian;

module.exports = function toBuffer(data, encoding) {
	if (Buffer.isBuffer(data)) {
		if (data.constructor && !('isBuffer' in data)) {
			// probably a SlowBuffer
			return Buffer.from(data);
		}
		return data;
	}

	if (typeof data === 'string') {
		return Buffer.from(data, encoding);
	}

	/*
	 * Wrap any TypedArray instances and DataViews
	 * Makes sense only on engines with full TypedArray support -- let Buffer detect that
	 */
	if (useArrayBuffer && isView(data)) {
		// Bug in Node.js <6.3.1, which treats this as out-of-bounds
		if (data.byteLength === 0) {
			return Buffer.alloc(0);
		}

		// When Buffer is based on Uint8Array, we can just construct it from ArrayBuffer
		if (useFromArrayBuffer) {
			var res = Buffer.from(data.buffer, data.byteOffset, data.byteLength);
			/*
			 * Recheck result size, as offset/length doesn't work on Node.js <5.10
			 * We just go to Uint8Array case if this fails
			 */
			if (res.byteLength === data.byteLength) {
				return res;
			}
		}

		// Convert to Uint8Array bytes and then to Buffer
		var uint8;
		if (data instanceof Uint8Array || data instanceof Uint8ClampedArray) {
			// These are already byte arrays, no endianness issues
			uint8 = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
		} else {
			// For multi-byte TypedArrays, ensure consistent little-endian byte order
			// Read element values directly and write them in little-endian format
			var elemSize = data.BYTES_PER_ELEMENT;
			var elemCount = data.length;
			uint8 = new Uint8Array(data.byteLength);
			var outputView = new DataView(uint8.buffer);

			// Copy each element value, writing in little-endian format
			for (var j = 0; j < elemCount; j++) {
				var offset = j * elemSize;
				var value = data[j]; // Get the actual element value

				// Write the value in little-endian format based on size and type
				if (elemSize === 1) {
					// 8-bit values have no endianness
					outputView.setUint8(offset, value);
				} else if (elemSize === 2) {
					// 16-bit values - write as little-endian
					outputView.setUint16(offset, value, true);
				} else if (elemSize === 4) {
					// 32-bit values - check if it's a float
					if (typeof value === 'number' && !Number.isInteger(value)) {
						outputView.setFloat32(offset, value, true);
					} else {
						outputView.setUint32(offset, value, true);
					}
				} else if (elemSize === 8) {
					// 64-bit values - check if it's a BigInt or float
					if (typeof value === 'bigint') {
						outputView.setBigUint64(offset, value, true);
					} else if (typeof value === 'number') {
						outputView.setFloat64(offset, value, true);
					} else {
						// Fallback - shouldn't happen but just in case
						outputView.setFloat64(offset, Number(value), true);
					}
				}
			}
		}

		var result = Buffer.from(uint8);

		/*
		 * Let's recheck that conversion succeeded
		 * We have .length but not .byteLength when useFromArrayBuffer is false
		 */
		if (result.length === data.byteLength) {
			return result;
		}
	}

	/*
	 * Uint8Array in engines where Buffer.from might not work with ArrayBuffer, just copy over
	 * Doesn't make sense with other TypedArray instances
	 */
	if (useUint8Array && data instanceof Uint8Array) {
		return Buffer.from(data);
	}

	var isArr = isArray(data);
	if (isArr) {
		for (var i = 0; i < data.length; i += 1) {
			var x = data[i];
			if (
				typeof x !== 'number'
				|| x < 0
				|| x > 255
				|| ~~x !== x // NaN and integer check
			) {
				throw new RangeError('Array items must be numbers in the range 0-255.');
			}
		}
	}

	/*
	 * Old Buffer polyfill on an engine that doesn't have TypedArray support
	 * Also, this is from a different Buffer polyfill implementation then we have, as instanceof check failed
	 * Convert to our current Buffer implementation
	 */
	if (
		isArr || (
			Buffer.isBuffer(data)
			&& data.constructor
			&& typeof data.constructor.isBuffer === 'function'
			&& data.constructor.isBuffer(data)
		)
	) {
		return Buffer.from(data);
	}

	throw new TypeError('The "data" argument must be a string, an Array, a Buffer, a Uint8Array, or a DataView.');
};
