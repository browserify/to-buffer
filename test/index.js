'use strict';

var test = require('tape');
var availableTypedArrays = require('available-typed-arrays')();
var forEach = require('for-each');
var typedArrayBuffer = require('typed-array-buffer');
var SafeBuffer = require('safe-buffer').Buffer;
var SlowBuffer = require('buffer').SlowBuffer;

var toBuffer = require('../');
var fixtures = require('./fixtures.json');

test('buffer returns buffer', function (t) {
	var result = toBuffer(new Buffer('hi'));

	t.deepEqual(result, new Buffer('hi'));
	t.ok(result instanceof Buffer, 'is a Buffer');
	t.notOk(result instanceof SlowBuffer, 'not a SlowBuffer');

	t.end();
});

test('SlowBuffer returns Buffer', { skip: SlowBuffer.name === 'deprecated' }, function (t) {
	var slow = new SlowBuffer(2);
	slow[0] = 7;
	slow[1] = 8;
	var result = toBuffer(slow);

	t.deepEqual(result, new Buffer([7, 8]));
	t.ok(result instanceof Buffer, 'is a Buffer');
	t.notOk(result instanceof SlowBuffer, 'not a SlowBuffer');

	t.end();
});

test('string returns buffer', function (t) {
	t.deepEqual(toBuffer('hi'), new Buffer('hi'));
	t.end();
});

test('string + enc returns buffer', function (t) {
	t.deepEqual(toBuffer('6869', 'hex'), new Buffer('hi'));
	t.end();
});

test('array returns buffer', function (t) {
	t.deepEqual(toBuffer([104, 105]), new Buffer('hi'));

	forEach([-1, 256, NaN, 4.2, Infinity], function (nonByte) {
		t['throws'](
			function () { toBuffer([0, 42, nonByte]); },
			RangeError,
			nonByte + ': arrays with out-of-bounds byte values throw'
		);
	});

	t.end();
});

test('other input throws', function (t) {
	try {
		toBuffer(42);
	} catch (err) {
		t.deepEqual(err.message, 'The "data" argument must be a string, an Array, a Buffer, a Uint8Array, or a DataView.');
		t.end();
	}
});

test('handle all TA types', function (t) {
	forEach(availableTypedArrays, function (type) {
		var TA = global[type];
		if (!(type in fixtures)) {
			t.fail('No fixtures for ' + type);
			return;
		}

		var input = fixtures[type].input;
		if (typeof input[0] === 'string') {
			for (var i = 0; i < input.length; i++) {
				input[i] = BigInt(input[i]);
			}
		}

		t.deepEqual(
			toBuffer(new TA(input)),
			new Buffer(fixtures[type].output),
			type + ' should be converted to Buffer correctly'
		);
	});

	t.test('TA subset view on another one', { skip: typeof Float64Array === 'undefined' || typeof Uint8Array === 'undefined' }, function (st) {
		var arr = new Uint8Array(100);
		for (var i = 0; i < arr.length; i += 1) {
			arr[i] = i;
		}

		var buffer = typedArrayBuffer(arr);
		var expectedHex = '000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f202122232425262728292a2b2c2d2e2f303132333435363738393a3b3c3d3e3f404142434445464748494a4b4c4d4e4f505152535455565758595a5b5c5d5e5f60616263';

		forEach(availableTypedArrays, function (type) {
			var TA = global[type];
			var offset = 8;
			var len = 4;
			var arr2 = new TA(buffer, offset, len);
			st.ok(arr2.BYTES_PER_ELEMENT >= 1, 'BYTES_PER_ELEMENT: sanity check');

			var expectedSlice = expectedHex.slice(offset * 2, (offset + (len * arr2.BYTES_PER_ELEMENT)) * 2);
			var expected = SafeBuffer.from(expectedSlice, 'hex');
			st.equal(expected.length, len * arr2.BYTES_PER_ELEMENT, 'expected length: sanity check');

			var result = toBuffer(arr2);
			st.deepEqual(
				result,
				expected,
				'Uint8Array subset view on ' + type + ' should be converted to Buffer correctly'
			);
			st.equal(
				result.toString('hex'),
				expectedSlice,
				'Uint8Array subset view on ' + type + ' should be converted to Buffer that toStrings correctly'
			);
		});

		st.end();
	});

	t.end();
});
