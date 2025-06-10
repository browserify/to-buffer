'use strict';

var test = require('tape');
var availableTypedArrays = require('available-typed-arrays')();
var forEach = require('for-each');

var toBuffer = require('../');
var fixtures = require('./fixtures.json');

test('buffer returns buffer', function (t) {
	t.same(toBuffer(new Buffer('hi')), new Buffer('hi'));
	t.end();
});

test('string returns buffer', function (t) {
	t.same(toBuffer('hi'), new Buffer('hi'));
	t.end();
});

test('string + enc returns buffer', function (t) {
	t.same(toBuffer('6869', 'hex'), new Buffer('hi'));
	t.end();
});

test('array returns buffer', function (t) {
	t.same(toBuffer([104, 105]), new Buffer('hi'));
	t.end();
});

test('other input throws', function (t) {
	try {
		toBuffer(42);
	} catch (err) {
		t.same(err.message, 'The "data" argument must be of type string or an instance of Buffer, TypedArray, or DataView.');
		t.end();
	}
});

test('handle all TA types', function (t) {
	if (ArrayBuffer.isView && (Buffer.prototype instanceof Uint8Array || Buffer.TYPED_ARRAY_SUPPORT)) {
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
	} else {
		t.skip('ArrayBuffer.isView and/or TypedArray not fully supported');
	}

	t.end();
});
