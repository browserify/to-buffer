'use strict';

var bufferFrom = require('buffer-from');
var isArray = require('isarray');

var useUint8Array = typeof Uint8Array !== 'undefined';
var useArrayBuffer = typeof ArrayBuffer !== 'undefined'
	&& typeof Uint8Array !== 'undefined'
	&& ArrayBuffer.isView
	&& (Buffer.prototype instanceof Uint8Array || Buffer.TYPED_ARRAY_SUPPORT);

module.exports = function toBuffer(data, encoding) {
	/*
	 * No need to do anything for exact instance
	 * This is only valid when safe-buffer.Buffer === buffer.Buffer, i.e. when Buffer.from/Buffer.alloc existed
	 */
	if (data instanceof Buffer) {
		return data;
	}

	// Convert strings to Buffer
	if (typeof data === 'string') {
		return bufferFrom(data, encoding);
	}

	/*
	 * Wrap any TypedArray instances and DataViews
	 * Makes sense only on engines with full TypedArray support -- let Buffer detect that
	 */
	if (useArrayBuffer && ArrayBuffer.isView(data)) {
		// Bug in Node.js <6.3.1, which treats this as out-of-bounds
		if (data.byteLength === 0) {
			return Buffer.alloc(0);
		}

		var res = bufferFrom(data.buffer, data.byteOffset, data.byteLength);
		/*
		 * Recheck result size, as offset/length doesn't work on Node.js <5.10
		 * We just go to Uint8Array case if this fails
		 */
		if (res.byteLength === data.byteLength) {
			return res;
		}
	}

	/*
	 * Uint8Array in engines where Buffer.from might not work with ArrayBuffer, just copy over
	 * Doesn't make sense with other TypedArray instances
	 */
	if (useUint8Array && data instanceof Uint8Array) {
		return bufferFrom(data);
	}

	/*
	 * Old Buffer polyfill on an engine that doesn't have TypedArray support
	 * Also, this is from a different Buffer polyfill implementation then we have, as instanceof check failed
	 * Convert to our current Buffer implementation
	 */
	if (
		isArray(data)
		|| (
			Buffer.isBuffer(data)
				&& data.constructor
				&& typeof data.constructor.isBuffer === 'function'
				&& data.constructor.isBuffer(data)
		)
	) {
		return bufferFrom(data);
	}

	throw new TypeError('The "data" argument must be a string, an Array, a Buffer, a TypedArray, or a DataView.');
};
