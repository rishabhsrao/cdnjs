/**
 * JSTS. See https://github.com/bjornharrtell/jsts
 * https://github.com/bjornharrtell/jsts/blob/master/LICENSE_EDLv1.txt
 * https://github.com/bjornharrtell/jsts/blob/master/LICENSE_EPLv1.txt
 * https://github.com/bjornharrtell/jsts/blob/master/LICENSE_LICENSE_ES6_COLLECTIONS.txt
 * @license
 */

(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define(['exports'], factory) :
  (factory((global.jsts = {})));
}(this, (function (exports) { 'use strict';

  /* Polyfill service v3.13.0
   * For detailed credits and licence information see http://github.com/financial-times/polyfill-service
   *
   * - Array.prototype.fill, License: CC0 */
  if (!('fill' in Array.prototype)) {
    Object.defineProperty(Array.prototype, 'fill', {
      configurable: true,
      value: function fill(value) {
        if (this === undefined || this === null) {
          throw new TypeError(this + ' is not an object');
        }

        var arrayLike = Object(this);
        var length = Math.max(Math.min(arrayLike.length, 9007199254740991), 0) || 0;
        var relativeStart = 1 in arguments ? parseInt(Number(arguments[1]), 10) || 0 : 0;
        relativeStart = relativeStart < 0 ? Math.max(length + relativeStart, 0) : Math.min(relativeStart, length);
        var relativeEnd = 2 in arguments && arguments[2] !== undefined ? parseInt(Number(arguments[2]), 10) || 0 : length;
        relativeEnd = relativeEnd < 0 ? Math.max(length + arguments[2], 0) : Math.min(relativeEnd, length);

        while (relativeStart < relativeEnd) {
          arrayLike[relativeStart] = value;
          ++relativeStart;
        }

        return arrayLike;
      },
      writable: true
    });
  }

  Number.isFinite = Number.isFinite || function (value) {
    return typeof value === 'number' && isFinite(value);
  };

  Number.isInteger = Number.isInteger || function (val) {
    return typeof val === 'number' && isFinite(val) && Math.floor(val) === val;
  };

  Number.parseFloat = Number.parseFloat || parseFloat;

  Number.isNaN = Number.isNaN || function (value) {
    return value !== value; // eslint-disable-line
  };

  Math.trunc = Math.trunc || function (x) {
    return x < 0 ? Math.ceil(x) : Math.floor(x);
  };

  Math.log2 = Math.log2 || function (x) {
    return Math.log(x) * Math.LOG2E;
  };

  function extend (target, source) {
    for (var key in source) {
      if (source.hasOwnProperty(key)) target[key] = source[key];
    }
  }

  function NumberUtil() {}
  extend(NumberUtil.prototype, {
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return NumberUtil;
    }
  });

  NumberUtil.equalsWithTolerance = function (x1, x2, tolerance) {
    return Math.abs(x1 - x2) <= tolerance;
  };

  function IllegalArgumentException() {}

  function Long(high, low) {
    this.low = low | 0;
    this.high = high | 0;
  }

  Long.toBinaryString = function (i) {
    var result = '';

    for (var mask = 0x80000000; mask > 0; mask >>>= 1) {
      result += (i.high & mask) === mask ? '1' : '0';
    }

    for (var mask = 0x80000000; mask > 0; mask >>>= 1) {
      result += (i.low & mask) === mask ? '1' : '0';
    }

    return result;
  };

  function Double() {}

  Double.isNaN = function (n) {
    return Number.isNaN(n);
  };

  Double.isInfinite = function (n) {
    return !Number.isFinite(n);
  };

  Double.MAX_VALUE = Number.MAX_VALUE;

  if (typeof Float64Array == 'function' && typeof Int32Array == 'function') {
    // Simple and fast conversion between double and long bits
    // using TypedArrays and ArrayViewBuffers.
    (function () {
      var EXP_BIT_MASK = 0x7ff00000;
      var SIGNIF_BIT_MASK = 0xFFFFF;
      var f64buf = new Float64Array(1);
      var i32buf = new Int32Array(f64buf.buffer);

      Double.doubleToLongBits = function (value) {
        f64buf[0] = value;
        var low = i32buf[0] | 0;
        var high = i32buf[1] | 0; // Check for NaN based on values of bit fields, maximum
        // exponent and nonzero significand.

        if ((high & EXP_BIT_MASK) === EXP_BIT_MASK && (high & SIGNIF_BIT_MASK) !== 0 && low !== 0) {
          low = 0 | 0;
          high = 0x7ff80000 | 0;
        }

        return new Long(high, low);
      };

      Double.longBitsToDouble = function (bits) {
        i32buf[0] = bits.low;
        i32buf[1] = bits.high;
        return f64buf[0];
      };
    })();
  } else {
    // More complex and slower fallback implementation using 
    // math and the divide-by-two and multiply-by-two algorithms.
    (function () {
      var BIAS = 1023;
      var log2 = Math.log2;
      var floor = Math.floor;
      var pow = Math.pow;

      var MAX_REL_BITS_INTEGER = function () {
        for (var i = 53; i > 0; i--) {
          var bits = pow(2, i) - 1;

          if (floor(log2(bits)) + 1 === i) {
            return bits;
          }
        }

        return 0;
      }();

      Double.doubleToLongBits = function (value) {
        var x, y, f, bits, skip;
        var sign, exp, high, low; // Get the sign bit and absolute value.

        if (value < 0 || 1 / value === Number.NEGATIVE_INFINITY) {
          sign = 1 << 31;
          value = -value;
        } else {
          sign = 0;
        } // Handle some special values.


        if (value === 0) {
          // Handle zeros (+/-0).
          low = 0 | 0;
          high = sign; // exponent: 00..00, significand: 00..00

          return new Long(high, low);
        }

        if (value === Infinity) {
          // Handle infinity (only positive values for value possible).
          low = 0 | 0;
          high = sign | 0x7ff00000; // exponent: 11..11, significand: 00..00

          return new Long(high, low);
        }

        if (value !== value) {
          // Handle NaNs (boiled down to only one distinct NaN).
          low = 0 | 0;
          high = 0x7ff80000; // exponent: 11..11, significand: 10..00

          return new Long(high, low);
        } // Preinitialize variables, that are not neccessarily set by
        // the algorithm.


        bits = 0;
        low = 0 | 0; // Get the (always positive) integer part of value.

        x = floor(value); // Process the integer part if it's greater than 1. Zero requires
        // no bits at all, 1 represents the implicit (hidden) leading bit,
        // which must not be written as well.

        if (x > 1) {
          // If we can reliably determine the number of bits required for
          // the integer part,
          if (x <= MAX_REL_BITS_INTEGER) {
            // get the number of bits required to represent it minus 1
            bits = floor(log2(x))
            /* + 1 - 1*/
            ; // and simply copy/shift the integer bits into low and high.
            // That's much faster than the divide-by-two algorithm (saves
            // up to ~60%).
            // We always need to mask out the most significant bit, which
            // is the implicit (aka hidden) bit.

            if (bits <= 20) {
              // The simple case in which the integer fits into the
              // lower 20 bits of the high word is worth to be handled
              // separately (saves ~25%).
              low = 0 | 0;
              high = x << 20 - bits & 0xfffff;
            } else {
              // Here, the integer part is split into low and high.
              // Since its value may require more than 32 bits, we
              // cannot use bitwise operators (which implicitly cast
              // to Int32), but use arithmetic operators % and / to
              // get low and high parts. The uppper 20 bits go to high,
              // the remaining bits (in f) to low.
              f = bits - 20; // Like (1 << f) but safe with even more than 32 bits.

              y = pow(2, f);
              low = x % y << 32 - f;
              high = x / y & 0xfffff;
            }
          } else {
            // For greater values, we must use the much slower divide-by-two
            // algorithm. Bits are generated from right to left, that is from
            // least to most significant bit. For each bit, we left-shift both
            // low and high by one and carry bit #0 from high to #31 in low.
            // The next bit is then copied into bit #19 in high, the leftmost
            // bit of the double's significand.
            // Preserve x for later user, so work with f.
            f = x;
            low = 0 | 0;

            while (true) {
              y = f / 2;
              f = floor(y);

              if (f === 0) {
                // We just found the most signigicant (1-)bit, which
                // is the implicit bit and so, not stored in the double
                // value. So, it's time to leave the loop.
                break;
              } // Count this bit, shift low and carry bit #0 from high.


              bits++;
              low >>>= 1;
              low |= (high & 0x1) << 31; // Shift high.

              high >>>= 1;

              if (y !== f) {
                // Copy the new bit into bit #19 in high (only required if 1).
                high |= 0x80000;
              }
            }
          }
        } // Bias the exponent.


        exp = bits + BIAS; // If the integer part is zero, we've not yet seen the implicit
        // leading bit. Variable skip is later used while processing the 
        // fractional part (if any).

        skip = x === 0; // Get fraction only into x.

        x = value - x; // If some significand bits are still left to be filled and
        // the fractional part is not zero, convert the fraction using
        // the multiply-by-2 algorithm.

        if (bits < 52 && x !== 0) {
          // Initialize 'buffer' f, into which newly created bits get
          // shifted from right to left.
          f = 0;

          while (true) {
            y = x * 2;

            if (y >= 1) {
              // This is a new 1-bit. Add and count this bit, if not
              // prohibited by skip.
              x = y - 1;

              if (!skip) {
                f <<= 1;
                f |= 1;
                bits++;
              } else {
                // Otherwise, decrement the exponent and unset
                // skip, so that all following bits get written.
                exp--;
                skip = false;
              }
            } else {
              // This is a new 0-bit. Add and count this bit, if not
              // prohibited by skip.
              x = y;

              if (!skip) {
                f <<= 1;
                bits++;
              } else if (--exp === 0) {
                // Otherwise we've just decremented the exponent. If the
                // biased exponent is zero now (-1023), we process a
                // subnormal number, which has no impled leading 1-bit.
                // So, count this 0-bit and unset skip to write out
                // all the following bits.
                bits++;
                skip = false;
              }
            }

            if (bits === 20) {
              // When 20 bits have been created in total, we're done with
              // the high word. Copy the bits from 'buffer' f into high
              // and reset 'buffer' f. Following bits will end up in the
              // low word.
              high |= f;
              f = 0;
            } else if (bits === 52) {
              // When 52 bits have been created in total, we're done with
              // low word as well. Copy the bits from 'buffer' f into low
              // and exit the loop.
              low |= f;
              break;
            }

            if (y === 1) {
              // When y is exactly 1, there is no remainder and the process
              // is complete (the number is finite). Copy the bits from
              // 'buffer' f into either low or high and exit the loop.
              if (bits < 20) {
                high |= f << 20 - bits;
              } else if (bits < 52) {
                low |= f << 52 - bits;
              }

              break;
            }
          }
        } // Copy/shift the exponent and sign bits into the high word.


        high |= exp << 20;
        high |= sign;
        return new Long(high, low);
      };

      Double.longBitsToDouble = function (bits) {
        var x, sign, exp, fract;
        var high = bits.high;
        var low = bits.low; // Extract the sign.

        sign = high & 1 << 31 ? -1 : 1; // Extract the unbiased exponent.

        exp = ((high & 0x7ff00000) >> 20) - BIAS; // Calculate the fraction from left to right. Start
        // off with the 20 lower bits from the high word.

        fract = 0;
        x = 1 << 19;

        for (var i = 1; i <= 20; i++) {
          if (high & x) {
            fract += pow(2, -i);
          }

          x >>>= 1;
        } // Continue with all 32 bits from the low word.


        x = 1 << 31;

        for (var i = 21; i <= 52; i++) {
          if (low & x) {
            fract += pow(2, -i);
          }

          x >>>= 1;
        } // Handle special values.
        // Check for zero and subnormal values.


        if (exp === -BIAS) {
          if (fract === 0) {
            // +/-1.0 * 0.0 => +/-0.0
            return sign * 0;
          }

          exp = -1022;
        } // Check for +/-Infinity or NaN.
        else if (exp === BIAS + 1) {
            if (fract === 0) {
              // +/-1.0 / 0.0 => +/-Infinity
              return sign / 0;
            }

            return NaN;
          } // Nothing special? Seems to be a normal number.
          else {
              // Add the implicit leading bit (1*2^0).
              fract += 1;
            }

        return sign * fract * pow(2, exp);
      };
    })();
  }

  function Comparable() {}

  function Clonable() {}

  function Comparator() {}

  function Serializable() {}

  function RuntimeException(message) {
    this.name = 'RuntimeException';
    this.message = message;
    this.stack = new Error().stack;
    Error.call(this, message);
  }
  RuntimeException.prototype = Object.create(Error.prototype);
  RuntimeException.prototype.constructor = Error;

  function inherits (c, p) {
    c.prototype = Object.create(p.prototype);
    c.prototype.constructor = c;
  }

  function AssertionFailedException() {
    if (arguments.length === 0) {
      RuntimeException.call(this);
    } else if (arguments.length === 1) {
      var message = arguments[0];
      RuntimeException.call(this, message);
    }
  }
  inherits(AssertionFailedException, RuntimeException);
  extend(AssertionFailedException.prototype, {
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return AssertionFailedException;
    }
  });

  function Assert() {}
  extend(Assert.prototype, {
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return Assert;
    }
  });

  Assert.shouldNeverReachHere = function () {
    if (arguments.length === 0) {
      Assert.shouldNeverReachHere(null);
    } else if (arguments.length === 1) {
      var message = arguments[0];
      throw new AssertionFailedException("Should never reach here" + (message !== null ? ": " + message : ""));
    }
  };

  Assert.isTrue = function () {
    if (arguments.length === 1) {
      var assertion = arguments[0];
      Assert.isTrue(assertion, null);
    } else if (arguments.length === 2) {
      var _assertion = arguments[0],
          message = arguments[1];

      if (!_assertion) {
        if (message === null) {
          throw new AssertionFailedException();
        } else {
          throw new AssertionFailedException(message);
        }
      }
    }
  };

  Assert.equals = function () {
    if (arguments.length === 2) {
      var expectedValue = arguments[0],
          actualValue = arguments[1];
      Assert.equals(expectedValue, actualValue, null);
    } else if (arguments.length === 3) {
      var _expectedValue = arguments[0],
          _actualValue = arguments[1],
          message = arguments[2];

      if (!_actualValue.equals(_expectedValue)) {
        throw new AssertionFailedException("Expected " + _expectedValue + " but encountered " + _actualValue + (message !== null ? ": " + message : ""));
      }
    }
  };

  function Coordinate() {
    this.x = null;
    this.y = null;
    this.z = null;

    if (arguments.length === 0) {
      Coordinate.call(this, 0.0, 0.0);
    } else if (arguments.length === 1) {
      var c = arguments[0];
      Coordinate.call(this, c.x, c.y, c.z);
    } else if (arguments.length === 2) {
      var x = arguments[0],
          y = arguments[1];
      Coordinate.call(this, x, y, Coordinate.NULL_ORDINATE);
    } else if (arguments.length === 3) {
      var _x = arguments[0],
          _y = arguments[1],
          z = arguments[2];
      this.x = _x;
      this.y = _y;
      this.z = z;
    }
  }
  extend(Coordinate.prototype, {
    setOrdinate: function setOrdinate(ordinateIndex, value) {
      switch (ordinateIndex) {
        case Coordinate.X:
          this.x = value;
          break;

        case Coordinate.Y:
          this.y = value;
          break;

        case Coordinate.Z:
          this.z = value;
          break;

        default:
          throw new IllegalArgumentException("Invalid ordinate index: " + ordinateIndex);
      }
    },
    equals2D: function equals2D() {
      if (arguments.length === 1) {
        var other = arguments[0];

        if (this.x !== other.x) {
          return false;
        }

        if (this.y !== other.y) {
          return false;
        }

        return true;
      } else if (arguments.length === 2) {
        var c = arguments[0],
            tolerance = arguments[1];

        if (!NumberUtil.equalsWithTolerance(this.x, c.x, tolerance)) {
          return false;
        }

        if (!NumberUtil.equalsWithTolerance(this.y, c.y, tolerance)) {
          return false;
        }

        return true;
      }
    },
    getOrdinate: function getOrdinate(ordinateIndex) {
      switch (ordinateIndex) {
        case Coordinate.X:
          return this.x;

        case Coordinate.Y:
          return this.y;

        case Coordinate.Z:
          return this.z;
      }

      throw new IllegalArgumentException("Invalid ordinate index: " + ordinateIndex);
    },
    equals3D: function equals3D(other) {
      return this.x === other.x && this.y === other.y && (this.z === other.z || Double.isNaN(this.z) && Double.isNaN(other.z));
    },
    equals: function equals(other) {
      if (!(other instanceof Coordinate)) {
        return false;
      }

      return this.equals2D(other);
    },
    equalInZ: function equalInZ(c, tolerance) {
      return NumberUtil.equalsWithTolerance(this.z, c.z, tolerance);
    },
    compareTo: function compareTo(o) {
      var other = o;
      if (this.x < other.x) return -1;
      if (this.x > other.x) return 1;
      if (this.y < other.y) return -1;
      if (this.y > other.y) return 1;
      return 0;
    },
    clone: function clone() {
      try {
        var coord = null;
        return coord;
      } catch (e) {
        if (e instanceof CloneNotSupportedException) {
          Assert.shouldNeverReachHere("this shouldn't happen because this class is Cloneable");
          return null;
        } else throw e;
      } finally {}
    },
    copy: function copy() {
      return new Coordinate(this);
    },
    toString: function toString() {
      return "(" + this.x + ", " + this.y + ", " + this.z + ")";
    },
    distance3D: function distance3D(c) {
      var dx = this.x - c.x;
      var dy = this.y - c.y;
      var dz = this.z - c.z;
      return Math.sqrt(dx * dx + dy * dy + dz * dz);
    },
    distance: function distance(c) {
      var dx = this.x - c.x;
      var dy = this.y - c.y;
      return Math.sqrt(dx * dx + dy * dy);
    },
    hashCode: function hashCode() {
      var result = 17;
      result = 37 * result + Coordinate.hashCode(this.x);
      result = 37 * result + Coordinate.hashCode(this.y);
      return result;
    },
    setCoordinate: function setCoordinate(other) {
      this.x = other.x;
      this.y = other.y;
      this.z = other.z;
    },
    interfaces_: function interfaces_() {
      return [Comparable, Clonable, Serializable];
    },
    getClass: function getClass() {
      return Coordinate;
    }
  });

  Coordinate.hashCode = function () {
    if (arguments.length === 1 && typeof arguments[0] === "number") {
      var x = arguments[0];
      var f = Double.doubleToLongBits(x);
      return Math.trunc(f ^ f >>> 32);
    }
  };

  function DimensionalComparator() {
    this._dimensionsToTest = 2;

    if (arguments.length === 0) {
      DimensionalComparator.call(this, 2);
    } else if (arguments.length === 1) {
      var dimensionsToTest = arguments[0];
      if (dimensionsToTest !== 2 && dimensionsToTest !== 3) throw new IllegalArgumentException("only 2 or 3 dimensions may be specified");
      this._dimensionsToTest = dimensionsToTest;
    }
  }

  extend(DimensionalComparator.prototype, {
    compare: function compare(o1, o2) {
      var c1 = o1;
      var c2 = o2;
      var compX = DimensionalComparator.compare(c1.x, c2.x);
      if (compX !== 0) return compX;
      var compY = DimensionalComparator.compare(c1.y, c2.y);
      if (compY !== 0) return compY;
      if (this._dimensionsToTest <= 2) return 0;
      var compZ = DimensionalComparator.compare(c1.z, c2.z);
      return compZ;
    },
    interfaces_: function interfaces_() {
      return [Comparator];
    },
    getClass: function getClass() {
      return DimensionalComparator;
    }
  });

  DimensionalComparator.compare = function (a, b) {
    if (a < b) return -1;
    if (a > b) return 1;

    if (Double.isNaN(a)) {
      if (Double.isNaN(b)) return 0;
      return -1;
    }

    if (Double.isNaN(b)) return 1;
    return 0;
  };

  Coordinate.DimensionalComparator = DimensionalComparator;
  Coordinate.serialVersionUID = 6683108902428366910;
  Coordinate.NULL_ORDINATE = Double.NaN;
  Coordinate.X = 0;
  Coordinate.Y = 1;
  Coordinate.Z = 2;

  function hasInterface (o, i) {
    return o.interfaces_ && o.interfaces_().indexOf(i) > -1;
  }

  /**
   * @see http://download.oracle.com/javase/6/docs/api/java/util/Iterator.html
   * @constructor
   * @private
   */
  function Iterator() {}
  /**
   * Returns true if the iteration has more elements.
   * @return {boolean}
   */

  Iterator.prototype.hasNext = function () {};
  /**
   * Returns the next element in the iteration.
   * @return {Object}
   */


  Iterator.prototype.next = function () {};
  /**
   * Removes from the underlying collection the last element returned by the
   * iterator (optional operation).
   */


  Iterator.prototype.remove = function () {};

  /**
   * @see http://download.oracle.com/javase/6/docs/api/java/util/Collection.html
   *
   * @constructor
   * @private
   */

  function Collection() {}
  /**
   * Ensures that this collection contains the specified element (optional
   * operation).
   * @param {Object} e
   * @return {boolean}
   */

  Collection.prototype.add = function () {};
  /**
   * Appends all of the elements in the specified collection to the end of this
   * list, in the order that they are returned by the specified collection's
   * iterator (optional operation).
   * @param {javascript.util.Collection} c
   * @return {boolean}
   */


  Collection.prototype.addAll = function () {};
  /**
   * Returns true if this collection contains no elements.
   * @return {boolean}
   */


  Collection.prototype.isEmpty = function () {};
  /**
   * Returns an iterator over the elements in this collection.
   * @return {javascript.util.Iterator}
   */


  Collection.prototype.iterator = function () {};
  /**
   * Returns an iterator over the elements in this collection.
   * @return {number}
   */


  Collection.prototype.size = function () {};
  /**
   * Returns an array containing all of the elements in this collection.
   * @return {Array}
   */


  Collection.prototype.toArray = function () {};
  /**
   * Removes a single instance of the specified element from this collection if it
   * is present. (optional)
   * @param {Object} e
   * @return {boolean}
   */


  Collection.prototype.remove = function () {};

  /**
   * @param {string=} message Optional message
   * @extends {Error}
   * @constructor
   * @private
   */
  function IndexOutOfBoundsException$1(message) {
    this.message = message || '';
  }
  IndexOutOfBoundsException$1.prototype = new Error();
  /**
   * @type {string}
   */

  IndexOutOfBoundsException$1.prototype.name = 'IndexOutOfBoundsException';

  /**
   * @see http://download.oracle.com/javase/6/docs/api/java/util/List.html
   *
   * @extends {javascript.util.Collection}
   * @constructor
   * @private
   */

  function List() {}
  List.prototype = Object.create(Collection.prototype);
  List.prototype.constructor = List;
  /**
   * Returns the element at the specified position in this list.
   * @param {number} index
   * @return {Object}
   */

  List.prototype.get = function () {};
  /**
   * Replaces the element at the specified position in this list with the
   * specified element (optional operation).
   * @param {number} index
   * @param {Object} e
   * @return {Object}
   */


  List.prototype.set = function () {};
  /**
   * Returns true if this collection contains no elements.
   * @return {boolean}
   */


  List.prototype.isEmpty = function () {};

  /**
   * @param {string=} message Optional message
   * @extends {Error}
   * @constructor
   * @private
   */
  function NoSuchElementException(message) {
    this.message = message || '';
  }
  NoSuchElementException.prototype = new Error();
  /**
   * @type {string}
   */

  NoSuchElementException.prototype.name = 'NoSuchElementException';

  /**
   * @param {string=} message Optional message
   * @extends {Error}
   * @constructor
   * @private
   */
  function OperationNotSupported(message) {
    this.message = message || '';
  }
  OperationNotSupported.prototype = new Error();
  /**
   * @type {string}
   */

  OperationNotSupported.prototype.name = 'OperationNotSupported';

  /**
   * @see http://download.oracle.com/javase/6/docs/api/java/util/ArrayList.html
   *
   * @extends List
   * @private
   */

  function ArrayList() {
    /**
     * @type {Array}
     * @private
    */
    this.array_ = [];

    if (arguments[0] instanceof Collection) {
      this.addAll(arguments[0]);
    }
  }
  ArrayList.prototype = Object.create(List.prototype);
  ArrayList.prototype.constructor = ArrayList;

  ArrayList.prototype.ensureCapacity = function () {};

  ArrayList.prototype.interfaces_ = function () {
    return [List, Collection];
  };
  /**
   * @override
   */


  ArrayList.prototype.add = function (e) {
    if (arguments.length === 1) {
      this.array_.push(e);
    } else {
      this.array_.splice(arguments[0], 0, arguments[1]);
    }

    return true;
  };

  ArrayList.prototype.clear = function () {
    this.array_ = [];
  };
  /**
   * @override
   */


  ArrayList.prototype.addAll = function (c) {
    for (var i = c.iterator(); i.hasNext();) {
      this.add(i.next());
    }

    return true;
  };
  /**
   * @override
   */


  ArrayList.prototype.set = function (index, element) {
    var oldElement = this.array_[index];
    this.array_[index] = element;
    return oldElement;
  };
  /**
   * @override
   */


  ArrayList.prototype.iterator = function () {
    return new Iterator_(this);
  };
  /**
   * @override
   */


  ArrayList.prototype.get = function (index) {
    if (index < 0 || index >= this.size()) {
      throw new IndexOutOfBoundsException$1();
    }

    return this.array_[index];
  };
  /**
   * @override
   */


  ArrayList.prototype.isEmpty = function () {
    return this.array_.length === 0;
  };
  /**
   * @override
   */


  ArrayList.prototype.size = function () {
    return this.array_.length;
  };
  /**
   * @override
   */


  ArrayList.prototype.toArray = function () {
    var array = [];

    for (var i = 0, len = this.array_.length; i < len; i++) {
      array.push(this.array_[i]);
    }

    return array;
  };
  /**
   * @override
   */


  ArrayList.prototype.remove = function (o) {
    var found = false;

    for (var i = 0, len = this.array_.length; i < len; i++) {
      if (this.array_[i] === o) {
        this.array_.splice(i, 1);
        found = true;
        break;
      }
    }

    return found;
  };

  ArrayList.prototype.removeAll = function (c) {
    for (var i = c.iterator(); i.hasNext();) {
      this.remove(i.next());
    }

    return true;
  };
  /**
   * @extends {Iterator}
   * @param {ArrayList} arrayList
   * @constructor
   * @private
   */


  var Iterator_ = function Iterator_(arrayList) {
    /**
     * @type {ArrayList}
     * @private
    */
    this.arrayList_ = arrayList;
    /**
     * @type {number}
     * @private
    */

    this.position_ = 0;
  };
  /**
   * @override
   */


  Iterator_.prototype.next = function () {
    if (this.position_ === this.arrayList_.size()) {
      throw new NoSuchElementException();
    }

    return this.arrayList_.get(this.position_++);
  };
  /**
   * @override
   */


  Iterator_.prototype.hasNext = function () {
    if (this.position_ < this.arrayList_.size()) {
      return true;
    } else {
      return false;
    }
  };
  /**
   * TODO: should be in ListIterator
   * @override
   */


  Iterator_.prototype.set = function (element) {
    return this.arrayList_.set(this.position_ - 1, element);
  };
  /**
   * @override
   */


  Iterator_.prototype.remove = function () {
    this.arrayList_.remove(this.arrayList_.get(this.position_));
  };

  function CoordinateList() {
    ArrayList.apply(this);

    if (arguments.length === 0) ; else if (arguments.length === 1) {
      var coord = arguments[0];
      this.ensureCapacity(coord.length);
      this.add(coord, true);
    } else if (arguments.length === 2) {
      var _coord = arguments[0],
          allowRepeated = arguments[1];
      this.ensureCapacity(_coord.length);
      this.add(_coord, allowRepeated);
    }
  }
  inherits(CoordinateList, ArrayList);
  extend(CoordinateList.prototype, {
    getCoordinate: function getCoordinate(i) {
      return this.get(i);
    },
    addAll: function addAll() {
      if (arguments.length === 2 && typeof arguments[1] === "boolean" && hasInterface(arguments[0], Collection)) {
        var coll = arguments[0],
            allowRepeated = arguments[1];
        var isChanged = false;

        for (var i = coll.iterator(); i.hasNext();) {
          this.add(i.next(), allowRepeated);
          isChanged = true;
        }

        return isChanged;
      } else return ArrayList.prototype.addAll.apply(this, arguments);
    },
    clone: function clone() {
      var clone = ArrayList.prototype.clone.call(this);

      for (var i = 0; i < this.size(); i++) {
        clone.add(i, this.get(i).clone());
      }

      return clone;
    },
    toCoordinateArray: function toCoordinateArray() {
      return this.toArray(CoordinateList.coordArrayType);
    },
    add: function add() {
      if (arguments.length === 1) {
        var coord = arguments[0];
        ArrayList.prototype.add.call(this, coord);
      } else if (arguments.length === 2) {
        if (arguments[0] instanceof Array && typeof arguments[1] === "boolean") {
          var _coord2 = arguments[0],
              allowRepeated = arguments[1];
          this.add(_coord2, allowRepeated, true);
          return true;
        } else if (arguments[0] instanceof Coordinate && typeof arguments[1] === "boolean") {
          var _coord3 = arguments[0],
              _allowRepeated = arguments[1];

          if (!_allowRepeated) {
            if (this.size() >= 1) {
              var last = this.get(this.size() - 1);
              if (last.equals2D(_coord3)) return null;
            }
          }

          ArrayList.prototype.add.call(this, _coord3);
        } else if (arguments[0] instanceof Object && typeof arguments[1] === "boolean") {
          var obj = arguments[0],
              _allowRepeated2 = arguments[1];
          this.add(obj, _allowRepeated2);
          return true;
        }
      } else if (arguments.length === 3) {
        if (typeof arguments[2] === "boolean" && arguments[0] instanceof Array && typeof arguments[1] === "boolean") {
          var _coord4 = arguments[0],
              _allowRepeated3 = arguments[1],
              direction = arguments[2];

          if (direction) {
            for (var i = 0; i < _coord4.length; i++) {
              this.add(_coord4[i], _allowRepeated3);
            }
          } else {
            for (var i = _coord4.length - 1; i >= 0; i--) {
              this.add(_coord4[i], _allowRepeated3);
            }
          }

          return true;
        } else if (typeof arguments[2] === "boolean" && Number.isInteger(arguments[0]) && arguments[1] instanceof Coordinate) {
          var _i = arguments[0],
              _coord5 = arguments[1],
              _allowRepeated4 = arguments[2];

          if (!_allowRepeated4) {
            var size = this.size();

            if (size > 0) {
              if (_i > 0) {
                var prev = this.get(_i - 1);
                if (prev.equals2D(_coord5)) return null;
              }

              if (_i < size) {
                var next = this.get(_i);
                if (next.equals2D(_coord5)) return null;
              }
            }
          }

          ArrayList.prototype.add.call(this, _i, _coord5);
        }
      } else if (arguments.length === 4) {
        var _coord6 = arguments[0],
            _allowRepeated5 = arguments[1],
            start = arguments[2],
            end = arguments[3];
        var inc = 1;
        if (start > end) inc = -1;

        for (var i = start; i !== end; i += inc) {
          this.add(_coord6[i], _allowRepeated5);
        }

        return true;
      }
    },
    closeRing: function closeRing() {
      if (this.size() > 0) this.add(new Coordinate(this.get(0)), false);
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return CoordinateList;
    }
  });
  CoordinateList.coordArrayType = new Array(0).fill(null);

  function Envelope() {
    this._minx = null;
    this._maxx = null;
    this._miny = null;
    this._maxy = null;

    if (arguments.length === 0) {
      this.init();
    } else if (arguments.length === 1) {
      if (arguments[0] instanceof Coordinate) {
        var p = arguments[0];
        this.init(p.x, p.x, p.y, p.y);
      } else if (arguments[0] instanceof Envelope) {
        var env = arguments[0];
        this.init(env);
      }
    } else if (arguments.length === 2) {
      var p1 = arguments[0],
          p2 = arguments[1];
      this.init(p1.x, p2.x, p1.y, p2.y);
    } else if (arguments.length === 4) {
      var x1 = arguments[0],
          x2 = arguments[1],
          y1 = arguments[2],
          y2 = arguments[3];
      this.init(x1, x2, y1, y2);
    }
  }
  extend(Envelope.prototype, {
    getArea: function getArea() {
      return this.getWidth() * this.getHeight();
    },
    equals: function equals(other) {
      if (!(other instanceof Envelope)) {
        return false;
      }

      var otherEnvelope = other;

      if (this.isNull()) {
        return otherEnvelope.isNull();
      }

      return this._maxx === otherEnvelope.getMaxX() && this._maxy === otherEnvelope.getMaxY() && this._minx === otherEnvelope.getMinX() && this._miny === otherEnvelope.getMinY();
    },
    intersection: function intersection(env) {
      if (this.isNull() || env.isNull() || !this.intersects(env)) return new Envelope();
      var intMinX = this._minx > env._minx ? this._minx : env._minx;
      var intMinY = this._miny > env._miny ? this._miny : env._miny;
      var intMaxX = this._maxx < env._maxx ? this._maxx : env._maxx;
      var intMaxY = this._maxy < env._maxy ? this._maxy : env._maxy;
      return new Envelope(intMinX, intMaxX, intMinY, intMaxY);
    },
    isNull: function isNull() {
      return this._maxx < this._minx;
    },
    getMaxX: function getMaxX() {
      return this._maxx;
    },
    covers: function covers() {
      if (arguments.length === 1) {
        if (arguments[0] instanceof Coordinate) {
          var p = arguments[0];
          return this.covers(p.x, p.y);
        } else if (arguments[0] instanceof Envelope) {
          var other = arguments[0];

          if (this.isNull() || other.isNull()) {
            return false;
          }

          return other.getMinX() >= this._minx && other.getMaxX() <= this._maxx && other.getMinY() >= this._miny && other.getMaxY() <= this._maxy;
        }
      } else if (arguments.length === 2) {
        var x = arguments[0],
            y = arguments[1];
        if (this.isNull()) return false;
        return x >= this._minx && x <= this._maxx && y >= this._miny && y <= this._maxy;
      }
    },
    intersects: function intersects() {
      if (arguments.length === 1) {
        if (arguments[0] instanceof Envelope) {
          var other = arguments[0];

          if (this.isNull() || other.isNull()) {
            return false;
          }

          return !(other._minx > this._maxx || other._maxx < this._minx || other._miny > this._maxy || other._maxy < this._miny);
        } else if (arguments[0] instanceof Coordinate) {
          var p = arguments[0];
          return this.intersects(p.x, p.y);
        }
      } else if (arguments.length === 2) {
        if (arguments[0] instanceof Coordinate && arguments[1] instanceof Coordinate) {
          var a = arguments[0],
              b = arguments[1];

          if (this.isNull()) {
            return false;
          }

          var envminx = a.x < b.x ? a.x : b.x;
          if (envminx > this._maxx) return false;
          var envmaxx = a.x > b.x ? a.x : b.x;
          if (envmaxx < this._minx) return false;
          var envminy = a.y < b.y ? a.y : b.y;
          if (envminy > this._maxy) return false;
          var envmaxy = a.y > b.y ? a.y : b.y;
          if (envmaxy < this._miny) return false;
          return true;
        } else if (typeof arguments[0] === "number" && typeof arguments[1] === "number") {
          var x = arguments[0],
              y = arguments[1];
          if (this.isNull()) return false;
          return !(x > this._maxx || x < this._minx || y > this._maxy || y < this._miny);
        }
      }
    },
    getMinY: function getMinY() {
      return this._miny;
    },
    getMinX: function getMinX() {
      return this._minx;
    },
    expandToInclude: function expandToInclude() {
      if (arguments.length === 1) {
        if (arguments[0] instanceof Coordinate) {
          var p = arguments[0];
          this.expandToInclude(p.x, p.y);
        } else if (arguments[0] instanceof Envelope) {
          var other = arguments[0];

          if (other.isNull()) {
            return null;
          }

          if (this.isNull()) {
            this._minx = other.getMinX();
            this._maxx = other.getMaxX();
            this._miny = other.getMinY();
            this._maxy = other.getMaxY();
          } else {
            if (other._minx < this._minx) {
              this._minx = other._minx;
            }

            if (other._maxx > this._maxx) {
              this._maxx = other._maxx;
            }

            if (other._miny < this._miny) {
              this._miny = other._miny;
            }

            if (other._maxy > this._maxy) {
              this._maxy = other._maxy;
            }
          }
        }
      } else if (arguments.length === 2) {
        var x = arguments[0],
            y = arguments[1];

        if (this.isNull()) {
          this._minx = x;
          this._maxx = x;
          this._miny = y;
          this._maxy = y;
        } else {
          if (x < this._minx) {
            this._minx = x;
          }

          if (x > this._maxx) {
            this._maxx = x;
          }

          if (y < this._miny) {
            this._miny = y;
          }

          if (y > this._maxy) {
            this._maxy = y;
          }
        }
      }
    },
    minExtent: function minExtent() {
      if (this.isNull()) return 0.0;
      var w = this.getWidth();
      var h = this.getHeight();
      if (w < h) return w;
      return h;
    },
    getWidth: function getWidth() {
      if (this.isNull()) {
        return 0;
      }

      return this._maxx - this._minx;
    },
    compareTo: function compareTo(o) {
      var env = o;

      if (this.isNull()) {
        if (env.isNull()) return 0;
        return -1;
      } else {
        if (env.isNull()) return 1;
      }

      if (this._minx < env._minx) return -1;
      if (this._minx > env._minx) return 1;
      if (this._miny < env._miny) return -1;
      if (this._miny > env._miny) return 1;
      if (this._maxx < env._maxx) return -1;
      if (this._maxx > env._maxx) return 1;
      if (this._maxy < env._maxy) return -1;
      if (this._maxy > env._maxy) return 1;
      return 0;
    },
    translate: function translate(transX, transY) {
      if (this.isNull()) {
        return null;
      }

      this.init(this.getMinX() + transX, this.getMaxX() + transX, this.getMinY() + transY, this.getMaxY() + transY);
    },
    toString: function toString() {
      return "Env[" + this._minx + " : " + this._maxx + ", " + this._miny + " : " + this._maxy + "]";
    },
    setToNull: function setToNull() {
      this._minx = 0;
      this._maxx = -1;
      this._miny = 0;
      this._maxy = -1;
    },
    getHeight: function getHeight() {
      if (this.isNull()) {
        return 0;
      }

      return this._maxy - this._miny;
    },
    maxExtent: function maxExtent() {
      if (this.isNull()) return 0.0;
      var w = this.getWidth();
      var h = this.getHeight();
      if (w > h) return w;
      return h;
    },
    expandBy: function expandBy() {
      if (arguments.length === 1) {
        var distance = arguments[0];
        this.expandBy(distance, distance);
      } else if (arguments.length === 2) {
        var deltaX = arguments[0],
            deltaY = arguments[1];
        if (this.isNull()) return null;
        this._minx -= deltaX;
        this._maxx += deltaX;
        this._miny -= deltaY;
        this._maxy += deltaY;
        if (this._minx > this._maxx || this._miny > this._maxy) this.setToNull();
      }
    },
    contains: function contains() {
      if (arguments.length === 1) {
        if (arguments[0] instanceof Envelope) {
          var other = arguments[0];
          return this.covers(other);
        } else if (arguments[0] instanceof Coordinate) {
          var p = arguments[0];
          return this.covers(p);
        }
      } else if (arguments.length === 2) {
        var x = arguments[0],
            y = arguments[1];
        return this.covers(x, y);
      }
    },
    centre: function centre() {
      if (this.isNull()) return null;
      return new Coordinate((this.getMinX() + this.getMaxX()) / 2.0, (this.getMinY() + this.getMaxY()) / 2.0);
    },
    init: function init() {
      if (arguments.length === 0) {
        this.setToNull();
      } else if (arguments.length === 1) {
        if (arguments[0] instanceof Coordinate) {
          var p = arguments[0];
          this.init(p.x, p.x, p.y, p.y);
        } else if (arguments[0] instanceof Envelope) {
          var env = arguments[0];
          this._minx = env._minx;
          this._maxx = env._maxx;
          this._miny = env._miny;
          this._maxy = env._maxy;
        }
      } else if (arguments.length === 2) {
        var p1 = arguments[0],
            p2 = arguments[1];
        this.init(p1.x, p2.x, p1.y, p2.y);
      } else if (arguments.length === 4) {
        var x1 = arguments[0],
            x2 = arguments[1],
            y1 = arguments[2],
            y2 = arguments[3];

        if (x1 < x2) {
          this._minx = x1;
          this._maxx = x2;
        } else {
          this._minx = x2;
          this._maxx = x1;
        }

        if (y1 < y2) {
          this._miny = y1;
          this._maxy = y2;
        } else {
          this._miny = y2;
          this._maxy = y1;
        }
      }
    },
    getMaxY: function getMaxY() {
      return this._maxy;
    },
    distance: function distance(env) {
      if (this.intersects(env)) return 0;
      var dx = 0.0;
      if (this._maxx < env._minx) dx = env._minx - this._maxx;else if (this._minx > env._maxx) dx = this._minx - env._maxx;
      var dy = 0.0;
      if (this._maxy < env._miny) dy = env._miny - this._maxy;else if (this._miny > env._maxy) dy = this._miny - env._maxy;
      if (dx === 0.0) return dy;
      if (dy === 0.0) return dx;
      return Math.sqrt(dx * dx + dy * dy);
    },
    hashCode: function hashCode() {
      var result = 17;
      result = 37 * result + Coordinate.hashCode(this._minx);
      result = 37 * result + Coordinate.hashCode(this._maxx);
      result = 37 * result + Coordinate.hashCode(this._miny);
      result = 37 * result + Coordinate.hashCode(this._maxy);
      return result;
    },
    interfaces_: function interfaces_() {
      return [Comparable, Serializable];
    },
    getClass: function getClass() {
      return Envelope;
    }
  });

  Envelope.intersects = function () {
    if (arguments.length === 3) {
      var p1 = arguments[0],
          p2 = arguments[1],
          q = arguments[2];

      if (q.x >= (p1.x < p2.x ? p1.x : p2.x) && q.x <= (p1.x > p2.x ? p1.x : p2.x) && q.y >= (p1.y < p2.y ? p1.y : p2.y) && q.y <= (p1.y > p2.y ? p1.y : p2.y)) {
        return true;
      }

      return false;
    } else if (arguments.length === 4) {
      var _p = arguments[0],
          _p2 = arguments[1],
          q1 = arguments[2],
          q2 = arguments[3];
      var minq = Math.min(q1.x, q2.x);
      var maxq = Math.max(q1.x, q2.x);
      var minp = Math.min(_p.x, _p2.x);
      var maxp = Math.max(_p.x, _p2.x);
      if (minp > maxq) return false;
      if (maxp < minq) return false;
      minq = Math.min(q1.y, q2.y);
      maxq = Math.max(q1.y, q2.y);
      minp = Math.min(_p.y, _p2.y);
      maxp = Math.max(_p.y, _p2.y);
      if (minp > maxq) return false;
      if (maxp < minq) return false;
      return true;
    }
  };

  Envelope.serialVersionUID = 5873921885273102420;

  function Exception() {}

  function NotRepresentableException() {
    Exception.call(this, "Projective point not representable on the Cartesian plane.");
  }
  inherits(NotRepresentableException, Exception);
  extend(NotRepresentableException.prototype, {
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return NotRepresentableException;
    }
  });

  function StringBuffer(str) {
    this.str = str;
  }

  StringBuffer.prototype.append = function (e) {
    this.str += e;
  };

  StringBuffer.prototype.setCharAt = function (i, c) {
    this.str = this.str.substr(0, i) + c + this.str.substr(i + 1);
  };

  StringBuffer.prototype.toString = function (e) {
    return this.str;
  };

  function Integer(value) {
    this.value = value;
  }

  Integer.prototype.intValue = function () {
    return this.value;
  };

  Integer.prototype.compareTo = function (o) {
    if (this.value < o) return -1;
    if (this.value > o) return 1;
    return 0;
  };

  Integer.isNaN = function (n) {
    return Number.isNaN(n);
  };

  function Character() {}

  Character.isWhitespace = function (c) {
    return c <= 32 && c >= 0 || c == 127;
  };

  Character.toUpperCase = function (c) {
    return c.toUpperCase();
  };

  function DD() {
    this._hi = 0.0;
    this._lo = 0.0;

    if (arguments.length === 0) {
      this.init(0.0);
    } else if (arguments.length === 1) {
      if (typeof arguments[0] === "number") {
        var x = arguments[0];
        this.init(x);
      } else if (arguments[0] instanceof DD) {
        var dd = arguments[0];
        this.init(dd);
      } else if (typeof arguments[0] === "string") {
        var str = arguments[0];
        DD.call(this, DD.parse(str));
      }
    } else if (arguments.length === 2) {
      var hi = arguments[0],
          lo = arguments[1];
      this.init(hi, lo);
    }
  }
  extend(DD.prototype, {
    le: function le(y) {
      return this._hi < y._hi || this._hi === y._hi && this._lo <= y._lo;
    },
    extractSignificantDigits: function extractSignificantDigits(insertDecimalPoint, magnitude) {
      var y = this.abs();
      var mag = DD.magnitude(y._hi);
      var scale = DD.TEN.pow(mag);
      y = y.divide(scale);

      if (y.gt(DD.TEN)) {
        y = y.divide(DD.TEN);
        mag += 1;
      } else if (y.lt(DD.ONE)) {
        y = y.multiply(DD.TEN);
        mag -= 1;
      }

      var decimalPointPos = mag + 1;
      var buf = new StringBuffer();
      var numDigits = DD.MAX_PRINT_DIGITS - 1;

      for (var i = 0; i <= numDigits; i++) {
        if (insertDecimalPoint && i === decimalPointPos) {
          buf.append('.');
        }

        var digit = Math.trunc(y._hi);

        if (digit < 0) {
          break;
        }

        var rebiasBy10 = false;
        var digitChar = 0;

        if (digit > 9) {
          rebiasBy10 = true;
          digitChar = '9';
        } else {
          digitChar = '0' + digit;
        }

        buf.append(digitChar);
        y = y.subtract(DD.valueOf(digit)).multiply(DD.TEN);
        if (rebiasBy10) y.selfAdd(DD.TEN);
        var continueExtractingDigits = true;
        var remMag = DD.magnitude(y._hi);
        if (remMag < 0 && Math.abs(remMag) >= numDigits - i) continueExtractingDigits = false;
        if (!continueExtractingDigits) break;
      }

      magnitude[0] = mag;
      return buf.toString();
    },
    sqr: function sqr() {
      return this.multiply(this);
    },
    doubleValue: function doubleValue() {
      return this._hi + this._lo;
    },
    subtract: function subtract() {
      if (arguments[0] instanceof DD) {
        var y = arguments[0];
        return this.add(y.negate());
      } else if (typeof arguments[0] === "number") {
        var _y = arguments[0];
        return this.add(-_y);
      }
    },
    equals: function equals() {
      if (arguments.length === 1 && arguments[0] instanceof DD) {
        var y = arguments[0];
        return this._hi === y._hi && this._lo === y._lo;
      }
    },
    isZero: function isZero() {
      return this._hi === 0.0 && this._lo === 0.0;
    },
    selfSubtract: function selfSubtract() {
      if (arguments[0] instanceof DD) {
        var y = arguments[0];
        if (this.isNaN()) return this;
        return this.selfAdd(-y._hi, -y._lo);
      } else if (typeof arguments[0] === "number") {
        var _y2 = arguments[0];
        if (this.isNaN()) return this;
        return this.selfAdd(-_y2, 0.0);
      }
    },
    getSpecialNumberString: function getSpecialNumberString() {
      if (this.isZero()) return "0.0";
      if (this.isNaN()) return "NaN ";
      return null;
    },
    min: function min(x) {
      if (this.le(x)) {
        return this;
      } else {
        return x;
      }
    },
    selfDivide: function selfDivide() {
      if (arguments.length === 1) {
        if (arguments[0] instanceof DD) {
          var y = arguments[0];
          return this.selfDivide(y._hi, y._lo);
        } else if (typeof arguments[0] === "number") {
          var _y3 = arguments[0];
          return this.selfDivide(_y3, 0.0);
        }
      } else if (arguments.length === 2) {
        var yhi = arguments[0],
            ylo = arguments[1];
        var hc = null,
            tc = null,
            hy = null,
            ty = null,
            C = null,
            c = null,
            U = null,
            u = null;
        C = this._hi / yhi;
        c = DD.SPLIT * C;
        hc = c - C;
        u = DD.SPLIT * yhi;
        hc = c - hc;
        tc = C - hc;
        hy = u - yhi;
        U = C * yhi;
        hy = u - hy;
        ty = yhi - hy;
        u = hc * hy - U + hc * ty + tc * hy + tc * ty;
        c = (this._hi - U - u + this._lo - C * ylo) / yhi;
        u = C + c;
        this._hi = u;
        this._lo = C - u + c;
        return this;
      }
    },
    dump: function dump() {
      return "DD<" + this._hi + ", " + this._lo + ">";
    },
    divide: function divide() {
      if (arguments[0] instanceof DD) {
        var y = arguments[0];
        var hc = null,
            tc = null,
            hy = null,
            ty = null,
            C = null,
            c = null,
            U = null,
            u = null;
        C = this._hi / y._hi;
        c = DD.SPLIT * C;
        hc = c - C;
        u = DD.SPLIT * y._hi;
        hc = c - hc;
        tc = C - hc;
        hy = u - y._hi;
        U = C * y._hi;
        hy = u - hy;
        ty = y._hi - hy;
        u = hc * hy - U + hc * ty + tc * hy + tc * ty;
        c = (this._hi - U - u + this._lo - C * y._lo) / y._hi;
        u = C + c;
        var zhi = u;
        var zlo = C - u + c;
        return new DD(zhi, zlo);
      } else if (typeof arguments[0] === "number") {
        var _y4 = arguments[0];
        if (Double.isNaN(_y4)) return DD.createNaN();
        return DD.copy(this).selfDivide(_y4, 0.0);
      }
    },
    ge: function ge(y) {
      return this._hi > y._hi || this._hi === y._hi && this._lo >= y._lo;
    },
    pow: function pow(exp) {
      if (exp === 0.0) return DD.valueOf(1.0);
      var r = new DD(this);
      var s = DD.valueOf(1.0);
      var n = Math.abs(exp);

      if (n > 1) {
        while (n > 0) {
          if (n % 2 === 1) {
            s.selfMultiply(r);
          }

          n /= 2;
          if (n > 0) r = r.sqr();
        }
      } else {
        s = r;
      }

      if (exp < 0) return s.reciprocal();
      return s;
    },
    ceil: function ceil() {
      if (this.isNaN()) return DD.NaN;
      var fhi = Math.ceil(this._hi);
      var flo = 0.0;

      if (fhi === this._hi) {
        flo = Math.ceil(this._lo);
      }

      return new DD(fhi, flo);
    },
    compareTo: function compareTo(o) {
      var other = o;
      if (this._hi < other._hi) return -1;
      if (this._hi > other._hi) return 1;
      if (this._lo < other._lo) return -1;
      if (this._lo > other._lo) return 1;
      return 0;
    },
    rint: function rint() {
      if (this.isNaN()) return this;
      var plus5 = this.add(0.5);
      return plus5.floor();
    },
    setValue: function setValue() {
      if (arguments[0] instanceof DD) {
        var value = arguments[0];
        this.init(value);
        return this;
      } else if (typeof arguments[0] === "number") {
        var _value = arguments[0];
        this.init(_value);
        return this;
      }
    },
    max: function max(x) {
      if (this.ge(x)) {
        return this;
      } else {
        return x;
      }
    },
    sqrt: function sqrt() {
      if (this.isZero()) return DD.valueOf(0.0);

      if (this.isNegative()) {
        return DD.NaN;
      }

      var x = 1.0 / Math.sqrt(this._hi);
      var ax = this._hi * x;
      var axdd = DD.valueOf(ax);
      var diffSq = this.subtract(axdd.sqr());
      var d2 = diffSq._hi * (x * 0.5);
      return axdd.add(d2);
    },
    selfAdd: function selfAdd() {
      if (arguments.length === 1) {
        if (arguments[0] instanceof DD) {
          var y = arguments[0];
          return this.selfAdd(y._hi, y._lo);
        } else if (typeof arguments[0] === "number") {
          var _y5 = arguments[0];
          var H = null,
              h = null,
              S = null,
              s = null,
              e = null,
              f = null;
          S = this._hi + _y5;
          e = S - this._hi;
          s = S - e;
          s = _y5 - e + (this._hi - s);
          f = s + this._lo;
          H = S + f;
          h = f + (S - H);
          this._hi = H + h;
          this._lo = h + (H - this._hi);
          return this;
        }
      } else if (arguments.length === 2) {
        var yhi = arguments[0],
            ylo = arguments[1];
        var H = null,
            h = null,
            T = null,
            t = null,
            S = null,
            s = null,
            e = null,
            f = null;
        S = this._hi + yhi;
        T = this._lo + ylo;
        e = S - this._hi;
        f = T - this._lo;
        s = S - e;
        t = T - f;
        s = yhi - e + (this._hi - s);
        t = ylo - f + (this._lo - t);
        e = s + T;
        H = S + e;
        h = e + (S - H);
        e = t + h;
        var zhi = H + e;
        var zlo = e + (H - zhi);
        this._hi = zhi;
        this._lo = zlo;
        return this;
      }
    },
    selfMultiply: function selfMultiply() {
      if (arguments.length === 1) {
        if (arguments[0] instanceof DD) {
          var y = arguments[0];
          return this.selfMultiply(y._hi, y._lo);
        } else if (typeof arguments[0] === "number") {
          var _y6 = arguments[0];
          return this.selfMultiply(_y6, 0.0);
        }
      } else if (arguments.length === 2) {
        var yhi = arguments[0],
            ylo = arguments[1];
        var hx = null,
            tx = null,
            hy = null,
            ty = null,
            C = null,
            c = null;
        C = DD.SPLIT * this._hi;
        hx = C - this._hi;
        c = DD.SPLIT * yhi;
        hx = C - hx;
        tx = this._hi - hx;
        hy = c - yhi;
        C = this._hi * yhi;
        hy = c - hy;
        ty = yhi - hy;
        c = hx * hy - C + hx * ty + tx * hy + tx * ty + (this._hi * ylo + this._lo * yhi);
        var zhi = C + c;
        hx = C - zhi;
        var zlo = c + hx;
        this._hi = zhi;
        this._lo = zlo;
        return this;
      }
    },
    selfSqr: function selfSqr() {
      return this.selfMultiply(this);
    },
    floor: function floor() {
      if (this.isNaN()) return DD.NaN;
      var fhi = Math.floor(this._hi);
      var flo = 0.0;

      if (fhi === this._hi) {
        flo = Math.floor(this._lo);
      }

      return new DD(fhi, flo);
    },
    negate: function negate() {
      if (this.isNaN()) return this;
      return new DD(-this._hi, -this._lo);
    },
    clone: function clone() {
      try {
        return null;
      } catch (ex) {
        if (ex instanceof CloneNotSupportedException) {
          return null;
        } else throw ex;
      } finally {}
    },
    multiply: function multiply() {
      if (arguments[0] instanceof DD) {
        var y = arguments[0];
        if (y.isNaN()) return DD.createNaN();
        return DD.copy(this).selfMultiply(y);
      } else if (typeof arguments[0] === "number") {
        var _y7 = arguments[0];
        if (Double.isNaN(_y7)) return DD.createNaN();
        return DD.copy(this).selfMultiply(_y7, 0.0);
      }
    },
    isNaN: function isNaN() {
      return Double.isNaN(this._hi);
    },
    intValue: function intValue() {
      return Math.trunc(this._hi);
    },
    toString: function toString() {
      var mag = DD.magnitude(this._hi);
      if (mag >= -3 && mag <= 20) return this.toStandardNotation();
      return this.toSciNotation();
    },
    toStandardNotation: function toStandardNotation() {
      var specialStr = this.getSpecialNumberString();
      if (specialStr !== null) return specialStr;
      var magnitude = new Array(1).fill(null);
      var sigDigits = this.extractSignificantDigits(true, magnitude);
      var decimalPointPos = magnitude[0] + 1;
      var num = sigDigits;

      if (sigDigits.charAt(0) === '.') {
        num = "0" + sigDigits;
      } else if (decimalPointPos < 0) {
        num = "0." + DD.stringOfChar('0', -decimalPointPos) + sigDigits;
      } else if (sigDigits.indexOf('.') === -1) {
        var numZeroes = decimalPointPos - sigDigits.length;
        var zeroes = DD.stringOfChar('0', numZeroes);
        num = sigDigits + zeroes + ".0";
      }

      if (this.isNegative()) return "-" + num;
      return num;
    },
    reciprocal: function reciprocal() {
      var hc = null,
          tc = null,
          hy = null,
          ty = null,
          C = null,
          c = null,
          U = null,
          u = null;
      C = 1.0 / this._hi;
      c = DD.SPLIT * C;
      hc = c - C;
      u = DD.SPLIT * this._hi;
      hc = c - hc;
      tc = C - hc;
      hy = u - this._hi;
      U = C * this._hi;
      hy = u - hy;
      ty = this._hi - hy;
      u = hc * hy - U + hc * ty + tc * hy + tc * ty;
      c = (1.0 - U - u - C * this._lo) / this._hi;
      var zhi = C + c;
      var zlo = C - zhi + c;
      return new DD(zhi, zlo);
    },
    toSciNotation: function toSciNotation() {
      if (this.isZero()) return DD.SCI_NOT_ZERO;
      var specialStr = this.getSpecialNumberString();
      if (specialStr !== null) return specialStr;
      var magnitude = new Array(1).fill(null);
      var digits = this.extractSignificantDigits(false, magnitude);
      var expStr = DD.SCI_NOT_EXPONENT_CHAR + magnitude[0];

      if (digits.charAt(0) === '0') {
        throw new IllegalStateException("Found leading zero: " + digits);
      }

      var trailingDigits = "";
      if (digits.length > 1) trailingDigits = digits.substring(1);
      var digitsWithDecimal = digits.charAt(0) + "." + trailingDigits;
      if (this.isNegative()) return "-" + digitsWithDecimal + expStr;
      return digitsWithDecimal + expStr;
    },
    abs: function abs() {
      if (this.isNaN()) return DD.NaN;
      if (this.isNegative()) return this.negate();
      return new DD(this);
    },
    isPositive: function isPositive() {
      return this._hi > 0.0 || this._hi === 0.0 && this._lo > 0.0;
    },
    lt: function lt(y) {
      return this._hi < y._hi || this._hi === y._hi && this._lo < y._lo;
    },
    add: function add() {
      if (arguments[0] instanceof DD) {
        var y = arguments[0];
        return DD.copy(this).selfAdd(y);
      } else if (typeof arguments[0] === "number") {
        var _y8 = arguments[0];
        return DD.copy(this).selfAdd(_y8);
      }
    },
    init: function init() {
      if (arguments.length === 1) {
        if (typeof arguments[0] === "number") {
          var x = arguments[0];
          this._hi = x;
          this._lo = 0.0;
        } else if (arguments[0] instanceof DD) {
          var dd = arguments[0];
          this._hi = dd._hi;
          this._lo = dd._lo;
        }
      } else if (arguments.length === 2) {
        var hi = arguments[0],
            lo = arguments[1];
        this._hi = hi;
        this._lo = lo;
      }
    },
    gt: function gt(y) {
      return this._hi > y._hi || this._hi === y._hi && this._lo > y._lo;
    },
    isNegative: function isNegative() {
      return this._hi < 0.0 || this._hi === 0.0 && this._lo < 0.0;
    },
    trunc: function trunc() {
      if (this.isNaN()) return DD.NaN;
      if (this.isPositive()) return this.floor();else return this.ceil();
    },
    signum: function signum() {
      if (this._hi > 0) return 1;
      if (this._hi < 0) return -1;
      if (this._lo > 0) return 1;
      if (this._lo < 0) return -1;
      return 0;
    },
    interfaces_: function interfaces_() {
      return [Serializable, Comparable, Clonable];
    },
    getClass: function getClass() {
      return DD;
    }
  });

  DD.sqr = function (x) {
    return DD.valueOf(x).selfMultiply(x);
  };

  DD.valueOf = function () {
    if (typeof arguments[0] === "string") {
      var str = arguments[0];
      return DD.parse(str);
    } else if (typeof arguments[0] === "number") {
      var x = arguments[0];
      return new DD(x);
    }
  };

  DD.sqrt = function (x) {
    return DD.valueOf(x).sqrt();
  };

  DD.parse = function (str) {
    var i = 0;
    var strlen = str.length;

    while (Character.isWhitespace(str.charAt(i))) {
      i++;
    }

    var isNegative = false;

    if (i < strlen) {
      var signCh = str.charAt(i);

      if (signCh === '-' || signCh === '+') {
        i++;
        if (signCh === '-') isNegative = true;
      }
    }

    var val = new DD();
    var numDigits = 0;
    var numBeforeDec = 0;
    var exp = 0;

    while (true) {
      if (i >= strlen) break;
      var ch = str.charAt(i);
      i++;

      if (Character.isDigit(ch)) {
        var d = ch - '0';
        val.selfMultiply(DD.TEN);
        val.selfAdd(d);
        numDigits++;
        continue;
      }

      if (ch === '.') {
        numBeforeDec = numDigits;
        continue;
      }

      if (ch === 'e' || ch === 'E') {
        var expStr = str.substring(i);

        try {
          exp = Integer.parseInt(expStr);
        } catch (ex) {
          if (ex instanceof NumberFormatException) {
            throw new NumberFormatException("Invalid exponent " + expStr + " in string " + str);
          } else throw ex;
        } finally {}

        break;
      }

      throw new NumberFormatException("Unexpected character '" + ch + "' at position " + i + " in string " + str);
    }

    var val2 = val;
    var numDecPlaces = numDigits - numBeforeDec - exp;

    if (numDecPlaces === 0) {
      val2 = val;
    } else if (numDecPlaces > 0) {
      var scale = DD.TEN.pow(numDecPlaces);
      val2 = val.divide(scale);
    } else if (numDecPlaces < 0) {
      var scale = DD.TEN.pow(-numDecPlaces);
      val2 = val.multiply(scale);
    }

    if (isNegative) {
      return val2.negate();
    }

    return val2;
  };

  DD.createNaN = function () {
    return new DD(Double.NaN, Double.NaN);
  };

  DD.copy = function (dd) {
    return new DD(dd);
  };

  DD.magnitude = function (x) {
    var xAbs = Math.abs(x);
    var xLog10 = Math.log(xAbs) / Math.log(10);
    var xMag = Math.trunc(Math.floor(xLog10));
    var xApprox = Math.pow(10, xMag);
    if (xApprox * 10 <= xAbs) xMag += 1;
    return xMag;
  };

  DD.stringOfChar = function (ch, len) {
    var buf = new StringBuffer();

    for (var i = 0; i < len; i++) {
      buf.append(ch);
    }

    return buf.toString();
  };

  DD.PI = new DD(3.141592653589793116e+00, 1.224646799147353207e-16);
  DD.TWO_PI = new DD(6.283185307179586232e+00, 2.449293598294706414e-16);
  DD.PI_2 = new DD(1.570796326794896558e+00, 6.123233995736766036e-17);
  DD.E = new DD(2.718281828459045091e+00, 1.445646891729250158e-16);
  DD.NaN = new DD(Double.NaN, Double.NaN);
  DD.EPS = 1.23259516440783e-32;
  DD.SPLIT = 134217729.0;
  DD.MAX_PRINT_DIGITS = 32;
  DD.TEN = DD.valueOf(10.0);
  DD.ONE = DD.valueOf(1.0);
  DD.SCI_NOT_EXPONENT_CHAR = "E";
  DD.SCI_NOT_ZERO = "0.0E0";

  function CGAlgorithmsDD() {}
  extend(CGAlgorithmsDD.prototype, {
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return CGAlgorithmsDD;
    }
  });

  CGAlgorithmsDD.orientationIndex = function (p1, p2, q) {
    var index = CGAlgorithmsDD.orientationIndexFilter(p1, p2, q);
    if (index <= 1) return index;
    var dx1 = DD.valueOf(p2.x).selfAdd(-p1.x);
    var dy1 = DD.valueOf(p2.y).selfAdd(-p1.y);
    var dx2 = DD.valueOf(q.x).selfAdd(-p2.x);
    var dy2 = DD.valueOf(q.y).selfAdd(-p2.y);
    return dx1.selfMultiply(dy2).selfSubtract(dy1.selfMultiply(dx2)).signum();
  };

  CGAlgorithmsDD.signOfDet2x2 = function () {
    if (arguments[0] instanceof DD) {
      var _x = arguments[0],
          _y = arguments[1],
          _x2 = arguments[2],
          _y2 = arguments[3];

      var det = _x.multiply(_y2).selfSubtract(_y.multiply(_x2));

      return det.signum();
    } else if (typeof arguments[0] === "number") {
      var dx1 = arguments[0],
          dy1 = arguments[1],
          dx2 = arguments[2],
          dy2 = arguments[3];
      var x1 = DD.valueOf(dx1);
      var y1 = DD.valueOf(dy1);
      var x2 = DD.valueOf(dx2);
      var y2 = DD.valueOf(dy2);
      var det = x1.multiply(y2).selfSubtract(y1.multiply(x2));
      return det.signum();
    }
  };

  CGAlgorithmsDD.intersection = function (p1, p2, q1, q2) {
    var denom1 = DD.valueOf(q2.y).selfSubtract(q1.y).selfMultiply(DD.valueOf(p2.x).selfSubtract(p1.x));
    var denom2 = DD.valueOf(q2.x).selfSubtract(q1.x).selfMultiply(DD.valueOf(p2.y).selfSubtract(p1.y));
    var denom = denom1.subtract(denom2);
    var numx1 = DD.valueOf(q2.x).selfSubtract(q1.x).selfMultiply(DD.valueOf(p1.y).selfSubtract(q1.y));
    var numx2 = DD.valueOf(q2.y).selfSubtract(q1.y).selfMultiply(DD.valueOf(p1.x).selfSubtract(q1.x));
    var numx = numx1.subtract(numx2);
    var fracP = numx.selfDivide(denom).doubleValue();
    var x = DD.valueOf(p1.x).selfAdd(DD.valueOf(p2.x).selfSubtract(p1.x).selfMultiply(fracP)).doubleValue();
    var numy1 = DD.valueOf(p2.x).selfSubtract(p1.x).selfMultiply(DD.valueOf(p1.y).selfSubtract(q1.y));
    var numy2 = DD.valueOf(p2.y).selfSubtract(p1.y).selfMultiply(DD.valueOf(p1.x).selfSubtract(q1.x));
    var numy = numy1.subtract(numy2);
    var fracQ = numy.selfDivide(denom).doubleValue();
    var y = DD.valueOf(q1.y).selfAdd(DD.valueOf(q2.y).selfSubtract(q1.y).selfMultiply(fracQ)).doubleValue();
    return new Coordinate(x, y);
  };

  CGAlgorithmsDD.orientationIndexFilter = function (pa, pb, pc) {
    var detsum = null;
    var detleft = (pa.x - pc.x) * (pb.y - pc.y);
    var detright = (pa.y - pc.y) * (pb.x - pc.x);
    var det = detleft - detright;

    if (detleft > 0.0) {
      if (detright <= 0.0) {
        return CGAlgorithmsDD.signum(det);
      } else {
        detsum = detleft + detright;
      }
    } else if (detleft < 0.0) {
      if (detright >= 0.0) {
        return CGAlgorithmsDD.signum(det);
      } else {
        detsum = -detleft - detright;
      }
    } else {
      return CGAlgorithmsDD.signum(det);
    }

    var errbound = CGAlgorithmsDD.DP_SAFE_EPSILON * detsum;

    if (det >= errbound || -det >= errbound) {
      return CGAlgorithmsDD.signum(det);
    }

    return 2;
  };

  CGAlgorithmsDD.signum = function (x) {
    if (x > 0) return 1;
    if (x < 0) return -1;
    return 0;
  };

  CGAlgorithmsDD.DP_SAFE_EPSILON = 1e-15;

  function Orientation() {}
  extend(Orientation.prototype, {
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return Orientation;
    }
  });

  Orientation.index = function (p1, p2, q) {
    return CGAlgorithmsDD.orientationIndex(p1, p2, q);
  };

  Orientation.isCCW = function (ring) {
    var nPts = ring.length - 1;
    if (nPts < 3) throw new IllegalArgumentException("Ring has fewer than 4 points, so orientation cannot be determined");
    var hiPt = ring[0];
    var hiIndex = 0;

    for (var i = 1; i <= nPts; i++) {
      var p = ring[i];

      if (p.y > hiPt.y) {
        hiPt = p;
        hiIndex = i;
      }
    }

    var iPrev = hiIndex;

    do {
      iPrev = iPrev - 1;
      if (iPrev < 0) iPrev = nPts;
    } while (ring[iPrev].equals2D(hiPt) && iPrev !== hiIndex);

    var iNext = hiIndex;

    do {
      iNext = (iNext + 1) % nPts;
    } while (ring[iNext].equals2D(hiPt) && iNext !== hiIndex);

    var prev = ring[iPrev];
    var next = ring[iNext];
    if (prev.equals2D(hiPt) || next.equals2D(hiPt) || prev.equals2D(next)) return false;
    var disc = Orientation.index(prev, hiPt, next);
    var isCCW = null;

    if (disc === 0) {
      isCCW = prev.x > next.x;
    } else {
      isCCW = disc > 0;
    }

    return isCCW;
  };

  Orientation.CLOCKWISE = -1;
  Orientation.RIGHT = Orientation.CLOCKWISE;
  Orientation.COUNTERCLOCKWISE = 1;
  Orientation.LEFT = Orientation.COUNTERCLOCKWISE;
  Orientation.COLLINEAR = 0;
  Orientation.STRAIGHT = Orientation.COLLINEAR;

  function System() {}

  System.arraycopy = function (src, srcPos, dest, destPos, len) {
    var c = 0;

    for (var i = srcPos; i < srcPos + len; i++) {
      dest[destPos + c] = src[i];
      c++;
    }
  };

  System.getProperty = function (name) {
    return {
      'line.separator': '\n'
    }[name];
  };

  function HCoordinate() {
    this.x = null;
    this.y = null;
    this.w = null;

    if (arguments.length === 0) {
      this.x = 0.0;
      this.y = 0.0;
      this.w = 1.0;
    } else if (arguments.length === 1) {
      var p = arguments[0];
      this.x = p.x;
      this.y = p.y;
      this.w = 1.0;
    } else if (arguments.length === 2) {
      if (typeof arguments[0] === "number" && typeof arguments[1] === "number") {
        var _x = arguments[0],
            _y = arguments[1];
        this.x = _x;
        this.y = _y;
        this.w = 1.0;
      } else if (arguments[0] instanceof HCoordinate && arguments[1] instanceof HCoordinate) {
        var p1 = arguments[0],
            p2 = arguments[1];
        this.x = p1.y * p2.w - p2.y * p1.w;
        this.y = p2.x * p1.w - p1.x * p2.w;
        this.w = p1.x * p2.y - p2.x * p1.y;
      } else if (arguments[0] instanceof Coordinate && arguments[1] instanceof Coordinate) {
        var _p = arguments[0],
            _p2 = arguments[1];
        this.x = _p.y - _p2.y;
        this.y = _p2.x - _p.x;
        this.w = _p.x * _p2.y - _p2.x * _p.y;
      }
    } else if (arguments.length === 3) {
      var _x2 = arguments[0],
          _y2 = arguments[1],
          _w = arguments[2];
      this.x = _x2;
      this.y = _y2;
      this.w = _w;
    } else if (arguments.length === 4) {
      var _p3 = arguments[0],
          _p4 = arguments[1],
          q1 = arguments[2],
          q2 = arguments[3];
      var px = _p3.y - _p4.y;
      var py = _p4.x - _p3.x;
      var pw = _p3.x * _p4.y - _p4.x * _p3.y;
      var qx = q1.y - q2.y;
      var qy = q2.x - q1.x;
      var qw = q1.x * q2.y - q2.x * q1.y;
      this.x = py * qw - qy * pw;
      this.y = qx * pw - px * qw;
      this.w = px * qy - qx * py;
    }
  }
  extend(HCoordinate.prototype, {
    getY: function getY() {
      var a = this.y / this.w;

      if (Double.isNaN(a) || Double.isInfinite(a)) {
        throw new NotRepresentableException();
      }

      return a;
    },
    getX: function getX() {
      var a = this.x / this.w;

      if (Double.isNaN(a) || Double.isInfinite(a)) {
        throw new NotRepresentableException();
      }

      return a;
    },
    getCoordinate: function getCoordinate() {
      var p = new Coordinate();
      p.x = this.getX();
      p.y = this.getY();
      return p;
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return HCoordinate;
    }
  });

  HCoordinate.intersection = function (p1, p2, q1, q2) {
    var px = p1.y - p2.y;
    var py = p2.x - p1.x;
    var pw = p1.x * p2.y - p2.x * p1.y;
    var qx = q1.y - q2.y;
    var qy = q2.x - q1.x;
    var qw = q1.x * q2.y - q2.x * q1.y;
    var x = py * qw - qy * pw;
    var y = qx * pw - px * qw;
    var w = px * qy - qx * py;
    var xInt = x / w;
    var yInt = y / w;

    if (Double.isNaN(xInt) || Double.isInfinite(xInt) || Double.isNaN(yInt) || Double.isInfinite(yInt)) {
      throw new NotRepresentableException();
    }

    return new Coordinate(xInt, yInt);
  };

  function MathUtil() {}
  extend(MathUtil.prototype, {
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return MathUtil;
    }
  });

  MathUtil.log10 = function (x) {
    var ln = Math.log(x);
    if (Double.isInfinite(ln)) return ln;
    if (Double.isNaN(ln)) return ln;
    return ln / MathUtil.LOG_10;
  };

  MathUtil.min = function (v1, v2, v3, v4) {
    var min = v1;
    if (v2 < min) min = v2;
    if (v3 < min) min = v3;
    if (v4 < min) min = v4;
    return min;
  };

  MathUtil.clamp = function () {
    if (typeof arguments[2] === "number" && typeof arguments[0] === "number" && typeof arguments[1] === "number") {
      var x = arguments[0],
          min = arguments[1],
          max = arguments[2];
      if (x < min) return min;
      if (x > max) return max;
      return x;
    } else if (Number.isInteger(arguments[2]) && Number.isInteger(arguments[0]) && Number.isInteger(arguments[1])) {
      var _x = arguments[0],
          _min = arguments[1],
          _max = arguments[2];
      if (_x < _min) return _min;
      if (_x > _max) return _max;
      return _x;
    }
  };

  MathUtil.wrap = function (index, max) {
    if (index < 0) {
      return max - -index % max;
    }

    return index % max;
  };

  MathUtil.max = function () {
    if (arguments.length === 3) {
      var v1 = arguments[0],
          v2 = arguments[1],
          v3 = arguments[2];
      var max = v1;
      if (v2 > max) max = v2;
      if (v3 > max) max = v3;
      return max;
    } else if (arguments.length === 4) {
      var _v = arguments[0],
          _v2 = arguments[1],
          _v3 = arguments[2],
          v4 = arguments[3];
      var max = _v;
      if (_v2 > max) max = _v2;
      if (_v3 > max) max = _v3;
      if (v4 > max) max = v4;
      return max;
    }
  };

  MathUtil.average = function (x1, x2) {
    return (x1 + x2) / 2.0;
  };

  MathUtil.LOG_10 = Math.log(10);

  function Distance() {}
  extend(Distance.prototype, {
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return Distance;
    }
  });

  Distance.segmentToSegment = function (A, B, C, D) {
    if (A.equals(B)) return Distance.pointToSegment(A, C, D);
    if (C.equals(D)) return Distance.pointToSegment(D, A, B);
    var noIntersection = false;

    if (!Envelope.intersects(A, B, C, D)) {
      noIntersection = true;
    } else {
      var denom = (B.x - A.x) * (D.y - C.y) - (B.y - A.y) * (D.x - C.x);

      if (denom === 0) {
        noIntersection = true;
      } else {
        var r_num = (A.y - C.y) * (D.x - C.x) - (A.x - C.x) * (D.y - C.y);
        var s_num = (A.y - C.y) * (B.x - A.x) - (A.x - C.x) * (B.y - A.y);
        var s = s_num / denom;
        var r = r_num / denom;

        if (r < 0 || r > 1 || s < 0 || s > 1) {
          noIntersection = true;
        }
      }
    }

    if (noIntersection) {
      return MathUtil.min(Distance.pointToSegment(A, C, D), Distance.pointToSegment(B, C, D), Distance.pointToSegment(C, A, B), Distance.pointToSegment(D, A, B));
    }

    return 0.0;
  };

  Distance.pointToSegment = function (p, A, B) {
    if (A.x === B.x && A.y === B.y) return p.distance(A);
    var len2 = (B.x - A.x) * (B.x - A.x) + (B.y - A.y) * (B.y - A.y);
    var r = ((p.x - A.x) * (B.x - A.x) + (p.y - A.y) * (B.y - A.y)) / len2;
    if (r <= 0.0) return p.distance(A);
    if (r >= 1.0) return p.distance(B);
    var s = ((A.y - p.y) * (B.x - A.x) - (A.x - p.x) * (B.y - A.y)) / len2;
    return Math.abs(s) * Math.sqrt(len2);
  };

  Distance.pointToLinePerpendicular = function (p, A, B) {
    var len2 = (B.x - A.x) * (B.x - A.x) + (B.y - A.y) * (B.y - A.y);
    var s = ((A.y - p.y) * (B.x - A.x) - (A.x - p.x) * (B.y - A.y)) / len2;
    return Math.abs(s) * Math.sqrt(len2);
  };

  Distance.pointToSegmentString = function (p, line) {
    if (line.length === 0) throw new IllegalArgumentException("Line array must contain at least one vertex");
    var minDistance = p.distance(line[0]);

    for (var i = 0; i < line.length - 1; i++) {
      var dist = Distance.pointToSegment(p, line[i], line[i + 1]);

      if (dist < minDistance) {
        minDistance = dist;
      }
    }

    return minDistance;
  };

  function CoordinateSequence() {}
  extend(CoordinateSequence.prototype, {
    setOrdinate: function setOrdinate(index, ordinateIndex, value) {},
    size: function size() {},
    getOrdinate: function getOrdinate(index, ordinateIndex) {},
    getCoordinate: function getCoordinate() {
    },
    getCoordinateCopy: function getCoordinateCopy(i) {},
    getDimension: function getDimension() {},
    getX: function getX(index) {},
    expandEnvelope: function expandEnvelope(env) {},
    copy: function copy() {},
    getY: function getY(index) {},
    toCoordinateArray: function toCoordinateArray() {},
    interfaces_: function interfaces_() {
      return [Clonable];
    },
    getClass: function getClass() {
      return CoordinateSequence;
    }
  });
  CoordinateSequence.X = 0;
  CoordinateSequence.Y = 1;
  CoordinateSequence.Z = 2;
  CoordinateSequence.M = 3;

  function CoordinateSequenceFactory() {}
  extend(CoordinateSequenceFactory.prototype, {
    create: function create() {
      if (arguments.length === 1) {
        if (arguments[0] instanceof Array) ; else if (hasInterface(arguments[0], CoordinateSequence)) ;
      }
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return CoordinateSequenceFactory;
    }
  });

  function GeometryComponentFilter() {}
  extend(GeometryComponentFilter.prototype, {
    filter: function filter(geom) {},
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return GeometryComponentFilter;
    }
  });

  function Geometry() {
    this._envelope = null;
    this._factory = null;
    this._SRID = null;
    this._userData = null;
    var factory = arguments[0];
    this._factory = factory;
    this._SRID = factory.getSRID();
  }
  extend(Geometry.prototype, {
    isGeometryCollection: function isGeometryCollection() {
      return this.getTypeCode() === Geometry.TYPECODE_GEOMETRYCOLLECTION;
    },
    getFactory: function getFactory() {
      return this._factory;
    },
    getGeometryN: function getGeometryN(n) {
      return this;
    },
    getArea: function getArea() {
      return 0.0;
    },
    isRectangle: function isRectangle() {
      return false;
    },
    equals: function equals() {
      if (arguments[0] instanceof Geometry) {
        var _g = arguments[0];
        if (_g === null) return false;
        return this.equalsTopo(_g);
      } else if (arguments[0] instanceof Object) {
        var o = arguments[0];
        if (!(o instanceof Geometry)) return false;
        var g = o;
        return this.equalsExact(g);
      }
    },
    equalsExact: function equalsExact(other) {
      return this === other || this.equalsExact(other, 0);
    },
    geometryChanged: function geometryChanged() {
      this.apply(Geometry.geometryChangedFilter);
    },
    geometryChangedAction: function geometryChangedAction() {
      this._envelope = null;
    },
    equalsNorm: function equalsNorm(g) {
      if (g === null) return false;
      return this.norm().equalsExact(g.norm());
    },
    getLength: function getLength() {
      return 0.0;
    },
    getNumGeometries: function getNumGeometries() {
      return 1;
    },
    compareTo: function compareTo() {
      if (arguments.length === 1) {
        var o = arguments[0];
        var other = o;

        if (this.getTypeCode() !== other.getTypeCode()) {
          return this.getTypeCode() - other.getTypeCode();
        }

        if (this.isEmpty() && other.isEmpty()) {
          return 0;
        }

        if (this.isEmpty()) {
          return -1;
        }

        if (other.isEmpty()) {
          return 1;
        }

        return this.compareToSameClass(o);
      } else if (arguments.length === 2) {
        var _o = arguments[0],
            comp = arguments[1];
        var other = _o;

        if (this.getTypeCode() !== other.getTypeCode()) {
          return this.getTypeCode() - other.getTypeCode();
        }

        if (this.isEmpty() && other.isEmpty()) {
          return 0;
        }

        if (this.isEmpty()) {
          return -1;
        }

        if (other.isEmpty()) {
          return 1;
        }

        return this.compareToSameClass(_o, comp);
      }
    },
    getUserData: function getUserData() {
      return this._userData;
    },
    getSRID: function getSRID() {
      return this._SRID;
    },
    getEnvelope: function getEnvelope() {
      return this.getFactory().toGeometry(this.getEnvelopeInternal());
    },
    checkNotGeometryCollection: function checkNotGeometryCollection(g) {
      if (g.getTypeCode() === Geometry.TYPECODE_GEOMETRYCOLLECTION) {
        throw new IllegalArgumentException("This method does not support GeometryCollection arguments");
      }
    },
    equal: function equal(a, b, tolerance) {
      if (tolerance === 0) {
        return a.equals(b);
      }

      return a.distance(b) <= tolerance;
    },
    norm: function norm() {
      var copy = this.copy();
      copy.normalize();
      return copy;
    },
    getPrecisionModel: function getPrecisionModel() {
      return this._factory.getPrecisionModel();
    },
    getEnvelopeInternal: function getEnvelopeInternal() {
      if (this._envelope === null) {
        this._envelope = this.computeEnvelopeInternal();
      }

      return new Envelope(this._envelope);
    },
    setSRID: function setSRID(SRID) {
      this._SRID = SRID;
    },
    setUserData: function setUserData(userData) {
      this._userData = userData;
    },
    compare: function compare(a, b) {
      var i = a.iterator();
      var j = b.iterator();

      while (i.hasNext() && j.hasNext()) {
        var aElement = i.next();
        var bElement = j.next();
        var comparison = aElement.compareTo(bElement);

        if (comparison !== 0) {
          return comparison;
        }
      }

      if (i.hasNext()) {
        return 1;
      }

      if (j.hasNext()) {
        return -1;
      }

      return 0;
    },
    hashCode: function hashCode() {
      return this.getEnvelopeInternal().hashCode();
    },
    isGeometryCollectionOrDerived: function isGeometryCollectionOrDerived() {
      if (this.getTypeCode() === Geometry.TYPECODE_GEOMETRYCOLLECTION || this.getTypeCode() === Geometry.TYPECODE_MULTIPOINT || this.getTypeCode() === Geometry.TYPECODE_MULTILINESTRING || this.getTypeCode() === Geometry.TYPECODE_MULTIPOLYGON) {
        return true;
      }

      return false;
    },
    interfaces_: function interfaces_() {
      return [Clonable, Comparable, Serializable];
    },
    getClass: function getClass() {
      return Geometry;
    }
  });

  Geometry.hasNonEmptyElements = function (geometries) {
    for (var i = 0; i < geometries.length; i++) {
      if (!geometries[i].isEmpty()) {
        return true;
      }
    }

    return false;
  };

  Geometry.hasNullElements = function (array) {
    for (var i = 0; i < array.length; i++) {
      if (array[i] === null) {
        return true;
      }
    }

    return false;
  };

  Geometry.serialVersionUID = 8763622679187376702;
  Geometry.TYPECODE_POINT = 0;
  Geometry.TYPECODE_MULTIPOINT = 1;
  Geometry.TYPECODE_LINESTRING = 2;
  Geometry.TYPECODE_LINEARRING = 3;
  Geometry.TYPECODE_MULTILINESTRING = 4;
  Geometry.TYPECODE_POLYGON = 5;
  Geometry.TYPECODE_MULTIPOLYGON = 6;
  Geometry.TYPECODE_GEOMETRYCOLLECTION = 7;
  Geometry.TYPENAME_POINT = "Point";
  Geometry.TYPENAME_MULTIPOINT = "MultiPoint";
  Geometry.TYPENAME_LINESTRING = "LineString";
  Geometry.TYPENAME_LINEARRING = "LinearRing";
  Geometry.TYPENAME_MULTILINESTRING = "MultiLineString";
  Geometry.TYPENAME_POLYGON = "Polygon";
  Geometry.TYPENAME_MULTIPOLYGON = "MultiPolygon";
  Geometry.TYPENAME_GEOMETRYCOLLECTION = "GeometryCollection";
  Geometry.geometryChangedFilter = {
    interfaces_: function interfaces_() {
      return [GeometryComponentFilter];
    },
    filter: function filter(geom) {
      geom.geometryChangedAction();
    }
  };

  function CoordinateFilter() {}
  extend(CoordinateFilter.prototype, {
    filter: function filter(coord) {},
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return CoordinateFilter;
    }
  });

  function BoundaryNodeRule() {}
  extend(BoundaryNodeRule.prototype, {
    isInBoundary: function isInBoundary(boundaryCount) {},
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return BoundaryNodeRule;
    }
  });

  function Mod2BoundaryNodeRule() {}

  extend(Mod2BoundaryNodeRule.prototype, {
    isInBoundary: function isInBoundary(boundaryCount) {
      return boundaryCount % 2 === 1;
    },
    interfaces_: function interfaces_() {
      return [BoundaryNodeRule];
    },
    getClass: function getClass() {
      return Mod2BoundaryNodeRule;
    }
  });

  function EndPointBoundaryNodeRule() {}

  extend(EndPointBoundaryNodeRule.prototype, {
    isInBoundary: function isInBoundary(boundaryCount) {
      return boundaryCount > 0;
    },
    interfaces_: function interfaces_() {
      return [BoundaryNodeRule];
    },
    getClass: function getClass() {
      return EndPointBoundaryNodeRule;
    }
  });

  function MultiValentEndPointBoundaryNodeRule() {}

  extend(MultiValentEndPointBoundaryNodeRule.prototype, {
    isInBoundary: function isInBoundary(boundaryCount) {
      return boundaryCount > 1;
    },
    interfaces_: function interfaces_() {
      return [BoundaryNodeRule];
    },
    getClass: function getClass() {
      return MultiValentEndPointBoundaryNodeRule;
    }
  });

  function MonoValentEndPointBoundaryNodeRule() {}

  extend(MonoValentEndPointBoundaryNodeRule.prototype, {
    isInBoundary: function isInBoundary(boundaryCount) {
      return boundaryCount === 1;
    },
    interfaces_: function interfaces_() {
      return [BoundaryNodeRule];
    },
    getClass: function getClass() {
      return MonoValentEndPointBoundaryNodeRule;
    }
  });
  BoundaryNodeRule.Mod2BoundaryNodeRule = Mod2BoundaryNodeRule;
  BoundaryNodeRule.EndPointBoundaryNodeRule = EndPointBoundaryNodeRule;
  BoundaryNodeRule.MultiValentEndPointBoundaryNodeRule = MultiValentEndPointBoundaryNodeRule;
  BoundaryNodeRule.MonoValentEndPointBoundaryNodeRule = MonoValentEndPointBoundaryNodeRule;
  BoundaryNodeRule.MOD2_BOUNDARY_RULE = new Mod2BoundaryNodeRule();
  BoundaryNodeRule.ENDPOINT_BOUNDARY_RULE = new EndPointBoundaryNodeRule();
  BoundaryNodeRule.MULTIVALENT_ENDPOINT_BOUNDARY_RULE = new MultiValentEndPointBoundaryNodeRule();
  BoundaryNodeRule.MONOVALENT_ENDPOINT_BOUNDARY_RULE = new MonoValentEndPointBoundaryNodeRule();
  BoundaryNodeRule.OGC_SFS_BOUNDARY_RULE = BoundaryNodeRule.MOD2_BOUNDARY_RULE;

  function CoordinateArrays() {}
  extend(CoordinateArrays.prototype, {
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return CoordinateArrays;
    }
  });

  CoordinateArrays.isRing = function (pts) {
    if (pts.length < 4) return false;
    if (!pts[0].equals2D(pts[pts.length - 1])) return false;
    return true;
  };

  CoordinateArrays.ptNotInList = function (testPts, pts) {
    for (var i = 0; i < testPts.length; i++) {
      var testPt = testPts[i];
      if (CoordinateArrays.indexOf(testPt, pts) < 0) return testPt;
    }

    return null;
  };

  CoordinateArrays.scroll = function (coordinates, firstCoordinate) {
    var i = CoordinateArrays.indexOf(firstCoordinate, coordinates);
    if (i < 0) return null;
    var newCoordinates = new Array(coordinates.length).fill(null);
    System.arraycopy(coordinates, i, newCoordinates, 0, coordinates.length - i);
    System.arraycopy(coordinates, 0, newCoordinates, coordinates.length - i, i);
    System.arraycopy(newCoordinates, 0, coordinates, 0, coordinates.length);
  };

  CoordinateArrays.equals = function () {
    if (arguments.length === 2) {
      var coord1 = arguments[0],
          coord2 = arguments[1];
      if (coord1 === coord2) return true;
      if (coord1 === null || coord2 === null) return false;
      if (coord1.length !== coord2.length) return false;

      for (var i = 0; i < coord1.length; i++) {
        if (!coord1[i].equals(coord2[i])) return false;
      }

      return true;
    } else if (arguments.length === 3) {
      var _coord = arguments[0],
          _coord2 = arguments[1],
          coordinateComparator = arguments[2];
      if (_coord === _coord2) return true;
      if (_coord === null || _coord2 === null) return false;
      if (_coord.length !== _coord2.length) return false;

      for (var i = 0; i < _coord.length; i++) {
        if (coordinateComparator.compare(_coord[i], _coord2[i]) !== 0) return false;
      }

      return true;
    }
  };

  CoordinateArrays.intersection = function (coordinates, env) {
    var coordList = new CoordinateList();

    for (var i = 0; i < coordinates.length; i++) {
      if (env.intersects(coordinates[i])) coordList.add(coordinates[i], true);
    }

    return coordList.toCoordinateArray();
  };

  CoordinateArrays.hasRepeatedPoints = function (coord) {
    for (var i = 1; i < coord.length; i++) {
      if (coord[i - 1].equals(coord[i])) {
        return true;
      }
    }

    return false;
  };

  CoordinateArrays.removeRepeatedPoints = function (coord) {
    if (!CoordinateArrays.hasRepeatedPoints(coord)) return coord;
    var coordList = new CoordinateList(coord, false);
    return coordList.toCoordinateArray();
  };

  CoordinateArrays.reverse = function (coord) {
    var last = coord.length - 1;
    var mid = Math.trunc(last / 2);

    for (var i = 0; i <= mid; i++) {
      var tmp = coord[i];
      coord[i] = coord[last - i];
      coord[last - i] = tmp;
    }
  };

  CoordinateArrays.removeNull = function (coord) {
    var nonNull = 0;

    for (var i = 0; i < coord.length; i++) {
      if (coord[i] !== null) nonNull++;
    }

    var newCoord = new Array(nonNull).fill(null);
    if (nonNull === 0) return newCoord;
    var j = 0;

    for (var i = 0; i < coord.length; i++) {
      if (coord[i] !== null) newCoord[j++] = coord[i];
    }

    return newCoord;
  };

  CoordinateArrays.copyDeep = function () {
    if (arguments.length === 1) {
      var coordinates = arguments[0];
      var copy = new Array(coordinates.length).fill(null);

      for (var i = 0; i < coordinates.length; i++) {
        copy[i] = new Coordinate(coordinates[i]);
      }

      return copy;
    } else if (arguments.length === 5) {
      var src = arguments[0],
          srcStart = arguments[1],
          dest = arguments[2],
          destStart = arguments[3],
          length = arguments[4];

      for (var i = 0; i < length; i++) {
        dest[destStart + i] = new Coordinate(src[srcStart + i]);
      }
    }
  };

  CoordinateArrays.isEqualReversed = function (pts1, pts2) {
    for (var i = 0; i < pts1.length; i++) {
      var p1 = pts1[i];
      var p2 = pts2[pts1.length - i - 1];
      if (p1.compareTo(p2) !== 0) return false;
    }

    return true;
  };

  CoordinateArrays.envelope = function (coordinates) {
    var env = new Envelope();

    for (var i = 0; i < coordinates.length; i++) {
      env.expandToInclude(coordinates[i]);
    }

    return env;
  };

  CoordinateArrays.toCoordinateArray = function (coordList) {
    return coordList.toArray(CoordinateArrays.coordArrayType);
  };

  CoordinateArrays.atLeastNCoordinatesOrNothing = function (n, c) {
    return c.length >= n ? c : [];
  };

  CoordinateArrays.indexOf = function (coordinate, coordinates) {
    for (var i = 0; i < coordinates.length; i++) {
      if (coordinate.equals(coordinates[i])) {
        return i;
      }
    }

    return -1;
  };

  CoordinateArrays.increasingDirection = function (pts) {
    for (var i = 0; i < Math.trunc(pts.length / 2); i++) {
      var j = pts.length - 1 - i;
      var comp = pts[i].compareTo(pts[j]);
      if (comp !== 0) return comp;
    }

    return 1;
  };

  CoordinateArrays.compare = function (pts1, pts2) {
    var i = 0;

    while (i < pts1.length && i < pts2.length) {
      var compare = pts1[i].compareTo(pts2[i]);
      if (compare !== 0) return compare;
      i++;
    }

    if (i < pts2.length) return -1;
    if (i < pts1.length) return 1;
    return 0;
  };

  CoordinateArrays.minCoordinate = function (coordinates) {
    var minCoord = null;

    for (var i = 0; i < coordinates.length; i++) {
      if (minCoord === null || minCoord.compareTo(coordinates[i]) > 0) {
        minCoord = coordinates[i];
      }
    }

    return minCoord;
  };

  CoordinateArrays.extract = function (pts, start, end) {
    start = MathUtil.clamp(start, 0, pts.length);
    end = MathUtil.clamp(end, -1, pts.length);
    var npts = end - start + 1;
    if (end < 0) npts = 0;
    if (start >= pts.length) npts = 0;
    if (end < start) npts = 0;
    var extractPts = new Array(npts).fill(null);
    if (npts === 0) return extractPts;
    var iPts = 0;

    for (var i = start; i <= end; i++) {
      extractPts[iPts++] = pts[i];
    }

    return extractPts;
  };

  function ForwardComparator() {}

  extend(ForwardComparator.prototype, {
    compare: function compare(o1, o2) {
      var pts1 = o1;
      var pts2 = o2;
      return CoordinateArrays.compare(pts1, pts2);
    },
    interfaces_: function interfaces_() {
      return [Comparator];
    },
    getClass: function getClass() {
      return ForwardComparator;
    }
  });

  function BidirectionalComparator() {}

  extend(BidirectionalComparator.prototype, {
    compare: function compare(o1, o2) {
      var pts1 = o1;
      var pts2 = o2;
      if (pts1.length < pts2.length) return -1;
      if (pts1.length > pts2.length) return 1;
      if (pts1.length === 0) return 0;
      var forwardComp = CoordinateArrays.compare(pts1, pts2);
      var isEqualRev = CoordinateArrays.isEqualReversed(pts1, pts2);
      if (isEqualRev) return 0;
      return forwardComp;
    },
    OLDcompare: function OLDcompare(o1, o2) {
      var pts1 = o1;
      var pts2 = o2;
      if (pts1.length < pts2.length) return -1;
      if (pts1.length > pts2.length) return 1;
      if (pts1.length === 0) return 0;
      var dir1 = CoordinateArrays.increasingDirection(pts1);
      var dir2 = CoordinateArrays.increasingDirection(pts2);
      var i1 = dir1 > 0 ? 0 : pts1.length - 1;
      var i2 = dir2 > 0 ? 0 : pts1.length - 1;

      for (var i = 0; i < pts1.length; i++) {
        var comparePt = pts1[i1].compareTo(pts2[i2]);
        if (comparePt !== 0) return comparePt;
        i1 += dir1;
        i2 += dir2;
      }

      return 0;
    },
    interfaces_: function interfaces_() {
      return [Comparator];
    },
    getClass: function getClass() {
      return BidirectionalComparator;
    }
  });
  CoordinateArrays.ForwardComparator = ForwardComparator;
  CoordinateArrays.BidirectionalComparator = BidirectionalComparator;
  CoordinateArrays.coordArrayType = new Array(0).fill(null);

  /**
   * @see http://download.oracle.com/javase/6/docs/api/java/util/Map.html
   *
   * @constructor
   * @private
   */
  function Map$1() {}
  /**
   * Returns the value to which the specified key is mapped, or null if this map
   * contains no mapping for the key.
   * @param {Object} key
   * @return {Object}
   */

  Map$1.prototype.get = function () {};
  /**
   * Associates the specified value with the specified key in this map (optional
   * operation).
   * @param {Object} key
   * @param {Object} value
   * @return {Object}
   */


  Map$1.prototype.put = function () {};
  /**
   * Returns the number of key-value mappings in this map.
   * @return {number}
   */


  Map$1.prototype.size = function () {};
  /**
   * Returns a Collection view of the values contained in this map.
   * @return {javascript.util.Collection}
   */


  Map$1.prototype.values = function () {};
  /**
   * Returns a {@link Set} view of the mappings contained in this map.
   * The set is backed by the map, so changes to the map are
   * reflected in the set, and vice-versa.  If the map is modified
   * while an iteration over the set is in progress (except through
   * the iterator's own <tt>remove</tt> operation, or through the
   * <tt>setValue</tt> operation on a map entry returned by the
   * iterator) the results of the iteration are undefined.  The set
   * supports element removal, which removes the corresponding
   * mapping from the map, via the <tt>Iterator.remove</tt>,
   * <tt>Set.remove</tt>, <tt>removeAll</tt>, <tt>retainAll</tt> and
   * <tt>clear</tt> operations.  It does not support the
   * <tt>add</tt> or <tt>addAll</tt> operations.
   *
   * @return {Set} a set view of the mappings contained in this map
   */


  Map$1.prototype.entrySet = function () {};

  /**
   * @see http://download.oracle.com/javase/6/docs/api/java/util/SortedMap.html
   *
   * @extends {Map}
   * @constructor
   * @private
   */

  function SortedMap() {}
  SortedMap.prototype = new Map$1();

  /**
   * @see http://download.oracle.com/javase/6/docs/api/java/util/Set.html
   *
   * @extends {Collection}
   * @constructor
   * @private
   */

  function Set() {}
  Set.prototype = new Collection();
  /**
   * Returns true if this set contains the specified element. More formally,
   * returns true if and only if this set contains an element e such that (o==null ?
   * e==null : o.equals(e)).
   * @param {Object} e
   * @return {boolean}
   */

  Set.prototype.contains = function () {};

  /**
   * @see http://docs.oracle.com/javase/6/docs/api/java/util/HashSet.html
   *
   * @extends {javascript.util.Set}
   * @constructor
   * @private
   */

  function HashSet() {
    /**
     * @type {Array}
     * @private
    */
    this.array_ = [];

    if (arguments[0] instanceof Collection) {
      this.addAll(arguments[0]);
    }
  }
  HashSet.prototype = new Set();
  /**
   * @override
   */

  HashSet.prototype.contains = function (o) {
    for (var i = 0, len = this.array_.length; i < len; i++) {
      var e = this.array_[i];

      if (e === o) {
        return true;
      }
    }

    return false;
  };
  /**
   * @override
   */


  HashSet.prototype.add = function (o) {
    if (this.contains(o)) {
      return false;
    }

    this.array_.push(o);
    return true;
  };
  /**
   * @override
   */


  HashSet.prototype.addAll = function (c) {
    for (var i = c.iterator(); i.hasNext();) {
      this.add(i.next());
    }

    return true;
  };
  /**
   * @override
   */


  HashSet.prototype.remove = function (o) {
    throw new javascript.util.OperationNotSupported();
  };
  /**
   * @override
   */


  HashSet.prototype.size = function () {
    return this.array_.length;
  };
  /**
   * @override
   */


  HashSet.prototype.isEmpty = function () {
    return this.array_.length === 0;
  };
  /**
   * @override
   */


  HashSet.prototype.toArray = function () {
    var array = [];

    for (var i = 0, len = this.array_.length; i < len; i++) {
      array.push(this.array_[i]);
    }

    return array;
  };
  /**
   * @override
   */


  HashSet.prototype.iterator = function () {
    return new Iterator_$1(this);
  };
  /**
   * @extends {Iterator}
   * @param {HashSet} hashSet
   * @constructor
   * @private
   */


  var Iterator_$1 = function Iterator_(hashSet) {
    /**
     * @type {HashSet}
     * @private
     */
    this.hashSet_ = hashSet;
    /**
     * @type {number}
     * @private
     */

    this.position_ = 0;
  };
  /**
   * @override
   */


  Iterator_$1.prototype.next = function () {
    if (this.position_ === this.hashSet_.size()) {
      throw new NoSuchElementException();
    }

    return this.hashSet_.array_[this.position_++];
  };
  /**
   * @override
   */


  Iterator_$1.prototype.hasNext = function () {
    if (this.position_ < this.hashSet_.size()) {
      return true;
    } else {
      return false;
    }
  };
  /**
   * @override
   */


  Iterator_$1.prototype.remove = function () {
    throw new OperationNotSupported();
  };

  var BLACK = 0;
  var RED = 1;

  function colorOf(p) {
    return p == null ? BLACK : p.color;
  }

  function parentOf(p) {
    return p == null ? null : p.parent;
  }

  function setColor(p, c) {
    if (p !== null) p.color = c;
  }

  function leftOf(p) {
    return p == null ? null : p.left;
  }

  function rightOf(p) {
    return p == null ? null : p.right;
  }
  /**
   * @see http://download.oracle.com/javase/6/docs/api/java/util/TreeMap.html
   *
   * @extends {SortedMap}
   * @constructor
   * @private
   */


  function TreeMap() {
    /**
     * @type {Object}
     * @private
     */
    this.root_ = null;
    /**
     * @type {number}
     * @private
    */

    this.size_ = 0;
  }
  TreeMap.prototype = new SortedMap();
  /**
   * @override
   */

  TreeMap.prototype.get = function (key) {
    var p = this.root_;

    while (p !== null) {
      var cmp = key['compareTo'](p.key);

      if (cmp < 0) {
        p = p.left;
      } else if (cmp > 0) {
        p = p.right;
      } else {
        return p.value;
      }
    }

    return null;
  };
  /**
   * @override
   */


  TreeMap.prototype.put = function (key, value) {
    if (this.root_ === null) {
      this.root_ = {
        key: key,
        value: value,
        left: null,
        right: null,
        parent: null,
        color: BLACK,
        getValue: function getValue() {
          return this.value;
        },
        getKey: function getKey() {
          return this.key;
        }
      };
      this.size_ = 1;
      return null;
    }

    var t = this.root_,
        parent,
        cmp;

    do {
      parent = t;
      cmp = key['compareTo'](t.key);

      if (cmp < 0) {
        t = t.left;
      } else if (cmp > 0) {
        t = t.right;
      } else {
        var oldValue = t.value;
        t.value = value;
        return oldValue;
      }
    } while (t !== null);

    var e = {
      key: key,
      left: null,
      right: null,
      value: value,
      parent: parent,
      color: BLACK,
      getValue: function getValue() {
        return this.value;
      },
      getKey: function getKey() {
        return this.key;
      }
    };

    if (cmp < 0) {
      parent.left = e;
    } else {
      parent.right = e;
    }

    this.fixAfterInsertion(e);
    this.size_++;
    return null;
  };
  /**
   * @param {Object} x
   */


  TreeMap.prototype.fixAfterInsertion = function (x) {
    x.color = RED;

    while (x != null && x != this.root_ && x.parent.color == RED) {
      if (parentOf(x) == leftOf(parentOf(parentOf(x)))) {
        var y = rightOf(parentOf(parentOf(x)));

        if (colorOf(y) == RED) {
          setColor(parentOf(x), BLACK);
          setColor(y, BLACK);
          setColor(parentOf(parentOf(x)), RED);
          x = parentOf(parentOf(x));
        } else {
          if (x == rightOf(parentOf(x))) {
            x = parentOf(x);
            this.rotateLeft(x);
          }

          setColor(parentOf(x), BLACK);
          setColor(parentOf(parentOf(x)), RED);
          this.rotateRight(parentOf(parentOf(x)));
        }
      } else {
        var y = leftOf(parentOf(parentOf(x)));

        if (colorOf(y) == RED) {
          setColor(parentOf(x), BLACK);
          setColor(y, BLACK);
          setColor(parentOf(parentOf(x)), RED);
          x = parentOf(parentOf(x));
        } else {
          if (x == leftOf(parentOf(x))) {
            x = parentOf(x);
            this.rotateRight(x);
          }

          setColor(parentOf(x), BLACK);
          setColor(parentOf(parentOf(x)), RED);
          this.rotateLeft(parentOf(parentOf(x)));
        }
      }
    }

    this.root_.color = BLACK;
  };
  /**
   * @override
   */


  TreeMap.prototype.values = function () {
    var arrayList = new ArrayList();
    var p = this.getFirstEntry();

    if (p !== null) {
      arrayList.add(p.value);

      while ((p = TreeMap.successor(p)) !== null) {
        arrayList.add(p.value);
      }
    }

    return arrayList;
  };
  /**
   * @override
   */


  TreeMap.prototype.entrySet = function () {
    var hashSet = new HashSet();
    var p = this.getFirstEntry();

    if (p !== null) {
      hashSet.add(p);

      while ((p = TreeMap.successor(p)) !== null) {
        hashSet.add(p);
      }
    }

    return hashSet;
  };
  /**
   * @param {Object} p
   */


  TreeMap.prototype.rotateLeft = function (p) {
    if (p != null) {
      var r = p.right;
      p.right = r.left;
      if (r.left != null) r.left.parent = p;
      r.parent = p.parent;
      if (p.parent == null) this.root_ = r;else if (p.parent.left == p) p.parent.left = r;else p.parent.right = r;
      r.left = p;
      p.parent = r;
    }
  };
  /**
   * @param {Object} p
   */


  TreeMap.prototype.rotateRight = function (p) {
    if (p != null) {
      var l = p.left;
      p.left = l.right;
      if (l.right != null) l.right.parent = p;
      l.parent = p.parent;
      if (p.parent == null) this.root_ = l;else if (p.parent.right == p) p.parent.right = l;else p.parent.left = l;
      l.right = p;
      p.parent = l;
    }
  };
  /**
   * @return {Object}
   */


  TreeMap.prototype.getFirstEntry = function () {
    var p = this.root_;

    if (p != null) {
      while (p.left != null) {
        p = p.left;
      }
    }

    return p;
  };
  /**
   * @param {Object} t
   * @return {Object}
   * @private
   */


  TreeMap.successor = function (t) {
    if (t === null) return null;else if (t.right !== null) {
      var p = t.right;

      while (p.left !== null) {
        p = p.left;
      }

      return p;
    } else {
      var p = t.parent;
      var ch = t;

      while (p !== null && ch === p.right) {
        ch = p;
        p = p.parent;
      }

      return p;
    }
  };
  /**
   * @override
   */


  TreeMap.prototype.size = function () {
    return this.size_;
  };

  TreeMap.prototype.containsKey = function (key) {
    var p = this.root_;

    while (p !== null) {
      var cmp = key['compareTo'](p.key);

      if (cmp < 0) {
        p = p.left;
      } else if (cmp > 0) {
        p = p.right;
      } else {
        return true;
      }
    }

    return false;
  };

  function Lineal() {}
  extend(Lineal.prototype, {
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return Lineal;
    }
  });

  /**
   * @see http://download.oracle.com/javase/6/docs/api/java/util/SortedSet.html
   *
   * @extends {Set}
   * @constructor
   * @private
   */

  function SortedSet() {}
  SortedSet.prototype = new Set();

  /**
   * @see http://download.oracle.com/javase/6/docs/api/java/util/TreeSet.html
   *
   * @extends {SortedSet}
   * @constructor
   * @private
   */

  function TreeSet() {
    /**
     * @type {Array}
     * @private
    */
    this.array_ = [];

    if (arguments[0] instanceof Collection) {
      this.addAll(arguments[0]);
    }
  }
  TreeSet.prototype = new SortedSet();
  /**
   * @override
   */

  TreeSet.prototype.contains = function (o) {
    for (var i = 0, len = this.array_.length; i < len; i++) {
      var e = this.array_[i];

      if (e['compareTo'](o) === 0) {
        return true;
      }
    }

    return false;
  };
  /**
   * @override
   */


  TreeSet.prototype.add = function (o) {
    if (this.contains(o)) {
      return false;
    }

    for (var i = 0, len = this.array_.length; i < len; i++) {
      var e = this.array_[i];

      if (e['compareTo'](o) === 1) {
        this.array_.splice(i, 0, o);
        return true;
      }
    }

    this.array_.push(o);
    return true;
  };
  /**
   * @override
   */


  TreeSet.prototype.addAll = function (c) {
    for (var i = c.iterator(); i.hasNext();) {
      this.add(i.next());
    }

    return true;
  };
  /**
   * @override
   */


  TreeSet.prototype.remove = function (e) {
    throw new OperationNotSupported();
  };
  /**
   * @override
   */


  TreeSet.prototype.size = function () {
    return this.array_.length;
  };
  /**
   * @override
   */


  TreeSet.prototype.isEmpty = function () {
    return this.array_.length === 0;
  };
  /**
   * @override
   */


  TreeSet.prototype.toArray = function () {
    var array = [];

    for (var i = 0, len = this.array_.length; i < len; i++) {
      array.push(this.array_[i]);
    }

    return array;
  };
  /**
   * @override
   */


  TreeSet.prototype.iterator = function () {
    return new Iterator_$2(this);
  };
  /**
   * @extends {javascript.util.Iterator}
   * @param {javascript.util.TreeSet} treeSet
   * @constructor
   * @private
   */


  var Iterator_$2 = function Iterator_(treeSet) {
    /**
     * @type {javascript.util.TreeSet}
     * @private
     */
    this.treeSet_ = treeSet;
    /**
     * @type {number}
     * @private
     */

    this.position_ = 0;
  };
  /**
   * @override
   */


  Iterator_$2.prototype.next = function () {
    if (this.position_ === this.treeSet_.size()) {
      throw new NoSuchElementException();
    }

    return this.treeSet_.array_[this.position_++];
  };
  /**
   * @override
   */


  Iterator_$2.prototype.hasNext = function () {
    if (this.position_ < this.treeSet_.size()) {
      return true;
    } else {
      return false;
    }
  };
  /**
   * @override
   */


  Iterator_$2.prototype.remove = function () {
    throw new OperationNotSupported();
  };

  /**
   * @see http://download.oracle.com/javase/6/docs/api/java/util/Arrays.html
   *
   * @constructor
   * @private
   */

  function Arrays() {}
  /**
   */

  Arrays.sort = function () {
    var a = arguments[0],
        i,
        t,
        comparator,
        compare;

    if (arguments.length === 1) {
      compare = function compare(a, b) {
        return a.compareTo(b);
      };

      a.sort(compare);
      return;
    } else if (arguments.length === 2) {
      comparator = arguments[1];

      compare = function compare(a, b) {
        return comparator['compare'](a, b);
      };

      a.sort(compare);
    } else if (arguments.length === 3) {
      t = a.slice(arguments[1], arguments[2]);
      t.sort();
      var r = a.slice(0, arguments[1]).concat(t, a.slice(arguments[2], a.length));
      a.splice(0, a.length);

      for (i = 0; i < r.length; i++) {
        a.push(r[i]);
      }

      return;
    } else if (arguments.length === 4) {
      t = a.slice(arguments[1], arguments[2]);
      comparator = arguments[3];

      compare = function compare(a, b) {
        return comparator['compare'](a, b);
      };

      t.sort(compare);
      r = a.slice(0, arguments[1]).concat(t, a.slice(arguments[2], a.length));
      a.splice(0, a.length);

      for (i = 0; i < r.length; i++) {
        a.push(r[i]);
      }

      return;
    }
  };
  /**
   * @param {Array} array
   * @return {ArrayList}
   */


  Arrays.asList = function (array) {
    var arrayList = new ArrayList();

    for (var i = 0, len = array.length; i < len; i++) {
      arrayList.add(array[i]);
    }

    return arrayList;
  };

  function Dimension() {}
  extend(Dimension.prototype, {
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return Dimension;
    }
  });

  Dimension.toDimensionSymbol = function (dimensionValue) {
    switch (dimensionValue) {
      case Dimension.FALSE:
        return Dimension.SYM_FALSE;

      case Dimension.TRUE:
        return Dimension.SYM_TRUE;

      case Dimension.DONTCARE:
        return Dimension.SYM_DONTCARE;

      case Dimension.P:
        return Dimension.SYM_P;

      case Dimension.L:
        return Dimension.SYM_L;

      case Dimension.A:
        return Dimension.SYM_A;
    }

    throw new IllegalArgumentException("Unknown dimension value: " + dimensionValue);
  };

  Dimension.toDimensionValue = function (dimensionSymbol) {
    switch (Character.toUpperCase(dimensionSymbol)) {
      case Dimension.SYM_FALSE:
        return Dimension.FALSE;

      case Dimension.SYM_TRUE:
        return Dimension.TRUE;

      case Dimension.SYM_DONTCARE:
        return Dimension.DONTCARE;

      case Dimension.SYM_P:
        return Dimension.P;

      case Dimension.SYM_L:
        return Dimension.L;

      case Dimension.SYM_A:
        return Dimension.A;
    }

    throw new IllegalArgumentException("Unknown dimension symbol: " + dimensionSymbol);
  };

  Dimension.P = 0;
  Dimension.L = 1;
  Dimension.A = 2;
  Dimension.FALSE = -1;
  Dimension.TRUE = -2;
  Dimension.DONTCARE = -3;
  Dimension.SYM_FALSE = 'F';
  Dimension.SYM_TRUE = 'T';
  Dimension.SYM_DONTCARE = '*';
  Dimension.SYM_P = '0';
  Dimension.SYM_L = '1';
  Dimension.SYM_A = '2';

  function GeometryFilter() {}
  extend(GeometryFilter.prototype, {
    filter: function filter(geom) {},
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return GeometryFilter;
    }
  });

  function CoordinateSequenceFilter() {}
  extend(CoordinateSequenceFilter.prototype, {
    filter: function filter(seq, i) {},
    isDone: function isDone() {},
    isGeometryChanged: function isGeometryChanged() {},
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return CoordinateSequenceFilter;
    }
  });

  function GeometryCollection() {
    this._geometries = null;
    var geometries = arguments[0],
        factory = arguments[1];
    Geometry.call(this, factory);

    if (geometries === null) {
      geometries = [];
    }

    if (Geometry.hasNullElements(geometries)) {
      throw new IllegalArgumentException("geometries must not contain null elements");
    }

    this._geometries = geometries;
  }
  inherits(GeometryCollection, Geometry);
  extend(GeometryCollection.prototype, {
    computeEnvelopeInternal: function computeEnvelopeInternal() {
      var envelope = new Envelope();

      for (var i = 0; i < this._geometries.length; i++) {
        envelope.expandToInclude(this._geometries[i].getEnvelopeInternal());
      }

      return envelope;
    },
    getGeometryN: function getGeometryN(n) {
      return this._geometries[n];
    },
    getCoordinates: function getCoordinates() {
      var coordinates = new Array(this.getNumPoints()).fill(null);
      var k = -1;

      for (var i = 0; i < this._geometries.length; i++) {
        var childCoordinates = this._geometries[i].getCoordinates();

        for (var j = 0; j < childCoordinates.length; j++) {
          k++;
          coordinates[k] = childCoordinates[j];
        }
      }

      return coordinates;
    },
    getArea: function getArea() {
      var area = 0.0;

      for (var i = 0; i < this._geometries.length; i++) {
        area += this._geometries[i].getArea();
      }

      return area;
    },
    equalsExact: function equalsExact() {
      if (arguments.length === 2 && typeof arguments[1] === "number" && arguments[0] instanceof Geometry) {
        var other = arguments[0],
            tolerance = arguments[1];

        if (!this.isEquivalentClass(other)) {
          return false;
        }

        var otherCollection = other;

        if (this._geometries.length !== otherCollection._geometries.length) {
          return false;
        }

        for (var i = 0; i < this._geometries.length; i++) {
          if (!this._geometries[i].equalsExact(otherCollection._geometries[i], tolerance)) {
            return false;
          }
        }

        return true;
      } else return Geometry.prototype.equalsExact.apply(this, arguments);
    },
    normalize: function normalize() {
      for (var i = 0; i < this._geometries.length; i++) {
        this._geometries[i].normalize();
      }

      Arrays.sort(this._geometries);
    },
    getCoordinate: function getCoordinate() {
      if (this.isEmpty()) return null;
      return this._geometries[0].getCoordinate();
    },
    getBoundaryDimension: function getBoundaryDimension() {
      var dimension = Dimension.FALSE;

      for (var i = 0; i < this._geometries.length; i++) {
        dimension = Math.max(dimension, this._geometries[i].getBoundaryDimension());
      }

      return dimension;
    },
    getTypeCode: function getTypeCode() {
      return Geometry.TYPECODE_GEOMETRYCOLLECTION;
    },
    getDimension: function getDimension() {
      var dimension = Dimension.FALSE;

      for (var i = 0; i < this._geometries.length; i++) {
        dimension = Math.max(dimension, this._geometries[i].getDimension());
      }

      return dimension;
    },
    getLength: function getLength() {
      var sum = 0.0;

      for (var i = 0; i < this._geometries.length; i++) {
        sum += this._geometries[i].getLength();
      }

      return sum;
    },
    getNumPoints: function getNumPoints() {
      var numPoints = 0;

      for (var i = 0; i < this._geometries.length; i++) {
        numPoints += this._geometries[i].getNumPoints();
      }

      return numPoints;
    },
    getNumGeometries: function getNumGeometries() {
      return this._geometries.length;
    },
    reverse: function reverse() {
      var n = this._geometries.length;
      var revGeoms = new Array(n).fill(null);

      for (var i = 0; i < this._geometries.length; i++) {
        revGeoms[i] = this._geometries[i].reverse();
      }

      return this.getFactory().createGeometryCollection(revGeoms);
    },
    compareToSameClass: function compareToSameClass() {
      if (arguments.length === 1) {
        var o = arguments[0];
        var theseElements = new TreeSet(Arrays.asList(this._geometries));
        var otherElements = new TreeSet(Arrays.asList(o._geometries));
        return this.compare(theseElements, otherElements);
      } else if (arguments.length === 2) {
        var _o = arguments[0],
            comp = arguments[1];
        var gc = _o;
        var n1 = this.getNumGeometries();
        var n2 = gc.getNumGeometries();
        var i = 0;

        while (i < n1 && i < n2) {
          var thisGeom = this.getGeometryN(i);
          var otherGeom = gc.getGeometryN(i);
          var holeComp = thisGeom.compareToSameClass(otherGeom, comp);
          if (holeComp !== 0) return holeComp;
          i++;
        }

        if (i < n1) return 1;
        if (i < n2) return -1;
        return 0;
      }
    },
    apply: function apply() {
      if (hasInterface(arguments[0], CoordinateFilter)) {
        var filter = arguments[0];

        for (var i = 0; i < this._geometries.length; i++) {
          this._geometries[i].apply(filter);
        }
      } else if (hasInterface(arguments[0], CoordinateSequenceFilter)) {
        var _filter = arguments[0];
        if (this._geometries.length === 0) return null;

        for (var i = 0; i < this._geometries.length; i++) {
          this._geometries[i].apply(_filter);

          if (_filter.isDone()) {
            break;
          }
        }

        if (_filter.isGeometryChanged()) this.geometryChanged();
      } else if (hasInterface(arguments[0], GeometryFilter)) {
        var _filter2 = arguments[0];

        _filter2.filter(this);

        for (var i = 0; i < this._geometries.length; i++) {
          this._geometries[i].apply(_filter2);
        }
      } else if (hasInterface(arguments[0], GeometryComponentFilter)) {
        var _filter3 = arguments[0];

        _filter3.filter(this);

        for (var i = 0; i < this._geometries.length; i++) {
          this._geometries[i].apply(_filter3);
        }
      }
    },
    getBoundary: function getBoundary() {
      this.checkNotGeometryCollection(this);
      Assert.shouldNeverReachHere();
      return null;
    },
    getGeometryType: function getGeometryType() {
      return Geometry.TYPENAME_GEOMETRYCOLLECTION;
    },
    copy: function copy() {
      var geometries = new Array(this._geometries.length).fill(null);

      for (var i = 0; i < geometries.length; i++) {
        geometries[i] = this._geometries[i].copy();
      }

      return new GeometryCollection(geometries, this._factory);
    },
    isEmpty: function isEmpty() {
      for (var i = 0; i < this._geometries.length; i++) {
        if (!this._geometries[i].isEmpty()) {
          return false;
        }
      }

      return true;
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return GeometryCollection;
    }
  });
  GeometryCollection.serialVersionUID = -5694727726395021467;

  function MultiLineString() {
    var lineStrings = arguments[0],
        factory = arguments[1];
    GeometryCollection.call(this, lineStrings, factory);
  }
  inherits(MultiLineString, GeometryCollection);
  extend(MultiLineString.prototype, {
    equalsExact: function equalsExact() {
      if (arguments.length === 2 && typeof arguments[1] === "number" && arguments[0] instanceof Geometry) {
        var other = arguments[0],
            tolerance = arguments[1];

        if (!this.isEquivalentClass(other)) {
          return false;
        }

        return GeometryCollection.prototype.equalsExact.call(this, other, tolerance);
      } else return GeometryCollection.prototype.equalsExact.apply(this, arguments);
    },
    getBoundaryDimension: function getBoundaryDimension() {
      if (this.isClosed()) {
        return Dimension.FALSE;
      }

      return 0;
    },
    isClosed: function isClosed() {
      if (this.isEmpty()) {
        return false;
      }

      for (var i = 0; i < this._geometries.length; i++) {
        if (!this._geometries[i].isClosed()) {
          return false;
        }
      }

      return true;
    },
    getTypeCode: function getTypeCode() {
      return Geometry.TYPECODE_MULTILINESTRING;
    },
    getDimension: function getDimension() {
      return 1;
    },
    reverse: function reverse() {
      var nLines = this._geometries.length;
      var revLines = new Array(nLines).fill(null);

      for (var i = 0; i < this._geometries.length; i++) {
        revLines[nLines - 1 - i] = this._geometries[i].reverse();
      }

      return this.getFactory().createMultiLineString(revLines);
    },
    getBoundary: function getBoundary() {
      return new BoundaryOp(this).getBoundary();
    },
    getGeometryType: function getGeometryType() {
      return Geometry.TYPENAME_MULTILINESTRING;
    },
    copy: function copy() {
      var lineStrings = new Array(this._geometries.length).fill(null);

      for (var i = 0; i < lineStrings.length; i++) {
        lineStrings[i] = this._geometries[i].copy();
      }

      return new MultiLineString(lineStrings, this._factory);
    },
    interfaces_: function interfaces_() {
      return [Lineal];
    },
    getClass: function getClass() {
      return MultiLineString;
    }
  });
  MultiLineString.serialVersionUID = 8166665132445433741;

  function BoundaryOp() {
    this._geom = null;
    this._geomFact = null;
    this._bnRule = null;
    this._endpointMap = null;

    if (arguments.length === 1) {
      var geom = arguments[0];
      BoundaryOp.call(this, geom, BoundaryNodeRule.MOD2_BOUNDARY_RULE);
    } else if (arguments.length === 2) {
      var _geom = arguments[0],
          bnRule = arguments[1];
      this._geom = _geom;
      this._geomFact = _geom.getFactory();
      this._bnRule = bnRule;
    }
  }
  extend(BoundaryOp.prototype, {
    boundaryMultiLineString: function boundaryMultiLineString(mLine) {
      if (this._geom.isEmpty()) {
        return this.getEmptyMultiPoint();
      }

      var bdyPts = this.computeBoundaryCoordinates(mLine);

      if (bdyPts.length === 1) {
        return this._geomFact.createPoint(bdyPts[0]);
      }

      return this._geomFact.createMultiPointFromCoords(bdyPts);
    },
    getBoundary: function getBoundary() {
      if (this._geom instanceof LineString) return this.boundaryLineString(this._geom);
      if (this._geom instanceof MultiLineString) return this.boundaryMultiLineString(this._geom);
      return this._geom.getBoundary();
    },
    boundaryLineString: function boundaryLineString(line) {
      if (this._geom.isEmpty()) {
        return this.getEmptyMultiPoint();
      }

      if (line.isClosed()) {
        var closedEndpointOnBoundary = this._bnRule.isInBoundary(2);

        if (closedEndpointOnBoundary) {
          return line.getStartPoint();
        } else {
          return this._geomFact.createMultiPoint();
        }
      }

      return this._geomFact.createMultiPoint([line.getStartPoint(), line.getEndPoint()]);
    },
    getEmptyMultiPoint: function getEmptyMultiPoint() {
      return this._geomFact.createMultiPoint();
    },
    computeBoundaryCoordinates: function computeBoundaryCoordinates(mLine) {
      var bdyPts = new ArrayList();
      this._endpointMap = new TreeMap();

      for (var i = 0; i < mLine.getNumGeometries(); i++) {
        var line = mLine.getGeometryN(i);
        if (line.getNumPoints() === 0) continue;
        this.addEndpoint(line.getCoordinateN(0));
        this.addEndpoint(line.getCoordinateN(line.getNumPoints() - 1));
      }

      for (var it = this._endpointMap.entrySet().iterator(); it.hasNext();) {
        var entry = it.next();
        var counter = entry.getValue();
        var valence = counter.count;

        if (this._bnRule.isInBoundary(valence)) {
          bdyPts.add(entry.getKey());
        }
      }

      return CoordinateArrays.toCoordinateArray(bdyPts);
    },
    addEndpoint: function addEndpoint(pt) {
      var counter = this._endpointMap.get(pt);

      if (counter === null) {
        counter = new Counter();

        this._endpointMap.put(pt, counter);
      }

      counter.count++;
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return BoundaryOp;
    }
  });

  BoundaryOp.getBoundary = function () {
    if (arguments.length === 1) {
      var g = arguments[0];
      var bop = new BoundaryOp(g);
      return bop.getBoundary();
    } else if (arguments.length === 2) {
      var _g = arguments[0],
          bnRule = arguments[1];
      var bop = new BoundaryOp(_g, bnRule);
      return bop.getBoundary();
    }
  };

  function Counter() {
    this.count = null;
  }

  extend(Counter.prototype, {
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return Counter;
    }
  });

  function Length() {}
  extend(Length.prototype, {
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return Length;
    }
  });

  Length.ofLine = function (pts) {
    var n = pts.size();
    if (n <= 1) return 0.0;
    var len = 0.0;
    var p = new Coordinate();
    pts.getCoordinate(0, p);
    var x0 = p.x;
    var y0 = p.y;

    for (var i = 1; i < n; i++) {
      pts.getCoordinate(i, p);
      var x1 = p.x;
      var y1 = p.y;
      var dx = x1 - x0;
      var dy = y1 - y0;
      len += Math.sqrt(dx * dx + dy * dy);
      x0 = x1;
      y0 = y1;
    }

    return len;
  };

  function PrintStream() {}

  function StringReader() {}

  function DecimalFormat() {}

  function ByteArrayOutputStream() {}

  function IOException() {}

  function LineNumberReader() {}

  function StringUtil() {}
  extend(StringUtil.prototype, {
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return StringUtil;
    }
  });

  StringUtil.chars = function (c, n) {
    var ch = new Array(n).fill(null);

    for (var i = 0; i < n; i++) {
      ch[i] = c;
    }

    return new String(ch);
  };

  StringUtil.getStackTrace = function () {
    if (arguments.length === 1) {
      var t = arguments[0];
      var os = new ByteArrayOutputStream();
      var ps = new PrintStream(os);
      t.printStackTrace(ps);
      return os.toString();
    } else if (arguments.length === 2) {
      var _t = arguments[0],
          depth = arguments[1];
      var stackTrace = "";
      var stringReader = new StringReader(StringUtil.getStackTrace(_t));
      var lineNumberReader = new LineNumberReader(stringReader);

      for (var i = 0; i < depth; i++) {
        try {
          stackTrace += lineNumberReader.readLine() + StringUtil.NEWLINE;
        } catch (e) {
          if (e instanceof IOException) {
            Assert.shouldNeverReachHere();
          } else throw e;
        } finally {}
      }

      return stackTrace;
    }
  };

  StringUtil.split = function (s, separator) {
    var separatorlen = separator.length;
    var tokenList = new ArrayList();
    var tmpString = "" + s;
    var pos = tmpString.indexOf(separator);

    while (pos >= 0) {
      var token = tmpString.substring(0, pos);
      tokenList.add(token);
      tmpString = tmpString.substring(pos + separatorlen);
      pos = tmpString.indexOf(separator);
    }

    if (tmpString.length > 0) tokenList.add(tmpString);
    var res = new Array(tokenList.size()).fill(null);

    for (var i = 0; i < res.length; i++) {
      res[i] = tokenList.get(i);
    }

    return res;
  };

  StringUtil.toString = function () {
    if (arguments.length === 1 && typeof arguments[0] === "number") {
      var d = arguments[0];
      return StringUtil.SIMPLE_ORDINATE_FORMAT.format(d);
    }
  };

  StringUtil.spaces = function (n) {
    return StringUtil.chars(' ', n);
  };

  StringUtil.NEWLINE = System.getProperty("line.separator");
  StringUtil.SIMPLE_ORDINATE_FORMAT = new DecimalFormat("0.#");

  function StringBuilder(str) {
    this.str = str;
  }

  StringBuilder.prototype.append = function (e) {
    this.str += e;
  };

  StringBuilder.prototype.setCharAt = function (i, c) {
    this.str = this.str.substr(0, i) + c + this.str.substr(i + 1);
  };

  StringBuilder.prototype.toString = function (e) {
    return this.str;
  };

  function CoordinateSequences() {}
  extend(CoordinateSequences.prototype, {
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return CoordinateSequences;
    }
  });

  CoordinateSequences.copyCoord = function (src, srcPos, dest, destPos) {
    var minDim = Math.min(src.getDimension(), dest.getDimension());

    for (var dim = 0; dim < minDim; dim++) {
      dest.setOrdinate(destPos, dim, src.getOrdinate(srcPos, dim));
    }
  };

  CoordinateSequences.isRing = function (seq) {
    var n = seq.size();
    if (n === 0) return true;
    if (n <= 3) return false;
    return seq.getOrdinate(0, CoordinateSequence.X) === seq.getOrdinate(n - 1, CoordinateSequence.X) && seq.getOrdinate(0, CoordinateSequence.Y) === seq.getOrdinate(n - 1, CoordinateSequence.Y);
  };

  CoordinateSequences.isEqual = function (cs1, cs2) {
    var cs1Size = cs1.size();
    var cs2Size = cs2.size();
    if (cs1Size !== cs2Size) return false;
    var dim = Math.min(cs1.getDimension(), cs2.getDimension());

    for (var i = 0; i < cs1Size; i++) {
      for (var d = 0; d < dim; d++) {
        var v1 = cs1.getOrdinate(i, d);
        var v2 = cs2.getOrdinate(i, d);
        if (cs1.getOrdinate(i, d) === cs2.getOrdinate(i, d)) continue;
        if (Double.isNaN(v1) && Double.isNaN(v2)) continue;
        return false;
      }
    }

    return true;
  };

  CoordinateSequences.extend = function (fact, seq, size) {
    var newseq = fact.create(size, seq.getDimension());
    var n = seq.size();
    CoordinateSequences.copy(seq, 0, newseq, 0, n);

    if (n > 0) {
      for (var i = n; i < size; i++) {
        CoordinateSequences.copy(seq, n - 1, newseq, i, 1);
      }
    }

    return newseq;
  };

  CoordinateSequences.reverse = function (seq) {
    var last = seq.size() - 1;
    var mid = Math.trunc(last / 2);

    for (var i = 0; i <= mid; i++) {
      CoordinateSequences.swap(seq, i, last - i);
    }
  };

  CoordinateSequences.swap = function (seq, i, j) {
    if (i === j) return null;

    for (var dim = 0; dim < seq.getDimension(); dim++) {
      var tmp = seq.getOrdinate(i, dim);
      seq.setOrdinate(i, dim, seq.getOrdinate(j, dim));
      seq.setOrdinate(j, dim, tmp);
    }
  };

  CoordinateSequences.copy = function (src, srcPos, dest, destPos, length) {
    for (var i = 0; i < length; i++) {
      CoordinateSequences.copyCoord(src, srcPos + i, dest, destPos + i);
    }
  };

  CoordinateSequences.toString = function () {
    if (arguments.length === 1 && hasInterface(arguments[0], CoordinateSequence)) {
      var cs = arguments[0];
      var size = cs.size();
      if (size === 0) return "()";
      var dim = cs.getDimension();
      var builder = new StringBuilder();
      builder.append('(');

      for (var i = 0; i < size; i++) {
        if (i > 0) builder.append(" ");

        for (var d = 0; d < dim; d++) {
          if (d > 0) builder.append(",");
          builder.append(StringUtil.toString(cs.getOrdinate(i, d)));
        }
      }

      builder.append(')');
      return builder.toString();
    }
  };

  CoordinateSequences.ensureValidRing = function (fact, seq) {
    var n = seq.size();
    if (n === 0) return seq;
    if (n <= 3) return CoordinateSequences.createClosedRing(fact, seq, 4);
    var isClosed = seq.getOrdinate(0, CoordinateSequence.X) === seq.getOrdinate(n - 1, CoordinateSequence.X) && seq.getOrdinate(0, CoordinateSequence.Y) === seq.getOrdinate(n - 1, CoordinateSequence.Y);
    if (isClosed) return seq;
    return CoordinateSequences.createClosedRing(fact, seq, n + 1);
  };

  CoordinateSequences.createClosedRing = function (fact, seq, size) {
    var newseq = fact.create(size, seq.getDimension());
    var n = seq.size();
    CoordinateSequences.copy(seq, 0, newseq, 0, n);

    for (var i = n; i < size; i++) {
      CoordinateSequences.copy(seq, 0, newseq, i, 1);
    }

    return newseq;
  };

  function LineString() {
    this._points = null;
    var points = arguments[0],
        factory = arguments[1];
    Geometry.call(this, factory);
    this.init(points);
  }
  inherits(LineString, Geometry);
  extend(LineString.prototype, {
    computeEnvelopeInternal: function computeEnvelopeInternal() {
      if (this.isEmpty()) {
        return new Envelope();
      }

      return this._points.expandEnvelope(new Envelope());
    },
    isRing: function isRing() {
      return this.isClosed() && this.isSimple();
    },
    getCoordinates: function getCoordinates() {
      return this._points.toCoordinateArray();
    },
    equalsExact: function equalsExact() {
      if (arguments.length === 2 && typeof arguments[1] === "number" && arguments[0] instanceof Geometry) {
        var other = arguments[0],
            tolerance = arguments[1];

        if (!this.isEquivalentClass(other)) {
          return false;
        }

        var otherLineString = other;

        if (this._points.size() !== otherLineString._points.size()) {
          return false;
        }

        for (var i = 0; i < this._points.size(); i++) {
          if (!this.equal(this._points.getCoordinate(i), otherLineString._points.getCoordinate(i), tolerance)) {
            return false;
          }
        }

        return true;
      } else return Geometry.prototype.equalsExact.apply(this, arguments);
    },
    normalize: function normalize() {
      for (var i = 0; i < Math.trunc(this._points.size() / 2); i++) {
        var j = this._points.size() - 1 - i;

        if (!this._points.getCoordinate(i).equals(this._points.getCoordinate(j))) {
          if (this._points.getCoordinate(i).compareTo(this._points.getCoordinate(j)) > 0) {
            var copy = this._points.copy();

            CoordinateSequences.reverse(copy);
            this._points = copy;
          }

          return null;
        }
      }
    },
    getCoordinate: function getCoordinate() {
      if (this.isEmpty()) return null;
      return this._points.getCoordinate(0);
    },
    getBoundaryDimension: function getBoundaryDimension() {
      if (this.isClosed()) {
        return Dimension.FALSE;
      }

      return 0;
    },
    isClosed: function isClosed() {
      if (this.isEmpty()) {
        return false;
      }

      return this.getCoordinateN(0).equals2D(this.getCoordinateN(this.getNumPoints() - 1));
    },
    getEndPoint: function getEndPoint() {
      if (this.isEmpty()) {
        return null;
      }

      return this.getPointN(this.getNumPoints() - 1);
    },
    getTypeCode: function getTypeCode() {
      return Geometry.TYPECODE_LINESTRING;
    },
    getDimension: function getDimension() {
      return 1;
    },
    getLength: function getLength() {
      return Length.ofLine(this._points);
    },
    getNumPoints: function getNumPoints() {
      return this._points.size();
    },
    reverse: function reverse() {
      var seq = this._points.copy();

      CoordinateSequences.reverse(seq);
      var revLine = this.getFactory().createLineString(seq);
      return revLine;
    },
    compareToSameClass: function compareToSameClass() {
      if (arguments.length === 1) {
        var o = arguments[0];
        var line = o;
        var i = 0;
        var j = 0;

        while (i < this._points.size() && j < line._points.size()) {
          var comparison = this._points.getCoordinate(i).compareTo(line._points.getCoordinate(j));

          if (comparison !== 0) {
            return comparison;
          }

          i++;
          j++;
        }

        if (i < this._points.size()) {
          return 1;
        }

        if (j < line._points.size()) {
          return -1;
        }

        return 0;
      } else if (arguments.length === 2) {
        var _o = arguments[0],
            comp = arguments[1];
        var line = _o;
        return comp.compare(this._points, line._points);
      }
    },
    apply: function apply() {
      if (hasInterface(arguments[0], CoordinateFilter)) {
        var filter = arguments[0];

        for (var i = 0; i < this._points.size(); i++) {
          filter.filter(this._points.getCoordinate(i));
        }
      } else if (hasInterface(arguments[0], CoordinateSequenceFilter)) {
        var _filter = arguments[0];
        if (this._points.size() === 0) return null;

        for (var i = 0; i < this._points.size(); i++) {
          _filter.filter(this._points, i);

          if (_filter.isDone()) break;
        }

        if (_filter.isGeometryChanged()) this.geometryChanged();
      } else if (hasInterface(arguments[0], GeometryFilter)) {
        var _filter2 = arguments[0];

        _filter2.filter(this);
      } else if (hasInterface(arguments[0], GeometryComponentFilter)) {
        var _filter3 = arguments[0];

        _filter3.filter(this);
      }
    },
    getBoundary: function getBoundary() {
      return new BoundaryOp(this).getBoundary();
    },
    isEquivalentClass: function isEquivalentClass(other) {
      return other instanceof LineString;
    },
    getCoordinateN: function getCoordinateN(n) {
      return this._points.getCoordinate(n);
    },
    getGeometryType: function getGeometryType() {
      return Geometry.TYPENAME_LINESTRING;
    },
    copy: function copy() {
      return new LineString(this._points.copy(), this._factory);
    },
    getCoordinateSequence: function getCoordinateSequence() {
      return this._points;
    },
    isEmpty: function isEmpty() {
      return this._points.size() === 0;
    },
    init: function init(points) {
      if (points === null) {
        points = this.getFactory().getCoordinateSequenceFactory().create([]);
      }

      if (points.size() === 1) {
        throw new IllegalArgumentException("Invalid number of points in LineString (found " + points.size() + " - must be 0 or >= 2)");
      }

      this._points = points;
    },
    isCoordinate: function isCoordinate(pt) {
      for (var i = 0; i < this._points.size(); i++) {
        if (this._points.getCoordinate(i).equals(pt)) {
          return true;
        }
      }

      return false;
    },
    getStartPoint: function getStartPoint() {
      if (this.isEmpty()) {
        return null;
      }

      return this.getPointN(0);
    },
    getPointN: function getPointN(n) {
      return this.getFactory().createPoint(this._points.getCoordinate(n));
    },
    interfaces_: function interfaces_() {
      return [Lineal];
    },
    getClass: function getClass() {
      return LineString;
    }
  });
  LineString.serialVersionUID = 3110669828065365560;

  function Puntal() {}
  extend(Puntal.prototype, {
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return Puntal;
    }
  });

  function Point() {
    this._coordinates = null;
    var coordinates = arguments[0],
        factory = arguments[1];
    Geometry.call(this, factory);
    this.init(coordinates);
  }
  inherits(Point, Geometry);
  extend(Point.prototype, {
    computeEnvelopeInternal: function computeEnvelopeInternal() {
      if (this.isEmpty()) {
        return new Envelope();
      }

      var env = new Envelope();
      env.expandToInclude(this._coordinates.getX(0), this._coordinates.getY(0));
      return env;
    },
    getCoordinates: function getCoordinates() {
      return this.isEmpty() ? [] : [this.getCoordinate()];
    },
    equalsExact: function equalsExact() {
      if (arguments.length === 2 && typeof arguments[1] === "number" && arguments[0] instanceof Geometry) {
        var other = arguments[0],
            tolerance = arguments[1];

        if (!this.isEquivalentClass(other)) {
          return false;
        }

        if (this.isEmpty() && other.isEmpty()) {
          return true;
        }

        if (this.isEmpty() !== other.isEmpty()) {
          return false;
        }

        return this.equal(other.getCoordinate(), this.getCoordinate(), tolerance);
      } else return Geometry.prototype.equalsExact.apply(this, arguments);
    },
    normalize: function normalize() {},
    getCoordinate: function getCoordinate() {
      return this._coordinates.size() !== 0 ? this._coordinates.getCoordinate(0) : null;
    },
    getBoundaryDimension: function getBoundaryDimension() {
      return Dimension.FALSE;
    },
    getTypeCode: function getTypeCode() {
      return Geometry.TYPECODE_POINT;
    },
    getDimension: function getDimension() {
      return 0;
    },
    getNumPoints: function getNumPoints() {
      return this.isEmpty() ? 0 : 1;
    },
    reverse: function reverse() {
      return this.copy();
    },
    getX: function getX() {
      if (this.getCoordinate() === null) {
        throw new IllegalStateException("getX called on empty Point");
      }

      return this.getCoordinate().x;
    },
    compareToSameClass: function compareToSameClass() {
      if (arguments.length === 1) {
        var other = arguments[0];
        var point = other;
        return this.getCoordinate().compareTo(point.getCoordinate());
      } else if (arguments.length === 2) {
        var _other = arguments[0],
            comp = arguments[1];
        var point = _other;
        return comp.compare(this._coordinates, point._coordinates);
      }
    },
    apply: function apply() {
      if (hasInterface(arguments[0], CoordinateFilter)) {
        var filter = arguments[0];

        if (this.isEmpty()) {
          return null;
        }

        filter.filter(this.getCoordinate());
      } else if (hasInterface(arguments[0], CoordinateSequenceFilter)) {
        var _filter = arguments[0];
        if (this.isEmpty()) return null;

        _filter.filter(this._coordinates, 0);

        if (_filter.isGeometryChanged()) this.geometryChanged();
      } else if (hasInterface(arguments[0], GeometryFilter)) {
        var _filter2 = arguments[0];

        _filter2.filter(this);
      } else if (hasInterface(arguments[0], GeometryComponentFilter)) {
        var _filter3 = arguments[0];

        _filter3.filter(this);
      }
    },
    getBoundary: function getBoundary() {
      return this.getFactory().createGeometryCollection();
    },
    getGeometryType: function getGeometryType() {
      return Geometry.TYPENAME_POINT;
    },
    copy: function copy() {
      return new Point(this._coordinates.copy(), this._factory);
    },
    getCoordinateSequence: function getCoordinateSequence() {
      return this._coordinates;
    },
    getY: function getY() {
      if (this.getCoordinate() === null) {
        throw new IllegalStateException("getY called on empty Point");
      }

      return this.getCoordinate().y;
    },
    isEmpty: function isEmpty() {
      return this._coordinates.size() === 0;
    },
    init: function init(coordinates) {
      if (coordinates === null) {
        coordinates = this.getFactory().getCoordinateSequenceFactory().create([]);
      }

      Assert.isTrue(coordinates.size() <= 1);
      this._coordinates = coordinates;
    },
    isSimple: function isSimple() {
      return true;
    },
    interfaces_: function interfaces_() {
      return [Puntal];
    },
    getClass: function getClass() {
      return Point;
    }
  });
  Point.serialVersionUID = 4902022702746614570;

  function Area() {}
  extend(Area.prototype, {
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return Area;
    }
  });

  Area.ofRing = function () {
    if (arguments[0] instanceof Array) {
      var ring = arguments[0];
      return Math.abs(Area.ofRingSigned(ring));
    } else if (hasInterface(arguments[0], CoordinateSequence)) {
      var _ring = arguments[0];
      return Math.abs(Area.ofRingSigned(_ring));
    }
  };

  Area.ofRingSigned = function () {
    if (arguments[0] instanceof Array) {
      var ring = arguments[0];
      if (ring.length < 3) return 0.0;
      var sum = 0.0;
      var x0 = ring[0].x;

      for (var i = 1; i < ring.length - 1; i++) {
        var x = ring[i].x - x0;
        var y1 = ring[i + 1].y;
        var y2 = ring[i - 1].y;
        sum += x * (y2 - y1);
      }

      return sum / 2.0;
    } else if (hasInterface(arguments[0], CoordinateSequence)) {
      var _ring2 = arguments[0];

      var n = _ring2.size();

      if (n < 3) return 0.0;
      var p0 = new Coordinate();
      var p1 = new Coordinate();
      var p2 = new Coordinate();

      _ring2.getCoordinate(0, p1);

      _ring2.getCoordinate(1, p2);

      var x0 = p1.x;
      p2.x -= x0;
      var sum = 0.0;

      for (var i = 1; i < n - 1; i++) {
        p0.y = p1.y;
        p1.x = p2.x;
        p1.y = p2.y;

        _ring2.getCoordinate(i + 1, p2);

        p2.x -= x0;
        sum += p1.x * (p0.y - p2.y);
      }

      return sum / 2.0;
    }
  };

  function Polygonal() {}
  extend(Polygonal.prototype, {
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return Polygonal;
    }
  });

  function Polygon() {
    this._shell = null;
    this._holes = null;
    var shell = arguments[0],
        holes = arguments[1],
        factory = arguments[2];
    Geometry.call(this, factory);

    if (shell === null) {
      shell = this.getFactory().createLinearRing();
    }

    if (holes === null) {
      holes = [];
    }

    if (Geometry.hasNullElements(holes)) {
      throw new IllegalArgumentException("holes must not contain null elements");
    }

    if (shell.isEmpty() && Geometry.hasNonEmptyElements(holes)) {
      throw new IllegalArgumentException("shell is empty but holes are not");
    }

    this._shell = shell;
    this._holes = holes;
  }
  inherits(Polygon, Geometry);
  extend(Polygon.prototype, {
    computeEnvelopeInternal: function computeEnvelopeInternal() {
      return this._shell.getEnvelopeInternal();
    },
    getCoordinates: function getCoordinates() {
      if (this.isEmpty()) {
        return [];
      }

      var coordinates = new Array(this.getNumPoints()).fill(null);
      var k = -1;

      var shellCoordinates = this._shell.getCoordinates();

      for (var x = 0; x < shellCoordinates.length; x++) {
        k++;
        coordinates[k] = shellCoordinates[x];
      }

      for (var i = 0; i < this._holes.length; i++) {
        var childCoordinates = this._holes[i].getCoordinates();

        for (var j = 0; j < childCoordinates.length; j++) {
          k++;
          coordinates[k] = childCoordinates[j];
        }
      }

      return coordinates;
    },
    getArea: function getArea() {
      var area = 0.0;
      area += Area.ofRing(this._shell.getCoordinateSequence());

      for (var i = 0; i < this._holes.length; i++) {
        area -= Area.ofRing(this._holes[i].getCoordinateSequence());
      }

      return area;
    },
    isRectangle: function isRectangle() {
      if (this.getNumInteriorRing() !== 0) return false;
      if (this._shell === null) return false;
      if (this._shell.getNumPoints() !== 5) return false;

      var seq = this._shell.getCoordinateSequence();

      var env = this.getEnvelopeInternal();

      for (var i = 0; i < 5; i++) {
        var x = seq.getX(i);
        if (!(x === env.getMinX() || x === env.getMaxX())) return false;
        var y = seq.getY(i);
        if (!(y === env.getMinY() || y === env.getMaxY())) return false;
      }

      var prevX = seq.getX(0);
      var prevY = seq.getY(0);

      for (var i = 1; i <= 4; i++) {
        var x = seq.getX(i);
        var y = seq.getY(i);
        var xChanged = x !== prevX;
        var yChanged = y !== prevY;
        if (xChanged === yChanged) return false;
        prevX = x;
        prevY = y;
      }

      return true;
    },
    equalsExact: function equalsExact() {
      if (arguments.length === 2 && typeof arguments[1] === "number" && arguments[0] instanceof Geometry) {
        var other = arguments[0],
            tolerance = arguments[1];

        if (!this.isEquivalentClass(other)) {
          return false;
        }

        var otherPolygon = other;
        var thisShell = this._shell;
        var otherPolygonShell = otherPolygon._shell;

        if (!thisShell.equalsExact(otherPolygonShell, tolerance)) {
          return false;
        }

        if (this._holes.length !== otherPolygon._holes.length) {
          return false;
        }

        for (var i = 0; i < this._holes.length; i++) {
          if (!this._holes[i].equalsExact(otherPolygon._holes[i], tolerance)) {
            return false;
          }
        }

        return true;
      } else return Geometry.prototype.equalsExact.apply(this, arguments);
    },
    normalize: function normalize() {
      if (arguments.length === 0) {
        this.normalize(this._shell, true);

        for (var i = 0; i < this._holes.length; i++) {
          this.normalize(this._holes[i], false);
        }

        Arrays.sort(this._holes);
      } else if (arguments.length === 2) {
        var ring = arguments[0],
            clockwise = arguments[1];

        if (ring.isEmpty()) {
          return null;
        }

        var uniqueCoordinates = new Array(ring.getCoordinates().length - 1).fill(null);
        System.arraycopy(ring.getCoordinates(), 0, uniqueCoordinates, 0, uniqueCoordinates.length);
        var minCoordinate = CoordinateArrays.minCoordinate(ring.getCoordinates());
        CoordinateArrays.scroll(uniqueCoordinates, minCoordinate);
        System.arraycopy(uniqueCoordinates, 0, ring.getCoordinates(), 0, uniqueCoordinates.length);
        ring.getCoordinates()[uniqueCoordinates.length] = uniqueCoordinates[0];

        if (Orientation.isCCW(ring.getCoordinates()) === clockwise) {
          CoordinateArrays.reverse(ring.getCoordinates());
        }
      }
    },
    getCoordinate: function getCoordinate() {
      return this._shell.getCoordinate();
    },
    getNumInteriorRing: function getNumInteriorRing() {
      return this._holes.length;
    },
    getBoundaryDimension: function getBoundaryDimension() {
      return 1;
    },
    getTypeCode: function getTypeCode() {
      return Geometry.TYPECODE_POLYGON;
    },
    getDimension: function getDimension() {
      return 2;
    },
    getLength: function getLength() {
      var len = 0.0;
      len += this._shell.getLength();

      for (var i = 0; i < this._holes.length; i++) {
        len += this._holes[i].getLength();
      }

      return len;
    },
    getNumPoints: function getNumPoints() {
      var numPoints = this._shell.getNumPoints();

      for (var i = 0; i < this._holes.length; i++) {
        numPoints += this._holes[i].getNumPoints();
      }

      return numPoints;
    },
    reverse: function reverse() {
      var poly = this.copy();
      poly._shell = this._shell.copy().reverse();
      poly._holes = new Array(this._holes.length).fill(null);

      for (var i = 0; i < this._holes.length; i++) {
        poly._holes[i] = this._holes[i].copy().reverse();
      }

      return poly;
    },
    convexHull: function convexHull() {
      return this.getExteriorRing().convexHull();
    },
    compareToSameClass: function compareToSameClass() {
      if (arguments.length === 1) {
        var o = arguments[0];
        var thisShell = this._shell;
        var otherShell = o._shell;
        return thisShell.compareToSameClass(otherShell);
      } else if (arguments.length === 2) {
        var _o = arguments[0],
            comp = arguments[1];
        var poly = _o;
        var thisShell = this._shell;
        var otherShell = poly._shell;
        var shellComp = thisShell.compareToSameClass(otherShell, comp);
        if (shellComp !== 0) return shellComp;
        var nHole1 = this.getNumInteriorRing();
        var nHole2 = poly.getNumInteriorRing();
        var i = 0;

        while (i < nHole1 && i < nHole2) {
          var thisHole = this.getInteriorRingN(i);
          var otherHole = poly.getInteriorRingN(i);
          var holeComp = thisHole.compareToSameClass(otherHole, comp);
          if (holeComp !== 0) return holeComp;
          i++;
        }

        if (i < nHole1) return 1;
        if (i < nHole2) return -1;
        return 0;
      }
    },
    apply: function apply() {
      if (hasInterface(arguments[0], CoordinateFilter)) {
        var filter = arguments[0];

        this._shell.apply(filter);

        for (var i = 0; i < this._holes.length; i++) {
          this._holes[i].apply(filter);
        }
      } else if (hasInterface(arguments[0], CoordinateSequenceFilter)) {
        var _filter = arguments[0];

        this._shell.apply(_filter);

        if (!_filter.isDone()) {
          for (var i = 0; i < this._holes.length; i++) {
            this._holes[i].apply(_filter);

            if (_filter.isDone()) break;
          }
        }

        if (_filter.isGeometryChanged()) this.geometryChanged();
      } else if (hasInterface(arguments[0], GeometryFilter)) {
        var _filter2 = arguments[0];

        _filter2.filter(this);
      } else if (hasInterface(arguments[0], GeometryComponentFilter)) {
        var _filter3 = arguments[0];

        _filter3.filter(this);

        this._shell.apply(_filter3);

        for (var i = 0; i < this._holes.length; i++) {
          this._holes[i].apply(_filter3);
        }
      }
    },
    getBoundary: function getBoundary() {
      if (this.isEmpty()) {
        return this.getFactory().createMultiLineString();
      }

      var rings = new Array(this._holes.length + 1).fill(null);
      rings[0] = this._shell;

      for (var i = 0; i < this._holes.length; i++) {
        rings[i + 1] = this._holes[i];
      }

      if (rings.length <= 1) return this.getFactory().createLinearRing(rings[0].getCoordinateSequence());
      return this.getFactory().createMultiLineString(rings);
    },
    getGeometryType: function getGeometryType() {
      return Geometry.TYPENAME_POLYGON;
    },
    copy: function copy() {
      var shellCopy = this._shell.copy();

      var holeCopies = new Array(this._holes.length).fill(null);

      for (var i = 0; i < this._holes.length; i++) {
        holeCopies[i] = this._holes[i].copy();
      }

      return new Polygon(shellCopy, holeCopies, this._factory);
    },
    getExteriorRing: function getExteriorRing() {
      return this._shell;
    },
    isEmpty: function isEmpty() {
      return this._shell.isEmpty();
    },
    getInteriorRingN: function getInteriorRingN(n) {
      return this._holes[n];
    },
    interfaces_: function interfaces_() {
      return [Polygonal];
    },
    getClass: function getClass() {
      return Polygon;
    }
  });
  Polygon.serialVersionUID = -3494792200821764533;

  function MultiPoint() {
    var points = arguments[0],
        factory = arguments[1];
    GeometryCollection.call(this, points, factory);
  }
  inherits(MultiPoint, GeometryCollection);
  extend(MultiPoint.prototype, {
    isValid: function isValid() {
      return true;
    },
    equalsExact: function equalsExact() {
      if (arguments.length === 2 && typeof arguments[1] === "number" && arguments[0] instanceof Geometry) {
        var other = arguments[0],
            tolerance = arguments[1];

        if (!this.isEquivalentClass(other)) {
          return false;
        }

        return GeometryCollection.prototype.equalsExact.call(this, other, tolerance);
      } else return GeometryCollection.prototype.equalsExact.apply(this, arguments);
    },
    getCoordinate: function getCoordinate() {
      if (arguments.length === 1 && Number.isInteger(arguments[0])) {
        var n = arguments[0];
        return this._geometries[n].getCoordinate();
      } else return GeometryCollection.prototype.getCoordinate.apply(this, arguments);
    },
    getBoundaryDimension: function getBoundaryDimension() {
      return Dimension.FALSE;
    },
    getTypeCode: function getTypeCode() {
      return Geometry.TYPECODE_MULTIPOINT;
    },
    getDimension: function getDimension() {
      return 0;
    },
    getBoundary: function getBoundary() {
      return this.getFactory().createGeometryCollection();
    },
    getGeometryType: function getGeometryType() {
      return Geometry.TYPENAME_MULTIPOINT;
    },
    copy: function copy() {
      var points = new Array(this._geometries.length).fill(null);

      for (var i = 0; i < points.length; i++) {
        points[i] = this._geometries[i].copy();
      }

      return new MultiPoint(points, this._factory);
    },
    interfaces_: function interfaces_() {
      return [Puntal];
    },
    getClass: function getClass() {
      return MultiPoint;
    }
  });
  MultiPoint.serialVersionUID = -8048474874175355449;

  function LinearRing() {
    if (arguments[0] instanceof Array && arguments[1] instanceof GeometryFactory) {
      var points = arguments[0],
          factory = arguments[1];
      LinearRing.call(this, factory.getCoordinateSequenceFactory().create(points), factory);
    } else if (hasInterface(arguments[0], CoordinateSequence) && arguments[1] instanceof GeometryFactory) {
      var _points = arguments[0],
          _factory = arguments[1];
      LineString.call(this, _points, _factory);
      this.validateConstruction();
    }
  }
  inherits(LinearRing, LineString);
  extend(LinearRing.prototype, {
    getBoundaryDimension: function getBoundaryDimension() {
      return Dimension.FALSE;
    },
    isClosed: function isClosed() {
      if (this.isEmpty()) {
        return true;
      }

      return LineString.prototype.isClosed.call(this);
    },
    getTypeCode: function getTypeCode() {
      return Geometry.TYPECODE_LINEARRING;
    },
    reverse: function reverse() {
      var seq = this._points.copy();

      CoordinateSequences.reverse(seq);
      var rev = this.getFactory().createLinearRing(seq);
      return rev;
    },
    validateConstruction: function validateConstruction() {
      if (!this.isEmpty() && !LineString.prototype.isClosed.call(this)) {
        throw new IllegalArgumentException("Points of LinearRing do not form a closed linestring");
      }

      if (this.getCoordinateSequence().size() >= 1 && this.getCoordinateSequence().size() < LinearRing.MINIMUM_VALID_SIZE) {
        throw new IllegalArgumentException("Invalid number of points in LinearRing (found " + this.getCoordinateSequence().size() + " - must be 0 or >= 4)");
      }
    },
    getGeometryType: function getGeometryType() {
      return Geometry.TYPENAME_LINEARRING;
    },
    copy: function copy() {
      return new LinearRing(this._points.copy(), this._factory);
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return LinearRing;
    }
  });
  LinearRing.MINIMUM_VALID_SIZE = 4;
  LinearRing.serialVersionUID = -4261142084085851829;

  function MultiPolygon() {
    var polygons = arguments[0],
        factory = arguments[1];
    GeometryCollection.call(this, polygons, factory);
  }
  inherits(MultiPolygon, GeometryCollection);
  extend(MultiPolygon.prototype, {
    equalsExact: function equalsExact() {
      if (arguments.length === 2 && typeof arguments[1] === "number" && arguments[0] instanceof Geometry) {
        var other = arguments[0],
            tolerance = arguments[1];

        if (!this.isEquivalentClass(other)) {
          return false;
        }

        return GeometryCollection.prototype.equalsExact.call(this, other, tolerance);
      } else return GeometryCollection.prototype.equalsExact.apply(this, arguments);
    },
    getBoundaryDimension: function getBoundaryDimension() {
      return 1;
    },
    getTypeCode: function getTypeCode() {
      return Geometry.TYPECODE_MULTIPOLYGON;
    },
    getDimension: function getDimension() {
      return 2;
    },
    reverse: function reverse() {
      var n = this._geometries.length;
      var revGeoms = new Array(n).fill(null);

      for (var i = 0; i < this._geometries.length; i++) {
        revGeoms[i] = this._geometries[i].reverse();
      }

      return this.getFactory().createMultiPolygon(revGeoms);
    },
    getBoundary: function getBoundary() {
      if (this.isEmpty()) {
        return this.getFactory().createMultiLineString();
      }

      var allRings = new ArrayList();

      for (var i = 0; i < this._geometries.length; i++) {
        var polygon = this._geometries[i];
        var rings = polygon.getBoundary();

        for (var j = 0; j < rings.getNumGeometries(); j++) {
          allRings.add(rings.getGeometryN(j));
        }
      }

      var allRingsArray = new Array(allRings.size()).fill(null);
      return this.getFactory().createMultiLineString(allRings.toArray(allRingsArray));
    },
    getGeometryType: function getGeometryType() {
      return Geometry.TYPENAME_MULTIPOLYGON;
    },
    copy: function copy() {
      var polygons = new Array(this._geometries.length).fill(null);

      for (var i = 0; i < polygons.length; i++) {
        polygons[i] = this._geometries[i].copy();
      }

      return new MultiPolygon(polygons, this._factory);
    },
    interfaces_: function interfaces_() {
      return [Polygonal];
    },
    getClass: function getClass() {
      return MultiPolygon;
    }
  });
  MultiPolygon.serialVersionUID = -551033529766975875;

  function GeometryEditor() {
    this._factory = null;
    this._isUserDataCopied = false;

    if (arguments.length === 0) ; else if (arguments.length === 1) {
      var factory = arguments[0];
      this._factory = factory;
    }
  }
  extend(GeometryEditor.prototype, {
    setCopyUserData: function setCopyUserData(isUserDataCopied) {
      this._isUserDataCopied = isUserDataCopied;
    },
    edit: function edit(geometry, operation) {
      if (geometry === null) return null;
      var result = this.editInternal(geometry, operation);

      if (this._isUserDataCopied) {
        result.setUserData(geometry.getUserData());
      }

      return result;
    },
    editInternal: function editInternal(geometry, operation) {
      if (this._factory === null) this._factory = geometry.getFactory();

      if (geometry instanceof GeometryCollection) {
        return this.editGeometryCollection(geometry, operation);
      }

      if (geometry instanceof Polygon) {
        return this.editPolygon(geometry, operation);
      }

      if (geometry instanceof Point) {
        return operation.edit(geometry, this._factory);
      }

      if (geometry instanceof LineString) {
        return operation.edit(geometry, this._factory);
      }

      Assert.shouldNeverReachHere("Unsupported Geometry class: " + geometry.getClass().getName());
      return null;
    },
    editGeometryCollection: function editGeometryCollection(collection, operation) {
      var collectionForType = operation.edit(collection, this._factory);
      var geometries = new ArrayList();

      for (var i = 0; i < collectionForType.getNumGeometries(); i++) {
        var geometry = this.edit(collectionForType.getGeometryN(i), operation);

        if (geometry === null || geometry.isEmpty()) {
          continue;
        }

        geometries.add(geometry);
      }

      if (collectionForType.getClass() === MultiPoint) {
        return this._factory.createMultiPoint(geometries.toArray([]));
      }

      if (collectionForType.getClass() === MultiLineString) {
        return this._factory.createMultiLineString(geometries.toArray([]));
      }

      if (collectionForType.getClass() === MultiPolygon) {
        return this._factory.createMultiPolygon(geometries.toArray([]));
      }

      return this._factory.createGeometryCollection(geometries.toArray([]));
    },
    editPolygon: function editPolygon(polygon, operation) {
      var newPolygon = operation.edit(polygon, this._factory);
      if (newPolygon === null) newPolygon = this._factory.createPolygon();

      if (newPolygon.isEmpty()) {
        return newPolygon;
      }

      var shell = this.edit(newPolygon.getExteriorRing(), operation);

      if (shell === null || shell.isEmpty()) {
        return this._factory.createPolygon();
      }

      var holes = new ArrayList();

      for (var i = 0; i < newPolygon.getNumInteriorRing(); i++) {
        var hole = this.edit(newPolygon.getInteriorRingN(i), operation);

        if (hole === null || hole.isEmpty()) {
          continue;
        }

        holes.add(hole);
      }

      return this._factory.createPolygon(shell, holes.toArray([]));
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return GeometryEditor;
    }
  });

  function GeometryEditorOperation() {}

  GeometryEditor.GeometryEditorOperation = GeometryEditorOperation;

  function NoOpGeometryOperation() {}

  extend(NoOpGeometryOperation.prototype, {
    edit: function edit(geometry, factory) {
      return geometry;
    },
    interfaces_: function interfaces_() {
      return [GeometryEditorOperation];
    },
    getClass: function getClass() {
      return NoOpGeometryOperation;
    }
  });

  function CoordinateOperation() {}

  extend(CoordinateOperation.prototype, {
    edit: function edit(geometry, factory) {
      var coordinates = this.edit(geometry.getCoordinates(), geometry);

      if (geometry instanceof LinearRing) {
        if (coordinates === null) return factory.createLinearRing();else return factory.createLinearRing(coordinates);
      }

      if (geometry instanceof LineString) {
        if (coordinates === null) return factory.createLineString();else return factory.createLineString(coordinates);
      }

      if (geometry instanceof Point) {
        if (coordinates === null || coordinates.length === 0) return factory.createPoint();else return factory.createPoint(coordinates[0]);
      }

      return geometry;
    },
    interfaces_: function interfaces_() {
      return [GeometryEditorOperation];
    },
    getClass: function getClass() {
      return CoordinateOperation;
    }
  });

  function CoordinateSequenceOperation() {}

  extend(CoordinateSequenceOperation.prototype, {
    edit: function edit(geometry, factory) {
      if (geometry instanceof LinearRing) {
        return factory.createLinearRing(this.edit(geometry.getCoordinateSequence(), geometry));
      }

      if (geometry instanceof LineString) {
        return factory.createLineString(this.edit(geometry.getCoordinateSequence(), geometry));
      }

      if (geometry instanceof Point) {
        return factory.createPoint(this.edit(geometry.getCoordinateSequence(), geometry));
      }

      return geometry;
    },
    interfaces_: function interfaces_() {
      return [GeometryEditorOperation];
    },
    getClass: function getClass() {
      return CoordinateSequenceOperation;
    }
  });
  GeometryEditor.NoOpGeometryOperation = NoOpGeometryOperation;
  GeometryEditor.CoordinateOperation = CoordinateOperation;
  GeometryEditor.CoordinateSequenceOperation = CoordinateSequenceOperation;

  function CoordinateArraySequence() {
    this._dimension = 3;
    this._coordinates = null;

    if (arguments.length === 1) {
      if (arguments[0] instanceof Array) {
        var coordinates = arguments[0];
        CoordinateArraySequence.call(this, coordinates, 3);
      } else if (Number.isInteger(arguments[0])) {
        var size = arguments[0];
        this._coordinates = new Array(size).fill(null);

        for (var i = 0; i < size; i++) {
          this._coordinates[i] = new Coordinate();
        }
      } else if (hasInterface(arguments[0], CoordinateSequence)) {
        var coordSeq = arguments[0];

        if (coordSeq === null) {
          this._coordinates = new Array(0).fill(null);
          return null;
        }

        this._dimension = coordSeq.getDimension();
        this._coordinates = new Array(coordSeq.size()).fill(null);

        for (var i = 0; i < this._coordinates.length; i++) {
          this._coordinates[i] = coordSeq.getCoordinateCopy(i);
        }
      }
    } else if (arguments.length === 2) {
      if (arguments[0] instanceof Array && Number.isInteger(arguments[1])) {
        var _coordinates = arguments[0],
            dimension = arguments[1];
        this._coordinates = _coordinates;
        this._dimension = dimension;
        if (_coordinates === null) this._coordinates = new Array(0).fill(null);
      } else if (Number.isInteger(arguments[0]) && Number.isInteger(arguments[1])) {
        var _size = arguments[0],
            _dimension = arguments[1];
        this._coordinates = new Array(_size).fill(null);
        this._dimension = _dimension;

        for (var i = 0; i < _size; i++) {
          this._coordinates[i] = new Coordinate();
        }
      }
    }
  }
  extend(CoordinateArraySequence.prototype, {
    setOrdinate: function setOrdinate(index, ordinateIndex, value) {
      switch (ordinateIndex) {
        case CoordinateSequence.X:
          this._coordinates[index].x = value;
          break;

        case CoordinateSequence.Y:
          this._coordinates[index].y = value;
          break;

        case CoordinateSequence.Z:
          this._coordinates[index].z = value;
          break;

        default:
          throw new IllegalArgumentException("invalid ordinateIndex");
      }
    },
    size: function size() {
      return this._coordinates.length;
    },
    getOrdinate: function getOrdinate(index, ordinateIndex) {
      switch (ordinateIndex) {
        case CoordinateSequence.X:
          return this._coordinates[index].x;

        case CoordinateSequence.Y:
          return this._coordinates[index].y;

        case CoordinateSequence.Z:
          return this._coordinates[index].z;
      }

      return Double.NaN;
    },
    getCoordinate: function getCoordinate() {
      if (arguments.length === 1) {
        var i = arguments[0];
        return this._coordinates[i];
      } else if (arguments.length === 2) {
        var index = arguments[0],
            coord = arguments[1];
        coord.x = this._coordinates[index].x;
        coord.y = this._coordinates[index].y;
        coord.z = this._coordinates[index].z;
      }
    },
    getCoordinateCopy: function getCoordinateCopy(i) {
      return new Coordinate(this._coordinates[i]);
    },
    getDimension: function getDimension() {
      return this._dimension;
    },
    getX: function getX(index) {
      return this._coordinates[index].x;
    },
    expandEnvelope: function expandEnvelope(env) {
      for (var i = 0; i < this._coordinates.length; i++) {
        env.expandToInclude(this._coordinates[i]);
      }

      return env;
    },
    copy: function copy() {
      var cloneCoordinates = new Array(this.size()).fill(null);

      for (var i = 0; i < this._coordinates.length; i++) {
        cloneCoordinates[i] = this._coordinates[i].copy();
      }

      return new CoordinateArraySequence(cloneCoordinates, this._dimension);
    },
    toString: function toString() {
      if (this._coordinates.length > 0) {
        var strBuilder = new StringBuilder(17 * this._coordinates.length);
        strBuilder.append('(');
        strBuilder.append(this._coordinates[0]);

        for (var i = 1; i < this._coordinates.length; i++) {
          strBuilder.append(", ");
          strBuilder.append(this._coordinates[i]);
        }

        strBuilder.append(')');
        return strBuilder.toString();
      } else {
        return "()";
      }
    },
    getY: function getY(index) {
      return this._coordinates[index].y;
    },
    toCoordinateArray: function toCoordinateArray() {
      return this._coordinates;
    },
    interfaces_: function interfaces_() {
      return [CoordinateSequence, Serializable];
    },
    getClass: function getClass() {
      return CoordinateArraySequence;
    }
  });
  CoordinateArraySequence.serialVersionUID = -915438501601840650;

  function CoordinateArraySequenceFactory() {}
  extend(CoordinateArraySequenceFactory.prototype, {
    readResolve: function readResolve() {
      return CoordinateArraySequenceFactory.instance();
    },
    create: function create() {
      if (arguments.length === 1) {
        if (arguments[0] instanceof Array) {
          var coordinates = arguments[0];
          return new CoordinateArraySequence(coordinates);
        } else if (hasInterface(arguments[0], CoordinateSequence)) {
          var coordSeq = arguments[0];
          return new CoordinateArraySequence(coordSeq);
        }
      } else if (arguments.length === 2) {
        var size = arguments[0],
            dimension = arguments[1];
        if (dimension > 3) dimension = 3;
        if (dimension < 2) return new CoordinateArraySequence(size);
        return new CoordinateArraySequence(size, dimension);
      }
    },
    interfaces_: function interfaces_() {
      return [CoordinateSequenceFactory, Serializable];
    },
    getClass: function getClass() {
      return CoordinateArraySequenceFactory;
    }
  });

  CoordinateArraySequenceFactory.instance = function () {
    return CoordinateArraySequenceFactory.instanceObject;
  };

  CoordinateArraySequenceFactory.serialVersionUID = -4099577099607551657;
  CoordinateArraySequenceFactory.instanceObject = new CoordinateArraySequenceFactory();

  // shared pointer
  var i; // shortcuts

  var defineProperty = Object.defineProperty;

  function is(a, b) {
    return a === b || a !== a && b !== b;
  } // eslint-disable-line


  var MapPolyfill = createCollection({
    // WeakMap#delete(key:void*):boolean
    'delete': sharedDelete,
    // :was Map#get(key:void*[, d3fault:void*]):void*
    // Map#has(key:void*):boolean
    has: mapHas,
    // Map#get(key:void*):boolean
    get: sharedGet,
    // Map#set(key:void*, value:void*):void
    set: sharedSet,
    // Map#keys(void):Iterator
    keys: sharedKeys,
    // Map#values(void):Iterator
    values: sharedValues,
    // Map#entries(void):Iterator
    entries: mapEntries,
    // Map#forEach(callback:Function, context:void*):void ==> callback.call(context, key, value, mapObject) === not in specs`
    forEach: sharedForEach,
    // Map#clear():
    clear: sharedClear
  });

  function createCollection(proto, objectOnly) {
    function Collection(a) {
      if (!this || this.constructor !== Collection) return new Collection(a);
      this._keys = [];
      this._values = [];
      this._itp = []; // iteration pointers

      this.objectOnly = objectOnly; // parse initial iterable argument passed

      if (a) init.call(this, a);
    } // define size for non object-only collections


    if (!objectOnly) {
      defineProperty(proto, 'size', {
        get: sharedSize
      });
    } // set prototype


    proto.constructor = Collection;
    Collection.prototype = proto;
    return Collection;
  }

  function init(a) {
    // init Set argument, like `[1,2,3,{}]`
    if (this.add) a.forEach(this.add, this); // init Map argument like `[[1,2], [{}, 4]]`
    else a.forEach(function (a) {
        this.set(a[0], a[1]);
      }, this);
  }

  function sharedDelete(key) {
    if (this.has(key)) {
      this._keys.splice(i, 1);

      this._values.splice(i, 1); // update iteration pointers


      this._itp.forEach(function (p) {
        if (i < p[0]) p[0]--;
      });
    } // Aurora here does it while Canary doesn't


    return i > -1;
  }

  function sharedGet(key) {
    return this.has(key) ? this._values[i] : undefined;
  }

  function has(list, key) {
    if (this.objectOnly && key !== Object(key)) throw new TypeError('Invalid value used as weak collection key'); // NaN or 0 passed

    if (key !== key || key === 0) for (i = list.length; i-- && !is(list[i], key);) {} // eslint-disable-line
    else i = list.indexOf(key);
    return i > -1;
  }

  function mapHas(value) {
    return has.call(this, this._keys, value);
  }

  function sharedSet(key, value) {
    this.has(key) ? this._values[i] = value : this._values[this._keys.push(key) - 1] = value;
    return this;
  }

  function sharedClear() {
    (this._keys || 0).length = this._values.length = 0;
  }

  function sharedKeys() {
    return sharedIterator(this._itp, this._keys);
  }

  function sharedValues() {
    return sharedIterator(this._itp, this._values);
  }

  function mapEntries() {
    return sharedIterator(this._itp, this._keys, this._values);
  }

  function sharedIterator(itp, array, array2) {
    var p = [0];
    var done = false;
    itp.push(p);
    return {
      next: function next() {
        var v;
        var k = p[0];

        if (!done && k < array.length) {
          v = array2 ? [array[k], array2[k]] : array[k];
          p[0]++;
        } else {
          done = true;
          itp.splice(itp.indexOf(p), 1);
        }

        return {
          done: done,
          value: v
        };
      }
    };
  }

  function sharedSize() {
    return this._values.length;
  }

  function sharedForEach(callback, context) {
    var it = this.entries();

    for (;;) {
      var r = it.next();
      if (r.done) break;
      callback.call(context, r.value[1], r.value[0], this);
    }
  }

  var MapImpl = typeof Map === 'undefined' || !Map.prototype.values ? MapPolyfill : Map;
  /**
   * @see http://download.oracle.com/javase/6/docs/api/java/util/HashMap.html
   *
   * @extends {javascript.util.Map}
   * @constructor
   * @private
   */

  function HashMap() {
    /**
     * @type {Object}
     * @private
    */
    this.map_ = new MapImpl();
  }
  HashMap.prototype = new Map$1();
  /**
   * @override
   */

  HashMap.prototype.get = function (key) {
    return this.map_.get(key) || null;
  };
  /**
   * @override
   */


  HashMap.prototype.put = function (key, value) {
    this.map_.set(key, value);
    return value;
  };
  /**
   * @override
   */


  HashMap.prototype.values = function () {
    var arrayList = new ArrayList();
    var it = this.map_.values();
    var o = it.next();

    while (!o.done) {
      arrayList.add(o.value);
      o = it.next();
    }

    return arrayList;
  };
  /**
   * @override
   */


  HashMap.prototype.entrySet = function () {
    var hashSet = new HashSet();
    this.map_.entries().forEach(function (entry) {
      return hashSet.add(entry);
    });
    return hashSet;
  };
  /**
   * @override
   */


  HashMap.prototype.size = function () {
    return this.map_.size();
  };

  function PrecisionModel() {
    this._modelType = null;
    this._scale = null;

    if (arguments.length === 0) {
      this._modelType = PrecisionModel.FLOATING;
    } else if (arguments.length === 1) {
      if (arguments[0] instanceof Type) {
        var modelType = arguments[0];
        this._modelType = modelType;

        if (modelType === PrecisionModel.FIXED) {
          this.setScale(1.0);
        }
      } else if (typeof arguments[0] === "number") {
        var scale = arguments[0];
        this._modelType = PrecisionModel.FIXED;
        this.setScale(scale);
      } else if (arguments[0] instanceof PrecisionModel) {
        var pm = arguments[0];
        this._modelType = pm._modelType;
        this._scale = pm._scale;
      }
    }
  }
  extend(PrecisionModel.prototype, {
    equals: function equals(other) {
      if (!(other instanceof PrecisionModel)) {
        return false;
      }

      var otherPrecisionModel = other;
      return this._modelType === otherPrecisionModel._modelType && this._scale === otherPrecisionModel._scale;
    },
    compareTo: function compareTo(o) {
      var other = o;
      var sigDigits = this.getMaximumSignificantDigits();
      var otherSigDigits = other.getMaximumSignificantDigits();
      return new Integer(sigDigits).compareTo(new Integer(otherSigDigits));
    },
    getScale: function getScale() {
      return this._scale;
    },
    isFloating: function isFloating() {
      return this._modelType === PrecisionModel.FLOATING || this._modelType === PrecisionModel.FLOATING_SINGLE;
    },
    getType: function getType() {
      return this._modelType;
    },
    toString: function toString() {
      var description = "UNKNOWN";

      if (this._modelType === PrecisionModel.FLOATING) {
        description = "Floating";
      } else if (this._modelType === PrecisionModel.FLOATING_SINGLE) {
        description = "Floating-Single";
      } else if (this._modelType === PrecisionModel.FIXED) {
        description = "Fixed (Scale=" + this.getScale() + ")";
      }

      return description;
    },
    makePrecise: function makePrecise() {
      if (typeof arguments[0] === "number") {
        var val = arguments[0];
        if (Double.isNaN(val)) return val;

        if (this._modelType === PrecisionModel.FLOATING_SINGLE) {
          var floatSingleVal = val;
          return floatSingleVal;
        }

        if (this._modelType === PrecisionModel.FIXED) {
          return Math.round(val * this._scale) / this._scale;
        }

        return val;
      } else if (arguments[0] instanceof Coordinate) {
        var coord = arguments[0];
        if (this._modelType === PrecisionModel.FLOATING) return null;
        coord.x = this.makePrecise(coord.x);
        coord.y = this.makePrecise(coord.y);
      }
    },
    getMaximumSignificantDigits: function getMaximumSignificantDigits() {
      var maxSigDigits = 16;

      if (this._modelType === PrecisionModel.FLOATING) {
        maxSigDigits = 16;
      } else if (this._modelType === PrecisionModel.FLOATING_SINGLE) {
        maxSigDigits = 6;
      } else if (this._modelType === PrecisionModel.FIXED) {
        maxSigDigits = 1 + Math.trunc(Math.ceil(Math.log(this.getScale()) / Math.log(10)));
      }

      return maxSigDigits;
    },
    setScale: function setScale(scale) {
      this._scale = Math.abs(scale);
    },
    interfaces_: function interfaces_() {
      return [Serializable, Comparable];
    },
    getClass: function getClass() {
      return PrecisionModel;
    }
  });

  PrecisionModel.mostPrecise = function (pm1, pm2) {
    if (pm1.compareTo(pm2) >= 0) return pm1;
    return pm2;
  };

  function Type() {
    this._name = null;
    var name = arguments[0];
    this._name = name;
    Type.nameToTypeMap.put(name, this);
  }

  extend(Type.prototype, {
    readResolve: function readResolve() {
      return Type.nameToTypeMap.get(this._name);
    },
    toString: function toString() {
      return this._name;
    },
    interfaces_: function interfaces_() {
      return [Serializable];
    },
    getClass: function getClass() {
      return Type;
    }
  });
  Type.serialVersionUID = -5528602631731589822;
  Type.nameToTypeMap = new HashMap();
  PrecisionModel.Type = Type;
  PrecisionModel.serialVersionUID = 7777263578777803835;
  PrecisionModel.FIXED = new Type("FIXED");
  PrecisionModel.FLOATING = new Type("FLOATING");
  PrecisionModel.FLOATING_SINGLE = new Type("FLOATING SINGLE");
  PrecisionModel.maximumPreciseValue = 9007199254740992.0;

  function GeometryFactory() {
    this._precisionModel = null;
    this._coordinateSequenceFactory = null;
    this._SRID = null;

    if (arguments.length === 0) {
      GeometryFactory.call(this, new PrecisionModel(), 0);
    } else if (arguments.length === 1) {
      if (hasInterface(arguments[0], CoordinateSequenceFactory)) {
        var coordinateSequenceFactory = arguments[0];
        GeometryFactory.call(this, new PrecisionModel(), 0, coordinateSequenceFactory);
      } else if (arguments[0] instanceof PrecisionModel) {
        var precisionModel = arguments[0];
        GeometryFactory.call(this, precisionModel, 0, GeometryFactory.getDefaultCoordinateSequenceFactory());
      }
    } else if (arguments.length === 2) {
      var _precisionModel = arguments[0],
          SRID = arguments[1];
      GeometryFactory.call(this, _precisionModel, SRID, GeometryFactory.getDefaultCoordinateSequenceFactory());
    } else if (arguments.length === 3) {
      var _precisionModel2 = arguments[0],
          _SRID = arguments[1],
          _coordinateSequenceFactory = arguments[2];
      this._precisionModel = _precisionModel2;
      this._coordinateSequenceFactory = _coordinateSequenceFactory;
      this._SRID = _SRID;
    }
  }
  extend(GeometryFactory.prototype, {
    toGeometry: function toGeometry(envelope) {
      if (envelope.isNull()) {
        return this.createPoint();
      }

      if (envelope.getMinX() === envelope.getMaxX() && envelope.getMinY() === envelope.getMaxY()) {
        return this.createPoint(new Coordinate(envelope.getMinX(), envelope.getMinY()));
      }

      if (envelope.getMinX() === envelope.getMaxX() || envelope.getMinY() === envelope.getMaxY()) {
        return this.createLineString([new Coordinate(envelope.getMinX(), envelope.getMinY()), new Coordinate(envelope.getMaxX(), envelope.getMaxY())]);
      }

      return this.createPolygon(this.createLinearRing([new Coordinate(envelope.getMinX(), envelope.getMinY()), new Coordinate(envelope.getMinX(), envelope.getMaxY()), new Coordinate(envelope.getMaxX(), envelope.getMaxY()), new Coordinate(envelope.getMaxX(), envelope.getMinY()), new Coordinate(envelope.getMinX(), envelope.getMinY())]), null);
    },
    createLineString: function createLineString() {
      if (arguments.length === 0) {
        return this.createLineString(this.getCoordinateSequenceFactory().create([]));
      } else if (arguments.length === 1) {
        if (arguments[0] instanceof Array) {
          var coordinates = arguments[0];
          return this.createLineString(coordinates !== null ? this.getCoordinateSequenceFactory().create(coordinates) : null);
        } else if (hasInterface(arguments[0], CoordinateSequence)) {
          var _coordinates = arguments[0];
          return new LineString(_coordinates, this);
        }
      }
    },
    createMultiLineString: function createMultiLineString() {
      if (arguments.length === 0) {
        return new MultiLineString(null, this);
      } else if (arguments.length === 1) {
        var lineStrings = arguments[0];
        return new MultiLineString(lineStrings, this);
      }
    },
    buildGeometry: function buildGeometry(geomList) {
      var geomClass = null;
      var isHeterogeneous = false;
      var hasGeometryCollection = false;

      for (var i = geomList.iterator(); i.hasNext();) {
        var geom = i.next();
        var partClass = geom.getClass();

        if (geomClass === null) {
          geomClass = partClass;
        }

        if (partClass !== geomClass) {
          isHeterogeneous = true;
        }

        if (geom instanceof GeometryCollection) hasGeometryCollection = true;
      }

      if (geomClass === null) {
        return this.createGeometryCollection();
      }

      if (isHeterogeneous || hasGeometryCollection) {
        return this.createGeometryCollection(GeometryFactory.toGeometryArray(geomList));
      }

      var geom0 = geomList.iterator().next();
      var isCollection = geomList.size() > 1;

      if (isCollection) {
        if (geom0 instanceof Polygon) {
          return this.createMultiPolygon(GeometryFactory.toPolygonArray(geomList));
        } else if (geom0 instanceof LineString) {
          return this.createMultiLineString(GeometryFactory.toLineStringArray(geomList));
        } else if (geom0 instanceof Point) {
          return this.createMultiPoint(GeometryFactory.toPointArray(geomList));
        }

        Assert.shouldNeverReachHere("Unhandled class: " + geom0.getClass().getName());
      }

      return geom0;
    },
    createMultiPointFromCoords: function createMultiPointFromCoords(coordinates) {
      return this.createMultiPoint(coordinates !== null ? this.getCoordinateSequenceFactory().create(coordinates) : null);
    },
    createPoint: function createPoint() {
      if (arguments.length === 0) {
        return this.createPoint(this.getCoordinateSequenceFactory().create([]));
      } else if (arguments.length === 1) {
        if (arguments[0] instanceof Coordinate) {
          var coordinate = arguments[0];
          return this.createPoint(coordinate !== null ? this.getCoordinateSequenceFactory().create([coordinate]) : null);
        } else if (hasInterface(arguments[0], CoordinateSequence)) {
          var coordinates = arguments[0];
          return new Point(coordinates, this);
        }
      }
    },
    getCoordinateSequenceFactory: function getCoordinateSequenceFactory() {
      return this._coordinateSequenceFactory;
    },
    createPolygon: function createPolygon() {
      if (arguments.length === 0) {
        return this.createPolygon(null, null);
      } else if (arguments.length === 1) {
        if (hasInterface(arguments[0], CoordinateSequence)) {
          var shell = arguments[0];
          return this.createPolygon(this.createLinearRing(shell));
        } else if (arguments[0] instanceof Array) {
          var _shell = arguments[0];
          return this.createPolygon(this.createLinearRing(_shell));
        } else if (arguments[0] instanceof LinearRing) {
          var _shell2 = arguments[0];
          return this.createPolygon(_shell2, null);
        }
      } else if (arguments.length === 2) {
        var _shell3 = arguments[0],
            holes = arguments[1];
        return new Polygon(_shell3, holes, this);
      }
    },
    getSRID: function getSRID() {
      return this._SRID;
    },
    createGeometryCollection: function createGeometryCollection() {
      if (arguments.length === 0) {
        return new GeometryCollection(null, this);
      } else if (arguments.length === 1) {
        var geometries = arguments[0];
        return new GeometryCollection(geometries, this);
      }
    },
    createGeometry: function createGeometry(g) {
      var editor = new GeometryEditor(this);
      return editor.edit(g, {
        edit: function edit() {
          if (arguments.length === 2 && arguments[1] instanceof Geometry && hasInterface(arguments[0], CoordinateSequence)) {
            var coordSeq = arguments[0];
            return this._coordinateSequenceFactory.create(coordSeq);
          }
        }
      });
    },
    getPrecisionModel: function getPrecisionModel() {
      return this._precisionModel;
    },
    createLinearRing: function createLinearRing() {
      if (arguments.length === 0) {
        return this.createLinearRing(this.getCoordinateSequenceFactory().create([]));
      } else if (arguments.length === 1) {
        if (arguments[0] instanceof Array) {
          var coordinates = arguments[0];
          return this.createLinearRing(coordinates !== null ? this.getCoordinateSequenceFactory().create(coordinates) : null);
        } else if (hasInterface(arguments[0], CoordinateSequence)) {
          var _coordinates2 = arguments[0];
          return new LinearRing(_coordinates2, this);
        }
      }
    },
    createMultiPolygon: function createMultiPolygon() {
      if (arguments.length === 0) {
        return new MultiPolygon(null, this);
      } else if (arguments.length === 1) {
        var polygons = arguments[0];
        return new MultiPolygon(polygons, this);
      }
    },
    createMultiPoint: function createMultiPoint() {
      if (arguments.length === 0) {
        return new MultiPoint(null, this);
      } else if (arguments.length === 1) {
        if (arguments[0] instanceof Array) {
          var point = arguments[0];
          return new MultiPoint(point, this);
        } else if (hasInterface(arguments[0], CoordinateSequence)) {
          var coordinates = arguments[0];

          if (coordinates === null) {
            return this.createMultiPoint(new Array(0).fill(null));
          }

          var points = new Array(coordinates.size()).fill(null);

          for (var i = 0; i < coordinates.size(); i++) {
            var ptSeq = this.getCoordinateSequenceFactory().create(1, coordinates.getDimension());
            CoordinateSequences.copy(coordinates, i, ptSeq, 0, 1);
            points[i] = this.createPoint(ptSeq);
          }

          return this.createMultiPoint(points);
        }
      }
    },
    interfaces_: function interfaces_() {
      return [Serializable];
    },
    getClass: function getClass() {
      return GeometryFactory;
    }
  });

  GeometryFactory.toMultiPolygonArray = function (multiPolygons) {
    var multiPolygonArray = new Array(multiPolygons.size()).fill(null);
    return multiPolygons.toArray(multiPolygonArray);
  };

  GeometryFactory.toGeometryArray = function (geometries) {
    if (geometries === null) return null;
    var geometryArray = new Array(geometries.size()).fill(null);
    return geometries.toArray(geometryArray);
  };

  GeometryFactory.getDefaultCoordinateSequenceFactory = function () {
    return CoordinateArraySequenceFactory.instance();
  };

  GeometryFactory.toMultiLineStringArray = function (multiLineStrings) {
    var multiLineStringArray = new Array(multiLineStrings.size()).fill(null);
    return multiLineStrings.toArray(multiLineStringArray);
  };

  GeometryFactory.toLineStringArray = function (lineStrings) {
    var lineStringArray = new Array(lineStrings.size()).fill(null);
    return lineStrings.toArray(lineStringArray);
  };

  GeometryFactory.toMultiPointArray = function (multiPoints) {
    var multiPointArray = new Array(multiPoints.size()).fill(null);
    return multiPoints.toArray(multiPointArray);
  };

  GeometryFactory.toLinearRingArray = function (linearRings) {
    var linearRingArray = new Array(linearRings.size()).fill(null);
    return linearRings.toArray(linearRingArray);
  };

  GeometryFactory.toPointArray = function (points) {
    var pointArray = new Array(points.size()).fill(null);
    return points.toArray(pointArray);
  };

  GeometryFactory.toPolygonArray = function (polygons) {
    var polygonArray = new Array(polygons.size()).fill(null);
    return polygons.toArray(polygonArray);
  };

  GeometryFactory.createPointFromInternalCoord = function (coord, exemplar) {
    exemplar.getPrecisionModel().makePrecise(coord);
    return exemplar.getFactory().createPoint(coord);
  };

  GeometryFactory.serialVersionUID = -6820524753094095635;

  var regExes = {
    'typeStr': /^\s*(\w+)\s*\(\s*(.*)\s*\)\s*$/,
    'emptyTypeStr': /^\s*(\w+)\s*EMPTY\s*$/,
    'spaces': /\s+/,
    'parenComma': /\)\s*,\s*\(/,
    'doubleParenComma': /\)\s*\)\s*,\s*\(\s*\(/,
    // can't use {2} here
    'trimParens': /^\s*\(?(.*?)\)?\s*$/
    /**
     * Class for reading and writing Well-Known Text.
     *
     * NOTE: Adapted from OpenLayers 2.11 implementation.
     */

    /** Create a new parser for WKT
     *
     * @param {GeometryFactory} geometryFactory
     * @return An instance of WKTParser.
     * @constructor
     * @private
     */

  };
  function WKTParser(geometryFactory) {
    this.geometryFactory = geometryFactory || new GeometryFactory();
    this.precisionModel = this.geometryFactory.getPrecisionModel();
  }
  extend(WKTParser.prototype, {
    /**
     * Deserialize a WKT string and return a geometry. Supports WKT for POINT,
     * MULTIPOINT, LINESTRING, LINEARRING, MULTILINESTRING, POLYGON, MULTIPOLYGON,
     * and GEOMETRYCOLLECTION.
     *
     * @param {String} wkt A WKT string.
     * @return {Geometry} A geometry instance.
     * @private
     */
    read: function read(wkt) {
      var geometry, type, str;
      wkt = wkt.replace(/[\n\r]/g, ' ');
      var matches = regExes.typeStr.exec(wkt);

      if (wkt.search('EMPTY') !== -1) {
        matches = regExes.emptyTypeStr.exec(wkt);
        matches[2] = undefined;
      }

      if (matches) {
        type = matches[1].toLowerCase();
        str = matches[2];

        if (parse[type]) {
          geometry = parse[type].call(this, str);
        }
      }

      if (geometry === undefined) throw new Error('Could not parse WKT ' + wkt);
      return geometry;
    },

    /**
     * Serialize a geometry into a WKT string.
     *
     * @param {Geometry} geometry A feature or array of features.
     * @return {String} The WKT string representation of the input geometries.
     * @private
     */
    write: function write(geometry) {
      return this.extractGeometry(geometry);
    },

    /**
     * Entry point to construct the WKT for a single Geometry object.
     *
     * @param {Geometry} geometry
     * @return {String} A WKT string of representing the geometry.
     * @private
     */
    extractGeometry: function extractGeometry(geometry) {
      var type = geometry.getGeometryType().toLowerCase();

      if (!extract[type]) {
        return null;
      }

      var wktType = type.toUpperCase();
      var data;

      if (geometry.isEmpty()) {
        data = wktType + ' EMPTY';
      } else {
        data = wktType + '(' + extract[type].call(this, geometry) + ')';
      }

      return data;
    }
  });
  /**
   * Object with properties corresponding to the geometry types. Property values
   * are functions that do the actual data extraction.
   * @private
   */

  var extract = {
    coordinate: function coordinate(_coordinate) {
      return _coordinate.x + ' ' + _coordinate.y;
    },

    /**
     * Return a space delimited string of point coordinates.
     *
     * @param {Point}
     *          point
     * @return {String} A string of coordinates representing the point.
     */
    point: function point(_point) {
      return extract.coordinate.call(this, _point._coordinates._coordinates[0]);
    },

    /**
     * Return a comma delimited string of point coordinates from a multipoint.
     *
     * @param {MultiPoint}
     *          multipoint
     * @return {String} A string of point coordinate strings representing the
     *         multipoint.
     */
    multipoint: function multipoint(_multipoint) {
      var array = [];

      for (var i = 0, len = _multipoint._geometries.length; i < len; ++i) {
        array.push('(' + extract.point.call(this, _multipoint._geometries[i]) + ')');
      }

      return array.join(',');
    },

    /**
     * Return a comma delimited string of point coordinates from a line.
     *
     * @param {LineString} linestring
     * @return {String} A string of point coordinate strings representing the linestring.
     */
    linestring: function linestring(_linestring) {
      var array = [];

      for (var i = 0, len = _linestring._points._coordinates.length; i < len; ++i) {
        array.push(extract.coordinate.call(this, _linestring._points._coordinates[i]));
      }

      return array.join(',');
    },
    linearring: function linearring(_linearring) {
      var array = [];

      for (var i = 0, len = _linearring._points._coordinates.length; i < len; ++i) {
        array.push(extract.coordinate.call(this, _linearring._points._coordinates[i]));
      }

      return array.join(',');
    },

    /**
     * Return a comma delimited string of linestring strings from a
     * multilinestring.
     *
     * @param {MultiLineString} multilinestring
     * @return {String} A string of of linestring strings representing the multilinestring.
     */
    multilinestring: function multilinestring(_multilinestring) {
      var array = [];

      for (var i = 0, len = _multilinestring._geometries.length; i < len; ++i) {
        array.push('(' + extract.linestring.call(this, _multilinestring._geometries[i]) + ')');
      }

      return array.join(',');
    },

    /**
     * Return a comma delimited string of linear ring arrays from a polygon.
     *
     * @param {Polygon} polygon
     * @return {String} An array of linear ring arrays representing the polygon.
     */
    polygon: function polygon(_polygon) {
      var array = [];
      array.push('(' + extract.linestring.call(this, _polygon._shell) + ')');

      for (var i = 0, len = _polygon._holes.length; i < len; ++i) {
        array.push('(' + extract.linestring.call(this, _polygon._holes[i]) + ')');
      }

      return array.join(',');
    },

    /**
     * Return an array of polygon arrays from a multipolygon.
     *
     * @param {MultiPolygon} multipolygon
     * @return {String} An array of polygon arrays representing the multipolygon.
     */
    multipolygon: function multipolygon(_multipolygon) {
      var array = [];

      for (var i = 0, len = _multipolygon._geometries.length; i < len; ++i) {
        array.push('(' + extract.polygon.call(this, _multipolygon._geometries[i]) + ')');
      }

      return array.join(',');
    },

    /**
     * Return the WKT portion between 'GEOMETRYCOLLECTION(' and ')' for an
     * geometrycollection.
     *
     * @param {GeometryCollection} collection
     * @return {String} internal WKT representation of the collection.
     */
    geometrycollection: function geometrycollection(collection) {
      var array = [];

      for (var i = 0, len = collection._geometries.length; i < len; ++i) {
        array.push(this.extractGeometry(collection._geometries[i]));
      }

      return array.join(',');
    }
  };
  /**
   * Object with properties corresponding to the geometry types. Property values
   * are functions that do the actual parsing.
   * @private
   */

  var parse = {
    coord: function coord(str) {
      var coords = str.trim().split(regExes.spaces);
      var coord = new Coordinate(Number.parseFloat(coords[0]), Number.parseFloat(coords[1]));
      this.precisionModel.makePrecise(coord);
      return coord;
    },

    /**
     * Return point geometry given a point WKT fragment.
     *
     * @param {String} str A WKT fragment representing the point.
     * @return {Point} A point geometry.
     * @private
     */
    point: function point(str) {
      if (str === undefined) return this.geometryFactory.createPoint();
      return this.geometryFactory.createPoint(parse.coord.call(this, str));
    },

    /**
     * Return a multipoint geometry given a multipoint WKT fragment.
     *
     * @param {String} str A WKT fragment representing the multipoint.
     * @return {Point} A multipoint feature.
     * @private
     */
    multipoint: function multipoint(str) {
      if (str === undefined) return this.geometryFactory.createMultiPoint();
      var point;
      var points = str.trim().split(',');
      var components = [];

      for (var i = 0, len = points.length; i < len; ++i) {
        point = points[i].replace(regExes.trimParens, '$1');
        components.push(parse.point.call(this, point));
      }

      return this.geometryFactory.createMultiPoint(components);
    },

    /**
     * Return a linestring geometry given a linestring WKT fragment.
     *
     * @param {String} str A WKT fragment representing the linestring.
     * @return {LineString} A linestring geometry.
     * @private
     */
    linestring: function linestring(str) {
      if (str === undefined) {
        return this.geometryFactory.createLineString();
      }

      var points = str.trim().split(',');
      var components = [];

      for (var i = 0, len = points.length; i < len; ++i) {
        components.push(parse.coord.call(this, points[i]));
      }

      return this.geometryFactory.createLineString(components);
    },

    /**
     * Return a linearring geometry given a linearring WKT fragment.
     *
     * @param {String} str A WKT fragment representing the linearring.
     * @return {LinearRing} A linearring geometry.
     * @private
     */
    linearring: function linearring(str) {
      if (str === undefined) {
        return this.geometryFactory.createLinearRing();
      }

      var points = str.trim().split(',');
      var components = [];

      for (var i = 0, len = points.length; i < len; ++i) {
        components.push(parse.coord.call(this, points[i]));
      }

      return this.geometryFactory.createLinearRing(components);
    },

    /**
     * Return a multilinestring geometry given a multilinestring WKT fragment.
     *
     * @param {String} str A WKT fragment representing the multilinestring.
     * @return {MultiLineString} A multilinestring geometry.
     * @private
     */
    multilinestring: function multilinestring(str) {
      if (str === undefined) {
        return this.geometryFactory.createMultiLineString();
      }

      var line;
      var lines = str.trim().split(regExes.parenComma);
      var components = [];

      for (var i = 0, len = lines.length; i < len; ++i) {
        line = lines[i].replace(regExes.trimParens, '$1');
        components.push(parse.linestring.call(this, line));
      }

      return this.geometryFactory.createMultiLineString(components);
    },

    /**
     * Return a polygon geometry given a polygon WKT fragment.
     *
     * @param {String} str A WKT fragment representing the polygon.
     * @return {Polygon} A polygon geometry.
     * @private
     */
    polygon: function polygon(str) {
      if (str === undefined) {
        return this.geometryFactory.createPolygon();
      }

      var ring, linestring, linearring;
      var rings = str.trim().split(regExes.parenComma);
      var shell;
      var holes = [];

      for (var i = 0, len = rings.length; i < len; ++i) {
        ring = rings[i].replace(regExes.trimParens, '$1');
        linestring = parse.linestring.call(this, ring);
        linearring = this.geometryFactory.createLinearRing(linestring._points);

        if (i === 0) {
          shell = linearring;
        } else {
          holes.push(linearring);
        }
      }

      return this.geometryFactory.createPolygon(shell, holes);
    },

    /**
     * Return a multipolygon geometry given a multipolygon WKT fragment.
     *
     * @param {String} str A WKT fragment representing the multipolygon.
     * @return {MultiPolygon} A multipolygon geometry.
     * @private
     */
    multipolygon: function multipolygon(str) {
      if (str === undefined) {
        return this.geometryFactory.createMultiPolygon();
      }

      var polygon;
      var polygons = str.trim().split(regExes.doubleParenComma);
      var components = [];

      for (var i = 0, len = polygons.length; i < len; ++i) {
        polygon = polygons[i].replace(regExes.trimParens, '$1');
        components.push(parse.polygon.call(this, polygon));
      }

      return this.geometryFactory.createMultiPolygon(components);
    },

    /**
     * Return a geometrycollection given a geometrycollection WKT fragment.
     *
     * @param {String} str A WKT fragment representing the geometrycollection.
     * @return {GeometryCollection}
     * @private
     */
    geometrycollection: function geometrycollection(str) {
      if (str === undefined) {
        return this.geometryFactory.createGeometryCollection();
      } // separate components of the collection with |


      str = str.replace(/,\s*([A-Za-z])/g, '|$1');
      var wktArray = str.trim().split('|');
      var components = [];

      for (var i = 0, len = wktArray.length; i < len; ++i) {
        components.push(this.read(wktArray[i]));
      }

      return this.geometryFactory.createGeometryCollection(components);
    }
  };

  /**
   * @module org/locationtech/jts/io/WKTWriter
   */
  /**
   * Writes the Well-Known Text representation of a {@link Geometry}. The
   * Well-Known Text format is defined in the <A
   * HREF="http://www.opengis.org/techno/specs.htm"> OGC Simple Features
   * Specification for SQL</A>.
   * <p>
   * The <code>WKTWriter</code> outputs coordinates rounded to the precision
   * model. Only the maximum number of decimal places necessary to represent the
   * ordinates to the required precision will be output.
   * <p>
   * The SFS WKT spec does not define a special tag for {@link LinearRing}s.
   * Under the spec, rings are output as <code>LINESTRING</code>s.
   */

  /**
   * @param {GeometryFactory} geometryFactory
   * @constructor
   */

  function WKTWriter(geometryFactory) {
    this.parser = new WKTParser(geometryFactory);
  }
  extend(WKTWriter.prototype, {
    /**
     * Converts a <code>Geometry</code> to its Well-known Text representation.
     *
     * @param {Geometry} geometry a <code>Geometry</code> to process.
     * @return {string} a <Geometry Tagged Text> string (see the OpenGIS Simple
     *         Features Specification).
     * @memberof module:org/locationtech/jts/io/WKTWriter#
     */
    write: function write(geometry) {
      return this.parser.write(geometry);
    }
  });
  extend(WKTWriter, {
    /**
     * Generates the WKT for a <tt>LINESTRING</tt> specified by two
     * {@link Coordinate}s.
     *
     * @param p0 the first coordinate.
     * @param p1 the second coordinate.
     *
     * @return the WKT.
     * @private
     */
    toLineString: function toLineString(p0, p1) {
      if (arguments.length !== 2) {
        throw new Error('Not implemented');
      }

      return 'LINESTRING ( ' + p0.x + ' ' + p0.y + ', ' + p1.x + ' ' + p1.y + ' )';
    }
  });

  function LineIntersector() {
    this._result = null;
    this._inputLines = Array(2).fill().map(function () {
      return Array(2);
    });
    this._intPt = new Array(2).fill(null);
    this._intLineIndex = null;
    this._isProper = null;
    this._pa = null;
    this._pb = null;
    this._precisionModel = null;
    this._intPt[0] = new Coordinate();
    this._intPt[1] = new Coordinate();
    this._pa = this._intPt[0];
    this._pb = this._intPt[1];
    this._result = 0;
  }
  extend(LineIntersector.prototype, {
    getIndexAlongSegment: function getIndexAlongSegment(segmentIndex, intIndex) {
      this.computeIntLineIndex();
      return this._intLineIndex[segmentIndex][intIndex];
    },
    getTopologySummary: function getTopologySummary() {
      var catBuilder = new StringBuilder();
      if (this.isEndPoint()) catBuilder.append(" endpoint");
      if (this._isProper) catBuilder.append(" proper");
      if (this.isCollinear()) catBuilder.append(" collinear");
      return catBuilder.toString();
    },
    computeIntersection: function computeIntersection(p1, p2, p3, p4) {
      this._inputLines[0][0] = p1;
      this._inputLines[0][1] = p2;
      this._inputLines[1][0] = p3;
      this._inputLines[1][1] = p4;
      this._result = this.computeIntersect(p1, p2, p3, p4);
    },
    getIntersectionNum: function getIntersectionNum() {
      return this._result;
    },
    computeIntLineIndex: function computeIntLineIndex() {
      if (arguments.length === 0) {
        if (this._intLineIndex === null) {
          this._intLineIndex = Array(2).fill().map(function () {
            return Array(2);
          });
          this.computeIntLineIndex(0);
          this.computeIntLineIndex(1);
        }
      } else if (arguments.length === 1) {
        var segmentIndex = arguments[0];
        var dist0 = this.getEdgeDistance(segmentIndex, 0);
        var dist1 = this.getEdgeDistance(segmentIndex, 1);

        if (dist0 > dist1) {
          this._intLineIndex[segmentIndex][0] = 0;
          this._intLineIndex[segmentIndex][1] = 1;
        } else {
          this._intLineIndex[segmentIndex][0] = 1;
          this._intLineIndex[segmentIndex][1] = 0;
        }
      }
    },
    isProper: function isProper() {
      return this.hasIntersection() && this._isProper;
    },
    setPrecisionModel: function setPrecisionModel(precisionModel) {
      this._precisionModel = precisionModel;
    },
    isInteriorIntersection: function isInteriorIntersection() {
      if (arguments.length === 0) {
        if (this.isInteriorIntersection(0)) return true;
        if (this.isInteriorIntersection(1)) return true;
        return false;
      } else if (arguments.length === 1) {
        var inputLineIndex = arguments[0];

        for (var i = 0; i < this._result; i++) {
          if (!(this._intPt[i].equals2D(this._inputLines[inputLineIndex][0]) || this._intPt[i].equals2D(this._inputLines[inputLineIndex][1]))) {
            return true;
          }
        }

        return false;
      }
    },
    getIntersection: function getIntersection(intIndex) {
      return this._intPt[intIndex];
    },
    isEndPoint: function isEndPoint() {
      return this.hasIntersection() && !this._isProper;
    },
    hasIntersection: function hasIntersection() {
      return this._result !== LineIntersector.NO_INTERSECTION;
    },
    getEdgeDistance: function getEdgeDistance(segmentIndex, intIndex) {
      var dist = LineIntersector.computeEdgeDistance(this._intPt[intIndex], this._inputLines[segmentIndex][0], this._inputLines[segmentIndex][1]);
      return dist;
    },
    isCollinear: function isCollinear() {
      return this._result === LineIntersector.COLLINEAR_INTERSECTION;
    },
    toString: function toString() {
      return WKTWriter.toLineString(this._inputLines[0][0], this._inputLines[0][1]) + " - " + WKTWriter.toLineString(this._inputLines[1][0], this._inputLines[1][1]) + this.getTopologySummary();
    },
    getEndpoint: function getEndpoint(segmentIndex, ptIndex) {
      return this._inputLines[segmentIndex][ptIndex];
    },
    isIntersection: function isIntersection(pt) {
      for (var i = 0; i < this._result; i++) {
        if (this._intPt[i].equals2D(pt)) {
          return true;
        }
      }

      return false;
    },
    getIntersectionAlongSegment: function getIntersectionAlongSegment(segmentIndex, intIndex) {
      this.computeIntLineIndex();
      return this._intPt[this._intLineIndex[segmentIndex][intIndex]];
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return LineIntersector;
    }
  });

  LineIntersector.computeEdgeDistance = function (p, p0, p1) {
    var dx = Math.abs(p1.x - p0.x);
    var dy = Math.abs(p1.y - p0.y);
    var dist = -1.0;

    if (p.equals(p0)) {
      dist = 0.0;
    } else if (p.equals(p1)) {
      if (dx > dy) dist = dx;else dist = dy;
    } else {
      var pdx = Math.abs(p.x - p0.x);
      var pdy = Math.abs(p.y - p0.y);
      if (dx > dy) dist = pdx;else dist = pdy;

      if (dist === 0.0 && !p.equals(p0)) {
        dist = Math.max(pdx, pdy);
      }
    }

    Assert.isTrue(!(dist === 0.0 && !p.equals(p0)), "Bad distance calculation");
    return dist;
  };

  LineIntersector.nonRobustComputeEdgeDistance = function (p, p1, p2) {
    var dx = p.x - p1.x;
    var dy = p.y - p1.y;
    var dist = Math.sqrt(dx * dx + dy * dy);
    Assert.isTrue(!(dist === 0.0 && !p.equals(p1)), "Invalid distance calculation");
    return dist;
  };

  LineIntersector.DONT_INTERSECT = 0;
  LineIntersector.DO_INTERSECT = 1;
  LineIntersector.COLLINEAR = 2;
  LineIntersector.NO_INTERSECTION = 0;
  LineIntersector.POINT_INTERSECTION = 1;
  LineIntersector.COLLINEAR_INTERSECTION = 2;

  function RobustLineIntersector() {
    LineIntersector.apply(this);
  }
  inherits(RobustLineIntersector, LineIntersector);
  extend(RobustLineIntersector.prototype, {
    isInSegmentEnvelopes: function isInSegmentEnvelopes(intPt) {
      var env0 = new Envelope(this._inputLines[0][0], this._inputLines[0][1]);
      var env1 = new Envelope(this._inputLines[1][0], this._inputLines[1][1]);
      return env0.contains(intPt) && env1.contains(intPt);
    },
    computeIntersection: function computeIntersection() {
      if (arguments.length === 3) {
        var p = arguments[0],
            p1 = arguments[1],
            p2 = arguments[2];
        this._isProper = false;

        if (Envelope.intersects(p1, p2, p)) {
          if (Orientation.index(p1, p2, p) === 0 && Orientation.index(p2, p1, p) === 0) {
            this._isProper = true;

            if (p.equals(p1) || p.equals(p2)) {
              this._isProper = false;
            }

            this._result = LineIntersector.POINT_INTERSECTION;
            return null;
          }
        }

        this._result = LineIntersector.NO_INTERSECTION;
      } else return LineIntersector.prototype.computeIntersection.apply(this, arguments);
    },
    normalizeToMinimum: function normalizeToMinimum(n1, n2, n3, n4, normPt) {
      normPt.x = this.smallestInAbsValue(n1.x, n2.x, n3.x, n4.x);
      normPt.y = this.smallestInAbsValue(n1.y, n2.y, n3.y, n4.y);
      n1.x -= normPt.x;
      n1.y -= normPt.y;
      n2.x -= normPt.x;
      n2.y -= normPt.y;
      n3.x -= normPt.x;
      n3.y -= normPt.y;
      n4.x -= normPt.x;
      n4.y -= normPt.y;
    },
    safeHCoordinateIntersection: function safeHCoordinateIntersection(p1, p2, q1, q2) {
      var intPt = null;

      try {
        intPt = HCoordinate.intersection(p1, p2, q1, q2);
      } catch (e) {
        if (e instanceof NotRepresentableException) {
          intPt = RobustLineIntersector.nearestEndpoint(p1, p2, q1, q2);
        } else throw e;
      } finally {}

      return intPt;
    },
    intersection: function intersection(p1, p2, q1, q2) {
      var intPt = this.intersectionWithNormalization(p1, p2, q1, q2);

      if (!this.isInSegmentEnvelopes(intPt)) {
        intPt = new Coordinate(RobustLineIntersector.nearestEndpoint(p1, p2, q1, q2));
      }

      if (this._precisionModel !== null) {
        this._precisionModel.makePrecise(intPt);
      }

      return intPt;
    },
    smallestInAbsValue: function smallestInAbsValue(x1, x2, x3, x4) {
      var x = x1;
      var xabs = Math.abs(x);

      if (Math.abs(x2) < xabs) {
        x = x2;
        xabs = Math.abs(x2);
      }

      if (Math.abs(x3) < xabs) {
        x = x3;
        xabs = Math.abs(x3);
      }

      if (Math.abs(x4) < xabs) {
        x = x4;
      }

      return x;
    },
    checkDD: function checkDD(p1, p2, q1, q2, intPt) {
      var intPtDD = CGAlgorithmsDD.intersection(p1, p2, q1, q2);
      var isIn = this.isInSegmentEnvelopes(intPtDD);
      System.out.println("DD in env = " + isIn + "  --------------------- " + intPtDD);

      if (intPt.distance(intPtDD) > 0.0001) {
        System.out.println("Distance = " + intPt.distance(intPtDD));
      }
    },
    intersectionWithNormalization: function intersectionWithNormalization(p1, p2, q1, q2) {
      var n1 = new Coordinate(p1);
      var n2 = new Coordinate(p2);
      var n3 = new Coordinate(q1);
      var n4 = new Coordinate(q2);
      var normPt = new Coordinate();
      this.normalizeToEnvCentre(n1, n2, n3, n4, normPt);
      var intPt = this.safeHCoordinateIntersection(n1, n2, n3, n4);
      intPt.x += normPt.x;
      intPt.y += normPt.y;
      return intPt;
    },
    computeCollinearIntersection: function computeCollinearIntersection(p1, p2, q1, q2) {
      var p1q1p2 = Envelope.intersects(p1, p2, q1);
      var p1q2p2 = Envelope.intersects(p1, p2, q2);
      var q1p1q2 = Envelope.intersects(q1, q2, p1);
      var q1p2q2 = Envelope.intersects(q1, q2, p2);

      if (p1q1p2 && p1q2p2) {
        this._intPt[0] = q1;
        this._intPt[1] = q2;
        return LineIntersector.COLLINEAR_INTERSECTION;
      }

      if (q1p1q2 && q1p2q2) {
        this._intPt[0] = p1;
        this._intPt[1] = p2;
        return LineIntersector.COLLINEAR_INTERSECTION;
      }

      if (p1q1p2 && q1p1q2) {
        this._intPt[0] = q1;
        this._intPt[1] = p1;
        return q1.equals(p1) && !p1q2p2 && !q1p2q2 ? LineIntersector.POINT_INTERSECTION : LineIntersector.COLLINEAR_INTERSECTION;
      }

      if (p1q1p2 && q1p2q2) {
        this._intPt[0] = q1;
        this._intPt[1] = p2;
        return q1.equals(p2) && !p1q2p2 && !q1p1q2 ? LineIntersector.POINT_INTERSECTION : LineIntersector.COLLINEAR_INTERSECTION;
      }

      if (p1q2p2 && q1p1q2) {
        this._intPt[0] = q2;
        this._intPt[1] = p1;
        return q2.equals(p1) && !p1q1p2 && !q1p2q2 ? LineIntersector.POINT_INTERSECTION : LineIntersector.COLLINEAR_INTERSECTION;
      }

      if (p1q2p2 && q1p2q2) {
        this._intPt[0] = q2;
        this._intPt[1] = p2;
        return q2.equals(p2) && !p1q1p2 && !q1p1q2 ? LineIntersector.POINT_INTERSECTION : LineIntersector.COLLINEAR_INTERSECTION;
      }

      return LineIntersector.NO_INTERSECTION;
    },
    normalizeToEnvCentre: function normalizeToEnvCentre(n00, n01, n10, n11, normPt) {
      var minX0 = n00.x < n01.x ? n00.x : n01.x;
      var minY0 = n00.y < n01.y ? n00.y : n01.y;
      var maxX0 = n00.x > n01.x ? n00.x : n01.x;
      var maxY0 = n00.y > n01.y ? n00.y : n01.y;
      var minX1 = n10.x < n11.x ? n10.x : n11.x;
      var minY1 = n10.y < n11.y ? n10.y : n11.y;
      var maxX1 = n10.x > n11.x ? n10.x : n11.x;
      var maxY1 = n10.y > n11.y ? n10.y : n11.y;
      var intMinX = minX0 > minX1 ? minX0 : minX1;
      var intMaxX = maxX0 < maxX1 ? maxX0 : maxX1;
      var intMinY = minY0 > minY1 ? minY0 : minY1;
      var intMaxY = maxY0 < maxY1 ? maxY0 : maxY1;
      var intMidX = (intMinX + intMaxX) / 2.0;
      var intMidY = (intMinY + intMaxY) / 2.0;
      normPt.x = intMidX;
      normPt.y = intMidY;
      n00.x -= normPt.x;
      n00.y -= normPt.y;
      n01.x -= normPt.x;
      n01.y -= normPt.y;
      n10.x -= normPt.x;
      n10.y -= normPt.y;
      n11.x -= normPt.x;
      n11.y -= normPt.y;
    },
    computeIntersect: function computeIntersect(p1, p2, q1, q2) {
      this._isProper = false;
      if (!Envelope.intersects(p1, p2, q1, q2)) return LineIntersector.NO_INTERSECTION;
      var Pq1 = Orientation.index(p1, p2, q1);
      var Pq2 = Orientation.index(p1, p2, q2);

      if (Pq1 > 0 && Pq2 > 0 || Pq1 < 0 && Pq2 < 0) {
        return LineIntersector.NO_INTERSECTION;
      }

      var Qp1 = Orientation.index(q1, q2, p1);
      var Qp2 = Orientation.index(q1, q2, p2);

      if (Qp1 > 0 && Qp2 > 0 || Qp1 < 0 && Qp2 < 0) {
        return LineIntersector.NO_INTERSECTION;
      }

      var collinear = Pq1 === 0 && Pq2 === 0 && Qp1 === 0 && Qp2 === 0;

      if (collinear) {
        return this.computeCollinearIntersection(p1, p2, q1, q2);
      }

      if (Pq1 === 0 || Pq2 === 0 || Qp1 === 0 || Qp2 === 0) {
        this._isProper = false;

        if (p1.equals2D(q1) || p1.equals2D(q2)) {
          this._intPt[0] = p1;
        } else if (p2.equals2D(q1) || p2.equals2D(q2)) {
          this._intPt[0] = p2;
        } else if (Pq1 === 0) {
          this._intPt[0] = new Coordinate(q1);
        } else if (Pq2 === 0) {
          this._intPt[0] = new Coordinate(q2);
        } else if (Qp1 === 0) {
          this._intPt[0] = new Coordinate(p1);
        } else if (Qp2 === 0) {
          this._intPt[0] = new Coordinate(p2);
        }
      } else {
        this._isProper = true;
        this._intPt[0] = this.intersection(p1, p2, q1, q2);
      }

      return LineIntersector.POINT_INTERSECTION;
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return RobustLineIntersector;
    }
  });

  RobustLineIntersector.nearestEndpoint = function (p1, p2, q1, q2) {
    var nearestPt = p1;
    var minDist = Distance.pointToSegment(p1, q1, q2);
    var dist = Distance.pointToSegment(p2, q1, q2);

    if (dist < minDist) {
      minDist = dist;
      nearestPt = p2;
    }

    dist = Distance.pointToSegment(q1, p1, p2);

    if (dist < minDist) {
      minDist = dist;
      nearestPt = q1;
    }

    dist = Distance.pointToSegment(q2, p1, p2);

    if (dist < minDist) {
      minDist = dist;
      nearestPt = q2;
    }

    return nearestPt;
  };

  function LineSegment() {
    this.p0 = null;
    this.p1 = null;

    if (arguments.length === 0) {
      LineSegment.call(this, new Coordinate(), new Coordinate());
    } else if (arguments.length === 1) {
      var ls = arguments[0];
      LineSegment.call(this, ls.p0, ls.p1);
    } else if (arguments.length === 2) {
      var p0 = arguments[0],
          p1 = arguments[1];
      this.p0 = p0;
      this.p1 = p1;
    } else if (arguments.length === 4) {
      var x0 = arguments[0],
          y0 = arguments[1],
          x1 = arguments[2],
          y1 = arguments[3];
      LineSegment.call(this, new Coordinate(x0, y0), new Coordinate(x1, y1));
    }
  }
  extend(LineSegment.prototype, {
    minX: function minX() {
      return Math.min(this.p0.x, this.p1.x);
    },
    orientationIndex: function orientationIndex() {
      if (arguments[0] instanceof LineSegment) {
        var seg = arguments[0];
        var orient0 = Orientation.index(this.p0, this.p1, seg.p0);
        var orient1 = Orientation.index(this.p0, this.p1, seg.p1);
        if (orient0 >= 0 && orient1 >= 0) return Math.max(orient0, orient1);
        if (orient0 <= 0 && orient1 <= 0) return Math.max(orient0, orient1);
        return 0;
      } else if (arguments[0] instanceof Coordinate) {
        var p = arguments[0];
        return Orientation.index(this.p0, this.p1, p);
      }
    },
    toGeometry: function toGeometry(geomFactory) {
      return geomFactory.createLineString([this.p0, this.p1]);
    },
    isVertical: function isVertical() {
      return this.p0.x === this.p1.x;
    },
    equals: function equals(o) {
      if (!(o instanceof LineSegment)) {
        return false;
      }

      var other = o;
      return this.p0.equals(other.p0) && this.p1.equals(other.p1);
    },
    intersection: function intersection(line) {
      var li = new RobustLineIntersector();
      li.computeIntersection(this.p0, this.p1, line.p0, line.p1);
      if (li.hasIntersection()) return li.getIntersection(0);
      return null;
    },
    project: function project() {
      if (arguments[0] instanceof Coordinate) {
        var p = arguments[0];
        if (p.equals(this.p0) || p.equals(this.p1)) return new Coordinate(p);
        var r = this.projectionFactor(p);
        var coord = new Coordinate();
        coord.x = this.p0.x + r * (this.p1.x - this.p0.x);
        coord.y = this.p0.y + r * (this.p1.y - this.p0.y);
        return coord;
      } else if (arguments[0] instanceof LineSegment) {
        var seg = arguments[0];
        var pf0 = this.projectionFactor(seg.p0);
        var pf1 = this.projectionFactor(seg.p1);
        if (pf0 >= 1.0 && pf1 >= 1.0) return null;
        if (pf0 <= 0.0 && pf1 <= 0.0) return null;
        var newp0 = this.project(seg.p0);
        if (pf0 < 0.0) newp0 = this.p0;
        if (pf0 > 1.0) newp0 = this.p1;
        var newp1 = this.project(seg.p1);
        if (pf1 < 0.0) newp1 = this.p0;
        if (pf1 > 1.0) newp1 = this.p1;
        return new LineSegment(newp0, newp1);
      }
    },
    normalize: function normalize() {
      if (this.p1.compareTo(this.p0) < 0) this.reverse();
    },
    angle: function angle() {
      return Math.atan2(this.p1.y - this.p0.y, this.p1.x - this.p0.x);
    },
    getCoordinate: function getCoordinate(i) {
      if (i === 0) return this.p0;
      return this.p1;
    },
    distancePerpendicular: function distancePerpendicular(p) {
      return Distance.pointToLinePerpendicular(p, this.p0, this.p1);
    },
    minY: function minY() {
      return Math.min(this.p0.y, this.p1.y);
    },
    midPoint: function midPoint() {
      return LineSegment.midPoint(this.p0, this.p1);
    },
    projectionFactor: function projectionFactor(p) {
      if (p.equals(this.p0)) return 0.0;
      if (p.equals(this.p1)) return 1.0;
      var dx = this.p1.x - this.p0.x;
      var dy = this.p1.y - this.p0.y;
      var len = dx * dx + dy * dy;
      if (len <= 0.0) return Double.NaN;
      var r = ((p.x - this.p0.x) * dx + (p.y - this.p0.y) * dy) / len;
      return r;
    },
    closestPoints: function closestPoints(line) {
      var intPt = this.intersection(line);

      if (intPt !== null) {
        return [intPt, intPt];
      }

      var closestPt = new Array(2).fill(null);
      var minDistance = Double.MAX_VALUE;
      var dist = null;
      var close00 = this.closestPoint(line.p0);
      minDistance = close00.distance(line.p0);
      closestPt[0] = close00;
      closestPt[1] = line.p0;
      var close01 = this.closestPoint(line.p1);
      dist = close01.distance(line.p1);

      if (dist < minDistance) {
        minDistance = dist;
        closestPt[0] = close01;
        closestPt[1] = line.p1;
      }

      var close10 = line.closestPoint(this.p0);
      dist = close10.distance(this.p0);

      if (dist < minDistance) {
        minDistance = dist;
        closestPt[0] = this.p0;
        closestPt[1] = close10;
      }

      var close11 = line.closestPoint(this.p1);
      dist = close11.distance(this.p1);

      if (dist < minDistance) {
        minDistance = dist;
        closestPt[0] = this.p1;
        closestPt[1] = close11;
      }

      return closestPt;
    },
    closestPoint: function closestPoint(p) {
      var factor = this.projectionFactor(p);

      if (factor > 0 && factor < 1) {
        return this.project(p);
      }

      var dist0 = this.p0.distance(p);
      var dist1 = this.p1.distance(p);
      if (dist0 < dist1) return this.p0;
      return this.p1;
    },
    maxX: function maxX() {
      return Math.max(this.p0.x, this.p1.x);
    },
    getLength: function getLength() {
      return this.p0.distance(this.p1);
    },
    compareTo: function compareTo(o) {
      var other = o;
      var comp0 = this.p0.compareTo(other.p0);
      if (comp0 !== 0) return comp0;
      return this.p1.compareTo(other.p1);
    },
    reverse: function reverse() {
      var temp = this.p0;
      this.p0 = this.p1;
      this.p1 = temp;
    },
    equalsTopo: function equalsTopo(other) {
      return this.p0.equals(other.p0) && this.p1.equals(other.p1) || this.p0.equals(other.p1) && this.p1.equals(other.p0);
    },
    lineIntersection: function lineIntersection(line) {
      try {
        var intPt = HCoordinate.intersection(this.p0, this.p1, line.p0, line.p1);
        return intPt;
      } catch (ex) {
        if (ex instanceof NotRepresentableException) ; else throw ex;
      } finally {}

      return null;
    },
    maxY: function maxY() {
      return Math.max(this.p0.y, this.p1.y);
    },
    pointAlongOffset: function pointAlongOffset(segmentLengthFraction, offsetDistance) {
      var segx = this.p0.x + segmentLengthFraction * (this.p1.x - this.p0.x);
      var segy = this.p0.y + segmentLengthFraction * (this.p1.y - this.p0.y);
      var dx = this.p1.x - this.p0.x;
      var dy = this.p1.y - this.p0.y;
      var len = Math.sqrt(dx * dx + dy * dy);
      var ux = 0.0;
      var uy = 0.0;

      if (offsetDistance !== 0.0) {
        if (len <= 0.0) throw new IllegalStateException("Cannot compute offset from zero-length line segment");
        ux = offsetDistance * dx / len;
        uy = offsetDistance * dy / len;
      }

      var offsetx = segx - uy;
      var offsety = segy + ux;
      var coord = new Coordinate(offsetx, offsety);
      return coord;
    },
    setCoordinates: function setCoordinates() {
      if (arguments.length === 1) {
        var ls = arguments[0];
        this.setCoordinates(ls.p0, ls.p1);
      } else if (arguments.length === 2) {
        var p0 = arguments[0],
            p1 = arguments[1];
        this.p0.x = p0.x;
        this.p0.y = p0.y;
        this.p1.x = p1.x;
        this.p1.y = p1.y;
      }
    },
    segmentFraction: function segmentFraction(inputPt) {
      var segFrac = this.projectionFactor(inputPt);
      if (segFrac < 0.0) segFrac = 0.0;else if (segFrac > 1.0 || Double.isNaN(segFrac)) segFrac = 1.0;
      return segFrac;
    },
    toString: function toString() {
      return "LINESTRING( " + this.p0.x + " " + this.p0.y + ", " + this.p1.x + " " + this.p1.y + ")";
    },
    isHorizontal: function isHorizontal() {
      return this.p0.y === this.p1.y;
    },
    distance: function distance() {
      if (arguments[0] instanceof LineSegment) {
        var ls = arguments[0];
        return Distance.segmentToSegment(this.p0, this.p1, ls.p0, ls.p1);
      } else if (arguments[0] instanceof Coordinate) {
        var p = arguments[0];
        return Distance.pointToSegment(p, this.p0, this.p1);
      }
    },
    pointAlong: function pointAlong(segmentLengthFraction) {
      var coord = new Coordinate();
      coord.x = this.p0.x + segmentLengthFraction * (this.p1.x - this.p0.x);
      coord.y = this.p0.y + segmentLengthFraction * (this.p1.y - this.p0.y);
      return coord;
    },
    hashCode: function hashCode() {
      var bits0 = java.lang.Double.doubleToLongBits(this.p0.x);
      bits0 ^= java.lang.Double.doubleToLongBits(this.p0.y) * 31;
      var hash0 = Math.trunc(bits0) ^ Math.trunc(bits0 >> 32);
      var bits1 = java.lang.Double.doubleToLongBits(this.p1.x);
      bits1 ^= java.lang.Double.doubleToLongBits(this.p1.y) * 31;
      var hash1 = Math.trunc(bits1) ^ Math.trunc(bits1 >> 32);
      return hash0 ^ hash1;
    },
    interfaces_: function interfaces_() {
      return [Comparable, Serializable];
    },
    getClass: function getClass() {
      return LineSegment;
    }
  });

  LineSegment.midPoint = function (p0, p1) {
    return new Coordinate((p0.x + p1.x) / 2, (p0.y + p1.y) / 2);
  };

  LineSegment.serialVersionUID = 3252005833466256227;

  function Location() {}
  extend(Location.prototype, {
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return Location;
    }
  });

  Location.toLocationSymbol = function (locationValue) {
    switch (locationValue) {
      case Location.EXTERIOR:
        return 'e';

      case Location.BOUNDARY:
        return 'b';

      case Location.INTERIOR:
        return 'i';

      case Location.NONE:
        return '-';
    }

    throw new IllegalArgumentException("Unknown location value: " + locationValue);
  };

  Location.INTERIOR = 0;
  Location.BOUNDARY = 1;
  Location.EXTERIOR = 2;
  Location.NONE = -1;

  function IntersectionMatrix() {
    this._matrix = null;

    if (arguments.length === 0) {
      this._matrix = Array(3).fill().map(function () {
        return Array(3);
      });
      this.setAll(Dimension.FALSE);
    } else if (arguments.length === 1) {
      if (typeof arguments[0] === "string") {
        var elements = arguments[0];
        IntersectionMatrix.call(this);
        this.set(elements);
      } else if (arguments[0] instanceof IntersectionMatrix) {
        var other = arguments[0];
        IntersectionMatrix.call(this);
        this._matrix[Location.INTERIOR][Location.INTERIOR] = other._matrix[Location.INTERIOR][Location.INTERIOR];
        this._matrix[Location.INTERIOR][Location.BOUNDARY] = other._matrix[Location.INTERIOR][Location.BOUNDARY];
        this._matrix[Location.INTERIOR][Location.EXTERIOR] = other._matrix[Location.INTERIOR][Location.EXTERIOR];
        this._matrix[Location.BOUNDARY][Location.INTERIOR] = other._matrix[Location.BOUNDARY][Location.INTERIOR];
        this._matrix[Location.BOUNDARY][Location.BOUNDARY] = other._matrix[Location.BOUNDARY][Location.BOUNDARY];
        this._matrix[Location.BOUNDARY][Location.EXTERIOR] = other._matrix[Location.BOUNDARY][Location.EXTERIOR];
        this._matrix[Location.EXTERIOR][Location.INTERIOR] = other._matrix[Location.EXTERIOR][Location.INTERIOR];
        this._matrix[Location.EXTERIOR][Location.BOUNDARY] = other._matrix[Location.EXTERIOR][Location.BOUNDARY];
        this._matrix[Location.EXTERIOR][Location.EXTERIOR] = other._matrix[Location.EXTERIOR][Location.EXTERIOR];
      }
    }
  }
  extend(IntersectionMatrix.prototype, {
    isIntersects: function isIntersects() {
      return !this.isDisjoint();
    },
    isCovers: function isCovers() {
      var hasPointInCommon = IntersectionMatrix.isTrue(this._matrix[Location.INTERIOR][Location.INTERIOR]) || IntersectionMatrix.isTrue(this._matrix[Location.INTERIOR][Location.BOUNDARY]) || IntersectionMatrix.isTrue(this._matrix[Location.BOUNDARY][Location.INTERIOR]) || IntersectionMatrix.isTrue(this._matrix[Location.BOUNDARY][Location.BOUNDARY]);
      return hasPointInCommon && this._matrix[Location.EXTERIOR][Location.INTERIOR] === Dimension.FALSE && this._matrix[Location.EXTERIOR][Location.BOUNDARY] === Dimension.FALSE;
    },
    isCoveredBy: function isCoveredBy() {
      var hasPointInCommon = IntersectionMatrix.isTrue(this._matrix[Location.INTERIOR][Location.INTERIOR]) || IntersectionMatrix.isTrue(this._matrix[Location.INTERIOR][Location.BOUNDARY]) || IntersectionMatrix.isTrue(this._matrix[Location.BOUNDARY][Location.INTERIOR]) || IntersectionMatrix.isTrue(this._matrix[Location.BOUNDARY][Location.BOUNDARY]);
      return hasPointInCommon && this._matrix[Location.INTERIOR][Location.EXTERIOR] === Dimension.FALSE && this._matrix[Location.BOUNDARY][Location.EXTERIOR] === Dimension.FALSE;
    },
    set: function set() {
      if (arguments.length === 1) {
        var dimensionSymbols = arguments[0];

        for (var i = 0; i < dimensionSymbols.length; i++) {
          var row = Math.trunc(i / 3);
          var col = i % 3;
          this._matrix[row][col] = Dimension.toDimensionValue(dimensionSymbols.charAt(i));
        }
      } else if (arguments.length === 3) {
        var _row = arguments[0],
            column = arguments[1],
            dimensionValue = arguments[2];
        this._matrix[_row][column] = dimensionValue;
      }
    },
    isContains: function isContains() {
      return IntersectionMatrix.isTrue(this._matrix[Location.INTERIOR][Location.INTERIOR]) && this._matrix[Location.EXTERIOR][Location.INTERIOR] === Dimension.FALSE && this._matrix[Location.EXTERIOR][Location.BOUNDARY] === Dimension.FALSE;
    },
    setAtLeast: function setAtLeast() {
      if (arguments.length === 1) {
        var minimumDimensionSymbols = arguments[0];

        for (var i = 0; i < minimumDimensionSymbols.length; i++) {
          var row = Math.trunc(i / 3);
          var col = i % 3;
          this.setAtLeast(row, col, Dimension.toDimensionValue(minimumDimensionSymbols.charAt(i)));
        }
      } else if (arguments.length === 3) {
        var _row2 = arguments[0],
            column = arguments[1],
            minimumDimensionValue = arguments[2];

        if (this._matrix[_row2][column] < minimumDimensionValue) {
          this._matrix[_row2][column] = minimumDimensionValue;
        }
      }
    },
    setAtLeastIfValid: function setAtLeastIfValid(row, column, minimumDimensionValue) {
      if (row >= 0 && column >= 0) {
        this.setAtLeast(row, column, minimumDimensionValue);
      }
    },
    isWithin: function isWithin() {
      return IntersectionMatrix.isTrue(this._matrix[Location.INTERIOR][Location.INTERIOR]) && this._matrix[Location.INTERIOR][Location.EXTERIOR] === Dimension.FALSE && this._matrix[Location.BOUNDARY][Location.EXTERIOR] === Dimension.FALSE;
    },
    isTouches: function isTouches(dimensionOfGeometryA, dimensionOfGeometryB) {
      if (dimensionOfGeometryA > dimensionOfGeometryB) {
        return this.isTouches(dimensionOfGeometryB, dimensionOfGeometryA);
      }

      if (dimensionOfGeometryA === Dimension.A && dimensionOfGeometryB === Dimension.A || dimensionOfGeometryA === Dimension.L && dimensionOfGeometryB === Dimension.L || dimensionOfGeometryA === Dimension.L && dimensionOfGeometryB === Dimension.A || dimensionOfGeometryA === Dimension.P && dimensionOfGeometryB === Dimension.A || dimensionOfGeometryA === Dimension.P && dimensionOfGeometryB === Dimension.L) {
        return this._matrix[Location.INTERIOR][Location.INTERIOR] === Dimension.FALSE && (IntersectionMatrix.isTrue(this._matrix[Location.INTERIOR][Location.BOUNDARY]) || IntersectionMatrix.isTrue(this._matrix[Location.BOUNDARY][Location.INTERIOR]) || IntersectionMatrix.isTrue(this._matrix[Location.BOUNDARY][Location.BOUNDARY]));
      }

      return false;
    },
    isOverlaps: function isOverlaps(dimensionOfGeometryA, dimensionOfGeometryB) {
      if (dimensionOfGeometryA === Dimension.P && dimensionOfGeometryB === Dimension.P || dimensionOfGeometryA === Dimension.A && dimensionOfGeometryB === Dimension.A) {
        return IntersectionMatrix.isTrue(this._matrix[Location.INTERIOR][Location.INTERIOR]) && IntersectionMatrix.isTrue(this._matrix[Location.INTERIOR][Location.EXTERIOR]) && IntersectionMatrix.isTrue(this._matrix[Location.EXTERIOR][Location.INTERIOR]);
      }

      if (dimensionOfGeometryA === Dimension.L && dimensionOfGeometryB === Dimension.L) {
        return this._matrix[Location.INTERIOR][Location.INTERIOR] === 1 && IntersectionMatrix.isTrue(this._matrix[Location.INTERIOR][Location.EXTERIOR]) && IntersectionMatrix.isTrue(this._matrix[Location.EXTERIOR][Location.INTERIOR]);
      }

      return false;
    },
    isEquals: function isEquals(dimensionOfGeometryA, dimensionOfGeometryB) {
      if (dimensionOfGeometryA !== dimensionOfGeometryB) {
        return false;
      }

      return IntersectionMatrix.isTrue(this._matrix[Location.INTERIOR][Location.INTERIOR]) && this._matrix[Location.INTERIOR][Location.EXTERIOR] === Dimension.FALSE && this._matrix[Location.BOUNDARY][Location.EXTERIOR] === Dimension.FALSE && this._matrix[Location.EXTERIOR][Location.INTERIOR] === Dimension.FALSE && this._matrix[Location.EXTERIOR][Location.BOUNDARY] === Dimension.FALSE;
    },
    toString: function toString() {
      var builder = new StringBuilder("123456789");

      for (var ai = 0; ai < 3; ai++) {
        for (var bi = 0; bi < 3; bi++) {
          builder.setCharAt(3 * ai + bi, Dimension.toDimensionSymbol(this._matrix[ai][bi]));
        }
      }

      return builder.toString();
    },
    setAll: function setAll(dimensionValue) {
      for (var ai = 0; ai < 3; ai++) {
        for (var bi = 0; bi < 3; bi++) {
          this._matrix[ai][bi] = dimensionValue;
        }
      }
    },
    get: function get(row, column) {
      return this._matrix[row][column];
    },
    transpose: function transpose() {
      var temp = this._matrix[1][0];
      this._matrix[1][0] = this._matrix[0][1];
      this._matrix[0][1] = temp;
      temp = this._matrix[2][0];
      this._matrix[2][0] = this._matrix[0][2];
      this._matrix[0][2] = temp;
      temp = this._matrix[2][1];
      this._matrix[2][1] = this._matrix[1][2];
      this._matrix[1][2] = temp;
      return this;
    },
    matches: function matches(requiredDimensionSymbols) {
      if (requiredDimensionSymbols.length !== 9) {
        throw new IllegalArgumentException("Should be length 9: " + requiredDimensionSymbols);
      }

      for (var ai = 0; ai < 3; ai++) {
        for (var bi = 0; bi < 3; bi++) {
          if (!IntersectionMatrix.matches(this._matrix[ai][bi], requiredDimensionSymbols.charAt(3 * ai + bi))) {
            return false;
          }
        }
      }

      return true;
    },
    add: function add(im) {
      for (var i = 0; i < 3; i++) {
        for (var j = 0; j < 3; j++) {
          this.setAtLeast(i, j, im.get(i, j));
        }
      }
    },
    isDisjoint: function isDisjoint() {
      return this._matrix[Location.INTERIOR][Location.INTERIOR] === Dimension.FALSE && this._matrix[Location.INTERIOR][Location.BOUNDARY] === Dimension.FALSE && this._matrix[Location.BOUNDARY][Location.INTERIOR] === Dimension.FALSE && this._matrix[Location.BOUNDARY][Location.BOUNDARY] === Dimension.FALSE;
    },
    isCrosses: function isCrosses(dimensionOfGeometryA, dimensionOfGeometryB) {
      if (dimensionOfGeometryA === Dimension.P && dimensionOfGeometryB === Dimension.L || dimensionOfGeometryA === Dimension.P && dimensionOfGeometryB === Dimension.A || dimensionOfGeometryA === Dimension.L && dimensionOfGeometryB === Dimension.A) {
        return IntersectionMatrix.isTrue(this._matrix[Location.INTERIOR][Location.INTERIOR]) && IntersectionMatrix.isTrue(this._matrix[Location.INTERIOR][Location.EXTERIOR]);
      }

      if (dimensionOfGeometryA === Dimension.L && dimensionOfGeometryB === Dimension.P || dimensionOfGeometryA === Dimension.A && dimensionOfGeometryB === Dimension.P || dimensionOfGeometryA === Dimension.A && dimensionOfGeometryB === Dimension.L) {
        return IntersectionMatrix.isTrue(this._matrix[Location.INTERIOR][Location.INTERIOR]) && IntersectionMatrix.isTrue(this._matrix[Location.EXTERIOR][Location.INTERIOR]);
      }

      if (dimensionOfGeometryA === Dimension.L && dimensionOfGeometryB === Dimension.L) {
        return this._matrix[Location.INTERIOR][Location.INTERIOR] === 0;
      }

      return false;
    },
    interfaces_: function interfaces_() {
      return [Clonable];
    },
    getClass: function getClass() {
      return IntersectionMatrix;
    }
  });

  IntersectionMatrix.matches = function () {
    if (Number.isInteger(arguments[0]) && typeof arguments[1] === "string") {
      var actualDimensionValue = arguments[0],
          requiredDimensionSymbol = arguments[1];

      if (requiredDimensionSymbol === Dimension.SYM_DONTCARE) {
        return true;
      }

      if (requiredDimensionSymbol === Dimension.SYM_TRUE && (actualDimensionValue >= 0 || actualDimensionValue === Dimension.TRUE)) {
        return true;
      }

      if (requiredDimensionSymbol === Dimension.SYM_FALSE && actualDimensionValue === Dimension.FALSE) {
        return true;
      }

      if (requiredDimensionSymbol === Dimension.SYM_P && actualDimensionValue === Dimension.P) {
        return true;
      }

      if (requiredDimensionSymbol === Dimension.SYM_L && actualDimensionValue === Dimension.L) {
        return true;
      }

      if (requiredDimensionSymbol === Dimension.SYM_A && actualDimensionValue === Dimension.A) {
        return true;
      }

      return false;
    } else if (typeof arguments[0] === "string" && typeof arguments[1] === "string") {
      var actualDimensionSymbols = arguments[0],
          requiredDimensionSymbols = arguments[1];
      var m = new IntersectionMatrix(actualDimensionSymbols);
      return m.matches(requiredDimensionSymbols);
    }
  };

  IntersectionMatrix.isTrue = function (actualDimensionValue) {
    if (actualDimensionValue >= 0 || actualDimensionValue === Dimension.TRUE) {
      return true;
    }

    return false;
  };

  function Angle() {}
  extend(Angle.prototype, {
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return Angle;
    }
  });

  Angle.toDegrees = function (radians) {
    return radians * 180 / Math.PI;
  };

  Angle.normalize = function (angle) {
    while (angle > Math.PI) {
      angle -= Angle.PI_TIMES_2;
    }

    while (angle <= -Math.PI) {
      angle += Angle.PI_TIMES_2;
    }

    return angle;
  };

  Angle.angle = function () {
    if (arguments.length === 1) {
      var p = arguments[0];
      return Math.atan2(p.y, p.x);
    } else if (arguments.length === 2) {
      var p0 = arguments[0],
          p1 = arguments[1];
      var dx = p1.x - p0.x;
      var dy = p1.y - p0.y;
      return Math.atan2(dy, dx);
    }
  };

  Angle.isAcute = function (p0, p1, p2) {
    var dx0 = p0.x - p1.x;
    var dy0 = p0.y - p1.y;
    var dx1 = p2.x - p1.x;
    var dy1 = p2.y - p1.y;
    var dotprod = dx0 * dx1 + dy0 * dy1;
    return dotprod > 0;
  };

  Angle.isObtuse = function (p0, p1, p2) {
    var dx0 = p0.x - p1.x;
    var dy0 = p0.y - p1.y;
    var dx1 = p2.x - p1.x;
    var dy1 = p2.y - p1.y;
    var dotprod = dx0 * dx1 + dy0 * dy1;
    return dotprod < 0;
  };

  Angle.interiorAngle = function (p0, p1, p2) {
    var anglePrev = Angle.angle(p1, p0);
    var angleNext = Angle.angle(p1, p2);
    return Math.abs(angleNext - anglePrev);
  };

  Angle.normalizePositive = function (angle) {
    if (angle < 0.0) {
      while (angle < 0.0) {
        angle += Angle.PI_TIMES_2;
      }

      if (angle >= Angle.PI_TIMES_2) angle = 0.0;
    } else {
      while (angle >= Angle.PI_TIMES_2) {
        angle -= Angle.PI_TIMES_2;
      }

      if (angle < 0.0) angle = 0.0;
    }

    return angle;
  };

  Angle.angleBetween = function (tip1, tail, tip2) {
    var a1 = Angle.angle(tail, tip1);
    var a2 = Angle.angle(tail, tip2);
    return Angle.diff(a1, a2);
  };

  Angle.diff = function (ang1, ang2) {
    var delAngle = null;

    if (ang1 < ang2) {
      delAngle = ang2 - ang1;
    } else {
      delAngle = ang1 - ang2;
    }

    if (delAngle > Math.PI) {
      delAngle = 2 * Math.PI - delAngle;
    }

    return delAngle;
  };

  Angle.toRadians = function (angleDegrees) {
    return angleDegrees * Math.PI / 180.0;
  };

  Angle.getTurn = function (ang1, ang2) {
    var crossproduct = Math.sin(ang2 - ang1);

    if (crossproduct > 0) {
      return Angle.COUNTERCLOCKWISE;
    }

    if (crossproduct < 0) {
      return Angle.CLOCKWISE;
    }

    return Angle.NONE;
  };

  Angle.angleBetweenOriented = function (tip1, tail, tip2) {
    var a1 = Angle.angle(tail, tip1);
    var a2 = Angle.angle(tail, tip2);
    var angDel = a2 - a1;
    if (angDel <= -Math.PI) return angDel + Angle.PI_TIMES_2;
    if (angDel > Math.PI) return angDel - Angle.PI_TIMES_2;
    return angDel;
  };

  Angle.PI_TIMES_2 = 2.0 * Math.PI;
  Angle.PI_OVER_2 = Math.PI / 2.0;
  Angle.PI_OVER_4 = Math.PI / 4.0;
  Angle.COUNTERCLOCKWISE = Orientation.COUNTERCLOCKWISE;
  Angle.CLOCKWISE = Orientation.CLOCKWISE;
  Angle.NONE = Orientation.COLLINEAR;

  function Triangle() {
    this.p0 = null;
    this.p1 = null;
    this.p2 = null;
    var p0 = arguments[0],
        p1 = arguments[1],
        p2 = arguments[2];
    this.p0 = p0;
    this.p1 = p1;
    this.p2 = p2;
  }
  extend(Triangle.prototype, {
    area: function area() {
      return Triangle.area(this.p0, this.p1, this.p2);
    },
    signedArea: function signedArea() {
      return Triangle.signedArea(this.p0, this.p1, this.p2);
    },
    interpolateZ: function interpolateZ(p) {
      if (p === null) throw new IllegalArgumentException("Supplied point is null.");
      return Triangle.interpolateZ(p, this.p0, this.p1, this.p2);
    },
    longestSideLength: function longestSideLength() {
      return Triangle.longestSideLength(this.p0, this.p1, this.p2);
    },
    isAcute: function isAcute() {
      return Triangle.isAcute(this.p0, this.p1, this.p2);
    },
    circumcentre: function circumcentre() {
      return Triangle.circumcentre(this.p0, this.p1, this.p2);
    },
    area3D: function area3D() {
      return Triangle.area3D(this.p0, this.p1, this.p2);
    },
    centroid: function centroid() {
      return Triangle.centroid(this.p0, this.p1, this.p2);
    },
    inCentre: function inCentre() {
      return Triangle.inCentre(this.p0, this.p1, this.p2);
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return Triangle;
    }
  });

  Triangle.area = function (a, b, c) {
    return Math.abs(((c.x - a.x) * (b.y - a.y) - (b.x - a.x) * (c.y - a.y)) / 2);
  };

  Triangle.signedArea = function (a, b, c) {
    return ((c.x - a.x) * (b.y - a.y) - (b.x - a.x) * (c.y - a.y)) / 2;
  };

  Triangle.det = function (m00, m01, m10, m11) {
    return m00 * m11 - m01 * m10;
  };

  Triangle.interpolateZ = function (p, v0, v1, v2) {
    var x0 = v0.x;
    var y0 = v0.y;
    var a = v1.x - x0;
    var b = v2.x - x0;
    var c = v1.y - y0;
    var d = v2.y - y0;
    var det = a * d - b * c;
    var dx = p.x - x0;
    var dy = p.y - y0;
    var t = (d * dx - b * dy) / det;
    var u = (-c * dx + a * dy) / det;
    var z = v0.z + t * (v1.z - v0.z) + u * (v2.z - v0.z);
    return z;
  };

  Triangle.longestSideLength = function (a, b, c) {
    var lenAB = a.distance(b);
    var lenBC = b.distance(c);
    var lenCA = c.distance(a);
    var maxLen = lenAB;
    if (lenBC > maxLen) maxLen = lenBC;
    if (lenCA > maxLen) maxLen = lenCA;
    return maxLen;
  };

  Triangle.isAcute = function (a, b, c) {
    if (!Angle.isAcute(a, b, c)) return false;
    if (!Angle.isAcute(b, c, a)) return false;
    if (!Angle.isAcute(c, a, b)) return false;
    return true;
  };

  Triangle.circumcentre = function (a, b, c) {
    var cx = c.x;
    var cy = c.y;
    var ax = a.x - cx;
    var ay = a.y - cy;
    var bx = b.x - cx;
    var by = b.y - cy;
    var denom = 2 * Triangle.det(ax, ay, bx, by);
    var numx = Triangle.det(ay, ax * ax + ay * ay, by, bx * bx + by * by);
    var numy = Triangle.det(ax, ax * ax + ay * ay, bx, bx * bx + by * by);
    var ccx = cx - numx / denom;
    var ccy = cy + numy / denom;
    return new Coordinate(ccx, ccy);
  };

  Triangle.perpendicularBisector = function (a, b) {
    var dx = b.x - a.x;
    var dy = b.y - a.y;
    var l1 = new HCoordinate(a.x + dx / 2.0, a.y + dy / 2.0, 1.0);
    var l2 = new HCoordinate(a.x - dy + dx / 2.0, a.y + dx + dy / 2.0, 1.0);
    return new HCoordinate(l1, l2);
  };

  Triangle.angleBisector = function (a, b, c) {
    var len0 = b.distance(a);
    var len2 = b.distance(c);
    var frac = len0 / (len0 + len2);
    var dx = c.x - a.x;
    var dy = c.y - a.y;
    var splitPt = new Coordinate(a.x + frac * dx, a.y + frac * dy);
    return splitPt;
  };

  Triangle.area3D = function (a, b, c) {
    var ux = b.x - a.x;
    var uy = b.y - a.y;
    var uz = b.z - a.z;
    var vx = c.x - a.x;
    var vy = c.y - a.y;
    var vz = c.z - a.z;
    var crossx = uy * vz - uz * vy;
    var crossy = uz * vx - ux * vz;
    var crossz = ux * vy - uy * vx;
    var absSq = crossx * crossx + crossy * crossy + crossz * crossz;
    var area3D = Math.sqrt(absSq) / 2;
    return area3D;
  };

  Triangle.centroid = function (a, b, c) {
    var x = (a.x + b.x + c.x) / 3;
    var y = (a.y + b.y + c.y) / 3;
    return new Coordinate(x, y);
  };

  Triangle.inCentre = function (a, b, c) {
    var len0 = b.distance(c);
    var len1 = a.distance(c);
    var len2 = a.distance(b);
    var circum = len0 + len1 + len2;
    var inCentreX = (len0 * a.x + len1 * b.x + len2 * c.x) / circum;
    var inCentreY = (len0 * a.y + len1 * b.y + len2 * c.y) / circum;
    return new Coordinate(inCentreX, inCentreY);
  };



  var geom = /*#__PURE__*/Object.freeze({
    Coordinate: Coordinate,
    CoordinateList: CoordinateList,
    Envelope: Envelope,
    LineSegment: LineSegment,
    GeometryFactory: GeometryFactory,
    Geometry: Geometry,
    Point: Point,
    LineString: LineString,
    LinearRing: LinearRing,
    Polygon: Polygon,
    GeometryCollection: GeometryCollection,
    MultiPoint: MultiPoint,
    MultiLineString: MultiLineString,
    MultiPolygon: MultiPolygon,
    Dimension: Dimension,
    IntersectionMatrix: IntersectionMatrix,
    PrecisionModel: PrecisionModel,
    Location: Location,
    Triangle: Triangle
  });

  function PointPairDistance() {
    this._pt = [new Coordinate(), new Coordinate()];
    this._distance = Double.NaN;
    this._isNull = true;
  }
  extend(PointPairDistance.prototype, {
    getCoordinates: function getCoordinates() {
      return this._pt;
    },
    getCoordinate: function getCoordinate(i) {
      return this._pt[i];
    },
    setMinimum: function setMinimum() {
      if (arguments.length === 1) {
        var ptDist = arguments[0];
        this.setMinimum(ptDist._pt[0], ptDist._pt[1]);
      } else if (arguments.length === 2) {
        var p0 = arguments[0],
            p1 = arguments[1];

        if (this._isNull) {
          this.initialize(p0, p1);
          return null;
        }

        var dist = p0.distance(p1);
        if (dist < this._distance) this.initialize(p0, p1, dist);
      }
    },
    initialize: function initialize() {
      if (arguments.length === 0) {
        this._isNull = true;
      } else if (arguments.length === 2) {
        var p0 = arguments[0],
            p1 = arguments[1];

        this._pt[0].setCoordinate(p0);

        this._pt[1].setCoordinate(p1);

        this._distance = p0.distance(p1);
        this._isNull = false;
      } else if (arguments.length === 3) {
        var _p = arguments[0],
            _p2 = arguments[1],
            distance = arguments[2];

        this._pt[0].setCoordinate(_p);

        this._pt[1].setCoordinate(_p2);

        this._distance = distance;
        this._isNull = false;
      }
    },
    toString: function toString() {
      return WKTWriter.toLineString(this._pt[0], this._pt[1]);
    },
    getDistance: function getDistance() {
      return this._distance;
    },
    setMaximum: function setMaximum() {
      if (arguments.length === 1) {
        var ptDist = arguments[0];
        this.setMaximum(ptDist._pt[0], ptDist._pt[1]);
      } else if (arguments.length === 2) {
        var p0 = arguments[0],
            p1 = arguments[1];

        if (this._isNull) {
          this.initialize(p0, p1);
          return null;
        }

        var dist = p0.distance(p1);
        if (dist > this._distance) this.initialize(p0, p1, dist);
      }
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return PointPairDistance;
    }
  });

  function DistanceToPoint() {}
  extend(DistanceToPoint.prototype, {
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return DistanceToPoint;
    }
  });

  DistanceToPoint.computeDistance = function () {
    if (arguments[2] instanceof PointPairDistance && arguments[0] instanceof LineString && arguments[1] instanceof Coordinate) {
      var line = arguments[0],
          pt = arguments[1],
          ptDist = arguments[2];
      var tempSegment = new LineSegment();
      var coords = line.getCoordinates();

      for (var i = 0; i < coords.length - 1; i++) {
        tempSegment.setCoordinates(coords[i], coords[i + 1]);
        var closestPt = tempSegment.closestPoint(pt);
        ptDist.setMinimum(closestPt, pt);
      }
    } else if (arguments[2] instanceof PointPairDistance && arguments[0] instanceof Polygon && arguments[1] instanceof Coordinate) {
      var poly = arguments[0],
          _pt = arguments[1],
          _ptDist = arguments[2];
      DistanceToPoint.computeDistance(poly.getExteriorRing(), _pt, _ptDist);

      for (var i = 0; i < poly.getNumInteriorRing(); i++) {
        DistanceToPoint.computeDistance(poly.getInteriorRingN(i), _pt, _ptDist);
      }
    } else if (arguments[2] instanceof PointPairDistance && arguments[0] instanceof Geometry && arguments[1] instanceof Coordinate) {
      var geom = arguments[0],
          _pt2 = arguments[1],
          _ptDist2 = arguments[2];

      if (geom instanceof LineString) {
        DistanceToPoint.computeDistance(geom, _pt2, _ptDist2);
      } else if (geom instanceof Polygon) {
        DistanceToPoint.computeDistance(geom, _pt2, _ptDist2);
      } else if (geom instanceof GeometryCollection) {
        var gc = geom;

        for (var i = 0; i < gc.getNumGeometries(); i++) {
          var g = gc.getGeometryN(i);
          DistanceToPoint.computeDistance(g, _pt2, _ptDist2);
        }
      } else {
        _ptDist2.setMinimum(geom.getCoordinate(), _pt2);
      }
    } else if (arguments[2] instanceof PointPairDistance && arguments[0] instanceof LineSegment && arguments[1] instanceof Coordinate) {
      var segment = arguments[0],
          _pt3 = arguments[1],
          _ptDist3 = arguments[2];
      var closestPt = segment.closestPoint(_pt3);

      _ptDist3.setMinimum(closestPt, _pt3);
    }
  };

  function DiscreteHausdorffDistance() {
    this._g0 = null;
    this._g1 = null;
    this._ptDist = new PointPairDistance();
    this._densifyFrac = 0.0;
    var g0 = arguments[0],
        g1 = arguments[1];
    this._g0 = g0;
    this._g1 = g1;
  }
  extend(DiscreteHausdorffDistance.prototype, {
    getCoordinates: function getCoordinates() {
      return this._ptDist.getCoordinates();
    },
    setDensifyFraction: function setDensifyFraction(densifyFrac) {
      if (densifyFrac > 1.0 || densifyFrac <= 0.0) throw new IllegalArgumentException("Fraction is not in range (0.0 - 1.0]");
      this._densifyFrac = densifyFrac;
    },
    compute: function compute(g0, g1) {
      this.computeOrientedDistance(g0, g1, this._ptDist);
      this.computeOrientedDistance(g1, g0, this._ptDist);
    },
    distance: function distance() {
      this.compute(this._g0, this._g1);
      return this._ptDist.getDistance();
    },
    computeOrientedDistance: function computeOrientedDistance(discreteGeom, geom, ptDist) {
      var distFilter = new MaxPointDistanceFilter(geom);
      discreteGeom.apply(distFilter);
      ptDist.setMaximum(distFilter.getMaxPointDistance());

      if (this._densifyFrac > 0) {
        var fracFilter = new MaxDensifiedByFractionDistanceFilter(geom, this._densifyFrac);
        discreteGeom.apply(fracFilter);
        ptDist.setMaximum(fracFilter.getMaxPointDistance());
      }
    },
    orientedDistance: function orientedDistance() {
      this.computeOrientedDistance(this._g0, this._g1, this._ptDist);
      return this._ptDist.getDistance();
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return DiscreteHausdorffDistance;
    }
  });

  DiscreteHausdorffDistance.distance = function () {
    if (arguments.length === 2) {
      var g0 = arguments[0],
          g1 = arguments[1];
      var dist = new DiscreteHausdorffDistance(g0, g1);
      return dist.distance();
    } else if (arguments.length === 3) {
      var _g = arguments[0],
          _g2 = arguments[1],
          densifyFrac = arguments[2];
      var dist = new DiscreteHausdorffDistance(_g, _g2);
      dist.setDensifyFraction(densifyFrac);
      return dist.distance();
    }
  };

  function MaxPointDistanceFilter() {
    this._maxPtDist = new PointPairDistance();
    this._minPtDist = new PointPairDistance();
    this._euclideanDist = new DistanceToPoint();
    this._geom = null;
    var geom = arguments[0];
    this._geom = geom;
  }

  extend(MaxPointDistanceFilter.prototype, {
    filter: function filter(pt) {
      this._minPtDist.initialize();

      DistanceToPoint.computeDistance(this._geom, pt, this._minPtDist);

      this._maxPtDist.setMaximum(this._minPtDist);
    },
    getMaxPointDistance: function getMaxPointDistance() {
      return this._maxPtDist;
    },
    interfaces_: function interfaces_() {
      return [CoordinateFilter];
    },
    getClass: function getClass() {
      return MaxPointDistanceFilter;
    }
  });

  function MaxDensifiedByFractionDistanceFilter() {
    this._maxPtDist = new PointPairDistance();
    this._minPtDist = new PointPairDistance();
    this._geom = null;
    this._numSubSegs = 0;
    var geom = arguments[0],
        fraction = arguments[1];
    this._geom = geom;
    this._numSubSegs = Math.trunc(Math.round(1.0 / fraction));
  }

  extend(MaxDensifiedByFractionDistanceFilter.prototype, {
    filter: function filter(seq, index) {
      if (index === 0) return null;
      var p0 = seq.getCoordinate(index - 1);
      var p1 = seq.getCoordinate(index);
      var delx = (p1.x - p0.x) / this._numSubSegs;
      var dely = (p1.y - p0.y) / this._numSubSegs;

      for (var i = 0; i < this._numSubSegs; i++) {
        var x = p0.x + i * delx;
        var y = p0.y + i * dely;
        var pt = new Coordinate(x, y);

        this._minPtDist.initialize();

        DistanceToPoint.computeDistance(this._geom, pt, this._minPtDist);

        this._maxPtDist.setMaximum(this._minPtDist);
      }
    },
    isDone: function isDone() {
      return false;
    },
    isGeometryChanged: function isGeometryChanged() {
      return false;
    },
    getMaxPointDistance: function getMaxPointDistance() {
      return this._maxPtDist;
    },
    interfaces_: function interfaces_() {
      return [CoordinateSequenceFilter];
    },
    getClass: function getClass() {
      return MaxDensifiedByFractionDistanceFilter;
    }
  });
  DiscreteHausdorffDistance.MaxPointDistanceFilter = MaxPointDistanceFilter;
  DiscreteHausdorffDistance.MaxDensifiedByFractionDistanceFilter = MaxDensifiedByFractionDistanceFilter;



  var distance_module = /*#__PURE__*/Object.freeze({
    DiscreteHausdorffDistance: DiscreteHausdorffDistance,
    DistanceToPoint: DistanceToPoint,
    PointPairDistance: PointPairDistance
  });

  function ItemVisitor() {}
  extend(ItemVisitor.prototype, {
    visitItem: function visitItem(item) {},
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return ItemVisitor;
    }
  });

  function PointOnGeometryLocator() {}
  extend(PointOnGeometryLocator.prototype, {
    locate: function locate(p) {},
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return PointOnGeometryLocator;
    }
  });

  function IntervalRTreeNode() {
    this._min = Double.POSITIVE_INFINITY;
    this._max = Double.NEGATIVE_INFINITY;
  }
  extend(IntervalRTreeNode.prototype, {
    getMin: function getMin() {
      return this._min;
    },
    intersects: function intersects(queryMin, queryMax) {
      if (this._min > queryMax || this._max < queryMin) return false;
      return true;
    },
    getMax: function getMax() {
      return this._max;
    },
    toString: function toString() {
      return WKTWriter.toLineString(new Coordinate(this._min, 0), new Coordinate(this._max, 0));
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return IntervalRTreeNode;
    }
  });

  function NodeComparator() {}

  extend(NodeComparator.prototype, {
    compare: function compare(o1, o2) {
      var n1 = o1;
      var n2 = o2;
      var mid1 = (n1._min + n1._max) / 2;
      var mid2 = (n2._min + n2._max) / 2;
      if (mid1 < mid2) return -1;
      if (mid1 > mid2) return 1;
      return 0;
    },
    interfaces_: function interfaces_() {
      return [Comparator];
    },
    getClass: function getClass() {
      return NodeComparator;
    }
  });
  IntervalRTreeNode.NodeComparator = NodeComparator;

  function IntervalRTreeLeafNode() {
    IntervalRTreeNode.apply(this);
    this._item = null;
    var min = arguments[0],
        max = arguments[1],
        item = arguments[2];
    this._min = min;
    this._max = max;
    this._item = item;
  }
  inherits(IntervalRTreeLeafNode, IntervalRTreeNode);
  extend(IntervalRTreeLeafNode.prototype, {
    query: function query(queryMin, queryMax, visitor) {
      if (!this.intersects(queryMin, queryMax)) return null;
      visitor.visitItem(this._item);
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return IntervalRTreeLeafNode;
    }
  });

  var Collections = {
    reverseOrder: function reverseOrder() {
      return {
        compare: function compare(a, b) {
          return b.compareTo(a);
        }
      };
    },
    min: function min(l) {
      Collections.sort(l);
      return l.get(0);
    },
    sort: function sort(l, c) {
      var a = l.toArray();

      if (c) {
        Arrays.sort(a, c);
      } else {
        Arrays.sort(a);
      }

      var i = l.iterator();

      for (var pos = 0, alen = a.length; pos < alen; pos++) {
        i.next();
        i.set(a[pos]);
      }
    },
    singletonList: function singletonList(o) {
      var arrayList = new ArrayList();
      arrayList.add(o);
      return arrayList;
    }
  };

  function IntervalRTreeBranchNode() {
    IntervalRTreeNode.apply(this);
    this._node1 = null;
    this._node2 = null;
    var n1 = arguments[0],
        n2 = arguments[1];
    this._node1 = n1;
    this._node2 = n2;
    this.buildExtent(this._node1, this._node2);
  }
  inherits(IntervalRTreeBranchNode, IntervalRTreeNode);
  extend(IntervalRTreeBranchNode.prototype, {
    buildExtent: function buildExtent(n1, n2) {
      this._min = Math.min(n1._min, n2._min);
      this._max = Math.max(n1._max, n2._max);
    },
    query: function query(queryMin, queryMax, visitor) {
      if (!this.intersects(queryMin, queryMax)) {
        return null;
      }

      if (this._node1 !== null) this._node1.query(queryMin, queryMax, visitor);
      if (this._node2 !== null) this._node2.query(queryMin, queryMax, visitor);
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return IntervalRTreeBranchNode;
    }
  });

  function SortedPackedIntervalRTree() {
    this._leaves = new ArrayList();
    this._root = null;
    this._level = 0;
  }
  extend(SortedPackedIntervalRTree.prototype, {
    buildTree: function buildTree() {
      Collections.sort(this._leaves, new IntervalRTreeNode.NodeComparator());
      var src = this._leaves;
      var temp = null;
      var dest = new ArrayList();

      while (true) {
        this.buildLevel(src, dest);
        if (dest.size() === 1) return dest.get(0);
        temp = src;
        src = dest;
        dest = temp;
      }
    },
    insert: function insert(min, max, item) {
      if (this._root !== null) throw new IllegalStateException("Index cannot be added to once it has been queried");

      this._leaves.add(new IntervalRTreeLeafNode(min, max, item));
    },
    query: function query(min, max, visitor) {
      this.init();

      this._root.query(min, max, visitor);
    },
    buildRoot: function buildRoot() {
      if (this._root !== null) return null;
      this._root = this.buildTree();
    },
    printNode: function printNode(node) {
      System.out.println(WKTWriter.toLineString(new Coordinate(node._min, this._level), new Coordinate(node._max, this._level)));
    },
    init: function init() {
      if (this._root !== null) return null;
      this.buildRoot();
    },
    buildLevel: function buildLevel(src, dest) {
      this._level++;
      dest.clear();

      for (var i = 0; i < src.size(); i += 2) {
        var n1 = src.get(i);
        var n2 = i + 1 < src.size() ? src.get(i) : null;

        if (n2 === null) {
          dest.add(n1);
        } else {
          var node = new IntervalRTreeBranchNode(src.get(i), src.get(i + 1));
          dest.add(node);
        }
      }
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return SortedPackedIntervalRTree;
    }
  });

  function LinearComponentExtracter() {
    this._lines = null;
    this._isForcedToLineString = false;

    if (arguments.length === 1) {
      var lines = arguments[0];
      this._lines = lines;
    } else if (arguments.length === 2) {
      var _lines = arguments[0],
          isForcedToLineString = arguments[1];
      this._lines = _lines;
      this._isForcedToLineString = isForcedToLineString;
    }
  }
  extend(LinearComponentExtracter.prototype, {
    filter: function filter(geom) {
      if (this._isForcedToLineString && geom instanceof LinearRing) {
        var line = geom.getFactory().createLineString(geom.getCoordinateSequence());

        this._lines.add(line);

        return null;
      }

      if (geom instanceof LineString) this._lines.add(geom);
    },
    setForceToLineString: function setForceToLineString(isForcedToLineString) {
      this._isForcedToLineString = isForcedToLineString;
    },
    interfaces_: function interfaces_() {
      return [GeometryComponentFilter];
    },
    getClass: function getClass() {
      return LinearComponentExtracter;
    }
  });

  LinearComponentExtracter.getGeometry = function () {
    if (arguments.length === 1) {
      var geom = arguments[0];
      return geom.getFactory().buildGeometry(LinearComponentExtracter.getLines(geom));
    } else if (arguments.length === 2) {
      var _geom = arguments[0],
          forceToLineString = arguments[1];
      return _geom.getFactory().buildGeometry(LinearComponentExtracter.getLines(_geom, forceToLineString));
    }
  };

  LinearComponentExtracter.getLines = function () {
    if (arguments.length === 1) {
      var geom = arguments[0];
      return LinearComponentExtracter.getLines(geom, false);
    } else if (arguments.length === 2) {
      if (hasInterface(arguments[0], Collection) && hasInterface(arguments[1], Collection)) {
        var geoms = arguments[0],
            _lines2 = arguments[1];

        for (var i = geoms.iterator(); i.hasNext();) {
          var g = i.next();
          LinearComponentExtracter.getLines(g, _lines2);
        }

        return _lines2;
      } else if (arguments[0] instanceof Geometry && typeof arguments[1] === "boolean") {
        var _geom2 = arguments[0],
            forceToLineString = arguments[1];
        var lines = new ArrayList();

        _geom2.apply(new LinearComponentExtracter(lines, forceToLineString));

        return lines;
      } else if (arguments[0] instanceof Geometry && hasInterface(arguments[1], Collection)) {
        var _geom3 = arguments[0],
            _lines3 = arguments[1];

        if (_geom3 instanceof LineString) {
          _lines3.add(_geom3);
        } else {
          _geom3.apply(new LinearComponentExtracter(_lines3));
        }

        return _lines3;
      }
    } else if (arguments.length === 3) {
      if (typeof arguments[2] === "boolean" && hasInterface(arguments[0], Collection) && hasInterface(arguments[1], Collection)) {
        var _geoms = arguments[0],
            _lines4 = arguments[1],
            _forceToLineString = arguments[2];

        for (var i = _geoms.iterator(); i.hasNext();) {
          var g = i.next();
          LinearComponentExtracter.getLines(g, _lines4, _forceToLineString);
        }

        return _lines4;
      } else if (typeof arguments[2] === "boolean" && arguments[0] instanceof Geometry && hasInterface(arguments[1], Collection)) {
        var _geom4 = arguments[0],
            _lines5 = arguments[1],
            _forceToLineString2 = arguments[2];

        _geom4.apply(new LinearComponentExtracter(_lines5, _forceToLineString2));

        return _lines5;
      }
    }
  };

  function ArrayListVisitor() {
    this._items = new ArrayList();
  }
  extend(ArrayListVisitor.prototype, {
    visitItem: function visitItem(item) {
      this._items.add(item);
    },
    getItems: function getItems() {
      return this._items;
    },
    interfaces_: function interfaces_() {
      return [ItemVisitor];
    },
    getClass: function getClass() {
      return ArrayListVisitor;
    }
  });

  function RayCrossingCounter() {
    this._p = null;
    this._crossingCount = 0;
    this._isPointOnSegment = false;
    var p = arguments[0];
    this._p = p;
  }
  extend(RayCrossingCounter.prototype, {
    countSegment: function countSegment(p1, p2) {
      if (p1.x < this._p.x && p2.x < this._p.x) return null;

      if (this._p.x === p2.x && this._p.y === p2.y) {
        this._isPointOnSegment = true;
        return null;
      }

      if (p1.y === this._p.y && p2.y === this._p.y) {
        var minx = p1.x;
        var maxx = p2.x;

        if (minx > maxx) {
          minx = p2.x;
          maxx = p1.x;
        }

        if (this._p.x >= minx && this._p.x <= maxx) {
          this._isPointOnSegment = true;
        }

        return null;
      }

      if (p1.y > this._p.y && p2.y <= this._p.y || p2.y > this._p.y && p1.y <= this._p.y) {
        var orient = Orientation.index(p1, p2, this._p);

        if (orient === Orientation.COLLINEAR) {
          this._isPointOnSegment = true;
          return null;
        }

        if (p2.y < p1.y) {
          orient = -orient;
        }

        if (orient === Orientation.LEFT) {
          this._crossingCount++;
        }
      }
    },
    isPointInPolygon: function isPointInPolygon() {
      return this.getLocation() !== Location.EXTERIOR;
    },
    getLocation: function getLocation() {
      if (this._isPointOnSegment) return Location.BOUNDARY;

      if (this._crossingCount % 2 === 1) {
        return Location.INTERIOR;
      }

      return Location.EXTERIOR;
    },
    isOnSegment: function isOnSegment() {
      return this._isPointOnSegment;
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return RayCrossingCounter;
    }
  });

  RayCrossingCounter.locatePointInRing = function () {
    if (arguments[0] instanceof Coordinate && hasInterface(arguments[1], CoordinateSequence)) {
      var p = arguments[0],
          ring = arguments[1];
      var counter = new RayCrossingCounter(p);
      var p1 = new Coordinate();
      var p2 = new Coordinate();

      for (var i = 1; i < ring.size(); i++) {
        ring.getCoordinate(i, p1);
        ring.getCoordinate(i - 1, p2);
        counter.countSegment(p1, p2);
        if (counter.isOnSegment()) return counter.getLocation();
      }

      return counter.getLocation();
    } else if (arguments[0] instanceof Coordinate && arguments[1] instanceof Array) {
      var _p = arguments[0],
          _ring = arguments[1];
      var counter = new RayCrossingCounter(_p);

      for (var i = 1; i < _ring.length; i++) {
        var p1 = _ring[i];
        var p2 = _ring[i - 1];
        counter.countSegment(p1, p2);
        if (counter.isOnSegment()) return counter.getLocation();
      }

      return counter.getLocation();
    }
  };

  function IndexedPointInAreaLocator() {
    this._index = null;
    var g = arguments[0];
    if (!(hasInterface(g, Polygonal) || g instanceof LinearRing)) throw new IllegalArgumentException("Argument must be Polygonal or LinearRing");
    this._index = new IntervalIndexedGeometry(g);
  }
  extend(IndexedPointInAreaLocator.prototype, {
    locate: function locate(p) {
      var rcc = new RayCrossingCounter(p);
      var visitor = new SegmentVisitor(rcc);

      this._index.query(p.y, p.y, visitor);

      return rcc.getLocation();
    },
    interfaces_: function interfaces_() {
      return [PointOnGeometryLocator];
    },
    getClass: function getClass() {
      return IndexedPointInAreaLocator;
    }
  });

  function SegmentVisitor() {
    this._counter = null;
    var counter = arguments[0];
    this._counter = counter;
  }

  extend(SegmentVisitor.prototype, {
    visitItem: function visitItem(item) {
      var seg = item;

      this._counter.countSegment(seg.getCoordinate(0), seg.getCoordinate(1));
    },
    interfaces_: function interfaces_() {
      return [ItemVisitor];
    },
    getClass: function getClass() {
      return SegmentVisitor;
    }
  });

  function IntervalIndexedGeometry() {
    this._index = new SortedPackedIntervalRTree();
    var geom = arguments[0];
    this.init(geom);
  }

  extend(IntervalIndexedGeometry.prototype, {
    init: function init(geom) {
      var lines = LinearComponentExtracter.getLines(geom);

      for (var i = lines.iterator(); i.hasNext();) {
        var line = i.next();
        var pts = line.getCoordinates();
        this.addLine(pts);
      }
    },
    addLine: function addLine(pts) {
      for (var i = 1; i < pts.length; i++) {
        var seg = new LineSegment(pts[i - 1], pts[i]);
        var min = Math.min(seg.p0.y, seg.p1.y);
        var max = Math.max(seg.p0.y, seg.p1.y);

        this._index.insert(min, max, seg);
      }
    },
    query: function query() {
      if (arguments.length === 2) {
        var min = arguments[0],
            max = arguments[1];
        var visitor = new ArrayListVisitor();

        this._index.query(min, max, visitor);

        return visitor.getItems();
      } else if (arguments.length === 3) {
        var _min = arguments[0],
            _max = arguments[1],
            _visitor = arguments[2];

        this._index.query(_min, _max, _visitor);
      }
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return IntervalIndexedGeometry;
    }
  });
  IndexedPointInAreaLocator.SegmentVisitor = SegmentVisitor;
  IndexedPointInAreaLocator.IntervalIndexedGeometry = IntervalIndexedGeometry;

  function PointLocation() {}
  extend(PointLocation.prototype, {
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return PointLocation;
    }
  });

  PointLocation.isOnLine = function () {
    if (arguments[0] instanceof Coordinate && hasInterface(arguments[1], CoordinateSequence)) {
      var p = arguments[0],
          line = arguments[1];
      var lineIntersector = new RobustLineIntersector();
      var p0 = new Coordinate();
      var p1 = new Coordinate();
      var n = line.size();

      for (var i = 1; i < n; i++) {
        line.getCoordinate(i - 1, p0);
        line.getCoordinate(i, p1);
        lineIntersector.computeIntersection(p, p0, p1);

        if (lineIntersector.hasIntersection()) {
          return true;
        }
      }

      return false;
    } else if (arguments[0] instanceof Coordinate && arguments[1] instanceof Array) {
      var _p = arguments[0],
          _line = arguments[1];
      var lineIntersector = new RobustLineIntersector();

      for (var i = 1; i < _line.length; i++) {
        var p0 = _line[i - 1];
        var p1 = _line[i];
        lineIntersector.computeIntersection(_p, p0, p1);

        if (lineIntersector.hasIntersection()) {
          return true;
        }
      }

      return false;
    }
  };

  PointLocation.locateInRing = function (p, ring) {
    return RayCrossingCounter.locatePointInRing(p, ring);
  };

  PointLocation.isInRing = function (p, ring) {
    return PointLocation.locateInRing(p, ring) !== Location.EXTERIOR;
  };

  function GeometryCollectionIterator() {
    this._parent = null;
    this._atStart = null;
    this._max = null;
    this._index = null;
    this._subcollectionIterator = null;
    var parent = arguments[0];
    this._parent = parent;
    this._atStart = true;
    this._index = 0;
    this._max = parent.getNumGeometries();
  }
  extend(GeometryCollectionIterator.prototype, {
    next: function next() {
      if (this._atStart) {
        this._atStart = false;
        if (GeometryCollectionIterator.isAtomic(this._parent)) this._index++;
        return this._parent;
      }

      if (this._subcollectionIterator !== null) {
        if (this._subcollectionIterator.hasNext()) {
          return this._subcollectionIterator.next();
        } else {
          this._subcollectionIterator = null;
        }
      }

      if (this._index >= this._max) {
        throw new NoSuchElementException();
      }

      var obj = this._parent.getGeometryN(this._index++);

      if (obj instanceof GeometryCollection) {
        this._subcollectionIterator = new GeometryCollectionIterator(obj);
        return this._subcollectionIterator.next();
      }

      return obj;
    },
    remove: function remove() {
      throw new UnsupportedOperationException(this.getClass().getName());
    },
    hasNext: function hasNext() {
      if (this._atStart) {
        return true;
      }

      if (this._subcollectionIterator !== null) {
        if (this._subcollectionIterator.hasNext()) {
          return true;
        }

        this._subcollectionIterator = null;
      }

      if (this._index >= this._max) {
        return false;
      }

      return true;
    },
    interfaces_: function interfaces_() {
      return [Iterator];
    },
    getClass: function getClass() {
      return GeometryCollectionIterator;
    }
  });

  GeometryCollectionIterator.isAtomic = function (geom) {
    return !(geom instanceof GeometryCollection);
  };

  function SimplePointInAreaLocator() {
    this._geom = null;
    var geom = arguments[0];
    this._geom = geom;
  }
  extend(SimplePointInAreaLocator.prototype, {
    locate: function locate(p) {
      return SimplePointInAreaLocator.locate(p, this._geom);
    },
    interfaces_: function interfaces_() {
      return [PointOnGeometryLocator];
    },
    getClass: function getClass() {
      return SimplePointInAreaLocator;
    }
  });

  SimplePointInAreaLocator.locatePointInPolygon = function (p, poly) {
    if (poly.isEmpty()) return Location.EXTERIOR;
    var shell = poly.getExteriorRing();
    var shellLoc = SimplePointInAreaLocator.locatePointInRing(p, shell);
    if (shellLoc !== Location.INTERIOR) return shellLoc;

    for (var i = 0; i < poly.getNumInteriorRing(); i++) {
      var hole = poly.getInteriorRingN(i);
      var holeLoc = SimplePointInAreaLocator.locatePointInRing(p, hole);
      if (holeLoc === Location.BOUNDARY) return Location.BOUNDARY;
      if (holeLoc === Location.INTERIOR) return Location.EXTERIOR;
    }

    return Location.INTERIOR;
  };

  SimplePointInAreaLocator.locatePointInRing = function (p, ring) {
    if (!ring.getEnvelopeInternal().intersects(p)) return Location.EXTERIOR;
    return PointLocation.locateInRing(p, ring.getCoordinates());
  };

  SimplePointInAreaLocator.containsPointInPolygon = function (p, poly) {
    return Location.EXTERIOR !== SimplePointInAreaLocator.locatePointInPolygon(p, poly);
  };

  SimplePointInAreaLocator.locateInGeometry = function (p, geom) {
    if (geom instanceof Polygon) {
      return SimplePointInAreaLocator.locatePointInPolygon(p, geom);
    } else if (geom instanceof GeometryCollection) {
      var geomi = new GeometryCollectionIterator(geom);

      while (geomi.hasNext()) {
        var g2 = geomi.next();

        if (g2 !== geom) {
          var loc = SimplePointInAreaLocator.locateInGeometry(p, g2);
          if (loc !== Location.EXTERIOR) return loc;
        }
      }
    }

    return Location.EXTERIOR;
  };

  SimplePointInAreaLocator.locate = function (p, geom) {
    if (geom.isEmpty()) return Location.EXTERIOR;
    return SimplePointInAreaLocator.locateInGeometry(p, geom);
  };



  var locate = /*#__PURE__*/Object.freeze({
    IndexedPointInAreaLocator: IndexedPointInAreaLocator,
    PointOnGeometryLocator: PointOnGeometryLocator,
    SimplePointInAreaLocator: SimplePointInAreaLocator
  });

  function SimilarityMeasure() {}
  extend(SimilarityMeasure.prototype, {
    measure: function measure(g1, g2) {},
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return SimilarityMeasure;
    }
  });

  function AreaSimilarityMeasure() {}
  extend(AreaSimilarityMeasure.prototype, {
    measure: function measure(g1, g2) {
      var areaInt = g1.intersection(g2).getArea();
      var areaUnion = g1.union(g2).getArea();
      return areaInt / areaUnion;
    },
    interfaces_: function interfaces_() {
      return [SimilarityMeasure];
    },
    getClass: function getClass() {
      return AreaSimilarityMeasure;
    }
  });

  function HausdorffSimilarityMeasure() {}
  extend(HausdorffSimilarityMeasure.prototype, {
    measure: function measure(g1, g2) {
      var distance = DiscreteHausdorffDistance.distance(g1, g2, HausdorffSimilarityMeasure.DENSIFY_FRACTION);
      var env = new Envelope(g1.getEnvelopeInternal());
      env.expandToInclude(g2.getEnvelopeInternal());
      var envSize = HausdorffSimilarityMeasure.diagonalSize(env);
      var measure = 1 - distance / envSize;
      return measure;
    },
    interfaces_: function interfaces_() {
      return [SimilarityMeasure];
    },
    getClass: function getClass() {
      return HausdorffSimilarityMeasure;
    }
  });

  HausdorffSimilarityMeasure.diagonalSize = function (env) {
    if (env.isNull()) return 0.0;
    var width = env.getWidth();
    var hgt = env.getHeight();
    return Math.sqrt(width * width + hgt * hgt);
  };

  HausdorffSimilarityMeasure.DENSIFY_FRACTION = 0.25;

  function SimilarityMeasureCombiner() {}
  extend(SimilarityMeasureCombiner.prototype, {
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return SimilarityMeasureCombiner;
    }
  });

  SimilarityMeasureCombiner.combine = function (measure1, measure2) {
    return Math.min(measure1, measure2);
  };



  var match = /*#__PURE__*/Object.freeze({
    AreaSimilarityMeasure: AreaSimilarityMeasure,
    HausdorffSimilarityMeasure: HausdorffSimilarityMeasure,
    SimilarityMeasure: SimilarityMeasure,
    SimilarityMeasureCombiner: SimilarityMeasureCombiner
  });

  function Centroid() {
    this._areaBasePt = null;
    this._triangleCent3 = new Coordinate();
    this._areasum2 = 0;
    this._cg3 = new Coordinate();
    this._lineCentSum = new Coordinate();
    this._totalLength = 0.0;
    this._ptCount = 0;
    this._ptCentSum = new Coordinate();
    var geom = arguments[0];
    this._areaBasePt = null;
    this.add(geom);
  }
  extend(Centroid.prototype, {
    setAreaBasePoint: function setAreaBasePoint(basePt) {
      this._areaBasePt = basePt;
    },
    addPoint: function addPoint(pt) {
      this._ptCount += 1;
      this._ptCentSum.x += pt.x;
      this._ptCentSum.y += pt.y;
    },
    addLineSegments: function addLineSegments(pts) {
      var lineLen = 0.0;

      for (var i = 0; i < pts.length - 1; i++) {
        var segmentLen = pts[i].distance(pts[i + 1]);
        if (segmentLen === 0.0) continue;
        lineLen += segmentLen;
        var midx = (pts[i].x + pts[i + 1].x) / 2;
        this._lineCentSum.x += segmentLen * midx;
        var midy = (pts[i].y + pts[i + 1].y) / 2;
        this._lineCentSum.y += segmentLen * midy;
      }

      this._totalLength += lineLen;
      if (lineLen === 0.0 && pts.length > 0) this.addPoint(pts[0]);
    },
    addHole: function addHole(pts) {
      var isPositiveArea = Orientation.isCCW(pts);

      for (var i = 0; i < pts.length - 1; i++) {
        this.addTriangle(this._areaBasePt, pts[i], pts[i + 1], isPositiveArea);
      }

      this.addLineSegments(pts);
    },
    getCentroid: function getCentroid() {
      var cent = new Coordinate();

      if (Math.abs(this._areasum2) > 0.0) {
        cent.x = this._cg3.x / 3 / this._areasum2;
        cent.y = this._cg3.y / 3 / this._areasum2;
      } else if (this._totalLength > 0.0) {
        cent.x = this._lineCentSum.x / this._totalLength;
        cent.y = this._lineCentSum.y / this._totalLength;
      } else if (this._ptCount > 0) {
        cent.x = this._ptCentSum.x / this._ptCount;
        cent.y = this._ptCentSum.y / this._ptCount;
      } else {
        return null;
      }

      return cent;
    },
    addShell: function addShell(pts) {
      if (pts.length > 0) this.setAreaBasePoint(pts[0]);
      var isPositiveArea = !Orientation.isCCW(pts);

      for (var i = 0; i < pts.length - 1; i++) {
        this.addTriangle(this._areaBasePt, pts[i], pts[i + 1], isPositiveArea);
      }

      this.addLineSegments(pts);
    },
    addTriangle: function addTriangle(p0, p1, p2, isPositiveArea) {
      var sign = isPositiveArea ? 1.0 : -1.0;
      Centroid.centroid3(p0, p1, p2, this._triangleCent3);
      var area2 = Centroid.area2(p0, p1, p2);
      this._cg3.x += sign * area2 * this._triangleCent3.x;
      this._cg3.y += sign * area2 * this._triangleCent3.y;
      this._areasum2 += sign * area2;
    },
    add: function add() {
      if (arguments[0] instanceof Polygon) {
        var _poly = arguments[0];
        this.addShell(_poly.getExteriorRing().getCoordinates());

        for (var i = 0; i < _poly.getNumInteriorRing(); i++) {
          this.addHole(_poly.getInteriorRingN(i).getCoordinates());
        }
      } else if (arguments[0] instanceof Geometry) {
        var geom = arguments[0];
        if (geom.isEmpty()) return null;

        if (geom instanceof Point) {
          this.addPoint(geom.getCoordinate());
        } else if (geom instanceof LineString) {
          this.addLineSegments(geom.getCoordinates());
        } else if (geom instanceof Polygon) {
          var poly = geom;
          this.add(poly);
        } else if (geom instanceof GeometryCollection) {
          var gc = geom;

          for (var i = 0; i < gc.getNumGeometries(); i++) {
            this.add(gc.getGeometryN(i));
          }
        }
      }
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return Centroid;
    }
  });

  Centroid.area2 = function (p1, p2, p3) {
    return (p2.x - p1.x) * (p3.y - p1.y) - (p3.x - p1.x) * (p2.y - p1.y);
  };

  Centroid.centroid3 = function (p1, p2, p3, c) {
    c.x = p1.x + p2.x + p3.x;
    c.y = p1.y + p2.y + p3.y;
    return null;
  };

  Centroid.getCentroid = function (geom) {
    var cent = new Centroid(geom);
    return cent.getCentroid();
  };

  function CGAlgorithms() {}
  extend(CGAlgorithms.prototype, {
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return CGAlgorithms;
    }
  });

  CGAlgorithms.orientationIndex = function (p1, p2, q) {
    return CGAlgorithmsDD.orientationIndex(p1, p2, q);
  };

  CGAlgorithms.signedArea = function () {
    if (arguments[0] instanceof Array) {
      var ring = arguments[0];
      if (ring.length < 3) return 0.0;
      var sum = 0.0;
      var x0 = ring[0].x;

      for (var i = 1; i < ring.length - 1; i++) {
        var x = ring[i].x - x0;
        var y1 = ring[i + 1].y;
        var y2 = ring[i - 1].y;
        sum += x * (y2 - y1);
      }

      return sum / 2.0;
    } else if (hasInterface(arguments[0], CoordinateSequence)) {
      var _ring = arguments[0];

      var n = _ring.size();

      if (n < 3) return 0.0;
      var p0 = new Coordinate();
      var p1 = new Coordinate();
      var p2 = new Coordinate();

      _ring.getCoordinate(0, p1);

      _ring.getCoordinate(1, p2);

      var x0 = p1.x;
      p2.x -= x0;
      var sum = 0.0;

      for (var i = 1; i < n - 1; i++) {
        p0.y = p1.y;
        p1.x = p2.x;
        p1.y = p2.y;

        _ring.getCoordinate(i + 1, p2);

        p2.x -= x0;
        sum += p1.x * (p0.y - p2.y);
      }

      return sum / 2.0;
    }
  };

  CGAlgorithms.distanceLineLine = function (A, B, C, D) {
    if (A.equals(B)) return CGAlgorithms.distancePointLine(A, C, D);
    if (C.equals(D)) return CGAlgorithms.distancePointLine(D, A, B);
    var noIntersection = false;

    if (!Envelope.intersects(A, B, C, D)) {
      noIntersection = true;
    } else {
      var denom = (B.x - A.x) * (D.y - C.y) - (B.y - A.y) * (D.x - C.x);

      if (denom === 0) {
        noIntersection = true;
      } else {
        var r_num = (A.y - C.y) * (D.x - C.x) - (A.x - C.x) * (D.y - C.y);
        var s_num = (A.y - C.y) * (B.x - A.x) - (A.x - C.x) * (B.y - A.y);
        var s = s_num / denom;
        var r = r_num / denom;

        if (r < 0 || r > 1 || s < 0 || s > 1) {
          noIntersection = true;
        }
      }
    }

    if (noIntersection) {
      return MathUtil.min(CGAlgorithms.distancePointLine(A, C, D), CGAlgorithms.distancePointLine(B, C, D), CGAlgorithms.distancePointLine(C, A, B), CGAlgorithms.distancePointLine(D, A, B));
    }

    return 0.0;
  };

  CGAlgorithms.isPointInRing = function (p, ring) {
    return CGAlgorithms.locatePointInRing(p, ring) !== Location.EXTERIOR;
  };

  CGAlgorithms.computeLength = function (pts) {
    var n = pts.size();
    if (n <= 1) return 0.0;
    var len = 0.0;
    var p = new Coordinate();
    pts.getCoordinate(0, p);
    var x0 = p.x;
    var y0 = p.y;

    for (var i = 1; i < n; i++) {
      pts.getCoordinate(i, p);
      var x1 = p.x;
      var y1 = p.y;
      var dx = x1 - x0;
      var dy = y1 - y0;
      len += Math.sqrt(dx * dx + dy * dy);
      x0 = x1;
      y0 = y1;
    }

    return len;
  };

  CGAlgorithms.isCCW = function (ring) {
    var nPts = ring.length - 1;
    if (nPts < 3) throw new IllegalArgumentException("Ring has fewer than 4 points, so orientation cannot be determined");
    var hiPt = ring[0];
    var hiIndex = 0;

    for (var i = 1; i <= nPts; i++) {
      var p = ring[i];

      if (p.y > hiPt.y) {
        hiPt = p;
        hiIndex = i;
      }
    }

    var iPrev = hiIndex;

    do {
      iPrev = iPrev - 1;
      if (iPrev < 0) iPrev = nPts;
    } while (ring[iPrev].equals2D(hiPt) && iPrev !== hiIndex);

    var iNext = hiIndex;

    do {
      iNext = (iNext + 1) % nPts;
    } while (ring[iNext].equals2D(hiPt) && iNext !== hiIndex);

    var prev = ring[iPrev];
    var next = ring[iNext];
    if (prev.equals2D(hiPt) || next.equals2D(hiPt) || prev.equals2D(next)) return false;
    var disc = CGAlgorithms.computeOrientation(prev, hiPt, next);
    var isCCW = false;

    if (disc === 0) {
      isCCW = prev.x > next.x;
    } else {
      isCCW = disc > 0;
    }

    return isCCW;
  };

  CGAlgorithms.locatePointInRing = function (p, ring) {
    return RayCrossingCounter.locatePointInRing(p, ring);
  };

  CGAlgorithms.distancePointLinePerpendicular = function (p, A, B) {
    var len2 = (B.x - A.x) * (B.x - A.x) + (B.y - A.y) * (B.y - A.y);
    var s = ((A.y - p.y) * (B.x - A.x) - (A.x - p.x) * (B.y - A.y)) / len2;
    return Math.abs(s) * Math.sqrt(len2);
  };

  CGAlgorithms.computeOrientation = function (p1, p2, q) {
    return CGAlgorithms.orientationIndex(p1, p2, q);
  };

  CGAlgorithms.distancePointLine = function () {
    if (arguments.length === 2) {
      var p = arguments[0],
          line = arguments[1];
      if (line.length === 0) throw new IllegalArgumentException("Line array must contain at least one vertex");
      var minDistance = p.distance(line[0]);

      for (var i = 0; i < line.length - 1; i++) {
        var dist = CGAlgorithms.distancePointLine(p, line[i], line[i + 1]);

        if (dist < minDistance) {
          minDistance = dist;
        }
      }

      return minDistance;
    } else if (arguments.length === 3) {
      var _p = arguments[0],
          A = arguments[1],
          B = arguments[2];
      if (A.x === B.x && A.y === B.y) return _p.distance(A);
      var len2 = (B.x - A.x) * (B.x - A.x) + (B.y - A.y) * (B.y - A.y);
      var r = ((_p.x - A.x) * (B.x - A.x) + (_p.y - A.y) * (B.y - A.y)) / len2;
      if (r <= 0.0) return _p.distance(A);
      if (r >= 1.0) return _p.distance(B);
      var s = ((A.y - _p.y) * (B.x - A.x) - (A.x - _p.x) * (B.y - A.y)) / len2;
      return Math.abs(s) * Math.sqrt(len2);
    }
  };

  CGAlgorithms.isOnLine = function (p, pt) {
    var lineIntersector = new RobustLineIntersector();

    for (var i = 1; i < pt.length; i++) {
      var p0 = pt[i - 1];
      var p1 = pt[i];
      lineIntersector.computeIntersection(p, p0, p1);

      if (lineIntersector.hasIntersection()) {
        return true;
      }
    }

    return false;
  };

  CGAlgorithms.CLOCKWISE = -1;
  CGAlgorithms.RIGHT = CGAlgorithms.CLOCKWISE;
  CGAlgorithms.COUNTERCLOCKWISE = 1;
  CGAlgorithms.LEFT = CGAlgorithms.COUNTERCLOCKWISE;
  CGAlgorithms.COLLINEAR = 0;
  CGAlgorithms.STRAIGHT = CGAlgorithms.COLLINEAR;

  /**
   * @param {string=} message Optional message
   * @extends {Error}
   * @constructor
   * @private
   */
  function EmptyStackException(message) {
    this.message = message || '';
  }
  EmptyStackException.prototype = new Error();
  /**
   * @type {string}
   */

  EmptyStackException.prototype.name = 'EmptyStackException';

  /**
   * @see http://download.oracle.com/javase/6/docs/api/java/util/Stack.html
   *
   * @extends {List}
   * @constructor
   * @private
   */

  function Stack() {
    /**
     * @type {Array}
     * @private
     */
    this.array_ = [];
  }
  Stack.prototype = new List();
  /**
   * @override
   */

  Stack.prototype.add = function (e) {
    this.array_.push(e);
    return true;
  };
  /**
   * @override
   */


  Stack.prototype.get = function (index) {
    if (index < 0 || index >= this.size()) {
      throw new IndexOutOfBoundsException();
    }

    return this.array_[index];
  };
  /**
   * Pushes an item onto the top of this stack.
   * @param {Object} e
   * @return {Object}
   */


  Stack.prototype.push = function (e) {
    this.array_.push(e);
    return e;
  };
  /**
   * Pushes an item onto the top of this stack.
   * @param {Object} e
   * @return {Object}
   */


  Stack.prototype.pop = function (e) {
    if (this.array_.length === 0) {
      throw new EmptyStackException();
    }

    return this.array_.pop();
  };
  /**
   * Looks at the object at the top of this stack without removing it from the
   * stack.
   * @return {Object}
   */


  Stack.prototype.peek = function () {
    if (this.array_.length === 0) {
      throw new EmptyStackException();
    }

    return this.array_[this.array_.length - 1];
  };
  /**
   * Tests if this stack is empty.
   * @return {boolean} true if and only if this stack contains no items; false
   *         otherwise.
   */


  Stack.prototype.empty = function () {
    if (this.array_.length === 0) {
      return true;
    } else {
      return false;
    }
  };
  /**
   * @return {boolean}
   */


  Stack.prototype.isEmpty = function () {
    return this.empty();
  };
  /**
   * Returns the 1-based position where an object is on this stack. If the object
   * o occurs as an item in this stack, this method returns the distance from the
   * top of the stack of the occurrence nearest the top of the stack; the topmost
   * item on the stack is considered to be at distance 1. The equals method is
   * used to compare o to the items in this stack.
   *
   * NOTE: does not currently actually use equals. (=== is used)
   *
   * @param {Object} o
   * @return {number} the 1-based position from the top of the stack where the
   *         object is located; the return value -1 indicates that the object is
   *         not on the stack.
   */


  Stack.prototype.search = function (o) {
    return this.array_.indexOf(o);
  };
  /**
   * @return {number}
   * @export
   */


  Stack.prototype.size = function () {
    return this.array_.length;
  };
  /**
   * @return {Array}
   */


  Stack.prototype.toArray = function () {
    var array = [];

    for (var i = 0, len = this.array_.length; i < len; i++) {
      array.push(this.array_[i]);
    }

    return array;
  };

  function UniqueCoordinateArrayFilter() {
    this.treeSet = new TreeSet();
    this.list = new ArrayList();
  }
  extend(UniqueCoordinateArrayFilter.prototype, {
    filter: function filter(coord) {
      if (!this.treeSet.contains(coord)) {
        this.list.add(coord);
        this.treeSet.add(coord);
      }
    },
    getCoordinates: function getCoordinates() {
      var coordinates = new Array(this.list.size()).fill(null);
      return this.list.toArray(coordinates);
    },
    interfaces_: function interfaces_() {
      return [CoordinateFilter];
    },
    getClass: function getClass() {
      return UniqueCoordinateArrayFilter;
    }
  });

  UniqueCoordinateArrayFilter.filterCoordinates = function (coords) {
    var filter = new UniqueCoordinateArrayFilter();

    for (var i = 0; i < coords.length; i++) {
      filter.filter(coords[i]);
    }

    return filter.getCoordinates();
  };

  function ConvexHull() {
    this._geomFactory = null;
    this._inputPts = null;

    if (arguments.length === 1) {
      var geometry = arguments[0];
      ConvexHull.call(this, ConvexHull.extractCoordinates(geometry), geometry.getFactory());
    } else if (arguments.length === 2) {
      var pts = arguments[0],
          geomFactory = arguments[1];
      this._inputPts = UniqueCoordinateArrayFilter.filterCoordinates(pts);
      this._geomFactory = geomFactory;
    }
  }
  extend(ConvexHull.prototype, {
    preSort: function preSort(pts) {
      var t = null;

      for (var i = 1; i < pts.length; i++) {
        if (pts[i].y < pts[0].y || pts[i].y === pts[0].y && pts[i].x < pts[0].x) {
          t = pts[0];
          pts[0] = pts[i];
          pts[i] = t;
        }
      }

      Arrays.sort(pts, 1, pts.length, new RadialComparator(pts[0]));
      return pts;
    },
    computeOctRing: function computeOctRing(inputPts) {
      var octPts = this.computeOctPts(inputPts);
      var coordList = new CoordinateList();
      coordList.add(octPts, false);

      if (coordList.size() < 3) {
        return null;
      }

      coordList.closeRing();
      return coordList.toCoordinateArray();
    },
    lineOrPolygon: function lineOrPolygon(coordinates) {
      coordinates = this.cleanRing(coordinates);

      if (coordinates.length === 3) {
        return this._geomFactory.createLineString([coordinates[0], coordinates[1]]);
      }

      var linearRing = this._geomFactory.createLinearRing(coordinates);

      return this._geomFactory.createPolygon(linearRing);
    },
    cleanRing: function cleanRing(original) {
      Assert.equals(original[0], original[original.length - 1]);
      var cleanedRing = new ArrayList();
      var previousDistinctCoordinate = null;

      for (var i = 0; i <= original.length - 2; i++) {
        var currentCoordinate = original[i];
        var nextCoordinate = original[i + 1];

        if (currentCoordinate.equals(nextCoordinate)) {
          continue;
        }

        if (previousDistinctCoordinate !== null && this.isBetween(previousDistinctCoordinate, currentCoordinate, nextCoordinate)) {
          continue;
        }

        cleanedRing.add(currentCoordinate);
        previousDistinctCoordinate = currentCoordinate;
      }

      cleanedRing.add(original[original.length - 1]);
      var cleanedRingCoordinates = new Array(cleanedRing.size()).fill(null);
      return cleanedRing.toArray(cleanedRingCoordinates);
    },
    isBetween: function isBetween(c1, c2, c3) {
      if (Orientation.index(c1, c2, c3) !== 0) {
        return false;
      }

      if (c1.x !== c3.x) {
        if (c1.x <= c2.x && c2.x <= c3.x) {
          return true;
        }

        if (c3.x <= c2.x && c2.x <= c1.x) {
          return true;
        }
      }

      if (c1.y !== c3.y) {
        if (c1.y <= c2.y && c2.y <= c3.y) {
          return true;
        }

        if (c3.y <= c2.y && c2.y <= c1.y) {
          return true;
        }
      }

      return false;
    },
    reduce: function reduce(inputPts) {
      var polyPts = this.computeOctRing(inputPts);
      if (polyPts === null) return inputPts;
      var reducedSet = new TreeSet();

      for (var i = 0; i < polyPts.length; i++) {
        reducedSet.add(polyPts[i]);
      }

      for (var i = 0; i < inputPts.length; i++) {
        if (!PointLocation.isInRing(inputPts[i], polyPts)) {
          reducedSet.add(inputPts[i]);
        }
      }

      var reducedPts = CoordinateArrays.toCoordinateArray(reducedSet);
      if (reducedPts.length < 3) return this.padArray3(reducedPts);
      return reducedPts;
    },
    getConvexHull: function getConvexHull() {
      if (this._inputPts.length === 0) {
        return this._geomFactory.createGeometryCollection();
      }

      if (this._inputPts.length === 1) {
        return this._geomFactory.createPoint(this._inputPts[0]);
      }

      if (this._inputPts.length === 2) {
        return this._geomFactory.createLineString(this._inputPts);
      }

      var reducedPts = this._inputPts;

      if (this._inputPts.length > 50) {
        reducedPts = this.reduce(this._inputPts);
      }

      var sortedPts = this.preSort(reducedPts);
      var cHS = this.grahamScan(sortedPts);
      var cH = this.toCoordinateArray(cHS);
      return this.lineOrPolygon(cH);
    },
    padArray3: function padArray3(pts) {
      var pad = new Array(3).fill(null);

      for (var i = 0; i < pad.length; i++) {
        if (i < pts.length) {
          pad[i] = pts[i];
        } else pad[i] = pts[0];
      }

      return pad;
    },
    computeOctPts: function computeOctPts(inputPts) {
      var pts = new Array(8).fill(null);

      for (var j = 0; j < pts.length; j++) {
        pts[j] = inputPts[0];
      }

      for (var i = 1; i < inputPts.length; i++) {
        if (inputPts[i].x < pts[0].x) {
          pts[0] = inputPts[i];
        }

        if (inputPts[i].x - inputPts[i].y < pts[1].x - pts[1].y) {
          pts[1] = inputPts[i];
        }

        if (inputPts[i].y > pts[2].y) {
          pts[2] = inputPts[i];
        }

        if (inputPts[i].x + inputPts[i].y > pts[3].x + pts[3].y) {
          pts[3] = inputPts[i];
        }

        if (inputPts[i].x > pts[4].x) {
          pts[4] = inputPts[i];
        }

        if (inputPts[i].x - inputPts[i].y > pts[5].x - pts[5].y) {
          pts[5] = inputPts[i];
        }

        if (inputPts[i].y < pts[6].y) {
          pts[6] = inputPts[i];
        }

        if (inputPts[i].x + inputPts[i].y < pts[7].x + pts[7].y) {
          pts[7] = inputPts[i];
        }
      }

      return pts;
    },
    toCoordinateArray: function toCoordinateArray(stack) {
      var coordinates = new Array(stack.size()).fill(null);

      for (var i = 0; i < stack.size(); i++) {
        var coordinate = stack.get(i);
        coordinates[i] = coordinate;
      }

      return coordinates;
    },
    grahamScan: function grahamScan(c) {
      var p = null;
      var ps = new Stack();
      ps.push(c[0]);
      ps.push(c[1]);
      ps.push(c[2]);

      for (var i = 3; i < c.length; i++) {
        p = ps.pop();

        while (!ps.empty() && Orientation.index(ps.peek(), p, c[i]) > 0) {
          p = ps.pop();
        }

        ps.push(p);
        ps.push(c[i]);
      }

      ps.push(c[0]);
      return ps;
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return ConvexHull;
    }
  });

  ConvexHull.extractCoordinates = function (geom) {
    var filter = new UniqueCoordinateArrayFilter();
    geom.apply(filter);
    return filter.getCoordinates();
  };

  function RadialComparator() {
    this._origin = null;
    var origin = arguments[0];
    this._origin = origin;
  }

  extend(RadialComparator.prototype, {
    compare: function compare(o1, o2) {
      var p1 = o1;
      var p2 = o2;
      return RadialComparator.polarCompare(this._origin, p1, p2);
    },
    interfaces_: function interfaces_() {
      return [Comparator];
    },
    getClass: function getClass() {
      return RadialComparator;
    }
  });

  RadialComparator.polarCompare = function (o, p, q) {
    var dxp = p.x - o.x;
    var dyp = p.y - o.y;
    var dxq = q.x - o.x;
    var dyq = q.y - o.y;
    var orient = Orientation.index(o, p, q);
    if (orient === Orientation.COUNTERCLOCKWISE) return 1;
    if (orient === Orientation.CLOCKWISE) return -1;
    var op = dxp * dxp + dyp * dyp;
    var oq = dxq * dxq + dyq * dyq;

    if (op < oq) {
      return -1;
    }

    if (op > oq) {
      return 1;
    }

    return 0;
  };

  ConvexHull.RadialComparator = RadialComparator;

  function InteriorPointArea() {
    this._factory = null;
    this._interiorPoint = null;
    this._maxWidth = 0.0;
    var g = arguments[0];
    this._factory = g.getFactory();
    this.add(g);
  }
  extend(InteriorPointArea.prototype, {
    addPolygon: function addPolygon(geometry) {
      if (geometry.isEmpty()) return null;
      var intPt = null;
      var width = null;
      var bisector = this.horizontalBisector(geometry);

      if (bisector.getLength() === 0.0) {
        width = 0;
        intPt = bisector.getCoordinate();
      } else {
        var intersections = bisector.intersection(geometry);
        var widestIntersection = this.widestGeometry(intersections);
        width = widestIntersection.getEnvelopeInternal().getWidth();
        intPt = InteriorPointArea.centre(widestIntersection.getEnvelopeInternal());
      }

      if (this._interiorPoint === null || width > this._maxWidth) {
        this._interiorPoint = intPt;
        this._maxWidth = width;
      }
    },
    getInteriorPoint: function getInteriorPoint() {
      return this._interiorPoint;
    },
    widestGeometry: function widestGeometry() {
      if (arguments[0] instanceof GeometryCollection) {
        var gc = arguments[0];

        if (gc.isEmpty()) {
          return gc;
        }

        var widestGeometry = gc.getGeometryN(0);

        for (var i = 1; i < gc.getNumGeometries(); i++) {
          if (gc.getGeometryN(i).getEnvelopeInternal().getWidth() > widestGeometry.getEnvelopeInternal().getWidth()) {
            widestGeometry = gc.getGeometryN(i);
          }
        }

        return widestGeometry;
      } else if (arguments[0] instanceof Geometry) {
        var geometry = arguments[0];

        if (!(geometry instanceof GeometryCollection)) {
          return geometry;
        }

        return this.widestGeometry(geometry);
      }
    },
    horizontalBisector: function horizontalBisector(geometry) {
      var envelope = geometry.getEnvelopeInternal();
      var bisectY = SafeBisectorFinder.getBisectorY(geometry);
      return this._factory.createLineString([new Coordinate(envelope.getMinX(), bisectY), new Coordinate(envelope.getMaxX(), bisectY)]);
    },
    add: function add(geom) {
      if (geom instanceof Polygon) {
        this.addPolygon(geom);
      } else if (geom instanceof GeometryCollection) {
        var gc = geom;

        for (var i = 0; i < gc.getNumGeometries(); i++) {
          this.add(gc.getGeometryN(i));
        }
      }
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return InteriorPointArea;
    }
  });

  InteriorPointArea.centre = function (envelope) {
    return new Coordinate(InteriorPointArea.avg(envelope.getMinX(), envelope.getMaxX()), InteriorPointArea.avg(envelope.getMinY(), envelope.getMaxY()));
  };

  InteriorPointArea.avg = function (a, b) {
    return (a + b) / 2.0;
  };

  function SafeBisectorFinder() {
    this._poly = null;
    this._centreY = null;
    this._hiY = Double.MAX_VALUE;
    this._loY = -Double.MAX_VALUE;
    var poly = arguments[0];
    this._poly = poly;
    this._hiY = poly.getEnvelopeInternal().getMaxY();
    this._loY = poly.getEnvelopeInternal().getMinY();
    this._centreY = InteriorPointArea.avg(this._loY, this._hiY);
  }

  extend(SafeBisectorFinder.prototype, {
    updateInterval: function updateInterval(y) {
      if (y <= this._centreY) {
        if (y > this._loY) this._loY = y;
      } else if (y > this._centreY) {
        if (y < this._hiY) {
          this._hiY = y;
        }
      }
    },
    getBisectorY: function getBisectorY() {
      this.process(this._poly.getExteriorRing());

      for (var i = 0; i < this._poly.getNumInteriorRing(); i++) {
        this.process(this._poly.getInteriorRingN(i));
      }

      var bisectY = InteriorPointArea.avg(this._hiY, this._loY);
      return bisectY;
    },
    process: function process(line) {
      var seq = line.getCoordinateSequence();

      for (var i = 0; i < seq.size(); i++) {
        var y = seq.getY(i);
        this.updateInterval(y);
      }
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return SafeBisectorFinder;
    }
  });

  SafeBisectorFinder.getBisectorY = function (poly) {
    var finder = new SafeBisectorFinder(poly);
    return finder.getBisectorY();
  };

  InteriorPointArea.SafeBisectorFinder = SafeBisectorFinder;

  function InteriorPointLine() {
    this._centroid = null;
    this._minDistance = Double.MAX_VALUE;
    this._interiorPoint = null;
    var g = arguments[0];
    this._centroid = g.getCentroid().getCoordinate();
    this.addInterior(g);
    if (this._interiorPoint === null) this.addEndpoints(g);
  }
  extend(InteriorPointLine.prototype, {
    addEndpoints: function addEndpoints() {
      if (arguments[0] instanceof Geometry) {
        var geom = arguments[0];

        if (geom instanceof LineString) {
          this.addEndpoints(geom.getCoordinates());
        } else if (geom instanceof GeometryCollection) {
          var gc = geom;

          for (var i = 0; i < gc.getNumGeometries(); i++) {
            this.addEndpoints(gc.getGeometryN(i));
          }
        }
      } else if (arguments[0] instanceof Array) {
        var pts = arguments[0];
        this.add(pts[0]);
        this.add(pts[pts.length - 1]);
      }
    },
    getInteriorPoint: function getInteriorPoint() {
      return this._interiorPoint;
    },
    addInterior: function addInterior() {
      if (arguments[0] instanceof Geometry) {
        var geom = arguments[0];

        if (geom instanceof LineString) {
          this.addInterior(geom.getCoordinates());
        } else if (geom instanceof GeometryCollection) {
          var gc = geom;

          for (var i = 0; i < gc.getNumGeometries(); i++) {
            this.addInterior(gc.getGeometryN(i));
          }
        }
      } else if (arguments[0] instanceof Array) {
        var pts = arguments[0];

        for (var i = 1; i < pts.length - 1; i++) {
          this.add(pts[i]);
        }
      }
    },
    add: function add(point) {
      var dist = point.distance(this._centroid);

      if (dist < this._minDistance) {
        this._interiorPoint = new Coordinate(point);
        this._minDistance = dist;
      }
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return InteriorPointLine;
    }
  });

  function InteriorPointPoint() {
    this._centroid = null;
    this._minDistance = Double.MAX_VALUE;
    this._interiorPoint = null;
    var g = arguments[0];
    this._centroid = g.getCentroid().getCoordinate();
    this.add(g);
  }
  extend(InteriorPointPoint.prototype, {
    getInteriorPoint: function getInteriorPoint() {
      return this._interiorPoint;
    },
    add: function add() {
      if (arguments[0] instanceof Geometry) {
        var geom = arguments[0];

        if (geom instanceof Point) {
          this.add(geom.getCoordinate());
        } else if (geom instanceof GeometryCollection) {
          var gc = geom;

          for (var i = 0; i < gc.getNumGeometries(); i++) {
            this.add(gc.getGeometryN(i));
          }
        }
      } else if (arguments[0] instanceof Coordinate) {
        var point = arguments[0];
        var dist = point.distance(this._centroid);

        if (dist < this._minDistance) {
          this._interiorPoint = new Coordinate(point);
          this._minDistance = dist;
        }
      }
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return InteriorPointPoint;
    }
  });

  function MonotoneChainSelectAction() {
    this.selectedSegment = new LineSegment();
  }
  extend(MonotoneChainSelectAction.prototype, {
    select: function select() {
      if (arguments.length === 1) ; else if (arguments.length === 2) {
        var mc = arguments[0],
            startIndex = arguments[1];
        mc.getLineSegment(startIndex, this.selectedSegment);
        this.select(this.selectedSegment);
      }
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return MonotoneChainSelectAction;
    }
  });

  function NodeBase() {
    this._items = new ArrayList();
    this._subnode = new Array(2).fill(null);
  }
  extend(NodeBase.prototype, {
    hasChildren: function hasChildren() {
      for (var i = 0; i < 2; i++) {
        if (this._subnode[i] !== null) return true;
      }

      return false;
    },
    isPrunable: function isPrunable() {
      return !(this.hasChildren() || this.hasItems());
    },
    addAllItems: function addAllItems(items) {
      items.addAll(this._items);

      for (var i = 0; i < 2; i++) {
        if (this._subnode[i] !== null) {
          this._subnode[i].addAllItems(items);
        }
      }

      return items;
    },
    size: function size() {
      var subSize = 0;

      for (var i = 0; i < 2; i++) {
        if (this._subnode[i] !== null) {
          subSize += this._subnode[i].size();
        }
      }

      return subSize + this._items.size();
    },
    addAllItemsFromOverlapping: function addAllItemsFromOverlapping(interval, resultItems) {
      if (interval !== null && !this.isSearchMatch(interval)) return null;
      resultItems.addAll(this._items);
      if (this._subnode[0] !== null) this._subnode[0].addAllItemsFromOverlapping(interval, resultItems);
      if (this._subnode[1] !== null) this._subnode[1].addAllItemsFromOverlapping(interval, resultItems);
    },
    hasItems: function hasItems() {
      return !this._items.isEmpty();
    },
    remove: function remove(itemInterval, item) {
      if (!this.isSearchMatch(itemInterval)) return false;
      var found = false;

      for (var i = 0; i < 2; i++) {
        if (this._subnode[i] !== null) {
          found = this._subnode[i].remove(itemInterval, item);

          if (found) {
            if (this._subnode[i].isPrunable()) this._subnode[i] = null;
            break;
          }
        }
      }

      if (found) return found;
      found = this._items.remove(item);
      return found;
    },
    getItems: function getItems() {
      return this._items;
    },
    depth: function depth() {
      var maxSubDepth = 0;

      for (var i = 0; i < 2; i++) {
        if (this._subnode[i] !== null) {
          var sqd = this._subnode[i].depth();

          if (sqd > maxSubDepth) maxSubDepth = sqd;
        }
      }

      return maxSubDepth + 1;
    },
    nodeSize: function nodeSize() {
      var subSize = 0;

      for (var i = 0; i < 2; i++) {
        if (this._subnode[i] !== null) {
          subSize += this._subnode[i].nodeSize();
        }
      }

      return subSize + 1;
    },
    add: function add(item) {
      this._items.add(item);
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return NodeBase;
    }
  });

  NodeBase.getSubnodeIndex = function (interval, centre) {
    var subnodeIndex = -1;
    if (interval.min >= centre) subnodeIndex = 1;
    if (interval.max <= centre) subnodeIndex = 0;
    return subnodeIndex;
  };

  function Interval() {
    this.min = null;
    this.max = null;

    if (arguments.length === 0) {
      this.min = 0.0;
      this.max = 0.0;
    } else if (arguments.length === 1) {
      var interval = arguments[0];
      this.init(interval.min, interval.max);
    } else if (arguments.length === 2) {
      var min = arguments[0],
          max = arguments[1];
      this.init(min, max);
    }
  }
  extend(Interval.prototype, {
    expandToInclude: function expandToInclude(interval) {
      if (interval.max > this.max) this.max = interval.max;
      if (interval.min < this.min) this.min = interval.min;
    },
    getWidth: function getWidth() {
      return this.max - this.min;
    },
    overlaps: function overlaps() {
      if (arguments.length === 1) {
        var interval = arguments[0];
        return this.overlaps(interval.min, interval.max);
      } else if (arguments.length === 2) {
        var min = arguments[0],
            max = arguments[1];
        if (this.min > max || this.max < min) return false;
        return true;
      }
    },
    getMin: function getMin() {
      return this.min;
    },
    toString: function toString() {
      return "[" + this.min + ", " + this.max + "]";
    },
    contains: function contains() {
      if (arguments.length === 1) {
        if (arguments[0] instanceof Interval) {
          var interval = arguments[0];
          return this.contains(interval.min, interval.max);
        } else if (typeof arguments[0] === "number") {
          var p = arguments[0];
          return p >= this.min && p <= this.max;
        }
      } else if (arguments.length === 2) {
        var min = arguments[0],
            max = arguments[1];
        return min >= this.min && max <= this.max;
      }
    },
    init: function init(min, max) {
      this.min = min;
      this.max = max;

      if (min > max) {
        this.min = max;
        this.max = min;
      }
    },
    getMax: function getMax() {
      return this.max;
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return Interval;
    }
  });

  function DoubleBits() {}

  DoubleBits.exponent = function (d) {
    return CVTFWD(64, d) - 1023;
  };

  DoubleBits.powerOf2 = function (exp) {
    return Math.pow(2, exp);
  };
  /**
   * Calculates the exponent of the bit-pattern for a number. Uses code from:
   * http://www.merlyn.demon.co.uk/js-exact.htm
   *
   * @param {Number}
   *          NumW 32 or 64 to denote the number of bits.
   * @param {Number}
   *          Qty the number to calculate the bit pattern for.
   * @return {Number} The integer value of the exponent.
   * @private
   */


  function CVTFWD(NumW, Qty) {
    var Sign;
    var Expo;
    var Mant;
    var Bin;
    var Inf = {
      32: {
        d: 0x7F,
        c: 0x80,
        b: 0,
        a: 0
      },
      64: {
        d: 0x7FF0,
        c: 0,
        b: 0,
        a: 0
      }
    };
    var ExW = {
      32: 8,
      64: 11
    }[NumW];

    if (!Bin) {
      Sign = Qty < 0 || 1 / Qty < 0; // OK for +-0

      if (!isFinite(Qty)) {
        Bin = Inf[NumW];

        if (Sign) {
          Bin.d += 1 << NumW / 4 - 1;
        }

        Expo = Math.pow(2, ExW) - 1;
        Mant = 0;
      }
    }

    if (!Bin) {
      Expo = {
        32: 127,
        64: 1023
      }[NumW];
      Mant = Math.abs(Qty);

      while (Mant >= 2) {
        Expo++;
        Mant /= 2;
      }

      while (Mant < 1 && Expo > 0) {
        Expo--;
        Mant *= 2;
      }

      if (Expo <= 0) {
        Mant /= 2;
      }

      if (NumW === 32 && Expo > 254) {
        Bin = {
          d: Sign ? 0xFF : 0x7F,
          c: 0x80,
          b: 0,
          a: 0
        };
        Expo = Math.pow(2, ExW) - 1;
        Mant = 0;
      }
    }

    return Expo;
  }

  function Key() {
    this._pt = 0.0;
    this._level = 0;
    this._interval = null;
    var interval = arguments[0];
    this.computeKey(interval);
  }
  extend(Key.prototype, {
    getInterval: function getInterval() {
      return this._interval;
    },
    getLevel: function getLevel() {
      return this._level;
    },
    computeKey: function computeKey(itemInterval) {
      this._level = Key.computeLevel(itemInterval);
      this._interval = new Interval();
      this.computeInterval(this._level, itemInterval);

      while (!this._interval.contains(itemInterval)) {
        this._level += 1;
        this.computeInterval(this._level, itemInterval);
      }
    },
    computeInterval: function computeInterval(level, itemInterval) {
      var size = DoubleBits.powerOf2(level);
      this._pt = Math.floor(itemInterval.getMin() / size) * size;

      this._interval.init(this._pt, this._pt + size);
    },
    getPoint: function getPoint() {
      return this._pt;
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return Key;
    }
  });

  Key.computeLevel = function (interval) {
    var dx = interval.getWidth();
    var level = DoubleBits.exponent(dx) + 1;
    return level;
  };

  function Node() {
    NodeBase.apply(this);
    this._interval = null;
    this._centre = null;
    this._level = null;
    var interval = arguments[0],
        level = arguments[1];
    this._interval = interval;
    this._level = level;
    this._centre = (interval.getMin() + interval.getMax()) / 2;
  }
  inherits(Node, NodeBase);
  extend(Node.prototype, {
    getInterval: function getInterval() {
      return this._interval;
    },
    find: function find(searchInterval) {
      var subnodeIndex = NodeBase.getSubnodeIndex(searchInterval, this._centre);
      if (subnodeIndex === -1) return this;

      if (this._subnode[subnodeIndex] !== null) {
        var node = this._subnode[subnodeIndex];
        return node.find(searchInterval);
      }

      return this;
    },
    insert: function insert(node) {
      Assert.isTrue(this._interval === null || this._interval.contains(node._interval));
      var index = NodeBase.getSubnodeIndex(node._interval, this._centre);

      if (node._level === this._level - 1) {
        this._subnode[index] = node;
      } else {
        var childNode = this.createSubnode(index);
        childNode.insert(node);
        this._subnode[index] = childNode;
      }
    },
    isSearchMatch: function isSearchMatch(itemInterval) {
      return itemInterval.overlaps(this._interval);
    },
    getSubnode: function getSubnode(index) {
      if (this._subnode[index] === null) {
        this._subnode[index] = this.createSubnode(index);
      }

      return this._subnode[index];
    },
    getNode: function getNode(searchInterval) {
      var subnodeIndex = NodeBase.getSubnodeIndex(searchInterval, this._centre);

      if (subnodeIndex !== -1) {
        var node = this.getSubnode(subnodeIndex);
        return node.getNode(searchInterval);
      } else {
        return this;
      }
    },
    createSubnode: function createSubnode(index) {
      var min = 0.0;
      var max = 0.0;

      switch (index) {
        case 0:
          min = this._interval.getMin();
          max = this._centre;
          break;

        case 1:
          min = this._centre;
          max = this._interval.getMax();
          break;
      }

      var subInt = new Interval(min, max);
      var node = new Node(subInt, this._level - 1);
      return node;
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return Node;
    }
  });

  Node.createNode = function (itemInterval) {
    var key = new Key(itemInterval);
    var node = new Node(key.getInterval(), key.getLevel());
    return node;
  };

  Node.createExpanded = function (node, addInterval) {
    var expandInt = new Interval(addInterval);
    if (node !== null) expandInt.expandToInclude(node._interval);
    var largerNode = Node.createNode(expandInt);
    if (node !== null) largerNode.insert(node);
    return largerNode;
  };

  function IntervalSize() {}
  extend(IntervalSize.prototype, {
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return IntervalSize;
    }
  });

  IntervalSize.isZeroWidth = function (min, max) {
    var width = max - min;
    if (width === 0.0) return true;
    var maxAbs = Math.max(Math.abs(min), Math.abs(max));
    var scaledInterval = width / maxAbs;
    var level = DoubleBits.exponent(scaledInterval);
    return level <= IntervalSize.MIN_BINARY_EXPONENT;
  };

  IntervalSize.MIN_BINARY_EXPONENT = -50;

  function Root() {
    NodeBase.apply(this);
  }
  inherits(Root, NodeBase);
  extend(Root.prototype, {
    insert: function insert(itemInterval, item) {
      var index = NodeBase.getSubnodeIndex(itemInterval, Root.origin);

      if (index === -1) {
        this.add(item);
        return null;
      }

      var node = this._subnode[index];

      if (node === null || !node.getInterval().contains(itemInterval)) {
        var largerNode = Node.createExpanded(node, itemInterval);
        this._subnode[index] = largerNode;
      }

      this.insertContained(this._subnode[index], itemInterval, item);
    },
    isSearchMatch: function isSearchMatch(interval) {
      return true;
    },
    insertContained: function insertContained(tree, itemInterval, item) {
      Assert.isTrue(tree.getInterval().contains(itemInterval));
      var isZeroArea = IntervalSize.isZeroWidth(itemInterval.getMin(), itemInterval.getMax());
      var node = null;
      if (isZeroArea) node = tree.find(itemInterval);else node = tree.getNode(itemInterval);
      node.add(item);
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return Root;
    }
  });
  Root.origin = 0.0;

  function Bintree() {
    this._root = null;
    this._minExtent = 1.0;
    this._root = new Root();
  }
  extend(Bintree.prototype, {
    size: function size() {
      if (this._root !== null) return this._root.size();
      return 0;
    },
    insert: function insert(itemInterval, item) {
      this.collectStats(itemInterval);
      var insertInterval = Bintree.ensureExtent(itemInterval, this._minExtent);

      this._root.insert(insertInterval, item);
    },
    query: function query() {
      if (arguments.length === 1) {
        if (typeof arguments[0] === "number") {
          var x = arguments[0];
          return this.query(new Interval(x, x));
        } else if (arguments[0] instanceof Interval) {
          var interval = arguments[0];
          var foundItems = new ArrayList();
          this.query(interval, foundItems);
          return foundItems;
        }
      } else if (arguments.length === 2) {
        var _interval = arguments[0],
            _foundItems = arguments[1];

        this._root.addAllItemsFromOverlapping(_interval, _foundItems);
      }
    },
    iterator: function iterator() {
      var foundItems = new ArrayList();

      this._root.addAllItems(foundItems);

      return foundItems.iterator();
    },
    remove: function remove(itemInterval, item) {
      var insertInterval = Bintree.ensureExtent(itemInterval, this._minExtent);
      return this._root.remove(insertInterval, item);
    },
    collectStats: function collectStats(interval) {
      var del = interval.getWidth();
      if (del < this._minExtent && del > 0.0) this._minExtent = del;
    },
    depth: function depth() {
      if (this._root !== null) return this._root.depth();
      return 0;
    },
    nodeSize: function nodeSize() {
      if (this._root !== null) return this._root.nodeSize();
      return 0;
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return Bintree;
    }
  });

  Bintree.ensureExtent = function (itemInterval, minExtent) {
    var min = itemInterval.getMin();
    var max = itemInterval.getMax();
    if (min !== max) return itemInterval;

    if (min === max) {
      min = min - minExtent / 2.0;
      max = min + minExtent / 2.0;
    }

    return new Interval(min, max);
  };

  function MonotoneChain() {
    this._pts = null;
    this._start = null;
    this._end = null;
    this._env = null;
    this._context = null;
    this._id = null;
    var pts = arguments[0],
        start = arguments[1],
        end = arguments[2],
        context = arguments[3];
    this._pts = pts;
    this._start = start;
    this._end = end;
    this._context = context;
  }
  extend(MonotoneChain.prototype, {
    getLineSegment: function getLineSegment(index, ls) {
      ls.p0 = this._pts[index];
      ls.p1 = this._pts[index + 1];
    },
    computeSelect: function computeSelect(searchEnv, start0, end0, mcs) {
      var p0 = this._pts[start0];
      var p1 = this._pts[end0];

      if (end0 - start0 === 1) {
        mcs.select(this, start0);
        return null;
      }

      if (!searchEnv.intersects(p0, p1)) return null;
      var mid = Math.trunc((start0 + end0) / 2);

      if (start0 < mid) {
        this.computeSelect(searchEnv, start0, mid, mcs);
      }

      if (mid < end0) {
        this.computeSelect(searchEnv, mid, end0, mcs);
      }
    },
    getCoordinates: function getCoordinates() {
      var coord = new Array(this._end - this._start + 1).fill(null);
      var index = 0;

      for (var i = this._start; i <= this._end; i++) {
        coord[index++] = this._pts[i];
      }

      return coord;
    },
    computeOverlaps: function computeOverlaps() {
      if (arguments.length === 2) {
        var mc = arguments[0],
            mco = arguments[1];
        this.computeOverlaps(this._start, this._end, mc, mc._start, mc._end, mco);
      } else if (arguments.length === 6) {
        var start0 = arguments[0],
            end0 = arguments[1],
            _mc = arguments[2],
            start1 = arguments[3],
            end1 = arguments[4],
            _mco = arguments[5];

        if (end0 - start0 === 1 && end1 - start1 === 1) {
          _mco.overlap(this, start0, _mc, start1);

          return null;
        }

        if (!this.overlaps(start0, end0, _mc, start1, end1)) return null;
        var mid0 = Math.trunc((start0 + end0) / 2);
        var mid1 = Math.trunc((start1 + end1) / 2);

        if (start0 < mid0) {
          if (start1 < mid1) this.computeOverlaps(start0, mid0, _mc, start1, mid1, _mco);
          if (mid1 < end1) this.computeOverlaps(start0, mid0, _mc, mid1, end1, _mco);
        }

        if (mid0 < end0) {
          if (start1 < mid1) this.computeOverlaps(mid0, end0, _mc, start1, mid1, _mco);
          if (mid1 < end1) this.computeOverlaps(mid0, end0, _mc, mid1, end1, _mco);
        }
      }
    },
    setId: function setId(id) {
      this._id = id;
    },
    select: function select(searchEnv, mcs) {
      this.computeSelect(searchEnv, this._start, this._end, mcs);
    },
    getEnvelope: function getEnvelope() {
      if (this._env === null) {
        var p0 = this._pts[this._start];
        var p1 = this._pts[this._end];
        this._env = new Envelope(p0, p1);
      }

      return this._env;
    },
    overlaps: function overlaps(start0, end0, mc, start1, end1) {
      return Envelope.intersects(this._pts[start0], this._pts[end0], mc._pts[start1], mc._pts[end1]);
    },
    getEndIndex: function getEndIndex() {
      return this._end;
    },
    getStartIndex: function getStartIndex() {
      return this._start;
    },
    getContext: function getContext() {
      return this._context;
    },
    getId: function getId() {
      return this._id;
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return MonotoneChain;
    }
  });

  function Quadrant() {}
  extend(Quadrant.prototype, {
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return Quadrant;
    }
  });

  Quadrant.isNorthern = function (quad) {
    return quad === Quadrant.NE || quad === Quadrant.NW;
  };

  Quadrant.isOpposite = function (quad1, quad2) {
    if (quad1 === quad2) return false;
    var diff = (quad1 - quad2 + 4) % 4;
    if (diff === 2) return true;
    return false;
  };

  Quadrant.commonHalfPlane = function (quad1, quad2) {
    if (quad1 === quad2) return quad1;
    var diff = (quad1 - quad2 + 4) % 4;
    if (diff === 2) return -1;
    var min = quad1 < quad2 ? quad1 : quad2;
    var max = quad1 > quad2 ? quad1 : quad2;
    if (min === 0 && max === 3) return 3;
    return min;
  };

  Quadrant.isInHalfPlane = function (quad, halfPlane) {
    if (halfPlane === Quadrant.SE) {
      return quad === Quadrant.SE || quad === Quadrant.SW;
    }

    return quad === halfPlane || quad === halfPlane + 1;
  };

  Quadrant.quadrant = function () {
    if (typeof arguments[0] === "number" && typeof arguments[1] === "number") {
      var dx = arguments[0],
          dy = arguments[1];
      if (dx === 0.0 && dy === 0.0) throw new IllegalArgumentException("Cannot compute the quadrant for point ( " + dx + ", " + dy + " )");

      if (dx >= 0.0) {
        if (dy >= 0.0) return Quadrant.NE;else return Quadrant.SE;
      } else {
        if (dy >= 0.0) return Quadrant.NW;else return Quadrant.SW;
      }
    } else if (arguments[0] instanceof Coordinate && arguments[1] instanceof Coordinate) {
      var p0 = arguments[0],
          p1 = arguments[1];
      if (p1.x === p0.x && p1.y === p0.y) throw new IllegalArgumentException("Cannot compute the quadrant for two identical points " + p0);

      if (p1.x >= p0.x) {
        if (p1.y >= p0.y) return Quadrant.NE;else return Quadrant.SE;
      } else {
        if (p1.y >= p0.y) return Quadrant.NW;else return Quadrant.SW;
      }
    }
  };

  Quadrant.NE = 0;
  Quadrant.NW = 1;
  Quadrant.SW = 2;
  Quadrant.SE = 3;

  function MonotoneChainBuilder() {}
  extend(MonotoneChainBuilder.prototype, {
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return MonotoneChainBuilder;
    }
  });

  MonotoneChainBuilder.getChainStartIndices = function (pts) {
    var start = 0;
    var startIndexList = new ArrayList();
    startIndexList.add(new Integer(start));

    do {
      var last = MonotoneChainBuilder.findChainEnd(pts, start);
      startIndexList.add(new Integer(last));
      start = last;
    } while (start < pts.length - 1);

    var startIndex = MonotoneChainBuilder.toIntArray(startIndexList);
    return startIndex;
  };

  MonotoneChainBuilder.findChainEnd = function (pts, start) {
    var safeStart = start;

    while (safeStart < pts.length - 1 && pts[safeStart].equals2D(pts[safeStart + 1])) {
      safeStart++;
    }

    if (safeStart >= pts.length - 1) {
      return pts.length - 1;
    }

    var chainQuad = Quadrant.quadrant(pts[safeStart], pts[safeStart + 1]);
    var last = start + 1;

    while (last < pts.length) {
      if (!pts[last - 1].equals2D(pts[last])) {
        var quad = Quadrant.quadrant(pts[last - 1], pts[last]);
        if (quad !== chainQuad) break;
      }

      last++;
    }

    return last - 1;
  };

  MonotoneChainBuilder.getChains = function () {
    if (arguments.length === 1) {
      var pts = arguments[0];
      return MonotoneChainBuilder.getChains(pts, null);
    } else if (arguments.length === 2) {
      var _pts = arguments[0],
          context = arguments[1];
      var mcList = new ArrayList();
      var startIndex = MonotoneChainBuilder.getChainStartIndices(_pts);

      for (var i = 0; i < startIndex.length - 1; i++) {
        var mc = new MonotoneChain(_pts, startIndex[i], startIndex[i + 1], context);
        mcList.add(mc);
      }

      return mcList;
    }
  };

  MonotoneChainBuilder.toIntArray = function (list) {
    var array = new Array(list.size()).fill(null);

    for (var i = 0; i < array.length; i++) {
      array[i] = list.get(i).intValue();
    }

    return array;
  };

  function RobustDeterminant() {}
  extend(RobustDeterminant.prototype, {
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return RobustDeterminant;
    }
  });

  RobustDeterminant.orientationIndex = function (p1, p2, q) {
    var dx1 = p2.x - p1.x;
    var dy1 = p2.y - p1.y;
    var dx2 = q.x - p2.x;
    var dy2 = q.y - p2.y;
    return RobustDeterminant.signOfDet2x2(dx1, dy1, dx2, dy2);
  };

  RobustDeterminant.signOfDet2x2 = function (x1, y1, x2, y2) {
    var sign = null;
    var swap = null;
    var k = null;
    sign = 1;

    if (x1 === 0.0 || y2 === 0.0) {
      if (y1 === 0.0 || x2 === 0.0) {
        return 0;
      } else if (y1 > 0) {
        if (x2 > 0) {
          return -sign;
        } else {
          return sign;
        }
      } else {
        if (x2 > 0) {
          return sign;
        } else {
          return -sign;
        }
      }
    }

    if (y1 === 0.0 || x2 === 0.0) {
      if (y2 > 0) {
        if (x1 > 0) {
          return sign;
        } else {
          return -sign;
        }
      } else {
        if (x1 > 0) {
          return -sign;
        } else {
          return sign;
        }
      }
    }

    if (0.0 < y1) {
      if (0.0 < y2) {
        if (y1 <= y2) ; else {
          sign = -sign;
          swap = x1;
          x1 = x2;
          x2 = swap;
          swap = y1;
          y1 = y2;
          y2 = swap;
        }
      } else {
        if (y1 <= -y2) {
          sign = -sign;
          x2 = -x2;
          y2 = -y2;
        } else {
          swap = x1;
          x1 = -x2;
          x2 = swap;
          swap = y1;
          y1 = -y2;
          y2 = swap;
        }
      }
    } else {
      if (0.0 < y2) {
        if (-y1 <= y2) {
          sign = -sign;
          x1 = -x1;
          y1 = -y1;
        } else {
          swap = -x1;
          x1 = x2;
          x2 = swap;
          swap = -y1;
          y1 = y2;
          y2 = swap;
        }
      } else {
        if (y1 >= y2) {
          x1 = -x1;
          y1 = -y1;
          x2 = -x2;
          y2 = -y2;
        } else {
          sign = -sign;
          swap = -x1;
          x1 = -x2;
          x2 = swap;
          swap = -y1;
          y1 = -y2;
          y2 = swap;
        }
      }
    }

    if (0.0 < x1) {
      if (0.0 < x2) {
        if (x1 <= x2) ; else {
          return sign;
        }
      } else {
        return sign;
      }
    } else {
      if (0.0 < x2) {
        return -sign;
      } else {
        if (x1 >= x2) {
          sign = -sign;
          x1 = -x1;
          x2 = -x2;
        } else {
          return -sign;
        }
      }
    }

    while (true) {
      k = Math.floor(x2 / x1);
      x2 = x2 - k * x1;
      y2 = y2 - k * y1;

      if (y2 < 0.0) {
        return -sign;
      }

      if (y2 > y1) {
        return sign;
      }

      if (x1 > x2 + x2) {
        if (y1 < y2 + y2) {
          return sign;
        }
      } else {
        if (y1 > y2 + y2) {
          return -sign;
        } else {
          x2 = x1 - x2;
          y2 = y1 - y2;
          sign = -sign;
        }
      }

      if (y2 === 0.0) {
        if (x2 === 0.0) {
          return 0;
        } else {
          return -sign;
        }
      }

      if (x2 === 0.0) {
        return sign;
      }

      k = Math.floor(x1 / x2);
      x1 = x1 - k * x2;
      y1 = y1 - k * y2;

      if (y1 < 0.0) {
        return sign;
      }

      if (y1 > y2) {
        return -sign;
      }

      if (x2 > x1 + x1) {
        if (y2 < y1 + y1) {
          return -sign;
        }
      } else {
        if (y2 > y1 + y1) {
          return sign;
        } else {
          x1 = x2 - x1;
          y1 = y2 - y1;
          sign = -sign;
        }
      }

      if (y1 === 0.0) {
        if (x1 === 0.0) {
          return 0;
        } else {
          return sign;
        }
      }

      if (x1 === 0.0) {
        return -sign;
      }
    }
  };

  function PointInRing() {}
  extend(PointInRing.prototype, {
    isInside: function isInside(pt) {},
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return PointInRing;
    }
  });

  function MCPointInRing() {
    this._ring = null;
    this._tree = null;
    this._crossings = 0;
    this._interval = new Interval();
    var ring = arguments[0];
    this._ring = ring;
    this.buildIndex();
  }
  extend(MCPointInRing.prototype, {
    testLineSegment: function testLineSegment(p, seg) {
      var xInt = null;
      var x1 = null;
      var y1 = null;
      var x2 = null;
      var y2 = null;
      var p1 = seg.p0;
      var p2 = seg.p1;
      x1 = p1.x - p.x;
      y1 = p1.y - p.y;
      x2 = p2.x - p.x;
      y2 = p2.y - p.y;

      if (y1 > 0 && y2 <= 0 || y2 > 0 && y1 <= 0) {
        xInt = RobustDeterminant.signOfDet2x2(x1, y1, x2, y2) / (y2 - y1);

        if (0.0 < xInt) {
          this._crossings++;
        }
      }
    },
    buildIndex: function buildIndex() {
      this._tree = new Bintree();
      var pts = CoordinateArrays.removeRepeatedPoints(this._ring.getCoordinates());
      var mcList = MonotoneChainBuilder.getChains(pts);

      for (var i = 0; i < mcList.size(); i++) {
        var mc = mcList.get(i);
        var mcEnv = mc.getEnvelope();
        this._interval.min = mcEnv.getMinY();
        this._interval.max = mcEnv.getMaxY();

        this._tree.insert(this._interval, mc);
      }
    },
    testMonotoneChain: function testMonotoneChain(rayEnv, mcSelecter, mc) {
      mc.select(rayEnv, mcSelecter);
    },
    isInside: function isInside(pt) {
      this._crossings = 0;
      var rayEnv = new Envelope(Double.NEGATIVE_INFINITY, Double.POSITIVE_INFINITY, pt.y, pt.y);
      this._interval.min = pt.y;
      this._interval.max = pt.y;

      var segs = this._tree.query(this._interval);

      var mcSelecter = new MCSelecter(this, pt);

      for (var i = segs.iterator(); i.hasNext();) {
        var mc = i.next();
        this.testMonotoneChain(rayEnv, mcSelecter, mc);
      }

      if (this._crossings % 2 === 1) {
        return true;
      }

      return false;
    },
    interfaces_: function interfaces_() {
      return [PointInRing];
    },
    getClass: function getClass() {
      return MCPointInRing;
    }
  });

  function MCSelecter() {
    MonotoneChainSelectAction.apply(this);
    this.mcp = null;
    this.p = null;
    var mcp = arguments[0],
        p = arguments[1];
    this.mcp = mcp;
    this.p = p;
  }

  inherits(MCSelecter, MonotoneChainSelectAction);
  extend(MCSelecter.prototype, {
    select: function select() {
      if (arguments.length === 1) {
        var ls = arguments[0];
        this.mcp.testLineSegment(this.p, ls);
      } else return MonotoneChainSelectAction.prototype.select.apply(this, arguments);
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return MCSelecter;
    }
  });
  MCPointInRing.MCSelecter = MCSelecter;

  function MinimumBoundingCircle() {
    this._input = null;
    this._extremalPts = null;
    this._centre = null;
    this._radius = 0.0;
    var geom = arguments[0];
    this._input = geom;
  }
  extend(MinimumBoundingCircle.prototype, {
    getRadius: function getRadius() {
      this.compute();
      return this._radius;
    },
    getDiameter: function getDiameter() {
      this.compute();

      switch (this._extremalPts.length) {
        case 0:
          return this._input.getFactory().createLineString();

        case 1:
          return this._input.getFactory().createPoint(this._centre);
      }

      var p0 = this._extremalPts[0];
      var p1 = this._extremalPts[1];
      return this._input.getFactory().createLineString([p0, p1]);
    },
    getExtremalPoints: function getExtremalPoints() {
      this.compute();
      return this._extremalPts;
    },
    computeCirclePoints: function computeCirclePoints() {
      if (this._input.isEmpty()) {
        this._extremalPts = new Array(0).fill(null);
        return null;
      }

      if (this._input.getNumPoints() === 1) {
        var pts = this._input.getCoordinates();

        this._extremalPts = [new Coordinate(pts[0])];
        return null;
      }

      var convexHull = this._input.convexHull();

      var hullPts = convexHull.getCoordinates();
      var pts = hullPts;

      if (hullPts[0].equals2D(hullPts[hullPts.length - 1])) {
        pts = new Array(hullPts.length - 1).fill(null);
        CoordinateArrays.copyDeep(hullPts, 0, pts, 0, hullPts.length - 1);
      }

      if (pts.length <= 2) {
        this._extremalPts = CoordinateArrays.copyDeep(pts);
        return null;
      }

      var P = MinimumBoundingCircle.lowestPoint(pts);
      var Q = MinimumBoundingCircle.pointWitMinAngleWithX(pts, P);

      for (var i = 0; i < pts.length; i++) {
        var R = MinimumBoundingCircle.pointWithMinAngleWithSegment(pts, P, Q);

        if (Angle.isObtuse(P, R, Q)) {
          this._extremalPts = [new Coordinate(P), new Coordinate(Q)];
          return null;
        }

        if (Angle.isObtuse(R, P, Q)) {
          P = R;
          continue;
        }

        if (Angle.isObtuse(R, Q, P)) {
          Q = R;
          continue;
        }

        this._extremalPts = [new Coordinate(P), new Coordinate(Q), new Coordinate(R)];
        return null;
      }

      Assert.shouldNeverReachHere("Logic failure in Minimum Bounding Circle algorithm!");
    },
    compute: function compute() {
      if (this._extremalPts !== null) return null;
      this.computeCirclePoints();
      this.computeCentre();
      if (this._centre !== null) this._radius = this._centre.distance(this._extremalPts[0]);
    },
    getFarthestPoints: function getFarthestPoints() {
      this.compute();

      switch (this._extremalPts.length) {
        case 0:
          return this._input.getFactory().createLineString();

        case 1:
          return this._input.getFactory().createPoint(this._centre);
      }

      var p0 = this._extremalPts[0];
      var p1 = this._extremalPts[this._extremalPts.length - 1];
      return this._input.getFactory().createLineString([p0, p1]);
    },
    getCircle: function getCircle() {
      this.compute();
      if (this._centre === null) return this._input.getFactory().createPolygon();

      var centrePoint = this._input.getFactory().createPoint(this._centre);

      if (this._radius === 0.0) return centrePoint;
      return centrePoint.buffer(this._radius);
    },
    getCentre: function getCentre() {
      this.compute();
      return this._centre;
    },
    computeCentre: function computeCentre() {
      switch (this._extremalPts.length) {
        case 0:
          this._centre = null;
          break;

        case 1:
          this._centre = this._extremalPts[0];
          break;

        case 2:
          this._centre = new Coordinate((this._extremalPts[0].x + this._extremalPts[1].x) / 2.0, (this._extremalPts[0].y + this._extremalPts[1].y) / 2.0);
          break;

        case 3:
          this._centre = Triangle.circumcentre(this._extremalPts[0], this._extremalPts[1], this._extremalPts[2]);
          break;
      }
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return MinimumBoundingCircle;
    }
  });

  MinimumBoundingCircle.pointWitMinAngleWithX = function (pts, P) {
    var minSin = Double.MAX_VALUE;
    var minAngPt = null;

    for (var i = 0; i < pts.length; i++) {
      var p = pts[i];
      if (p === P) continue;
      var dx = p.x - P.x;
      var dy = p.y - P.y;
      if (dy < 0) dy = -dy;
      var len = Math.sqrt(dx * dx + dy * dy);
      var sin = dy / len;

      if (sin < minSin) {
        minSin = sin;
        minAngPt = p;
      }
    }

    return minAngPt;
  };

  MinimumBoundingCircle.lowestPoint = function (pts) {
    var min = pts[0];

    for (var i = 1; i < pts.length; i++) {
      if (pts[i].y < min.y) min = pts[i];
    }

    return min;
  };

  MinimumBoundingCircle.pointWithMinAngleWithSegment = function (pts, P, Q) {
    var minAng = Double.MAX_VALUE;
    var minAngPt = null;

    for (var i = 0; i < pts.length; i++) {
      var p = pts[i];
      if (p === P) continue;
      if (p === Q) continue;
      var ang = Angle.angleBetween(P, p, Q);

      if (ang < minAng) {
        minAng = ang;
        minAngPt = p;
      }
    }

    return minAngPt;
  };

  function MinimumDiameter() {
    this._inputGeom = null;
    this._isConvex = null;
    this._convexHullPts = null;
    this._minBaseSeg = new LineSegment();
    this._minWidthPt = null;
    this._minPtIndex = null;
    this._minWidth = 0.0;

    if (arguments.length === 1) {
      var inputGeom = arguments[0];
      MinimumDiameter.call(this, inputGeom, false);
    } else if (arguments.length === 2) {
      var _inputGeom = arguments[0],
          isConvex = arguments[1];
      this._inputGeom = _inputGeom;
      this._isConvex = isConvex;
    }
  }
  extend(MinimumDiameter.prototype, {
    getWidthCoordinate: function getWidthCoordinate() {
      this.computeMinimumDiameter();
      return this._minWidthPt;
    },
    getSupportingSegment: function getSupportingSegment() {
      this.computeMinimumDiameter();
      return this._inputGeom.getFactory().createLineString([this._minBaseSeg.p0, this._minBaseSeg.p1]);
    },
    getDiameter: function getDiameter() {
      this.computeMinimumDiameter();
      if (this._minWidthPt === null) return this._inputGeom.getFactory().createLineString();

      var basePt = this._minBaseSeg.project(this._minWidthPt);

      return this._inputGeom.getFactory().createLineString([basePt, this._minWidthPt]);
    },
    computeWidthConvex: function computeWidthConvex(convexGeom) {
      if (convexGeom instanceof Polygon) this._convexHullPts = convexGeom.getExteriorRing().getCoordinates();else this._convexHullPts = convexGeom.getCoordinates();

      if (this._convexHullPts.length === 0) {
        this._minWidth = 0.0;
        this._minWidthPt = null;
        this._minBaseSeg = null;
      } else if (this._convexHullPts.length === 1) {
        this._minWidth = 0.0;
        this._minWidthPt = this._convexHullPts[0];
        this._minBaseSeg.p0 = this._convexHullPts[0];
        this._minBaseSeg.p1 = this._convexHullPts[0];
      } else if (this._convexHullPts.length === 2 || this._convexHullPts.length === 3) {
        this._minWidth = 0.0;
        this._minWidthPt = this._convexHullPts[0];
        this._minBaseSeg.p0 = this._convexHullPts[0];
        this._minBaseSeg.p1 = this._convexHullPts[1];
      } else this.computeConvexRingMinDiameter(this._convexHullPts);
    },
    computeConvexRingMinDiameter: function computeConvexRingMinDiameter(pts) {
      this._minWidth = Double.MAX_VALUE;
      var currMaxIndex = 1;
      var seg = new LineSegment();

      for (var i = 0; i < pts.length - 1; i++) {
        seg.p0 = pts[i];
        seg.p1 = pts[i + 1];
        currMaxIndex = this.findMaxPerpDistance(pts, seg, currMaxIndex);
      }
    },
    computeMinimumDiameter: function computeMinimumDiameter() {
      if (this._minWidthPt !== null) return null;
      if (this._isConvex) this.computeWidthConvex(this._inputGeom);else {
        var convexGeom = new ConvexHull(this._inputGeom).getConvexHull();
        this.computeWidthConvex(convexGeom);
      }
    },
    getLength: function getLength() {
      this.computeMinimumDiameter();
      return this._minWidth;
    },
    findMaxPerpDistance: function findMaxPerpDistance(pts, seg, startIndex) {
      var maxPerpDistance = seg.distancePerpendicular(pts[startIndex]);
      var nextPerpDistance = maxPerpDistance;
      var maxIndex = startIndex;
      var nextIndex = maxIndex;

      while (nextPerpDistance >= maxPerpDistance) {
        maxPerpDistance = nextPerpDistance;
        maxIndex = nextIndex;
        nextIndex = MinimumDiameter.nextIndex(pts, maxIndex);
        nextPerpDistance = seg.distancePerpendicular(pts[nextIndex]);
      }

      if (maxPerpDistance < this._minWidth) {
        this._minPtIndex = maxIndex;
        this._minWidth = maxPerpDistance;
        this._minWidthPt = pts[this._minPtIndex];
        this._minBaseSeg = new LineSegment(seg);
      }

      return maxIndex;
    },
    getMinimumRectangle: function getMinimumRectangle() {
      this.computeMinimumDiameter();

      if (this._minWidth === 0.0) {
        if (this._minBaseSeg.p0.equals2D(this._minBaseSeg.p1)) {
          return this._inputGeom.getFactory().createPoint(this._minBaseSeg.p0);
        }

        return this._minBaseSeg.toGeometry(this._inputGeom.getFactory());
      }

      var dx = this._minBaseSeg.p1.x - this._minBaseSeg.p0.x;
      var dy = this._minBaseSeg.p1.y - this._minBaseSeg.p0.y;
      var minPara = Double.MAX_VALUE;
      var maxPara = -Double.MAX_VALUE;
      var minPerp = Double.MAX_VALUE;
      var maxPerp = -Double.MAX_VALUE;

      for (var i = 0; i < this._convexHullPts.length; i++) {
        var paraC = MinimumDiameter.computeC(dx, dy, this._convexHullPts[i]);
        if (paraC > maxPara) maxPara = paraC;
        if (paraC < minPara) minPara = paraC;
        var perpC = MinimumDiameter.computeC(-dy, dx, this._convexHullPts[i]);
        if (perpC > maxPerp) maxPerp = perpC;
        if (perpC < minPerp) minPerp = perpC;
      }

      var maxPerpLine = MinimumDiameter.computeSegmentForLine(-dx, -dy, maxPerp);
      var minPerpLine = MinimumDiameter.computeSegmentForLine(-dx, -dy, minPerp);
      var maxParaLine = MinimumDiameter.computeSegmentForLine(-dy, dx, maxPara);
      var minParaLine = MinimumDiameter.computeSegmentForLine(-dy, dx, minPara);
      var p0 = maxParaLine.lineIntersection(maxPerpLine);
      var p1 = minParaLine.lineIntersection(maxPerpLine);
      var p2 = minParaLine.lineIntersection(minPerpLine);
      var p3 = maxParaLine.lineIntersection(minPerpLine);

      var shell = this._inputGeom.getFactory().createLinearRing([p0, p1, p2, p3, p0]);

      return this._inputGeom.getFactory().createPolygon(shell);
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return MinimumDiameter;
    }
  });

  MinimumDiameter.nextIndex = function (pts, index) {
    index++;
    if (index >= pts.length) index = 0;
    return index;
  };

  MinimumDiameter.computeC = function (a, b, p) {
    return a * p.y - b * p.x;
  };

  MinimumDiameter.getMinimumDiameter = function (geom) {
    return new MinimumDiameter(geom).getDiameter();
  };

  MinimumDiameter.getMinimumRectangle = function (geom) {
    return new MinimumDiameter(geom).getMinimumRectangle();
  };

  MinimumDiameter.computeSegmentForLine = function (a, b, c) {
    var p0 = null;
    var p1 = null;

    if (Math.abs(b) > Math.abs(a)) {
      p0 = new Coordinate(0.0, c / b);
      p1 = new Coordinate(1.0, c / b - a / b);
    } else {
      p0 = new Coordinate(c / a, 0.0);
      p1 = new Coordinate(c / a - b / a, 1.0);
    }

    return new LineSegment(p0, p1);
  };



  var algorithm = /*#__PURE__*/Object.freeze({
    distance: distance_module,
    locate: locate,
    match: match,
    Angle: Angle,
    Centroid: Centroid,
    CGAlgorithms: CGAlgorithms,
    ConvexHull: ConvexHull,
    Distance: Distance,
    InteriorPointArea: InteriorPointArea,
    InteriorPointLine: InteriorPointLine,
    InteriorPointPoint: InteriorPointPoint,
    RobustLineIntersector: RobustLineIntersector,
    MCPointInRing: MCPointInRing,
    MinimumBoundingCircle: MinimumBoundingCircle,
    MinimumDiameter: MinimumDiameter
  });

  function GeometryTransformer() {
    this._inputGeom = null;
    this._factory = null;
    this._pruneEmptyGeometry = true;
    this._preserveGeometryCollectionType = true;
    this._preserveCollections = false;
    this._preserveType = false;
  }
  extend(GeometryTransformer.prototype, {
    transformPoint: function transformPoint(geom, parent) {
      return this._factory.createPoint(this.transformCoordinates(geom.getCoordinateSequence(), geom));
    },
    transformPolygon: function transformPolygon(geom, parent) {
      var isAllValidLinearRings = true;
      var shell = this.transformLinearRing(geom.getExteriorRing(), geom);
      if (shell === null || !(shell instanceof LinearRing) || shell.isEmpty()) isAllValidLinearRings = false;
      var holes = new ArrayList();

      for (var i = 0; i < geom.getNumInteriorRing(); i++) {
        var hole = this.transformLinearRing(geom.getInteriorRingN(i), geom);

        if (hole === null || hole.isEmpty()) {
          continue;
        }

        if (!(hole instanceof LinearRing)) isAllValidLinearRings = false;
        holes.add(hole);
      }

      if (isAllValidLinearRings) return this._factory.createPolygon(shell, holes.toArray([]));else {
        var components = new ArrayList();
        if (shell !== null) components.add(shell);
        components.addAll(holes);
        return this._factory.buildGeometry(components);
      }
    },
    createCoordinateSequence: function createCoordinateSequence(coords) {
      return this._factory.getCoordinateSequenceFactory().create(coords);
    },
    getInputGeometry: function getInputGeometry() {
      return this._inputGeom;
    },
    transformMultiLineString: function transformMultiLineString(geom, parent) {
      var transGeomList = new ArrayList();

      for (var i = 0; i < geom.getNumGeometries(); i++) {
        var transformGeom = this.transformLineString(geom.getGeometryN(i), geom);
        if (transformGeom === null) continue;
        if (transformGeom.isEmpty()) continue;
        transGeomList.add(transformGeom);
      }

      return this._factory.buildGeometry(transGeomList);
    },
    transformCoordinates: function transformCoordinates(coords, parent) {
      return this.copy(coords);
    },
    transformLineString: function transformLineString(geom, parent) {
      return this._factory.createLineString(this.transformCoordinates(geom.getCoordinateSequence(), geom));
    },
    transformMultiPoint: function transformMultiPoint(geom, parent) {
      var transGeomList = new ArrayList();

      for (var i = 0; i < geom.getNumGeometries(); i++) {
        var transformGeom = this.transformPoint(geom.getGeometryN(i), geom);
        if (transformGeom === null) continue;
        if (transformGeom.isEmpty()) continue;
        transGeomList.add(transformGeom);
      }

      return this._factory.buildGeometry(transGeomList);
    },
    transformMultiPolygon: function transformMultiPolygon(geom, parent) {
      var transGeomList = new ArrayList();

      for (var i = 0; i < geom.getNumGeometries(); i++) {
        var transformGeom = this.transformPolygon(geom.getGeometryN(i), geom);
        if (transformGeom === null) continue;
        if (transformGeom.isEmpty()) continue;
        transGeomList.add(transformGeom);
      }

      return this._factory.buildGeometry(transGeomList);
    },
    copy: function copy(seq) {
      return seq.copy();
    },
    transformGeometryCollection: function transformGeometryCollection(geom, parent) {
      var transGeomList = new ArrayList();

      for (var i = 0; i < geom.getNumGeometries(); i++) {
        var transformGeom = this.transform(geom.getGeometryN(i));
        if (transformGeom === null) continue;
        if (this._pruneEmptyGeometry && transformGeom.isEmpty()) continue;
        transGeomList.add(transformGeom);
      }

      if (this._preserveGeometryCollectionType) return this._factory.createGeometryCollection(GeometryFactory.toGeometryArray(transGeomList));
      return this._factory.buildGeometry(transGeomList);
    },
    transform: function transform(inputGeom) {
      this._inputGeom = inputGeom;
      this._factory = inputGeom.getFactory();
      if (inputGeom instanceof Point) return this.transformPoint(inputGeom, null);
      if (inputGeom instanceof MultiPoint) return this.transformMultiPoint(inputGeom, null);
      if (inputGeom instanceof LinearRing) return this.transformLinearRing(inputGeom, null);
      if (inputGeom instanceof LineString) return this.transformLineString(inputGeom, null);
      if (inputGeom instanceof MultiLineString) return this.transformMultiLineString(inputGeom, null);
      if (inputGeom instanceof Polygon) return this.transformPolygon(inputGeom, null);
      if (inputGeom instanceof MultiPolygon) return this.transformMultiPolygon(inputGeom, null);
      if (inputGeom instanceof GeometryCollection) return this.transformGeometryCollection(inputGeom, null);
      throw new IllegalArgumentException("Unknown Geometry subtype: " + inputGeom.getClass().getName());
    },
    transformLinearRing: function transformLinearRing(geom, parent) {
      var seq = this.transformCoordinates(geom.getCoordinateSequence(), geom);
      if (seq === null) return this._factory.createLinearRing(null);
      var seqSize = seq.size();
      if (seqSize > 0 && seqSize < 4 && !this._preserveType) return this._factory.createLineString(seq);
      return this._factory.createLinearRing(seq);
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return GeometryTransformer;
    }
  });

  function Densifier() {
    this._inputGeom = null;
    this._distanceTolerance = null;
    var inputGeom = arguments[0];
    this._inputGeom = inputGeom;
  }
  extend(Densifier.prototype, {
    getResultGeometry: function getResultGeometry() {
      return new DensifyTransformer(this._distanceTolerance).transform(this._inputGeom);
    },
    setDistanceTolerance: function setDistanceTolerance(distanceTolerance) {
      if (distanceTolerance <= 0.0) throw new IllegalArgumentException("Tolerance must be positive");
      this._distanceTolerance = distanceTolerance;
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return Densifier;
    }
  });

  Densifier.densifyPoints = function (pts, distanceTolerance, precModel) {
    var seg = new LineSegment();
    var coordList = new CoordinateList();

    for (var i = 0; i < pts.length - 1; i++) {
      seg.p0 = pts[i];
      seg.p1 = pts[i + 1];
      coordList.add(seg.p0, false);
      var len = seg.getLength();
      var densifiedSegCount = Math.trunc(len / distanceTolerance) + 1;

      if (densifiedSegCount > 1) {
        var densifiedSegLen = len / densifiedSegCount;

        for (var j = 1; j < densifiedSegCount; j++) {
          var segFract = j * densifiedSegLen / len;
          var p = seg.pointAlong(segFract);
          precModel.makePrecise(p);
          coordList.add(p, false);
        }
      }
    }

    coordList.add(pts[pts.length - 1], false);
    return coordList.toCoordinateArray();
  };

  Densifier.densify = function (geom, distanceTolerance) {
    var densifier = new Densifier(geom);
    densifier.setDistanceTolerance(distanceTolerance);
    return densifier.getResultGeometry();
  };

  function DensifyTransformer() {
    GeometryTransformer.apply(this);
    this.distanceTolerance = null;
    var distanceTolerance = arguments[0];
    this.distanceTolerance = distanceTolerance;
  }

  inherits(DensifyTransformer, GeometryTransformer);
  extend(DensifyTransformer.prototype, {
    transformMultiPolygon: function transformMultiPolygon(geom, parent) {
      var roughGeom = GeometryTransformer.prototype.transformMultiPolygon.call(this, geom, parent);
      return this.createValidArea(roughGeom);
    },
    transformPolygon: function transformPolygon(geom, parent) {
      var roughGeom = GeometryTransformer.prototype.transformPolygon.call(this, geom, parent);

      if (parent instanceof MultiPolygon) {
        return roughGeom;
      }

      return this.createValidArea(roughGeom);
    },
    transformCoordinates: function transformCoordinates(coords, parent) {
      var inputPts = coords.toCoordinateArray();
      var newPts = Densifier.densifyPoints(inputPts, this.distanceTolerance, parent.getPrecisionModel());

      if (parent instanceof LineString && newPts.length === 1) {
        newPts = new Array(0).fill(null);
      }

      return this._factory.getCoordinateSequenceFactory().create(newPts);
    },
    createValidArea: function createValidArea(roughAreaGeom) {
      return roughAreaGeom.buffer(0.0);
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return DensifyTransformer;
    }
  });
  Densifier.DensifyTransformer = DensifyTransformer;



  var densify = /*#__PURE__*/Object.freeze({
    Densifier: Densifier
  });

  function HalfEdge() {
    this._orig = null;
    this._sym = null;
    this._next = null;
    var orig = arguments[0];
    this._orig = orig;
  }
  extend(HalfEdge.prototype, {
    find: function find(dest) {
      var oNext = this;

      do {
        if (oNext === null) return null;
        if (oNext.dest().equals2D(dest)) return oNext;
        oNext = oNext.oNext();
      } while (oNext !== this);

      return null;
    },
    dest: function dest() {
      return this._sym._orig;
    },
    oNext: function oNext() {
      return this._sym._next;
    },
    insert: function insert(e) {
      if (this.oNext() === this) {
        this.insertAfter(e);
        return null;
      }

      var ecmp = this.compareTo(e);
      var ePrev = this;

      do {
        var oNext = ePrev.oNext();
        var cmp = oNext.compareTo(e);

        if (cmp !== ecmp || oNext === this) {
          ePrev.insertAfter(e);
          return null;
        }

        ePrev = oNext;
      } while (ePrev !== this);

      Assert.shouldNeverReachHere();
    },
    insertAfter: function insertAfter(e) {
      Assert.equals(this._orig, e.orig());
      var save = this.oNext();

      this._sym.setNext(e);

      e.sym().setNext(save);
    },
    degree: function degree() {
      var degree = 0;
      var e = this;

      do {
        degree++;
        e = e.oNext();
      } while (e !== this);

      return degree;
    },
    equals: function equals() {
      if (arguments.length === 2 && arguments[1] instanceof Coordinate && arguments[0] instanceof Coordinate) {
        var p0 = arguments[0],
            p1 = arguments[1];
        return this._orig.equals2D(p0) && this._sym._orig.equals(p1);
      }
    },
    deltaY: function deltaY() {
      return this._sym._orig.y - this._orig.y;
    },
    sym: function sym() {
      return this._sym;
    },
    prev: function prev() {
      return this._sym.next()._sym;
    },
    compareAngularDirection: function compareAngularDirection(e) {
      var dx = this.deltaX();
      var dy = this.deltaY();
      var dx2 = e.deltaX();
      var dy2 = e.deltaY();
      if (dx === dx2 && dy === dy2) return 0;
      var quadrant = Quadrant.quadrant(dx, dy);
      var quadrant2 = Quadrant.quadrant(dx2, dy2);
      if (quadrant > quadrant2) return 1;
      if (quadrant < quadrant2) return -1;
      return Orientation.index(e._orig, e.dest(), this.dest());
    },
    prevNode: function prevNode() {
      var e = this;

      while (e.degree() === 2) {
        e = e.prev();
        if (e === this) return null;
      }

      return e;
    },
    compareTo: function compareTo(obj) {
      var e = obj;
      var comp = this.compareAngularDirection(e);
      return comp;
    },
    next: function next() {
      return this._next;
    },
    setSym: function setSym(e) {
      this._sym = e;
    },
    orig: function orig() {
      return this._orig;
    },
    toString: function toString() {
      return "HE(" + this._orig.x + " " + this._orig.y + ", " + this._sym._orig.x + " " + this._sym._orig.y + ")";
    },
    setNext: function setNext(e) {
      this._next = e;
    },
    init: function init(e) {
      this.setSym(e);
      e.setSym(this);
      this.setNext(e);
      e.setNext(this);
    },
    deltaX: function deltaX() {
      return this._sym._orig.x - this._orig.x;
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return HalfEdge;
    }
  });

  HalfEdge.init = function (e0, e1) {
    if (e0._sym !== null || e1._sym !== null || e0._next !== null || e1._next !== null) throw new IllegalStateException("Edges are already initialized");
    e0.init(e1);
    return e0;
  };

  HalfEdge.create = function (p0, p1) {
    var e0 = new HalfEdge(p0);
    var e1 = new HalfEdge(p1);
    e0.init(e1);
    return e0;
  };

  function MarkHalfEdge() {
    this._isMarked = false;
    var orig = arguments[0];
    HalfEdge.call(this, orig);
  }
  inherits(MarkHalfEdge, HalfEdge);
  extend(MarkHalfEdge.prototype, {
    mark: function mark() {
      this._isMarked = true;
    },
    setMark: function setMark(isMarked) {
      this._isMarked = isMarked;
    },
    isMarked: function isMarked() {
      return this._isMarked;
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return MarkHalfEdge;
    }
  });

  MarkHalfEdge.setMarkBoth = function (e, isMarked) {
    e.setMark(isMarked);
    e.sym().setMark(isMarked);
  };

  MarkHalfEdge.isMarked = function (e) {
    return e.isMarked();
  };

  MarkHalfEdge.setMark = function (e, isMarked) {
    e.setMark(isMarked);
  };

  MarkHalfEdge.markBoth = function (e) {
    e.mark();
    e.sym().mark();
  };

  MarkHalfEdge.mark = function (e) {
    e.mark();
  };

  function EdgeGraph() {
    this._vertexMap = new HashMap();
  }
  extend(EdgeGraph.prototype, {
    insert: function insert(orig, dest, eAdj) {
      var e = this.create(orig, dest);

      if (eAdj !== null) {
        eAdj.insert(e);
      } else {
        this._vertexMap.put(orig, e);
      }

      var eAdjDest = this._vertexMap.get(dest);

      if (eAdjDest !== null) {
        eAdjDest.insert(e.sym());
      } else {
        this._vertexMap.put(dest, e.sym());
      }

      return e;
    },
    create: function create(p0, p1) {
      var e0 = this.createEdge(p0);
      var e1 = this.createEdge(p1);
      HalfEdge.init(e0, e1);
      return e0;
    },
    createEdge: function createEdge(orig) {
      return new HalfEdge(orig);
    },
    addEdge: function addEdge(orig, dest) {
      if (!EdgeGraph.isValidEdge(orig, dest)) return null;

      var eAdj = this._vertexMap.get(orig);

      var eSame = null;

      if (eAdj !== null) {
        eSame = eAdj.find(dest);
      }

      if (eSame !== null) {
        return eSame;
      }

      var e = this.insert(orig, dest, eAdj);
      return e;
    },
    getVertexEdges: function getVertexEdges() {
      return this._vertexMap.values();
    },
    findEdge: function findEdge(orig, dest) {
      var e = this._vertexMap.get(orig);

      if (e === null) return null;
      return e.find(dest);
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return EdgeGraph;
    }
  });

  EdgeGraph.isValidEdge = function (orig, dest) {
    var cmp = dest.compareTo(orig);
    return cmp !== 0;
  };

  function DissolveHalfEdge() {
    this._isStart = false;
    var orig = arguments[0];
    MarkHalfEdge.call(this, orig);
  }
  inherits(DissolveHalfEdge, MarkHalfEdge);
  extend(DissolveHalfEdge.prototype, {
    setStart: function setStart() {
      this._isStart = true;
    },
    isStart: function isStart() {
      return this._isStart;
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return DissolveHalfEdge;
    }
  });

  function DissolveEdgeGraph() {
    EdgeGraph.apply(this);
  }
  inherits(DissolveEdgeGraph, EdgeGraph);
  extend(DissolveEdgeGraph.prototype, {
    createEdge: function createEdge(p0) {
      return new DissolveHalfEdge(p0);
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return DissolveEdgeGraph;
    }
  });

  function LineDissolver() {
    this._result = null;
    this._factory = null;
    this._graph = null;
    this._lines = new ArrayList();
    this._nodeEdgeStack = new Stack();
    this._ringStartEdge = null;
    this._graph = new DissolveEdgeGraph();
  }
  extend(LineDissolver.prototype, {
    addLine: function addLine(line) {
      this._lines.add(this._factory.createLineString(line.toCoordinateArray()));
    },
    updateRingStartEdge: function updateRingStartEdge(e) {
      if (!e.isStart()) {
        e = e.sym();
        if (!e.isStart()) return null;
      }

      if (this._ringStartEdge === null) {
        this._ringStartEdge = e;
        return null;
      }

      if (e.orig().compareTo(this._ringStartEdge.orig()) < 0) {
        this._ringStartEdge = e;
      }
    },
    getResult: function getResult() {
      if (this._result === null) this.computeResult();
      return this._result;
    },
    process: function process(e) {
      var eNode = e.prevNode();
      if (eNode === null) eNode = e;
      this.stackEdges(eNode);
      this.buildLines();
    },
    buildRing: function buildRing(eStartRing) {
      var line = new CoordinateList();
      var e = eStartRing;
      line.add(e.orig().copy(), false);

      while (e.sym().degree() === 2) {
        var eNext = e.next();
        if (eNext === eStartRing) break;
        line.add(eNext.orig().copy(), false);
        e = eNext;
      }

      line.add(e.dest().copy(), false);
      this.addLine(line);
    },
    buildLine: function buildLine(eStart) {
      var line = new CoordinateList();
      var e = eStart;
      this._ringStartEdge = null;
      MarkHalfEdge.markBoth(e);
      line.add(e.orig().copy(), false);

      while (e.sym().degree() === 2) {
        this.updateRingStartEdge(e);
        var eNext = e.next();

        if (eNext === eStart) {
          this.buildRing(this._ringStartEdge);
          return null;
        }

        line.add(eNext.orig().copy(), false);
        e = eNext;
        MarkHalfEdge.markBoth(e);
      }

      line.add(e.dest().clone(), false);
      this.stackEdges(e.sym());
      this.addLine(line);
    },
    stackEdges: function stackEdges(node) {
      var e = node;

      do {
        if (!MarkHalfEdge.isMarked(e)) this._nodeEdgeStack.add(e);
        e = e.oNext();
      } while (e !== node);
    },
    computeResult: function computeResult() {
      var edges = this._graph.getVertexEdges();

      for (var i = edges.iterator(); i.hasNext();) {
        var e = i.next();
        if (MarkHalfEdge.isMarked(e)) continue;
        this.process(e);
      }

      this._result = this._factory.buildGeometry(this._lines);
    },
    buildLines: function buildLines() {
      while (!this._nodeEdgeStack.empty()) {
        var e = this._nodeEdgeStack.pop();

        if (MarkHalfEdge.isMarked(e)) continue;
        this.buildLine(e);
      }
    },
    add: function add() {
      if (arguments[0] instanceof Geometry) {
        var _geometry = arguments[0];

        _geometry.apply({
          interfaces_: function interfaces_() {
            return [GeometryComponentFilter];
          },
          filter: function filter(component) {
            if (component instanceof LineString) {
              this.add(component);
            }
          }
        });
      } else if (hasInterface(arguments[0], Collection)) {
        var geometries = arguments[0];

        for (var i = geometries.iterator(); i.hasNext();) {
          var geometry = i.next();
          this.add(geometry);
        }
      } else if (arguments[0] instanceof LineString) {
        var lineString = arguments[0];

        if (this._factory === null) {
          this._factory = lineString.getFactory();
        }

        var seq = lineString.getCoordinateSequence();
        var doneStart = false;

        for (var i = 1; i < seq.size(); i++) {
          var e = this._graph.addEdge(seq.getCoordinate(i - 1), seq.getCoordinate(i));

          if (e === null) continue;

          if (!doneStart) {
            e.setStart();
            doneStart = true;
          }
        }
      }
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return LineDissolver;
    }
  });

  LineDissolver.dissolve = function (g) {
    var d = new LineDissolver();
    d.add(g);
    return d.getResult();
  };



  var dissolve = /*#__PURE__*/Object.freeze({
    LineDissolver: LineDissolver
  });

  function PointLocator() {
    this._boundaryRule = BoundaryNodeRule.OGC_SFS_BOUNDARY_RULE;
    this._isIn = null;
    this._numBoundaries = null;

    if (arguments.length === 0) ; else if (arguments.length === 1) {
      var boundaryRule = arguments[0];
      if (boundaryRule === null) throw new IllegalArgumentException("Rule must be non-null");
      this._boundaryRule = boundaryRule;
    }
  }
  extend(PointLocator.prototype, {
    locateInPolygonRing: function locateInPolygonRing(p, ring) {
      if (!ring.getEnvelopeInternal().intersects(p)) return Location.EXTERIOR;
      return PointLocation.locateInRing(p, ring.getCoordinates());
    },
    intersects: function intersects(p, geom) {
      return this.locate(p, geom) !== Location.EXTERIOR;
    },
    updateLocationInfo: function updateLocationInfo(loc) {
      if (loc === Location.INTERIOR) this._isIn = true;
      if (loc === Location.BOUNDARY) this._numBoundaries++;
    },
    computeLocation: function computeLocation(p, geom) {
      if (geom instanceof Point) {
        this.updateLocationInfo(this.locateOnPoint(p, geom));
      }

      if (geom instanceof LineString) {
        this.updateLocationInfo(this.locateOnLineString(p, geom));
      } else if (geom instanceof Polygon) {
        this.updateLocationInfo(this.locateInPolygon(p, geom));
      } else if (geom instanceof MultiLineString) {
        var ml = geom;

        for (var i = 0; i < ml.getNumGeometries(); i++) {
          var l = ml.getGeometryN(i);
          this.updateLocationInfo(this.locateOnLineString(p, l));
        }
      } else if (geom instanceof MultiPolygon) {
        var mpoly = geom;

        for (var i = 0; i < mpoly.getNumGeometries(); i++) {
          var poly = mpoly.getGeometryN(i);
          this.updateLocationInfo(this.locateInPolygon(p, poly));
        }
      } else if (geom instanceof GeometryCollection) {
        var geomi = new GeometryCollectionIterator(geom);

        while (geomi.hasNext()) {
          var g2 = geomi.next();
          if (g2 !== geom) this.computeLocation(p, g2);
        }
      }
    },
    locateOnPoint: function locateOnPoint(p, pt) {
      var ptCoord = pt.getCoordinate();
      if (ptCoord.equals2D(p)) return Location.INTERIOR;
      return Location.EXTERIOR;
    },
    locateOnLineString: function locateOnLineString(p, l) {
      if (!l.getEnvelopeInternal().intersects(p)) return Location.EXTERIOR;
      var seq = l.getCoordinateSequence();

      if (!l.isClosed()) {
        if (p.equals(seq.getCoordinate(0)) || p.equals(seq.getCoordinate(seq.size() - 1))) {
          return Location.BOUNDARY;
        }
      }

      if (PointLocation.isOnLine(p, seq)) {
        return Location.INTERIOR;
      }

      return Location.EXTERIOR;
    },
    locateInPolygon: function locateInPolygon(p, poly) {
      if (poly.isEmpty()) return Location.EXTERIOR;
      var shell = poly.getExteriorRing();
      var shellLoc = this.locateInPolygonRing(p, shell);
      if (shellLoc === Location.EXTERIOR) return Location.EXTERIOR;
      if (shellLoc === Location.BOUNDARY) return Location.BOUNDARY;

      for (var i = 0; i < poly.getNumInteriorRing(); i++) {
        var hole = poly.getInteriorRingN(i);
        var holeLoc = this.locateInPolygonRing(p, hole);
        if (holeLoc === Location.INTERIOR) return Location.EXTERIOR;
        if (holeLoc === Location.BOUNDARY) return Location.BOUNDARY;
      }

      return Location.INTERIOR;
    },
    locate: function locate(p, geom) {
      if (geom.isEmpty()) return Location.EXTERIOR;

      if (geom instanceof LineString) {
        return this.locateOnLineString(p, geom);
      } else if (geom instanceof Polygon) {
        return this.locateInPolygon(p, geom);
      }

      this._isIn = false;
      this._numBoundaries = 0;
      this.computeLocation(p, geom);
      if (this._boundaryRule.isInBoundary(this._numBoundaries)) return Location.BOUNDARY;
      if (this._numBoundaries > 0 || this._isIn) return Location.INTERIOR;
      return Location.EXTERIOR;
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return PointLocator;
    }
  });

  function Position() {}
  extend(Position.prototype, {
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return Position;
    }
  });

  Position.opposite = function (position) {
    if (position === Position.LEFT) return Position.RIGHT;
    if (position === Position.RIGHT) return Position.LEFT;
    return position;
  };

  Position.ON = 0;
  Position.LEFT = 1;
  Position.RIGHT = 2;

  function MonotoneChain$1() {
    this.mce = null;
    this.chainIndex = null;
    var mce = arguments[0],
        chainIndex = arguments[1];
    this.mce = mce;
    this.chainIndex = chainIndex;
  }
  extend(MonotoneChain$1.prototype, {
    computeIntersections: function computeIntersections(mc, si) {
      this.mce.computeIntersectsForChain(this.chainIndex, mc.mce, mc.chainIndex, si);
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return MonotoneChain$1;
    }
  });

  function SweepLineEvent() {
    this._label = null;
    this._xValue = null;
    this._eventType = null;
    this._insertEvent = null;
    this._deleteEventIndex = null;
    this._obj = null;

    if (arguments.length === 2) {
      var x = arguments[0],
          insertEvent = arguments[1];
      this._eventType = SweepLineEvent.DELETE;
      this._xValue = x;
      this._insertEvent = insertEvent;
    } else if (arguments.length === 3) {
      var label = arguments[0],
          _x = arguments[1],
          obj = arguments[2];
      this._eventType = SweepLineEvent.INSERT;
      this._label = label;
      this._xValue = _x;
      this._obj = obj;
    }
  }
  extend(SweepLineEvent.prototype, {
    isDelete: function isDelete() {
      return this._eventType === SweepLineEvent.DELETE;
    },
    setDeleteEventIndex: function setDeleteEventIndex(deleteEventIndex) {
      this._deleteEventIndex = deleteEventIndex;
    },
    getObject: function getObject() {
      return this._obj;
    },
    compareTo: function compareTo(o) {
      var pe = o;
      if (this._xValue < pe._xValue) return -1;
      if (this._xValue > pe._xValue) return 1;
      if (this._eventType < pe._eventType) return -1;
      if (this._eventType > pe._eventType) return 1;
      return 0;
    },
    getInsertEvent: function getInsertEvent() {
      return this._insertEvent;
    },
    isInsert: function isInsert() {
      return this._eventType === SweepLineEvent.INSERT;
    },
    isSameLabel: function isSameLabel(ev) {
      if (this._label === null) return false;
      return this._label === ev._label;
    },
    getDeleteEventIndex: function getDeleteEventIndex() {
      return this._deleteEventIndex;
    },
    interfaces_: function interfaces_() {
      return [Comparable];
    },
    getClass: function getClass() {
      return SweepLineEvent;
    }
  });
  SweepLineEvent.INSERT = 1;
  SweepLineEvent.DELETE = 2;

  function EdgeSetIntersector() {}
  extend(EdgeSetIntersector.prototype, {
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return EdgeSetIntersector;
    }
  });

  function SegmentIntersector() {
    this._hasIntersection = false;
    this._hasProper = false;
    this._hasProperInterior = false;
    this._properIntersectionPoint = null;
    this._li = null;
    this._includeProper = null;
    this._recordIsolated = null;
    this._isSelfIntersection = null;
    this._numIntersections = 0;
    this.numTests = 0;
    this._bdyNodes = null;
    this._isDone = false;
    this._isDoneWhenProperInt = false;
    var li = arguments[0],
        includeProper = arguments[1],
        recordIsolated = arguments[2];
    this._li = li;
    this._includeProper = includeProper;
    this._recordIsolated = recordIsolated;
  }
  extend(SegmentIntersector.prototype, {
    isTrivialIntersection: function isTrivialIntersection(e0, segIndex0, e1, segIndex1) {
      if (e0 === e1) {
        if (this._li.getIntersectionNum() === 1) {
          if (SegmentIntersector.isAdjacentSegments(segIndex0, segIndex1)) return true;

          if (e0.isClosed()) {
            var maxSegIndex = e0.getNumPoints() - 1;

            if (segIndex0 === 0 && segIndex1 === maxSegIndex || segIndex1 === 0 && segIndex0 === maxSegIndex) {
              return true;
            }
          }
        }
      }

      return false;
    },
    getProperIntersectionPoint: function getProperIntersectionPoint() {
      return this._properIntersectionPoint;
    },
    setIsDoneIfProperInt: function setIsDoneIfProperInt(isDoneWhenProperInt) {
      this._isDoneWhenProperInt = isDoneWhenProperInt;
    },
    hasProperInteriorIntersection: function hasProperInteriorIntersection() {
      return this._hasProperInterior;
    },
    isBoundaryPointInternal: function isBoundaryPointInternal(li, bdyNodes) {
      for (var i = bdyNodes.iterator(); i.hasNext();) {
        var node = i.next();
        var pt = node.getCoordinate();
        if (li.isIntersection(pt)) return true;
      }

      return false;
    },
    hasProperIntersection: function hasProperIntersection() {
      return this._hasProper;
    },
    hasIntersection: function hasIntersection() {
      return this._hasIntersection;
    },
    isDone: function isDone() {
      return this._isDone;
    },
    isBoundaryPoint: function isBoundaryPoint(li, bdyNodes) {
      if (bdyNodes === null) return false;
      if (this.isBoundaryPointInternal(li, bdyNodes[0])) return true;
      if (this.isBoundaryPointInternal(li, bdyNodes[1])) return true;
      return false;
    },
    setBoundaryNodes: function setBoundaryNodes(bdyNodes0, bdyNodes1) {
      this._bdyNodes = new Array(2).fill(null);
      this._bdyNodes[0] = bdyNodes0;
      this._bdyNodes[1] = bdyNodes1;
    },
    addIntersections: function addIntersections(e0, segIndex0, e1, segIndex1) {
      if (e0 === e1 && segIndex0 === segIndex1) return null;
      this.numTests++;
      var p00 = e0.getCoordinates()[segIndex0];
      var p01 = e0.getCoordinates()[segIndex0 + 1];
      var p10 = e1.getCoordinates()[segIndex1];
      var p11 = e1.getCoordinates()[segIndex1 + 1];

      this._li.computeIntersection(p00, p01, p10, p11);

      if (this._li.hasIntersection()) {
        if (this._recordIsolated) {
          e0.setIsolated(false);
          e1.setIsolated(false);
        }

        this._numIntersections++;

        if (!this.isTrivialIntersection(e0, segIndex0, e1, segIndex1)) {
          this._hasIntersection = true;

          if (this._includeProper || !this._li.isProper()) {
            e0.addIntersections(this._li, segIndex0, 0);
            e1.addIntersections(this._li, segIndex1, 1);
          }

          if (this._li.isProper()) {
            this._properIntersectionPoint = this._li.getIntersection(0).copy();
            this._hasProper = true;

            if (this._isDoneWhenProperInt) {
              this._isDone = true;
            }

            if (!this.isBoundaryPoint(this._li, this._bdyNodes)) this._hasProperInterior = true;
          }
        }
      }
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return SegmentIntersector;
    }
  });

  SegmentIntersector.isAdjacentSegments = function (i1, i2) {
    return Math.abs(i1 - i2) === 1;
  };

  function SimpleMCSweepLineIntersector() {
    EdgeSetIntersector.apply(this);
    this.events = new ArrayList();
    this.nOverlaps = null;
  }
  inherits(SimpleMCSweepLineIntersector, EdgeSetIntersector);
  extend(SimpleMCSweepLineIntersector.prototype, {
    prepareEvents: function prepareEvents() {
      Collections.sort(this.events);

      for (var i = 0; i < this.events.size(); i++) {
        var ev = this.events.get(i);

        if (ev.isDelete()) {
          ev.getInsertEvent().setDeleteEventIndex(i);
        }
      }
    },
    computeIntersections: function computeIntersections() {
      if (arguments.length === 1) {
        var si = arguments[0];
        this.nOverlaps = 0;
        this.prepareEvents();

        for (var i = 0; i < this.events.size(); i++) {
          var ev = this.events.get(i);

          if (ev.isInsert()) {
            this.processOverlaps(i, ev.getDeleteEventIndex(), ev, si);
          }

          if (si.isDone()) {
            break;
          }
        }
      } else if (arguments.length === 3) {
        if (arguments[2] instanceof SegmentIntersector && hasInterface(arguments[0], List) && hasInterface(arguments[1], List)) {
          var edges0 = arguments[0],
              edges1 = arguments[1],
              _si = arguments[2];
          this.addEdges(edges0, edges0);
          this.addEdges(edges1, edges1);
          this.computeIntersections(_si);
        } else if (typeof arguments[2] === "boolean" && hasInterface(arguments[0], List) && arguments[1] instanceof SegmentIntersector) {
          var edges = arguments[0],
              _si2 = arguments[1],
              testAllSegments = arguments[2];
          if (testAllSegments) this.addEdges(edges, null);else this.addEdges(edges);
          this.computeIntersections(_si2);
        }
      }
    },
    addEdge: function addEdge(edge, edgeSet) {
      var mce = edge.getMonotoneChainEdge();
      var startIndex = mce.getStartIndexes();

      for (var i = 0; i < startIndex.length - 1; i++) {
        var mc = new MonotoneChain$1(mce, i);
        var insertEvent = new SweepLineEvent(edgeSet, mce.getMinX(i), mc);
        this.events.add(insertEvent);
        this.events.add(new SweepLineEvent(mce.getMaxX(i), insertEvent));
      }
    },
    processOverlaps: function processOverlaps(start, end, ev0, si) {
      var mc0 = ev0.getObject();

      for (var i = start; i < end; i++) {
        var ev1 = this.events.get(i);

        if (ev1.isInsert()) {
          var mc1 = ev1.getObject();

          if (!ev0.isSameLabel(ev1)) {
            mc0.computeIntersections(mc1, si);
            this.nOverlaps++;
          }
        }
      }
    },
    addEdges: function addEdges() {
      if (arguments.length === 1) {
        var edges = arguments[0];

        for (var i = edges.iterator(); i.hasNext();) {
          var edge = i.next();
          this.addEdge(edge, edge);
        }
      } else if (arguments.length === 2) {
        var _edges = arguments[0],
            edgeSet = arguments[1];

        for (var i = _edges.iterator(); i.hasNext();) {
          var edge = i.next();
          this.addEdge(edge, edgeSet);
        }
      }
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return SimpleMCSweepLineIntersector;
    }
  });

  function TopologyLocation() {
    this.location = null;

    if (arguments.length === 1) {
      if (arguments[0] instanceof Array) {
        var location = arguments[0];
        this.init(location.length);
      } else if (Number.isInteger(arguments[0])) {
        var on = arguments[0];
        this.init(1);
        this.location[Position.ON] = on;
      } else if (arguments[0] instanceof TopologyLocation) {
        var gl = arguments[0];
        this.init(gl.location.length);

        if (gl !== null) {
          for (var i = 0; i < this.location.length; i++) {
            this.location[i] = gl.location[i];
          }
        }
      }
    } else if (arguments.length === 3) {
      var _on = arguments[0],
          left = arguments[1],
          right = arguments[2];
      this.init(3);
      this.location[Position.ON] = _on;
      this.location[Position.LEFT] = left;
      this.location[Position.RIGHT] = right;
    }
  }
  extend(TopologyLocation.prototype, {
    setAllLocations: function setAllLocations(locValue) {
      for (var i = 0; i < this.location.length; i++) {
        this.location[i] = locValue;
      }
    },
    isNull: function isNull() {
      for (var i = 0; i < this.location.length; i++) {
        if (this.location[i] !== Location.NONE) return false;
      }

      return true;
    },
    setAllLocationsIfNull: function setAllLocationsIfNull(locValue) {
      for (var i = 0; i < this.location.length; i++) {
        if (this.location[i] === Location.NONE) this.location[i] = locValue;
      }
    },
    isLine: function isLine() {
      return this.location.length === 1;
    },
    merge: function merge(gl) {
      if (gl.location.length > this.location.length) {
        var newLoc = new Array(3).fill(null);
        newLoc[Position.ON] = this.location[Position.ON];
        newLoc[Position.LEFT] = Location.NONE;
        newLoc[Position.RIGHT] = Location.NONE;
        this.location = newLoc;
      }

      for (var i = 0; i < this.location.length; i++) {
        if (this.location[i] === Location.NONE && i < gl.location.length) this.location[i] = gl.location[i];
      }
    },
    getLocations: function getLocations() {
      return this.location;
    },
    flip: function flip() {
      if (this.location.length <= 1) return null;
      var temp = this.location[Position.LEFT];
      this.location[Position.LEFT] = this.location[Position.RIGHT];
      this.location[Position.RIGHT] = temp;
    },
    toString: function toString() {
      var buf = new StringBuffer();
      if (this.location.length > 1) buf.append(Location.toLocationSymbol(this.location[Position.LEFT]));
      buf.append(Location.toLocationSymbol(this.location[Position.ON]));
      if (this.location.length > 1) buf.append(Location.toLocationSymbol(this.location[Position.RIGHT]));
      return buf.toString();
    },
    setLocations: function setLocations(on, left, right) {
      this.location[Position.ON] = on;
      this.location[Position.LEFT] = left;
      this.location[Position.RIGHT] = right;
    },
    get: function get(posIndex) {
      if (posIndex < this.location.length) return this.location[posIndex];
      return Location.NONE;
    },
    isArea: function isArea() {
      return this.location.length > 1;
    },
    isAnyNull: function isAnyNull() {
      for (var i = 0; i < this.location.length; i++) {
        if (this.location[i] === Location.NONE) return true;
      }

      return false;
    },
    setLocation: function setLocation() {
      if (arguments.length === 1) {
        var locValue = arguments[0];
        this.setLocation(Position.ON, locValue);
      } else if (arguments.length === 2) {
        var locIndex = arguments[0],
            _locValue = arguments[1];
        this.location[locIndex] = _locValue;
      }
    },
    init: function init(size) {
      this.location = new Array(size).fill(null);
      this.setAllLocations(Location.NONE);
    },
    isEqualOnSide: function isEqualOnSide(le, locIndex) {
      return this.location[locIndex] === le.location[locIndex];
    },
    allPositionsEqual: function allPositionsEqual(loc) {
      for (var i = 0; i < this.location.length; i++) {
        if (this.location[i] !== loc) return false;
      }

      return true;
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return TopologyLocation;
    }
  });

  function Label() {
    this.elt = new Array(2).fill(null);

    if (arguments.length === 1) {
      if (Number.isInteger(arguments[0])) {
        var onLoc = arguments[0];
        this.elt[0] = new TopologyLocation(onLoc);
        this.elt[1] = new TopologyLocation(onLoc);
      } else if (arguments[0] instanceof Label) {
        var lbl = arguments[0];
        this.elt[0] = new TopologyLocation(lbl.elt[0]);
        this.elt[1] = new TopologyLocation(lbl.elt[1]);
      }
    } else if (arguments.length === 2) {
      var geomIndex = arguments[0],
          _onLoc = arguments[1];
      this.elt[0] = new TopologyLocation(Location.NONE);
      this.elt[1] = new TopologyLocation(Location.NONE);
      this.elt[geomIndex].setLocation(_onLoc);
    } else if (arguments.length === 3) {
      var _onLoc2 = arguments[0],
          leftLoc = arguments[1],
          rightLoc = arguments[2];
      this.elt[0] = new TopologyLocation(_onLoc2, leftLoc, rightLoc);
      this.elt[1] = new TopologyLocation(_onLoc2, leftLoc, rightLoc);
    } else if (arguments.length === 4) {
      var _geomIndex = arguments[0],
          _onLoc3 = arguments[1],
          _leftLoc = arguments[2],
          _rightLoc = arguments[3];
      this.elt[0] = new TopologyLocation(Location.NONE, Location.NONE, Location.NONE);
      this.elt[1] = new TopologyLocation(Location.NONE, Location.NONE, Location.NONE);

      this.elt[_geomIndex].setLocations(_onLoc3, _leftLoc, _rightLoc);
    }
  }
  extend(Label.prototype, {
    getGeometryCount: function getGeometryCount() {
      var count = 0;
      if (!this.elt[0].isNull()) count++;
      if (!this.elt[1].isNull()) count++;
      return count;
    },
    setAllLocations: function setAllLocations(geomIndex, location) {
      this.elt[geomIndex].setAllLocations(location);
    },
    isNull: function isNull(geomIndex) {
      return this.elt[geomIndex].isNull();
    },
    setAllLocationsIfNull: function setAllLocationsIfNull() {
      if (arguments.length === 1) {
        var location = arguments[0];
        this.setAllLocationsIfNull(0, location);
        this.setAllLocationsIfNull(1, location);
      } else if (arguments.length === 2) {
        var geomIndex = arguments[0],
            _location = arguments[1];
        this.elt[geomIndex].setAllLocationsIfNull(_location);
      }
    },
    isLine: function isLine(geomIndex) {
      return this.elt[geomIndex].isLine();
    },
    merge: function merge(lbl) {
      for (var i = 0; i < 2; i++) {
        if (this.elt[i] === null && lbl.elt[i] !== null) {
          this.elt[i] = new TopologyLocation(lbl.elt[i]);
        } else {
          this.elt[i].merge(lbl.elt[i]);
        }
      }
    },
    flip: function flip() {
      this.elt[0].flip();
      this.elt[1].flip();
    },
    getLocation: function getLocation() {
      if (arguments.length === 1) {
        var geomIndex = arguments[0];
        return this.elt[geomIndex].get(Position.ON);
      } else if (arguments.length === 2) {
        var _geomIndex2 = arguments[0],
            posIndex = arguments[1];
        return this.elt[_geomIndex2].get(posIndex);
      }
    },
    toString: function toString() {
      var buf = new StringBuffer();

      if (this.elt[0] !== null) {
        buf.append("A:");
        buf.append(this.elt[0].toString());
      }

      if (this.elt[1] !== null) {
        buf.append(" B:");
        buf.append(this.elt[1].toString());
      }

      return buf.toString();
    },
    isArea: function isArea() {
      if (arguments.length === 0) {
        return this.elt[0].isArea() || this.elt[1].isArea();
      } else if (arguments.length === 1) {
        var geomIndex = arguments[0];
        return this.elt[geomIndex].isArea();
      }
    },
    isAnyNull: function isAnyNull(geomIndex) {
      return this.elt[geomIndex].isAnyNull();
    },
    setLocation: function setLocation() {
      if (arguments.length === 2) {
        var geomIndex = arguments[0],
            location = arguments[1];
        this.elt[geomIndex].setLocation(Position.ON, location);
      } else if (arguments.length === 3) {
        var _geomIndex3 = arguments[0],
            posIndex = arguments[1],
            _location2 = arguments[2];

        this.elt[_geomIndex3].setLocation(posIndex, _location2);
      }
    },
    isEqualOnSide: function isEqualOnSide(lbl, side) {
      return this.elt[0].isEqualOnSide(lbl.elt[0], side) && this.elt[1].isEqualOnSide(lbl.elt[1], side);
    },
    allPositionsEqual: function allPositionsEqual(geomIndex, loc) {
      return this.elt[geomIndex].allPositionsEqual(loc);
    },
    toLine: function toLine(geomIndex) {
      if (this.elt[geomIndex].isArea()) this.elt[geomIndex] = new TopologyLocation(this.elt[geomIndex].location[0]);
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return Label;
    }
  });

  Label.toLineLabel = function (label) {
    var lineLabel = new Label(Location.NONE);

    for (var i = 0; i < 2; i++) {
      lineLabel.setLocation(i, label.getLocation(i));
    }

    return lineLabel;
  };

  function EdgeIntersection() {
    this.coord = null;
    this.segmentIndex = null;
    this.dist = null;
    var coord = arguments[0],
        segmentIndex = arguments[1],
        dist = arguments[2];
    this.coord = new Coordinate(coord);
    this.segmentIndex = segmentIndex;
    this.dist = dist;
  }
  extend(EdgeIntersection.prototype, {
    getSegmentIndex: function getSegmentIndex() {
      return this.segmentIndex;
    },
    getCoordinate: function getCoordinate() {
      return this.coord;
    },
    print: function print(out) {
      out.print(this.coord);
      out.print(" seg # = " + this.segmentIndex);
      out.println(" dist = " + this.dist);
    },
    compareTo: function compareTo(obj) {
      var other = obj;
      return this.compare(other.segmentIndex, other.dist);
    },
    isEndPoint: function isEndPoint(maxSegmentIndex) {
      if (this.segmentIndex === 0 && this.dist === 0.0) return true;
      if (this.segmentIndex === maxSegmentIndex) return true;
      return false;
    },
    toString: function toString() {
      return this.coord + " seg # = " + this.segmentIndex + " dist = " + this.dist;
    },
    getDistance: function getDistance() {
      return this.dist;
    },
    compare: function compare(segmentIndex, dist) {
      if (this.segmentIndex < segmentIndex) return -1;
      if (this.segmentIndex > segmentIndex) return 1;
      if (this.dist < dist) return -1;
      if (this.dist > dist) return 1;
      return 0;
    },
    interfaces_: function interfaces_() {
      return [Comparable];
    },
    getClass: function getClass() {
      return EdgeIntersection;
    }
  });

  function EdgeIntersectionList() {
    this._nodeMap = new TreeMap();
    this.edge = null;
    var edge = arguments[0];
    this.edge = edge;
  }
  extend(EdgeIntersectionList.prototype, {
    print: function print(out) {
      out.println("Intersections:");

      for (var it = this.iterator(); it.hasNext();) {
        var ei = it.next();
        ei.print(out);
      }
    },
    iterator: function iterator() {
      return this._nodeMap.values().iterator();
    },
    addSplitEdges: function addSplitEdges(edgeList) {
      this.addEndpoints();
      var it = this.iterator();
      var eiPrev = it.next();

      while (it.hasNext()) {
        var ei = it.next();
        var newEdge = this.createSplitEdge(eiPrev, ei);
        edgeList.add(newEdge);
        eiPrev = ei;
      }
    },
    addEndpoints: function addEndpoints() {
      var maxSegIndex = this.edge.pts.length - 1;
      this.add(this.edge.pts[0], 0, 0.0);
      this.add(this.edge.pts[maxSegIndex], maxSegIndex, 0.0);
    },
    createSplitEdge: function createSplitEdge(ei0, ei1) {
      var npts = ei1.segmentIndex - ei0.segmentIndex + 2;
      var lastSegStartPt = this.edge.pts[ei1.segmentIndex];
      var useIntPt1 = ei1.dist > 0.0 || !ei1.coord.equals2D(lastSegStartPt);

      if (!useIntPt1) {
        npts--;
      }

      var pts = new Array(npts).fill(null);
      var ipt = 0;
      pts[ipt++] = new Coordinate(ei0.coord);

      for (var i = ei0.segmentIndex + 1; i <= ei1.segmentIndex; i++) {
        pts[ipt++] = this.edge.pts[i];
      }

      if (useIntPt1) pts[ipt] = ei1.coord;
      return new Edge(pts, new Label(this.edge._label));
    },
    add: function add(intPt, segmentIndex, dist) {
      var eiNew = new EdgeIntersection(intPt, segmentIndex, dist);

      var ei = this._nodeMap.get(eiNew);

      if (ei !== null) {
        return ei;
      }

      this._nodeMap.put(eiNew, eiNew);

      return eiNew;
    },
    isIntersection: function isIntersection(pt) {
      for (var it = this.iterator(); it.hasNext();) {
        var ei = it.next();
        if (ei.coord.equals(pt)) return true;
      }

      return false;
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return EdgeIntersectionList;
    }
  });

  function MonotoneChainIndexer() {}
  extend(MonotoneChainIndexer.prototype, {
    getChainStartIndices: function getChainStartIndices(pts) {
      var start = 0;
      var startIndexList = new ArrayList();
      startIndexList.add(new Integer(start));

      do {
        var last = this.findChainEnd(pts, start);
        startIndexList.add(new Integer(last));
        start = last;
      } while (start < pts.length - 1);

      var startIndex = MonotoneChainIndexer.toIntArray(startIndexList);
      return startIndex;
    },
    findChainEnd: function findChainEnd(pts, start) {
      var chainQuad = Quadrant.quadrant(pts[start], pts[start + 1]);
      var last = start + 1;

      while (last < pts.length) {
        var quad = Quadrant.quadrant(pts[last - 1], pts[last]);
        if (quad !== chainQuad) break;
        last++;
      }

      return last - 1;
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return MonotoneChainIndexer;
    }
  });

  MonotoneChainIndexer.toIntArray = function (list) {
    var array = new Array(list.size()).fill(null);

    for (var i = 0; i < array.length; i++) {
      array[i] = list.get(i).intValue();
    }

    return array;
  };

  function MonotoneChainEdge() {
    this.e = null;
    this.pts = null;
    this.startIndex = null;
    var e = arguments[0];
    this.e = e;
    this.pts = e.getCoordinates();
    var mcb = new MonotoneChainIndexer();
    this.startIndex = mcb.getChainStartIndices(this.pts);
  }
  extend(MonotoneChainEdge.prototype, {
    getCoordinates: function getCoordinates() {
      return this.pts;
    },
    getMaxX: function getMaxX(chainIndex) {
      var x1 = this.pts[this.startIndex[chainIndex]].x;
      var x2 = this.pts[this.startIndex[chainIndex + 1]].x;
      return x1 > x2 ? x1 : x2;
    },
    getMinX: function getMinX(chainIndex) {
      var x1 = this.pts[this.startIndex[chainIndex]].x;
      var x2 = this.pts[this.startIndex[chainIndex + 1]].x;
      return x1 < x2 ? x1 : x2;
    },
    computeIntersectsForChain: function computeIntersectsForChain() {
      if (arguments.length === 4) {
        var chainIndex0 = arguments[0],
            mce = arguments[1],
            chainIndex1 = arguments[2],
            si = arguments[3];
        this.computeIntersectsForChain(this.startIndex[chainIndex0], this.startIndex[chainIndex0 + 1], mce, mce.startIndex[chainIndex1], mce.startIndex[chainIndex1 + 1], si);
      } else if (arguments.length === 6) {
        var start0 = arguments[0],
            end0 = arguments[1],
            _mce = arguments[2],
            start1 = arguments[3],
            end1 = arguments[4],
            ei = arguments[5];

        if (end0 - start0 === 1 && end1 - start1 === 1) {
          ei.addIntersections(this.e, start0, _mce.e, start1);
          return null;
        }

        if (!this.overlaps(start0, end0, _mce, start1, end1)) return null;
        var mid0 = Math.trunc((start0 + end0) / 2);
        var mid1 = Math.trunc((start1 + end1) / 2);

        if (start0 < mid0) {
          if (start1 < mid1) this.computeIntersectsForChain(start0, mid0, _mce, start1, mid1, ei);
          if (mid1 < end1) this.computeIntersectsForChain(start0, mid0, _mce, mid1, end1, ei);
        }

        if (mid0 < end0) {
          if (start1 < mid1) this.computeIntersectsForChain(mid0, end0, _mce, start1, mid1, ei);
          if (mid1 < end1) this.computeIntersectsForChain(mid0, end0, _mce, mid1, end1, ei);
        }
      }
    },
    overlaps: function overlaps(start0, end0, mce, start1, end1) {
      return Envelope.intersects(this.pts[start0], this.pts[end0], mce.pts[start1], mce.pts[end1]);
    },
    getStartIndexes: function getStartIndexes() {
      return this.startIndex;
    },
    computeIntersects: function computeIntersects(mce, si) {
      for (var i = 0; i < this.startIndex.length - 1; i++) {
        for (var j = 0; j < mce.startIndex.length - 1; j++) {
          this.computeIntersectsForChain(i, mce, j, si);
        }
      }
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return MonotoneChainEdge;
    }
  });

  function Depth() {
    this._depth = Array(2).fill().map(function () {
      return Array(3);
    });

    for (var i = 0; i < 2; i++) {
      for (var j = 0; j < 3; j++) {
        this._depth[i][j] = Depth.NULL_VALUE;
      }
    }
  }
  extend(Depth.prototype, {
    getDepth: function getDepth(geomIndex, posIndex) {
      return this._depth[geomIndex][posIndex];
    },
    setDepth: function setDepth(geomIndex, posIndex, depthValue) {
      this._depth[geomIndex][posIndex] = depthValue;
    },
    isNull: function isNull() {
      if (arguments.length === 0) {
        for (var i = 0; i < 2; i++) {
          for (var j = 0; j < 3; j++) {
            if (this._depth[i][j] !== Depth.NULL_VALUE) return false;
          }
        }

        return true;
      } else if (arguments.length === 1) {
        var geomIndex = arguments[0];
        return this._depth[geomIndex][1] === Depth.NULL_VALUE;
      } else if (arguments.length === 2) {
        var _geomIndex = arguments[0],
            posIndex = arguments[1];
        return this._depth[_geomIndex][posIndex] === Depth.NULL_VALUE;
      }
    },
    normalize: function normalize() {
      for (var i = 0; i < 2; i++) {
        if (!this.isNull(i)) {
          var minDepth = this._depth[i][1];
          if (this._depth[i][2] < minDepth) minDepth = this._depth[i][2];
          if (minDepth < 0) minDepth = 0;

          for (var j = 1; j < 3; j++) {
            var newValue = 0;
            if (this._depth[i][j] > minDepth) newValue = 1;
            this._depth[i][j] = newValue;
          }
        }
      }
    },
    getDelta: function getDelta(geomIndex) {
      return this._depth[geomIndex][Position.RIGHT] - this._depth[geomIndex][Position.LEFT];
    },
    getLocation: function getLocation(geomIndex, posIndex) {
      if (this._depth[geomIndex][posIndex] <= 0) return Location.EXTERIOR;
      return Location.INTERIOR;
    },
    toString: function toString() {
      return "A: " + this._depth[0][1] + "," + this._depth[0][2] + " B: " + this._depth[1][1] + "," + this._depth[1][2];
    },
    add: function add() {
      if (arguments.length === 1) {
        var lbl = arguments[0];

        for (var i = 0; i < 2; i++) {
          for (var j = 1; j < 3; j++) {
            var loc = lbl.getLocation(i, j);

            if (loc === Location.EXTERIOR || loc === Location.INTERIOR) {
              if (this.isNull(i, j)) {
                this._depth[i][j] = Depth.depthAtLocation(loc);
              } else this._depth[i][j] += Depth.depthAtLocation(loc);
            }
          }
        }
      } else if (arguments.length === 3) {
        var geomIndex = arguments[0],
            posIndex = arguments[1],
            location = arguments[2];
        if (location === Location.INTERIOR) this._depth[geomIndex][posIndex]++;
      }
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return Depth;
    }
  });

  Depth.depthAtLocation = function (location) {
    if (location === Location.EXTERIOR) return 0;
    if (location === Location.INTERIOR) return 1;
    return Depth.NULL_VALUE;
  };

  Depth.NULL_VALUE = -1;

  function GraphComponent() {
    this._label = null;
    this._isInResult = false;
    this._isCovered = false;
    this._isCoveredSet = false;
    this._isVisited = false;

    if (arguments.length === 0) ; else if (arguments.length === 1) {
      var label = arguments[0];
      this._label = label;
    }
  }
  extend(GraphComponent.prototype, {
    setVisited: function setVisited(isVisited) {
      this._isVisited = isVisited;
    },
    setInResult: function setInResult(isInResult) {
      this._isInResult = isInResult;
    },
    isCovered: function isCovered() {
      return this._isCovered;
    },
    isCoveredSet: function isCoveredSet() {
      return this._isCoveredSet;
    },
    setLabel: function setLabel(label) {
      this._label = label;
    },
    getLabel: function getLabel() {
      return this._label;
    },
    setCovered: function setCovered(isCovered) {
      this._isCovered = isCovered;
      this._isCoveredSet = true;
    },
    updateIM: function updateIM(im) {
      Assert.isTrue(this._label.getGeometryCount() >= 2, "found partial label");
      this.computeIM(im);
    },
    isInResult: function isInResult() {
      return this._isInResult;
    },
    isVisited: function isVisited() {
      return this._isVisited;
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return GraphComponent;
    }
  });

  function Edge() {
    GraphComponent.apply(this);
    this.pts = null;
    this._env = null;
    this.eiList = new EdgeIntersectionList(this);
    this._name = null;
    this._mce = null;
    this._isIsolated = true;
    this._depth = new Depth();
    this._depthDelta = 0;

    if (arguments.length === 1) {
      var pts = arguments[0];
      Edge.call(this, pts, null);
    } else if (arguments.length === 2) {
      var _pts = arguments[0],
          label = arguments[1];
      this.pts = _pts;
      this._label = label;
    }
  }
  inherits(Edge, GraphComponent);
  extend(Edge.prototype, {
    getDepth: function getDepth() {
      return this._depth;
    },
    getCollapsedEdge: function getCollapsedEdge() {
      var newPts = new Array(2).fill(null);
      newPts[0] = this.pts[0];
      newPts[1] = this.pts[1];
      var newe = new Edge(newPts, Label.toLineLabel(this._label));
      return newe;
    },
    isIsolated: function isIsolated() {
      return this._isIsolated;
    },
    getCoordinates: function getCoordinates() {
      return this.pts;
    },
    setIsolated: function setIsolated(isIsolated) {
      this._isIsolated = isIsolated;
    },
    setName: function setName(name) {
      this._name = name;
    },
    equals: function equals(o) {
      if (!(o instanceof Edge)) return false;
      var e = o;
      if (this.pts.length !== e.pts.length) return false;
      var isEqualForward = true;
      var isEqualReverse = true;
      var iRev = this.pts.length;

      for (var i = 0; i < this.pts.length; i++) {
        if (!this.pts[i].equals2D(e.pts[i])) {
          isEqualForward = false;
        }

        if (!this.pts[i].equals2D(e.pts[--iRev])) {
          isEqualReverse = false;
        }

        if (!isEqualForward && !isEqualReverse) return false;
      }

      return true;
    },
    getCoordinate: function getCoordinate() {
      if (arguments.length === 0) {
        if (this.pts.length > 0) return this.pts[0];
        return null;
      } else if (arguments.length === 1) {
        var i = arguments[0];
        return this.pts[i];
      }
    },
    print: function print(out) {
      out.print("edge " + this._name + ": ");
      out.print("LINESTRING (");

      for (var i = 0; i < this.pts.length; i++) {
        if (i > 0) out.print(",");
        out.print(this.pts[i].x + " " + this.pts[i].y);
      }

      out.print(")  " + this._label + " " + this._depthDelta);
    },
    computeIM: function computeIM(im) {
      Edge.updateIM(this._label, im);
    },
    isCollapsed: function isCollapsed() {
      if (!this._label.isArea()) return false;
      if (this.pts.length !== 3) return false;
      if (this.pts[0].equals(this.pts[2])) return true;
      return false;
    },
    isClosed: function isClosed() {
      return this.pts[0].equals(this.pts[this.pts.length - 1]);
    },
    getMaximumSegmentIndex: function getMaximumSegmentIndex() {
      return this.pts.length - 1;
    },
    getDepthDelta: function getDepthDelta() {
      return this._depthDelta;
    },
    getNumPoints: function getNumPoints() {
      return this.pts.length;
    },
    printReverse: function printReverse(out) {
      out.print("edge " + this._name + ": ");

      for (var i = this.pts.length - 1; i >= 0; i--) {
        out.print(this.pts[i] + " ");
      }

      out.println("");
    },
    getMonotoneChainEdge: function getMonotoneChainEdge() {
      if (this._mce === null) this._mce = new MonotoneChainEdge(this);
      return this._mce;
    },
    getEnvelope: function getEnvelope() {
      if (this._env === null) {
        this._env = new Envelope();

        for (var i = 0; i < this.pts.length; i++) {
          this._env.expandToInclude(this.pts[i]);
        }
      }

      return this._env;
    },
    addIntersection: function addIntersection(li, segmentIndex, geomIndex, intIndex) {
      var intPt = new Coordinate(li.getIntersection(intIndex));
      var normalizedSegmentIndex = segmentIndex;
      var dist = li.getEdgeDistance(geomIndex, intIndex);
      var nextSegIndex = normalizedSegmentIndex + 1;

      if (nextSegIndex < this.pts.length) {
        var nextPt = this.pts[nextSegIndex];

        if (intPt.equals2D(nextPt)) {
          normalizedSegmentIndex = nextSegIndex;
          dist = 0.0;
        }
      }

      var ei = this.eiList.add(intPt, normalizedSegmentIndex, dist);
    },
    toString: function toString() {
      var builder = new StringBuilder();
      builder.append("edge " + this._name + ": ");
      builder.append("LINESTRING (");

      for (var i = 0; i < this.pts.length; i++) {
        if (i > 0) builder.append(",");
        builder.append(this.pts[i].x + " " + this.pts[i].y);
      }

      builder.append(")  " + this._label + " " + this._depthDelta);
      return builder.toString();
    },
    isPointwiseEqual: function isPointwiseEqual(e) {
      if (this.pts.length !== e.pts.length) return false;

      for (var i = 0; i < this.pts.length; i++) {
        if (!this.pts[i].equals2D(e.pts[i])) {
          return false;
        }
      }

      return true;
    },
    setDepthDelta: function setDepthDelta(depthDelta) {
      this._depthDelta = depthDelta;
    },
    getEdgeIntersectionList: function getEdgeIntersectionList() {
      return this.eiList;
    },
    addIntersections: function addIntersections(li, segmentIndex, geomIndex) {
      for (var i = 0; i < li.getIntersectionNum(); i++) {
        this.addIntersection(li, segmentIndex, geomIndex, i);
      }
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return Edge;
    }
  });

  Edge.updateIM = function () {
    if (arguments.length === 2 && arguments[1] instanceof IntersectionMatrix && arguments[0] instanceof Label) {
      var label = arguments[0],
          im = arguments[1];
      im.setAtLeastIfValid(label.getLocation(0, Position.ON), label.getLocation(1, Position.ON), 1);

      if (label.isArea()) {
        im.setAtLeastIfValid(label.getLocation(0, Position.LEFT), label.getLocation(1, Position.LEFT), 2);
        im.setAtLeastIfValid(label.getLocation(0, Position.RIGHT), label.getLocation(1, Position.RIGHT), 2);
      }
    } else return GraphComponent.prototype.updateIM.apply(this, arguments);
  };

  function Node$1() {
    GraphComponent.apply(this);
    this._coord = null;
    this._edges = null;
    var coord = arguments[0],
        edges = arguments[1];
    this._coord = coord;
    this._edges = edges;
    this._label = new Label(0, Location.NONE);
  }
  inherits(Node$1, GraphComponent);
  extend(Node$1.prototype, {
    isIncidentEdgeInResult: function isIncidentEdgeInResult() {
      for (var it = this.getEdges().getEdges().iterator(); it.hasNext();) {
        var de = it.next();
        if (de.getEdge().isInResult()) return true;
      }

      return false;
    },
    isIsolated: function isIsolated() {
      return this._label.getGeometryCount() === 1;
    },
    getCoordinate: function getCoordinate() {
      return this._coord;
    },
    print: function print(out) {
      out.println("node " + this._coord + " lbl: " + this._label);
    },
    computeIM: function computeIM(im) {},
    computeMergedLocation: function computeMergedLocation(label2, eltIndex) {
      var loc = Location.NONE;
      loc = this._label.getLocation(eltIndex);

      if (!label2.isNull(eltIndex)) {
        var nLoc = label2.getLocation(eltIndex);
        if (loc !== Location.BOUNDARY) loc = nLoc;
      }

      return loc;
    },
    setLabel: function setLabel() {
      if (arguments.length === 2 && Number.isInteger(arguments[1]) && Number.isInteger(arguments[0])) {
        var argIndex = arguments[0],
            onLocation = arguments[1];

        if (this._label === null) {
          this._label = new Label(argIndex, onLocation);
        } else this._label.setLocation(argIndex, onLocation);
      } else return GraphComponent.prototype.setLabel.apply(this, arguments);
    },
    getEdges: function getEdges() {
      return this._edges;
    },
    mergeLabel: function mergeLabel() {
      if (arguments[0] instanceof Node$1) {
        var n = arguments[0];
        this.mergeLabel(n._label);
      } else if (arguments[0] instanceof Label) {
        var label2 = arguments[0];

        for (var i = 0; i < 2; i++) {
          var loc = this.computeMergedLocation(label2, i);

          var thisLoc = this._label.getLocation(i);

          if (thisLoc === Location.NONE) this._label.setLocation(i, loc);
        }
      }
    },
    add: function add(e) {
      this._edges.insert(e);

      e.setNode(this);
    },
    setLabelBoundary: function setLabelBoundary(argIndex) {
      if (this._label === null) return null;
      var loc = Location.NONE;
      if (this._label !== null) loc = this._label.getLocation(argIndex);
      var newLoc = null;

      switch (loc) {
        case Location.BOUNDARY:
          newLoc = Location.INTERIOR;
          break;

        case Location.INTERIOR:
          newLoc = Location.BOUNDARY;
          break;

        default:
          newLoc = Location.BOUNDARY;
          break;
      }

      this._label.setLocation(argIndex, newLoc);
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return Node$1;
    }
  });

  function NodeMap() {
    this.nodeMap = new TreeMap();
    this.nodeFact = null;
    var nodeFact = arguments[0];
    this.nodeFact = nodeFact;
  }
  extend(NodeMap.prototype, {
    find: function find(coord) {
      return this.nodeMap.get(coord);
    },
    addNode: function addNode() {
      if (arguments[0] instanceof Coordinate) {
        var coord = arguments[0];
        var node = this.nodeMap.get(coord);

        if (node === null) {
          node = this.nodeFact.createNode(coord);
          this.nodeMap.put(coord, node);
        }

        return node;
      } else if (arguments[0] instanceof Node$1) {
        var n = arguments[0];
        var node = this.nodeMap.get(n.getCoordinate());

        if (node === null) {
          this.nodeMap.put(n.getCoordinate(), n);
          return n;
        }

        node.mergeLabel(n);
        return node;
      }
    },
    print: function print(out) {
      for (var it = this.iterator(); it.hasNext();) {
        var n = it.next();
        n.print(out);
      }
    },
    iterator: function iterator() {
      return this.nodeMap.values().iterator();
    },
    values: function values() {
      return this.nodeMap.values();
    },
    getBoundaryNodes: function getBoundaryNodes(geomIndex) {
      var bdyNodes = new ArrayList();

      for (var i = this.iterator(); i.hasNext();) {
        var node = i.next();
        if (node.getLabel().getLocation(geomIndex) === Location.BOUNDARY) bdyNodes.add(node);
      }

      return bdyNodes;
    },
    add: function add(e) {
      var p = e.getCoordinate();
      var n = this.addNode(p);
      n.add(e);
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return NodeMap;
    }
  });

  function EdgeEnd() {
    this._edge = null;
    this._label = null;
    this._node = null;
    this._p0 = null;
    this._p1 = null;
    this._dx = null;
    this._dy = null;
    this._quadrant = null;

    if (arguments.length === 1) {
      var edge = arguments[0];
      this._edge = edge;
    } else if (arguments.length === 3) {
      var _edge = arguments[0],
          p0 = arguments[1],
          p1 = arguments[2];
      EdgeEnd.call(this, _edge, p0, p1, null);
    } else if (arguments.length === 4) {
      var _edge2 = arguments[0],
          _p = arguments[1],
          _p2 = arguments[2],
          label = arguments[3];
      EdgeEnd.call(this, _edge2);
      this.init(_p, _p2);
      this._label = label;
    }
  }
  extend(EdgeEnd.prototype, {
    compareDirection: function compareDirection(e) {
      if (this._dx === e._dx && this._dy === e._dy) return 0;
      if (this._quadrant > e._quadrant) return 1;
      if (this._quadrant < e._quadrant) return -1;
      return Orientation.index(e._p0, e._p1, this._p1);
    },
    getDy: function getDy() {
      return this._dy;
    },
    getCoordinate: function getCoordinate() {
      return this._p0;
    },
    setNode: function setNode(node) {
      this._node = node;
    },
    print: function print(out) {
      var angle = Math.atan2(this._dy, this._dx);
      var className = this.getClass().getName();
      var lastDotPos = className.lastIndexOf('.');
      var name = className.substring(lastDotPos + 1);
      out.print("  " + name + ": " + this._p0 + " - " + this._p1 + " " + this._quadrant + ":" + angle + "   " + this._label);
    },
    compareTo: function compareTo(obj) {
      var e = obj;
      return this.compareDirection(e);
    },
    getDirectedCoordinate: function getDirectedCoordinate() {
      return this._p1;
    },
    getDx: function getDx() {
      return this._dx;
    },
    getLabel: function getLabel() {
      return this._label;
    },
    getEdge: function getEdge() {
      return this._edge;
    },
    getQuadrant: function getQuadrant() {
      return this._quadrant;
    },
    getNode: function getNode() {
      return this._node;
    },
    toString: function toString() {
      var angle = Math.atan2(this._dy, this._dx);
      var className = this.getClass().getName();
      var lastDotPos = className.lastIndexOf('.');
      var name = className.substring(lastDotPos + 1);
      return "  " + name + ": " + this._p0 + " - " + this._p1 + " " + this._quadrant + ":" + angle + "   " + this._label;
    },
    computeLabel: function computeLabel(boundaryNodeRule) {},
    init: function init(p0, p1) {
      this._p0 = p0;
      this._p1 = p1;
      this._dx = p1.x - p0.x;
      this._dy = p1.y - p0.y;
      this._quadrant = Quadrant.quadrant(this._dx, this._dy);
      Assert.isTrue(!(this._dx === 0 && this._dy === 0), "EdgeEnd with identical endpoints found");
    },
    interfaces_: function interfaces_() {
      return [Comparable];
    },
    getClass: function getClass() {
      return EdgeEnd;
    }
  });

  function TopologyException() {
    this.pt = null;

    if (arguments.length === 1) {
      var msg = arguments[0];
      RuntimeException.call(this, msg);
    } else if (arguments.length === 2) {
      var _msg = arguments[0],
          pt = arguments[1];
      RuntimeException.call(this, TopologyException.msgWithCoord(_msg, pt));
      this.name = 'TopologyException';
      this.pt = new Coordinate(pt);
    }
  }
  inherits(TopologyException, RuntimeException);
  extend(TopologyException.prototype, {
    getCoordinate: function getCoordinate() {
      return this.pt;
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return TopologyException;
    }
  });

  TopologyException.msgWithCoord = function (msg, pt) {
    if (pt !== null) return msg + " [ " + pt + " ]";
    return msg;
  };

  function DirectedEdge() {
    this._isForward = null;
    this._isInResult = false;
    this._isVisited = false;
    this._sym = null;
    this._next = null;
    this._nextMin = null;
    this._edgeRing = null;
    this._minEdgeRing = null;
    this._depth = [0, -999, -999];
    var edge = arguments[0],
        isForward = arguments[1];
    EdgeEnd.call(this, edge);
    this._isForward = isForward;

    if (isForward) {
      this.init(edge.getCoordinate(0), edge.getCoordinate(1));
    } else {
      var n = edge.getNumPoints() - 1;
      this.init(edge.getCoordinate(n), edge.getCoordinate(n - 1));
    }

    this.computeDirectedLabel();
  }
  inherits(DirectedEdge, EdgeEnd);
  extend(DirectedEdge.prototype, {
    getNextMin: function getNextMin() {
      return this._nextMin;
    },
    getDepth: function getDepth(position) {
      return this._depth[position];
    },
    setVisited: function setVisited(isVisited) {
      this._isVisited = isVisited;
    },
    computeDirectedLabel: function computeDirectedLabel() {
      this._label = new Label(this._edge.getLabel());
      if (!this._isForward) this._label.flip();
    },
    getNext: function getNext() {
      return this._next;
    },
    setDepth: function setDepth(position, depthVal) {
      if (this._depth[position] !== -999) {
        if (this._depth[position] !== depthVal) throw new TopologyException("assigned depths do not match", this.getCoordinate());
      }

      this._depth[position] = depthVal;
    },
    isInteriorAreaEdge: function isInteriorAreaEdge() {
      var isInteriorAreaEdge = true;

      for (var i = 0; i < 2; i++) {
        if (!(this._label.isArea(i) && this._label.getLocation(i, Position.LEFT) === Location.INTERIOR && this._label.getLocation(i, Position.RIGHT) === Location.INTERIOR)) {
          isInteriorAreaEdge = false;
        }
      }

      return isInteriorAreaEdge;
    },
    setNextMin: function setNextMin(nextMin) {
      this._nextMin = nextMin;
    },
    print: function print(out) {
      EdgeEnd.prototype.print.call(this, out);
      out.print(" " + this._depth[Position.LEFT] + "/" + this._depth[Position.RIGHT]);
      out.print(" (" + this.getDepthDelta() + ")");
      if (this._isInResult) out.print(" inResult");
    },
    setMinEdgeRing: function setMinEdgeRing(minEdgeRing) {
      this._minEdgeRing = minEdgeRing;
    },
    isLineEdge: function isLineEdge() {
      var isLine = this._label.isLine(0) || this._label.isLine(1);

      var isExteriorIfArea0 = !this._label.isArea(0) || this._label.allPositionsEqual(0, Location.EXTERIOR);

      var isExteriorIfArea1 = !this._label.isArea(1) || this._label.allPositionsEqual(1, Location.EXTERIOR);

      return isLine && isExteriorIfArea0 && isExteriorIfArea1;
    },
    setEdgeRing: function setEdgeRing(edgeRing) {
      this._edgeRing = edgeRing;
    },
    getMinEdgeRing: function getMinEdgeRing() {
      return this._minEdgeRing;
    },
    getDepthDelta: function getDepthDelta() {
      var depthDelta = this._edge.getDepthDelta();

      if (!this._isForward) depthDelta = -depthDelta;
      return depthDelta;
    },
    setInResult: function setInResult(isInResult) {
      this._isInResult = isInResult;
    },
    getSym: function getSym() {
      return this._sym;
    },
    isForward: function isForward() {
      return this._isForward;
    },
    getEdge: function getEdge() {
      return this._edge;
    },
    printEdge: function printEdge(out) {
      this.print(out);
      out.print(" ");
      if (this._isForward) this._edge.print(out);else this._edge.printReverse(out);
    },
    setSym: function setSym(de) {
      this._sym = de;
    },
    setVisitedEdge: function setVisitedEdge(isVisited) {
      this.setVisited(isVisited);

      this._sym.setVisited(isVisited);
    },
    setEdgeDepths: function setEdgeDepths(position, depth) {
      var depthDelta = this.getEdge().getDepthDelta();
      if (!this._isForward) depthDelta = -depthDelta;
      var directionFactor = 1;
      if (position === Position.LEFT) directionFactor = -1;
      var oppositePos = Position.opposite(position);
      var delta = depthDelta * directionFactor;
      var oppositeDepth = depth + delta;
      this.setDepth(position, depth);
      this.setDepth(oppositePos, oppositeDepth);
    },
    getEdgeRing: function getEdgeRing() {
      return this._edgeRing;
    },
    isInResult: function isInResult() {
      return this._isInResult;
    },
    setNext: function setNext(next) {
      this._next = next;
    },
    isVisited: function isVisited() {
      return this._isVisited;
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return DirectedEdge;
    }
  });

  DirectedEdge.depthFactor = function (currLocation, nextLocation) {
    if (currLocation === Location.EXTERIOR && nextLocation === Location.INTERIOR) return 1;else if (currLocation === Location.INTERIOR && nextLocation === Location.EXTERIOR) return -1;
    return 0;
  };

  function NodeFactory() {}
  extend(NodeFactory.prototype, {
    createNode: function createNode(coord) {
      return new Node$1(coord, null);
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return NodeFactory;
    }
  });

  function PlanarGraph() {
    this._edges = new ArrayList();
    this._nodes = null;
    this._edgeEndList = new ArrayList();

    if (arguments.length === 0) {
      this._nodes = new NodeMap(new NodeFactory());
    } else if (arguments.length === 1) {
      var nodeFact = arguments[0];
      this._nodes = new NodeMap(nodeFact);
    }
  }
  extend(PlanarGraph.prototype, {
    printEdges: function printEdges(out) {
      out.println("Edges:");

      for (var i = 0; i < this._edges.size(); i++) {
        out.println("edge " + i + ":");

        var e = this._edges.get(i);

        e.print(out);
        e.eiList.print(out);
      }
    },
    find: function find(coord) {
      return this._nodes.find(coord);
    },
    addNode: function addNode() {
      if (arguments[0] instanceof Node$1) {
        var node = arguments[0];
        return this._nodes.addNode(node);
      } else if (arguments[0] instanceof Coordinate) {
        var coord = arguments[0];
        return this._nodes.addNode(coord);
      }
    },
    getNodeIterator: function getNodeIterator() {
      return this._nodes.iterator();
    },
    linkResultDirectedEdges: function linkResultDirectedEdges() {
      for (var nodeit = this._nodes.iterator(); nodeit.hasNext();) {
        var node = nodeit.next();
        node.getEdges().linkResultDirectedEdges();
      }
    },
    debugPrintln: function debugPrintln(o) {
      System.out.println(o);
    },
    isBoundaryNode: function isBoundaryNode(geomIndex, coord) {
      var node = this._nodes.find(coord);

      if (node === null) return false;
      var label = node.getLabel();
      if (label !== null && label.getLocation(geomIndex) === Location.BOUNDARY) return true;
      return false;
    },
    linkAllDirectedEdges: function linkAllDirectedEdges() {
      for (var nodeit = this._nodes.iterator(); nodeit.hasNext();) {
        var node = nodeit.next();
        node.getEdges().linkAllDirectedEdges();
      }
    },
    matchInSameDirection: function matchInSameDirection(p0, p1, ep0, ep1) {
      if (!p0.equals(ep0)) return false;
      if (Orientation.index(p0, p1, ep1) === Orientation.COLLINEAR && Quadrant.quadrant(p0, p1) === Quadrant.quadrant(ep0, ep1)) return true;
      return false;
    },
    getEdgeEnds: function getEdgeEnds() {
      return this._edgeEndList;
    },
    debugPrint: function debugPrint(o) {
      System.out.print(o);
    },
    getEdgeIterator: function getEdgeIterator() {
      return this._edges.iterator();
    },
    findEdgeInSameDirection: function findEdgeInSameDirection(p0, p1) {
      for (var i = 0; i < this._edges.size(); i++) {
        var e = this._edges.get(i);

        var eCoord = e.getCoordinates();
        if (this.matchInSameDirection(p0, p1, eCoord[0], eCoord[1])) return e;
        if (this.matchInSameDirection(p0, p1, eCoord[eCoord.length - 1], eCoord[eCoord.length - 2])) return e;
      }

      return null;
    },
    insertEdge: function insertEdge(e) {
      this._edges.add(e);
    },
    findEdgeEnd: function findEdgeEnd(e) {
      for (var i = this.getEdgeEnds().iterator(); i.hasNext();) {
        var ee = i.next();
        if (ee.getEdge() === e) return ee;
      }

      return null;
    },
    addEdges: function addEdges(edgesToAdd) {
      for (var it = edgesToAdd.iterator(); it.hasNext();) {
        var e = it.next();

        this._edges.add(e);

        var de1 = new DirectedEdge(e, true);
        var de2 = new DirectedEdge(e, false);
        de1.setSym(de2);
        de2.setSym(de1);
        this.add(de1);
        this.add(de2);
      }
    },
    add: function add(e) {
      this._nodes.add(e);

      this._edgeEndList.add(e);
    },
    getNodes: function getNodes() {
      return this._nodes.values();
    },
    findEdge: function findEdge(p0, p1) {
      for (var i = 0; i < this._edges.size(); i++) {
        var e = this._edges.get(i);

        var eCoord = e.getCoordinates();
        if (p0.equals(eCoord[0]) && p1.equals(eCoord[1])) return e;
      }

      return null;
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return PlanarGraph;
    }
  });

  PlanarGraph.linkResultDirectedEdges = function (nodes) {
    for (var nodeit = nodes.iterator(); nodeit.hasNext();) {
      var node = nodeit.next();
      node.getEdges().linkResultDirectedEdges();
    }
  };

  function GeometryGraph() {
    PlanarGraph.apply(this);
    this._parentGeom = null;
    this._lineEdgeMap = new HashMap();
    this._boundaryNodeRule = null;
    this._useBoundaryDeterminationRule = true;
    this._argIndex = null;
    this._boundaryNodes = null;
    this._hasTooFewPoints = false;
    this._invalidPoint = null;
    this._areaPtLocator = null;
    this._ptLocator = new PointLocator();

    if (arguments.length === 2) {
      var argIndex = arguments[0],
          parentGeom = arguments[1];
      GeometryGraph.call(this, argIndex, parentGeom, BoundaryNodeRule.OGC_SFS_BOUNDARY_RULE);
    } else if (arguments.length === 3) {
      var _argIndex = arguments[0],
          _parentGeom = arguments[1],
          boundaryNodeRule = arguments[2];
      this._argIndex = _argIndex;
      this._parentGeom = _parentGeom;
      this._boundaryNodeRule = boundaryNodeRule;

      if (_parentGeom !== null) {
        this.add(_parentGeom);
      }
    }
  }
  inherits(GeometryGraph, PlanarGraph);
  extend(GeometryGraph.prototype, {
    insertBoundaryPoint: function insertBoundaryPoint(argIndex, coord) {
      var n = this._nodes.addNode(coord);

      var lbl = n.getLabel();
      var boundaryCount = 1;
      var loc = Location.NONE;
      loc = lbl.getLocation(argIndex, Position.ON);
      if (loc === Location.BOUNDARY) boundaryCount++;
      var newLoc = GeometryGraph.determineBoundary(this._boundaryNodeRule, boundaryCount);
      lbl.setLocation(argIndex, newLoc);
    },
    computeSelfNodes: function computeSelfNodes() {
      if (arguments.length === 2) {
        var li = arguments[0],
            computeRingSelfNodes = arguments[1];
        return this.computeSelfNodes(li, computeRingSelfNodes, false);
      } else if (arguments.length === 3) {
        var _li = arguments[0],
            _computeRingSelfNodes = arguments[1],
            isDoneIfProperInt = arguments[2];
        var si = new SegmentIntersector(_li, true, false);
        si.setIsDoneIfProperInt(isDoneIfProperInt);
        var esi = this.createEdgeSetIntersector();
        var isRings = this._parentGeom instanceof LinearRing || this._parentGeom instanceof Polygon || this._parentGeom instanceof MultiPolygon;
        var computeAllSegments = _computeRingSelfNodes || !isRings;
        esi.computeIntersections(this._edges, si, computeAllSegments);
        this.addSelfIntersectionNodes(this._argIndex);
        return si;
      }
    },
    computeSplitEdges: function computeSplitEdges(edgelist) {
      for (var i = this._edges.iterator(); i.hasNext();) {
        var e = i.next();
        e.eiList.addSplitEdges(edgelist);
      }
    },
    computeEdgeIntersections: function computeEdgeIntersections(g, li, includeProper) {
      var si = new SegmentIntersector(li, includeProper, true);
      si.setBoundaryNodes(this.getBoundaryNodes(), g.getBoundaryNodes());
      var esi = this.createEdgeSetIntersector();
      esi.computeIntersections(this._edges, g._edges, si);
      return si;
    },
    getGeometry: function getGeometry() {
      return this._parentGeom;
    },
    getBoundaryNodeRule: function getBoundaryNodeRule() {
      return this._boundaryNodeRule;
    },
    hasTooFewPoints: function hasTooFewPoints() {
      return this._hasTooFewPoints;
    },
    addPoint: function addPoint() {
      if (arguments[0] instanceof Point) {
        var p = arguments[0];
        var coord = p.getCoordinate();
        this.insertPoint(this._argIndex, coord, Location.INTERIOR);
      } else if (arguments[0] instanceof Coordinate) {
        var pt = arguments[0];
        this.insertPoint(this._argIndex, pt, Location.INTERIOR);
      }
    },
    addPolygon: function addPolygon(p) {
      this.addPolygonRing(p.getExteriorRing(), Location.EXTERIOR, Location.INTERIOR);

      for (var i = 0; i < p.getNumInteriorRing(); i++) {
        var hole = p.getInteriorRingN(i);
        this.addPolygonRing(hole, Location.INTERIOR, Location.EXTERIOR);
      }
    },
    addEdge: function addEdge(e) {
      this.insertEdge(e);
      var coord = e.getCoordinates();
      this.insertPoint(this._argIndex, coord[0], Location.BOUNDARY);
      this.insertPoint(this._argIndex, coord[coord.length - 1], Location.BOUNDARY);
    },
    addLineString: function addLineString(line) {
      var coord = CoordinateArrays.removeRepeatedPoints(line.getCoordinates());

      if (coord.length < 2) {
        this._hasTooFewPoints = true;
        this._invalidPoint = coord[0];
        return null;
      }

      var e = new Edge(coord, new Label(this._argIndex, Location.INTERIOR));

      this._lineEdgeMap.put(line, e);

      this.insertEdge(e);
      Assert.isTrue(coord.length >= 2, "found LineString with single point");
      this.insertBoundaryPoint(this._argIndex, coord[0]);
      this.insertBoundaryPoint(this._argIndex, coord[coord.length - 1]);
    },
    getInvalidPoint: function getInvalidPoint() {
      return this._invalidPoint;
    },
    getBoundaryPoints: function getBoundaryPoints() {
      var coll = this.getBoundaryNodes();
      var pts = new Array(coll.size()).fill(null);
      var i = 0;

      for (var it = coll.iterator(); it.hasNext();) {
        var node = it.next();
        pts[i++] = node.getCoordinate().copy();
      }

      return pts;
    },
    getBoundaryNodes: function getBoundaryNodes() {
      if (this._boundaryNodes === null) this._boundaryNodes = this._nodes.getBoundaryNodes(this._argIndex);
      return this._boundaryNodes;
    },
    addSelfIntersectionNode: function addSelfIntersectionNode(argIndex, coord, loc) {
      if (this.isBoundaryNode(argIndex, coord)) return null;
      if (loc === Location.BOUNDARY && this._useBoundaryDeterminationRule) this.insertBoundaryPoint(argIndex, coord);else this.insertPoint(argIndex, coord, loc);
    },
    addPolygonRing: function addPolygonRing(lr, cwLeft, cwRight) {
      if (lr.isEmpty()) return null;
      var coord = CoordinateArrays.removeRepeatedPoints(lr.getCoordinates());

      if (coord.length < 4) {
        this._hasTooFewPoints = true;
        this._invalidPoint = coord[0];
        return null;
      }

      var left = cwLeft;
      var right = cwRight;

      if (Orientation.isCCW(coord)) {
        left = cwRight;
        right = cwLeft;
      }

      var e = new Edge(coord, new Label(this._argIndex, Location.BOUNDARY, left, right));

      this._lineEdgeMap.put(lr, e);

      this.insertEdge(e);
      this.insertPoint(this._argIndex, coord[0], Location.BOUNDARY);
    },
    insertPoint: function insertPoint(argIndex, coord, onLocation) {
      var n = this._nodes.addNode(coord);

      var lbl = n.getLabel();

      if (lbl === null) {
        n._label = new Label(argIndex, onLocation);
      } else lbl.setLocation(argIndex, onLocation);
    },
    createEdgeSetIntersector: function createEdgeSetIntersector() {
      return new SimpleMCSweepLineIntersector();
    },
    addSelfIntersectionNodes: function addSelfIntersectionNodes(argIndex) {
      for (var i = this._edges.iterator(); i.hasNext();) {
        var e = i.next();
        var eLoc = e.getLabel().getLocation(argIndex);

        for (var eiIt = e.eiList.iterator(); eiIt.hasNext();) {
          var ei = eiIt.next();
          this.addSelfIntersectionNode(argIndex, ei.coord, eLoc);
        }
      }
    },
    add: function add() {
      if (arguments.length === 1 && arguments[0] instanceof Geometry) {
        var g = arguments[0];
        if (g.isEmpty()) return null;
        if (g instanceof MultiPolygon) this._useBoundaryDeterminationRule = false;
        if (g instanceof Polygon) this.addPolygon(g);else if (g instanceof LineString) this.addLineString(g);else if (g instanceof Point) this.addPoint(g);else if (g instanceof MultiPoint) this.addCollection(g);else if (g instanceof MultiLineString) this.addCollection(g);else if (g instanceof MultiPolygon) this.addCollection(g);else if (g instanceof GeometryCollection) this.addCollection(g);else throw new UnsupportedOperationException(g.getClass().getName());
      } else return PlanarGraph.prototype.add.apply(this, arguments);
    },
    addCollection: function addCollection(gc) {
      for (var i = 0; i < gc.getNumGeometries(); i++) {
        var g = gc.getGeometryN(i);
        this.add(g);
      }
    },
    locate: function locate(pt) {
      if (hasInterface(this._parentGeom, Polygonal) && this._parentGeom.getNumGeometries() > 50) {
        if (this._areaPtLocator === null) {
          this._areaPtLocator = new IndexedPointInAreaLocator(this._parentGeom);
        }

        return this._areaPtLocator.locate(pt);
      }

      return this._ptLocator.locate(pt, this._parentGeom);
    },
    findEdge: function findEdge() {
      if (arguments.length === 1 && arguments[0] instanceof LineString) {
        var line = arguments[0];
        return this._lineEdgeMap.get(line);
      } else return PlanarGraph.prototype.findEdge.apply(this, arguments);
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return GeometryGraph;
    }
  });

  GeometryGraph.determineBoundary = function (boundaryNodeRule, boundaryCount) {
    return boundaryNodeRule.isInBoundary(boundaryCount) ? Location.BOUNDARY : Location.INTERIOR;
  };



  var geomgraph = /*#__PURE__*/Object.freeze({
    GeometryGraph: GeometryGraph
  });

  function KdNodeVisitor() {}
  extend(KdNodeVisitor.prototype, {
    visit: function visit(node) {},
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return KdNodeVisitor;
    }
  });

  function KdNode() {
    this._p = null;
    this._data = null;
    this._left = null;
    this._right = null;
    this._count = null;

    if (arguments.length === 2) {
      var p = arguments[0],
          data = arguments[1];
      this._p = new Coordinate(p);
      this._left = null;
      this._right = null;
      this._count = 1;
      this._data = data;
    } else if (arguments.length === 3) {
      var _x = arguments[0],
          _y = arguments[1],
          _data = arguments[2];
      this._p = new Coordinate(_x, _y);
      this._left = null;
      this._right = null;
      this._count = 1;
      this._data = _data;
    }
  }
  extend(KdNode.prototype, {
    isRepeated: function isRepeated() {
      return this._count > 1;
    },
    getRight: function getRight() {
      return this._right;
    },
    getCoordinate: function getCoordinate() {
      return this._p;
    },
    setLeft: function setLeft(_left) {
      this._left = _left;
    },
    getX: function getX() {
      return this._p.x;
    },
    getData: function getData() {
      return this._data;
    },
    getCount: function getCount() {
      return this._count;
    },
    getLeft: function getLeft() {
      return this._left;
    },
    getY: function getY() {
      return this._p.y;
    },
    increment: function increment() {
      this._count = this._count + 1;
    },
    setRight: function setRight(_right) {
      this._right = _right;
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return KdNode;
    }
  });

  function KdTree() {
    this._root = null;
    this._numberOfNodes = null;
    this._tolerance = null;

    if (arguments.length === 0) {
      KdTree.call(this, 0.0);
    } else if (arguments.length === 1) {
      var tolerance = arguments[0];
      this._tolerance = tolerance;
    }
  }
  extend(KdTree.prototype, {
    insert: function insert() {
      if (arguments.length === 1) {
        var p = arguments[0];
        return this.insert(p, null);
      } else if (arguments.length === 2) {
        var _p = arguments[0],
            data = arguments[1];

        if (this._root === null) {
          this._root = new KdNode(_p, data);
          return this._root;
        }

        if (this._tolerance > 0) {
          var matchNode = this.findBestMatchNode(_p);

          if (matchNode !== null) {
            matchNode.increment();
            return matchNode;
          }
        }

        return this.insertExact(_p, data);
      }
    },
    query: function query() {
      if (arguments.length === 1) {
        var queryEnv = arguments[0];
        var result = new ArrayList();
        this.query(queryEnv, result);
        return result;
      } else if (arguments.length === 2) {
        if (arguments[0] instanceof Envelope && hasInterface(arguments[1], List)) {
          var _queryEnv = arguments[0],
              _result = arguments[1];
          this.queryNode(this._root, _queryEnv, true, {
            interfaces_: function interfaces_() {
              return [KdNodeVisitor];
            },
            visit: function visit(node) {
              _result.add(node);
            }
          });
        } else if (arguments[0] instanceof Envelope && hasInterface(arguments[1], KdNodeVisitor)) {
          var _queryEnv2 = arguments[0],
              visitor = arguments[1];
          this.queryNode(this._root, _queryEnv2, true, visitor);
        }
      }
    },
    queryNode: function queryNode(currentNode, queryEnv, odd, visitor) {
      if (currentNode === null) return null;
      var min = null;
      var max = null;
      var discriminant = null;

      if (odd) {
        min = queryEnv.getMinX();
        max = queryEnv.getMaxX();
        discriminant = currentNode.getX();
      } else {
        min = queryEnv.getMinY();
        max = queryEnv.getMaxY();
        discriminant = currentNode.getY();
      }

      var searchLeft = min < discriminant;
      var searchRight = discriminant <= max;

      if (searchLeft) {
        this.queryNode(currentNode.getLeft(), queryEnv, !odd, visitor);
      }

      if (queryEnv.contains(currentNode.getCoordinate())) {
        visitor.visit(currentNode);
      }

      if (searchRight) {
        this.queryNode(currentNode.getRight(), queryEnv, !odd, visitor);
      }
    },
    findBestMatchNode: function findBestMatchNode(p) {
      var visitor = new BestMatchVisitor(p, this._tolerance);
      this.query(visitor.queryEnvelope(), visitor);
      return visitor.getNode();
    },
    isEmpty: function isEmpty() {
      if (this._root === null) return true;
      return false;
    },
    insertExact: function insertExact(p, data) {
      var currentNode = this._root;
      var leafNode = this._root;
      var isOddLevel = true;
      var isLessThan = true;

      while (currentNode !== null) {
        if (currentNode !== null) {
          var isInTolerance = p.distance(currentNode.getCoordinate()) <= this._tolerance;

          if (isInTolerance) {
            currentNode.increment();
            return currentNode;
          }
        }

        if (isOddLevel) {
          isLessThan = p.x < currentNode.getX();
        } else {
          isLessThan = p.y < currentNode.getY();
        }

        leafNode = currentNode;

        if (isLessThan) {
          currentNode = currentNode.getLeft();
        } else {
          currentNode = currentNode.getRight();
        }

        isOddLevel = !isOddLevel;
      }

      this._numberOfNodes = this._numberOfNodes + 1;
      var node = new KdNode(p, data);

      if (isLessThan) {
        leafNode.setLeft(node);
      } else {
        leafNode.setRight(node);
      }

      return node;
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return KdTree;
    }
  });

  KdTree.toCoordinates = function () {
    if (arguments.length === 1) {
      var kdnodes = arguments[0];
      return KdTree.toCoordinates(kdnodes, false);
    } else if (arguments.length === 2) {
      var _kdnodes = arguments[0],
          includeRepeated = arguments[1];
      var coord = new CoordinateList();

      for (var it = _kdnodes.iterator(); it.hasNext();) {
        var node = it.next();
        var count = includeRepeated ? node.getCount() : 1;

        for (var i = 0; i < count; i++) {
          coord.add(node.getCoordinate(), true);
        }
      }

      return coord.toCoordinateArray();
    }
  };

  function BestMatchVisitor() {
    this._tolerance = null;
    this._matchNode = null;
    this._matchDist = 0.0;
    this._p = null;
    var p = arguments[0],
        tolerance = arguments[1];
    this._p = p;
    this._tolerance = tolerance;
  }

  extend(BestMatchVisitor.prototype, {
    visit: function visit(node) {
      var dist = this._p.distance(node.getCoordinate());

      var isInTolerance = dist <= this._tolerance;
      if (!isInTolerance) return null;
      var update = false;
      if (this._matchNode === null || dist < this._matchDist || this._matchNode !== null && dist === this._matchDist && node.getCoordinate().compareTo(this._matchNode.getCoordinate()) < 1) update = true;

      if (update) {
        this._matchNode = node;
        this._matchDist = dist;
      }
    },
    queryEnvelope: function queryEnvelope() {
      var queryEnv = new Envelope(this._p);
      queryEnv.expandBy(this._tolerance);
      return queryEnv;
    },
    getNode: function getNode() {
      return this._matchNode;
    },
    interfaces_: function interfaces_() {
      return [KdNodeVisitor];
    },
    getClass: function getClass() {
      return BestMatchVisitor;
    }
  });
  KdTree.BestMatchVisitor = BestMatchVisitor;



  var kdtree = /*#__PURE__*/Object.freeze({
    KdTree: KdTree
  });

  function NodeBase$1() {
    this._items = new ArrayList();
    this._subnode = new Array(4).fill(null);
  }
  extend(NodeBase$1.prototype, {
    hasChildren: function hasChildren() {
      for (var i = 0; i < 4; i++) {
        if (this._subnode[i] !== null) return true;
      }

      return false;
    },
    isPrunable: function isPrunable() {
      return !(this.hasChildren() || this.hasItems());
    },
    addAllItems: function addAllItems(resultItems) {
      resultItems.addAll(this._items);

      for (var i = 0; i < 4; i++) {
        if (this._subnode[i] !== null) {
          this._subnode[i].addAllItems(resultItems);
        }
      }

      return resultItems;
    },
    getNodeCount: function getNodeCount() {
      var subSize = 0;

      for (var i = 0; i < 4; i++) {
        if (this._subnode[i] !== null) {
          subSize += this._subnode[i].size();
        }
      }

      return subSize + 1;
    },
    size: function size() {
      var subSize = 0;

      for (var i = 0; i < 4; i++) {
        if (this._subnode[i] !== null) {
          subSize += this._subnode[i].size();
        }
      }

      return subSize + this._items.size();
    },
    addAllItemsFromOverlapping: function addAllItemsFromOverlapping(searchEnv, resultItems) {
      if (!this.isSearchMatch(searchEnv)) return null;
      resultItems.addAll(this._items);

      for (var i = 0; i < 4; i++) {
        if (this._subnode[i] !== null) {
          this._subnode[i].addAllItemsFromOverlapping(searchEnv, resultItems);
        }
      }
    },
    visitItems: function visitItems(searchEnv, visitor) {
      for (var i = this._items.iterator(); i.hasNext();) {
        visitor.visitItem(i.next());
      }
    },
    hasItems: function hasItems() {
      return !this._items.isEmpty();
    },
    remove: function remove(itemEnv, item) {
      if (!this.isSearchMatch(itemEnv)) return false;
      var found = false;

      for (var i = 0; i < 4; i++) {
        if (this._subnode[i] !== null) {
          found = this._subnode[i].remove(itemEnv, item);

          if (found) {
            if (this._subnode[i].isPrunable()) this._subnode[i] = null;
            break;
          }
        }
      }

      if (found) return found;
      found = this._items.remove(item);
      return found;
    },
    visit: function visit(searchEnv, visitor) {
      if (!this.isSearchMatch(searchEnv)) return null;
      this.visitItems(searchEnv, visitor);

      for (var i = 0; i < 4; i++) {
        if (this._subnode[i] !== null) {
          this._subnode[i].visit(searchEnv, visitor);
        }
      }
    },
    getItems: function getItems() {
      return this._items;
    },
    depth: function depth() {
      var maxSubDepth = 0;

      for (var i = 0; i < 4; i++) {
        if (this._subnode[i] !== null) {
          var sqd = this._subnode[i].depth();

          if (sqd > maxSubDepth) maxSubDepth = sqd;
        }
      }

      return maxSubDepth + 1;
    },
    isEmpty: function isEmpty() {
      var isEmpty = true;
      if (!this._items.isEmpty()) isEmpty = false;else {
        for (var i = 0; i < 4; i++) {
          if (this._subnode[i] !== null) {
            if (!this._subnode[i].isEmpty()) {
              isEmpty = false;
              break;
            }
          }
        }
      }
      return isEmpty;
    },
    add: function add(item) {
      this._items.add(item);
    },
    interfaces_: function interfaces_() {
      return [Serializable];
    },
    getClass: function getClass() {
      return NodeBase$1;
    }
  });

  NodeBase$1.getSubnodeIndex = function (env, centrex, centrey) {
    var subnodeIndex = -1;

    if (env.getMinX() >= centrex) {
      if (env.getMinY() >= centrey) subnodeIndex = 3;
      if (env.getMaxY() <= centrey) subnodeIndex = 1;
    }

    if (env.getMaxX() <= centrex) {
      if (env.getMinY() >= centrey) subnodeIndex = 2;
      if (env.getMaxY() <= centrey) subnodeIndex = 0;
    }

    return subnodeIndex;
  };

  function Key$1() {
    this._pt = new Coordinate();
    this._level = 0;
    this._env = null;
    var itemEnv = arguments[0];
    this.computeKey(itemEnv);
  }
  extend(Key$1.prototype, {
    getLevel: function getLevel() {
      return this._level;
    },
    computeKey: function computeKey() {
      if (arguments.length === 1) {
        var itemEnv = arguments[0];
        this._level = Key$1.computeQuadLevel(itemEnv);
        this._env = new Envelope();
        this.computeKey(this._level, itemEnv);

        while (!this._env.contains(itemEnv)) {
          this._level += 1;
          this.computeKey(this._level, itemEnv);
        }
      } else if (arguments.length === 2) {
        var level = arguments[0],
            _itemEnv = arguments[1];
        var quadSize = DoubleBits.powerOf2(level);
        this._pt.x = Math.floor(_itemEnv.getMinX() / quadSize) * quadSize;
        this._pt.y = Math.floor(_itemEnv.getMinY() / quadSize) * quadSize;

        this._env.init(this._pt.x, this._pt.x + quadSize, this._pt.y, this._pt.y + quadSize);
      }
    },
    getEnvelope: function getEnvelope() {
      return this._env;
    },
    getCentre: function getCentre() {
      return new Coordinate((this._env.getMinX() + this._env.getMaxX()) / 2, (this._env.getMinY() + this._env.getMaxY()) / 2);
    },
    getPoint: function getPoint() {
      return this._pt;
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return Key$1;
    }
  });

  Key$1.computeQuadLevel = function (env) {
    var dx = env.getWidth();
    var dy = env.getHeight();
    var dMax = dx > dy ? dx : dy;
    var level = DoubleBits.exponent(dMax) + 1;
    return level;
  };

  function Node$2() {
    NodeBase$1.apply(this);
    this._env = null;
    this._centrex = null;
    this._centrey = null;
    this._level = null;
    var env = arguments[0],
        level = arguments[1];
    this._env = env;
    this._level = level;
    this._centrex = (env.getMinX() + env.getMaxX()) / 2;
    this._centrey = (env.getMinY() + env.getMaxY()) / 2;
  }
  inherits(Node$2, NodeBase$1);
  extend(Node$2.prototype, {
    find: function find(searchEnv) {
      var subnodeIndex = NodeBase$1.getSubnodeIndex(searchEnv, this._centrex, this._centrey);
      if (subnodeIndex === -1) return this;

      if (this._subnode[subnodeIndex] !== null) {
        var node = this._subnode[subnodeIndex];
        return node.find(searchEnv);
      }

      return this;
    },
    isSearchMatch: function isSearchMatch(searchEnv) {
      if (searchEnv === null) return false;
      return this._env.intersects(searchEnv);
    },
    getSubnode: function getSubnode(index) {
      if (this._subnode[index] === null) {
        this._subnode[index] = this.createSubnode(index);
      }

      return this._subnode[index];
    },
    getEnvelope: function getEnvelope() {
      return this._env;
    },
    getNode: function getNode(searchEnv) {
      var subnodeIndex = NodeBase$1.getSubnodeIndex(searchEnv, this._centrex, this._centrey);

      if (subnodeIndex !== -1) {
        var node = this.getSubnode(subnodeIndex);
        return node.getNode(searchEnv);
      } else {
        return this;
      }
    },
    createSubnode: function createSubnode(index) {
      var minx = 0.0;
      var maxx = 0.0;
      var miny = 0.0;
      var maxy = 0.0;

      switch (index) {
        case 0:
          minx = this._env.getMinX();
          maxx = this._centrex;
          miny = this._env.getMinY();
          maxy = this._centrey;
          break;

        case 1:
          minx = this._centrex;
          maxx = this._env.getMaxX();
          miny = this._env.getMinY();
          maxy = this._centrey;
          break;

        case 2:
          minx = this._env.getMinX();
          maxx = this._centrex;
          miny = this._centrey;
          maxy = this._env.getMaxY();
          break;

        case 3:
          minx = this._centrex;
          maxx = this._env.getMaxX();
          miny = this._centrey;
          maxy = this._env.getMaxY();
          break;
      }

      var sqEnv = new Envelope(minx, maxx, miny, maxy);
      var node = new Node$2(sqEnv, this._level - 1);
      return node;
    },
    insertNode: function insertNode(node) {
      Assert.isTrue(this._env === null || this._env.contains(node._env));
      var index = NodeBase$1.getSubnodeIndex(node._env, this._centrex, this._centrey);

      if (node._level === this._level - 1) {
        this._subnode[index] = node;
      } else {
        var childNode = this.createSubnode(index);
        childNode.insertNode(node);
        this._subnode[index] = childNode;
      }
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return Node$2;
    }
  });

  Node$2.createNode = function (env) {
    var key = new Key$1(env);
    var node = new Node$2(key.getEnvelope(), key.getLevel());
    return node;
  };

  Node$2.createExpanded = function (node, addEnv) {
    var expandEnv = new Envelope(addEnv);
    if (node !== null) expandEnv.expandToInclude(node._env);
    var largerNode = Node$2.createNode(expandEnv);
    if (node !== null) largerNode.insertNode(node);
    return largerNode;
  };

  function Root$1() {
    NodeBase$1.apply(this);
  }
  inherits(Root$1, NodeBase$1);
  extend(Root$1.prototype, {
    insert: function insert(itemEnv, item) {
      var index = NodeBase$1.getSubnodeIndex(itemEnv, Root$1.origin.x, Root$1.origin.y);

      if (index === -1) {
        this.add(item);
        return null;
      }

      var node = this._subnode[index];

      if (node === null || !node.getEnvelope().contains(itemEnv)) {
        var largerNode = Node$2.createExpanded(node, itemEnv);
        this._subnode[index] = largerNode;
      }

      this.insertContained(this._subnode[index], itemEnv, item);
    },
    isSearchMatch: function isSearchMatch(searchEnv) {
      return true;
    },
    insertContained: function insertContained(tree, itemEnv, item) {
      Assert.isTrue(tree.getEnvelope().contains(itemEnv));
      var isZeroX = IntervalSize.isZeroWidth(itemEnv.getMinX(), itemEnv.getMaxX());
      var isZeroY = IntervalSize.isZeroWidth(itemEnv.getMinY(), itemEnv.getMaxY());
      var node = null;
      if (isZeroX || isZeroY) node = tree.find(itemEnv);else node = tree.getNode(itemEnv);
      node.add(item);
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return Root$1;
    }
  });
  Root$1.origin = new Coordinate(0.0, 0.0);

  function SpatialIndex() {}
  extend(SpatialIndex.prototype, {
    insert: function insert(itemEnv, item) {},
    remove: function remove(itemEnv, item) {},
    query: function query() {
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return SpatialIndex;
    }
  });

  function Quadtree() {
    this._root = null;
    this._minExtent = 1.0;
    this._root = new Root$1();
  }
  extend(Quadtree.prototype, {
    size: function size() {
      if (this._root !== null) return this._root.size();
      return 0;
    },
    insert: function insert(itemEnv, item) {
      this.collectStats(itemEnv);
      var insertEnv = Quadtree.ensureExtent(itemEnv, this._minExtent);

      this._root.insert(insertEnv, item);
    },
    query: function query() {
      if (arguments.length === 1) {
        var searchEnv = arguments[0];
        var visitor = new ArrayListVisitor();
        this.query(searchEnv, visitor);
        return visitor.getItems();
      } else if (arguments.length === 2) {
        var _searchEnv = arguments[0],
            _visitor = arguments[1];

        this._root.visit(_searchEnv, _visitor);
      }
    },
    queryAll: function queryAll() {
      var foundItems = new ArrayList();

      this._root.addAllItems(foundItems);

      return foundItems;
    },
    remove: function remove(itemEnv, item) {
      var posEnv = Quadtree.ensureExtent(itemEnv, this._minExtent);
      return this._root.remove(posEnv, item);
    },
    collectStats: function collectStats(itemEnv) {
      var delX = itemEnv.getWidth();
      if (delX < this._minExtent && delX > 0.0) this._minExtent = delX;
      var delY = itemEnv.getHeight();
      if (delY < this._minExtent && delY > 0.0) this._minExtent = delY;
    },
    depth: function depth() {
      if (this._root !== null) return this._root.depth();
      return 0;
    },
    isEmpty: function isEmpty() {
      if (this._root === null) return true;
      return this._root.isEmpty();
    },
    interfaces_: function interfaces_() {
      return [SpatialIndex, Serializable];
    },
    getClass: function getClass() {
      return Quadtree;
    }
  });

  Quadtree.ensureExtent = function (itemEnv, minExtent) {
    var minx = itemEnv.getMinX();
    var maxx = itemEnv.getMaxX();
    var miny = itemEnv.getMinY();
    var maxy = itemEnv.getMaxY();
    if (minx !== maxx && miny !== maxy) return itemEnv;

    if (minx === maxx) {
      minx = minx - minExtent / 2.0;
      maxx = minx + minExtent / 2.0;
    }

    if (miny === maxy) {
      miny = miny - minExtent / 2.0;
      maxy = miny + minExtent / 2.0;
    }

    return new Envelope(minx, maxx, miny, maxy);
  };

  Quadtree.serialVersionUID = -7461163625812743604;



  var quadtree = /*#__PURE__*/Object.freeze({
    Quadtree: Quadtree
  });

  function Boundable() {}
  extend(Boundable.prototype, {
    getBounds: function getBounds() {},
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return Boundable;
    }
  });

  function ItemBoundable() {
    this._bounds = null;
    this._item = null;
    var bounds = arguments[0],
        item = arguments[1];
    this._bounds = bounds;
    this._item = item;
  }
  extend(ItemBoundable.prototype, {
    getItem: function getItem() {
      return this._item;
    },
    getBounds: function getBounds() {
      return this._bounds;
    },
    interfaces_: function interfaces_() {
      return [Boundable, Serializable];
    },
    getClass: function getClass() {
      return ItemBoundable;
    }
  });

  function PriorityQueue() {
    this._size = null;
    this._items = null;
    this._size = 0;
    this._items = new ArrayList();

    this._items.add(null);
  }
  extend(PriorityQueue.prototype, {
    poll: function poll() {
      if (this.isEmpty()) return null;

      var minItem = this._items.get(1);

      this._items.set(1, this._items.get(this._size));

      this._size -= 1;
      this.reorder(1);
      return minItem;
    },
    size: function size() {
      return this._size;
    },
    reorder: function reorder(hole) {
      var child = null;

      var tmp = this._items.get(hole);

      for (; hole * 2 <= this._size; hole = child) {
        child = hole * 2;
        if (child !== this._size && this._items.get(child + 1).compareTo(this._items.get(child)) < 0) child++;
        if (this._items.get(child).compareTo(tmp) < 0) this._items.set(hole, this._items.get(child));else break;
      }

      this._items.set(hole, tmp);
    },
    clear: function clear() {
      this._size = 0;

      this._items.clear();
    },
    peek: function peek() {
      if (this.isEmpty()) return null;

      var minItem = this._items.get(1);

      return minItem;
    },
    isEmpty: function isEmpty() {
      return this._size === 0;
    },
    add: function add(x) {
      this._items.add(null);

      this._size += 1;
      var hole = this._size;

      this._items.set(0, x);

      for (; x.compareTo(this._items.get(Math.trunc(hole / 2))) < 0; hole /= 2) {
        this._items.set(hole, this._items.get(Math.trunc(hole / 2)));
      }

      this._items.set(hole, x);
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return PriorityQueue;
    }
  });

  function AbstractNode() {
    this._childBoundables = new ArrayList();
    this._bounds = null;
    this._level = null;

    if (arguments.length === 0) ; else if (arguments.length === 1) {
      var level = arguments[0];
      this._level = level;
    }
  }
  extend(AbstractNode.prototype, {
    getLevel: function getLevel() {
      return this._level;
    },
    size: function size() {
      return this._childBoundables.size();
    },
    getChildBoundables: function getChildBoundables() {
      return this._childBoundables;
    },
    addChildBoundable: function addChildBoundable(childBoundable) {
      Assert.isTrue(this._bounds === null);

      this._childBoundables.add(childBoundable);
    },
    isEmpty: function isEmpty() {
      return this._childBoundables.isEmpty();
    },
    getBounds: function getBounds() {
      if (this._bounds === null) {
        this._bounds = this.computeBounds();
      }

      return this._bounds;
    },
    interfaces_: function interfaces_() {
      return [Boundable, Serializable];
    },
    getClass: function getClass() {
      return AbstractNode;
    }
  });
  AbstractNode.serialVersionUID = 6493722185909573708;

  function BoundablePair() {
    this._boundable1 = null;
    this._boundable2 = null;
    this._distance = null;
    this._itemDistance = null;
    var boundable1 = arguments[0],
        boundable2 = arguments[1],
        itemDistance = arguments[2];
    this._boundable1 = boundable1;
    this._boundable2 = boundable2;
    this._itemDistance = itemDistance;
    this._distance = this.distance();
  }
  extend(BoundablePair.prototype, {
    expandToQueue: function expandToQueue(priQ, minDistance) {
      var isComp1 = BoundablePair.isComposite(this._boundable1);
      var isComp2 = BoundablePair.isComposite(this._boundable2);

      if (isComp1 && isComp2) {
        if (BoundablePair.area(this._boundable1) > BoundablePair.area(this._boundable2)) {
          this.expand(this._boundable1, this._boundable2, priQ, minDistance);
          return null;
        } else {
          this.expand(this._boundable2, this._boundable1, priQ, minDistance);
          return null;
        }
      } else if (isComp1) {
        this.expand(this._boundable1, this._boundable2, priQ, minDistance);
        return null;
      } else if (isComp2) {
        this.expand(this._boundable2, this._boundable1, priQ, minDistance);
        return null;
      }

      throw new IllegalArgumentException("neither boundable is composite");
    },
    isLeaves: function isLeaves() {
      return !(BoundablePair.isComposite(this._boundable1) || BoundablePair.isComposite(this._boundable2));
    },
    compareTo: function compareTo(o) {
      var nd = o;
      if (this._distance < nd._distance) return -1;
      if (this._distance > nd._distance) return 1;
      return 0;
    },
    expand: function expand(bndComposite, bndOther, priQ, minDistance) {
      var children = bndComposite.getChildBoundables();

      for (var i = children.iterator(); i.hasNext();) {
        var child = i.next();
        var bp = new BoundablePair(child, bndOther, this._itemDistance);

        if (bp.getDistance() < minDistance) {
          priQ.add(bp);
        }
      }
    },
    getBoundable: function getBoundable(i) {
      if (i === 0) return this._boundable1;
      return this._boundable2;
    },
    getDistance: function getDistance() {
      return this._distance;
    },
    distance: function distance() {
      if (this.isLeaves()) {
        return this._itemDistance.distance(this._boundable1, this._boundable2);
      }

      return this._boundable1.getBounds().distance(this._boundable2.getBounds());
    },
    interfaces_: function interfaces_() {
      return [Comparable];
    },
    getClass: function getClass() {
      return BoundablePair;
    }
  });

  BoundablePair.area = function (b) {
    return b.getBounds().getArea();
  };

  BoundablePair.isComposite = function (item) {
    return item instanceof AbstractNode;
  };

  function AbstractSTRtree() {
    this._root = null;
    this._built = false;
    this._itemBoundables = new ArrayList();
    this._nodeCapacity = null;

    if (arguments.length === 0) {
      AbstractSTRtree.call(this, AbstractSTRtree.DEFAULT_NODE_CAPACITY);
    } else if (arguments.length === 1) {
      var nodeCapacity = arguments[0];
      Assert.isTrue(nodeCapacity > 1, "Node capacity must be greater than 1");
      this._nodeCapacity = nodeCapacity;
    }
  }
  extend(AbstractSTRtree.prototype, {
    queryInternal: function queryInternal() {
      if (hasInterface(arguments[2], ItemVisitor) && arguments[0] instanceof Object && arguments[1] instanceof AbstractNode) {
        var searchBounds = arguments[0],
            node = arguments[1],
            visitor = arguments[2];
        var childBoundables = node.getChildBoundables();

        for (var i = 0; i < childBoundables.size(); i++) {
          var childBoundable = childBoundables.get(i);

          if (!this.getIntersectsOp().intersects(childBoundable.getBounds(), searchBounds)) {
            continue;
          }

          if (childBoundable instanceof AbstractNode) {
            this.queryInternal(searchBounds, childBoundable, visitor);
          } else if (childBoundable instanceof ItemBoundable) {
            visitor.visitItem(childBoundable.getItem());
          } else {
            Assert.shouldNeverReachHere();
          }
        }
      } else if (hasInterface(arguments[2], List) && arguments[0] instanceof Object && arguments[1] instanceof AbstractNode) {
        var _searchBounds = arguments[0],
            _node = arguments[1],
            matches = arguments[2];

        var childBoundables = _node.getChildBoundables();

        for (var i = 0; i < childBoundables.size(); i++) {
          var childBoundable = childBoundables.get(i);

          if (!this.getIntersectsOp().intersects(childBoundable.getBounds(), _searchBounds)) {
            continue;
          }

          if (childBoundable instanceof AbstractNode) {
            this.queryInternal(_searchBounds, childBoundable, matches);
          } else if (childBoundable instanceof ItemBoundable) {
            matches.add(childBoundable.getItem());
          } else {
            Assert.shouldNeverReachHere();
          }
        }
      }
    },
    getNodeCapacity: function getNodeCapacity() {
      return this._nodeCapacity;
    },
    lastNode: function lastNode(nodes) {
      return nodes.get(nodes.size() - 1);
    },
    size: function size() {
      if (arguments.length === 0) {
        if (this.isEmpty()) {
          return 0;
        }

        this.build();
        return this.size(this._root);
      } else if (arguments.length === 1) {
        var node = arguments[0];
        var size = 0;

        for (var i = node.getChildBoundables().iterator(); i.hasNext();) {
          var childBoundable = i.next();

          if (childBoundable instanceof AbstractNode) {
            size += this.size(childBoundable);
          } else if (childBoundable instanceof ItemBoundable) {
            size += 1;
          }
        }

        return size;
      }
    },
    removeItem: function removeItem(node, item) {
      var childToRemove = null;

      for (var i = node.getChildBoundables().iterator(); i.hasNext();) {
        var childBoundable = i.next();

        if (childBoundable instanceof ItemBoundable) {
          if (childBoundable.getItem() === item) childToRemove = childBoundable;
        }
      }

      if (childToRemove !== null) {
        node.getChildBoundables().remove(childToRemove);
        return true;
      }

      return false;
    },
    itemsTree: function itemsTree() {
      if (arguments.length === 0) {
        this.build();
        var valuesTree = this.itemsTree(this._root);
        if (valuesTree === null) return new ArrayList();
        return valuesTree;
      } else if (arguments.length === 1) {
        var node = arguments[0];
        var valuesTreeForNode = new ArrayList();

        for (var i = node.getChildBoundables().iterator(); i.hasNext();) {
          var childBoundable = i.next();

          if (childBoundable instanceof AbstractNode) {
            var valuesTreeForChild = this.itemsTree(childBoundable);
            if (valuesTreeForChild !== null) valuesTreeForNode.add(valuesTreeForChild);
          } else if (childBoundable instanceof ItemBoundable) {
            valuesTreeForNode.add(childBoundable.getItem());
          } else {
            Assert.shouldNeverReachHere();
          }
        }

        if (valuesTreeForNode.size() <= 0) return null;
        return valuesTreeForNode;
      }
    },
    insert: function insert(bounds, item) {
      Assert.isTrue(!this._built, "Cannot insert items into an STR packed R-tree after it has been built.");

      this._itemBoundables.add(new ItemBoundable(bounds, item));
    },
    boundablesAtLevel: function boundablesAtLevel() {
      if (arguments.length === 1) {
        var level = arguments[0];
        var boundables = new ArrayList();
        this.boundablesAtLevel(level, this._root, boundables);
        return boundables;
      } else if (arguments.length === 3) {
        var _level = arguments[0],
            top = arguments[1],
            _boundables = arguments[2];
        Assert.isTrue(_level > -2);

        if (top.getLevel() === _level) {
          _boundables.add(top);

          return null;
        }

        for (var i = top.getChildBoundables().iterator(); i.hasNext();) {
          var boundable = i.next();

          if (boundable instanceof AbstractNode) {
            this.boundablesAtLevel(_level, boundable, _boundables);
          } else {
            Assert.isTrue(boundable instanceof ItemBoundable);

            if (_level === -1) {
              _boundables.add(boundable);
            }
          }
        }

        return null;
      }
    },
    query: function query() {
      if (arguments.length === 1) {
        var searchBounds = arguments[0];
        this.build();
        var matches = new ArrayList();

        if (this.isEmpty()) {
          return matches;
        }

        if (this.getIntersectsOp().intersects(this._root.getBounds(), searchBounds)) {
          this.queryInternal(searchBounds, this._root, matches);
        }

        return matches;
      } else if (arguments.length === 2) {
        var _searchBounds2 = arguments[0],
            visitor = arguments[1];
        this.build();

        if (this.isEmpty()) {
          return null;
        }

        if (this.getIntersectsOp().intersects(this._root.getBounds(), _searchBounds2)) {
          this.queryInternal(_searchBounds2, this._root, visitor);
        }
      }
    },
    build: function build() {
      if (this._built) return null;
      this._root = this._itemBoundables.isEmpty() ? this.createNode(0) : this.createHigherLevels(this._itemBoundables, -1);
      this._itemBoundables = null;
      this._built = true;
    },
    getRoot: function getRoot() {
      this.build();
      return this._root;
    },
    remove: function remove() {
      if (arguments.length === 2) {
        var searchBounds = arguments[0],
            item = arguments[1];
        this.build();

        if (this.getIntersectsOp().intersects(this._root.getBounds(), searchBounds)) {
          return this.remove(searchBounds, this._root, item);
        }

        return false;
      } else if (arguments.length === 3) {
        var _searchBounds3 = arguments[0],
            node = arguments[1],
            _item = arguments[2];
        var found = this.removeItem(node, _item);
        if (found) return true;
        var childToPrune = null;

        for (var i = node.getChildBoundables().iterator(); i.hasNext();) {
          var childBoundable = i.next();

          if (!this.getIntersectsOp().intersects(childBoundable.getBounds(), _searchBounds3)) {
            continue;
          }

          if (childBoundable instanceof AbstractNode) {
            found = this.remove(_searchBounds3, childBoundable, _item);

            if (found) {
              childToPrune = childBoundable;
              break;
            }
          }
        }

        if (childToPrune !== null) {
          if (childToPrune.getChildBoundables().isEmpty()) {
            node.getChildBoundables().remove(childToPrune);
          }
        }

        return found;
      }
    },
    createHigherLevels: function createHigherLevels(boundablesOfALevel, level) {
      Assert.isTrue(!boundablesOfALevel.isEmpty());
      var parentBoundables = this.createParentBoundables(boundablesOfALevel, level + 1);

      if (parentBoundables.size() === 1) {
        return parentBoundables.get(0);
      }

      return this.createHigherLevels(parentBoundables, level + 1);
    },
    depth: function depth() {
      if (arguments.length === 0) {
        if (this.isEmpty()) {
          return 0;
        }

        this.build();
        return this.depth(this._root);
      } else if (arguments.length === 1) {
        var node = arguments[0];
        var maxChildDepth = 0;

        for (var i = node.getChildBoundables().iterator(); i.hasNext();) {
          var childBoundable = i.next();

          if (childBoundable instanceof AbstractNode) {
            var childDepth = this.depth(childBoundable);
            if (childDepth > maxChildDepth) maxChildDepth = childDepth;
          }
        }

        return maxChildDepth + 1;
      }
    },
    createParentBoundables: function createParentBoundables(childBoundables, newLevel) {
      Assert.isTrue(!childBoundables.isEmpty());
      var parentBoundables = new ArrayList();
      parentBoundables.add(this.createNode(newLevel));
      var sortedChildBoundables = new ArrayList(childBoundables);
      Collections.sort(sortedChildBoundables, this.getComparator());

      for (var i = sortedChildBoundables.iterator(); i.hasNext();) {
        var childBoundable = i.next();

        if (this.lastNode(parentBoundables).getChildBoundables().size() === this.getNodeCapacity()) {
          parentBoundables.add(this.createNode(newLevel));
        }

        this.lastNode(parentBoundables).addChildBoundable(childBoundable);
      }

      return parentBoundables;
    },
    isEmpty: function isEmpty() {
      if (!this._built) return this._itemBoundables.isEmpty();
      return this._root.isEmpty();
    },
    interfaces_: function interfaces_() {
      return [Serializable];
    },
    getClass: function getClass() {
      return AbstractSTRtree;
    }
  });

  AbstractSTRtree.compareDoubles = function (a, b) {
    return a > b ? 1 : a < b ? -1 : 0;
  };

  function IntersectsOp$1() {}

  AbstractSTRtree.IntersectsOp = IntersectsOp$1;
  AbstractSTRtree.serialVersionUID = -3886435814360241337;
  AbstractSTRtree.DEFAULT_NODE_CAPACITY = 10;

  function ItemDistance() {}
  extend(ItemDistance.prototype, {
    distance: function distance(item1, item2) {},
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return ItemDistance;
    }
  });

  function STRtree() {
    if (arguments.length === 0) {
      STRtree.call(this, STRtree.DEFAULT_NODE_CAPACITY);
    } else if (arguments.length === 1) {
      var nodeCapacity = arguments[0];
      AbstractSTRtree.call(this, nodeCapacity);
    }
  }
  inherits(STRtree, AbstractSTRtree);
  extend(STRtree.prototype, {
    createParentBoundablesFromVerticalSlices: function createParentBoundablesFromVerticalSlices(verticalSlices, newLevel) {
      Assert.isTrue(verticalSlices.length > 0);
      var parentBoundables = new ArrayList();

      for (var i = 0; i < verticalSlices.length; i++) {
        parentBoundables.addAll(this.createParentBoundablesFromVerticalSlice(verticalSlices[i], newLevel));
      }

      return parentBoundables;
    },
    createNode: function createNode(level) {
      return new STRtreeNode(level);
    },
    size: function size() {
      if (arguments.length === 0) {
        return AbstractSTRtree.prototype.size.call(this);
      } else return AbstractSTRtree.prototype.size.apply(this, arguments);
    },
    insert: function insert() {
      if (arguments.length === 2 && arguments[1] instanceof Object && arguments[0] instanceof Envelope) {
        var itemEnv = arguments[0],
            item = arguments[1];

        if (itemEnv.isNull()) {
          return null;
        }

        AbstractSTRtree.prototype.insert.call(this, itemEnv, item);
      } else return AbstractSTRtree.prototype.insert.apply(this, arguments);
    },
    getIntersectsOp: function getIntersectsOp() {
      return STRtree.intersectsOp;
    },
    verticalSlices: function verticalSlices(childBoundables, sliceCount) {
      var sliceCapacity = Math.trunc(Math.ceil(childBoundables.size() / sliceCount));
      var slices = new Array(sliceCount).fill(null);
      var i = childBoundables.iterator();

      for (var j = 0; j < sliceCount; j++) {
        slices[j] = new ArrayList();
        var boundablesAddedToSlice = 0;

        while (i.hasNext() && boundablesAddedToSlice < sliceCapacity) {
          var childBoundable = i.next();
          slices[j].add(childBoundable);
          boundablesAddedToSlice++;
        }
      }

      return slices;
    },
    query: function query() {
      if (arguments.length === 1) {
        var searchEnv = arguments[0];
        return AbstractSTRtree.prototype.query.call(this, searchEnv);
      } else if (arguments.length === 2) {
        var _searchEnv = arguments[0],
            visitor = arguments[1];
        AbstractSTRtree.prototype.query.call(this, _searchEnv, visitor);
      }
    },
    getComparator: function getComparator() {
      return STRtree.yComparator;
    },
    createParentBoundablesFromVerticalSlice: function createParentBoundablesFromVerticalSlice(childBoundables, newLevel) {
      return AbstractSTRtree.prototype.createParentBoundables.call(this, childBoundables, newLevel);
    },
    remove: function remove() {
      if (arguments.length === 2 && arguments[1] instanceof Object && arguments[0] instanceof Envelope) {
        var itemEnv = arguments[0],
            item = arguments[1];
        return AbstractSTRtree.prototype.remove.call(this, itemEnv, item);
      } else return AbstractSTRtree.prototype.remove.apply(this, arguments);
    },
    depth: function depth() {
      if (arguments.length === 0) {
        return AbstractSTRtree.prototype.depth.call(this);
      } else return AbstractSTRtree.prototype.depth.apply(this, arguments);
    },
    createParentBoundables: function createParentBoundables(childBoundables, newLevel) {
      Assert.isTrue(!childBoundables.isEmpty());
      var minLeafCount = Math.trunc(Math.ceil(childBoundables.size() / this.getNodeCapacity()));
      var sortedChildBoundables = new ArrayList(childBoundables);
      Collections.sort(sortedChildBoundables, STRtree.xComparator);
      var verticalSlices = this.verticalSlices(sortedChildBoundables, Math.trunc(Math.ceil(Math.sqrt(minLeafCount))));
      return this.createParentBoundablesFromVerticalSlices(verticalSlices, newLevel);
    },
    nearestNeighbour: function nearestNeighbour() {
      if (arguments.length === 1) {
        if (hasInterface(arguments[0], ItemDistance)) {
          var itemDist = arguments[0];
          var bp = new BoundablePair(this.getRoot(), this.getRoot(), itemDist);
          return this.nearestNeighbour(bp);
        } else if (arguments[0] instanceof BoundablePair) {
          var initBndPair = arguments[0];
          return this.nearestNeighbour(initBndPair, Double.POSITIVE_INFINITY);
        }
      } else if (arguments.length === 2) {
        if (arguments[0] instanceof STRtree && hasInterface(arguments[1], ItemDistance)) {
          var tree = arguments[0],
              _itemDist = arguments[1];
          var bp = new BoundablePair(this.getRoot(), tree.getRoot(), _itemDist);
          return this.nearestNeighbour(bp);
        } else if (arguments[0] instanceof BoundablePair && typeof arguments[1] === "number") {
          var _initBndPair = arguments[0],
              maxDistance = arguments[1];
          var distanceLowerBound = maxDistance;
          var minPair = null;
          var priQ = new PriorityQueue();
          priQ.add(_initBndPair);

          while (!priQ.isEmpty() && distanceLowerBound > 0.0) {
            var bndPair = priQ.poll();
            var currentDistance = bndPair.getDistance();
            if (currentDistance >= distanceLowerBound) break;

            if (bndPair.isLeaves()) {
              distanceLowerBound = currentDistance;
              minPair = bndPair;
            } else {
              bndPair.expandToQueue(priQ, distanceLowerBound);
            }
          }

          return [minPair.getBoundable(0).getItem(), minPair.getBoundable(1).getItem()];
        } else if (arguments[0] instanceof BoundablePair && Number.isInteger(arguments[1])) {
          var _initBndPair2 = arguments[0],
              k = arguments[1];
          return this.nearestNeighbour(_initBndPair2, Double.POSITIVE_INFINITY, k);
        }
      } else if (arguments.length === 3) {
        if (hasInterface(arguments[2], ItemDistance) && arguments[0] instanceof Envelope && arguments[1] instanceof Object) {
          var env = arguments[0],
              item = arguments[1],
              _itemDist2 = arguments[2];
          var bnd = new ItemBoundable(env, item);
          var bp = new BoundablePair(this.getRoot(), bnd, _itemDist2);
          return this.nearestNeighbour(bp)[0];
        } else if (Number.isInteger(arguments[2]) && arguments[0] instanceof BoundablePair && typeof arguments[1] === "number") {
          var _initBndPair3 = arguments[0],
              _maxDistance = arguments[1],
              _k = arguments[2];
          var distanceLowerBound = _maxDistance;
          var priQ = new PriorityQueue();
          priQ.add(_initBndPair3);
          var kNearestNeighbors = new PriorityQueue();

          while (!priQ.isEmpty() && distanceLowerBound >= 0.0) {
            var bndPair = priQ.poll();
            var currentDistance = bndPair.getDistance();

            if (currentDistance >= distanceLowerBound) {
              break;
            }

            if (bndPair.isLeaves()) {
              if (kNearestNeighbors.size() < _k) {
                kNearestNeighbors.add(bndPair);
              } else {
                var bp1 = kNearestNeighbors.peek();

                if (bp1.getDistance() > currentDistance) {
                  kNearestNeighbors.poll();
                  kNearestNeighbors.add(bndPair);
                }

                var bp2 = kNearestNeighbors.peek();
                distanceLowerBound = bp2.getDistance();
              }
            } else {
              bndPair.expandToQueue(priQ, distanceLowerBound);
            }
          }

          return STRtree.getItems(kNearestNeighbors);
        }
      } else if (arguments.length === 4) {
        var _env = arguments[0],
            _item = arguments[1],
            _itemDist3 = arguments[2],
            _k2 = arguments[3];
        var bnd = new ItemBoundable(_env, _item);
        var bp = new BoundablePair(this.getRoot(), bnd, _itemDist3);
        return this.nearestNeighbour(bp, _k2);
      }
    },
    interfaces_: function interfaces_() {
      return [SpatialIndex, Serializable];
    },
    getClass: function getClass() {
      return STRtree;
    }
  });

  STRtree.centreX = function (e) {
    return STRtree.avg(e.getMinX(), e.getMaxX());
  };

  STRtree.avg = function (a, b) {
    return (a + b) / 2;
  };

  STRtree.getItems = function (kNearestNeighbors) {
    var items = new Array(kNearestNeighbors.size()).fill(null);
    var count = 0;

    while (!kNearestNeighbors.isEmpty()) {
      var bp = kNearestNeighbors.poll();
      items[count] = bp.getBoundable(0).getItem();
      count++;
    }

    return items;
  };

  STRtree.centreY = function (e) {
    return STRtree.avg(e.getMinY(), e.getMaxY());
  };

  function STRtreeNode() {
    var level = arguments[0];
    AbstractNode.call(this, level);
  }

  inherits(STRtreeNode, AbstractNode);
  extend(STRtreeNode.prototype, {
    computeBounds: function computeBounds() {
      var bounds = null;

      for (var i = this.getChildBoundables().iterator(); i.hasNext();) {
        var childBoundable = i.next();

        if (bounds === null) {
          bounds = new Envelope(childBoundable.getBounds());
        } else {
          bounds.expandToInclude(childBoundable.getBounds());
        }
      }

      return bounds;
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return STRtreeNode;
    }
  });
  STRtree.STRtreeNode = STRtreeNode;
  STRtree.serialVersionUID = 259274702368956900;
  STRtree.xComparator = {
    interfaces_: function interfaces_() {
      return [Comparator];
    },
    compare: function compare(o1, o2) {
      return AbstractSTRtree.compareDoubles(STRtree.centreX(o1.getBounds()), STRtree.centreX(o2.getBounds()));
    }
  };
  STRtree.yComparator = {
    interfaces_: function interfaces_() {
      return [Comparator];
    },
    compare: function compare(o1, o2) {
      return AbstractSTRtree.compareDoubles(STRtree.centreY(o1.getBounds()), STRtree.centreY(o2.getBounds()));
    }
  };
  STRtree.intersectsOp = {
    interfaces_: function interfaces_() {
      return [IntersectsOp];
    },
    intersects: function intersects(aBounds, bBounds) {
      return aBounds.intersects(bBounds);
    }
  };
  STRtree.DEFAULT_NODE_CAPACITY = 10;



  var strtree = /*#__PURE__*/Object.freeze({
    STRtree: STRtree
  });



  var index = /*#__PURE__*/Object.freeze({
    kdtree: kdtree,
    quadtree: quadtree,
    strtree: strtree
  });

  var geometryTypes = ['Point', 'MultiPoint', 'LineString', 'MultiLineString', 'Polygon', 'MultiPolygon'];
  /**
   * Class for reading and writing Well-Known Text.Create a new parser for GeoJSON
   * NOTE: Adapted from OpenLayers 2.11 implementation.
   */

  /**
   * Create a new parser for GeoJSON
   *
   * @param {GeometryFactory} geometryFactory
   * @return An instance of GeoJsonParser.
   * @constructor
   * @private
   */

  function GeoJSONParser(geometryFactory) {
    this.geometryFactory = geometryFactory || new GeometryFactory();
  }
  extend(GeoJSONParser.prototype, {
    /**
     * Deserialize a GeoJSON object and return the Geometry or Feature(Collection) with JSTS Geometries
     *
     * @param {}
     *          A GeoJSON object.
     * @return {} A Geometry instance or object representing a Feature(Collection) with Geometry instances.
     * @private
     */
    read: function read(json) {
      var obj;
      if (typeof json === 'string') obj = JSON.parse(json);else obj = json;
      var type = obj.type;
      if (!parse$1[type]) throw new Error('Unknown GeoJSON type: ' + obj.type);
      if (geometryTypes.indexOf(type) !== -1) return parse$1[type].call(this, obj.coordinates);else if (type === 'GeometryCollection') return parse$1[type].call(this, obj.geometries); // feature or feature collection

      return parse$1[type].call(this, obj);
    },

    /**
     * Serialize a Geometry object into GeoJSON
     *
     * @param {Geometry}
     *          geometry A Geometry or array of Geometries.
     * @return {Object} A GeoJSON object represting the input Geometry/Geometries.
     * @private
     */
    write: function write(geometry) {
      var type = geometry.getGeometryType();
      if (!extract$1[type]) throw new Error('Geometry is not supported');
      return extract$1[type].call(this, geometry);
    }
  });
  var parse$1 = {
    /**
     * Parse a GeoJSON Feature object
     *
     * @param {Object}
     *          obj Object to parse.
     *
     * @return {Object} Feature with geometry/bbox converted to JSTS Geometries.
     */
    Feature: function Feature(obj) {
      var feature = {};

      for (var key in obj) {
        feature[key] = obj[key];
      }

      if (obj.geometry) {
        var type = obj.geometry.type;
        if (!parse$1[type]) throw new Error('Unknown GeoJSON type: ' + obj.type);
        feature.geometry = this.read(obj.geometry);
      }

      if (obj.bbox) feature.bbox = parse$1.bbox.call(this, obj.bbox);
      return feature;
    },

    /**
     * Parse a GeoJSON FeatureCollection object
     *
     * @param {Object}
     *          obj Object to parse.
     *
     * @return {Object} FeatureCollection with geometry/bbox converted to JSTS Geometries.
     */
    FeatureCollection: function FeatureCollection(obj) {
      var featureCollection = {};

      if (obj.features) {
        featureCollection.features = [];

        for (var i = 0; i < obj.features.length; ++i) {
          featureCollection.features.push(this.read(obj.features[i]));
        }
      }

      if (obj.bbox) featureCollection.bbox = this.parse.bbox.call(this, obj.bbox);
      return featureCollection;
    },

    /**
     * Convert the ordinates in an array to an array of Coordinates
     *
     * @param {Array}
     *          array Array with {Number}s.
     *
     * @return {Array} Array with Coordinates.
     */
    coordinates: function coordinates(array) {
      var coordinates = [];

      for (var i = 0; i < array.length; ++i) {
        var sub = array[i];
        coordinates.push(new Coordinate(sub[0], sub[1]));
      }

      return coordinates;
    },

    /**
     * Convert the bbox to a LinearRing
     *
     * @param {Array}
     *          array Array with [xMin, yMin, xMax, yMax].
     *
     * @return {Array} Array with Coordinates.
     */
    bbox: function bbox(array) {
      return this.geometryFactory.createLinearRing([new Coordinate(array[0], array[1]), new Coordinate(array[2], array[1]), new Coordinate(array[2], array[3]), new Coordinate(array[0], array[3]), new Coordinate(array[0], array[1])]);
    },

    /**
     * Convert an Array with ordinates to a Point
     *
     * @param {Array}
     *          array Array with ordinates.
     *
     * @return {Point} Point.
     */
    Point: function Point(array) {
      var coordinate = new Coordinate(array[0], array[1]);
      return this.geometryFactory.createPoint(coordinate);
    },

    /**
     * Convert an Array with coordinates to a MultiPoint
     *
     * @param {Array}
     *          array Array with coordinates.
     *
     * @return {MultiPoint} MultiPoint.
     */
    MultiPoint: function MultiPoint(array) {
      var points = [];

      for (var i = 0; i < array.length; ++i) {
        points.push(parse$1.Point.call(this, array[i]));
      }

      return this.geometryFactory.createMultiPoint(points);
    },

    /**
     * Convert an Array with coordinates to a LineString
     *
     * @param {Array}
     *          array Array with coordinates.
     *
     * @return {LineString} LineString.
     */
    LineString: function LineString(array) {
      var coordinates = parse$1.coordinates.call(this, array);
      return this.geometryFactory.createLineString(coordinates);
    },

    /**
     * Convert an Array with coordinates to a MultiLineString
     *
     * @param {Array}
     *          array Array with coordinates.
     *
     * @return {MultiLineString} MultiLineString.
     */
    MultiLineString: function MultiLineString(array) {
      var lineStrings = [];

      for (var i = 0; i < array.length; ++i) {
        lineStrings.push(parse$1.LineString.call(this, array[i]));
      }

      return this.geometryFactory.createMultiLineString(lineStrings);
    },

    /**
     * Convert an Array to a Polygon
     *
     * @param {Array}
     *          array Array with shell and holes.
     *
     * @return {Polygon} Polygon.
     */
    Polygon: function Polygon(array) {
      var shellCoordinates = parse$1.coordinates.call(this, array[0]);
      var shell = this.geometryFactory.createLinearRing(shellCoordinates);
      var holes = [];

      for (var i = 1; i < array.length; ++i) {
        var hole = array[i];
        var coordinates = parse$1.coordinates.call(this, hole);
        var linearRing = this.geometryFactory.createLinearRing(coordinates);
        holes.push(linearRing);
      }

      return this.geometryFactory.createPolygon(shell, holes);
    },

    /**
     * Convert an Array to a MultiPolygon
     *
     * @param {Array}
     *          array Array of arrays with shell and rings.
     *
     * @return {MultiPolygon} MultiPolygon.
     */
    MultiPolygon: function MultiPolygon(array) {
      var polygons = [];

      for (var i = 0; i < array.length; ++i) {
        var polygon = array[i];
        polygons.push(parse$1.Polygon.call(this, polygon));
      }

      return this.geometryFactory.createMultiPolygon(polygons);
    },

    /**
     * Convert an Array to a GeometryCollection
     *
     * @param {Array}
     *          array Array of GeoJSON geometries.
     *
     * @return {GeometryCollection} GeometryCollection.
     */
    GeometryCollection: function GeometryCollection(array) {
      var geometries = [];

      for (var i = 0; i < array.length; ++i) {
        var geometry = array[i];
        geometries.push(this.read(geometry));
      }

      return this.geometryFactory.createGeometryCollection(geometries);
    }
  };
  var extract$1 = {
    /**
     * Convert a Coordinate to an Array
     *
     * @param {Coordinate}
     *          coordinate Coordinate to convert.
     *
     * @return {Array} Array of ordinates.
     */
    coordinate: function coordinate(_coordinate) {
      return [_coordinate.x, _coordinate.y];
    },

    /**
     * Convert a Point to a GeoJSON object
     *
     * @param {Point}
     *          point Point to convert.
     *
     * @return {Array} Array of 2 ordinates (paired to a coordinate).
     */
    Point: function Point(point) {
      var array = extract$1.coordinate.call(this, point.getCoordinate());
      return {
        type: 'Point',
        coordinates: array
      };
    },

    /**
     * Convert a MultiPoint to a GeoJSON object
     *
     * @param {MultiPoint}
     *          multipoint MultiPoint to convert.
     *
     * @return {Array} Array of coordinates.
     */
    MultiPoint: function MultiPoint(multipoint) {
      var array = [];

      for (var i = 0; i < multipoint._geometries.length; ++i) {
        var point = multipoint._geometries[i];
        var geoJson = extract$1.Point.call(this, point);
        array.push(geoJson.coordinates);
      }

      return {
        type: 'MultiPoint',
        coordinates: array
      };
    },

    /**
     * Convert a LineString to a GeoJSON object
     *
     * @param {LineString}
     *          linestring LineString to convert.
     *
     * @return {Array} Array of coordinates.
     */
    LineString: function LineString(linestring) {
      var array = [];
      var coordinates = linestring.getCoordinates();

      for (var i = 0; i < coordinates.length; ++i) {
        var coordinate = coordinates[i];
        array.push(extract$1.coordinate.call(this, coordinate));
      }

      return {
        type: 'LineString',
        coordinates: array
      };
    },

    /**
     * Convert a MultiLineString to a GeoJSON object
     *
     * @param {MultiLineString}
     *          multilinestring MultiLineString to convert.
     *
     * @return {Array} Array of Array of coordinates.
     */
    MultiLineString: function MultiLineString(multilinestring) {
      var array = [];

      for (var i = 0; i < multilinestring._geometries.length; ++i) {
        var linestring = multilinestring._geometries[i];
        var geoJson = extract$1.LineString.call(this, linestring);
        array.push(geoJson.coordinates);
      }

      return {
        type: 'MultiLineString',
        coordinates: array
      };
    },

    /**
     * Convert a Polygon to a GeoJSON object
     *
     * @param {Polygon}
     *          polygon Polygon to convert.
     *
     * @return {Array} Array with shell, holes.
     */
    Polygon: function Polygon(polygon) {
      var array = [];
      var shellGeoJson = extract$1.LineString.call(this, polygon._shell);
      array.push(shellGeoJson.coordinates);

      for (var i = 0; i < polygon._holes.length; ++i) {
        var hole = polygon._holes[i];
        var holeGeoJson = extract$1.LineString.call(this, hole);
        array.push(holeGeoJson.coordinates);
      }

      return {
        type: 'Polygon',
        coordinates: array
      };
    },

    /**
     * Convert a MultiPolygon to a GeoJSON object
     *
     * @param {MultiPolygon}
     *          multipolygon MultiPolygon to convert.
     *
     * @return {Array} Array of polygons.
     */
    MultiPolygon: function MultiPolygon(multipolygon) {
      var array = [];

      for (var i = 0; i < multipolygon._geometries.length; ++i) {
        var polygon = multipolygon._geometries[i];
        var geoJson = extract$1.Polygon.call(this, polygon);
        array.push(geoJson.coordinates);
      }

      return {
        type: 'MultiPolygon',
        coordinates: array
      };
    },

    /**
     * Convert a GeometryCollection to a GeoJSON object
     *
     * @param {GeometryCollection}
     *          collection GeometryCollection to convert.
     *
     * @return {Array} Array of geometries.
     */
    GeometryCollection: function GeometryCollection(collection) {
      var array = [];

      for (var i = 0; i < collection._geometries.length; ++i) {
        var geometry = collection._geometries[i];
        var type = geometry.getGeometryType();
        array.push(extract$1[type].call(this, geometry));
      }

      return {
        type: 'GeometryCollection',
        geometries: array
      };
    }
  };

  /**
   * @module org/locationtech/jts/io/GeoJSONReader
   */
  /**
   * Converts a geometry in GeoJSON to a {@link Geometry}.
   */

  /**
   * A <code>GeoJSONReader</code> is parameterized by a <code>GeometryFactory</code>,
   * to allow it to create <code>Geometry</code> objects of the appropriate
   * implementation. In particular, the <code>GeometryFactory</code> determines
   * the <code>PrecisionModel</code> and <code>SRID</code> that is used.
   *
   * @param {GeometryFactory} geometryFactory
   * @constructor
   */

  function GeoJSONReader(geometryFactory) {
    this.parser = new GeoJSONParser(geometryFactory || new GeometryFactory());
  }
  extend(GeoJSONReader.prototype, {
    /**
     * Reads a GeoJSON representation of a {@link Geometry}
     *
     * Will also parse GeoJSON Features/FeatureCollections as custom objects.
     *
     * @param {Object|String} geoJson a GeoJSON Object or String.
     * @return {Geometry|Object} a <code>Geometry or Feature/FeatureCollection representation.</code>
     * @memberof module:org/locationtech/jts/io/GeoJSONReader#
     */
    read: function read(geoJson) {
      var geometry = this.parser.read(geoJson);
      return geometry;
    }
  });

  /**
   * @module org/locationtech/jts/io/GeoJSONWriter
   */
  /**
   * Writes the GeoJSON representation of a {@link Geometry}. The
   * The GeoJSON format is defined <A
   * HREF="http://geojson.org/geojson-spec.html">here</A>.
   */

  /**
   * The <code>GeoJSONWriter</code> outputs coordinates rounded to the precision
   * model. Only the maximum number of decimal places necessary to represent the
   * ordinates to the required precision will be output.
   *
   * @param {GeometryFactory} geometryFactory
   * @constructor
   */

  function GeoJSONWriter() {
    this.parser = new GeoJSONParser(this.geometryFactory);
  }
  extend(GeoJSONWriter.prototype, {
    /**
     * Converts a <code>Geometry</code> to its GeoJSON representation.
     *
     * @param {Geometry}
     *          geometry a <code>Geometry</code> to process.
     * @return {Object} The GeoJSON representation of the Geometry.
     * @memberof module:org/locationtech/jts/io/GeoJSONWriter#
     */
    write: function write(geometry) {
      return this.parser.write(geometry);
    }
  });

  /**
   * @module org/locationtech/jts/io/WKTReader
   */
  /**
   * Converts a geometry in Well-Known Text format to a {@link Geometry}.
   * <p>
   * <code>WKTReader</code> supports extracting <code>Geometry</code> objects
   * from either {@link Reader}s or {@link String}s. This allows it to function
   * as a parser to read <code>Geometry</code> objects from text blocks embedded
   * in other data formats (e.g. XML).
   */

  /**
   * A <code>WKTReader</code> is parameterized by a <code>GeometryFactory</code>,
   * to allow it to create <code>Geometry</code> objects of the appropriate
   * implementation. In particular, the <code>GeometryFactory</code> determines
   * the <code>PrecisionModel</code> and <code>SRID</code> that is used.
   * @param {GeometryFactory} geometryFactory
   * @constructor
   */

  function WKTReader(geometryFactory) {
    this.parser = new WKTParser(geometryFactory || new GeometryFactory());
  }
  extend(WKTReader.prototype, {
    /**
     * Reads a Well-Known Text representation of a {@link Geometry}
     *
     * @param {string}
     *          wkt a <Geometry Tagged Text> string (see the OpenGIS Simple Features
     *          Specification).
     * @return {Geometry} a <code>Geometry</code> read from
     *         <code>string.</code>
     * @memberof module:org/locationtech/jts/io/WKTReader#
     */
    read: function read(wkt) {
      var geometry = this.parser.read(wkt);
      return geometry;
    }
  });

  /*eslint-disable no-undef */

  function p2c(p) {
    return [p.x, p.y];
  }
  /**
   * OpenLayers Geometry parser and writer
   * @param {GeometryFactory} geometryFactory
   * @param {ol} olReference 
   * @constructor
   */


  function OL3Parser(geometryFactory, olReference) {
    this.geometryFactory = geometryFactory || new GeometryFactory();
    this.ol = olReference || typeof ol !== 'undefined' && ol;
  }
  extend(OL3Parser.prototype, {
    /**
     * Inject OpenLayers geom classes
     */
    inject: function inject(Point, LineString, LinearRing, Polygon, MultiPoint, MultiLineString, MultiPolygon, GeometryCollection) {
      this.ol = {
        geom: {
          Point: Point,
          LineString: LineString,
          LinearRing: LinearRing,
          Polygon: Polygon,
          MultiPoint: MultiPoint,
          MultiLineString: MultiLineString,
          MultiPolygon: MultiPolygon,
          GeometryCollection: GeometryCollection
        }
      };
    },

    /**
     * @param geometry {ol.geom.Geometry}
     * @return {Geometry}
     * @memberof module:org/locationtech/jts/io/OL3Parser#
     */
    read: function read(geometry) {
      var ol = this.ol;

      if (geometry instanceof ol.geom.Point) {
        return this.convertFromPoint(geometry);
      } else if (geometry instanceof ol.geom.LineString) {
        return this.convertFromLineString(geometry);
      } else if (geometry instanceof ol.geom.LinearRing) {
        return this.convertFromLinearRing(geometry);
      } else if (geometry instanceof ol.geom.Polygon) {
        return this.convertFromPolygon(geometry);
      } else if (geometry instanceof ol.geom.MultiPoint) {
        return this.convertFromMultiPoint(geometry);
      } else if (geometry instanceof ol.geom.MultiLineString) {
        return this.convertFromMultiLineString(geometry);
      } else if (geometry instanceof ol.geom.MultiPolygon) {
        return this.convertFromMultiPolygon(geometry);
      } else if (geometry instanceof ol.geom.GeometryCollection) {
        return this.convertFromCollection(geometry);
      }
    },
    convertFromPoint: function convertFromPoint(point) {
      var coordinates = point.getCoordinates();
      return this.geometryFactory.createPoint(new Coordinate(coordinates[0], coordinates[1]));
    },
    convertFromLineString: function convertFromLineString(lineString) {
      return this.geometryFactory.createLineString(lineString.getCoordinates().map(function (coordinates) {
        return new Coordinate(coordinates[0], coordinates[1]);
      }));
    },
    convertFromLinearRing: function convertFromLinearRing(linearRing) {
      return this.geometryFactory.createLinearRing(linearRing.getCoordinates().map(function (coordinates) {
        return new Coordinate(coordinates[0], coordinates[1]);
      }));
    },
    convertFromPolygon: function convertFromPolygon(polygon) {
      var linearRings = polygon.getLinearRings();
      var shell = null;
      var holes = [];

      for (var i = 0; i < linearRings.length; i++) {
        var linearRing = this.convertFromLinearRing(linearRings[i]);

        if (i === 0) {
          shell = linearRing;
        } else {
          holes.push(linearRing);
        }
      }

      return this.geometryFactory.createPolygon(shell, holes);
    },
    convertFromMultiPoint: function convertFromMultiPoint(multiPoint) {
      var points = multiPoint.getPoints().map(function (point) {
        return this.convertFromPoint(point);
      }, this);
      return this.geometryFactory.createMultiPoint(points);
    },
    convertFromMultiLineString: function convertFromMultiLineString(multiLineString) {
      var lineStrings = multiLineString.getLineStrings().map(function (lineString) {
        return this.convertFromLineString(lineString);
      }, this);
      return this.geometryFactory.createMultiLineString(lineStrings);
    },
    convertFromMultiPolygon: function convertFromMultiPolygon(multiPolygon) {
      var polygons = multiPolygon.getPolygons().map(function (polygon) {
        return this.convertFromPolygon(polygon);
      }, this);
      return this.geometryFactory.createMultiPolygon(polygons);
    },
    convertFromCollection: function convertFromCollection(collection) {
      var geometries = collection.getGeometries().map(function (geometry) {
        return this.read(geometry);
      }, this);
      return this.geometryFactory.createGeometryCollection(geometries);
    },

    /**
     * @param geometry
     *          {Geometry}
     * @return {ol.geom.Geometry}
     * @memberof module:org/locationtech/jts/io/OL3Parser#
     */
    write: function write(geometry) {
      if (geometry.getGeometryType() === 'Point') {
        return this.convertToPoint(geometry.getCoordinate());
      } else if (geometry.getGeometryType() === 'LineString') {
        return this.convertToLineString(geometry);
      } else if (geometry.getGeometryType() === 'LinearRing') {
        return this.convertToLinearRing(geometry);
      } else if (geometry.getGeometryType() === 'Polygon') {
        return this.convertToPolygon(geometry);
      } else if (geometry.getGeometryType() === 'MultiPoint') {
        return this.convertToMultiPoint(geometry);
      } else if (geometry.getGeometryType() === 'MultiLineString') {
        return this.convertToMultiLineString(geometry);
      } else if (geometry.getGeometryType() === 'MultiPolygon') {
        return this.convertToMultiPolygon(geometry);
      } else if (geometry.getGeometryType() === 'GeometryCollection') {
        return this.convertToCollection(geometry);
      }
    },
    convertToPoint: function convertToPoint(coordinate) {
      return new this.ol.geom.Point([coordinate.x, coordinate.y]);
    },
    convertToLineString: function convertToLineString(lineString) {
      var points = lineString._points._coordinates.map(p2c);

      return new this.ol.geom.LineString(points);
    },
    convertToLinearRing: function convertToLinearRing(linearRing) {
      var points = linearRing._points._coordinates.map(p2c);

      return new this.ol.geom.LinearRing(points);
    },
    convertToPolygon: function convertToPolygon(polygon) {
      var rings = [polygon._shell._points._coordinates.map(p2c)];

      for (var i = 0; i < polygon._holes.length; i++) {
        rings.push(polygon._holes[i]._points._coordinates.map(p2c));
      }

      return new this.ol.geom.Polygon(rings);
    },
    convertToMultiPoint: function convertToMultiPoint(multiPoint) {
      return new this.ol.geom.MultiPoint(multiPoint.getCoordinates().map(p2c));
    },
    convertToMultiLineString: function convertToMultiLineString(multiLineString) {
      var lineStrings = [];

      for (var i = 0; i < multiLineString._geometries.length; i++) {
        lineStrings.push(this.convertToLineString(multiLineString._geometries[i]).getCoordinates());
      }

      return new this.ol.geom.MultiLineString(lineStrings);
    },
    convertToMultiPolygon: function convertToMultiPolygon(multiPolygon) {
      var polygons = [];

      for (var i = 0; i < multiPolygon._geometries.length; i++) {
        polygons.push(this.convertToPolygon(multiPolygon._geometries[i]).getCoordinates());
      }

      return new this.ol.geom.MultiPolygon(polygons);
    },
    convertToCollection: function convertToCollection(geometryCollection) {
      var geometries = [];

      for (var i = 0; i < geometryCollection._geometries.length; i++) {
        var geometry = geometryCollection._geometries[i];
        geometries.push(this.write(geometry));
      }

      return new this.ol.geom.GeometryCollection(geometries);
    }
  });



  var io = /*#__PURE__*/Object.freeze({
    GeoJSONReader: GeoJSONReader,
    GeoJSONWriter: GeoJSONWriter,
    OL3Parser: OL3Parser,
    WKTReader: WKTReader,
    WKTWriter: WKTWriter
  });

  function SegmentPointComparator() {}
  extend(SegmentPointComparator.prototype, {
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return SegmentPointComparator;
    }
  });

  SegmentPointComparator.relativeSign = function (x0, x1) {
    if (x0 < x1) return -1;
    if (x0 > x1) return 1;
    return 0;
  };

  SegmentPointComparator.compare = function (octant, p0, p1) {
    if (p0.equals2D(p1)) return 0;
    var xSign = SegmentPointComparator.relativeSign(p0.x, p1.x);
    var ySign = SegmentPointComparator.relativeSign(p0.y, p1.y);

    switch (octant) {
      case 0:
        return SegmentPointComparator.compareValue(xSign, ySign);

      case 1:
        return SegmentPointComparator.compareValue(ySign, xSign);

      case 2:
        return SegmentPointComparator.compareValue(ySign, -xSign);

      case 3:
        return SegmentPointComparator.compareValue(-xSign, ySign);

      case 4:
        return SegmentPointComparator.compareValue(-xSign, -ySign);

      case 5:
        return SegmentPointComparator.compareValue(-ySign, -xSign);

      case 6:
        return SegmentPointComparator.compareValue(-ySign, xSign);

      case 7:
        return SegmentPointComparator.compareValue(xSign, -ySign);
    }

    Assert.shouldNeverReachHere("invalid octant value");
    return 0;
  };

  SegmentPointComparator.compareValue = function (compareSign0, compareSign1) {
    if (compareSign0 < 0) return -1;
    if (compareSign0 > 0) return 1;
    if (compareSign1 < 0) return -1;
    if (compareSign1 > 0) return 1;
    return 0;
  };

  function SegmentNode() {
    this._segString = null;
    this.coord = null;
    this.segmentIndex = null;
    this._segmentOctant = null;
    this._isInterior = null;
    var segString = arguments[0],
        coord = arguments[1],
        segmentIndex = arguments[2],
        segmentOctant = arguments[3];
    this._segString = segString;
    this.coord = new Coordinate(coord);
    this.segmentIndex = segmentIndex;
    this._segmentOctant = segmentOctant;
    this._isInterior = !coord.equals2D(segString.getCoordinate(segmentIndex));
  }
  extend(SegmentNode.prototype, {
    getCoordinate: function getCoordinate() {
      return this.coord;
    },
    print: function print(out) {
      out.print(this.coord);
      out.print(" seg # = " + this.segmentIndex);
    },
    compareTo: function compareTo(obj) {
      var other = obj;
      if (this.segmentIndex < other.segmentIndex) return -1;
      if (this.segmentIndex > other.segmentIndex) return 1;
      if (this.coord.equals2D(other.coord)) return 0;
      return SegmentPointComparator.compare(this._segmentOctant, this.coord, other.coord);
    },
    isEndPoint: function isEndPoint(maxSegmentIndex) {
      if (this.segmentIndex === 0 && !this._isInterior) return true;
      if (this.segmentIndex === maxSegmentIndex) return true;
      return false;
    },
    isInterior: function isInterior() {
      return this._isInterior;
    },
    interfaces_: function interfaces_() {
      return [Comparable];
    },
    getClass: function getClass() {
      return SegmentNode;
    }
  });

  function SegmentNodeList() {
    this._nodeMap = new TreeMap();
    this._edge = null;
    var edge = arguments[0];
    this._edge = edge;
  }
  extend(SegmentNodeList.prototype, {
    getSplitCoordinates: function getSplitCoordinates() {
      var coordList = new CoordinateList();
      this.addEndpoints();
      var it = this.iterator();
      var eiPrev = it.next();

      while (it.hasNext()) {
        var ei = it.next();
        this.addEdgeCoordinates(eiPrev, ei, coordList);
        eiPrev = ei;
      }

      return coordList.toCoordinateArray();
    },
    addCollapsedNodes: function addCollapsedNodes() {
      var collapsedVertexIndexes = new ArrayList();
      this.findCollapsesFromInsertedNodes(collapsedVertexIndexes);
      this.findCollapsesFromExistingVertices(collapsedVertexIndexes);

      for (var it = collapsedVertexIndexes.iterator(); it.hasNext();) {
        var vertexIndex = it.next().intValue();
        this.add(this._edge.getCoordinate(vertexIndex), vertexIndex);
      }
    },
    print: function print(out) {
      out.println("Intersections:");

      for (var it = this.iterator(); it.hasNext();) {
        var ei = it.next();
        ei.print(out);
      }
    },
    findCollapsesFromExistingVertices: function findCollapsesFromExistingVertices(collapsedVertexIndexes) {
      for (var i = 0; i < this._edge.size() - 2; i++) {
        var p0 = this._edge.getCoordinate(i);

        var p1 = this._edge.getCoordinate(i + 1);

        var p2 = this._edge.getCoordinate(i + 2);

        if (p0.equals2D(p2)) {
          collapsedVertexIndexes.add(new Integer(i + 1));
        }
      }
    },
    addEdgeCoordinates: function addEdgeCoordinates(ei0, ei1, coordList) {
      var npts = ei1.segmentIndex - ei0.segmentIndex + 2;

      var lastSegStartPt = this._edge.getCoordinate(ei1.segmentIndex);

      var useIntPt1 = ei1.isInterior() || !ei1.coord.equals2D(lastSegStartPt);

      if (!useIntPt1) {
        npts--;
      }
      coordList.add(new Coordinate(ei0.coord), false);

      for (var i = ei0.segmentIndex + 1; i <= ei1.segmentIndex; i++) {
        coordList.add(this._edge.getCoordinate(i));
      }

      if (useIntPt1) {
        coordList.add(new Coordinate(ei1.coord));
      }
    },
    iterator: function iterator() {
      return this._nodeMap.values().iterator();
    },
    addSplitEdges: function addSplitEdges(edgeList) {
      this.addEndpoints();
      this.addCollapsedNodes();
      var it = this.iterator();
      var eiPrev = it.next();

      while (it.hasNext()) {
        var ei = it.next();
        var newEdge = this.createSplitEdge(eiPrev, ei);
        edgeList.add(newEdge);
        eiPrev = ei;
      }
    },
    findCollapseIndex: function findCollapseIndex(ei0, ei1, collapsedVertexIndex) {
      if (!ei0.coord.equals2D(ei1.coord)) return false;
      var numVerticesBetween = ei1.segmentIndex - ei0.segmentIndex;

      if (!ei1.isInterior()) {
        numVerticesBetween--;
      }

      if (numVerticesBetween === 1) {
        collapsedVertexIndex[0] = ei0.segmentIndex + 1;
        return true;
      }

      return false;
    },
    findCollapsesFromInsertedNodes: function findCollapsesFromInsertedNodes(collapsedVertexIndexes) {
      var collapsedVertexIndex = new Array(1).fill(null);
      var it = this.iterator();
      var eiPrev = it.next();

      while (it.hasNext()) {
        var ei = it.next();
        var isCollapsed = this.findCollapseIndex(eiPrev, ei, collapsedVertexIndex);
        if (isCollapsed) collapsedVertexIndexes.add(new Integer(collapsedVertexIndex[0]));
        eiPrev = ei;
      }
    },
    getEdge: function getEdge() {
      return this._edge;
    },
    addEndpoints: function addEndpoints() {
      var maxSegIndex = this._edge.size() - 1;
      this.add(this._edge.getCoordinate(0), 0);
      this.add(this._edge.getCoordinate(maxSegIndex), maxSegIndex);
    },
    createSplitEdge: function createSplitEdge(ei0, ei1) {
      var npts = ei1.segmentIndex - ei0.segmentIndex + 2;

      var lastSegStartPt = this._edge.getCoordinate(ei1.segmentIndex);

      var useIntPt1 = ei1.isInterior() || !ei1.coord.equals2D(lastSegStartPt);

      if (!useIntPt1) {
        npts--;
      }

      var pts = new Array(npts).fill(null);
      var ipt = 0;
      pts[ipt++] = new Coordinate(ei0.coord);

      for (var i = ei0.segmentIndex + 1; i <= ei1.segmentIndex; i++) {
        pts[ipt++] = this._edge.getCoordinate(i);
      }

      if (useIntPt1) pts[ipt] = new Coordinate(ei1.coord);
      return new NodedSegmentString(pts, this._edge.getData());
    },
    add: function add(intPt, segmentIndex) {
      var eiNew = new SegmentNode(this._edge, intPt, segmentIndex, this._edge.getSegmentOctant(segmentIndex));

      var ei = this._nodeMap.get(eiNew);

      if (ei !== null) {
        Assert.isTrue(ei.coord.equals2D(intPt), "Found equal nodes with different coordinates");
        return ei;
      }

      this._nodeMap.put(eiNew, eiNew);

      return eiNew;
    },
    checkSplitEdgesCorrectness: function checkSplitEdgesCorrectness(splitEdges) {
      var edgePts = this._edge.getCoordinates();

      var split0 = splitEdges.get(0);
      var pt0 = split0.getCoordinate(0);
      if (!pt0.equals2D(edgePts[0])) throw new RuntimeException("bad split edge start point at " + pt0);
      var splitn = splitEdges.get(splitEdges.size() - 1);
      var splitnPts = splitn.getCoordinates();
      var ptn = splitnPts[splitnPts.length - 1];
      if (!ptn.equals2D(edgePts[edgePts.length - 1])) throw new RuntimeException("bad split edge end point at " + ptn);
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return SegmentNodeList;
    }
  });

  function NodeVertexIterator() {
    this._nodeList = null;
    this._edge = null;
    this._nodeIt = null;
    this._currNode = null;
    this._nextNode = null;
    this._currSegIndex = 0;
    var nodeList = arguments[0];
    this._nodeList = nodeList;
    this._edge = nodeList.getEdge();
    this._nodeIt = nodeList.iterator();
    this.readNextNode();
  }

  extend(NodeVertexIterator.prototype, {
    next: function next() {
      if (this._currNode === null) {
        this._currNode = this._nextNode;
        this._currSegIndex = this._currNode.segmentIndex;
        this.readNextNode();
        return this._currNode;
      }

      if (this._nextNode === null) return null;

      if (this._nextNode.segmentIndex === this._currNode.segmentIndex) {
        this._currNode = this._nextNode;
        this._currSegIndex = this._currNode.segmentIndex;
        this.readNextNode();
        return this._currNode;
      }

      if (this._nextNode.segmentIndex > this._currNode.segmentIndex) ;

      return null;
    },
    remove: function remove() {
      throw new UnsupportedOperationException(this.getClass().getName());
    },
    hasNext: function hasNext() {
      if (this._nextNode === null) return false;
      return true;
    },
    readNextNode: function readNextNode() {
      if (this._nodeIt.hasNext()) this._nextNode = this._nodeIt.next();else this._nextNode = null;
    },
    interfaces_: function interfaces_() {
      return [Iterator];
    },
    getClass: function getClass() {
      return NodeVertexIterator;
    }
  });

  function Octant() {}
  extend(Octant.prototype, {
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return Octant;
    }
  });

  Octant.octant = function () {
    if (typeof arguments[0] === "number" && typeof arguments[1] === "number") {
      var _dx = arguments[0],
          _dy = arguments[1];
      if (_dx === 0.0 && _dy === 0.0) throw new IllegalArgumentException("Cannot compute the octant for point ( " + _dx + ", " + _dy + " )");
      var adx = Math.abs(_dx);
      var ady = Math.abs(_dy);

      if (_dx >= 0) {
        if (_dy >= 0) {
          if (adx >= ady) return 0;else return 1;
        } else {
          if (adx >= ady) return 7;else return 6;
        }
      } else {
        if (_dy >= 0) {
          if (adx >= ady) return 3;else return 2;
        } else {
          if (adx >= ady) return 4;else return 5;
        }
      }
    } else if (arguments[0] instanceof Coordinate && arguments[1] instanceof Coordinate) {
      var p0 = arguments[0],
          p1 = arguments[1];
      var dx = p1.x - p0.x;
      var dy = p1.y - p0.y;
      if (dx === 0.0 && dy === 0.0) throw new IllegalArgumentException("Cannot compute the octant for two identical points " + p0);
      return Octant.octant(dx, dy);
    }
  };

  function SegmentString() {}
  extend(SegmentString.prototype, {
    getCoordinates: function getCoordinates() {},
    size: function size() {},
    getCoordinate: function getCoordinate(i) {},
    isClosed: function isClosed() {},
    setData: function setData(data) {},
    getData: function getData() {},
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return SegmentString;
    }
  });

  function NodableSegmentString() {}
  extend(NodableSegmentString.prototype, {
    addIntersection: function addIntersection(intPt, segmentIndex) {},
    interfaces_: function interfaces_() {
      return [SegmentString];
    },
    getClass: function getClass() {
      return NodableSegmentString;
    }
  });

  function NodedSegmentString() {
    this._nodeList = new SegmentNodeList(this);
    this._pts = null;
    this._data = null;
    var pts = arguments[0],
        data = arguments[1];
    this._pts = pts;
    this._data = data;
  }
  extend(NodedSegmentString.prototype, {
    getCoordinates: function getCoordinates() {
      return this._pts;
    },
    size: function size() {
      return this._pts.length;
    },
    getCoordinate: function getCoordinate(i) {
      return this._pts[i];
    },
    isClosed: function isClosed() {
      return this._pts[0].equals(this._pts[this._pts.length - 1]);
    },
    getSegmentOctant: function getSegmentOctant(index) {
      if (index === this._pts.length - 1) return -1;
      return this.safeOctant(this.getCoordinate(index), this.getCoordinate(index + 1));
    },
    setData: function setData(data) {
      this._data = data;
    },
    safeOctant: function safeOctant(p0, p1) {
      if (p0.equals2D(p1)) return 0;
      return Octant.octant(p0, p1);
    },
    getData: function getData() {
      return this._data;
    },
    addIntersection: function addIntersection() {
      if (arguments.length === 2) {
        var _intPt = arguments[0],
            segmentIndex = arguments[1];
        this.addIntersectionNode(_intPt, segmentIndex);
      } else if (arguments.length === 4) {
        var li = arguments[0],
            _segmentIndex = arguments[1],
            intIndex = arguments[3];
        var intPt = new Coordinate(li.getIntersection(intIndex));
        this.addIntersection(intPt, _segmentIndex);
      }
    },
    toString: function toString() {
      return WKTWriter.toLineString(new CoordinateArraySequence(this._pts));
    },
    getNodeList: function getNodeList() {
      return this._nodeList;
    },
    addIntersectionNode: function addIntersectionNode(intPt, segmentIndex) {
      var normalizedSegmentIndex = segmentIndex;
      var nextSegIndex = normalizedSegmentIndex + 1;

      if (nextSegIndex < this._pts.length) {
        var nextPt = this._pts[nextSegIndex];

        if (intPt.equals2D(nextPt)) {
          normalizedSegmentIndex = nextSegIndex;
        }
      }

      var ei = this._nodeList.add(intPt, normalizedSegmentIndex);

      return ei;
    },
    addIntersections: function addIntersections(li, segmentIndex, geomIndex) {
      for (var i = 0; i < li.getIntersectionNum(); i++) {
        this.addIntersection(li, segmentIndex, geomIndex, i);
      }
    },
    interfaces_: function interfaces_() {
      return [NodableSegmentString];
    },
    getClass: function getClass() {
      return NodedSegmentString;
    }
  });

  NodedSegmentString.getNodedSubstrings = function () {
    if (arguments.length === 1) {
      var segStrings = arguments[0];
      var resultEdgelist = new ArrayList();
      NodedSegmentString.getNodedSubstrings(segStrings, resultEdgelist);
      return resultEdgelist;
    } else if (arguments.length === 2) {
      var _segStrings = arguments[0],
          _resultEdgelist = arguments[1];

      for (var i = _segStrings.iterator(); i.hasNext();) {
        var ss = i.next();
        ss.getNodeList().addSplitEdges(_resultEdgelist);
      }
    }
  };

  function MonotoneChainOverlapAction() {
    this._overlapSeg1 = new LineSegment();
    this._overlapSeg2 = new LineSegment();
  }
  extend(MonotoneChainOverlapAction.prototype, {
    overlap: function overlap() {
      if (arguments.length === 2) ; else if (arguments.length === 4) {
        var mc1 = arguments[0],
            start1 = arguments[1],
            mc2 = arguments[2],
            start2 = arguments[3];
        mc1.getLineSegment(start1, this._overlapSeg1);
        mc2.getLineSegment(start2, this._overlapSeg2);
        this.overlap(this._overlapSeg1, this._overlapSeg2);
      }
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return MonotoneChainOverlapAction;
    }
  });

  function Noder() {}
  extend(Noder.prototype, {
    computeNodes: function computeNodes(segStrings) {},
    getNodedSubstrings: function getNodedSubstrings() {},
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return Noder;
    }
  });

  function SinglePassNoder() {
    this._segInt = null;

    if (arguments.length === 0) ; else if (arguments.length === 1) {
      var segInt = arguments[0];
      this.setSegmentIntersector(segInt);
    }
  }
  extend(SinglePassNoder.prototype, {
    setSegmentIntersector: function setSegmentIntersector(segInt) {
      this._segInt = segInt;
    },
    interfaces_: function interfaces_() {
      return [Noder];
    },
    getClass: function getClass() {
      return SinglePassNoder;
    }
  });

  function MCIndexNoder() {
    this._monoChains = new ArrayList();
    this._index = new STRtree();
    this._idCounter = 0;
    this._nodedSegStrings = null;
    this._nOverlaps = 0;

    if (arguments.length === 0) ; else if (arguments.length === 1) {
      var si = arguments[0];
      SinglePassNoder.call(this, si);
    }
  }
  inherits(MCIndexNoder, SinglePassNoder);
  extend(MCIndexNoder.prototype, {
    getMonotoneChains: function getMonotoneChains() {
      return this._monoChains;
    },
    getNodedSubstrings: function getNodedSubstrings() {
      return NodedSegmentString.getNodedSubstrings(this._nodedSegStrings);
    },
    getIndex: function getIndex() {
      return this._index;
    },
    add: function add(segStr) {
      var segChains = MonotoneChainBuilder.getChains(segStr.getCoordinates(), segStr);

      for (var i = segChains.iterator(); i.hasNext();) {
        var mc = i.next();
        mc.setId(this._idCounter++);

        this._index.insert(mc.getEnvelope(), mc);

        this._monoChains.add(mc);
      }
    },
    computeNodes: function computeNodes(inputSegStrings) {
      this._nodedSegStrings = inputSegStrings;

      for (var i = inputSegStrings.iterator(); i.hasNext();) {
        this.add(i.next());
      }

      this.intersectChains();
    },
    intersectChains: function intersectChains() {
      var overlapAction = new SegmentOverlapAction(this._segInt);

      for (var i = this._monoChains.iterator(); i.hasNext();) {
        var queryChain = i.next();

        var overlapChains = this._index.query(queryChain.getEnvelope());

        for (var j = overlapChains.iterator(); j.hasNext();) {
          var testChain = j.next();

          if (testChain.getId() > queryChain.getId()) {
            queryChain.computeOverlaps(testChain, overlapAction);
            this._nOverlaps++;
          }

          if (this._segInt.isDone()) return null;
        }
      }
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return MCIndexNoder;
    }
  });

  function SegmentOverlapAction() {
    MonotoneChainOverlapAction.apply(this);
    this._si = null;
    var si = arguments[0];
    this._si = si;
  }

  inherits(SegmentOverlapAction, MonotoneChainOverlapAction);
  extend(SegmentOverlapAction.prototype, {
    overlap: function overlap() {
      if (arguments.length === 4) {
        var mc1 = arguments[0],
            start1 = arguments[1],
            mc2 = arguments[2],
            start2 = arguments[3];
        var ss1 = mc1.getContext();
        var ss2 = mc2.getContext();

        this._si.processIntersections(ss1, start1, ss2, start2);
      } else return MonotoneChainOverlapAction.prototype.overlap.apply(this, arguments);
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return SegmentOverlapAction;
    }
  });
  MCIndexNoder.SegmentOverlapAction = SegmentOverlapAction;

  function ScaledNoder() {
    this._noder = null;
    this._scaleFactor = null;
    this._offsetX = null;
    this._offsetY = null;
    this._isScaled = false;

    if (arguments.length === 2) {
      var noder = arguments[0],
          scaleFactor = arguments[1];
      ScaledNoder.call(this, noder, scaleFactor, 0, 0);
    } else if (arguments.length === 4) {
      var _noder = arguments[0],
          _scaleFactor = arguments[1];
      this._noder = _noder;
      this._scaleFactor = _scaleFactor;
      this._isScaled = !this.isIntegerPrecision();
    }
  }
  extend(ScaledNoder.prototype, {
    rescale: function rescale() {
      if (hasInterface(arguments[0], Collection)) {
        var segStrings = arguments[0];

        for (var i = segStrings.iterator(); i.hasNext();) {
          var ss = i.next();
          this.rescale(ss.getCoordinates());
        }
      } else if (arguments[0] instanceof Array) {
        var pts = arguments[0];
        var p0 = null;
        var p1 = null;

        if (pts.length === 2) {
          p0 = new Coordinate(pts[0]);
          p1 = new Coordinate(pts[1]);
        }

        for (var i = 0; i < pts.length; i++) {
          pts[i].x = pts[i].x / this._scaleFactor + this._offsetX;
          pts[i].y = pts[i].y / this._scaleFactor + this._offsetY;
        }

        if (pts.length === 2 && pts[0].equals2D(pts[1])) {
          System.out.println(pts);
        }
      }
    },
    scale: function scale() {
      if (hasInterface(arguments[0], Collection)) {
        var segStrings = arguments[0];
        var nodedSegmentStrings = new ArrayList(segStrings.size());

        for (var i = segStrings.iterator(); i.hasNext();) {
          var ss = i.next();
          nodedSegmentStrings.add(new NodedSegmentString(this.scale(ss.getCoordinates()), ss.getData()));
        }

        return nodedSegmentStrings;
      } else if (arguments[0] instanceof Array) {
        var pts = arguments[0];
        var roundPts = new Array(pts.length).fill(null);

        for (var i = 0; i < pts.length; i++) {
          roundPts[i] = new Coordinate(Math.round((pts[i].x - this._offsetX) * this._scaleFactor), Math.round((pts[i].y - this._offsetY) * this._scaleFactor), pts[i].z);
        }

        var roundPtsNoDup = CoordinateArrays.removeRepeatedPoints(roundPts);
        return roundPtsNoDup;
      }
    },
    isIntegerPrecision: function isIntegerPrecision() {
      return this._scaleFactor === 1.0;
    },
    getNodedSubstrings: function getNodedSubstrings() {
      var splitSS = this._noder.getNodedSubstrings();

      if (this._isScaled) this.rescale(splitSS);
      return splitSS;
    },
    computeNodes: function computeNodes(inputSegStrings) {
      var intSegStrings = inputSegStrings;
      if (this._isScaled) intSegStrings = this.scale(inputSegStrings);

      this._noder.computeNodes(intSegStrings);
    },
    interfaces_: function interfaces_() {
      return [Noder];
    },
    getClass: function getClass() {
      return ScaledNoder;
    }
  });



  var noding = /*#__PURE__*/Object.freeze({
    MCIndexNoder: MCIndexNoder,
    ScaledNoder: ScaledNoder,
    SegmentString: SegmentString
  });

  function IsSimpleOp() {
    this._inputGeom = null;
    this._isClosedEndpointsInInterior = true;
    this._nonSimpleLocation = null;

    if (arguments.length === 1) {
      var geom = arguments[0];
      this._inputGeom = geom;
    } else if (arguments.length === 2) {
      var _geom = arguments[0],
          boundaryNodeRule = arguments[1];
      this._inputGeom = _geom;
      this._isClosedEndpointsInInterior = !boundaryNodeRule.isInBoundary(2);
    }
  }
  extend(IsSimpleOp.prototype, {
    isSimpleMultiPoint: function isSimpleMultiPoint(mp) {
      if (mp.isEmpty()) return true;
      var points = new TreeSet();

      for (var i = 0; i < mp.getNumGeometries(); i++) {
        var pt = mp.getGeometryN(i);
        var p = pt.getCoordinate();

        if (points.contains(p)) {
          this._nonSimpleLocation = p;
          return false;
        }

        points.add(p);
      }

      return true;
    },
    isSimplePolygonal: function isSimplePolygonal(geom) {
      var rings = LinearComponentExtracter.getLines(geom);

      for (var i = rings.iterator(); i.hasNext();) {
        var ring = i.next();
        if (!this.isSimpleLinearGeometry(ring)) return false;
      }

      return true;
    },
    hasClosedEndpointIntersection: function hasClosedEndpointIntersection(graph) {
      var endPoints = new TreeMap();

      for (var i = graph.getEdgeIterator(); i.hasNext();) {
        var e = i.next();
        var maxSegmentIndex = e.getMaximumSegmentIndex();
        var isClosed = e.isClosed();
        var p0 = e.getCoordinate(0);
        this.addEndpoint(endPoints, p0, isClosed);
        var p1 = e.getCoordinate(e.getNumPoints() - 1);
        this.addEndpoint(endPoints, p1, isClosed);
      }

      for (var i = endPoints.values().iterator(); i.hasNext();) {
        var eiInfo = i.next();

        if (eiInfo.isClosed && eiInfo.degree !== 2) {
          this._nonSimpleLocation = eiInfo.getCoordinate();
          return true;
        }
      }

      return false;
    },
    getNonSimpleLocation: function getNonSimpleLocation() {
      return this._nonSimpleLocation;
    },
    isSimpleLinearGeometry: function isSimpleLinearGeometry(geom) {
      if (geom.isEmpty()) return true;
      var graph = new GeometryGraph(0, geom);
      var li = new RobustLineIntersector();
      var si = graph.computeSelfNodes(li, true);
      if (!si.hasIntersection()) return true;

      if (si.hasProperIntersection()) {
        this._nonSimpleLocation = si.getProperIntersectionPoint();
        return false;
      }

      if (this.hasNonEndpointIntersection(graph)) return false;

      if (this._isClosedEndpointsInInterior) {
        if (this.hasClosedEndpointIntersection(graph)) return false;
      }

      return true;
    },
    hasNonEndpointIntersection: function hasNonEndpointIntersection(graph) {
      for (var i = graph.getEdgeIterator(); i.hasNext();) {
        var e = i.next();
        var maxSegmentIndex = e.getMaximumSegmentIndex();

        for (var eiIt = e.getEdgeIntersectionList().iterator(); eiIt.hasNext();) {
          var ei = eiIt.next();

          if (!ei.isEndPoint(maxSegmentIndex)) {
            this._nonSimpleLocation = ei.getCoordinate();
            return true;
          }
        }
      }

      return false;
    },
    addEndpoint: function addEndpoint(endPoints, p, isClosed) {
      var eiInfo = endPoints.get(p);

      if (eiInfo === null) {
        eiInfo = new EndpointInfo(p);
        endPoints.put(p, eiInfo);
      }

      eiInfo.addEndpoint(isClosed);
    },
    computeSimple: function computeSimple(geom) {
      this._nonSimpleLocation = null;
      if (geom.isEmpty()) return true;
      if (geom instanceof LineString) return this.isSimpleLinearGeometry(geom);
      if (geom instanceof MultiLineString) return this.isSimpleLinearGeometry(geom);
      if (geom instanceof MultiPoint) return this.isSimpleMultiPoint(geom);
      if (hasInterface(geom, Polygonal)) return this.isSimplePolygonal(geom);
      if (geom instanceof GeometryCollection) return this.isSimpleGeometryCollection(geom);
      return true;
    },
    isSimple: function isSimple() {
      this._nonSimpleLocation = null;
      return this.computeSimple(this._inputGeom);
    },
    isSimpleGeometryCollection: function isSimpleGeometryCollection(geom) {
      for (var i = 0; i < geom.getNumGeometries(); i++) {
        var comp = geom.getGeometryN(i);
        if (!this.computeSimple(comp)) return false;
      }

      return true;
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return IsSimpleOp;
    }
  });

  IsSimpleOp.isSimple = function () {
    if (arguments.length === 1) {
      var geom = arguments[0];
      var op = new IsSimpleOp(geom);
      return op.isSimple();
    } else if (arguments.length === 2) {
      var _geom2 = arguments[0],
          boundaryNodeRule = arguments[1];
      var op = new IsSimpleOp(_geom2, boundaryNodeRule);
      return op.isSimple();
    }
  };

  function EndpointInfo() {
    this.pt = null;
    this.isClosed = null;
    this.degree = null;
    var pt = arguments[0];
    this.pt = pt;
    this.isClosed = false;
    this.degree = 0;
  }

  extend(EndpointInfo.prototype, {
    addEndpoint: function addEndpoint(isClosed) {
      this.degree++;
      this.isClosed |= isClosed;
    },
    getCoordinate: function getCoordinate() {
      return this.pt;
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return EndpointInfo;
    }
  });
  IsSimpleOp.EndpointInfo = EndpointInfo;

  function BufferParameters() {
    this._quadrantSegments = BufferParameters.DEFAULT_QUADRANT_SEGMENTS;
    this._endCapStyle = BufferParameters.CAP_ROUND;
    this._joinStyle = BufferParameters.JOIN_ROUND;
    this._mitreLimit = BufferParameters.DEFAULT_MITRE_LIMIT;
    this._isSingleSided = false;
    this._simplifyFactor = BufferParameters.DEFAULT_SIMPLIFY_FACTOR;

    if (arguments.length === 0) ; else if (arguments.length === 1) {
      var quadrantSegments = arguments[0];
      this.setQuadrantSegments(quadrantSegments);
    } else if (arguments.length === 2) {
      var _quadrantSegments = arguments[0],
          endCapStyle = arguments[1];
      this.setQuadrantSegments(_quadrantSegments);
      this.setEndCapStyle(endCapStyle);
    } else if (arguments.length === 4) {
      var _quadrantSegments2 = arguments[0],
          _endCapStyle = arguments[1],
          joinStyle = arguments[2],
          mitreLimit = arguments[3];
      this.setQuadrantSegments(_quadrantSegments2);
      this.setEndCapStyle(_endCapStyle);
      this.setJoinStyle(joinStyle);
      this.setMitreLimit(mitreLimit);
    }
  }
  extend(BufferParameters.prototype, {
    getEndCapStyle: function getEndCapStyle() {
      return this._endCapStyle;
    },
    isSingleSided: function isSingleSided() {
      return this._isSingleSided;
    },
    setQuadrantSegments: function setQuadrantSegments(quadSegs) {
      this._quadrantSegments = quadSegs;
      if (this._quadrantSegments === 0) this._joinStyle = BufferParameters.JOIN_BEVEL;

      if (this._quadrantSegments < 0) {
        this._joinStyle = BufferParameters.JOIN_MITRE;
        this._mitreLimit = Math.abs(this._quadrantSegments);
      }

      if (quadSegs <= 0) {
        this._quadrantSegments = 1;
      }

      if (this._joinStyle !== BufferParameters.JOIN_ROUND) {
        this._quadrantSegments = BufferParameters.DEFAULT_QUADRANT_SEGMENTS;
      }
    },
    getJoinStyle: function getJoinStyle() {
      return this._joinStyle;
    },
    setJoinStyle: function setJoinStyle(joinStyle) {
      this._joinStyle = joinStyle;
    },
    setSimplifyFactor: function setSimplifyFactor(simplifyFactor) {
      this._simplifyFactor = simplifyFactor < 0 ? 0 : simplifyFactor;
    },
    getSimplifyFactor: function getSimplifyFactor() {
      return this._simplifyFactor;
    },
    getQuadrantSegments: function getQuadrantSegments() {
      return this._quadrantSegments;
    },
    setEndCapStyle: function setEndCapStyle(endCapStyle) {
      this._endCapStyle = endCapStyle;
    },
    getMitreLimit: function getMitreLimit() {
      return this._mitreLimit;
    },
    setMitreLimit: function setMitreLimit(mitreLimit) {
      this._mitreLimit = mitreLimit;
    },
    setSingleSided: function setSingleSided(isSingleSided) {
      this._isSingleSided = isSingleSided;
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return BufferParameters;
    }
  });

  BufferParameters.bufferDistanceError = function (quadSegs) {
    var alpha = Math.PI / 2.0 / quadSegs;
    return 1 - Math.cos(alpha / 2.0);
  };

  BufferParameters.CAP_ROUND = 1;
  BufferParameters.CAP_FLAT = 2;
  BufferParameters.CAP_SQUARE = 3;
  BufferParameters.JOIN_ROUND = 1;
  BufferParameters.JOIN_MITRE = 2;
  BufferParameters.JOIN_BEVEL = 3;
  BufferParameters.DEFAULT_QUADRANT_SEGMENTS = 8;
  BufferParameters.DEFAULT_MITRE_LIMIT = 5.0;
  BufferParameters.DEFAULT_SIMPLIFY_FACTOR = 0.01;

  function RightmostEdgeFinder() {
    this._minIndex = -1;
    this._minCoord = null;
    this._minDe = null;
    this._orientedDe = null;
  }
  extend(RightmostEdgeFinder.prototype, {
    getCoordinate: function getCoordinate() {
      return this._minCoord;
    },
    getRightmostSide: function getRightmostSide(de, index) {
      var side = this.getRightmostSideOfSegment(de, index);
      if (side < 0) side = this.getRightmostSideOfSegment(de, index - 1);

      if (side < 0) {
        this._minCoord = null;
        this.checkForRightmostCoordinate(de);
      }

      return side;
    },
    findRightmostEdgeAtVertex: function findRightmostEdgeAtVertex() {
      var pts = this._minDe.getEdge().getCoordinates();

      Assert.isTrue(this._minIndex > 0 && this._minIndex < pts.length, "rightmost point expected to be interior vertex of edge");
      var pPrev = pts[this._minIndex - 1];
      var pNext = pts[this._minIndex + 1];
      var orientation = Orientation.index(this._minCoord, pNext, pPrev);
      var usePrev = false;

      if (pPrev.y < this._minCoord.y && pNext.y < this._minCoord.y && orientation === Orientation.COUNTERCLOCKWISE) {
        usePrev = true;
      } else if (pPrev.y > this._minCoord.y && pNext.y > this._minCoord.y && orientation === Orientation.CLOCKWISE) {
        usePrev = true;
      }

      if (usePrev) {
        this._minIndex = this._minIndex - 1;
      }
    },
    getRightmostSideOfSegment: function getRightmostSideOfSegment(de, i) {
      var e = de.getEdge();
      var coord = e.getCoordinates();
      if (i < 0 || i + 1 >= coord.length) return -1;
      if (coord[i].y === coord[i + 1].y) return -1;
      var pos = Position.LEFT;
      if (coord[i].y < coord[i + 1].y) pos = Position.RIGHT;
      return pos;
    },
    getEdge: function getEdge() {
      return this._orientedDe;
    },
    checkForRightmostCoordinate: function checkForRightmostCoordinate(de) {
      var coord = de.getEdge().getCoordinates();

      for (var i = 0; i < coord.length - 1; i++) {
        if (this._minCoord === null || coord[i].x > this._minCoord.x) {
          this._minDe = de;
          this._minIndex = i;
          this._minCoord = coord[i];
        }
      }
    },
    findRightmostEdgeAtNode: function findRightmostEdgeAtNode() {
      var node = this._minDe.getNode();

      var star = node.getEdges();
      this._minDe = star.getRightmostEdge();

      if (!this._minDe.isForward()) {
        this._minDe = this._minDe.getSym();
        this._minIndex = this._minDe.getEdge().getCoordinates().length - 1;
      }
    },
    findEdge: function findEdge(dirEdgeList) {
      for (var i = dirEdgeList.iterator(); i.hasNext();) {
        var de = i.next();
        if (!de.isForward()) continue;
        this.checkForRightmostCoordinate(de);
      }

      Assert.isTrue(this._minIndex !== 0 || this._minCoord.equals(this._minDe.getCoordinate()), "inconsistency in rightmost processing");

      if (this._minIndex === 0) {
        this.findRightmostEdgeAtNode();
      } else {
        this.findRightmostEdgeAtVertex();
      }

      this._orientedDe = this._minDe;
      var rightmostSide = this.getRightmostSide(this._minDe, this._minIndex);

      if (rightmostSide === Position.LEFT) {
        this._orientedDe = this._minDe.getSym();
      }
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return RightmostEdgeFinder;
    }
  });

  function LinkedList() {
    this.array_ = [];
  }

  LinkedList.prototype.addLast = function (e) {
    this.array_.push(e);
  };

  LinkedList.prototype.removeFirst = function () {
    return this.array_.shift();
  };

  LinkedList.prototype.isEmpty = function () {
    return this.array_.length === 0;
  };

  function BufferSubgraph() {
    this._finder = null;
    this._dirEdgeList = new ArrayList();
    this._nodes = new ArrayList();
    this._rightMostCoord = null;
    this._env = null;
    this._finder = new RightmostEdgeFinder();
  }
  extend(BufferSubgraph.prototype, {
    clearVisitedEdges: function clearVisitedEdges() {
      for (var it = this._dirEdgeList.iterator(); it.hasNext();) {
        var de = it.next();
        de.setVisited(false);
      }
    },
    getRightmostCoordinate: function getRightmostCoordinate() {
      return this._rightMostCoord;
    },
    computeNodeDepth: function computeNodeDepth(n) {
      var startEdge = null;

      for (var i = n.getEdges().iterator(); i.hasNext();) {
        var de = i.next();

        if (de.isVisited() || de.getSym().isVisited()) {
          startEdge = de;
          break;
        }
      }

      if (startEdge === null) throw new TopologyException("unable to find edge to compute depths at " + n.getCoordinate());
      n.getEdges().computeDepths(startEdge);

      for (var i = n.getEdges().iterator(); i.hasNext();) {
        var de = i.next();
        de.setVisited(true);
        this.copySymDepths(de);
      }
    },
    computeDepth: function computeDepth(outsideDepth) {
      this.clearVisitedEdges();

      var de = this._finder.getEdge();

      var n = de.getNode();
      var label = de.getLabel();
      de.setEdgeDepths(Position.RIGHT, outsideDepth);
      this.copySymDepths(de);
      this.computeDepths(de);
    },
    create: function create(node) {
      this.addReachable(node);

      this._finder.findEdge(this._dirEdgeList);

      this._rightMostCoord = this._finder.getCoordinate();
    },
    findResultEdges: function findResultEdges() {
      for (var it = this._dirEdgeList.iterator(); it.hasNext();) {
        var de = it.next();

        if (de.getDepth(Position.RIGHT) >= 1 && de.getDepth(Position.LEFT) <= 0 && !de.isInteriorAreaEdge()) {
          de.setInResult(true);
        }
      }
    },
    computeDepths: function computeDepths(startEdge) {
      var nodesVisited = new HashSet();
      var nodeQueue = new LinkedList();
      var startNode = startEdge.getNode();
      nodeQueue.addLast(startNode);
      nodesVisited.add(startNode);
      startEdge.setVisited(true);

      while (!nodeQueue.isEmpty()) {
        var n = nodeQueue.removeFirst();
        nodesVisited.add(n);
        this.computeNodeDepth(n);

        for (var i = n.getEdges().iterator(); i.hasNext();) {
          var de = i.next();
          var sym = de.getSym();
          if (sym.isVisited()) continue;
          var adjNode = sym.getNode();

          if (!nodesVisited.contains(adjNode)) {
            nodeQueue.addLast(adjNode);
            nodesVisited.add(adjNode);
          }
        }
      }
    },
    compareTo: function compareTo(o) {
      var graph = o;

      if (this._rightMostCoord.x < graph._rightMostCoord.x) {
        return -1;
      }

      if (this._rightMostCoord.x > graph._rightMostCoord.x) {
        return 1;
      }

      return 0;
    },
    getEnvelope: function getEnvelope() {
      if (this._env === null) {
        var edgeEnv = new Envelope();

        for (var it = this._dirEdgeList.iterator(); it.hasNext();) {
          var dirEdge = it.next();
          var pts = dirEdge.getEdge().getCoordinates();

          for (var i = 0; i < pts.length - 1; i++) {
            edgeEnv.expandToInclude(pts[i]);
          }
        }

        this._env = edgeEnv;
      }

      return this._env;
    },
    addReachable: function addReachable(startNode) {
      var nodeStack = new Stack();
      nodeStack.add(startNode);

      while (!nodeStack.empty()) {
        var node = nodeStack.pop();
        this.add(node, nodeStack);
      }
    },
    copySymDepths: function copySymDepths(de) {
      var sym = de.getSym();
      sym.setDepth(Position.LEFT, de.getDepth(Position.RIGHT));
      sym.setDepth(Position.RIGHT, de.getDepth(Position.LEFT));
    },
    add: function add(node, nodeStack) {
      node.setVisited(true);

      this._nodes.add(node);

      for (var i = node.getEdges().iterator(); i.hasNext();) {
        var de = i.next();

        this._dirEdgeList.add(de);

        var sym = de.getSym();
        var symNode = sym.getNode();
        if (!symNode.isVisited()) nodeStack.push(symNode);
      }
    },
    getNodes: function getNodes() {
      return this._nodes;
    },
    getDirectedEdges: function getDirectedEdges() {
      return this._dirEdgeList;
    },
    interfaces_: function interfaces_() {
      return [Comparable];
    },
    getClass: function getClass() {
      return BufferSubgraph;
    }
  });

  function EdgeRing() {
    this._startDe = null;
    this._maxNodeDegree = -1;
    this._edges = new ArrayList();
    this._pts = new ArrayList();
    this._label = new Label(Location.NONE);
    this._ring = null;
    this._isHole = null;
    this._shell = null;
    this._holes = new ArrayList();
    this._geometryFactory = null;
    var start = arguments[0],
        geometryFactory = arguments[1];
    this._geometryFactory = geometryFactory;
    this.computePoints(start);
    this.computeRing();
  }
  extend(EdgeRing.prototype, {
    computeRing: function computeRing() {
      if (this._ring !== null) return null;
      var coord = new Array(this._pts.size()).fill(null);

      for (var i = 0; i < this._pts.size(); i++) {
        coord[i] = this._pts.get(i);
      }

      this._ring = this._geometryFactory.createLinearRing(coord);
      this._isHole = Orientation.isCCW(this._ring.getCoordinates());
    },
    isIsolated: function isIsolated() {
      return this._label.getGeometryCount() === 1;
    },
    computePoints: function computePoints(start) {
      this._startDe = start;
      var de = start;
      var isFirstEdge = true;

      do {
        if (de === null) throw new TopologyException("Found null DirectedEdge");
        if (de.getEdgeRing() === this) throw new TopologyException("Directed Edge visited twice during ring-building at " + de.getCoordinate());

        this._edges.add(de);

        var label = de.getLabel();
        Assert.isTrue(label.isArea());
        this.mergeLabel(label);
        this.addPoints(de.getEdge(), de.isForward(), isFirstEdge);
        isFirstEdge = false;
        this.setEdgeRing(de, this);
        de = this.getNext(de);
      } while (de !== this._startDe);
    },
    getLinearRing: function getLinearRing() {
      return this._ring;
    },
    getCoordinate: function getCoordinate(i) {
      return this._pts.get(i);
    },
    computeMaxNodeDegree: function computeMaxNodeDegree() {
      this._maxNodeDegree = 0;
      var de = this._startDe;

      do {
        var node = de.getNode();
        var degree = node.getEdges().getOutgoingDegree(this);
        if (degree > this._maxNodeDegree) this._maxNodeDegree = degree;
        de = this.getNext(de);
      } while (de !== this._startDe);

      this._maxNodeDegree *= 2;
    },
    addPoints: function addPoints(edge, isForward, isFirstEdge) {
      var edgePts = edge.getCoordinates();

      if (isForward) {
        var startIndex = 1;
        if (isFirstEdge) startIndex = 0;

        for (var i = startIndex; i < edgePts.length; i++) {
          this._pts.add(edgePts[i]);
        }
      } else {
        var startIndex = edgePts.length - 2;
        if (isFirstEdge) startIndex = edgePts.length - 1;

        for (var i = startIndex; i >= 0; i--) {
          this._pts.add(edgePts[i]);
        }
      }
    },
    isHole: function isHole() {
      return this._isHole;
    },
    setInResult: function setInResult() {
      var de = this._startDe;

      do {
        de.getEdge().setInResult(true);
        de = de.getNext();
      } while (de !== this._startDe);
    },
    containsPoint: function containsPoint(p) {
      var shell = this.getLinearRing();
      var env = shell.getEnvelopeInternal();
      if (!env.contains(p)) return false;
      if (!PointLocation.isInRing(p, shell.getCoordinates())) return false;

      for (var i = this._holes.iterator(); i.hasNext();) {
        var hole = i.next();
        if (hole.containsPoint(p)) return false;
      }

      return true;
    },
    addHole: function addHole(ring) {
      this._holes.add(ring);
    },
    isShell: function isShell() {
      return this._shell === null;
    },
    getLabel: function getLabel() {
      return this._label;
    },
    getEdges: function getEdges() {
      return this._edges;
    },
    getMaxNodeDegree: function getMaxNodeDegree() {
      if (this._maxNodeDegree < 0) this.computeMaxNodeDegree();
      return this._maxNodeDegree;
    },
    getShell: function getShell() {
      return this._shell;
    },
    mergeLabel: function mergeLabel() {
      if (arguments.length === 1) {
        var deLabel = arguments[0];
        this.mergeLabel(deLabel, 0);
        this.mergeLabel(deLabel, 1);
      } else if (arguments.length === 2) {
        var _deLabel = arguments[0],
            geomIndex = arguments[1];

        var loc = _deLabel.getLocation(geomIndex, Position.RIGHT);

        if (loc === Location.NONE) return null;

        if (this._label.getLocation(geomIndex) === Location.NONE) {
          this._label.setLocation(geomIndex, loc);

          return null;
        }
      }
    },
    setShell: function setShell(shell) {
      this._shell = shell;
      if (shell !== null) shell.addHole(this);
    },
    toPolygon: function toPolygon(geometryFactory) {
      var holeLR = new Array(this._holes.size()).fill(null);

      for (var i = 0; i < this._holes.size(); i++) {
        holeLR[i] = this._holes.get(i).getLinearRing();
      }

      var poly = geometryFactory.createPolygon(this.getLinearRing(), holeLR);
      return poly;
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return EdgeRing;
    }
  });

  function MinimalEdgeRing() {
    var start = arguments[0],
        geometryFactory = arguments[1];
    EdgeRing.call(this, start, geometryFactory);
  }
  inherits(MinimalEdgeRing, EdgeRing);
  extend(MinimalEdgeRing.prototype, {
    setEdgeRing: function setEdgeRing(de, er) {
      de.setMinEdgeRing(er);
    },
    getNext: function getNext(de) {
      return de.getNextMin();
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return MinimalEdgeRing;
    }
  });

  function MaximalEdgeRing() {
    var start = arguments[0],
        geometryFactory = arguments[1];
    EdgeRing.call(this, start, geometryFactory);
  }
  inherits(MaximalEdgeRing, EdgeRing);
  extend(MaximalEdgeRing.prototype, {
    buildMinimalRings: function buildMinimalRings() {
      var minEdgeRings = new ArrayList();
      var de = this._startDe;

      do {
        if (de.getMinEdgeRing() === null) {
          var minEr = new MinimalEdgeRing(de, this._geometryFactory);
          minEdgeRings.add(minEr);
        }

        de = de.getNext();
      } while (de !== this._startDe);

      return minEdgeRings;
    },
    setEdgeRing: function setEdgeRing(de, er) {
      de.setEdgeRing(er);
    },
    linkDirectedEdgesForMinimalEdgeRings: function linkDirectedEdgesForMinimalEdgeRings() {
      var de = this._startDe;

      do {
        var node = de.getNode();
        node.getEdges().linkMinimalDirectedEdges(this);
        de = de.getNext();
      } while (de !== this._startDe);
    },
    getNext: function getNext(de) {
      return de.getNext();
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return MaximalEdgeRing;
    }
  });

  function PolygonBuilder() {
    this._geometryFactory = null;
    this._shellList = new ArrayList();
    var geometryFactory = arguments[0];
    this._geometryFactory = geometryFactory;
  }
  extend(PolygonBuilder.prototype, {
    sortShellsAndHoles: function sortShellsAndHoles(edgeRings, shellList, freeHoleList) {
      for (var it = edgeRings.iterator(); it.hasNext();) {
        var er = it.next();

        if (er.isHole()) {
          freeHoleList.add(er);
        } else {
          shellList.add(er);
        }
      }
    },
    computePolygons: function computePolygons(shellList) {
      var resultPolyList = new ArrayList();

      for (var it = shellList.iterator(); it.hasNext();) {
        var er = it.next();
        var poly = er.toPolygon(this._geometryFactory);
        resultPolyList.add(poly);
      }

      return resultPolyList;
    },
    placeFreeHoles: function placeFreeHoles(shellList, freeHoleList) {
      for (var it = freeHoleList.iterator(); it.hasNext();) {
        var hole = it.next();

        if (hole.getShell() === null) {
          var shell = this.findEdgeRingContaining(hole, shellList);
          if (shell === null) throw new TopologyException("unable to assign hole to a shell", hole.getCoordinate(0));
          hole.setShell(shell);
        }
      }
    },
    buildMinimalEdgeRings: function buildMinimalEdgeRings(maxEdgeRings, shellList, freeHoleList) {
      var edgeRings = new ArrayList();

      for (var it = maxEdgeRings.iterator(); it.hasNext();) {
        var er = it.next();

        if (er.getMaxNodeDegree() > 2) {
          er.linkDirectedEdgesForMinimalEdgeRings();
          var minEdgeRings = er.buildMinimalRings();
          var shell = this.findShell(minEdgeRings);

          if (shell !== null) {
            this.placePolygonHoles(shell, minEdgeRings);
            shellList.add(shell);
          } else {
            freeHoleList.addAll(minEdgeRings);
          }
        } else {
          edgeRings.add(er);
        }
      }

      return edgeRings;
    },
    containsPoint: function containsPoint(p) {
      for (var it = this._shellList.iterator(); it.hasNext();) {
        var er = it.next();
        if (er.containsPoint(p)) return true;
      }

      return false;
    },
    buildMaximalEdgeRings: function buildMaximalEdgeRings(dirEdges) {
      var maxEdgeRings = new ArrayList();

      for (var it = dirEdges.iterator(); it.hasNext();) {
        var de = it.next();

        if (de.isInResult() && de.getLabel().isArea()) {
          if (de.getEdgeRing() === null) {
            var er = new MaximalEdgeRing(de, this._geometryFactory);
            maxEdgeRings.add(er);
            er.setInResult();
          }
        }
      }

      return maxEdgeRings;
    },
    placePolygonHoles: function placePolygonHoles(shell, minEdgeRings) {
      for (var it = minEdgeRings.iterator(); it.hasNext();) {
        var er = it.next();

        if (er.isHole()) {
          er.setShell(shell);
        }
      }
    },
    getPolygons: function getPolygons() {
      var resultPolyList = this.computePolygons(this._shellList);
      return resultPolyList;
    },
    findEdgeRingContaining: function findEdgeRingContaining(testEr, shellList) {
      var testRing = testEr.getLinearRing();
      var testEnv = testRing.getEnvelopeInternal();
      var testPt = testRing.getCoordinateN(0);
      var minShell = null;
      var minEnv = null;

      for (var it = shellList.iterator(); it.hasNext();) {
        var tryShell = it.next();
        var tryRing = tryShell.getLinearRing();
        var tryEnv = tryRing.getEnvelopeInternal();
        if (minShell !== null) minEnv = minShell.getLinearRing().getEnvelopeInternal();
        var isContained = false;
        if (tryEnv.contains(testEnv) && PointLocation.isInRing(testPt, tryRing.getCoordinates())) isContained = true;

        if (isContained) {
          if (minShell === null || minEnv.contains(tryEnv)) {
            minShell = tryShell;
          }
        }
      }

      return minShell;
    },
    findShell: function findShell(minEdgeRings) {
      var shellCount = 0;
      var shell = null;

      for (var it = minEdgeRings.iterator(); it.hasNext();) {
        var er = it.next();

        if (!er.isHole()) {
          shell = er;
          shellCount++;
        }
      }

      Assert.isTrue(shellCount <= 1, "found two shells in MinimalEdgeRing list");
      return shell;
    },
    add: function add() {
      if (arguments.length === 1) {
        var graph = arguments[0];
        this.add(graph.getEdgeEnds(), graph.getNodes());
      } else if (arguments.length === 2) {
        var dirEdges = arguments[0],
            nodes = arguments[1];
        PlanarGraph.linkResultDirectedEdges(nodes);
        var maxEdgeRings = this.buildMaximalEdgeRings(dirEdges);
        var freeHoleList = new ArrayList();
        var edgeRings = this.buildMinimalEdgeRings(maxEdgeRings, this._shellList, freeHoleList);
        this.sortShellsAndHoles(edgeRings, this._shellList, freeHoleList);
        this.placeFreeHoles(this._shellList, freeHoleList);
      }
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return PolygonBuilder;
    }
  });

  function BufferInputLineSimplifier() {
    this._inputLine = null;
    this._distanceTol = null;
    this._isDeleted = null;
    this._angleOrientation = Orientation.COUNTERCLOCKWISE;
    var inputLine = arguments[0];
    this._inputLine = inputLine;
  }
  extend(BufferInputLineSimplifier.prototype, {
    isDeletable: function isDeletable(i0, i1, i2, distanceTol) {
      var p0 = this._inputLine[i0];
      var p1 = this._inputLine[i1];
      var p2 = this._inputLine[i2];
      if (!this.isConcave(p0, p1, p2)) return false;
      if (!this.isShallow(p0, p1, p2, distanceTol)) return false;
      return this.isShallowSampled(p0, p1, i0, i2, distanceTol);
    },
    deleteShallowConcavities: function deleteShallowConcavities() {
      var index = 1;
      var maxIndex = this._inputLine.length - 1;
      var midIndex = this.findNextNonDeletedIndex(index);
      var lastIndex = this.findNextNonDeletedIndex(midIndex);
      var isChanged = false;

      while (lastIndex < this._inputLine.length) {
        var isMiddleVertexDeleted = false;

        if (this.isDeletable(index, midIndex, lastIndex, this._distanceTol)) {
          this._isDeleted[midIndex] = BufferInputLineSimplifier.DELETE;
          isMiddleVertexDeleted = true;
          isChanged = true;
        }

        if (isMiddleVertexDeleted) index = lastIndex;else index = midIndex;
        midIndex = this.findNextNonDeletedIndex(index);
        lastIndex = this.findNextNonDeletedIndex(midIndex);
      }

      return isChanged;
    },
    isShallowConcavity: function isShallowConcavity(p0, p1, p2, distanceTol) {
      var orientation = Orientation.index(p0, p1, p2);
      var isAngleToSimplify = orientation === this._angleOrientation;
      if (!isAngleToSimplify) return false;
      var dist = Distance.pointToSegment(p1, p0, p2);
      return dist < distanceTol;
    },
    isShallowSampled: function isShallowSampled(p0, p2, i0, i2, distanceTol) {
      var inc = Math.trunc((i2 - i0) / BufferInputLineSimplifier.NUM_PTS_TO_CHECK);
      if (inc <= 0) inc = 1;

      for (var i = i0; i < i2; i += inc) {
        if (!this.isShallow(p0, p2, this._inputLine[i], distanceTol)) return false;
      }

      return true;
    },
    isConcave: function isConcave(p0, p1, p2) {
      var orientation = Orientation.index(p0, p1, p2);
      var isConcave = orientation === this._angleOrientation;
      return isConcave;
    },
    simplify: function simplify(distanceTol) {
      this._distanceTol = Math.abs(distanceTol);
      if (distanceTol < 0) this._angleOrientation = Orientation.CLOCKWISE;
      this._isDeleted = new Array(this._inputLine.length).fill(null);
      var isChanged = false;

      do {
        isChanged = this.deleteShallowConcavities();
      } while (isChanged);

      return this.collapseLine();
    },
    findNextNonDeletedIndex: function findNextNonDeletedIndex(index) {
      var next = index + 1;

      while (next < this._inputLine.length && this._isDeleted[next] === BufferInputLineSimplifier.DELETE) {
        next++;
      }

      return next;
    },
    isShallow: function isShallow(p0, p1, p2, distanceTol) {
      var dist = Distance.pointToSegment(p1, p0, p2);
      return dist < distanceTol;
    },
    collapseLine: function collapseLine() {
      var coordList = new CoordinateList();

      for (var i = 0; i < this._inputLine.length; i++) {
        if (this._isDeleted[i] !== BufferInputLineSimplifier.DELETE) coordList.add(this._inputLine[i]);
      }

      return coordList.toCoordinateArray();
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return BufferInputLineSimplifier;
    }
  });

  BufferInputLineSimplifier.simplify = function (inputLine, distanceTol) {
    var simp = new BufferInputLineSimplifier(inputLine);
    return simp.simplify(distanceTol);
  };

  BufferInputLineSimplifier.INIT = 0;
  BufferInputLineSimplifier.DELETE = 1;
  BufferInputLineSimplifier.KEEP = 1;
  BufferInputLineSimplifier.NUM_PTS_TO_CHECK = 10;

  function OffsetSegmentString() {
    this._ptList = null;
    this._precisionModel = null;
    this._minimimVertexDistance = 0.0;
    this._ptList = new ArrayList();
  }
  extend(OffsetSegmentString.prototype, {
    getCoordinates: function getCoordinates() {
      var coord = this._ptList.toArray(OffsetSegmentString.COORDINATE_ARRAY_TYPE);

      return coord;
    },
    setPrecisionModel: function setPrecisionModel(precisionModel) {
      this._precisionModel = precisionModel;
    },
    addPt: function addPt(pt) {
      var bufPt = new Coordinate(pt);

      this._precisionModel.makePrecise(bufPt);

      if (this.isRedundant(bufPt)) return null;

      this._ptList.add(bufPt);
    },
    reverse: function reverse() {},
    addPts: function addPts(pt, isForward) {
      if (isForward) {
        for (var i = 0; i < pt.length; i++) {
          this.addPt(pt[i]);
        }
      } else {
        for (var i = pt.length - 1; i >= 0; i--) {
          this.addPt(pt[i]);
        }
      }
    },
    isRedundant: function isRedundant(pt) {
      if (this._ptList.size() < 1) return false;

      var lastPt = this._ptList.get(this._ptList.size() - 1);

      var ptDist = pt.distance(lastPt);
      if (ptDist < this._minimimVertexDistance) return true;
      return false;
    },
    toString: function toString() {
      var fact = new GeometryFactory();
      var line = fact.createLineString(this.getCoordinates());
      return line.toString();
    },
    closeRing: function closeRing() {
      if (this._ptList.size() < 1) return null;
      var startPt = new Coordinate(this._ptList.get(0));

      var lastPt = this._ptList.get(this._ptList.size() - 1);

      var last2Pt = null;
      if (this._ptList.size() >= 2) last2Pt = this._ptList.get(this._ptList.size() - 2);
      if (startPt.equals(lastPt)) return null;

      this._ptList.add(startPt);
    },
    setMinimumVertexDistance: function setMinimumVertexDistance(minimimVertexDistance) {
      this._minimimVertexDistance = minimimVertexDistance;
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return OffsetSegmentString;
    }
  });
  OffsetSegmentString.COORDINATE_ARRAY_TYPE = new Array(0).fill(null);

  function OffsetSegmentGenerator() {
    this._maxCurveSegmentError = 0.0;
    this._filletAngleQuantum = null;
    this._closingSegLengthFactor = 1;
    this._segList = null;
    this._distance = 0.0;
    this._precisionModel = null;
    this._bufParams = null;
    this._li = null;
    this._s0 = null;
    this._s1 = null;
    this._s2 = null;
    this._seg0 = new LineSegment();
    this._seg1 = new LineSegment();
    this._offset0 = new LineSegment();
    this._offset1 = new LineSegment();
    this._side = 0;
    this._hasNarrowConcaveAngle = false;
    var precisionModel = arguments[0],
        bufParams = arguments[1],
        distance = arguments[2];
    this._precisionModel = precisionModel;
    this._bufParams = bufParams;
    this._li = new RobustLineIntersector();
    this._filletAngleQuantum = Math.PI / 2.0 / bufParams.getQuadrantSegments();
    if (bufParams.getQuadrantSegments() >= 8 && bufParams.getJoinStyle() === BufferParameters.JOIN_ROUND) this._closingSegLengthFactor = OffsetSegmentGenerator.MAX_CLOSING_SEG_LEN_FACTOR;
    this.init(distance);
  }
  extend(OffsetSegmentGenerator.prototype, {
    addNextSegment: function addNextSegment(p, addStartPoint) {
      this._s0 = this._s1;
      this._s1 = this._s2;
      this._s2 = p;

      this._seg0.setCoordinates(this._s0, this._s1);

      this.computeOffsetSegment(this._seg0, this._side, this._distance, this._offset0);

      this._seg1.setCoordinates(this._s1, this._s2);

      this.computeOffsetSegment(this._seg1, this._side, this._distance, this._offset1);
      if (this._s1.equals(this._s2)) return null;
      var orientation = Orientation.index(this._s0, this._s1, this._s2);
      var outsideTurn = orientation === Orientation.CLOCKWISE && this._side === Position.LEFT || orientation === Orientation.COUNTERCLOCKWISE && this._side === Position.RIGHT;

      if (orientation === 0) {
        this.addCollinear(addStartPoint);
      } else if (outsideTurn) {
        this.addOutsideTurn(orientation, addStartPoint);
      } else {
        this.addInsideTurn(orientation, addStartPoint);
      }
    },
    addLineEndCap: function addLineEndCap(p0, p1) {
      var seg = new LineSegment(p0, p1);
      var offsetL = new LineSegment();
      this.computeOffsetSegment(seg, Position.LEFT, this._distance, offsetL);
      var offsetR = new LineSegment();
      this.computeOffsetSegment(seg, Position.RIGHT, this._distance, offsetR);
      var dx = p1.x - p0.x;
      var dy = p1.y - p0.y;
      var angle = Math.atan2(dy, dx);

      switch (this._bufParams.getEndCapStyle()) {
        case BufferParameters.CAP_ROUND:
          this._segList.addPt(offsetL.p1);

          this.addDirectedFillet(p1, angle + Math.PI / 2, angle - Math.PI / 2, Orientation.CLOCKWISE, this._distance);

          this._segList.addPt(offsetR.p1);

          break;

        case BufferParameters.CAP_FLAT:
          this._segList.addPt(offsetL.p1);

          this._segList.addPt(offsetR.p1);

          break;

        case BufferParameters.CAP_SQUARE:
          var squareCapSideOffset = new Coordinate();
          squareCapSideOffset.x = Math.abs(this._distance) * Math.cos(angle);
          squareCapSideOffset.y = Math.abs(this._distance) * Math.sin(angle);
          var squareCapLOffset = new Coordinate(offsetL.p1.x + squareCapSideOffset.x, offsetL.p1.y + squareCapSideOffset.y);
          var squareCapROffset = new Coordinate(offsetR.p1.x + squareCapSideOffset.x, offsetR.p1.y + squareCapSideOffset.y);

          this._segList.addPt(squareCapLOffset);

          this._segList.addPt(squareCapROffset);

          break;
      }
    },
    getCoordinates: function getCoordinates() {
      var pts = this._segList.getCoordinates();

      return pts;
    },
    addMitreJoin: function addMitreJoin(p, offset0, offset1, distance) {
      var isMitreWithinLimit = true;
      var intPt = null;

      try {
        intPt = HCoordinate.intersection(offset0.p0, offset0.p1, offset1.p0, offset1.p1);
        var mitreRatio = distance <= 0.0 ? 1.0 : intPt.distance(p) / Math.abs(distance);
        if (mitreRatio > this._bufParams.getMitreLimit()) isMitreWithinLimit = false;
      } catch (ex) {
        if (ex instanceof NotRepresentableException) {
          intPt = new Coordinate(0, 0);
          isMitreWithinLimit = false;
        } else throw ex;
      } finally {}

      if (isMitreWithinLimit) {
        this._segList.addPt(intPt);
      } else {
        this.addLimitedMitreJoin(offset0, offset1, distance, this._bufParams.getMitreLimit());
      }
    },
    addOutsideTurn: function addOutsideTurn(orientation, addStartPoint) {
      if (this._offset0.p1.distance(this._offset1.p0) < this._distance * OffsetSegmentGenerator.OFFSET_SEGMENT_SEPARATION_FACTOR) {
        this._segList.addPt(this._offset0.p1);

        return null;
      }

      if (this._bufParams.getJoinStyle() === BufferParameters.JOIN_MITRE) {
        this.addMitreJoin(this._s1, this._offset0, this._offset1, this._distance);
      } else if (this._bufParams.getJoinStyle() === BufferParameters.JOIN_BEVEL) {
        this.addBevelJoin(this._offset0, this._offset1);
      } else {
        if (addStartPoint) this._segList.addPt(this._offset0.p1);
        this.addCornerFillet(this._s1, this._offset0.p1, this._offset1.p0, orientation, this._distance);

        this._segList.addPt(this._offset1.p0);
      }
    },
    createSquare: function createSquare(p) {
      this._segList.addPt(new Coordinate(p.x + this._distance, p.y + this._distance));

      this._segList.addPt(new Coordinate(p.x + this._distance, p.y - this._distance));

      this._segList.addPt(new Coordinate(p.x - this._distance, p.y - this._distance));

      this._segList.addPt(new Coordinate(p.x - this._distance, p.y + this._distance));

      this._segList.closeRing();
    },
    addSegments: function addSegments(pt, isForward) {
      this._segList.addPts(pt, isForward);
    },
    addFirstSegment: function addFirstSegment() {
      this._segList.addPt(this._offset1.p0);
    },
    addCornerFillet: function addCornerFillet(p, p0, p1, direction, radius) {
      var dx0 = p0.x - p.x;
      var dy0 = p0.y - p.y;
      var startAngle = Math.atan2(dy0, dx0);
      var dx1 = p1.x - p.x;
      var dy1 = p1.y - p.y;
      var endAngle = Math.atan2(dy1, dx1);

      if (direction === Orientation.CLOCKWISE) {
        if (startAngle <= endAngle) startAngle += 2.0 * Math.PI;
      } else {
        if (startAngle >= endAngle) startAngle -= 2.0 * Math.PI;
      }

      this._segList.addPt(p0);

      this.addDirectedFillet(p, startAngle, endAngle, direction, radius);

      this._segList.addPt(p1);
    },
    addLastSegment: function addLastSegment() {
      this._segList.addPt(this._offset1.p1);
    },
    initSideSegments: function initSideSegments(s1, s2, side) {
      this._s1 = s1;
      this._s2 = s2;
      this._side = side;

      this._seg1.setCoordinates(s1, s2);

      this.computeOffsetSegment(this._seg1, side, this._distance, this._offset1);
    },
    addLimitedMitreJoin: function addLimitedMitreJoin(offset0, offset1, distance, mitreLimit) {
      var basePt = this._seg0.p1;
      var ang0 = Angle.angle(basePt, this._seg0.p0);
      var ang1 = Angle.angle(basePt, this._seg1.p1);
      var angDiff = Angle.angleBetweenOriented(this._seg0.p0, basePt, this._seg1.p1);
      var angDiffHalf = angDiff / 2;
      var midAng = Angle.normalize(ang0 + angDiffHalf);
      var mitreMidAng = Angle.normalize(midAng + Math.PI);
      var mitreDist = mitreLimit * distance;
      var bevelDelta = mitreDist * Math.abs(Math.sin(angDiffHalf));
      var bevelHalfLen = distance - bevelDelta;
      var bevelMidX = basePt.x + mitreDist * Math.cos(mitreMidAng);
      var bevelMidY = basePt.y + mitreDist * Math.sin(mitreMidAng);
      var bevelMidPt = new Coordinate(bevelMidX, bevelMidY);
      var mitreMidLine = new LineSegment(basePt, bevelMidPt);
      var bevelEndLeft = mitreMidLine.pointAlongOffset(1.0, bevelHalfLen);
      var bevelEndRight = mitreMidLine.pointAlongOffset(1.0, -bevelHalfLen);

      if (this._side === Position.LEFT) {
        this._segList.addPt(bevelEndLeft);

        this._segList.addPt(bevelEndRight);
      } else {
        this._segList.addPt(bevelEndRight);

        this._segList.addPt(bevelEndLeft);
      }
    },
    addDirectedFillet: function addDirectedFillet(p, startAngle, endAngle, direction, radius) {
      var directionFactor = direction === Orientation.CLOCKWISE ? -1 : 1;
      var totalAngle = Math.abs(startAngle - endAngle);
      var nSegs = Math.trunc(totalAngle / this._filletAngleQuantum + 0.5);
      if (nSegs < 1) return null;
      var initAngle = null,
          currAngleInc = null;
      initAngle = 0.0;
      currAngleInc = totalAngle / nSegs;
      var currAngle = initAngle;
      var pt = new Coordinate();

      while (currAngle < totalAngle) {
        var angle = startAngle + directionFactor * currAngle;
        pt.x = p.x + radius * Math.cos(angle);
        pt.y = p.y + radius * Math.sin(angle);

        this._segList.addPt(pt);

        currAngle += currAngleInc;
      }
    },
    computeOffsetSegment: function computeOffsetSegment(seg, side, distance, offset) {
      var sideSign = side === Position.LEFT ? 1 : -1;
      var dx = seg.p1.x - seg.p0.x;
      var dy = seg.p1.y - seg.p0.y;
      var len = Math.sqrt(dx * dx + dy * dy);
      var ux = sideSign * distance * dx / len;
      var uy = sideSign * distance * dy / len;
      offset.p0.x = seg.p0.x - uy;
      offset.p0.y = seg.p0.y + ux;
      offset.p1.x = seg.p1.x - uy;
      offset.p1.y = seg.p1.y + ux;
    },
    addInsideTurn: function addInsideTurn(orientation, addStartPoint) {
      this._li.computeIntersection(this._offset0.p0, this._offset0.p1, this._offset1.p0, this._offset1.p1);

      if (this._li.hasIntersection()) {
        this._segList.addPt(this._li.getIntersection(0));
      } else {
        this._hasNarrowConcaveAngle = true;

        if (this._offset0.p1.distance(this._offset1.p0) < this._distance * OffsetSegmentGenerator.INSIDE_TURN_VERTEX_SNAP_DISTANCE_FACTOR) {
          this._segList.addPt(this._offset0.p1);
        } else {
          this._segList.addPt(this._offset0.p1);

          if (this._closingSegLengthFactor > 0) {
            var mid0 = new Coordinate((this._closingSegLengthFactor * this._offset0.p1.x + this._s1.x) / (this._closingSegLengthFactor + 1), (this._closingSegLengthFactor * this._offset0.p1.y + this._s1.y) / (this._closingSegLengthFactor + 1));

            this._segList.addPt(mid0);

            var mid1 = new Coordinate((this._closingSegLengthFactor * this._offset1.p0.x + this._s1.x) / (this._closingSegLengthFactor + 1), (this._closingSegLengthFactor * this._offset1.p0.y + this._s1.y) / (this._closingSegLengthFactor + 1));

            this._segList.addPt(mid1);
          } else {
            this._segList.addPt(this._s1);
          }

          this._segList.addPt(this._offset1.p0);
        }
      }
    },
    createCircle: function createCircle(p) {
      var pt = new Coordinate(p.x + this._distance, p.y);

      this._segList.addPt(pt);

      this.addDirectedFillet(p, 0.0, 2.0 * Math.PI, -1, this._distance);

      this._segList.closeRing();
    },
    addBevelJoin: function addBevelJoin(offset0, offset1) {
      this._segList.addPt(offset0.p1);

      this._segList.addPt(offset1.p0);
    },
    init: function init(distance) {
      this._distance = distance;
      this._maxCurveSegmentError = distance * (1 - Math.cos(this._filletAngleQuantum / 2.0));
      this._segList = new OffsetSegmentString();

      this._segList.setPrecisionModel(this._precisionModel);

      this._segList.setMinimumVertexDistance(distance * OffsetSegmentGenerator.CURVE_VERTEX_SNAP_DISTANCE_FACTOR);
    },
    addCollinear: function addCollinear(addStartPoint) {
      this._li.computeIntersection(this._s0, this._s1, this._s1, this._s2);

      var numInt = this._li.getIntersectionNum();

      if (numInt >= 2) {
        if (this._bufParams.getJoinStyle() === BufferParameters.JOIN_BEVEL || this._bufParams.getJoinStyle() === BufferParameters.JOIN_MITRE) {
          if (addStartPoint) this._segList.addPt(this._offset0.p1);

          this._segList.addPt(this._offset1.p0);
        } else {
          this.addCornerFillet(this._s1, this._offset0.p1, this._offset1.p0, Orientation.CLOCKWISE, this._distance);
        }
      }
    },
    closeRing: function closeRing() {
      this._segList.closeRing();
    },
    hasNarrowConcaveAngle: function hasNarrowConcaveAngle() {
      return this._hasNarrowConcaveAngle;
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return OffsetSegmentGenerator;
    }
  });
  OffsetSegmentGenerator.OFFSET_SEGMENT_SEPARATION_FACTOR = 1.0E-3;
  OffsetSegmentGenerator.INSIDE_TURN_VERTEX_SNAP_DISTANCE_FACTOR = 1.0E-3;
  OffsetSegmentGenerator.CURVE_VERTEX_SNAP_DISTANCE_FACTOR = 1.0E-6;
  OffsetSegmentGenerator.MAX_CLOSING_SEG_LEN_FACTOR = 80;

  function OffsetCurveBuilder() {
    this._distance = 0.0;
    this._precisionModel = null;
    this._bufParams = null;
    var precisionModel = arguments[0],
        bufParams = arguments[1];
    this._precisionModel = precisionModel;
    this._bufParams = bufParams;
  }
  extend(OffsetCurveBuilder.prototype, {
    getOffsetCurve: function getOffsetCurve(inputPts, distance) {
      this._distance = distance;
      if (distance === 0.0) return null;
      var isRightSide = distance < 0.0;
      var posDistance = Math.abs(distance);
      var segGen = this.getSegGen(posDistance);

      if (inputPts.length <= 1) {
        this.computePointCurve(inputPts[0], segGen);
      } else {
        this.computeOffsetCurve(inputPts, isRightSide, segGen);
      }

      var curvePts = segGen.getCoordinates();
      if (isRightSide) CoordinateArrays.reverse(curvePts);
      return curvePts;
    },
    computeSingleSidedBufferCurve: function computeSingleSidedBufferCurve(inputPts, isRightSide, segGen) {
      var distTol = this.simplifyTolerance(this._distance);

      if (isRightSide) {
        segGen.addSegments(inputPts, true);
        var simp2 = BufferInputLineSimplifier.simplify(inputPts, -distTol);
        var n2 = simp2.length - 1;
        segGen.initSideSegments(simp2[n2], simp2[n2 - 1], Position.LEFT);
        segGen.addFirstSegment();

        for (var i = n2 - 2; i >= 0; i--) {
          segGen.addNextSegment(simp2[i], true);
        }
      } else {
        segGen.addSegments(inputPts, false);
        var simp1 = BufferInputLineSimplifier.simplify(inputPts, distTol);
        var n1 = simp1.length - 1;
        segGen.initSideSegments(simp1[0], simp1[1], Position.LEFT);
        segGen.addFirstSegment();

        for (var i = 2; i <= n1; i++) {
          segGen.addNextSegment(simp1[i], true);
        }
      }

      segGen.addLastSegment();
      segGen.closeRing();
    },
    computeRingBufferCurve: function computeRingBufferCurve(inputPts, side, segGen) {
      var distTol = this.simplifyTolerance(this._distance);
      if (side === Position.RIGHT) distTol = -distTol;
      var simp = BufferInputLineSimplifier.simplify(inputPts, distTol);
      var n = simp.length - 1;
      segGen.initSideSegments(simp[n - 1], simp[0], side);

      for (var i = 1; i <= n; i++) {
        var addStartPoint = i !== 1;
        segGen.addNextSegment(simp[i], addStartPoint);
      }

      segGen.closeRing();
    },
    computeLineBufferCurve: function computeLineBufferCurve(inputPts, segGen) {
      var distTol = this.simplifyTolerance(this._distance);
      var simp1 = BufferInputLineSimplifier.simplify(inputPts, distTol);
      var n1 = simp1.length - 1;
      segGen.initSideSegments(simp1[0], simp1[1], Position.LEFT);

      for (var i = 2; i <= n1; i++) {
        segGen.addNextSegment(simp1[i], true);
      }

      segGen.addLastSegment();
      segGen.addLineEndCap(simp1[n1 - 1], simp1[n1]);
      var simp2 = BufferInputLineSimplifier.simplify(inputPts, -distTol);
      var n2 = simp2.length - 1;
      segGen.initSideSegments(simp2[n2], simp2[n2 - 1], Position.LEFT);

      for (var i = n2 - 2; i >= 0; i--) {
        segGen.addNextSegment(simp2[i], true);
      }

      segGen.addLastSegment();
      segGen.addLineEndCap(simp2[1], simp2[0]);
      segGen.closeRing();
    },
    computePointCurve: function computePointCurve(pt, segGen) {
      switch (this._bufParams.getEndCapStyle()) {
        case BufferParameters.CAP_ROUND:
          segGen.createCircle(pt);
          break;

        case BufferParameters.CAP_SQUARE:
          segGen.createSquare(pt);
          break;
      }
    },
    getLineCurve: function getLineCurve(inputPts, distance) {
      this._distance = distance;
      if (distance < 0.0 && !this._bufParams.isSingleSided()) return null;
      if (distance === 0.0) return null;
      var posDistance = Math.abs(distance);
      var segGen = this.getSegGen(posDistance);

      if (inputPts.length <= 1) {
        this.computePointCurve(inputPts[0], segGen);
      } else {
        if (this._bufParams.isSingleSided()) {
          var isRightSide = distance < 0.0;
          this.computeSingleSidedBufferCurve(inputPts, isRightSide, segGen);
        } else this.computeLineBufferCurve(inputPts, segGen);
      }

      var lineCoord = segGen.getCoordinates();
      return lineCoord;
    },
    getBufferParameters: function getBufferParameters() {
      return this._bufParams;
    },
    simplifyTolerance: function simplifyTolerance(bufDistance) {
      return bufDistance * this._bufParams.getSimplifyFactor();
    },
    getRingCurve: function getRingCurve(inputPts, side, distance) {
      this._distance = distance;
      if (inputPts.length <= 2) return this.getLineCurve(inputPts, distance);

      if (distance === 0.0) {
        return OffsetCurveBuilder.copyCoordinates(inputPts);
      }

      var segGen = this.getSegGen(distance);
      this.computeRingBufferCurve(inputPts, side, segGen);
      return segGen.getCoordinates();
    },
    computeOffsetCurve: function computeOffsetCurve(inputPts, isRightSide, segGen) {
      var distTol = this.simplifyTolerance(this._distance);

      if (isRightSide) {
        var simp2 = BufferInputLineSimplifier.simplify(inputPts, -distTol);
        var n2 = simp2.length - 1;
        segGen.initSideSegments(simp2[n2], simp2[n2 - 1], Position.LEFT);
        segGen.addFirstSegment();

        for (var i = n2 - 2; i >= 0; i--) {
          segGen.addNextSegment(simp2[i], true);
        }
      } else {
        var simp1 = BufferInputLineSimplifier.simplify(inputPts, distTol);
        var n1 = simp1.length - 1;
        segGen.initSideSegments(simp1[0], simp1[1], Position.LEFT);
        segGen.addFirstSegment();

        for (var i = 2; i <= n1; i++) {
          segGen.addNextSegment(simp1[i], true);
        }
      }

      segGen.addLastSegment();
    },
    getSegGen: function getSegGen(distance) {
      return new OffsetSegmentGenerator(this._precisionModel, this._bufParams, distance);
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return OffsetCurveBuilder;
    }
  });

  OffsetCurveBuilder.copyCoordinates = function (pts) {
    var copy = new Array(pts.length).fill(null);

    for (var i = 0; i < copy.length; i++) {
      copy[i] = new Coordinate(pts[i]);
    }

    return copy;
  };

  function SubgraphDepthLocater() {
    this._subgraphs = null;
    this._seg = new LineSegment();
    var subgraphs = arguments[0];
    this._subgraphs = subgraphs;
  }
  extend(SubgraphDepthLocater.prototype, {
    findStabbedSegments: function findStabbedSegments() {
      if (arguments.length === 1) {
        var stabbingRayLeftPt = arguments[0];
        var stabbedSegments = new ArrayList();

        for (var i = this._subgraphs.iterator(); i.hasNext();) {
          var bsg = i.next();
          var env = bsg.getEnvelope();
          if (stabbingRayLeftPt.y < env.getMinY() || stabbingRayLeftPt.y > env.getMaxY()) continue;
          this.findStabbedSegments(stabbingRayLeftPt, bsg.getDirectedEdges(), stabbedSegments);
        }

        return stabbedSegments;
      } else if (arguments.length === 3) {
        if (hasInterface(arguments[2], List) && arguments[0] instanceof Coordinate && arguments[1] instanceof DirectedEdge) {
          var _stabbingRayLeftPt = arguments[0],
              dirEdge = arguments[1],
              _stabbedSegments = arguments[2];
          var pts = dirEdge.getEdge().getCoordinates();

          for (var i = 0; i < pts.length - 1; i++) {
            this._seg.p0 = pts[i];
            this._seg.p1 = pts[i + 1];
            if (this._seg.p0.y > this._seg.p1.y) this._seg.reverse();
            var maxx = Math.max(this._seg.p0.x, this._seg.p1.x);
            if (maxx < _stabbingRayLeftPt.x) continue;
            if (this._seg.isHorizontal()) continue;
            if (_stabbingRayLeftPt.y < this._seg.p0.y || _stabbingRayLeftPt.y > this._seg.p1.y) continue;
            if (Orientation.index(this._seg.p0, this._seg.p1, _stabbingRayLeftPt) === Orientation.RIGHT) continue;
            var depth = dirEdge.getDepth(Position.LEFT);
            if (!this._seg.p0.equals(pts[i])) depth = dirEdge.getDepth(Position.RIGHT);
            var ds = new DepthSegment(this._seg, depth);

            _stabbedSegments.add(ds);
          }
        } else if (hasInterface(arguments[2], List) && arguments[0] instanceof Coordinate && hasInterface(arguments[1], List)) {
          var _stabbingRayLeftPt2 = arguments[0],
              dirEdges = arguments[1],
              _stabbedSegments2 = arguments[2];

          for (var i = dirEdges.iterator(); i.hasNext();) {
            var de = i.next();
            if (!de.isForward()) continue;
            this.findStabbedSegments(_stabbingRayLeftPt2, de, _stabbedSegments2);
          }
        }
      }
    },
    getDepth: function getDepth(p) {
      var stabbedSegments = this.findStabbedSegments(p);
      if (stabbedSegments.size() === 0) return 0;
      var ds = Collections.min(stabbedSegments);
      return ds._leftDepth;
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return SubgraphDepthLocater;
    }
  });

  function DepthSegment() {
    this._upwardSeg = null;
    this._leftDepth = null;
    var seg = arguments[0],
        depth = arguments[1];
    this._upwardSeg = new LineSegment(seg);
    this._leftDepth = depth;
  }

  extend(DepthSegment.prototype, {
    compareTo: function compareTo(obj) {
      var other = obj;
      if (this._upwardSeg.minX() >= other._upwardSeg.maxX()) return 1;
      if (this._upwardSeg.maxX() <= other._upwardSeg.minX()) return -1;

      var orientIndex = this._upwardSeg.orientationIndex(other._upwardSeg);

      if (orientIndex !== 0) return orientIndex;
      orientIndex = -1 * other._upwardSeg.orientationIndex(this._upwardSeg);
      if (orientIndex !== 0) return orientIndex;
      return this._upwardSeg.compareTo(other._upwardSeg);
    },
    compareX: function compareX(seg0, seg1) {
      var compare0 = seg0.p0.compareTo(seg1.p0);
      if (compare0 !== 0) return compare0;
      return seg0.p1.compareTo(seg1.p1);
    },
    toString: function toString() {
      return this._upwardSeg.toString();
    },
    interfaces_: function interfaces_() {
      return [Comparable];
    },
    getClass: function getClass() {
      return DepthSegment;
    }
  });
  SubgraphDepthLocater.DepthSegment = DepthSegment;

  function OffsetCurveSetBuilder() {
    this._inputGeom = null;
    this._distance = null;
    this._curveBuilder = null;
    this._curveList = new ArrayList();
    var inputGeom = arguments[0],
        distance = arguments[1],
        curveBuilder = arguments[2];
    this._inputGeom = inputGeom;
    this._distance = distance;
    this._curveBuilder = curveBuilder;
  }
  extend(OffsetCurveSetBuilder.prototype, {
    addPoint: function addPoint(p) {
      if (this._distance <= 0.0) return null;
      var coord = p.getCoordinates();

      var curve = this._curveBuilder.getLineCurve(coord, this._distance);

      this.addCurve(curve, Location.EXTERIOR, Location.INTERIOR);
    },
    addPolygon: function addPolygon(p) {
      var offsetDistance = this._distance;
      var offsetSide = Position.LEFT;

      if (this._distance < 0.0) {
        offsetDistance = -this._distance;
        offsetSide = Position.RIGHT;
      }

      var shell = p.getExteriorRing();
      var shellCoord = CoordinateArrays.removeRepeatedPoints(shell.getCoordinates());
      if (this._distance < 0.0 && this.isErodedCompletely(shell, this._distance)) return null;
      if (this._distance <= 0.0 && shellCoord.length < 3) return null;
      this.addPolygonRing(shellCoord, offsetDistance, offsetSide, Location.EXTERIOR, Location.INTERIOR);

      for (var i = 0; i < p.getNumInteriorRing(); i++) {
        var hole = p.getInteriorRingN(i);
        var holeCoord = CoordinateArrays.removeRepeatedPoints(hole.getCoordinates());
        if (this._distance > 0.0 && this.isErodedCompletely(hole, -this._distance)) continue;
        this.addPolygonRing(holeCoord, offsetDistance, Position.opposite(offsetSide), Location.INTERIOR, Location.EXTERIOR);
      }
    },
    isTriangleErodedCompletely: function isTriangleErodedCompletely(triangleCoord, bufferDistance) {
      var tri = new Triangle(triangleCoord[0], triangleCoord[1], triangleCoord[2]);
      var inCentre = tri.inCentre();
      var distToCentre = Distance.pointToSegment(inCentre, tri.p0, tri.p1);
      return distToCentre < Math.abs(bufferDistance);
    },
    addLineString: function addLineString(line) {
      if (this._distance <= 0.0 && !this._curveBuilder.getBufferParameters().isSingleSided()) return null;
      var coord = CoordinateArrays.removeRepeatedPoints(line.getCoordinates());

      var curve = this._curveBuilder.getLineCurve(coord, this._distance);

      this.addCurve(curve, Location.EXTERIOR, Location.INTERIOR);
    },
    addCurve: function addCurve(coord, leftLoc, rightLoc) {
      if (coord === null || coord.length < 2) return null;
      var e = new NodedSegmentString(coord, new Label(0, Location.BOUNDARY, leftLoc, rightLoc));

      this._curveList.add(e);
    },
    getCurves: function getCurves() {
      this.add(this._inputGeom);
      return this._curveList;
    },
    addPolygonRing: function addPolygonRing(coord, offsetDistance, side, cwLeftLoc, cwRightLoc) {
      if (offsetDistance === 0.0 && coord.length < LinearRing.MINIMUM_VALID_SIZE) return null;
      var leftLoc = cwLeftLoc;
      var rightLoc = cwRightLoc;

      if (coord.length >= LinearRing.MINIMUM_VALID_SIZE && Orientation.isCCW(coord)) {
        leftLoc = cwRightLoc;
        rightLoc = cwLeftLoc;
        side = Position.opposite(side);
      }

      var curve = this._curveBuilder.getRingCurve(coord, side, offsetDistance);

      this.addCurve(curve, leftLoc, rightLoc);
    },
    add: function add(g) {
      if (g.isEmpty()) return null;
      if (g instanceof Polygon) this.addPolygon(g);else if (g instanceof LineString) this.addLineString(g);else if (g instanceof Point) this.addPoint(g);else if (g instanceof MultiPoint) this.addCollection(g);else if (g instanceof MultiLineString) this.addCollection(g);else if (g instanceof MultiPolygon) this.addCollection(g);else if (g instanceof GeometryCollection) this.addCollection(g);else throw new UnsupportedOperationException(g.getClass().getName());
    },
    isErodedCompletely: function isErodedCompletely(ring, bufferDistance) {
      var ringCoord = ring.getCoordinates();
      if (ringCoord.length < 4) return bufferDistance < 0;
      if (ringCoord.length === 4) return this.isTriangleErodedCompletely(ringCoord, bufferDistance);
      var env = ring.getEnvelopeInternal();
      var envMinDimension = Math.min(env.getHeight(), env.getWidth());
      if (bufferDistance < 0.0 && 2 * Math.abs(bufferDistance) > envMinDimension) return true;
      return false;
    },
    addCollection: function addCollection(gc) {
      for (var i = 0; i < gc.getNumGeometries(); i++) {
        var g = gc.getGeometryN(i);
        this.add(g);
      }
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return OffsetCurveSetBuilder;
    }
  });

  function EdgeEndStar() {
    this._edgeMap = new TreeMap();
    this._edgeList = null;
    this._ptInAreaLocation = [Location.NONE, Location.NONE];
  }
  extend(EdgeEndStar.prototype, {
    getNextCW: function getNextCW(ee) {
      this.getEdges();

      var i = this._edgeList.indexOf(ee);

      var iNextCW = i - 1;
      if (i === 0) iNextCW = this._edgeList.size() - 1;
      return this._edgeList.get(iNextCW);
    },
    propagateSideLabels: function propagateSideLabels(geomIndex) {
      var startLoc = Location.NONE;

      for (var it = this.iterator(); it.hasNext();) {
        var e = it.next();
        var label = e.getLabel();
        if (label.isArea(geomIndex) && label.getLocation(geomIndex, Position.LEFT) !== Location.NONE) startLoc = label.getLocation(geomIndex, Position.LEFT);
      }

      if (startLoc === Location.NONE) return null;
      var currLoc = startLoc;

      for (var it = this.iterator(); it.hasNext();) {
        var e = it.next();
        var label = e.getLabel();
        if (label.getLocation(geomIndex, Position.ON) === Location.NONE) label.setLocation(geomIndex, Position.ON, currLoc);

        if (label.isArea(geomIndex)) {
          var leftLoc = label.getLocation(geomIndex, Position.LEFT);
          var rightLoc = label.getLocation(geomIndex, Position.RIGHT);

          if (rightLoc !== Location.NONE) {
            if (rightLoc !== currLoc) throw new TopologyException("side location conflict", e.getCoordinate());

            if (leftLoc === Location.NONE) {
              Assert.shouldNeverReachHere("found single null side (at " + e.getCoordinate() + ")");
            }

            currLoc = leftLoc;
          } else {
            Assert.isTrue(label.getLocation(geomIndex, Position.LEFT) === Location.NONE, "found single null side");
            label.setLocation(geomIndex, Position.RIGHT, currLoc);
            label.setLocation(geomIndex, Position.LEFT, currLoc);
          }
        }
      }
    },
    getCoordinate: function getCoordinate() {
      var it = this.iterator();
      if (!it.hasNext()) return null;
      var e = it.next();
      return e.getCoordinate();
    },
    print: function print(out) {
      System.out.println("EdgeEndStar:   " + this.getCoordinate());

      for (var it = this.iterator(); it.hasNext();) {
        var e = it.next();
        e.print(out);
      }
    },
    isAreaLabelsConsistent: function isAreaLabelsConsistent(geomGraph) {
      this.computeEdgeEndLabels(geomGraph.getBoundaryNodeRule());
      return this.checkAreaLabelsConsistent(0);
    },
    checkAreaLabelsConsistent: function checkAreaLabelsConsistent(geomIndex) {
      var edges = this.getEdges();
      if (edges.size() <= 0) return true;
      var lastEdgeIndex = edges.size() - 1;
      var startLabel = edges.get(lastEdgeIndex).getLabel();
      var startLoc = startLabel.getLocation(geomIndex, Position.LEFT);
      Assert.isTrue(startLoc !== Location.NONE, "Found unlabelled area edge");
      var currLoc = startLoc;

      for (var it = this.iterator(); it.hasNext();) {
        var e = it.next();
        var label = e.getLabel();
        Assert.isTrue(label.isArea(geomIndex), "Found non-area edge");
        var leftLoc = label.getLocation(geomIndex, Position.LEFT);
        var rightLoc = label.getLocation(geomIndex, Position.RIGHT);

        if (leftLoc === rightLoc) {
          return false;
        }

        if (rightLoc !== currLoc) {
          return false;
        }

        currLoc = leftLoc;
      }

      return true;
    },
    findIndex: function findIndex(eSearch) {
      this.iterator();

      for (var i = 0; i < this._edgeList.size(); i++) {
        var e = this._edgeList.get(i);

        if (e === eSearch) return i;
      }

      return -1;
    },
    iterator: function iterator() {
      return this.getEdges().iterator();
    },
    getEdges: function getEdges() {
      if (this._edgeList === null) {
        this._edgeList = new ArrayList(this._edgeMap.values());
      }

      return this._edgeList;
    },
    getLocation: function getLocation(geomIndex, p, geom) {
      if (this._ptInAreaLocation[geomIndex] === Location.NONE) {
        this._ptInAreaLocation[geomIndex] = SimplePointInAreaLocator.locate(p, geom[geomIndex].getGeometry());
      }

      return this._ptInAreaLocation[geomIndex];
    },
    toString: function toString() {
      var buf = new StringBuffer();
      buf.append("EdgeEndStar:   " + this.getCoordinate());
      buf.append("\n");

      for (var it = this.iterator(); it.hasNext();) {
        var e = it.next();
        buf.append(e);
        buf.append("\n");
      }

      return buf.toString();
    },
    computeEdgeEndLabels: function computeEdgeEndLabels(boundaryNodeRule) {
      for (var it = this.iterator(); it.hasNext();) {
        var ee = it.next();
        ee.computeLabel(boundaryNodeRule);
      }
    },
    computeLabelling: function computeLabelling(geomGraph) {
      this.computeEdgeEndLabels(geomGraph[0].getBoundaryNodeRule());
      this.propagateSideLabels(0);
      this.propagateSideLabels(1);
      var hasDimensionalCollapseEdge = [false, false];

      for (var it = this.iterator(); it.hasNext();) {
        var e = it.next();
        var label = e.getLabel();

        for (var geomi = 0; geomi < 2; geomi++) {
          if (label.isLine(geomi) && label.getLocation(geomi) === Location.BOUNDARY) hasDimensionalCollapseEdge[geomi] = true;
        }
      }

      for (var it = this.iterator(); it.hasNext();) {
        var e = it.next();
        var label = e.getLabel();

        for (var geomi = 0; geomi < 2; geomi++) {
          if (label.isAnyNull(geomi)) {
            var loc = Location.NONE;

            if (hasDimensionalCollapseEdge[geomi]) {
              loc = Location.EXTERIOR;
            } else {
              var p = e.getCoordinate();
              loc = this.getLocation(geomi, p, geomGraph);
            }

            label.setAllLocationsIfNull(geomi, loc);
          }
        }
      }
    },
    getDegree: function getDegree() {
      return this._edgeMap.size();
    },
    insertEdgeEnd: function insertEdgeEnd(e, obj) {
      this._edgeMap.put(e, obj);

      this._edgeList = null;
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return EdgeEndStar;
    }
  });

  function DirectedEdgeStar() {
    EdgeEndStar.apply(this);
    this._resultAreaEdgeList = null;
    this._label = null;
    this._SCANNING_FOR_INCOMING = 1;
    this._LINKING_TO_OUTGOING = 2;
  }
  inherits(DirectedEdgeStar, EdgeEndStar);
  extend(DirectedEdgeStar.prototype, {
    linkResultDirectedEdges: function linkResultDirectedEdges() {
      this.getResultAreaEdges();
      var firstOut = null;
      var incoming = null;
      var state = this._SCANNING_FOR_INCOMING;

      for (var i = 0; i < this._resultAreaEdgeList.size(); i++) {
        var nextOut = this._resultAreaEdgeList.get(i);

        var nextIn = nextOut.getSym();
        if (!nextOut.getLabel().isArea()) continue;
        if (firstOut === null && nextOut.isInResult()) firstOut = nextOut;

        switch (state) {
          case this._SCANNING_FOR_INCOMING:
            if (!nextIn.isInResult()) continue;
            incoming = nextIn;
            state = this._LINKING_TO_OUTGOING;
            break;

          case this._LINKING_TO_OUTGOING:
            if (!nextOut.isInResult()) continue;
            incoming.setNext(nextOut);
            state = this._SCANNING_FOR_INCOMING;
            break;
        }
      }

      if (state === this._LINKING_TO_OUTGOING) {
        if (firstOut === null) throw new TopologyException("no outgoing dirEdge found", this.getCoordinate());
        Assert.isTrue(firstOut.isInResult(), "unable to link last incoming dirEdge");
        incoming.setNext(firstOut);
      }
    },
    insert: function insert(ee) {
      var de = ee;
      this.insertEdgeEnd(de, de);
    },
    getRightmostEdge: function getRightmostEdge() {
      var edges = this.getEdges();
      var size = edges.size();
      if (size < 1) return null;
      var de0 = edges.get(0);
      if (size === 1) return de0;
      var deLast = edges.get(size - 1);
      var quad0 = de0.getQuadrant();
      var quad1 = deLast.getQuadrant();
      if (Quadrant.isNorthern(quad0) && Quadrant.isNorthern(quad1)) return de0;else if (!Quadrant.isNorthern(quad0) && !Quadrant.isNorthern(quad1)) return deLast;else {
        if (de0.getDy() !== 0) return de0;else if (deLast.getDy() !== 0) return deLast;
      }
      Assert.shouldNeverReachHere("found two horizontal edges incident on node");
      return null;
    },
    print: function print(out) {
      System.out.println("DirectedEdgeStar: " + this.getCoordinate());

      for (var it = this.iterator(); it.hasNext();) {
        var de = it.next();
        out.print("out ");
        de.print(out);
        out.println();
        out.print("in ");
        de.getSym().print(out);
        out.println();
      }
    },
    getResultAreaEdges: function getResultAreaEdges() {
      if (this._resultAreaEdgeList !== null) return this._resultAreaEdgeList;
      this._resultAreaEdgeList = new ArrayList();

      for (var it = this.iterator(); it.hasNext();) {
        var de = it.next();
        if (de.isInResult() || de.getSym().isInResult()) this._resultAreaEdgeList.add(de);
      }

      return this._resultAreaEdgeList;
    },
    updateLabelling: function updateLabelling(nodeLabel) {
      for (var it = this.iterator(); it.hasNext();) {
        var de = it.next();
        var label = de.getLabel();
        label.setAllLocationsIfNull(0, nodeLabel.getLocation(0));
        label.setAllLocationsIfNull(1, nodeLabel.getLocation(1));
      }
    },
    linkAllDirectedEdges: function linkAllDirectedEdges() {
      this.getEdges();
      var prevOut = null;
      var firstIn = null;

      for (var i = this._edgeList.size() - 1; i >= 0; i--) {
        var nextOut = this._edgeList.get(i);

        var nextIn = nextOut.getSym();
        if (firstIn === null) firstIn = nextIn;
        if (prevOut !== null) nextIn.setNext(prevOut);
        prevOut = nextOut;
      }

      firstIn.setNext(prevOut);
    },
    computeDepths: function computeDepths() {
      if (arguments.length === 1) {
        var de = arguments[0];
        var edgeIndex = this.findIndex(de);
        var label = de.getLabel();
        var startDepth = de.getDepth(Position.LEFT);
        var targetLastDepth = de.getDepth(Position.RIGHT);
        var nextDepth = this.computeDepths(edgeIndex + 1, this._edgeList.size(), startDepth);
        var lastDepth = this.computeDepths(0, edgeIndex, nextDepth);
        if (lastDepth !== targetLastDepth) throw new TopologyException("depth mismatch at " + de.getCoordinate());
      } else if (arguments.length === 3) {
        var startIndex = arguments[0],
            endIndex = arguments[1],
            _startDepth = arguments[2];
        var currDepth = _startDepth;

        for (var i = startIndex; i < endIndex; i++) {
          var nextDe = this._edgeList.get(i);

          var label = nextDe.getLabel();
          nextDe.setEdgeDepths(Position.RIGHT, currDepth);
          currDepth = nextDe.getDepth(Position.LEFT);
        }

        return currDepth;
      }
    },
    mergeSymLabels: function mergeSymLabels() {
      for (var it = this.iterator(); it.hasNext();) {
        var de = it.next();
        var label = de.getLabel();
        label.merge(de.getSym().getLabel());
      }
    },
    linkMinimalDirectedEdges: function linkMinimalDirectedEdges(er) {
      var firstOut = null;
      var incoming = null;
      var state = this._SCANNING_FOR_INCOMING;

      for (var i = this._resultAreaEdgeList.size() - 1; i >= 0; i--) {
        var nextOut = this._resultAreaEdgeList.get(i);

        var nextIn = nextOut.getSym();
        if (firstOut === null && nextOut.getEdgeRing() === er) firstOut = nextOut;

        switch (state) {
          case this._SCANNING_FOR_INCOMING:
            if (nextIn.getEdgeRing() !== er) continue;
            incoming = nextIn;
            state = this._LINKING_TO_OUTGOING;
            break;

          case this._LINKING_TO_OUTGOING:
            if (nextOut.getEdgeRing() !== er) continue;
            incoming.setNextMin(nextOut);
            state = this._SCANNING_FOR_INCOMING;
            break;
        }
      }

      if (state === this._LINKING_TO_OUTGOING) {
        Assert.isTrue(firstOut !== null, "found null for first outgoing dirEdge");
        Assert.isTrue(firstOut.getEdgeRing() === er, "unable to link last incoming dirEdge");
        incoming.setNextMin(firstOut);
      }
    },
    getOutgoingDegree: function getOutgoingDegree() {
      if (arguments.length === 0) {
        var degree = 0;

        for (var it = this.iterator(); it.hasNext();) {
          var de = it.next();
          if (de.isInResult()) degree++;
        }

        return degree;
      } else if (arguments.length === 1) {
        var er = arguments[0];
        var degree = 0;

        for (var it = this.iterator(); it.hasNext();) {
          var de = it.next();
          if (de.getEdgeRing() === er) degree++;
        }

        return degree;
      }
    },
    getLabel: function getLabel() {
      return this._label;
    },
    findCoveredLineEdges: function findCoveredLineEdges() {
      var startLoc = Location.NONE;

      for (var it = this.iterator(); it.hasNext();) {
        var nextOut = it.next();
        var nextIn = nextOut.getSym();

        if (!nextOut.isLineEdge()) {
          if (nextOut.isInResult()) {
            startLoc = Location.INTERIOR;
            break;
          }

          if (nextIn.isInResult()) {
            startLoc = Location.EXTERIOR;
            break;
          }
        }
      }

      if (startLoc === Location.NONE) return null;
      var currLoc = startLoc;

      for (var it = this.iterator(); it.hasNext();) {
        var nextOut = it.next();
        var nextIn = nextOut.getSym();

        if (nextOut.isLineEdge()) {
          nextOut.getEdge().setCovered(currLoc === Location.INTERIOR);
        } else {
          if (nextOut.isInResult()) currLoc = Location.EXTERIOR;
          if (nextIn.isInResult()) currLoc = Location.INTERIOR;
        }
      }
    },
    computeLabelling: function computeLabelling(geom) {
      EdgeEndStar.prototype.computeLabelling.call(this, geom);
      this._label = new Label(Location.NONE);

      for (var it = this.iterator(); it.hasNext();) {
        var ee = it.next();
        var e = ee.getEdge();
        var eLabel = e.getLabel();

        for (var i = 0; i < 2; i++) {
          var eLoc = eLabel.getLocation(i);
          if (eLoc === Location.INTERIOR || eLoc === Location.BOUNDARY) this._label.setLocation(i, Location.INTERIOR);
        }
      }
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return DirectedEdgeStar;
    }
  });

  function OverlayNodeFactory() {
    NodeFactory.apply(this);
  }
  inherits(OverlayNodeFactory, NodeFactory);
  extend(OverlayNodeFactory.prototype, {
    createNode: function createNode(coord) {
      return new Node$1(coord, new DirectedEdgeStar());
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return OverlayNodeFactory;
    }
  });

  function OrientedCoordinateArray() {
    this._pts = null;
    this._orientation = null;
    var pts = arguments[0];
    this._pts = pts;
    this._orientation = OrientedCoordinateArray.orientation(pts);
  }
  extend(OrientedCoordinateArray.prototype, {
    compareTo: function compareTo(o1) {
      var oca = o1;
      var comp = OrientedCoordinateArray.compareOriented(this._pts, this._orientation, oca._pts, oca._orientation);
      return comp;
    },
    interfaces_: function interfaces_() {
      return [Comparable];
    },
    getClass: function getClass() {
      return OrientedCoordinateArray;
    }
  });

  OrientedCoordinateArray.orientation = function (pts) {
    return CoordinateArrays.increasingDirection(pts) === 1;
  };

  OrientedCoordinateArray.compareOriented = function (pts1, orientation1, pts2, orientation2) {
    var dir1 = orientation1 ? 1 : -1;
    var dir2 = orientation2 ? 1 : -1;
    var limit1 = orientation1 ? pts1.length : -1;
    var limit2 = orientation2 ? pts2.length : -1;
    var i1 = orientation1 ? 0 : pts1.length - 1;
    var i2 = orientation2 ? 0 : pts2.length - 1;

    while (true) {
      var compPt = pts1[i1].compareTo(pts2[i2]);
      if (compPt !== 0) return compPt;
      i1 += dir1;
      i2 += dir2;
      var done1 = i1 === limit1;
      var done2 = i2 === limit2;
      if (done1 && !done2) return -1;
      if (!done1 && done2) return 1;
      if (done1 && done2) return 0;
    }
  };

  function EdgeList() {
    this._edges = new ArrayList();
    this._ocaMap = new TreeMap();
  }
  extend(EdgeList.prototype, {
    print: function print(out) {
      out.print("MULTILINESTRING ( ");

      for (var j = 0; j < this._edges.size(); j++) {
        var e = this._edges.get(j);

        if (j > 0) out.print(",");
        out.print("(");
        var pts = e.getCoordinates();

        for (var i = 0; i < pts.length; i++) {
          if (i > 0) out.print(",");
          out.print(pts[i].x + " " + pts[i].y);
        }

        out.println(")");
      }

      out.print(")  ");
    },
    addAll: function addAll(edgeColl) {
      for (var i = edgeColl.iterator(); i.hasNext();) {
        this.add(i.next());
      }
    },
    findEdgeIndex: function findEdgeIndex(e) {
      for (var i = 0; i < this._edges.size(); i++) {
        if (this._edges.get(i).equals(e)) return i;
      }

      return -1;
    },
    iterator: function iterator() {
      return this._edges.iterator();
    },
    getEdges: function getEdges() {
      return this._edges;
    },
    get: function get(i) {
      return this._edges.get(i);
    },
    findEqualEdge: function findEqualEdge(e) {
      var oca = new OrientedCoordinateArray(e.getCoordinates());

      var matchEdge = this._ocaMap.get(oca);

      return matchEdge;
    },
    add: function add(e) {
      this._edges.add(e);

      var oca = new OrientedCoordinateArray(e.getCoordinates());

      this._ocaMap.put(oca, e);
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return EdgeList;
    }
  });

  function SegmentIntersector$1() {}
  extend(SegmentIntersector$1.prototype, {
    processIntersections: function processIntersections(e0, segIndex0, e1, segIndex1) {},
    isDone: function isDone() {},
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return SegmentIntersector$1;
    }
  });

  function IntersectionAdder() {
    this._hasIntersection = false;
    this._hasProper = false;
    this._hasProperInterior = false;
    this._hasInterior = false;
    this._properIntersectionPoint = null;
    this._li = null;
    this._isSelfIntersection = null;
    this.numIntersections = 0;
    this.numInteriorIntersections = 0;
    this.numProperIntersections = 0;
    this.numTests = 0;
    var li = arguments[0];
    this._li = li;
  }
  extend(IntersectionAdder.prototype, {
    isTrivialIntersection: function isTrivialIntersection(e0, segIndex0, e1, segIndex1) {
      if (e0 === e1) {
        if (this._li.getIntersectionNum() === 1) {
          if (IntersectionAdder.isAdjacentSegments(segIndex0, segIndex1)) return true;

          if (e0.isClosed()) {
            var maxSegIndex = e0.size() - 1;

            if (segIndex0 === 0 && segIndex1 === maxSegIndex || segIndex1 === 0 && segIndex0 === maxSegIndex) {
              return true;
            }
          }
        }
      }

      return false;
    },
    getProperIntersectionPoint: function getProperIntersectionPoint() {
      return this._properIntersectionPoint;
    },
    hasProperInteriorIntersection: function hasProperInteriorIntersection() {
      return this._hasProperInterior;
    },
    getLineIntersector: function getLineIntersector() {
      return this._li;
    },
    hasProperIntersection: function hasProperIntersection() {
      return this._hasProper;
    },
    processIntersections: function processIntersections(e0, segIndex0, e1, segIndex1) {
      if (e0 === e1 && segIndex0 === segIndex1) return null;
      this.numTests++;
      var p00 = e0.getCoordinates()[segIndex0];
      var p01 = e0.getCoordinates()[segIndex0 + 1];
      var p10 = e1.getCoordinates()[segIndex1];
      var p11 = e1.getCoordinates()[segIndex1 + 1];

      this._li.computeIntersection(p00, p01, p10, p11);

      if (this._li.hasIntersection()) {
        this.numIntersections++;

        if (this._li.isInteriorIntersection()) {
          this.numInteriorIntersections++;
          this._hasInterior = true;
        }

        if (!this.isTrivialIntersection(e0, segIndex0, e1, segIndex1)) {
          this._hasIntersection = true;
          e0.addIntersections(this._li, segIndex0, 0);
          e1.addIntersections(this._li, segIndex1, 1);

          if (this._li.isProper()) {
            this.numProperIntersections++;
            this._hasProper = true;
            this._hasProperInterior = true;
          }
        }
      }
    },
    hasIntersection: function hasIntersection() {
      return this._hasIntersection;
    },
    isDone: function isDone() {
      return false;
    },
    hasInteriorIntersection: function hasInteriorIntersection() {
      return this._hasInterior;
    },
    interfaces_: function interfaces_() {
      return [SegmentIntersector$1];
    },
    getClass: function getClass() {
      return IntersectionAdder;
    }
  });

  IntersectionAdder.isAdjacentSegments = function (i1, i2) {
    return Math.abs(i1 - i2) === 1;
  };

  function BufferBuilder() {
    this._bufParams = null;
    this._workingPrecisionModel = null;
    this._workingNoder = null;
    this._geomFact = null;
    this._graph = null;
    this._edgeList = new EdgeList();
    var bufParams = arguments[0];
    this._bufParams = bufParams;
  }
  extend(BufferBuilder.prototype, {
    setWorkingPrecisionModel: function setWorkingPrecisionModel(pm) {
      this._workingPrecisionModel = pm;
    },
    insertUniqueEdge: function insertUniqueEdge(e) {
      var existingEdge = this._edgeList.findEqualEdge(e);

      if (existingEdge !== null) {
        var existingLabel = existingEdge.getLabel();
        var labelToMerge = e.getLabel();

        if (!existingEdge.isPointwiseEqual(e)) {
          labelToMerge = new Label(e.getLabel());
          labelToMerge.flip();
        }

        existingLabel.merge(labelToMerge);
        var mergeDelta = BufferBuilder.depthDelta(labelToMerge);
        var existingDelta = existingEdge.getDepthDelta();
        var newDelta = existingDelta + mergeDelta;
        existingEdge.setDepthDelta(newDelta);
      } else {
        this._edgeList.add(e);

        e.setDepthDelta(BufferBuilder.depthDelta(e.getLabel()));
      }
    },
    buildSubgraphs: function buildSubgraphs(subgraphList, polyBuilder) {
      var processedGraphs = new ArrayList();

      for (var i = subgraphList.iterator(); i.hasNext();) {
        var subgraph = i.next();
        var p = subgraph.getRightmostCoordinate();
        var locater = new SubgraphDepthLocater(processedGraphs);
        var outsideDepth = locater.getDepth(p);
        subgraph.computeDepth(outsideDepth);
        subgraph.findResultEdges();
        processedGraphs.add(subgraph);
        polyBuilder.add(subgraph.getDirectedEdges(), subgraph.getNodes());
      }
    },
    createSubgraphs: function createSubgraphs(graph) {
      var subgraphList = new ArrayList();

      for (var i = graph.getNodes().iterator(); i.hasNext();) {
        var node = i.next();

        if (!node.isVisited()) {
          var subgraph = new BufferSubgraph();
          subgraph.create(node);
          subgraphList.add(subgraph);
        }
      }

      Collections.sort(subgraphList, Collections.reverseOrder());
      return subgraphList;
    },
    createEmptyResultGeometry: function createEmptyResultGeometry() {
      var emptyGeom = this._geomFact.createPolygon();

      return emptyGeom;
    },
    getNoder: function getNoder(precisionModel) {
      if (this._workingNoder !== null) return this._workingNoder;
      var noder = new MCIndexNoder();
      var li = new RobustLineIntersector();
      li.setPrecisionModel(precisionModel);
      noder.setSegmentIntersector(new IntersectionAdder(li));
      return noder;
    },
    buffer: function buffer(g, distance) {
      var precisionModel = this._workingPrecisionModel;
      if (precisionModel === null) precisionModel = g.getPrecisionModel();
      this._geomFact = g.getFactory();
      var curveBuilder = new OffsetCurveBuilder(precisionModel, this._bufParams);
      var curveSetBuilder = new OffsetCurveSetBuilder(g, distance, curveBuilder);
      var bufferSegStrList = curveSetBuilder.getCurves();

      if (bufferSegStrList.size() <= 0) {
        return this.createEmptyResultGeometry();
      }

      this.computeNodedEdges(bufferSegStrList, precisionModel);
      this._graph = new PlanarGraph(new OverlayNodeFactory());

      this._graph.addEdges(this._edgeList.getEdges());

      var subgraphList = this.createSubgraphs(this._graph);
      var polyBuilder = new PolygonBuilder(this._geomFact);
      this.buildSubgraphs(subgraphList, polyBuilder);
      var resultPolyList = polyBuilder.getPolygons();

      if (resultPolyList.size() <= 0) {
        return this.createEmptyResultGeometry();
      }

      var resultGeom = this._geomFact.buildGeometry(resultPolyList);

      return resultGeom;
    },
    computeNodedEdges: function computeNodedEdges(bufferSegStrList, precisionModel) {
      var noder = this.getNoder(precisionModel);
      noder.computeNodes(bufferSegStrList);
      var nodedSegStrings = noder.getNodedSubstrings();

      for (var i = nodedSegStrings.iterator(); i.hasNext();) {
        var segStr = i.next();
        var pts = segStr.getCoordinates();
        if (pts.length === 2 && pts[0].equals2D(pts[1])) continue;
        var oldLabel = segStr.getData();
        var edge = new Edge(segStr.getCoordinates(), new Label(oldLabel));
        this.insertUniqueEdge(edge);
      }
    },
    setNoder: function setNoder(noder) {
      this._workingNoder = noder;
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return BufferBuilder;
    }
  });

  BufferBuilder.depthDelta = function (label) {
    var lLoc = label.getLocation(0, Position.LEFT);
    var rLoc = label.getLocation(0, Position.RIGHT);
    if (lLoc === Location.INTERIOR && rLoc === Location.EXTERIOR) return 1;else if (lLoc === Location.EXTERIOR && rLoc === Location.INTERIOR) return -1;
    return 0;
  };

  BufferBuilder.convertSegStrings = function (it) {
    var fact = new GeometryFactory();
    var lines = new ArrayList();

    while (it.hasNext()) {
      var ss = it.next();
      var line = fact.createLineString(ss.getCoordinates());
      lines.add(line);
    }

    return fact.buildGeometry(lines);
  };

  function NodingValidator() {
    this._li = new RobustLineIntersector();
    this._segStrings = null;
    var segStrings = arguments[0];
    this._segStrings = segStrings;
  }
  extend(NodingValidator.prototype, {
    checkEndPtVertexIntersections: function checkEndPtVertexIntersections() {
      if (arguments.length === 0) {
        for (var i = this._segStrings.iterator(); i.hasNext();) {
          var ss = i.next();
          var pts = ss.getCoordinates();
          this.checkEndPtVertexIntersections(pts[0], this._segStrings);
          this.checkEndPtVertexIntersections(pts[pts.length - 1], this._segStrings);
        }
      } else if (arguments.length === 2) {
        var testPt = arguments[0],
            segStrings = arguments[1];

        for (var i = segStrings.iterator(); i.hasNext();) {
          var ss = i.next();
          var pts = ss.getCoordinates();

          for (var j = 1; j < pts.length - 1; j++) {
            if (pts[j].equals(testPt)) throw new RuntimeException("found endpt/interior pt intersection at index " + j + " :pt " + testPt);
          }
        }
      }
    },
    checkInteriorIntersections: function checkInteriorIntersections() {
      if (arguments.length === 0) {
        for (var i = this._segStrings.iterator(); i.hasNext();) {
          var ss0 = i.next();

          for (var j = this._segStrings.iterator(); j.hasNext();) {
            var ss1 = j.next();
            this.checkInteriorIntersections(ss0, ss1);
          }
        }
      } else if (arguments.length === 2) {
        var _ss = arguments[0],
            _ss2 = arguments[1];

        var pts0 = _ss.getCoordinates();

        var pts1 = _ss2.getCoordinates();

        for (var i0 = 0; i0 < pts0.length - 1; i0++) {
          for (var i1 = 0; i1 < pts1.length - 1; i1++) {
            this.checkInteriorIntersections(_ss, i0, _ss2, i1);
          }
        }
      } else if (arguments.length === 4) {
        var e0 = arguments[0],
            segIndex0 = arguments[1],
            e1 = arguments[2],
            segIndex1 = arguments[3];
        if (e0 === e1 && segIndex0 === segIndex1) return null;
        var p00 = e0.getCoordinates()[segIndex0];
        var p01 = e0.getCoordinates()[segIndex0 + 1];
        var p10 = e1.getCoordinates()[segIndex1];
        var p11 = e1.getCoordinates()[segIndex1 + 1];

        this._li.computeIntersection(p00, p01, p10, p11);

        if (this._li.hasIntersection()) {
          if (this._li.isProper() || this.hasInteriorIntersection(this._li, p00, p01) || this.hasInteriorIntersection(this._li, p10, p11)) {
            throw new RuntimeException("found non-noded intersection at " + p00 + "-" + p01 + " and " + p10 + "-" + p11);
          }
        }
      }
    },
    checkValid: function checkValid() {
      this.checkEndPtVertexIntersections();
      this.checkInteriorIntersections();
      this.checkCollapses();
    },
    checkCollapses: function checkCollapses() {
      if (arguments.length === 0) {
        for (var i = this._segStrings.iterator(); i.hasNext();) {
          var ss = i.next();
          this.checkCollapses(ss);
        }
      } else if (arguments.length === 1) {
        var _ss3 = arguments[0];

        var pts = _ss3.getCoordinates();

        for (var i = 0; i < pts.length - 2; i++) {
          this.checkCollapse(pts[i], pts[i + 1], pts[i + 2]);
        }
      }
    },
    hasInteriorIntersection: function hasInteriorIntersection(li, p0, p1) {
      for (var i = 0; i < li.getIntersectionNum(); i++) {
        var intPt = li.getIntersection(i);
        if (!(intPt.equals(p0) || intPt.equals(p1))) return true;
      }

      return false;
    },
    checkCollapse: function checkCollapse(p0, p1, p2) {
      if (p0.equals(p2)) throw new RuntimeException("found non-noded collapse at " + NodingValidator.fact.createLineString([p0, p1, p2]));
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return NodingValidator;
    }
  });
  NodingValidator.fact = new GeometryFactory();

  function HotPixel() {
    this._li = null;
    this._pt = null;
    this._originalPt = null;
    this._ptScaled = null;
    this._p0Scaled = null;
    this._p1Scaled = null;
    this._scaleFactor = null;
    this._minx = null;
    this._maxx = null;
    this._miny = null;
    this._maxy = null;
    this._corner = new Array(4).fill(null);
    this._safeEnv = null;
    var pt = arguments[0],
        scaleFactor = arguments[1],
        li = arguments[2];
    this._originalPt = pt;
    this._pt = pt;
    this._scaleFactor = scaleFactor;
    this._li = li;
    if (scaleFactor <= 0) throw new IllegalArgumentException("Scale factor must be non-zero");

    if (scaleFactor !== 1.0) {
      this._pt = new Coordinate(this.scale(pt.x), this.scale(pt.y));
      this._p0Scaled = new Coordinate();
      this._p1Scaled = new Coordinate();
    }

    this.initCorners(this._pt);
  }
  extend(HotPixel.prototype, {
    intersectsScaled: function intersectsScaled(p0, p1) {
      var segMinx = Math.min(p0.x, p1.x);
      var segMaxx = Math.max(p0.x, p1.x);
      var segMiny = Math.min(p0.y, p1.y);
      var segMaxy = Math.max(p0.y, p1.y);
      var isOutsidePixelEnv = this._maxx < segMinx || this._minx > segMaxx || this._maxy < segMiny || this._miny > segMaxy;
      if (isOutsidePixelEnv) return false;
      var intersects = this.intersectsToleranceSquare(p0, p1);
      Assert.isTrue(!(isOutsidePixelEnv && intersects), "Found bad envelope test");
      return intersects;
    },
    initCorners: function initCorners(pt) {
      var tolerance = 0.5;
      this._minx = pt.x - tolerance;
      this._maxx = pt.x + tolerance;
      this._miny = pt.y - tolerance;
      this._maxy = pt.y + tolerance;
      this._corner[0] = new Coordinate(this._maxx, this._maxy);
      this._corner[1] = new Coordinate(this._minx, this._maxy);
      this._corner[2] = new Coordinate(this._minx, this._miny);
      this._corner[3] = new Coordinate(this._maxx, this._miny);
    },
    intersects: function intersects(p0, p1) {
      if (this._scaleFactor === 1.0) return this.intersectsScaled(p0, p1);
      this.copyScaled(p0, this._p0Scaled);
      this.copyScaled(p1, this._p1Scaled);
      return this.intersectsScaled(this._p0Scaled, this._p1Scaled);
    },
    scale: function scale(val) {
      return Math.round(val * this._scaleFactor);
    },
    getCoordinate: function getCoordinate() {
      return this._originalPt;
    },
    copyScaled: function copyScaled(p, pScaled) {
      pScaled.x = this.scale(p.x);
      pScaled.y = this.scale(p.y);
    },
    getSafeEnvelope: function getSafeEnvelope() {
      if (this._safeEnv === null) {
        var safeTolerance = HotPixel.SAFE_ENV_EXPANSION_FACTOR / this._scaleFactor;
        this._safeEnv = new Envelope(this._originalPt.x - safeTolerance, this._originalPt.x + safeTolerance, this._originalPt.y - safeTolerance, this._originalPt.y + safeTolerance);
      }

      return this._safeEnv;
    },
    intersectsPixelClosure: function intersectsPixelClosure(p0, p1) {
      this._li.computeIntersection(p0, p1, this._corner[0], this._corner[1]);

      if (this._li.hasIntersection()) return true;

      this._li.computeIntersection(p0, p1, this._corner[1], this._corner[2]);

      if (this._li.hasIntersection()) return true;

      this._li.computeIntersection(p0, p1, this._corner[2], this._corner[3]);

      if (this._li.hasIntersection()) return true;

      this._li.computeIntersection(p0, p1, this._corner[3], this._corner[0]);

      if (this._li.hasIntersection()) return true;
      return false;
    },
    intersectsToleranceSquare: function intersectsToleranceSquare(p0, p1) {
      var intersectsLeft = false;
      var intersectsBottom = false;

      this._li.computeIntersection(p0, p1, this._corner[0], this._corner[1]);

      if (this._li.isProper()) return true;

      this._li.computeIntersection(p0, p1, this._corner[1], this._corner[2]);

      if (this._li.isProper()) return true;
      if (this._li.hasIntersection()) intersectsLeft = true;

      this._li.computeIntersection(p0, p1, this._corner[2], this._corner[3]);

      if (this._li.isProper()) return true;
      if (this._li.hasIntersection()) intersectsBottom = true;

      this._li.computeIntersection(p0, p1, this._corner[3], this._corner[0]);

      if (this._li.isProper()) return true;
      if (intersectsLeft && intersectsBottom) return true;
      if (p0.equals(this._pt)) return true;
      if (p1.equals(this._pt)) return true;
      return false;
    },
    addSnappedNode: function addSnappedNode(segStr, segIndex) {
      var p0 = segStr.getCoordinate(segIndex);
      var p1 = segStr.getCoordinate(segIndex + 1);

      if (this.intersects(p0, p1)) {
        segStr.addIntersection(this.getCoordinate(), segIndex);
        return true;
      }

      return false;
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return HotPixel;
    }
  });
  HotPixel.SAFE_ENV_EXPANSION_FACTOR = 0.75;

  function MCIndexPointSnapper() {
    this._index = null;
    var index = arguments[0];
    this._index = index;
  }
  extend(MCIndexPointSnapper.prototype, {
    snap: function snap() {
      if (arguments.length === 1) {
        var hotPixel = arguments[0];
        return this.snap(hotPixel, null, -1);
      } else if (arguments.length === 3) {
        var _hotPixel = arguments[0],
            parentEdge = arguments[1],
            hotPixelVertexIndex = arguments[2];

        var pixelEnv = _hotPixel.getSafeEnvelope();

        var hotPixelSnapAction = new HotPixelSnapAction(_hotPixel, parentEdge, hotPixelVertexIndex);

        this._index.query(pixelEnv, {
          interfaces_: function interfaces_() {
            return [ItemVisitor];
          },
          visitItem: function visitItem(item) {
            var testChain = item;
            testChain.select(pixelEnv, hotPixelSnapAction);
          }
        });

        return hotPixelSnapAction.isNodeAdded();
      }
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return MCIndexPointSnapper;
    }
  });

  function HotPixelSnapAction() {
    MonotoneChainSelectAction.apply(this);
    this._hotPixel = null;
    this._parentEdge = null;
    this._hotPixelVertexIndex = null;
    this._isNodeAdded = false;
    var hotPixel = arguments[0],
        parentEdge = arguments[1],
        hotPixelVertexIndex = arguments[2];
    this._hotPixel = hotPixel;
    this._parentEdge = parentEdge;
    this._hotPixelVertexIndex = hotPixelVertexIndex;
  }

  inherits(HotPixelSnapAction, MonotoneChainSelectAction);
  extend(HotPixelSnapAction.prototype, {
    isNodeAdded: function isNodeAdded() {
      return this._isNodeAdded;
    },
    select: function select() {
      if (arguments.length === 2 && Number.isInteger(arguments[1]) && arguments[0] instanceof MonotoneChain) {
        var mc = arguments[0],
            startIndex = arguments[1];
        var ss = mc.getContext();

        if (this._parentEdge !== null) {
          if (ss === this._parentEdge && startIndex === this._hotPixelVertexIndex) return null;
        }

        this._isNodeAdded = this._hotPixel.addSnappedNode(ss, startIndex);
      } else return MonotoneChainSelectAction.prototype.select.apply(this, arguments);
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return HotPixelSnapAction;
    }
  });
  MCIndexPointSnapper.HotPixelSnapAction = HotPixelSnapAction;

  function InteriorIntersectionFinderAdder() {
    this._li = null;
    this._interiorIntersections = null;
    var li = arguments[0];
    this._li = li;
    this._interiorIntersections = new ArrayList();
  }
  extend(InteriorIntersectionFinderAdder.prototype, {
    processIntersections: function processIntersections(e0, segIndex0, e1, segIndex1) {
      if (e0 === e1 && segIndex0 === segIndex1) return null;
      var p00 = e0.getCoordinates()[segIndex0];
      var p01 = e0.getCoordinates()[segIndex0 + 1];
      var p10 = e1.getCoordinates()[segIndex1];
      var p11 = e1.getCoordinates()[segIndex1 + 1];

      this._li.computeIntersection(p00, p01, p10, p11);

      if (this._li.hasIntersection()) {
        if (this._li.isInteriorIntersection()) {
          for (var intIndex = 0; intIndex < this._li.getIntersectionNum(); intIndex++) {
            this._interiorIntersections.add(this._li.getIntersection(intIndex));
          }

          e0.addIntersections(this._li, segIndex0, 0);
          e1.addIntersections(this._li, segIndex1, 1);
        }
      }
    },
    isDone: function isDone() {
      return false;
    },
    getInteriorIntersections: function getInteriorIntersections() {
      return this._interiorIntersections;
    },
    interfaces_: function interfaces_() {
      return [SegmentIntersector$1];
    },
    getClass: function getClass() {
      return InteriorIntersectionFinderAdder;
    }
  });

  function MCIndexSnapRounder() {
    this._pm = null;
    this._li = null;
    this._scaleFactor = null;
    this._noder = null;
    this._pointSnapper = null;
    this._nodedSegStrings = null;
    var pm = arguments[0];
    this._pm = pm;
    this._li = new RobustLineIntersector();

    this._li.setPrecisionModel(pm);

    this._scaleFactor = pm.getScale();
  }
  extend(MCIndexSnapRounder.prototype, {
    checkCorrectness: function checkCorrectness(inputSegmentStrings) {
      var resultSegStrings = NodedSegmentString.getNodedSubstrings(inputSegmentStrings);
      var nv = new NodingValidator(resultSegStrings);

      try {
        nv.checkValid();
      } catch (ex) {
        if (ex instanceof Exception) {
          ex.printStackTrace();
        } else throw ex;
      } finally {}
    },
    getNodedSubstrings: function getNodedSubstrings() {
      return NodedSegmentString.getNodedSubstrings(this._nodedSegStrings);
    },
    snapRound: function snapRound(segStrings, li) {
      var intersections = this.findInteriorIntersections(segStrings, li);
      this.computeIntersectionSnaps(intersections);
      this.computeVertexSnaps(segStrings);
    },
    findInteriorIntersections: function findInteriorIntersections(segStrings, li) {
      var intFinderAdder = new InteriorIntersectionFinderAdder(li);

      this._noder.setSegmentIntersector(intFinderAdder);

      this._noder.computeNodes(segStrings);

      return intFinderAdder.getInteriorIntersections();
    },
    computeVertexSnaps: function computeVertexSnaps() {
      if (hasInterface(arguments[0], Collection)) {
        var edges = arguments[0];

        for (var i0 = edges.iterator(); i0.hasNext();) {
          var edge0 = i0.next();
          this.computeVertexSnaps(edge0);
        }
      } else if (arguments[0] instanceof NodedSegmentString) {
        var e = arguments[0];
        var pts0 = e.getCoordinates();

        for (var i = 0; i < pts0.length; i++) {
          var hotPixel = new HotPixel(pts0[i], this._scaleFactor, this._li);

          var isNodeAdded = this._pointSnapper.snap(hotPixel, e, i);

          if (isNodeAdded) {
            e.addIntersection(pts0[i], i);
          }
        }
      }
    },
    computeNodes: function computeNodes(inputSegmentStrings) {
      this._nodedSegStrings = inputSegmentStrings;
      this._noder = new MCIndexNoder();
      this._pointSnapper = new MCIndexPointSnapper(this._noder.getIndex());
      this.snapRound(inputSegmentStrings, this._li);
    },
    computeIntersectionSnaps: function computeIntersectionSnaps(snapPts) {
      for (var it = snapPts.iterator(); it.hasNext();) {
        var snapPt = it.next();
        var hotPixel = new HotPixel(snapPt, this._scaleFactor, this._li);

        this._pointSnapper.snap(hotPixel);
      }
    },
    interfaces_: function interfaces_() {
      return [Noder];
    },
    getClass: function getClass() {
      return MCIndexSnapRounder;
    }
  });

  function BufferOp() {
    this._argGeom = null;
    this._distance = null;
    this._bufParams = new BufferParameters();
    this._resultGeometry = null;
    this._saveException = null;

    if (arguments.length === 1) {
      var g = arguments[0];
      this._argGeom = g;
    } else if (arguments.length === 2) {
      var _g = arguments[0],
          bufParams = arguments[1];
      this._argGeom = _g;
      this._bufParams = bufParams;
    }
  }
  extend(BufferOp.prototype, {
    bufferFixedPrecision: function bufferFixedPrecision(fixedPM) {
      var noder = new ScaledNoder(new MCIndexSnapRounder(new PrecisionModel(1.0)), fixedPM.getScale());
      var bufBuilder = new BufferBuilder(this._bufParams);
      bufBuilder.setWorkingPrecisionModel(fixedPM);
      bufBuilder.setNoder(noder);
      this._resultGeometry = bufBuilder.buffer(this._argGeom, this._distance);
    },
    bufferReducedPrecision: function bufferReducedPrecision() {
      if (arguments.length === 0) {
        for (var precDigits = BufferOp.MAX_PRECISION_DIGITS; precDigits >= 0; precDigits--) {
          try {
            this.bufferReducedPrecision(precDigits);
          } catch (ex) {
            if (ex instanceof TopologyException) {
              this._saveException = ex;
            } else throw ex;
          } finally {}

          if (this._resultGeometry !== null) return null;
        }

        throw this._saveException;
      } else if (arguments.length === 1) {
        var precisionDigits = arguments[0];
        var sizeBasedScaleFactor = BufferOp.precisionScaleFactor(this._argGeom, this._distance, precisionDigits);
        var fixedPM = new PrecisionModel(sizeBasedScaleFactor);
        this.bufferFixedPrecision(fixedPM);
      }
    },
    computeGeometry: function computeGeometry() {
      this.bufferOriginalPrecision();
      if (this._resultGeometry !== null) return null;

      var argPM = this._argGeom.getFactory().getPrecisionModel();

      if (argPM.getType() === PrecisionModel.FIXED) this.bufferFixedPrecision(argPM);else this.bufferReducedPrecision();
    },
    setQuadrantSegments: function setQuadrantSegments(quadrantSegments) {
      this._bufParams.setQuadrantSegments(quadrantSegments);
    },
    bufferOriginalPrecision: function bufferOriginalPrecision() {
      try {
        var bufBuilder = new BufferBuilder(this._bufParams);
        this._resultGeometry = bufBuilder.buffer(this._argGeom, this._distance);
      } catch (ex) {
        if (ex instanceof RuntimeException) {
          this._saveException = ex;
        } else throw ex;
      } finally {}
    },
    getResultGeometry: function getResultGeometry(distance) {
      this._distance = distance;
      this.computeGeometry();
      return this._resultGeometry;
    },
    setEndCapStyle: function setEndCapStyle(endCapStyle) {
      this._bufParams.setEndCapStyle(endCapStyle);
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return BufferOp;
    }
  });

  BufferOp.bufferOp = function () {
    if (arguments.length === 2) {
      var g = arguments[0],
          distance = arguments[1];
      var gBuf = new BufferOp(g);
      var geomBuf = gBuf.getResultGeometry(distance);
      return geomBuf;
    } else if (arguments.length === 3) {
      if (Number.isInteger(arguments[2]) && arguments[0] instanceof Geometry && typeof arguments[1] === "number") {
        var _g2 = arguments[0],
            _distance = arguments[1],
            quadrantSegments = arguments[2];
        var bufOp = new BufferOp(_g2);
        bufOp.setQuadrantSegments(quadrantSegments);
        var geomBuf = bufOp.getResultGeometry(_distance);
        return geomBuf;
      } else if (arguments[2] instanceof BufferParameters && arguments[0] instanceof Geometry && typeof arguments[1] === "number") {
        var _g3 = arguments[0],
            _distance2 = arguments[1],
            params = arguments[2];
        var bufOp = new BufferOp(_g3, params);
        var geomBuf = bufOp.getResultGeometry(_distance2);
        return geomBuf;
      }
    } else if (arguments.length === 4) {
      var _g4 = arguments[0],
          _distance3 = arguments[1],
          _quadrantSegments = arguments[2],
          endCapStyle = arguments[3];
      var bufOp = new BufferOp(_g4);
      bufOp.setQuadrantSegments(_quadrantSegments);
      bufOp.setEndCapStyle(endCapStyle);
      var geomBuf = bufOp.getResultGeometry(_distance3);
      return geomBuf;
    }
  };

  BufferOp.precisionScaleFactor = function (g, distance, maxPrecisionDigits) {
    var env = g.getEnvelopeInternal();
    var envMax = MathUtil.max(Math.abs(env.getMaxX()), Math.abs(env.getMaxY()), Math.abs(env.getMinX()), Math.abs(env.getMinY()));
    var expandByDistance = distance > 0.0 ? distance : 0.0;
    var bufEnvMax = envMax + 2 * expandByDistance;
    var bufEnvPrecisionDigits = Math.trunc(Math.log(bufEnvMax) / Math.log(10) + 1.0);
    var minUnitLog10 = maxPrecisionDigits - bufEnvPrecisionDigits;
    var scaleFactor = Math.pow(10.0, minUnitLog10);
    return scaleFactor;
  };

  BufferOp.CAP_ROUND = BufferParameters.CAP_ROUND;
  BufferOp.CAP_BUTT = BufferParameters.CAP_FLAT;
  BufferOp.CAP_FLAT = BufferParameters.CAP_FLAT;
  BufferOp.CAP_SQUARE = BufferParameters.CAP_SQUARE;
  BufferOp.MAX_PRECISION_DIGITS = 12;



  var buffer = /*#__PURE__*/Object.freeze({
    BufferOp: BufferOp,
    BufferParameters: BufferParameters
  });

  function PolygonExtracter() {
    this._comps = null;
    var comps = arguments[0];
    this._comps = comps;
  }
  extend(PolygonExtracter.prototype, {
    filter: function filter(geom) {
      if (geom instanceof Polygon) this._comps.add(geom);
    },
    interfaces_: function interfaces_() {
      return [GeometryFilter];
    },
    getClass: function getClass() {
      return PolygonExtracter;
    }
  });

  PolygonExtracter.getPolygons = function () {
    if (arguments.length === 1) {
      var geom = arguments[0];
      return PolygonExtracter.getPolygons(geom, new ArrayList());
    } else if (arguments.length === 2) {
      var _geom = arguments[0],
          list = arguments[1];

      if (_geom instanceof Polygon) {
        list.add(_geom);
      } else if (_geom instanceof GeometryCollection) {
        _geom.apply(new PolygonExtracter(list));
      }

      return list;
    }
  };

  function GeometryLocation() {
    this._component = null;
    this._segIndex = null;
    this._pt = null;

    if (arguments.length === 2) {
      var component = arguments[0],
          pt = arguments[1];
      GeometryLocation.call(this, component, GeometryLocation.INSIDE_AREA, pt);
    } else if (arguments.length === 3) {
      var _component = arguments[0],
          segIndex = arguments[1],
          _pt = arguments[2];
      this._component = _component;
      this._segIndex = segIndex;
      this._pt = _pt;
    }
  }
  extend(GeometryLocation.prototype, {
    isInsideArea: function isInsideArea() {
      return this._segIndex === GeometryLocation.INSIDE_AREA;
    },
    getCoordinate: function getCoordinate() {
      return this._pt;
    },
    getGeometryComponent: function getGeometryComponent() {
      return this._component;
    },
    getSegmentIndex: function getSegmentIndex() {
      return this._segIndex;
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return GeometryLocation;
    }
  });
  GeometryLocation.INSIDE_AREA = -1;

  function PointExtracter() {
    this._pts = null;
    var pts = arguments[0];
    this._pts = pts;
  }
  extend(PointExtracter.prototype, {
    filter: function filter(geom) {
      if (geom instanceof Point) this._pts.add(geom);
    },
    interfaces_: function interfaces_() {
      return [GeometryFilter];
    },
    getClass: function getClass() {
      return PointExtracter;
    }
  });

  PointExtracter.getPoints = function () {
    if (arguments.length === 1) {
      var geom = arguments[0];

      if (geom instanceof Point) {
        return Collections.singletonList(geom);
      }

      return PointExtracter.getPoints(geom, new ArrayList());
    } else if (arguments.length === 2) {
      var _geom = arguments[0],
          list = arguments[1];

      if (_geom instanceof Point) {
        list.add(_geom);
      } else if (_geom instanceof GeometryCollection) {
        _geom.apply(new PointExtracter(list));
      }

      return list;
    }
  };

  function ConnectedElementLocationFilter() {
    this._locations = null;
    var locations = arguments[0];
    this._locations = locations;
  }
  extend(ConnectedElementLocationFilter.prototype, {
    filter: function filter(geom) {
      if (geom instanceof Point || geom instanceof LineString || geom instanceof Polygon) this._locations.add(new GeometryLocation(geom, 0, geom.getCoordinate()));
    },
    interfaces_: function interfaces_() {
      return [GeometryFilter];
    },
    getClass: function getClass() {
      return ConnectedElementLocationFilter;
    }
  });

  ConnectedElementLocationFilter.getLocations = function (geom) {
    var locations = new ArrayList();
    geom.apply(new ConnectedElementLocationFilter(locations));
    return locations;
  };

  function DistanceOp() {
    this._geom = null;
    this._terminateDistance = 0.0;
    this._ptLocator = new PointLocator();
    this._minDistanceLocation = null;
    this._minDistance = Double.MAX_VALUE;

    if (arguments.length === 2) {
      var g0 = arguments[0],
          g1 = arguments[1];
      DistanceOp.call(this, g0, g1, 0.0);
    } else if (arguments.length === 3) {
      var _g = arguments[0],
          _g2 = arguments[1],
          terminateDistance = arguments[2];
      this._geom = new Array(2).fill(null);
      this._geom[0] = _g;
      this._geom[1] = _g2;
      this._terminateDistance = terminateDistance;
    }
  }
  extend(DistanceOp.prototype, {
    computeContainmentDistance: function computeContainmentDistance() {
      if (arguments.length === 0) {
        var locPtPoly = new Array(2).fill(null);
        this.computeContainmentDistance(0, locPtPoly);
        if (this._minDistance <= this._terminateDistance) return null;
        this.computeContainmentDistance(1, locPtPoly);
      } else if (arguments.length === 2) {
        var polyGeomIndex = arguments[0],
            _locPtPoly = arguments[1];
        var polyGeom = this._geom[polyGeomIndex];
        if (polyGeom.getDimension() < 2) return null;
        var locationsIndex = 1 - polyGeomIndex;
        var polys = PolygonExtracter.getPolygons(polyGeom);

        if (polys.size() > 0) {
          var insideLocs = ConnectedElementLocationFilter.getLocations(this._geom[locationsIndex]);
          this.computeContainmentDistance(insideLocs, polys, _locPtPoly);

          if (this._minDistance <= this._terminateDistance) {
            this._minDistanceLocation[locationsIndex] = _locPtPoly[0];
            this._minDistanceLocation[polyGeomIndex] = _locPtPoly[1];
            return null;
          }
        }
      } else if (arguments.length === 3) {
        if (arguments[2] instanceof Array && hasInterface(arguments[0], List) && hasInterface(arguments[1], List)) {
          var locs = arguments[0],
              _polys = arguments[1],
              _locPtPoly2 = arguments[2];

          for (var i = 0; i < locs.size(); i++) {
            var loc = locs.get(i);

            for (var j = 0; j < _polys.size(); j++) {
              this.computeContainmentDistance(loc, _polys.get(j), _locPtPoly2);
              if (this._minDistance <= this._terminateDistance) return null;
            }
          }
        } else if (arguments[2] instanceof Array && arguments[0] instanceof GeometryLocation && arguments[1] instanceof Polygon) {
          var ptLoc = arguments[0],
              poly = arguments[1],
              _locPtPoly3 = arguments[2];
          var pt = ptLoc.getCoordinate();

          if (Location.EXTERIOR !== this._ptLocator.locate(pt, poly)) {
            this._minDistance = 0.0;
            _locPtPoly3[0] = ptLoc;
            _locPtPoly3[1] = new GeometryLocation(poly, pt);
            return null;
          }
        }
      }
    },
    computeMinDistanceLinesPoints: function computeMinDistanceLinesPoints(lines, points, locGeom) {
      for (var i = 0; i < lines.size(); i++) {
        var line = lines.get(i);

        for (var j = 0; j < points.size(); j++) {
          var pt = points.get(j);
          this.computeMinDistance(line, pt, locGeom);
          if (this._minDistance <= this._terminateDistance) return null;
        }
      }
    },
    computeFacetDistance: function computeFacetDistance() {
      var locGeom = new Array(2).fill(null);
      var lines0 = LinearComponentExtracter.getLines(this._geom[0]);
      var lines1 = LinearComponentExtracter.getLines(this._geom[1]);
      var pts0 = PointExtracter.getPoints(this._geom[0]);
      var pts1 = PointExtracter.getPoints(this._geom[1]);
      this.computeMinDistanceLines(lines0, lines1, locGeom);
      this.updateMinDistance(locGeom, false);
      if (this._minDistance <= this._terminateDistance) return null;
      locGeom[0] = null;
      locGeom[1] = null;
      this.computeMinDistanceLinesPoints(lines0, pts1, locGeom);
      this.updateMinDistance(locGeom, false);
      if (this._minDistance <= this._terminateDistance) return null;
      locGeom[0] = null;
      locGeom[1] = null;
      this.computeMinDistanceLinesPoints(lines1, pts0, locGeom);
      this.updateMinDistance(locGeom, true);
      if (this._minDistance <= this._terminateDistance) return null;
      locGeom[0] = null;
      locGeom[1] = null;
      this.computeMinDistancePoints(pts0, pts1, locGeom);
      this.updateMinDistance(locGeom, false);
    },
    nearestLocations: function nearestLocations() {
      this.computeMinDistance();
      return this._minDistanceLocation;
    },
    updateMinDistance: function updateMinDistance(locGeom, flip) {
      if (locGeom[0] === null) return null;

      if (flip) {
        this._minDistanceLocation[0] = locGeom[1];
        this._minDistanceLocation[1] = locGeom[0];
      } else {
        this._minDistanceLocation[0] = locGeom[0];
        this._minDistanceLocation[1] = locGeom[1];
      }
    },
    nearestPoints: function nearestPoints() {
      this.computeMinDistance();
      var nearestPts = [this._minDistanceLocation[0].getCoordinate(), this._minDistanceLocation[1].getCoordinate()];
      return nearestPts;
    },
    computeMinDistance: function computeMinDistance() {
      if (arguments.length === 0) {
        if (this._minDistanceLocation !== null) return null;
        this._minDistanceLocation = new Array(2).fill(null);
        this.computeContainmentDistance();
        if (this._minDistance <= this._terminateDistance) return null;
        this.computeFacetDistance();
      } else if (arguments.length === 3) {
        if (arguments[2] instanceof Array && arguments[0] instanceof LineString && arguments[1] instanceof Point) {
          var line = arguments[0],
              pt = arguments[1],
              locGeom = arguments[2];
          if (line.getEnvelopeInternal().distance(pt.getEnvelopeInternal()) > this._minDistance) return null;
          var coord0 = line.getCoordinates();
          var coord = pt.getCoordinate();

          for (var i = 0; i < coord0.length - 1; i++) {
            var dist = Distance.pointToSegment(coord, coord0[i], coord0[i + 1]);

            if (dist < this._minDistance) {
              this._minDistance = dist;
              var seg = new LineSegment(coord0[i], coord0[i + 1]);
              var segClosestPoint = seg.closestPoint(coord);
              locGeom[0] = new GeometryLocation(line, i, segClosestPoint);
              locGeom[1] = new GeometryLocation(pt, 0, coord);
            }

            if (this._minDistance <= this._terminateDistance) return null;
          }
        } else if (arguments[2] instanceof Array && arguments[0] instanceof LineString && arguments[1] instanceof LineString) {
          var line0 = arguments[0],
              line1 = arguments[1],
              _locGeom = arguments[2];
          if (line0.getEnvelopeInternal().distance(line1.getEnvelopeInternal()) > this._minDistance) return null;
          var coord0 = line0.getCoordinates();
          var coord1 = line1.getCoordinates();

          for (var i = 0; i < coord0.length - 1; i++) {
            for (var j = 0; j < coord1.length - 1; j++) {
              var dist = Distance.segmentToSegment(coord0[i], coord0[i + 1], coord1[j], coord1[j + 1]);

              if (dist < this._minDistance) {
                this._minDistance = dist;
                var seg0 = new LineSegment(coord0[i], coord0[i + 1]);
                var seg1 = new LineSegment(coord1[j], coord1[j + 1]);
                var closestPt = seg0.closestPoints(seg1);
                _locGeom[0] = new GeometryLocation(line0, i, closestPt[0]);
                _locGeom[1] = new GeometryLocation(line1, j, closestPt[1]);
              }

              if (this._minDistance <= this._terminateDistance) return null;
            }
          }
        }
      }
    },
    computeMinDistancePoints: function computeMinDistancePoints(points0, points1, locGeom) {
      for (var i = 0; i < points0.size(); i++) {
        var pt0 = points0.get(i);

        for (var j = 0; j < points1.size(); j++) {
          var pt1 = points1.get(j);
          var dist = pt0.getCoordinate().distance(pt1.getCoordinate());

          if (dist < this._minDistance) {
            this._minDistance = dist;
            locGeom[0] = new GeometryLocation(pt0, 0, pt0.getCoordinate());
            locGeom[1] = new GeometryLocation(pt1, 0, pt1.getCoordinate());
          }

          if (this._minDistance <= this._terminateDistance) return null;
        }
      }
    },
    distance: function distance() {
      if (this._geom[0] === null || this._geom[1] === null) throw new IllegalArgumentException("null geometries are not supported");
      if (this._geom[0].isEmpty() || this._geom[1].isEmpty()) return 0.0;
      this.computeMinDistance();
      return this._minDistance;
    },
    computeMinDistanceLines: function computeMinDistanceLines(lines0, lines1, locGeom) {
      for (var i = 0; i < lines0.size(); i++) {
        var line0 = lines0.get(i);

        for (var j = 0; j < lines1.size(); j++) {
          var line1 = lines1.get(j);
          this.computeMinDistance(line0, line1, locGeom);
          if (this._minDistance <= this._terminateDistance) return null;
        }
      }
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return DistanceOp;
    }
  });

  DistanceOp.distance = function (g0, g1) {
    var distOp = new DistanceOp(g0, g1);
    return distOp.distance();
  };

  DistanceOp.isWithinDistance = function (g0, g1, distance) {
    var envDist = g0.getEnvelopeInternal().distance(g1.getEnvelopeInternal());
    if (envDist > distance) return false;
    var distOp = new DistanceOp(g0, g1, distance);
    return distOp.distance() <= distance;
  };

  DistanceOp.nearestPoints = function (g0, g1) {
    var distOp = new DistanceOp(g0, g1);
    return distOp.nearestPoints();
  };



  var distance = /*#__PURE__*/Object.freeze({
    DistanceOp: DistanceOp
  });

  function EdgeString() {
    this._factory = null;
    this._directedEdges = new ArrayList();
    this._coordinates = null;
    var factory = arguments[0];
    this._factory = factory;
  }
  extend(EdgeString.prototype, {
    getCoordinates: function getCoordinates() {
      if (this._coordinates === null) {
        var forwardDirectedEdges = 0;
        var reverseDirectedEdges = 0;
        var coordinateList = new CoordinateList();

        for (var i = this._directedEdges.iterator(); i.hasNext();) {
          var directedEdge = i.next();

          if (directedEdge.getEdgeDirection()) {
            forwardDirectedEdges++;
          } else {
            reverseDirectedEdges++;
          }

          coordinateList.add(directedEdge.getEdge().getLine().getCoordinates(), false, directedEdge.getEdgeDirection());
        }

        this._coordinates = coordinateList.toCoordinateArray();

        if (reverseDirectedEdges > forwardDirectedEdges) {
          CoordinateArrays.reverse(this._coordinates);
        }
      }

      return this._coordinates;
    },
    toLineString: function toLineString() {
      return this._factory.createLineString(this.getCoordinates());
    },
    add: function add(directedEdge) {
      this._directedEdges.add(directedEdge);
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return EdgeString;
    }
  });

  function GraphComponent$1() {
    this._isMarked = false;
    this._isVisited = false;
    this._data = null;
  }
  extend(GraphComponent$1.prototype, {
    setVisited: function setVisited(isVisited) {
      this._isVisited = isVisited;
    },
    isMarked: function isMarked() {
      return this._isMarked;
    },
    setData: function setData(data) {
      this._data = data;
    },
    getData: function getData() {
      return this._data;
    },
    setMarked: function setMarked(isMarked) {
      this._isMarked = isMarked;
    },
    getContext: function getContext() {
      return this._data;
    },
    isVisited: function isVisited() {
      return this._isVisited;
    },
    setContext: function setContext(data) {
      this._data = data;
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return GraphComponent$1;
    }
  });

  GraphComponent$1.getComponentWithVisitedState = function (i, visitedState) {
    while (i.hasNext()) {
      var comp = i.next();
      if (comp.isVisited() === visitedState) return comp;
    }

    return null;
  };

  GraphComponent$1.setVisited = function (i, visited) {
    while (i.hasNext()) {
      var comp = i.next();
      comp.setVisited(visited);
    }
  };

  GraphComponent$1.setMarked = function (i, marked) {
    while (i.hasNext()) {
      var comp = i.next();
      comp.setMarked(marked);
    }
  };

  function DirectedEdge$1() {
    GraphComponent$1.apply(this);
    this._parentEdge = null;
    this._from = null;
    this._to = null;
    this._p0 = null;
    this._p1 = null;
    this._sym = null;
    this._edgeDirection = null;
    this._quadrant = null;
    this._angle = null;
    var from = arguments[0],
        to = arguments[1],
        directionPt = arguments[2],
        edgeDirection = arguments[3];
    this._from = from;
    this._to = to;
    this._edgeDirection = edgeDirection;
    this._p0 = from.getCoordinate();
    this._p1 = directionPt;
    var dx = this._p1.x - this._p0.x;
    var dy = this._p1.y - this._p0.y;
    this._quadrant = Quadrant.quadrant(dx, dy);
    this._angle = Math.atan2(dy, dx);
  }
  inherits(DirectedEdge$1, GraphComponent$1);
  extend(DirectedEdge$1.prototype, {
    isRemoved: function isRemoved() {
      return this._parentEdge === null;
    },
    compareDirection: function compareDirection(e) {
      if (this._quadrant > e._quadrant) return 1;
      if (this._quadrant < e._quadrant) return -1;
      return Orientation.index(e._p0, e._p1, this._p1);
    },
    getCoordinate: function getCoordinate() {
      return this._from.getCoordinate();
    },
    print: function print(out) {
      var className = this.getClass().getName();
      var lastDotPos = className.lastIndexOf('.');
      var name = className.substring(lastDotPos + 1);
      out.print("  " + name + ": " + this._p0 + " - " + this._p1 + " " + this._quadrant + ":" + this._angle);
    },
    getDirectionPt: function getDirectionPt() {
      return this._p1;
    },
    getAngle: function getAngle() {
      return this._angle;
    },
    compareTo: function compareTo(obj) {
      var de = obj;
      return this.compareDirection(de);
    },
    getFromNode: function getFromNode() {
      return this._from;
    },
    getSym: function getSym() {
      return this._sym;
    },
    setEdge: function setEdge(parentEdge) {
      this._parentEdge = parentEdge;
    },
    remove: function remove() {
      this._sym = null;
      this._parentEdge = null;
    },
    getEdge: function getEdge() {
      return this._parentEdge;
    },
    getQuadrant: function getQuadrant() {
      return this._quadrant;
    },
    setSym: function setSym(sym) {
      this._sym = sym;
    },
    getToNode: function getToNode() {
      return this._to;
    },
    getEdgeDirection: function getEdgeDirection() {
      return this._edgeDirection;
    },
    interfaces_: function interfaces_() {
      return [Comparable];
    },
    getClass: function getClass() {
      return DirectedEdge$1;
    }
  });

  DirectedEdge$1.toEdges = function (dirEdges) {
    var edges = new ArrayList();

    for (var i = dirEdges.iterator(); i.hasNext();) {
      edges.add(i.next()._parentEdge);
    }

    return edges;
  };

  function LineMergeDirectedEdge() {
    var from = arguments[0],
        to = arguments[1],
        directionPt = arguments[2],
        edgeDirection = arguments[3];
    DirectedEdge$1.call(this, from, to, directionPt, edgeDirection);
  }
  inherits(LineMergeDirectedEdge, DirectedEdge$1);
  extend(LineMergeDirectedEdge.prototype, {
    getNext: function getNext() {
      if (this.getToNode().getDegree() !== 2) {
        return null;
      }

      if (this.getToNode().getOutEdges().getEdges().get(0) === this.getSym()) {
        return this.getToNode().getOutEdges().getEdges().get(1);
      }

      Assert.isTrue(this.getToNode().getOutEdges().getEdges().get(1) === this.getSym());
      return this.getToNode().getOutEdges().getEdges().get(0);
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return LineMergeDirectedEdge;
    }
  });

  function Edge$1() {
    GraphComponent$1.apply(this);
    this._dirEdge = null;

    if (arguments.length === 0) ; else if (arguments.length === 2) {
      var de0 = arguments[0],
          de1 = arguments[1];
      this.setDirectedEdges(de0, de1);
    }
  }
  inherits(Edge$1, GraphComponent$1);
  extend(Edge$1.prototype, {
    isRemoved: function isRemoved() {
      return this._dirEdge === null;
    },
    setDirectedEdges: function setDirectedEdges(de0, de1) {
      this._dirEdge = [de0, de1];
      de0.setEdge(this);
      de1.setEdge(this);
      de0.setSym(de1);
      de1.setSym(de0);
      de0.getFromNode().addOutEdge(de0);
      de1.getFromNode().addOutEdge(de1);
    },
    getDirEdge: function getDirEdge() {
      if (Number.isInteger(arguments[0])) {
        var i = arguments[0];
        return this._dirEdge[i];
      } else if (arguments[0] instanceof Node$3) {
        var fromNode = arguments[0];
        if (this._dirEdge[0].getFromNode() === fromNode) return this._dirEdge[0];
        if (this._dirEdge[1].getFromNode() === fromNode) return this._dirEdge[1];
        return null;
      }
    },
    remove: function remove() {
      this._dirEdge = null;
    },
    getOppositeNode: function getOppositeNode(node) {
      if (this._dirEdge[0].getFromNode() === node) return this._dirEdge[0].getToNode();
      if (this._dirEdge[1].getFromNode() === node) return this._dirEdge[1].getToNode();
      return null;
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return Edge$1;
    }
  });

  function DirectedEdgeStar$1() {
    this._outEdges = new ArrayList();
    this._sorted = false;
  }
  extend(DirectedEdgeStar$1.prototype, {
    getNextEdge: function getNextEdge(dirEdge) {
      var i = this.getIndex(dirEdge);
      return this._outEdges.get(this.getIndex(i + 1));
    },
    getCoordinate: function getCoordinate() {
      var it = this.iterator();
      if (!it.hasNext()) return null;
      var e = it.next();
      return e.getCoordinate();
    },
    iterator: function iterator() {
      this.sortEdges();
      return this._outEdges.iterator();
    },
    sortEdges: function sortEdges() {
      if (!this._sorted) {
        Collections.sort(this._outEdges);
        this._sorted = true;
      }
    },
    remove: function remove(de) {
      this._outEdges.remove(de);
    },
    getEdges: function getEdges() {
      this.sortEdges();
      return this._outEdges;
    },
    getNextCWEdge: function getNextCWEdge(dirEdge) {
      var i = this.getIndex(dirEdge);
      return this._outEdges.get(this.getIndex(i - 1));
    },
    getIndex: function getIndex() {
      if (arguments[0] instanceof Edge$1) {
        var edge = arguments[0];
        this.sortEdges();

        for (var i = 0; i < this._outEdges.size(); i++) {
          var de = this._outEdges.get(i);

          if (de.getEdge() === edge) return i;
        }

        return -1;
      } else if (arguments[0] instanceof DirectedEdge$1) {
        var dirEdge = arguments[0];
        this.sortEdges();

        for (var i = 0; i < this._outEdges.size(); i++) {
          var de = this._outEdges.get(i);

          if (de === dirEdge) return i;
        }

        return -1;
      } else if (Number.isInteger(arguments[0])) {
        var _i = arguments[0];

        var modi = _i % this._outEdges.size();

        if (modi < 0) modi += this._outEdges.size();
        return modi;
      }
    },
    add: function add(de) {
      this._outEdges.add(de);

      this._sorted = false;
    },
    getDegree: function getDegree() {
      return this._outEdges.size();
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return DirectedEdgeStar$1;
    }
  });

  function Node$3() {
    GraphComponent$1.apply(this);
    this._pt = null;
    this._deStar = null;

    if (arguments.length === 1) {
      var pt = arguments[0];
      Node$3.call(this, pt, new DirectedEdgeStar$1());
    } else if (arguments.length === 2) {
      var _pt = arguments[0],
          deStar = arguments[1];
      this._pt = _pt;
      this._deStar = deStar;
    }
  }
  inherits(Node$3, GraphComponent$1);
  extend(Node$3.prototype, {
    isRemoved: function isRemoved() {
      return this._pt === null;
    },
    addOutEdge: function addOutEdge(de) {
      this._deStar.add(de);
    },
    getCoordinate: function getCoordinate() {
      return this._pt;
    },
    getOutEdges: function getOutEdges() {
      return this._deStar;
    },
    remove: function remove() {
      if (arguments.length === 0) {
        this._pt = null;
      } else if (arguments.length === 1) {
        var de = arguments[0];

        this._deStar.remove(de);
      }
    },
    getIndex: function getIndex(edge) {
      return this._deStar.getIndex(edge);
    },
    getDegree: function getDegree() {
      return this._deStar.getDegree();
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return Node$3;
    }
  });

  Node$3.getEdgesBetween = function (node0, node1) {
    var edges0 = DirectedEdge$1.toEdges(node0.getOutEdges().getEdges());
    var commonEdges = new HashSet(edges0);
    var edges1 = DirectedEdge$1.toEdges(node1.getOutEdges().getEdges());
    commonEdges.retainAll(edges1);
    return commonEdges;
  };

  function LineMergeEdge() {
    Edge$1.apply(this);
    this._line = null;
    var line = arguments[0];
    this._line = line;
  }
  inherits(LineMergeEdge, Edge$1);
  extend(LineMergeEdge.prototype, {
    getLine: function getLine() {
      return this._line;
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return LineMergeEdge;
    }
  });

  function NodeMap$1() {
    this._nodeMap = new TreeMap();
  }
  extend(NodeMap$1.prototype, {
    find: function find(coord) {
      return this._nodeMap.get(coord);
    },
    iterator: function iterator() {
      return this._nodeMap.values().iterator();
    },
    remove: function remove(pt) {
      return this._nodeMap.remove(pt);
    },
    values: function values() {
      return this._nodeMap.values();
    },
    add: function add(n) {
      this._nodeMap.put(n.getCoordinate(), n);

      return n;
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return NodeMap$1;
    }
  });

  function PlanarGraph$1() {
    this._edges = new HashSet();
    this._dirEdges = new HashSet();
    this._nodeMap = new NodeMap$1();
  }
  extend(PlanarGraph$1.prototype, {
    findNodesOfDegree: function findNodesOfDegree(degree) {
      var nodesFound = new ArrayList();

      for (var i = this.nodeIterator(); i.hasNext();) {
        var node = i.next();
        if (node.getDegree() === degree) nodesFound.add(node);
      }

      return nodesFound;
    },
    dirEdgeIterator: function dirEdgeIterator() {
      return this._dirEdges.iterator();
    },
    edgeIterator: function edgeIterator() {
      return this._edges.iterator();
    },
    remove: function remove() {
      if (arguments[0] instanceof Edge$1) {
        var _edge = arguments[0];
        this.remove(_edge.getDirEdge(0));
        this.remove(_edge.getDirEdge(1));

        this._edges.remove(_edge);

        _edge.remove();
      } else if (arguments[0] instanceof DirectedEdge$1) {
        var _de = arguments[0];

        var sym = _de.getSym();

        if (sym !== null) sym.setSym(null);

        _de.getFromNode().remove(_de);

        _de.remove();

        this._dirEdges.remove(_de);
      } else if (arguments[0] instanceof Node$3) {
        var node = arguments[0];
        var outEdges = node.getOutEdges().getEdges();

        for (var i = outEdges.iterator(); i.hasNext();) {
          var de = i.next();
          var sym = de.getSym();
          if (sym !== null) this.remove(sym);

          this._dirEdges.remove(de);

          var edge = de.getEdge();

          if (edge !== null) {
            this._edges.remove(edge);
          }
        }

        this._nodeMap.remove(node.getCoordinate());

        node.remove();
      }
    },
    findNode: function findNode(pt) {
      return this._nodeMap.find(pt);
    },
    getEdges: function getEdges() {
      return this._edges;
    },
    nodeIterator: function nodeIterator() {
      return this._nodeMap.iterator();
    },
    contains: function contains() {
      if (arguments[0] instanceof Edge$1) {
        var e = arguments[0];
        return this._edges.contains(e);
      } else if (arguments[0] instanceof DirectedEdge$1) {
        var de = arguments[0];
        return this._dirEdges.contains(de);
      }
    },
    add: function add() {
      if (arguments[0] instanceof Node$3) {
        var node = arguments[0];

        this._nodeMap.add(node);
      } else if (arguments[0] instanceof Edge$1) {
        var edge = arguments[0];

        this._edges.add(edge);

        this.add(edge.getDirEdge(0));
        this.add(edge.getDirEdge(1));
      } else if (arguments[0] instanceof DirectedEdge$1) {
        var dirEdge = arguments[0];

        this._dirEdges.add(dirEdge);
      }
    },
    getNodes: function getNodes() {
      return this._nodeMap.values();
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return PlanarGraph$1;
    }
  });

  function LineMergeGraph() {
    PlanarGraph$1.apply(this);
  }
  inherits(LineMergeGraph, PlanarGraph$1);
  extend(LineMergeGraph.prototype, {
    addEdge: function addEdge(lineString) {
      if (lineString.isEmpty()) {
        return null;
      }

      var coordinates = CoordinateArrays.removeRepeatedPoints(lineString.getCoordinates());
      if (coordinates.length <= 1) return null;
      var startCoordinate = coordinates[0];
      var endCoordinate = coordinates[coordinates.length - 1];
      var startNode = this.getNode(startCoordinate);
      var endNode = this.getNode(endCoordinate);
      var directedEdge0 = new LineMergeDirectedEdge(startNode, endNode, coordinates[1], true);
      var directedEdge1 = new LineMergeDirectedEdge(endNode, startNode, coordinates[coordinates.length - 2], false);
      var edge = new LineMergeEdge(lineString);
      edge.setDirectedEdges(directedEdge0, directedEdge1);
      this.add(edge);
    },
    getNode: function getNode(coordinate) {
      var node = this.findNode(coordinate);

      if (node === null) {
        node = new Node$3(coordinate);
        this.add(node);
      }

      return node;
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return LineMergeGraph;
    }
  });

  function LineMerger() {
    this._graph = new LineMergeGraph();
    this._mergedLineStrings = null;
    this._factory = null;
    this._edgeStrings = null;
  }
  extend(LineMerger.prototype, {
    buildEdgeStringsForUnprocessedNodes: function buildEdgeStringsForUnprocessedNodes() {
      for (var i = this._graph.getNodes().iterator(); i.hasNext();) {
        var node = i.next();

        if (!node.isMarked()) {
          Assert.isTrue(node.getDegree() === 2);
          this.buildEdgeStringsStartingAt(node);
          node.setMarked(true);
        }
      }
    },
    buildEdgeStringsForNonDegree2Nodes: function buildEdgeStringsForNonDegree2Nodes() {
      for (var i = this._graph.getNodes().iterator(); i.hasNext();) {
        var node = i.next();

        if (node.getDegree() !== 2) {
          this.buildEdgeStringsStartingAt(node);
          node.setMarked(true);
        }
      }
    },
    buildEdgeStringsForObviousStartNodes: function buildEdgeStringsForObviousStartNodes() {
      this.buildEdgeStringsForNonDegree2Nodes();
    },
    getMergedLineStrings: function getMergedLineStrings() {
      this.merge();
      return this._mergedLineStrings;
    },
    buildEdgeStringsStartingAt: function buildEdgeStringsStartingAt(node) {
      for (var i = node.getOutEdges().iterator(); i.hasNext();) {
        var directedEdge = i.next();

        if (directedEdge.getEdge().isMarked()) {
          continue;
        }

        this._edgeStrings.add(this.buildEdgeStringStartingWith(directedEdge));
      }
    },
    merge: function merge() {
      if (this._mergedLineStrings !== null) {
        return null;
      }

      GraphComponent$1.setMarked(this._graph.nodeIterator(), false);
      GraphComponent$1.setMarked(this._graph.edgeIterator(), false);
      this._edgeStrings = new ArrayList();
      this.buildEdgeStringsForObviousStartNodes();
      this.buildEdgeStringsForIsolatedLoops();
      this._mergedLineStrings = new ArrayList();

      for (var i = this._edgeStrings.iterator(); i.hasNext();) {
        var edgeString = i.next();

        this._mergedLineStrings.add(edgeString.toLineString());
      }
    },
    buildEdgeStringStartingWith: function buildEdgeStringStartingWith(start) {
      var edgeString = new EdgeString(this._factory);
      var current = start;

      do {
        edgeString.add(current);
        current.getEdge().setMarked(true);
        current = current.getNext();
      } while (current !== null && current !== start);

      return edgeString;
    },
    add: function add() {
      if (arguments[0] instanceof Geometry) {
        var _geometry = arguments[0];

        _geometry.apply({
          interfaces_: function interfaces_() {
            return [GeometryComponentFilter];
          },
          filter: function filter(component) {
            if (component instanceof LineString) {
              this.add(component);
            }
          }
        });
      } else if (hasInterface(arguments[0], Collection)) {
        var geometries = arguments[0];
        this._mergedLineStrings = null;

        for (var i = geometries.iterator(); i.hasNext();) {
          var geometry = i.next();
          this.add(geometry);
        }
      } else if (arguments[0] instanceof LineString) {
        var lineString = arguments[0];

        if (this._factory === null) {
          this._factory = lineString.getFactory();
        }

        this._graph.addEdge(lineString);
      }
    },
    buildEdgeStringsForIsolatedLoops: function buildEdgeStringsForIsolatedLoops() {
      this.buildEdgeStringsForUnprocessedNodes();
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return LineMerger;
    }
  });



  var linemerge = /*#__PURE__*/Object.freeze({
    LineMerger: LineMerger
  });

  function BasicSegmentString() {
    this._pts = null;
    this._data = null;
    var pts = arguments[0],
        data = arguments[1];
    this._pts = pts;
    this._data = data;
  }
  extend(BasicSegmentString.prototype, {
    getCoordinates: function getCoordinates() {
      return this._pts;
    },
    size: function size() {
      return this._pts.length;
    },
    getCoordinate: function getCoordinate(i) {
      return this._pts[i];
    },
    isClosed: function isClosed() {
      return this._pts[0].equals(this._pts[this._pts.length - 1]);
    },
    getSegmentOctant: function getSegmentOctant(index) {
      if (index === this._pts.length - 1) return -1;
      return Octant.octant(this.getCoordinate(index), this.getCoordinate(index + 1));
    },
    setData: function setData(data) {
      this._data = data;
    },
    getData: function getData() {
      return this._data;
    },
    toString: function toString() {
      return WKTWriter.toLineString(new CoordinateArraySequence(this._pts));
    },
    interfaces_: function interfaces_() {
      return [SegmentString];
    },
    getClass: function getClass() {
      return BasicSegmentString;
    }
  });

  function InteriorIntersectionFinder() {
    this._findAllIntersections = false;
    this._isCheckEndSegmentsOnly = false;
    this._li = null;
    this._interiorIntersection = null;
    this._intSegments = null;
    this._intersections = new ArrayList();
    this._intersectionCount = 0;
    this._keepIntersections = true;
    var li = arguments[0];
    this._li = li;
    this._interiorIntersection = null;
  }
  extend(InteriorIntersectionFinder.prototype, {
    getInteriorIntersection: function getInteriorIntersection() {
      return this._interiorIntersection;
    },
    setCheckEndSegmentsOnly: function setCheckEndSegmentsOnly(isCheckEndSegmentsOnly) {
      this._isCheckEndSegmentsOnly = isCheckEndSegmentsOnly;
    },
    getIntersectionSegments: function getIntersectionSegments() {
      return this._intSegments;
    },
    count: function count() {
      return this._intersectionCount;
    },
    getIntersections: function getIntersections() {
      return this._intersections;
    },
    setFindAllIntersections: function setFindAllIntersections(findAllIntersections) {
      this._findAllIntersections = findAllIntersections;
    },
    setKeepIntersections: function setKeepIntersections(keepIntersections) {
      this._keepIntersections = keepIntersections;
    },
    processIntersections: function processIntersections(e0, segIndex0, e1, segIndex1) {
      if (!this._findAllIntersections && this.hasIntersection()) return null;
      if (e0 === e1 && segIndex0 === segIndex1) return null;

      if (this._isCheckEndSegmentsOnly) {
        var isEndSegPresent = this.isEndSegment(e0, segIndex0) || this.isEndSegment(e1, segIndex1);
        if (!isEndSegPresent) return null;
      }

      var p00 = e0.getCoordinates()[segIndex0];
      var p01 = e0.getCoordinates()[segIndex0 + 1];
      var p10 = e1.getCoordinates()[segIndex1];
      var p11 = e1.getCoordinates()[segIndex1 + 1];

      this._li.computeIntersection(p00, p01, p10, p11);

      if (this._li.hasIntersection()) {
        if (this._li.isInteriorIntersection()) {
          this._intSegments = new Array(4).fill(null);
          this._intSegments[0] = p00;
          this._intSegments[1] = p01;
          this._intSegments[2] = p10;
          this._intSegments[3] = p11;
          this._interiorIntersection = this._li.getIntersection(0);
          if (this._keepIntersections) this._intersections.add(this._interiorIntersection);
          this._intersectionCount++;
        }
      }
    },
    isEndSegment: function isEndSegment(segStr, index) {
      if (index === 0) return true;
      if (index >= segStr.size() - 2) return true;
      return false;
    },
    hasIntersection: function hasIntersection() {
      return this._interiorIntersection !== null;
    },
    isDone: function isDone() {
      if (this._findAllIntersections) return false;
      return this._interiorIntersection !== null;
    },
    interfaces_: function interfaces_() {
      return [SegmentIntersector$1];
    },
    getClass: function getClass() {
      return InteriorIntersectionFinder;
    }
  });

  InteriorIntersectionFinder.createAllIntersectionsFinder = function (li) {
    var finder = new InteriorIntersectionFinder(li);
    finder.setFindAllIntersections(true);
    return finder;
  };

  InteriorIntersectionFinder.createAnyIntersectionFinder = function (li) {
    return new InteriorIntersectionFinder(li);
  };

  InteriorIntersectionFinder.createIntersectionCounter = function (li) {
    var finder = new InteriorIntersectionFinder(li);
    finder.setFindAllIntersections(true);
    finder.setKeepIntersections(false);
    return finder;
  };

  function FastNodingValidator() {
    this._li = new RobustLineIntersector();
    this._segStrings = null;
    this._findAllIntersections = false;
    this._segInt = null;
    this._isValid = true;
    var segStrings = arguments[0];
    this._segStrings = segStrings;
  }
  extend(FastNodingValidator.prototype, {
    execute: function execute() {
      if (this._segInt !== null) return null;
      this.checkInteriorIntersections();
    },
    getIntersections: function getIntersections() {
      return this._segInt.getIntersections();
    },
    isValid: function isValid() {
      this.execute();
      return this._isValid;
    },
    setFindAllIntersections: function setFindAllIntersections(findAllIntersections) {
      this._findAllIntersections = findAllIntersections;
    },
    checkInteriorIntersections: function checkInteriorIntersections() {
      this._isValid = true;
      this._segInt = new InteriorIntersectionFinder(this._li);

      this._segInt.setFindAllIntersections(this._findAllIntersections);

      var noder = new MCIndexNoder();
      noder.setSegmentIntersector(this._segInt);
      noder.computeNodes(this._segStrings);

      if (this._segInt.hasIntersection()) {
        this._isValid = false;
        return null;
      }
    },
    checkValid: function checkValid() {
      this.execute();
      if (!this._isValid) throw new TopologyException(this.getErrorMessage(), this._segInt.getInteriorIntersection());
    },
    getErrorMessage: function getErrorMessage() {
      if (this._isValid) return "no intersections found";

      var intSegs = this._segInt.getIntersectionSegments();

      return "found non-noded intersection between " + WKTWriter.toLineString(intSegs[0], intSegs[1]) + " and " + WKTWriter.toLineString(intSegs[2], intSegs[3]);
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return FastNodingValidator;
    }
  });

  FastNodingValidator.computeIntersections = function (segStrings) {
    var nv = new FastNodingValidator(segStrings);
    nv.setFindAllIntersections(true);
    nv.isValid();
    return nv.getIntersections();
  };

  function EdgeNodingValidator() {
    this._nv = null;
    var edges = arguments[0];
    this._nv = new FastNodingValidator(EdgeNodingValidator.toSegmentStrings(edges));
  }
  extend(EdgeNodingValidator.prototype, {
    checkValid: function checkValid() {
      this._nv.checkValid();
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return EdgeNodingValidator;
    }
  });

  EdgeNodingValidator.toSegmentStrings = function (edges) {
    var segStrings = new ArrayList();

    for (var i = edges.iterator(); i.hasNext();) {
      var e = i.next();
      segStrings.add(new BasicSegmentString(e.getCoordinates(), e));
    }

    return segStrings;
  };

  EdgeNodingValidator.checkValid = function (edges) {
    var validator = new EdgeNodingValidator(edges);
    validator.checkValid();
  };

  function GeometryCollectionMapper() {
    this._mapOp = null;
    var mapOp = arguments[0];
    this._mapOp = mapOp;
  }
  extend(GeometryCollectionMapper.prototype, {
    map: function map(gc) {
      var mapped = new ArrayList();

      for (var i = 0; i < gc.getNumGeometries(); i++) {
        var g = this._mapOp.map(gc.getGeometryN(i));

        if (!g.isEmpty()) mapped.add(g);
      }

      return gc.getFactory().createGeometryCollection(GeometryFactory.toGeometryArray(mapped));
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return GeometryCollectionMapper;
    }
  });

  GeometryCollectionMapper.map = function (gc, op) {
    var mapper = new GeometryCollectionMapper(op);
    return mapper.map(gc);
  };

  function LineBuilder() {
    this._op = null;
    this._geometryFactory = null;
    this._ptLocator = null;
    this._lineEdgesList = new ArrayList();
    this._resultLineList = new ArrayList();
    var op = arguments[0],
        geometryFactory = arguments[1],
        ptLocator = arguments[2];
    this._op = op;
    this._geometryFactory = geometryFactory;
    this._ptLocator = ptLocator;
  }
  extend(LineBuilder.prototype, {
    collectLines: function collectLines(opCode) {
      for (var it = this._op.getGraph().getEdgeEnds().iterator(); it.hasNext();) {
        var de = it.next();
        this.collectLineEdge(de, opCode, this._lineEdgesList);
        this.collectBoundaryTouchEdge(de, opCode, this._lineEdgesList);
      }
    },
    labelIsolatedLine: function labelIsolatedLine(e, targetIndex) {
      var loc = this._ptLocator.locate(e.getCoordinate(), this._op.getArgGeometry(targetIndex));

      e.getLabel().setLocation(targetIndex, loc);
    },
    build: function build(opCode) {
      this.findCoveredLineEdges();
      this.collectLines(opCode);
      this.buildLines(opCode);
      return this._resultLineList;
    },
    collectLineEdge: function collectLineEdge(de, opCode, edges) {
      var label = de.getLabel();
      var e = de.getEdge();

      if (de.isLineEdge()) {
        if (!de.isVisited() && OverlayOp.isResultOfOp(label, opCode) && !e.isCovered()) {
          edges.add(e);
          de.setVisitedEdge(true);
        }
      }
    },
    findCoveredLineEdges: function findCoveredLineEdges() {
      for (var nodeit = this._op.getGraph().getNodes().iterator(); nodeit.hasNext();) {
        var node = nodeit.next();
        node.getEdges().findCoveredLineEdges();
      }

      for (var it = this._op.getGraph().getEdgeEnds().iterator(); it.hasNext();) {
        var de = it.next();
        var e = de.getEdge();

        if (de.isLineEdge() && !e.isCoveredSet()) {
          var isCovered = this._op.isCoveredByA(de.getCoordinate());

          e.setCovered(isCovered);
        }
      }
    },
    labelIsolatedLines: function labelIsolatedLines(edgesList) {
      for (var it = edgesList.iterator(); it.hasNext();) {
        var e = it.next();
        var label = e.getLabel();

        if (e.isIsolated()) {
          if (label.isNull(0)) this.labelIsolatedLine(e, 0);else this.labelIsolatedLine(e, 1);
        }
      }
    },
    buildLines: function buildLines(opCode) {
      for (var it = this._lineEdgesList.iterator(); it.hasNext();) {
        var e = it.next();
        var label = e.getLabel();

        var line = this._geometryFactory.createLineString(e.getCoordinates());

        this._resultLineList.add(line);

        e.setInResult(true);
      }
    },
    collectBoundaryTouchEdge: function collectBoundaryTouchEdge(de, opCode, edges) {
      var label = de.getLabel();
      if (de.isLineEdge()) return null;
      if (de.isVisited()) return null;
      if (de.isInteriorAreaEdge()) return null;
      if (de.getEdge().isInResult()) return null;
      Assert.isTrue(!(de.isInResult() || de.getSym().isInResult()) || !de.getEdge().isInResult());

      if (OverlayOp.isResultOfOp(label, opCode) && opCode === OverlayOp.INTERSECTION) {
        edges.add(de.getEdge());
        de.setVisitedEdge(true);
      }
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return LineBuilder;
    }
  });

  function PointBuilder() {
    this._op = null;
    this._geometryFactory = null;
    this._resultPointList = new ArrayList();
    var op = arguments[0],
        geometryFactory = arguments[1];
    this._op = op;
    this._geometryFactory = geometryFactory;
  }
  extend(PointBuilder.prototype, {
    filterCoveredNodeToPoint: function filterCoveredNodeToPoint(n) {
      var coord = n.getCoordinate();

      if (!this._op.isCoveredByLA(coord)) {
        var pt = this._geometryFactory.createPoint(coord);

        this._resultPointList.add(pt);
      }
    },
    extractNonCoveredResultNodes: function extractNonCoveredResultNodes(opCode) {
      for (var nodeit = this._op.getGraph().getNodes().iterator(); nodeit.hasNext();) {
        var n = nodeit.next();
        if (n.isInResult()) continue;
        if (n.isIncidentEdgeInResult()) continue;

        if (n.getEdges().getDegree() === 0 || opCode === OverlayOp.INTERSECTION) {
          var label = n.getLabel();

          if (OverlayOp.isResultOfOp(label, opCode)) {
            this.filterCoveredNodeToPoint(n);
          }
        }
      }
    },
    build: function build(opCode) {
      this.extractNonCoveredResultNodes(opCode);
      return this._resultPointList;
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return PointBuilder;
    }
  });

  function LineStringSnapper() {
    this._snapTolerance = 0.0;
    this._srcPts = null;
    this._seg = new LineSegment();
    this._allowSnappingToSourceVertices = false;
    this._isClosed = false;

    if (arguments[0] instanceof LineString && typeof arguments[1] === "number") {
      var srcLine = arguments[0],
          snapTolerance = arguments[1];
      LineStringSnapper.call(this, srcLine.getCoordinates(), snapTolerance);
    } else if (arguments[0] instanceof Array && typeof arguments[1] === "number") {
      var srcPts = arguments[0],
          _snapTolerance = arguments[1];
      this._srcPts = srcPts;
      this._isClosed = LineStringSnapper.isClosed(srcPts);
      this._snapTolerance = _snapTolerance;
    }
  }
  extend(LineStringSnapper.prototype, {
    snapVertices: function snapVertices(srcCoords, snapPts) {
      var end = this._isClosed ? srcCoords.size() - 1 : srcCoords.size();

      for (var i = 0; i < end; i++) {
        var srcPt = srcCoords.get(i);
        var snapVert = this.findSnapForVertex(srcPt, snapPts);

        if (snapVert !== null) {
          srcCoords.set(i, new Coordinate(snapVert));
          if (i === 0 && this._isClosed) srcCoords.set(srcCoords.size() - 1, new Coordinate(snapVert));
        }
      }
    },
    findSnapForVertex: function findSnapForVertex(pt, snapPts) {
      for (var i = 0; i < snapPts.length; i++) {
        if (pt.equals2D(snapPts[i])) return null;
        if (pt.distance(snapPts[i]) < this._snapTolerance) return snapPts[i];
      }

      return null;
    },
    snapTo: function snapTo(snapPts) {
      var coordList = new CoordinateList(this._srcPts);
      this.snapVertices(coordList, snapPts);
      this.snapSegments(coordList, snapPts);
      var newPts = coordList.toCoordinateArray();
      return newPts;
    },
    snapSegments: function snapSegments(srcCoords, snapPts) {
      if (snapPts.length === 0) return null;
      var distinctPtCount = snapPts.length;
      if (snapPts[0].equals2D(snapPts[snapPts.length - 1])) distinctPtCount = snapPts.length - 1;

      for (var i = 0; i < distinctPtCount; i++) {
        var snapPt = snapPts[i];
        var index = this.findSegmentIndexToSnap(snapPt, srcCoords);

        if (index >= 0) {
          srcCoords.add(index + 1, new Coordinate(snapPt), false);
        }
      }
    },
    findSegmentIndexToSnap: function findSegmentIndexToSnap(snapPt, srcCoords) {
      var minDist = Double.MAX_VALUE;
      var snapIndex = -1;

      for (var i = 0; i < srcCoords.size() - 1; i++) {
        this._seg.p0 = srcCoords.get(i);
        this._seg.p1 = srcCoords.get(i + 1);

        if (this._seg.p0.equals2D(snapPt) || this._seg.p1.equals2D(snapPt)) {
          if (this._allowSnappingToSourceVertices) continue;else return -1;
        }

        var dist = this._seg.distance(snapPt);

        if (dist < this._snapTolerance && dist < minDist) {
          minDist = dist;
          snapIndex = i;
        }
      }

      return snapIndex;
    },
    setAllowSnappingToSourceVertices: function setAllowSnappingToSourceVertices(allowSnappingToSourceVertices) {
      this._allowSnappingToSourceVertices = allowSnappingToSourceVertices;
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return LineStringSnapper;
    }
  });

  LineStringSnapper.isClosed = function (pts) {
    if (pts.length <= 1) return false;
    return pts[0].equals2D(pts[pts.length - 1]);
  };

  function GeometrySnapper() {
    this._srcGeom = null;
    var srcGeom = arguments[0];
    this._srcGeom = srcGeom;
  }
  extend(GeometrySnapper.prototype, {
    snapTo: function snapTo(snapGeom, snapTolerance) {
      var snapPts = this.extractTargetCoordinates(snapGeom);
      var snapTrans = new SnapTransformer(snapTolerance, snapPts);
      return snapTrans.transform(this._srcGeom);
    },
    snapToSelf: function snapToSelf(snapTolerance, cleanResult) {
      var snapPts = this.extractTargetCoordinates(this._srcGeom);
      var snapTrans = new SnapTransformer(snapTolerance, snapPts, true);
      var snappedGeom = snapTrans.transform(this._srcGeom);
      var result = snappedGeom;

      if (cleanResult && hasInterface(result, Polygonal)) {
        result = snappedGeom.buffer(0);
      }

      return result;
    },
    computeSnapTolerance: function computeSnapTolerance(ringPts) {
      var minSegLen = this.computeMinimumSegmentLength(ringPts);
      var snapTol = minSegLen / 10;
      return snapTol;
    },
    extractTargetCoordinates: function extractTargetCoordinates(g) {
      var ptSet = new TreeSet();
      var pts = g.getCoordinates();

      for (var i = 0; i < pts.length; i++) {
        ptSet.add(pts[i]);
      }

      return ptSet.toArray(new Array(0).fill(null));
    },
    computeMinimumSegmentLength: function computeMinimumSegmentLength(pts) {
      var minSegLen = Double.MAX_VALUE;

      for (var i = 0; i < pts.length - 1; i++) {
        var segLen = pts[i].distance(pts[i + 1]);
        if (segLen < minSegLen) minSegLen = segLen;
      }

      return minSegLen;
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return GeometrySnapper;
    }
  });

  GeometrySnapper.snap = function (g0, g1, snapTolerance) {
    var snapGeom = new Array(2).fill(null);
    var snapper0 = new GeometrySnapper(g0);
    snapGeom[0] = snapper0.snapTo(g1, snapTolerance);
    var snapper1 = new GeometrySnapper(g1);
    snapGeom[1] = snapper1.snapTo(snapGeom[0], snapTolerance);
    return snapGeom;
  };

  GeometrySnapper.computeOverlaySnapTolerance = function () {
    if (arguments.length === 1) {
      var g = arguments[0];
      var snapTolerance = GeometrySnapper.computeSizeBasedSnapTolerance(g);
      var pm = g.getPrecisionModel();

      if (pm.getType() === PrecisionModel.FIXED) {
        var fixedSnapTol = 1 / pm.getScale() * 2 / 1.415;
        if (fixedSnapTol > snapTolerance) snapTolerance = fixedSnapTol;
      }

      return snapTolerance;
    } else if (arguments.length === 2) {
      var g0 = arguments[0],
          g1 = arguments[1];
      return Math.min(GeometrySnapper.computeOverlaySnapTolerance(g0), GeometrySnapper.computeOverlaySnapTolerance(g1));
    }
  };

  GeometrySnapper.computeSizeBasedSnapTolerance = function (g) {
    var env = g.getEnvelopeInternal();
    var minDimension = Math.min(env.getHeight(), env.getWidth());
    var snapTol = minDimension * GeometrySnapper.SNAP_PRECISION_FACTOR;
    return snapTol;
  };

  GeometrySnapper.snapToSelf = function (geom, snapTolerance, cleanResult) {
    var snapper0 = new GeometrySnapper(geom);
    return snapper0.snapToSelf(snapTolerance, cleanResult);
  };

  GeometrySnapper.SNAP_PRECISION_FACTOR = 1e-9;

  function SnapTransformer() {
    GeometryTransformer.apply(this);
    this._snapTolerance = null;
    this._snapPts = null;
    this._isSelfSnap = false;

    if (arguments.length === 2) {
      var snapTolerance = arguments[0],
          snapPts = arguments[1];
      this._snapTolerance = snapTolerance;
      this._snapPts = snapPts;
    } else if (arguments.length === 3) {
      var _snapTolerance = arguments[0],
          _snapPts = arguments[1],
          isSelfSnap = arguments[2];
      this._snapTolerance = _snapTolerance;
      this._snapPts = _snapPts;
      this._isSelfSnap = isSelfSnap;
    }
  }

  inherits(SnapTransformer, GeometryTransformer);
  extend(SnapTransformer.prototype, {
    snapLine: function snapLine(srcPts, snapPts) {
      var snapper = new LineStringSnapper(srcPts, this._snapTolerance);
      snapper.setAllowSnappingToSourceVertices(this._isSelfSnap);
      return snapper.snapTo(snapPts);
    },
    transformCoordinates: function transformCoordinates(coords, parent) {
      var srcPts = coords.toCoordinateArray();
      var newPts = this.snapLine(srcPts, this._snapPts);
      return this._factory.getCoordinateSequenceFactory().create(newPts);
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return SnapTransformer;
    }
  });

  function CommonBits() {
    this._isFirst = true;
    this._commonMantissaBitsCount = 53;
    this._commonBits = new Long();
    this._commonSignExp = null;
  }
  extend(CommonBits.prototype, {
    getCommon: function getCommon() {
      return Double.longBitsToDouble(this._commonBits);
    },
    add: function add(num) {
      var numBits = Double.doubleToLongBits(num);

      if (this._isFirst) {
        this._commonBits = numBits;
        this._commonSignExp = CommonBits.signExpBits(this._commonBits);
        this._isFirst = false;
        return null;
      }

      var numSignExp = CommonBits.signExpBits(numBits);

      if (numSignExp !== this._commonSignExp) {
        this._commonBits.high = 0 | 0;
        this._commonBits.low = 0 | 0;
        return null;
      }

      this._commonMantissaBitsCount = CommonBits.numCommonMostSigMantissaBits(this._commonBits, numBits);
      this._commonBits = CommonBits.zeroLowerBits(this._commonBits, 64 - (12 + this._commonMantissaBitsCount));
    },
    toString: function toString() {
      if (arguments.length === 1) {
        var bits = arguments[0];
        var x = Double.longBitsToDouble(bits);
        var numStr = Long.toBinaryString(bits);
        var padStr = "0000000000000000000000000000000000000000000000000000000000000000" + numStr;
        var bitStr = padStr.substring(padStr.length - 64);
        var str = bitStr.substring(0, 1) + "  " + bitStr.substring(1, 12) + "(exp) " + bitStr.substring(12) + " [ " + x + " ]";
        return str;
      }
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return CommonBits;
    }
  });

  CommonBits.getBit = function (bits, i) {
    var mask = 1 << i % 32;

    if (i < 32) {
      return (bits.low & mask) != 0 ? 1 : 0;
    }

    return (bits.high & mask) != 0 ? 1 : 0;
  };

  CommonBits.signExpBits = function (num) {
    return num.high >>> 20;
  };

  CommonBits.zeroLowerBits = function (bits, nBits) {
    var prop = 'low';

    if (nBits > 32) {
      bits.low = 0 | 0;
      nBits %= 32;
      prop = 'high';
    }

    if (nBits > 0) {
      var mask = nBits < 32 ? ~((1 << nBits) - 1) : 0;
      bits[prop] &= mask;
    }

    return bits;
  };

  CommonBits.numCommonMostSigMantissaBits = function (num1, num2) {
    var count = 0;

    for (var i = 52; i >= 0; i--) {
      if (CommonBits.getBit(num1, i) !== CommonBits.getBit(num2, i)) return count;
      count++;
    }

    return 52;
  };

  function CommonBitsRemover() {
    this._commonCoord = null;
    this._ccFilter = new CommonCoordinateFilter();
  }
  extend(CommonBitsRemover.prototype, {
    addCommonBits: function addCommonBits(geom) {
      var trans = new Translater(this._commonCoord);
      geom.apply(trans);
      geom.geometryChanged();
    },
    removeCommonBits: function removeCommonBits(geom) {
      if (this._commonCoord.x === 0.0 && this._commonCoord.y === 0.0) return geom;
      var invCoord = new Coordinate(this._commonCoord);
      invCoord.x = -invCoord.x;
      invCoord.y = -invCoord.y;
      var trans = new Translater(invCoord);
      geom.apply(trans);
      geom.geometryChanged();
      return geom;
    },
    getCommonCoordinate: function getCommonCoordinate() {
      return this._commonCoord;
    },
    add: function add(geom) {
      geom.apply(this._ccFilter);
      this._commonCoord = this._ccFilter.getCommonCoordinate();
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return CommonBitsRemover;
    }
  });

  function CommonCoordinateFilter() {
    this._commonBitsX = new CommonBits();
    this._commonBitsY = new CommonBits();
  }

  extend(CommonCoordinateFilter.prototype, {
    filter: function filter(coord) {
      this._commonBitsX.add(coord.x);

      this._commonBitsY.add(coord.y);
    },
    getCommonCoordinate: function getCommonCoordinate() {
      return new Coordinate(this._commonBitsX.getCommon(), this._commonBitsY.getCommon());
    },
    interfaces_: function interfaces_() {
      return [CoordinateFilter];
    },
    getClass: function getClass() {
      return CommonCoordinateFilter;
    }
  });

  function Translater() {
    this.trans = null;
    var trans = arguments[0];
    this.trans = trans;
  }

  extend(Translater.prototype, {
    filter: function filter(seq, i) {
      var xp = seq.getOrdinate(i, 0) + this.trans.x;
      var yp = seq.getOrdinate(i, 1) + this.trans.y;
      seq.setOrdinate(i, 0, xp);
      seq.setOrdinate(i, 1, yp);
    },
    isDone: function isDone() {
      return false;
    },
    isGeometryChanged: function isGeometryChanged() {
      return true;
    },
    interfaces_: function interfaces_() {
      return [CoordinateSequenceFilter];
    },
    getClass: function getClass() {
      return Translater;
    }
  });
  CommonBitsRemover.CommonCoordinateFilter = CommonCoordinateFilter;
  CommonBitsRemover.Translater = Translater;

  function SnapOverlayOp() {
    this._geom = new Array(2).fill(null);
    this._snapTolerance = null;
    this._cbr = null;
    var g1 = arguments[0],
        g2 = arguments[1];
    this._geom[0] = g1;
    this._geom[1] = g2;
    this.computeSnapTolerance();
  }
  extend(SnapOverlayOp.prototype, {
    selfSnap: function selfSnap(geom) {
      var snapper0 = new GeometrySnapper(geom);
      var snapGeom = snapper0.snapTo(geom, this._snapTolerance);
      return snapGeom;
    },
    removeCommonBits: function removeCommonBits(geom) {
      this._cbr = new CommonBitsRemover();

      this._cbr.add(geom[0]);

      this._cbr.add(geom[1]);

      var remGeom = new Array(2).fill(null);
      remGeom[0] = this._cbr.removeCommonBits(geom[0].copy());
      remGeom[1] = this._cbr.removeCommonBits(geom[1].copy());
      return remGeom;
    },
    prepareResult: function prepareResult(geom) {
      this._cbr.addCommonBits(geom);

      return geom;
    },
    getResultGeometry: function getResultGeometry(opCode) {
      var prepGeom = this.snap(this._geom);
      var result = OverlayOp.overlayOp(prepGeom[0], prepGeom[1], opCode);
      return this.prepareResult(result);
    },
    checkValid: function checkValid(g) {
      if (!g.isValid()) {
        System.out.println("Snapped geometry is invalid");
      }
    },
    computeSnapTolerance: function computeSnapTolerance() {
      this._snapTolerance = GeometrySnapper.computeOverlaySnapTolerance(this._geom[0], this._geom[1]);
    },
    snap: function snap(geom) {
      var remGeom = this.removeCommonBits(geom);
      var snapGeom = GeometrySnapper.snap(remGeom[0], remGeom[1], this._snapTolerance);
      return snapGeom;
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return SnapOverlayOp;
    }
  });

  SnapOverlayOp.overlayOp = function (g0, g1, opCode) {
    var op = new SnapOverlayOp(g0, g1);
    return op.getResultGeometry(opCode);
  };

  SnapOverlayOp.union = function (g0, g1) {
    return SnapOverlayOp.overlayOp(g0, g1, OverlayOp.UNION);
  };

  SnapOverlayOp.intersection = function (g0, g1) {
    return SnapOverlayOp.overlayOp(g0, g1, OverlayOp.INTERSECTION);
  };

  SnapOverlayOp.symDifference = function (g0, g1) {
    return SnapOverlayOp.overlayOp(g0, g1, OverlayOp.SYMDIFFERENCE);
  };

  SnapOverlayOp.difference = function (g0, g1) {
    return SnapOverlayOp.overlayOp(g0, g1, OverlayOp.DIFFERENCE);
  };

  function SnapIfNeededOverlayOp() {
    this._geom = new Array(2).fill(null);
    var g1 = arguments[0],
        g2 = arguments[1];
    this._geom[0] = g1;
    this._geom[1] = g2;
  }
  extend(SnapIfNeededOverlayOp.prototype, {
    getResultGeometry: function getResultGeometry(opCode) {
      var result = null;
      var isSuccess = false;
      var savedException = null;

      try {
        result = OverlayOp.overlayOp(this._geom[0], this._geom[1], opCode);
        isSuccess = true;
      } catch (ex) {
        if (ex instanceof RuntimeException) {
          savedException = ex;
        } else throw ex;
      } finally {}

      if (!isSuccess) {
        try {
          result = SnapOverlayOp.overlayOp(this._geom[0], this._geom[1], opCode);
        } catch (ex) {
          if (ex instanceof RuntimeException) {
            throw savedException;
          } else throw ex;
        } finally {}
      }

      return result;
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return SnapIfNeededOverlayOp;
    }
  });

  SnapIfNeededOverlayOp.overlayOp = function (g0, g1, opCode) {
    var op = new SnapIfNeededOverlayOp(g0, g1);
    return op.getResultGeometry(opCode);
  };

  SnapIfNeededOverlayOp.union = function (g0, g1) {
    return SnapIfNeededOverlayOp.overlayOp(g0, g1, OverlayOp.UNION);
  };

  SnapIfNeededOverlayOp.intersection = function (g0, g1) {
    return SnapIfNeededOverlayOp.overlayOp(g0, g1, OverlayOp.INTERSECTION);
  };

  SnapIfNeededOverlayOp.symDifference = function (g0, g1) {
    return SnapIfNeededOverlayOp.overlayOp(g0, g1, OverlayOp.SYMDIFFERENCE);
  };

  SnapIfNeededOverlayOp.difference = function (g0, g1) {
    return SnapIfNeededOverlayOp.overlayOp(g0, g1, OverlayOp.DIFFERENCE);
  };

  function GeometryGraphOperation() {
    this._li = new RobustLineIntersector();
    this._resultPrecisionModel = null;
    this._arg = null;

    if (arguments.length === 1) {
      var g0 = arguments[0];
      this.setComputationPrecision(g0.getPrecisionModel());
      this._arg = new Array(1).fill(null);
      this._arg[0] = new GeometryGraph(0, g0);
    } else if (arguments.length === 2) {
      var _g = arguments[0],
          g1 = arguments[1];
      GeometryGraphOperation.call(this, _g, g1, BoundaryNodeRule.OGC_SFS_BOUNDARY_RULE);
    } else if (arguments.length === 3) {
      var _g2 = arguments[0],
          _g3 = arguments[1],
          boundaryNodeRule = arguments[2];
      if (_g2.getPrecisionModel().compareTo(_g3.getPrecisionModel()) >= 0) this.setComputationPrecision(_g2.getPrecisionModel());else this.setComputationPrecision(_g3.getPrecisionModel());
      this._arg = new Array(2).fill(null);
      this._arg[0] = new GeometryGraph(0, _g2, boundaryNodeRule);
      this._arg[1] = new GeometryGraph(1, _g3, boundaryNodeRule);
    }
  }
  extend(GeometryGraphOperation.prototype, {
    getArgGeometry: function getArgGeometry(i) {
      return this._arg[i].getGeometry();
    },
    setComputationPrecision: function setComputationPrecision(pm) {
      this._resultPrecisionModel = pm;

      this._li.setPrecisionModel(this._resultPrecisionModel);
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return GeometryGraphOperation;
    }
  });

  function OverlayOp() {
    this._ptLocator = new PointLocator();
    this._geomFact = null;
    this._resultGeom = null;
    this._graph = null;
    this._edgeList = new EdgeList();
    this._resultPolyList = new ArrayList();
    this._resultLineList = new ArrayList();
    this._resultPointList = new ArrayList();
    var g0 = arguments[0],
        g1 = arguments[1];
    GeometryGraphOperation.call(this, g0, g1);
    this._graph = new PlanarGraph(new OverlayNodeFactory());
    this._geomFact = g0.getFactory();
  }
  inherits(OverlayOp, GeometryGraphOperation);
  extend(OverlayOp.prototype, {
    insertUniqueEdge: function insertUniqueEdge(e) {
      var existingEdge = this._edgeList.findEqualEdge(e);

      if (existingEdge !== null) {
        var existingLabel = existingEdge.getLabel();
        var labelToMerge = e.getLabel();

        if (!existingEdge.isPointwiseEqual(e)) {
          labelToMerge = new Label(e.getLabel());
          labelToMerge.flip();
        }

        var depth = existingEdge.getDepth();

        if (depth.isNull()) {
          depth.add(existingLabel);
        }

        depth.add(labelToMerge);
        existingLabel.merge(labelToMerge);
      } else {
        this._edgeList.add(e);
      }
    },
    getGraph: function getGraph() {
      return this._graph;
    },
    cancelDuplicateResultEdges: function cancelDuplicateResultEdges() {
      for (var it = this._graph.getEdgeEnds().iterator(); it.hasNext();) {
        var de = it.next();
        var sym = de.getSym();

        if (de.isInResult() && sym.isInResult()) {
          de.setInResult(false);
          sym.setInResult(false);
        }
      }
    },
    isCoveredByLA: function isCoveredByLA(coord) {
      if (this.isCovered(coord, this._resultLineList)) return true;
      if (this.isCovered(coord, this._resultPolyList)) return true;
      return false;
    },
    computeGeometry: function computeGeometry(resultPointList, resultLineList, resultPolyList, opcode) {
      var geomList = new ArrayList();
      geomList.addAll(resultPointList);
      geomList.addAll(resultLineList);
      geomList.addAll(resultPolyList);
      if (geomList.isEmpty()) return OverlayOp.createEmptyResult(opcode, this._arg[0].getGeometry(), this._arg[1].getGeometry(), this._geomFact);
      return this._geomFact.buildGeometry(geomList);
    },
    mergeSymLabels: function mergeSymLabels() {
      for (var nodeit = this._graph.getNodes().iterator(); nodeit.hasNext();) {
        var node = nodeit.next();
        node.getEdges().mergeSymLabels();
      }
    },
    isCovered: function isCovered(coord, geomList) {
      for (var it = geomList.iterator(); it.hasNext();) {
        var geom = it.next();

        var loc = this._ptLocator.locate(coord, geom);

        if (loc !== Location.EXTERIOR) return true;
      }

      return false;
    },
    replaceCollapsedEdges: function replaceCollapsedEdges() {
      var newEdges = new ArrayList();

      for (var it = this._edgeList.iterator(); it.hasNext();) {
        var e = it.next();

        if (e.isCollapsed()) {
          it.remove();
          newEdges.add(e.getCollapsedEdge());
        }
      }

      this._edgeList.addAll(newEdges);
    },
    updateNodeLabelling: function updateNodeLabelling() {
      for (var nodeit = this._graph.getNodes().iterator(); nodeit.hasNext();) {
        var node = nodeit.next();
        var lbl = node.getEdges().getLabel();
        node.getLabel().merge(lbl);
      }
    },
    getResultGeometry: function getResultGeometry(overlayOpCode) {
      this.computeOverlay(overlayOpCode);
      return this._resultGeom;
    },
    insertUniqueEdges: function insertUniqueEdges(edges) {
      for (var i = edges.iterator(); i.hasNext();) {
        var e = i.next();
        this.insertUniqueEdge(e);
      }
    },
    computeOverlay: function computeOverlay(opCode) {
      this.copyPoints(0);
      this.copyPoints(1);

      this._arg[0].computeSelfNodes(this._li, false);

      this._arg[1].computeSelfNodes(this._li, false);

      this._arg[0].computeEdgeIntersections(this._arg[1], this._li, true);

      var baseSplitEdges = new ArrayList();

      this._arg[0].computeSplitEdges(baseSplitEdges);

      this._arg[1].computeSplitEdges(baseSplitEdges);
      this.insertUniqueEdges(baseSplitEdges);
      this.computeLabelsFromDepths();
      this.replaceCollapsedEdges();
      EdgeNodingValidator.checkValid(this._edgeList.getEdges());

      this._graph.addEdges(this._edgeList.getEdges());

      this.computeLabelling();
      this.labelIncompleteNodes();
      this.findResultAreaEdges(opCode);
      this.cancelDuplicateResultEdges();
      var polyBuilder = new PolygonBuilder(this._geomFact);
      polyBuilder.add(this._graph);
      this._resultPolyList = polyBuilder.getPolygons();
      var lineBuilder = new LineBuilder(this, this._geomFact, this._ptLocator);
      this._resultLineList = lineBuilder.build(opCode);
      var pointBuilder = new PointBuilder(this, this._geomFact, this._ptLocator);
      this._resultPointList = pointBuilder.build(opCode);
      this._resultGeom = this.computeGeometry(this._resultPointList, this._resultLineList, this._resultPolyList, opCode);
    },
    labelIncompleteNode: function labelIncompleteNode(n, targetIndex) {
      var loc = this._ptLocator.locate(n.getCoordinate(), this._arg[targetIndex].getGeometry());

      n.getLabel().setLocation(targetIndex, loc);
    },
    copyPoints: function copyPoints(argIndex) {
      for (var i = this._arg[argIndex].getNodeIterator(); i.hasNext();) {
        var graphNode = i.next();

        var newNode = this._graph.addNode(graphNode.getCoordinate());

        newNode.setLabel(argIndex, graphNode.getLabel().getLocation(argIndex));
      }
    },
    findResultAreaEdges: function findResultAreaEdges(opCode) {
      for (var it = this._graph.getEdgeEnds().iterator(); it.hasNext();) {
        var de = it.next();
        var label = de.getLabel();

        if (label.isArea() && !de.isInteriorAreaEdge() && OverlayOp.isResultOfOp(label.getLocation(0, Position.RIGHT), label.getLocation(1, Position.RIGHT), opCode)) {
          de.setInResult(true);
        }
      }
    },
    computeLabelsFromDepths: function computeLabelsFromDepths() {
      for (var it = this._edgeList.iterator(); it.hasNext();) {
        var e = it.next();
        var lbl = e.getLabel();
        var depth = e.getDepth();

        if (!depth.isNull()) {
          depth.normalize();

          for (var i = 0; i < 2; i++) {
            if (!lbl.isNull(i) && lbl.isArea() && !depth.isNull(i)) {
              if (depth.getDelta(i) === 0) {
                lbl.toLine(i);
              } else {
                Assert.isTrue(!depth.isNull(i, Position.LEFT), "depth of LEFT side has not been initialized");
                lbl.setLocation(i, Position.LEFT, depth.getLocation(i, Position.LEFT));
                Assert.isTrue(!depth.isNull(i, Position.RIGHT), "depth of RIGHT side has not been initialized");
                lbl.setLocation(i, Position.RIGHT, depth.getLocation(i, Position.RIGHT));
              }
            }
          }
        }
      }
    },
    computeLabelling: function computeLabelling() {
      for (var nodeit = this._graph.getNodes().iterator(); nodeit.hasNext();) {
        var node = nodeit.next();
        node.getEdges().computeLabelling(this._arg);
      }

      this.mergeSymLabels();
      this.updateNodeLabelling();
    },
    labelIncompleteNodes: function labelIncompleteNodes() {

      for (var ni = this._graph.getNodes().iterator(); ni.hasNext();) {
        var n = ni.next();
        var label = n.getLabel();

        if (n.isIsolated()) {
          if (label.isNull(0)) this.labelIncompleteNode(n, 0);else this.labelIncompleteNode(n, 1);
        }

        n.getEdges().updateLabelling(label);
      }
    },
    isCoveredByA: function isCoveredByA(coord) {
      if (this.isCovered(coord, this._resultPolyList)) return true;
      return false;
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return OverlayOp;
    }
  });

  OverlayOp.overlayOp = function (geom0, geom1, opCode) {
    var gov = new OverlayOp(geom0, geom1);
    var geomOv = gov.getResultGeometry(opCode);
    return geomOv;
  };

  OverlayOp.union = function (geom, other) {
    if (geom.isEmpty() || other.isEmpty()) {
      if (geom.isEmpty() && other.isEmpty()) return OverlayOp.createEmptyResult(OverlayOp.UNION, geom, other, geom.getFactory());
      if (geom.isEmpty()) return other.copy();
      if (other.isEmpty()) return geom.copy();
    }

    if (geom.isGeometryCollection() || other.isGeometryCollection()) throw new IllegalArgumentException("This method does not support GeometryCollection arguments");
    return SnapIfNeededOverlayOp.overlayOp(geom, other, OverlayOp.UNION);
  };

  OverlayOp.intersection = function (geom, other) {
    if (geom.isEmpty() || other.isEmpty()) return OverlayOp.createEmptyResult(OverlayOp.INTERSECTION, geom, other, geom.getFactory());

    if (geom.isGeometryCollection()) {
      var g2 = other;
      return GeometryCollectionMapper.map(geom, {
        interfaces_: function interfaces_() {
          return [MapOp];
        },
        map: function map(g) {
          return g.intersection(g2);
        }
      });
    }

    if (geom.isGeometryCollection() || other.isGeometryCollection()) throw new IllegalArgumentException("This method does not support GeometryCollection arguments");
    return SnapIfNeededOverlayOp.overlayOp(geom, other, OverlayOp.INTERSECTION);
  };

  OverlayOp.symDifference = function (geom, other) {
    if (geom.isEmpty() || other.isEmpty()) {
      if (geom.isEmpty() && other.isEmpty()) return OverlayOp.createEmptyResult(OverlayOp.SYMDIFFERENCE, geom, other, geom.getFactory());
      if (geom.isEmpty()) return other.copy();
      if (other.isEmpty()) return geom.copy();
    }

    if (geom.isGeometryCollection() || other.isGeometryCollection()) throw new IllegalArgumentException("This method does not support GeometryCollection arguments");
    return SnapIfNeededOverlayOp.overlayOp(geom, other, OverlayOp.SYMDIFFERENCE);
  };

  OverlayOp.resultDimension = function (opCode, g0, g1) {
    var dim0 = g0.getDimension();
    var dim1 = g1.getDimension();
    var resultDimension = -1;

    switch (opCode) {
      case OverlayOp.INTERSECTION:
        resultDimension = Math.min(dim0, dim1);
        break;

      case OverlayOp.UNION:
        resultDimension = Math.max(dim0, dim1);
        break;

      case OverlayOp.DIFFERENCE:
        resultDimension = dim0;
        break;

      case OverlayOp.SYMDIFFERENCE:
        resultDimension = Math.max(dim0, dim1);
        break;
    }

    return resultDimension;
  };

  OverlayOp.createEmptyResult = function (overlayOpCode, a, b, geomFact) {
    var result = null;

    switch (OverlayOp.resultDimension(overlayOpCode, a, b)) {
      case -1:
        result = geomFact.createGeometryCollection();
        break;

      case 0:
        result = geomFact.createPoint();
        break;

      case 1:
        result = geomFact.createLineString();
        break;

      case 2:
        result = geomFact.createPolygon();
        break;
    }

    return result;
  };

  OverlayOp.difference = function (geom, other) {
    if (geom.isEmpty()) return OverlayOp.createEmptyResult(OverlayOp.DIFFERENCE, geom, other, geom.getFactory());
    if (other.isEmpty()) return geom.copy();
    if (geom.isGeometryCollection() || other.isGeometryCollection()) throw new IllegalArgumentException("This method does not support GeometryCollection arguments");
    return SnapIfNeededOverlayOp.overlayOp(geom, other, OverlayOp.DIFFERENCE);
  };

  OverlayOp.isResultOfOp = function () {
    if (arguments.length === 2) {
      var label = arguments[0],
          opCode = arguments[1];
      var loc0 = label.getLocation(0);
      var loc1 = label.getLocation(1);
      return OverlayOp.isResultOfOp(loc0, loc1, opCode);
    } else if (arguments.length === 3) {
      var _loc = arguments[0],
          _loc2 = arguments[1],
          overlayOpCode = arguments[2];
      if (_loc === Location.BOUNDARY) _loc = Location.INTERIOR;
      if (_loc2 === Location.BOUNDARY) _loc2 = Location.INTERIOR;

      switch (overlayOpCode) {
        case OverlayOp.INTERSECTION:
          return _loc === Location.INTERIOR && _loc2 === Location.INTERIOR;

        case OverlayOp.UNION:
          return _loc === Location.INTERIOR || _loc2 === Location.INTERIOR;

        case OverlayOp.DIFFERENCE:
          return _loc === Location.INTERIOR && _loc2 !== Location.INTERIOR;

        case OverlayOp.SYMDIFFERENCE:
          return _loc === Location.INTERIOR && _loc2 !== Location.INTERIOR || _loc !== Location.INTERIOR && _loc2 === Location.INTERIOR;
      }

      return false;
    }
  };

  OverlayOp.INTERSECTION = 1;
  OverlayOp.UNION = 2;
  OverlayOp.DIFFERENCE = 3;
  OverlayOp.SYMDIFFERENCE = 4;



  var overlay = /*#__PURE__*/Object.freeze({
    OverlayOp: OverlayOp
  });

  function PolygonizeDirectedEdge() {
    this._edgeRing = null;
    this._next = null;
    this._label = -1;
    var from = arguments[0],
        to = arguments[1],
        directionPt = arguments[2],
        edgeDirection = arguments[3];
    DirectedEdge$1.call(this, from, to, directionPt, edgeDirection);
  }
  inherits(PolygonizeDirectedEdge, DirectedEdge$1);
  extend(PolygonizeDirectedEdge.prototype, {
    getNext: function getNext() {
      return this._next;
    },
    isInRing: function isInRing() {
      return this._edgeRing !== null;
    },
    setRing: function setRing(edgeRing) {
      this._edgeRing = edgeRing;
    },
    setLabel: function setLabel(label) {
      this._label = label;
    },
    getLabel: function getLabel() {
      return this._label;
    },
    setNext: function setNext(next) {
      this._next = next;
    },
    getRing: function getRing() {
      return this._edgeRing;
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return PolygonizeDirectedEdge;
    }
  });

  function PolygonizeEdge() {
    Edge$1.apply(this);
    this._line = null;
    var line = arguments[0];
    this._line = line;
  }
  inherits(PolygonizeEdge, Edge$1);
  extend(PolygonizeEdge.prototype, {
    getLine: function getLine() {
      return this._line;
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return PolygonizeEdge;
    }
  });

  function EdgeRing$1() {
    this._factory = null;
    this._deList = new ArrayList();
    this._lowestEdge = null;
    this._ring = null;
    this._ringPts = null;
    this._holes = null;
    this._shell = null;
    this._isHole = null;
    this._isProcessed = false;
    this._isIncludedSet = false;
    this._isIncluded = false;
    var factory = arguments[0];
    this._factory = factory;
  }
  extend(EdgeRing$1.prototype, {
    isIncluded: function isIncluded() {
      return this._isIncluded;
    },
    getCoordinates: function getCoordinates() {
      if (this._ringPts === null) {
        var coordList = new CoordinateList();

        for (var i = this._deList.iterator(); i.hasNext();) {
          var de = i.next();
          var edge = de.getEdge();
          EdgeRing$1.addEdge(edge.getLine().getCoordinates(), de.getEdgeDirection(), coordList);
        }

        this._ringPts = coordList.toCoordinateArray();
      }

      return this._ringPts;
    },
    isIncludedSet: function isIncludedSet() {
      return this._isIncludedSet;
    },
    isValid: function isValid() {
      this.getCoordinates();
      if (this._ringPts.length <= 3) return false;
      this.getRing();
      return this._ring.isValid();
    },
    build: function build(startDE) {
      var de = startDE;

      do {
        this.add(de);
        de.setRing(this);
        de = de.getNext();
        Assert.isTrue(de !== null, "found null DE in ring");
        Assert.isTrue(de === startDE || !de.isInRing(), "found DE already in ring");
      } while (de !== startDE);
    },
    isOuterHole: function isOuterHole() {
      if (!this._isHole) return false;
      return !this.hasShell();
    },
    getPolygon: function getPolygon() {
      var holeLR = null;

      if (this._holes !== null) {
        holeLR = new Array(this._holes.size()).fill(null);

        for (var i = 0; i < this._holes.size(); i++) {
          holeLR[i] = this._holes.get(i);
        }
      }

      var poly = this._factory.createPolygon(this._ring, holeLR);

      return poly;
    },
    isHole: function isHole() {
      return this._isHole;
    },
    isProcessed: function isProcessed() {
      return this._isProcessed;
    },
    addHole: function addHole() {
      if (arguments[0] instanceof LinearRing) {
        var _hole = arguments[0];
        if (this._holes === null) this._holes = new ArrayList();

        this._holes.add(_hole);
      } else if (arguments[0] instanceof EdgeRing$1) {
        var holeER = arguments[0];
        holeER.setShell(this);
        var hole = holeER.getRing();
        if (this._holes === null) this._holes = new ArrayList();

        this._holes.add(hole);
      }
    },
    setIncluded: function setIncluded(isIncluded) {
      this._isIncluded = isIncluded;
      this._isIncludedSet = true;
    },
    getOuterHole: function getOuterHole() {
      if (this.isHole()) return null;

      for (var i = 0; i < this._deList.size(); i++) {
        var de = this._deList.get(i);

        var adjRing = de.getSym().getRing();
        if (adjRing.isOuterHole()) return adjRing;
      }

      return null;
    },
    computeHole: function computeHole() {
      var ring = this.getRing();
      this._isHole = Orientation.isCCW(ring.getCoordinates());
    },
    hasShell: function hasShell() {
      return this._shell !== null;
    },
    isOuterShell: function isOuterShell() {
      return this.getOuterHole() !== null;
    },
    getLineString: function getLineString() {
      this.getCoordinates();
      return this._factory.createLineString(this._ringPts);
    },
    toString: function toString() {
      return WKTWriter.toLineString(new CoordinateArraySequence(this.getCoordinates()));
    },
    getShell: function getShell() {
      if (this.isHole()) return this._shell;
      return this;
    },
    add: function add(de) {
      this._deList.add(de);
    },
    getRing: function getRing() {
      if (this._ring !== null) return this._ring;
      this.getCoordinates();
      if (this._ringPts.length < 3) System.out.println(this._ringPts);

      try {
        this._ring = this._factory.createLinearRing(this._ringPts);
      } catch (ex) {
        if (ex instanceof Exception) {
          System.out.println(this._ringPts);
        } else throw ex;
      } finally {}

      return this._ring;
    },
    updateIncluded: function updateIncluded() {
      if (this.isHole()) return null;

      for (var i = 0; i < this._deList.size(); i++) {
        var de = this._deList.get(i);

        var adjShell = de.getSym().getRing().getShell();

        if (adjShell !== null && adjShell.isIncludedSet()) {
          this.setIncluded(!adjShell.isIncluded());
          return null;
        }
      }
    },
    setShell: function setShell(shell) {
      this._shell = shell;
    },
    setProcessed: function setProcessed(isProcessed) {
      this._isProcessed = isProcessed;
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return EdgeRing$1;
    }
  });

  EdgeRing$1.findDirEdgesInRing = function (startDE) {
    var de = startDE;
    var edges = new ArrayList();

    do {
      edges.add(de);
      de = de.getNext();
      Assert.isTrue(de !== null, "found null DE in ring");
      Assert.isTrue(de === startDE || !de.isInRing(), "found DE already in ring");
    } while (de !== startDE);

    return edges;
  };

  EdgeRing$1.addEdge = function (coords, isForward, coordList) {
    if (isForward) {
      for (var i = 0; i < coords.length; i++) {
        coordList.add(coords[i], false);
      }
    } else {
      for (var i = coords.length - 1; i >= 0; i--) {
        coordList.add(coords[i], false);
      }
    }
  };

  EdgeRing$1.findEdgeRingContaining = function (testEr, shellList) {
    var testRing = testEr.getRing();
    var testEnv = testRing.getEnvelopeInternal();
    var testPt = testRing.getCoordinateN(0);
    var minShell = null;
    var minShellEnv = null;

    for (var it = shellList.iterator(); it.hasNext();) {
      var tryShell = it.next();
      var tryShellRing = tryShell.getRing();
      var tryShellEnv = tryShellRing.getEnvelopeInternal();
      if (tryShellEnv.equals(testEnv)) continue;
      if (!tryShellEnv.contains(testEnv)) continue;
      testPt = CoordinateArrays.ptNotInList(testRing.getCoordinates(), tryShellRing.getCoordinates());
      var isContained = false;
      if (PointLocation.isInRing(testPt, tryShellRing.getCoordinates())) isContained = true;

      if (isContained) {
        if (minShell === null || minShellEnv.contains(tryShellEnv)) {
          minShell = tryShell;
          minShellEnv = minShell.getRing().getEnvelopeInternal();
        }
      }
    }

    return minShell;
  };

  function EnvelopeComparator() {}

  extend(EnvelopeComparator.prototype, {
    compare: function compare(obj0, obj1) {
      var r0 = obj0;
      var r1 = obj1;
      return r0.getRing().getEnvelope().compareTo(r1.getRing().getEnvelope());
    },
    interfaces_: function interfaces_() {
      return [Comparator];
    },
    getClass: function getClass() {
      return EnvelopeComparator;
    }
  });
  EdgeRing$1.EnvelopeComparator = EnvelopeComparator;

  function PolygonizeGraph() {
    PlanarGraph$1.apply(this);
    this._factory = null;
    var factory = arguments[0];
    this._factory = factory;
  }
  inherits(PolygonizeGraph, PlanarGraph$1);
  extend(PolygonizeGraph.prototype, {
    findEdgeRing: function findEdgeRing(startDE) {
      var er = new EdgeRing$1(this._factory);
      er.build(startDE);
      return er;
    },
    computeDepthParity: function computeDepthParity() {
      if (arguments.length === 0) {
        while (true) {
          var de = null;
          return null;
          this.computeDepthParity(de);
        }
      }
    },
    computeNextCWEdges: function computeNextCWEdges() {
      for (var iNode = this.nodeIterator(); iNode.hasNext();) {
        var node = iNode.next();
        PolygonizeGraph.computeNextCWEdges(node);
      }
    },
    addEdge: function addEdge(line) {
      if (line.isEmpty()) {
        return null;
      }

      var linePts = CoordinateArrays.removeRepeatedPoints(line.getCoordinates());

      if (linePts.length < 2) {
        return null;
      }

      var startPt = linePts[0];
      var endPt = linePts[linePts.length - 1];
      var nStart = this.getNode(startPt);
      var nEnd = this.getNode(endPt);
      var de0 = new PolygonizeDirectedEdge(nStart, nEnd, linePts[1], true);
      var de1 = new PolygonizeDirectedEdge(nEnd, nStart, linePts[linePts.length - 2], false);
      var edge = new PolygonizeEdge(line);
      edge.setDirectedEdges(de0, de1);
      this.add(edge);
    },
    deleteCutEdges: function deleteCutEdges() {
      this.computeNextCWEdges();
      PolygonizeGraph.findLabeledEdgeRings(this._dirEdges);
      var cutLines = new ArrayList();

      for (var i = this._dirEdges.iterator(); i.hasNext();) {
        var de = i.next();
        if (de.isMarked()) continue;
        var sym = de.getSym();

        if (de.getLabel() === sym.getLabel()) {
          de.setMarked(true);
          sym.setMarked(true);
          var e = de.getEdge();
          cutLines.add(e.getLine());
        }
      }

      return cutLines;
    },
    getEdgeRings: function getEdgeRings() {
      this.computeNextCWEdges();
      PolygonizeGraph.label(this._dirEdges, -1);
      var maximalRings = PolygonizeGraph.findLabeledEdgeRings(this._dirEdges);
      this.convertMaximalToMinimalEdgeRings(maximalRings);
      var edgeRingList = new ArrayList();

      for (var i = this._dirEdges.iterator(); i.hasNext();) {
        var de = i.next();
        if (de.isMarked()) continue;
        if (de.isInRing()) continue;
        var er = this.findEdgeRing(de);
        edgeRingList.add(er);
      }

      return edgeRingList;
    },
    getNode: function getNode(pt) {
      var node = this.findNode(pt);

      if (node === null) {
        node = new Node$3(pt);
        this.add(node);
      }

      return node;
    },
    convertMaximalToMinimalEdgeRings: function convertMaximalToMinimalEdgeRings(ringEdges) {
      for (var i = ringEdges.iterator(); i.hasNext();) {
        var de = i.next();
        var label = de.getLabel();
        var intNodes = PolygonizeGraph.findIntersectionNodes(de, label);
        if (intNodes === null) continue;

        for (var iNode = intNodes.iterator(); iNode.hasNext();) {
          var node = iNode.next();
          PolygonizeGraph.computeNextCCWEdges(node, label);
        }
      }
    },
    deleteDangles: function deleteDangles() {
      var nodesToRemove = this.findNodesOfDegree(1);
      var dangleLines = new HashSet();
      var nodeStack = new Stack();

      for (var i = nodesToRemove.iterator(); i.hasNext();) {
        nodeStack.push(i.next());
      }

      while (!nodeStack.isEmpty()) {
        var node = nodeStack.pop();
        PolygonizeGraph.deleteAllEdges(node);
        var nodeOutEdges = node.getOutEdges().getEdges();

        for (var i = nodeOutEdges.iterator(); i.hasNext();) {
          var de = i.next();
          de.setMarked(true);
          var sym = de.getSym();
          if (sym !== null) sym.setMarked(true);
          var e = de.getEdge();
          dangleLines.add(e.getLine());
          var toNode = de.getToNode();
          if (PolygonizeGraph.getDegreeNonDeleted(toNode) === 1) nodeStack.push(toNode);
        }
      }

      return dangleLines;
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return PolygonizeGraph;
    }
  });

  PolygonizeGraph.findLabeledEdgeRings = function (dirEdges) {
    var edgeRingStarts = new ArrayList();
    var currLabel = 1;

    for (var i = dirEdges.iterator(); i.hasNext();) {
      var de = i.next();
      if (de.isMarked()) continue;
      if (de.getLabel() >= 0) continue;
      edgeRingStarts.add(de);
      var edges = EdgeRing$1.findDirEdgesInRing(de);
      PolygonizeGraph.label(edges, currLabel);
      currLabel++;
    }

    return edgeRingStarts;
  };

  PolygonizeGraph.getDegreeNonDeleted = function (node) {
    var edges = node.getOutEdges().getEdges();
    var degree = 0;

    for (var i = edges.iterator(); i.hasNext();) {
      var de = i.next();
      if (!de.isMarked()) degree++;
    }

    return degree;
  };

  PolygonizeGraph.deleteAllEdges = function (node) {
    var edges = node.getOutEdges().getEdges();

    for (var i = edges.iterator(); i.hasNext();) {
      var de = i.next();
      de.setMarked(true);
      var sym = de.getSym();
      if (sym !== null) sym.setMarked(true);
    }
  };

  PolygonizeGraph.label = function (dirEdges, label) {
    for (var i = dirEdges.iterator(); i.hasNext();) {
      var de = i.next();
      de.setLabel(label);
    }
  };

  PolygonizeGraph.computeNextCWEdges = function (node) {
    var deStar = node.getOutEdges();
    var startDE = null;
    var prevDE = null;

    for (var i = deStar.getEdges().iterator(); i.hasNext();) {
      var outDE = i.next();
      if (outDE.isMarked()) continue;
      if (startDE === null) startDE = outDE;

      if (prevDE !== null) {
        var sym = prevDE.getSym();
        sym.setNext(outDE);
      }

      prevDE = outDE;
    }

    if (prevDE !== null) {
      var sym = prevDE.getSym();
      sym.setNext(startDE);
    }
  };

  PolygonizeGraph.computeNextCCWEdges = function (node, label) {
    var deStar = node.getOutEdges();
    var firstOutDE = null;
    var prevInDE = null;
    var edges = deStar.getEdges();

    for (var i = edges.size() - 1; i >= 0; i--) {
      var de = edges.get(i);
      var sym = de.getSym();
      var outDE = null;
      if (de.getLabel() === label) outDE = de;
      var inDE = null;
      if (sym.getLabel() === label) inDE = sym;
      if (outDE === null && inDE === null) continue;

      if (inDE !== null) {
        prevInDE = inDE;
      }

      if (outDE !== null) {
        if (prevInDE !== null) {
          prevInDE.setNext(outDE);
          prevInDE = null;
        }

        if (firstOutDE === null) firstOutDE = outDE;
      }
    }

    if (prevInDE !== null) {
      Assert.isTrue(firstOutDE !== null);
      prevInDE.setNext(firstOutDE);
    }
  };

  PolygonizeGraph.getDegree = function (node, label) {
    var edges = node.getOutEdges().getEdges();
    var degree = 0;

    for (var i = edges.iterator(); i.hasNext();) {
      var de = i.next();
      if (de.getLabel() === label) degree++;
    }

    return degree;
  };

  PolygonizeGraph.findIntersectionNodes = function (startDE, label) {
    var de = startDE;
    var intNodes = null;

    do {
      var node = de.getFromNode();

      if (PolygonizeGraph.getDegree(node, label) > 1) {
        if (intNodes === null) intNodes = new ArrayList();
        intNodes.add(node);
      }

      de = de.getNext();
      Assert.isTrue(de !== null, "found null DE in ring");
      Assert.isTrue(de === startDE || !de.isInRing(), "found DE already in ring");
    } while (de !== startDE);

    return intNodes;
  };

  function Polygonizer() {
    this._lineStringAdder = new LineStringAdder(this);
    this._graph = null;
    this._dangles = new ArrayList();
    this._cutEdges = new ArrayList();
    this._invalidRingLines = new ArrayList();
    this._holeList = null;
    this._shellList = null;
    this._polyList = null;
    this._isCheckingRingsValid = true;
    this._extractOnlyPolygonal = null;
    this._geomFactory = null;

    if (arguments.length === 0) {
      Polygonizer.call(this, false);
    } else if (arguments.length === 1) {
      var extractOnlyPolygonal = arguments[0];
      this._extractOnlyPolygonal = extractOnlyPolygonal;
    }
  }
  extend(Polygonizer.prototype, {
    getGeometry: function getGeometry() {
      if (this._geomFactory === null) this._geomFactory = new GeometryFactory();
      this.polygonize();

      if (this._extractOnlyPolygonal) {
        return this._geomFactory.buildGeometry(this._polyList);
      }

      return this._geomFactory.createGeometryCollection(GeometryFactory.toGeometryArray(this._polyList));
    },
    getInvalidRingLines: function getInvalidRingLines() {
      this.polygonize();
      return this._invalidRingLines;
    },
    findValidRings: function findValidRings(edgeRingList, validEdgeRingList, invalidRingList) {
      for (var i = edgeRingList.iterator(); i.hasNext();) {
        var er = i.next();
        if (er.isValid()) validEdgeRingList.add(er);else invalidRingList.add(er.getLineString());
      }
    },
    polygonize: function polygonize() {
      if (this._polyList !== null) return null;
      this._polyList = new ArrayList();
      if (this._graph === null) return null;
      this._dangles = this._graph.deleteDangles();
      this._cutEdges = this._graph.deleteCutEdges();

      var edgeRingList = this._graph.getEdgeRings();

      var validEdgeRingList = new ArrayList();
      this._invalidRingLines = new ArrayList();

      if (this._isCheckingRingsValid) {
        this.findValidRings(edgeRingList, validEdgeRingList, this._invalidRingLines);
      } else {
        validEdgeRingList = edgeRingList;
      }

      this.findShellsAndHoles(validEdgeRingList);
      Polygonizer.assignHolesToShells(this._holeList, this._shellList);
      Collections.sort(this._shellList, new EdgeRing$1.EnvelopeComparator());
      var includeAll = true;

      if (this._extractOnlyPolygonal) {
        Polygonizer.findDisjointShells(this._shellList);
        includeAll = false;
      }

      this._polyList = Polygonizer.extractPolygons(this._shellList, includeAll);
    },
    getDangles: function getDangles() {
      this.polygonize();
      return this._dangles;
    },
    getCutEdges: function getCutEdges() {
      this.polygonize();
      return this._cutEdges;
    },
    getPolygons: function getPolygons() {
      this.polygonize();
      return this._polyList;
    },
    add: function add() {
      if (hasInterface(arguments[0], Collection)) {
        var geomList = arguments[0];

        for (var i = geomList.iterator(); i.hasNext();) {
          var geometry = i.next();
          this.add(geometry);
        }
      } else if (arguments[0] instanceof LineString) {
        var line = arguments[0];
        this._geomFactory = line.getFactory();
        if (this._graph === null) this._graph = new PolygonizeGraph(this._geomFactory);

        this._graph.addEdge(line);
      } else if (arguments[0] instanceof Geometry) {
        var g = arguments[0];
        g.apply(this._lineStringAdder);
      }
    },
    setCheckRingsValid: function setCheckRingsValid(isCheckingRingsValid) {
      this._isCheckingRingsValid = isCheckingRingsValid;
    },
    findShellsAndHoles: function findShellsAndHoles(edgeRingList) {
      this._holeList = new ArrayList();
      this._shellList = new ArrayList();

      for (var i = edgeRingList.iterator(); i.hasNext();) {
        var er = i.next();
        er.computeHole();
        if (er.isHole()) this._holeList.add(er);else this._shellList.add(er);
      }
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return Polygonizer;
    }
  });

  Polygonizer.findOuterShells = function (shellList) {
    for (var i = shellList.iterator(); i.hasNext();) {
      var er = i.next();
      var outerHoleER = er.getOuterHole();

      if (outerHoleER !== null && !outerHoleER.isProcessed()) {
        er.setIncluded(true);
        outerHoleER.setProcessed(true);
      }
    }
  };

  Polygonizer.extractPolygons = function (shellList, includeAll) {
    var polyList = new ArrayList();

    for (var i = shellList.iterator(); i.hasNext();) {
      var er = i.next();

      if (includeAll || er.isIncluded()) {
        polyList.add(er.getPolygon());
      }
    }

    return polyList;
  };

  Polygonizer.assignHolesToShells = function (holeList, shellList) {
    for (var i = holeList.iterator(); i.hasNext();) {
      var holeER = i.next();
      Polygonizer.assignHoleToShell(holeER, shellList);
    }
  };

  Polygonizer.assignHoleToShell = function (holeER, shellList) {
    var shell = EdgeRing$1.findEdgeRingContaining(holeER, shellList);

    if (shell !== null) {
      shell.addHole(holeER);
    }
  };

  Polygonizer.findDisjointShells = function (shellList) {
    Polygonizer.findOuterShells(shellList);
    var isMoreToScan = null;

    do {
      isMoreToScan = false;

      for (var i = shellList.iterator(); i.hasNext();) {
        var er = i.next();
        if (er.isIncludedSet()) continue;
        er.updateIncluded();

        if (!er.isIncludedSet()) {
          isMoreToScan = true;
        }
      }
    } while (isMoreToScan);
  };

  function LineStringAdder() {
    this.p = null;
    var p = arguments[0];
    this.p = p;
  }

  extend(LineStringAdder.prototype, {
    filter: function filter(g) {
      if (g instanceof LineString) this.p.add(g);
    },
    interfaces_: function interfaces_() {
      return [GeometryComponentFilter];
    },
    getClass: function getClass() {
      return LineStringAdder;
    }
  });
  Polygonizer.LineStringAdder = LineStringAdder;



  var polygonize = /*#__PURE__*/Object.freeze({
    Polygonizer: Polygonizer
  });

  function EdgeEndBuilder() {}
  extend(EdgeEndBuilder.prototype, {
    createEdgeEndForNext: function createEdgeEndForNext(edge, l, eiCurr, eiNext) {
      var iNext = eiCurr.segmentIndex + 1;
      if (iNext >= edge.getNumPoints() && eiNext === null) return null;
      var pNext = edge.getCoordinate(iNext);
      if (eiNext !== null && eiNext.segmentIndex === eiCurr.segmentIndex) pNext = eiNext.coord;
      var e = new EdgeEnd(edge, eiCurr.coord, pNext, new Label(edge.getLabel()));
      l.add(e);
    },
    createEdgeEndForPrev: function createEdgeEndForPrev(edge, l, eiCurr, eiPrev) {
      var iPrev = eiCurr.segmentIndex;

      if (eiCurr.dist === 0.0) {
        if (iPrev === 0) return null;
        iPrev--;
      }

      var pPrev = edge.getCoordinate(iPrev);
      if (eiPrev !== null && eiPrev.segmentIndex >= iPrev) pPrev = eiPrev.coord;
      var label = new Label(edge.getLabel());
      label.flip();
      var e = new EdgeEnd(edge, eiCurr.coord, pPrev, label);
      l.add(e);
    },
    computeEdgeEnds: function computeEdgeEnds() {
      if (arguments.length === 1) {
        var edges = arguments[0];
        var l = new ArrayList();

        for (var i = edges; i.hasNext();) {
          var e = i.next();
          this.computeEdgeEnds(e, l);
        }

        return l;
      } else if (arguments.length === 2) {
        var edge = arguments[0],
            _l = arguments[1];
        var eiList = edge.getEdgeIntersectionList();
        eiList.addEndpoints();
        var it = eiList.iterator();
        var eiPrev = null;
        var eiCurr = null;
        if (!it.hasNext()) return null;
        var eiNext = it.next();

        do {
          eiPrev = eiCurr;
          eiCurr = eiNext;
          eiNext = null;
          if (it.hasNext()) eiNext = it.next();

          if (eiCurr !== null) {
            this.createEdgeEndForPrev(edge, _l, eiCurr, eiPrev);
            this.createEdgeEndForNext(edge, _l, eiCurr, eiNext);
          }
        } while (eiCurr !== null);
      }
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return EdgeEndBuilder;
    }
  });

  function EdgeEndBundle() {
    this._edgeEnds = new ArrayList();

    if (arguments.length === 1) {
      var e = arguments[0];
      EdgeEndBundle.call(this, null, e);
    } else if (arguments.length === 2) {
      var _e = arguments[1];
      EdgeEnd.call(this, _e.getEdge(), _e.getCoordinate(), _e.getDirectedCoordinate(), new Label(_e.getLabel()));
      this.insert(_e);
    }
  }
  inherits(EdgeEndBundle, EdgeEnd);
  extend(EdgeEndBundle.prototype, {
    insert: function insert(e) {
      this._edgeEnds.add(e);
    },
    print: function print(out) {
      out.println("EdgeEndBundle--> Label: " + this._label);

      for (var it = this.iterator(); it.hasNext();) {
        var ee = it.next();
        ee.print(out);
        out.println();
      }
    },
    iterator: function iterator() {
      return this._edgeEnds.iterator();
    },
    getEdgeEnds: function getEdgeEnds() {
      return this._edgeEnds;
    },
    computeLabelOn: function computeLabelOn(geomIndex, boundaryNodeRule) {
      var boundaryCount = 0;
      var foundInterior = false;

      for (var it = this.iterator(); it.hasNext();) {
        var e = it.next();
        var loc = e.getLabel().getLocation(geomIndex);
        if (loc === Location.BOUNDARY) boundaryCount++;
        if (loc === Location.INTERIOR) foundInterior = true;
      }

      var loc = Location.NONE;
      if (foundInterior) loc = Location.INTERIOR;

      if (boundaryCount > 0) {
        loc = GeometryGraph.determineBoundary(boundaryNodeRule, boundaryCount);
      }

      this._label.setLocation(geomIndex, loc);
    },
    computeLabelSide: function computeLabelSide(geomIndex, side) {
      for (var it = this.iterator(); it.hasNext();) {
        var e = it.next();

        if (e.getLabel().isArea()) {
          var loc = e.getLabel().getLocation(geomIndex, side);

          if (loc === Location.INTERIOR) {
            this._label.setLocation(geomIndex, side, Location.INTERIOR);

            return null;
          } else if (loc === Location.EXTERIOR) this._label.setLocation(geomIndex, side, Location.EXTERIOR);
        }
      }
    },
    getLabel: function getLabel() {
      return this._label;
    },
    computeLabelSides: function computeLabelSides(geomIndex) {
      this.computeLabelSide(geomIndex, Position.LEFT);
      this.computeLabelSide(geomIndex, Position.RIGHT);
    },
    updateIM: function updateIM(im) {
      Edge.updateIM(this._label, im);
    },
    computeLabel: function computeLabel(boundaryNodeRule) {
      var isArea = false;

      for (var it = this.iterator(); it.hasNext();) {
        var e = it.next();
        if (e.getLabel().isArea()) isArea = true;
      }

      if (isArea) this._label = new Label(Location.NONE, Location.NONE, Location.NONE);else this._label = new Label(Location.NONE);

      for (var i = 0; i < 2; i++) {
        this.computeLabelOn(i, boundaryNodeRule);
        if (isArea) this.computeLabelSides(i);
      }
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return EdgeEndBundle;
    }
  });

  function EdgeEndBundleStar() {
    EdgeEndStar.apply(this);
  }
  inherits(EdgeEndBundleStar, EdgeEndStar);
  extend(EdgeEndBundleStar.prototype, {
    updateIM: function updateIM(im) {
      for (var it = this.iterator(); it.hasNext();) {
        var esb = it.next();
        esb.updateIM(im);
      }
    },
    insert: function insert(e) {
      var eb = this._edgeMap.get(e);

      if (eb === null) {
        eb = new EdgeEndBundle(e);
        this.insertEdgeEnd(e, eb);
      } else {
        eb.insert(e);
      }
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return EdgeEndBundleStar;
    }
  });

  function RelateNode() {
    var coord = arguments[0],
        edges = arguments[1];
    Node$1.call(this, coord, edges);
  }
  inherits(RelateNode, Node$1);
  extend(RelateNode.prototype, {
    updateIMFromEdges: function updateIMFromEdges(im) {
      this._edges.updateIM(im);
    },
    computeIM: function computeIM(im) {
      im.setAtLeastIfValid(this._label.getLocation(0), this._label.getLocation(1), 0);
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return RelateNode;
    }
  });

  function RelateNodeFactory() {
    NodeFactory.apply(this);
  }
  inherits(RelateNodeFactory, NodeFactory);
  extend(RelateNodeFactory.prototype, {
    createNode: function createNode(coord) {
      return new RelateNode(coord, new EdgeEndBundleStar());
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return RelateNodeFactory;
    }
  });

  function RelateComputer() {
    this._li = new RobustLineIntersector();
    this._ptLocator = new PointLocator();
    this._arg = null;
    this._nodes = new NodeMap(new RelateNodeFactory());
    this._im = null;
    this._isolatedEdges = new ArrayList();
    this._invalidPoint = null;
    var arg = arguments[0];
    this._arg = arg;
  }
  extend(RelateComputer.prototype, {
    insertEdgeEnds: function insertEdgeEnds(ee) {
      for (var i = ee.iterator(); i.hasNext();) {
        var e = i.next();

        this._nodes.add(e);
      }
    },
    computeProperIntersectionIM: function computeProperIntersectionIM(intersector, im) {
      var dimA = this._arg[0].getGeometry().getDimension();

      var dimB = this._arg[1].getGeometry().getDimension();

      var hasProper = intersector.hasProperIntersection();
      var hasProperInterior = intersector.hasProperInteriorIntersection();

      if (dimA === 2 && dimB === 2) {
        if (hasProper) im.setAtLeast("212101212");
      } else if (dimA === 2 && dimB === 1) {
        if (hasProper) im.setAtLeast("FFF0FFFF2");
        if (hasProperInterior) im.setAtLeast("1FFFFF1FF");
      } else if (dimA === 1 && dimB === 2) {
        if (hasProper) im.setAtLeast("F0FFFFFF2");
        if (hasProperInterior) im.setAtLeast("1F1FFFFFF");
      } else if (dimA === 1 && dimB === 1) {
        if (hasProperInterior) im.setAtLeast("0FFFFFFFF");
      }
    },
    labelIsolatedEdges: function labelIsolatedEdges(thisIndex, targetIndex) {
      for (var ei = this._arg[thisIndex].getEdgeIterator(); ei.hasNext();) {
        var e = ei.next();

        if (e.isIsolated()) {
          this.labelIsolatedEdge(e, targetIndex, this._arg[targetIndex].getGeometry());

          this._isolatedEdges.add(e);
        }
      }
    },
    labelIsolatedEdge: function labelIsolatedEdge(e, targetIndex, target) {
      if (target.getDimension() > 0) {
        var loc = this._ptLocator.locate(e.getCoordinate(), target);

        e.getLabel().setAllLocations(targetIndex, loc);
      } else {
        e.getLabel().setAllLocations(targetIndex, Location.EXTERIOR);
      }
    },
    computeIM: function computeIM() {
      var im = new IntersectionMatrix();
      im.set(Location.EXTERIOR, Location.EXTERIOR, 2);

      if (!this._arg[0].getGeometry().getEnvelopeInternal().intersects(this._arg[1].getGeometry().getEnvelopeInternal())) {
        this.computeDisjointIM(im);
        return im;
      }

      this._arg[0].computeSelfNodes(this._li, false);

      this._arg[1].computeSelfNodes(this._li, false);

      var intersector = this._arg[0].computeEdgeIntersections(this._arg[1], this._li, false);

      this.computeIntersectionNodes(0);
      this.computeIntersectionNodes(1);
      this.copyNodesAndLabels(0);
      this.copyNodesAndLabels(1);
      this.labelIsolatedNodes();
      this.computeProperIntersectionIM(intersector, im);
      var eeBuilder = new EdgeEndBuilder();
      var ee0 = eeBuilder.computeEdgeEnds(this._arg[0].getEdgeIterator());
      this.insertEdgeEnds(ee0);
      var ee1 = eeBuilder.computeEdgeEnds(this._arg[1].getEdgeIterator());
      this.insertEdgeEnds(ee1);
      this.labelNodeEdges();
      this.labelIsolatedEdges(0, 1);
      this.labelIsolatedEdges(1, 0);
      this.updateIM(im);
      return im;
    },
    labelNodeEdges: function labelNodeEdges() {
      for (var ni = this._nodes.iterator(); ni.hasNext();) {
        var node = ni.next();
        node.getEdges().computeLabelling(this._arg);
      }
    },
    copyNodesAndLabels: function copyNodesAndLabels(argIndex) {
      for (var i = this._arg[argIndex].getNodeIterator(); i.hasNext();) {
        var graphNode = i.next();

        var newNode = this._nodes.addNode(graphNode.getCoordinate());

        newNode.setLabel(argIndex, graphNode.getLabel().getLocation(argIndex));
      }
    },
    labelIntersectionNodes: function labelIntersectionNodes(argIndex) {
      for (var i = this._arg[argIndex].getEdgeIterator(); i.hasNext();) {
        var e = i.next();
        var eLoc = e.getLabel().getLocation(argIndex);

        for (var eiIt = e.getEdgeIntersectionList().iterator(); eiIt.hasNext();) {
          var ei = eiIt.next();

          var n = this._nodes.find(ei.coord);

          if (n.getLabel().isNull(argIndex)) {
            if (eLoc === Location.BOUNDARY) n.setLabelBoundary(argIndex);else n.setLabel(argIndex, Location.INTERIOR);
          }
        }
      }
    },
    labelIsolatedNode: function labelIsolatedNode(n, targetIndex) {
      var loc = this._ptLocator.locate(n.getCoordinate(), this._arg[targetIndex].getGeometry());

      n.getLabel().setAllLocations(targetIndex, loc);
    },
    computeIntersectionNodes: function computeIntersectionNodes(argIndex) {
      for (var i = this._arg[argIndex].getEdgeIterator(); i.hasNext();) {
        var e = i.next();
        var eLoc = e.getLabel().getLocation(argIndex);

        for (var eiIt = e.getEdgeIntersectionList().iterator(); eiIt.hasNext();) {
          var ei = eiIt.next();

          var n = this._nodes.addNode(ei.coord);

          if (eLoc === Location.BOUNDARY) n.setLabelBoundary(argIndex);else {
            if (n.getLabel().isNull(argIndex)) n.setLabel(argIndex, Location.INTERIOR);
          }
        }
      }
    },
    labelIsolatedNodes: function labelIsolatedNodes() {
      for (var ni = this._nodes.iterator(); ni.hasNext();) {
        var n = ni.next();
        var label = n.getLabel();
        Assert.isTrue(label.getGeometryCount() > 0, "node with empty label found");

        if (n.isIsolated()) {
          if (label.isNull(0)) this.labelIsolatedNode(n, 0);else this.labelIsolatedNode(n, 1);
        }
      }
    },
    updateIM: function updateIM(im) {
      for (var ei = this._isolatedEdges.iterator(); ei.hasNext();) {
        var e = ei.next();
        e.updateIM(im);
      }

      for (var ni = this._nodes.iterator(); ni.hasNext();) {
        var node = ni.next();
        node.updateIM(im);
        node.updateIMFromEdges(im);
      }
    },
    computeDisjointIM: function computeDisjointIM(im) {
      var ga = this._arg[0].getGeometry();

      if (!ga.isEmpty()) {
        im.set(Location.INTERIOR, Location.EXTERIOR, ga.getDimension());
        im.set(Location.BOUNDARY, Location.EXTERIOR, ga.getBoundaryDimension());
      }

      var gb = this._arg[1].getGeometry();

      if (!gb.isEmpty()) {
        im.set(Location.EXTERIOR, Location.INTERIOR, gb.getDimension());
        im.set(Location.EXTERIOR, Location.BOUNDARY, gb.getBoundaryDimension());
      }
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return RelateComputer;
    }
  });

  function RectangleContains() {
    this._rectEnv = null;
    var rectangle = arguments[0];
    this._rectEnv = rectangle.getEnvelopeInternal();
  }
  extend(RectangleContains.prototype, {
    isContainedInBoundary: function isContainedInBoundary(geom) {
      if (geom instanceof Polygon) return false;
      if (geom instanceof Point) return this.isPointContainedInBoundary(geom);
      if (geom instanceof LineString) return this.isLineStringContainedInBoundary(geom);

      for (var i = 0; i < geom.getNumGeometries(); i++) {
        var comp = geom.getGeometryN(i);
        if (!this.isContainedInBoundary(comp)) return false;
      }

      return true;
    },
    isLineSegmentContainedInBoundary: function isLineSegmentContainedInBoundary(p0, p1) {
      if (p0.equals(p1)) return this.isPointContainedInBoundary(p0);

      if (p0.x === p1.x) {
        if (p0.x === this._rectEnv.getMinX() || p0.x === this._rectEnv.getMaxX()) return true;
      } else if (p0.y === p1.y) {
        if (p0.y === this._rectEnv.getMinY() || p0.y === this._rectEnv.getMaxY()) return true;
      }

      return false;
    },
    isLineStringContainedInBoundary: function isLineStringContainedInBoundary(line) {
      var seq = line.getCoordinateSequence();
      var p0 = new Coordinate();
      var p1 = new Coordinate();

      for (var i = 0; i < seq.size() - 1; i++) {
        seq.getCoordinate(i, p0);
        seq.getCoordinate(i + 1, p1);
        if (!this.isLineSegmentContainedInBoundary(p0, p1)) return false;
      }

      return true;
    },
    isPointContainedInBoundary: function isPointContainedInBoundary() {
      if (arguments[0] instanceof Point) {
        var point = arguments[0];
        return this.isPointContainedInBoundary(point.getCoordinate());
      } else if (arguments[0] instanceof Coordinate) {
        var pt = arguments[0];
        return pt.x === this._rectEnv.getMinX() || pt.x === this._rectEnv.getMaxX() || pt.y === this._rectEnv.getMinY() || pt.y === this._rectEnv.getMaxY();
      }
    },
    contains: function contains(geom) {
      if (!this._rectEnv.contains(geom.getEnvelopeInternal())) return false;
      if (this.isContainedInBoundary(geom)) return false;
      return true;
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return RectangleContains;
    }
  });

  RectangleContains.contains = function (rectangle, b) {
    var rc = new RectangleContains(rectangle);
    return rc.contains(b);
  };

  function RectangleLineIntersector() {
    this._li = new RobustLineIntersector();
    this._rectEnv = null;
    this._diagUp0 = null;
    this._diagUp1 = null;
    this._diagDown0 = null;
    this._diagDown1 = null;
    var rectEnv = arguments[0];
    this._rectEnv = rectEnv;
    this._diagUp0 = new Coordinate(rectEnv.getMinX(), rectEnv.getMinY());
    this._diagUp1 = new Coordinate(rectEnv.getMaxX(), rectEnv.getMaxY());
    this._diagDown0 = new Coordinate(rectEnv.getMinX(), rectEnv.getMaxY());
    this._diagDown1 = new Coordinate(rectEnv.getMaxX(), rectEnv.getMinY());
  }
  extend(RectangleLineIntersector.prototype, {
    intersects: function intersects(p0, p1) {
      var segEnv = new Envelope(p0, p1);
      if (!this._rectEnv.intersects(segEnv)) return false;
      if (this._rectEnv.intersects(p0)) return true;
      if (this._rectEnv.intersects(p1)) return true;

      if (p0.compareTo(p1) > 0) {
        var tmp = p0;
        p0 = p1;
        p1 = tmp;
      }

      var isSegUpwards = false;
      if (p1.y > p0.y) isSegUpwards = true;

      if (isSegUpwards) {
        this._li.computeIntersection(p0, p1, this._diagDown0, this._diagDown1);
      } else {
        this._li.computeIntersection(p0, p1, this._diagUp0, this._diagUp1);
      }

      if (this._li.hasIntersection()) return true;
      return false;
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return RectangleLineIntersector;
    }
  });

  function ShortCircuitedGeometryVisitor() {
    this._isDone = false;
  }
  extend(ShortCircuitedGeometryVisitor.prototype, {
    applyTo: function applyTo(geom) {
      for (var i = 0; i < geom.getNumGeometries() && !this._isDone; i++) {
        var element = geom.getGeometryN(i);

        if (!(element instanceof GeometryCollection)) {
          this.visit(element);

          if (this.isDone()) {
            this._isDone = true;
            return null;
          }
        } else this.applyTo(element);
      }
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return ShortCircuitedGeometryVisitor;
    }
  });

  function RectangleIntersects() {
    this._rectangle = null;
    this._rectEnv = null;
    var rectangle = arguments[0];
    this._rectangle = rectangle;
    this._rectEnv = rectangle.getEnvelopeInternal();
  }
  extend(RectangleIntersects.prototype, {
    intersects: function intersects(geom) {
      if (!this._rectEnv.intersects(geom.getEnvelopeInternal())) return false;
      var visitor = new EnvelopeIntersectsVisitor(this._rectEnv);
      visitor.applyTo(geom);
      if (visitor.intersects()) return true;
      var ecpVisitor = new GeometryContainsPointVisitor(this._rectangle);
      ecpVisitor.applyTo(geom);
      if (ecpVisitor.containsPoint()) return true;
      var riVisitor = new RectangleIntersectsSegmentVisitor(this._rectangle);
      riVisitor.applyTo(geom);
      if (riVisitor.intersects()) return true;
      return false;
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return RectangleIntersects;
    }
  });

  RectangleIntersects.intersects = function (rectangle, b) {
    var rp = new RectangleIntersects(rectangle);
    return rp.intersects(b);
  };

  function EnvelopeIntersectsVisitor() {
    ShortCircuitedGeometryVisitor.apply(this);
    this._rectEnv = null;
    this._intersects = false;
    var rectEnv = arguments[0];
    this._rectEnv = rectEnv;
  }

  inherits(EnvelopeIntersectsVisitor, ShortCircuitedGeometryVisitor);
  extend(EnvelopeIntersectsVisitor.prototype, {
    isDone: function isDone() {
      return this._intersects === true;
    },
    visit: function visit(element) {
      var elementEnv = element.getEnvelopeInternal();

      if (!this._rectEnv.intersects(elementEnv)) {
        return null;
      }

      if (this._rectEnv.contains(elementEnv)) {
        this._intersects = true;
        return null;
      }

      if (elementEnv.getMinX() >= this._rectEnv.getMinX() && elementEnv.getMaxX() <= this._rectEnv.getMaxX()) {
        this._intersects = true;
        return null;
      }

      if (elementEnv.getMinY() >= this._rectEnv.getMinY() && elementEnv.getMaxY() <= this._rectEnv.getMaxY()) {
        this._intersects = true;
        return null;
      }
    },
    intersects: function intersects() {
      return this._intersects;
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return EnvelopeIntersectsVisitor;
    }
  });

  function GeometryContainsPointVisitor() {
    ShortCircuitedGeometryVisitor.apply(this);
    this._rectSeq = null;
    this._rectEnv = null;
    this._containsPoint = false;
    var rectangle = arguments[0];
    this._rectSeq = rectangle.getExteriorRing().getCoordinateSequence();
    this._rectEnv = rectangle.getEnvelopeInternal();
  }

  inherits(GeometryContainsPointVisitor, ShortCircuitedGeometryVisitor);
  extend(GeometryContainsPointVisitor.prototype, {
    isDone: function isDone() {
      return this._containsPoint === true;
    },
    visit: function visit(geom) {
      if (!(geom instanceof Polygon)) return null;
      var elementEnv = geom.getEnvelopeInternal();
      if (!this._rectEnv.intersects(elementEnv)) return null;
      var rectPt = new Coordinate();

      for (var i = 0; i < 4; i++) {
        this._rectSeq.getCoordinate(i, rectPt);

        if (!elementEnv.contains(rectPt)) continue;

        if (SimplePointInAreaLocator.containsPointInPolygon(rectPt, geom)) {
          this._containsPoint = true;
          return null;
        }
      }
    },
    containsPoint: function containsPoint() {
      return this._containsPoint;
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return GeometryContainsPointVisitor;
    }
  });

  function RectangleIntersectsSegmentVisitor() {
    ShortCircuitedGeometryVisitor.apply(this);
    this._rectEnv = null;
    this._rectIntersector = null;
    this._hasIntersection = false;
    this._p0 = new Coordinate();
    this._p1 = new Coordinate();
    var rectangle = arguments[0];
    this._rectEnv = rectangle.getEnvelopeInternal();
    this._rectIntersector = new RectangleLineIntersector(this._rectEnv);
  }

  inherits(RectangleIntersectsSegmentVisitor, ShortCircuitedGeometryVisitor);
  extend(RectangleIntersectsSegmentVisitor.prototype, {
    intersects: function intersects() {
      return this._hasIntersection;
    },
    isDone: function isDone() {
      return this._hasIntersection === true;
    },
    visit: function visit(geom) {
      var elementEnv = geom.getEnvelopeInternal();
      if (!this._rectEnv.intersects(elementEnv)) return null;
      var lines = LinearComponentExtracter.getLines(geom);
      this.checkIntersectionWithLineStrings(lines);
    },
    checkIntersectionWithLineStrings: function checkIntersectionWithLineStrings(lines) {
      for (var i = lines.iterator(); i.hasNext();) {
        var testLine = i.next();
        this.checkIntersectionWithSegments(testLine);
        if (this._hasIntersection) return null;
      }
    },
    checkIntersectionWithSegments: function checkIntersectionWithSegments(testLine) {
      var seq1 = testLine.getCoordinateSequence();

      for (var j = 1; j < seq1.size(); j++) {
        seq1.getCoordinate(j - 1, this._p0);
        seq1.getCoordinate(j, this._p1);

        if (this._rectIntersector.intersects(this._p0, this._p1)) {
          this._hasIntersection = true;
          return null;
        }
      }
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return RectangleIntersectsSegmentVisitor;
    }
  });

  function RelateOp() {
    this._relate = null;

    if (arguments.length === 2) {
      var g0 = arguments[0],
          g1 = arguments[1];
      GeometryGraphOperation.call(this, g0, g1);
      this._relate = new RelateComputer(this._arg);
    } else if (arguments.length === 3) {
      var _g = arguments[0],
          _g2 = arguments[1],
          boundaryNodeRule = arguments[2];
      GeometryGraphOperation.call(this, _g, _g2, boundaryNodeRule);
      this._relate = new RelateComputer(this._arg);
    }
  }
  inherits(RelateOp, GeometryGraphOperation);
  extend(RelateOp.prototype, {
    getIntersectionMatrix: function getIntersectionMatrix() {
      return this._relate.computeIM();
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return RelateOp;
    }
  });

  RelateOp.covers = function (g1, g2) {
    if (g2.getDimension() === 2 && g1.getDimension() < 2) {
      return false;
    }

    if (g2.getDimension() === 1 && g1.getDimension() < 1 && g2.getLength() > 0.0) {
      return false;
    }

    if (!g1.getEnvelopeInternal().covers(g2.getEnvelopeInternal())) return false;

    if (g1.isRectangle()) {
      return true;
    }

    return new RelateOp(g1, g2).getIntersectionMatrix().isCovers();
  };

  RelateOp.intersects = function (g1, g2) {
    if (!g1.getEnvelopeInternal().intersects(g2.getEnvelopeInternal())) return false;

    if (g1.isRectangle()) {
      return RectangleIntersects.intersects(g1, g2);
    }

    if (g2.isRectangle()) {
      return RectangleIntersects.intersects(g2, g1);
    }

    if (g1.isGeometryCollection() || g2.isGeometryCollection()) {

      for (var i = 0; i < g1.getNumGeometries(); i++) {
        for (var j = 0; j < g2.getNumGeometries(); j++) {
          if (g1.getGeometryN(i).intersects(g2.getGeometryN(j))) {
            return true;
          }
        }
      }

      return false;
    }

    return new RelateOp(g1, g2).getIntersectionMatrix().isIntersects();
  };

  RelateOp.touches = function (g1, g2) {
    if (!g1.getEnvelopeInternal().intersects(g2.getEnvelopeInternal())) return false;
    return new RelateOp(g1, g2).getIntersectionMatrix().isTouches(g1.getDimension(), g2.getDimension());
  };

  RelateOp.relate = function () {
    if (arguments.length === 2) {
      var a = arguments[0],
          b = arguments[1];
      var relOp = new RelateOp(a, b);
      var im = relOp.getIntersectionMatrix();
      return im;
    } else if (arguments.length === 3) {
      var _a = arguments[0],
          _b = arguments[1],
          boundaryNodeRule = arguments[2];
      var relOp = new RelateOp(_a, _b, boundaryNodeRule);
      var im = relOp.getIntersectionMatrix();
      return im;
    }
  };

  RelateOp.overlaps = function (g1, g2) {
    if (!g1.getEnvelopeInternal().intersects(g2.getEnvelopeInternal())) return false;
    return new RelateOp(g1, g2).getIntersectionMatrix().isOverlaps(g1.getDimension(), g2.getDimension());
  };

  RelateOp.crosses = function (g1, g2) {
    if (!g1.getEnvelopeInternal().intersects(g2.getEnvelopeInternal())) return false;
    return new RelateOp(g1, g2).getIntersectionMatrix().isCrosses(g1.getDimension(), g2.getDimension());
  };

  RelateOp.contains = function (g1, g2) {
    if (g2.getDimension() === 2 && g1.getDimension() < 2) {
      return false;
    }

    if (g2.getDimension() === 1 && g1.getDimension() < 1 && g2.getLength() > 0.0) {
      return false;
    }

    if (!g1.getEnvelopeInternal().contains(g2.getEnvelopeInternal())) return false;

    if (g1.isRectangle()) {
      return RectangleContains.contains(g1, g2);
    }

    return new RelateOp(g1, g2).getIntersectionMatrix().isContains();
  };



  var relate = /*#__PURE__*/Object.freeze({
    RelateOp: RelateOp
  });

  function GeometryCombiner() {
    this._geomFactory = null;
    this._skipEmpty = false;
    this._inputGeoms = null;
    var geoms = arguments[0];
    this._geomFactory = GeometryCombiner.extractFactory(geoms);
    this._inputGeoms = geoms;
  }
  extend(GeometryCombiner.prototype, {
    extractElements: function extractElements(geom, elems) {
      if (geom === null) return null;

      for (var i = 0; i < geom.getNumGeometries(); i++) {
        var elemGeom = geom.getGeometryN(i);
        if (this._skipEmpty && elemGeom.isEmpty()) continue;
        elems.add(elemGeom);
      }
    },
    combine: function combine() {
      var elems = new ArrayList();

      for (var i = this._inputGeoms.iterator(); i.hasNext();) {
        var g = i.next();
        this.extractElements(g, elems);
      }

      if (elems.size() === 0) {
        if (this._geomFactory !== null) {
          return this._geomFactory.createGeometryCollection();
        }

        return null;
      }

      return this._geomFactory.buildGeometry(elems);
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return GeometryCombiner;
    }
  });

  GeometryCombiner.combine = function () {
    if (arguments.length === 1) {
      var geoms = arguments[0];
      var combiner = new GeometryCombiner(geoms);
      return combiner.combine();
    } else if (arguments.length === 2) {
      var g0 = arguments[0],
          g1 = arguments[1];
      var combiner = new GeometryCombiner(GeometryCombiner.createList(g0, g1));
      return combiner.combine();
    } else if (arguments.length === 3) {
      var _g = arguments[0],
          _g2 = arguments[1],
          g2 = arguments[2];
      var combiner = new GeometryCombiner(GeometryCombiner.createList(_g, _g2, g2));
      return combiner.combine();
    }
  };

  GeometryCombiner.extractFactory = function (geoms) {
    if (geoms.isEmpty()) return null;
    return geoms.iterator().next().getFactory();
  };

  GeometryCombiner.createList = function () {
    if (arguments.length === 2) {
      var obj0 = arguments[0],
          obj1 = arguments[1];
      var list = new ArrayList();
      list.add(obj0);
      list.add(obj1);
      return list;
    } else if (arguments.length === 3) {
      var _obj = arguments[0],
          _obj2 = arguments[1],
          obj2 = arguments[2];
      var list = new ArrayList();
      list.add(_obj);
      list.add(_obj2);
      list.add(obj2);
      return list;
    }
  };

  function PointGeometryUnion() {
    this._pointGeom = null;
    this._otherGeom = null;
    this._geomFact = null;
    var pointGeom = arguments[0],
        otherGeom = arguments[1];
    this._pointGeom = pointGeom;
    this._otherGeom = otherGeom;
    this._geomFact = otherGeom.getFactory();
  }
  extend(PointGeometryUnion.prototype, {
    union: function union() {
      var locater = new PointLocator();
      var exteriorCoords = new TreeSet();

      for (var i = 0; i < this._pointGeom.getNumGeometries(); i++) {
        var point = this._pointGeom.getGeometryN(i);

        var coord = point.getCoordinate();
        var loc = locater.locate(coord, this._otherGeom);
        if (loc === Location.EXTERIOR) exteriorCoords.add(coord);
      }

      if (exteriorCoords.size() === 0) return this._otherGeom;
      var ptComp = null;
      var coords = CoordinateArrays.toCoordinateArray(exteriorCoords);

      if (coords.length === 1) {
        ptComp = this._geomFact.createPoint(coords[0]);
      } else {
        ptComp = this._geomFact.createMultiPointFromCoords(coords);
      }

      return GeometryCombiner.combine(ptComp, this._otherGeom);
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return PointGeometryUnion;
    }
  });

  PointGeometryUnion.union = function (pointGeom, otherGeom) {
    var unioner = new PointGeometryUnion(pointGeom, otherGeom);
    return unioner.union();
  };

  function GeometryExtracter() {
    this._geometryType = null;
    this._comps = null;
    var geometryType = arguments[0],
        comps = arguments[1];
    this._geometryType = geometryType;
    this._comps = comps;
  }
  extend(GeometryExtracter.prototype, {
    filter: function filter(geom) {
      if (this._geometryType === null || GeometryExtracter.isOfType(geom, this._geometryType)) this._comps.add(geom);
    },
    interfaces_: function interfaces_() {
      return [GeometryFilter];
    },
    getClass: function getClass() {
      return GeometryExtracter;
    }
  });

  GeometryExtracter.isOfType = function (geom, geometryType) {
    if (geom.getGeometryType() === geometryType) return true;
    if (geometryType === Geometry.TYPENAME_LINESTRING && geom.getGeometryType() === Geometry.TYPENAME_LINEARRING) return true;
    return false;
  };

  GeometryExtracter.extract = function () {
    if (arguments.length === 2) {
      var geom = arguments[0],
          geometryType = arguments[1];
      return GeometryExtracter.extract(geom, geometryType, new ArrayList());
    } else if (arguments.length === 3) {
      if (hasInterface(arguments[2], List) && arguments[0] instanceof Geometry && typeof arguments[1] === "string") {
        var _geom = arguments[0],
            _geometryType = arguments[1],
            list = arguments[2];

        if (_geom.getGeometryType() === _geometryType) {
          list.add(_geom);
        } else if (_geom instanceof GeometryCollection) {
          _geom.apply(new GeometryExtracter(_geometryType, list));
        }

        return list;
      } else if (hasInterface(arguments[2], List) && arguments[0] instanceof Geometry && arguments[1] instanceof Class) {
        var _geom2 = arguments[0],
            clz = arguments[1],
            _list = arguments[2];
        return GeometryExtracter.extract(_geom2, GeometryExtracter.toGeometryType(clz), _list);
      }
    }
  };

  function CascadedPolygonUnion() {
    this._inputPolys = null;
    this._geomFactory = null;
    var polys = arguments[0];
    this._inputPolys = polys;
    if (this._inputPolys === null) this._inputPolys = new ArrayList();
  }
  extend(CascadedPolygonUnion.prototype, {
    reduceToGeometries: function reduceToGeometries(geomTree) {
      var geoms = new ArrayList();

      for (var i = geomTree.iterator(); i.hasNext();) {
        var o = i.next();
        var geom = null;

        if (hasInterface(o, List)) {
          geom = this.unionTree(o);
        } else if (o instanceof Geometry) {
          geom = o;
        }

        geoms.add(geom);
      }

      return geoms;
    },
    extractByEnvelope: function extractByEnvelope(env, geom, disjointGeoms) {
      var intersectingGeoms = new ArrayList();

      for (var i = 0; i < geom.getNumGeometries(); i++) {
        var elem = geom.getGeometryN(i);
        if (elem.getEnvelopeInternal().intersects(env)) intersectingGeoms.add(elem);else disjointGeoms.add(elem);
      }

      return this._geomFactory.buildGeometry(intersectingGeoms);
    },
    unionOptimized: function unionOptimized(g0, g1) {
      var g0Env = g0.getEnvelopeInternal();
      var g1Env = g1.getEnvelopeInternal();

      if (!g0Env.intersects(g1Env)) {
        var combo = GeometryCombiner.combine(g0, g1);
        return combo;
      }

      if (g0.getNumGeometries() <= 1 && g1.getNumGeometries() <= 1) return this.unionActual(g0, g1);
      var commonEnv = g0Env.intersection(g1Env);
      return this.unionUsingEnvelopeIntersection(g0, g1, commonEnv);
    },
    union: function union() {
      if (this._inputPolys === null) throw new IllegalStateException("union() method cannot be called twice");
      if (this._inputPolys.isEmpty()) return null;
      this._geomFactory = this._inputPolys.iterator().next().getFactory();
      var index = new STRtree(CascadedPolygonUnion.STRTREE_NODE_CAPACITY);

      for (var i = this._inputPolys.iterator(); i.hasNext();) {
        var item = i.next();
        index.insert(item.getEnvelopeInternal(), item);
      }

      this._inputPolys = null;
      var itemTree = index.itemsTree();
      var unionAll = this.unionTree(itemTree);
      return unionAll;
    },
    binaryUnion: function binaryUnion() {
      if (arguments.length === 1) {
        var geoms = arguments[0];
        return this.binaryUnion(geoms, 0, geoms.size());
      } else if (arguments.length === 3) {
        var _geoms = arguments[0],
            start = arguments[1],
            end = arguments[2];

        if (end - start <= 1) {
          var g0 = CascadedPolygonUnion.getGeometry(_geoms, start);
          return this.unionSafe(g0, null);
        } else if (end - start === 2) {
          return this.unionSafe(CascadedPolygonUnion.getGeometry(_geoms, start), CascadedPolygonUnion.getGeometry(_geoms, start + 1));
        } else {
          var mid = Math.trunc((end + start) / 2);
          var g0 = this.binaryUnion(_geoms, start, mid);
          var g1 = this.binaryUnion(_geoms, mid, end);
          return this.unionSafe(g0, g1);
        }
      }
    },
    repeatedUnion: function repeatedUnion(geoms) {
      var union = null;

      for (var i = geoms.iterator(); i.hasNext();) {
        var g = i.next();
        if (union === null) union = g.copy();else union = union.union(g);
      }

      return union;
    },
    unionSafe: function unionSafe(g0, g1) {
      if (g0 === null && g1 === null) return null;
      if (g0 === null) return g1.copy();
      if (g1 === null) return g0.copy();
      return this.unionOptimized(g0, g1);
    },
    unionActual: function unionActual(g0, g1) {
      return CascadedPolygonUnion.restrictToPolygons(g0.union(g1));
    },
    unionTree: function unionTree(geomTree) {
      var geoms = this.reduceToGeometries(geomTree);
      var union = this.binaryUnion(geoms);
      return union;
    },
    unionUsingEnvelopeIntersection: function unionUsingEnvelopeIntersection(g0, g1, common) {
      var disjointPolys = new ArrayList();
      var g0Int = this.extractByEnvelope(common, g0, disjointPolys);
      var g1Int = this.extractByEnvelope(common, g1, disjointPolys);
      var union = this.unionActual(g0Int, g1Int);
      disjointPolys.add(union);
      var overallUnion = GeometryCombiner.combine(disjointPolys);
      return overallUnion;
    },
    bufferUnion: function bufferUnion() {
      if (arguments.length === 1) {
        var geoms = arguments[0];
        var factory = geoms.get(0).getFactory();
        var gColl = factory.buildGeometry(geoms);
        var unionAll = gColl.buffer(0.0);
        return unionAll;
      } else if (arguments.length === 2) {
        var g0 = arguments[0],
            g1 = arguments[1];
        var factory = g0.getFactory();
        var gColl = factory.createGeometryCollection([g0, g1]);
        var unionAll = gColl.buffer(0.0);
        return unionAll;
      }
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return CascadedPolygonUnion;
    }
  });

  CascadedPolygonUnion.restrictToPolygons = function (g) {
    if (hasInterface(g, Polygonal)) {
      return g;
    }

    var polygons = PolygonExtracter.getPolygons(g);
    if (polygons.size() === 1) return polygons.get(0);
    return g.getFactory().createMultiPolygon(GeometryFactory.toPolygonArray(polygons));
  };

  CascadedPolygonUnion.getGeometry = function (list, index) {
    if (index >= list.size()) return null;
    return list.get(index);
  };

  CascadedPolygonUnion.union = function (polys) {
    var op = new CascadedPolygonUnion(polys);
    return op.union();
  };

  CascadedPolygonUnion.STRTREE_NODE_CAPACITY = 4;

  function UnaryUnionOp() {
    this._polygons = new ArrayList();
    this._lines = new ArrayList();
    this._points = new ArrayList();
    this._geomFact = null;

    if (arguments.length === 1) {
      if (hasInterface(arguments[0], Collection)) {
        var geoms = arguments[0];
        this.extract(geoms);
      } else if (arguments[0] instanceof Geometry) {
        var geom = arguments[0];
        this.extract(geom);
      }
    } else if (arguments.length === 2) {
      var _geoms = arguments[0],
          geomFact = arguments[1];
      this._geomFact = geomFact;
      this.extract(_geoms);
    }
  }
  extend(UnaryUnionOp.prototype, {
    unionNoOpt: function unionNoOpt(g0) {
      var empty = this._geomFact.createPoint();

      return SnapIfNeededOverlayOp.overlayOp(g0, empty, OverlayOp.UNION);
    },
    unionWithNull: function unionWithNull(g0, g1) {
      if (g0 === null && g1 === null) return null;
      if (g1 === null) return g0;
      if (g0 === null) return g1;
      return g0.union(g1);
    },
    extract: function extract() {
      if (hasInterface(arguments[0], Collection)) {
        var geoms = arguments[0];

        for (var i = geoms.iterator(); i.hasNext();) {
          var geom = i.next();
          this.extract(geom);
        }
      } else if (arguments[0] instanceof Geometry) {
        var _geom = arguments[0];
        if (this._geomFact === null) this._geomFact = _geom.getFactory();
        GeometryExtracter.extract(_geom, Geometry.TYPENAME_POLYGON, this._polygons);
        GeometryExtracter.extract(_geom, Geometry.TYPENAME_LINESTRING, this._lines);
        GeometryExtracter.extract(_geom, Geometry.TYPENAME_POINT, this._points);
      }
    },
    union: function union() {
      if (this._geomFact === null) {
        return null;
      }

      var unionPoints = null;

      if (this._points.size() > 0) {
        var ptGeom = this._geomFact.buildGeometry(this._points);

        unionPoints = this.unionNoOpt(ptGeom);
      }

      var unionLines = null;

      if (this._lines.size() > 0) {
        var lineGeom = this._geomFact.buildGeometry(this._lines);

        unionLines = this.unionNoOpt(lineGeom);
      }

      var unionPolygons = null;

      if (this._polygons.size() > 0) {
        unionPolygons = CascadedPolygonUnion.union(this._polygons);
      }

      var unionLA = this.unionWithNull(unionLines, unionPolygons);
      var union = null;
      if (unionPoints === null) union = unionLA;else if (unionLA === null) union = unionPoints;else union = PointGeometryUnion.union(unionPoints, unionLA);
      if (union === null) return this._geomFact.createGeometryCollection();
      return union;
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return UnaryUnionOp;
    }
  });

  UnaryUnionOp.union = function () {
    if (arguments.length === 1) {
      if (hasInterface(arguments[0], Collection)) {
        var geoms = arguments[0];
        var op = new UnaryUnionOp(geoms);
        return op.union();
      } else if (arguments[0] instanceof Geometry) {
        var geom = arguments[0];
        var op = new UnaryUnionOp(geom);
        return op.union();
      }
    } else if (arguments.length === 2) {
      var _geoms2 = arguments[0],
          geomFact = arguments[1];
      var op = new UnaryUnionOp(_geoms2, geomFact);
      return op.union();
    }
  };



  var union = /*#__PURE__*/Object.freeze({
    UnaryUnionOp: UnaryUnionOp
  });

  function ConnectedInteriorTester() {
    this._geometryFactory = new GeometryFactory();
    this._geomGraph = null;
    this._disconnectedRingcoord = null;
    var geomGraph = arguments[0];
    this._geomGraph = geomGraph;
  }
  extend(ConnectedInteriorTester.prototype, {
    visitInteriorRing: function visitInteriorRing(ring, graph) {
      var pts = ring.getCoordinates();
      var pt0 = pts[0];
      var pt1 = ConnectedInteriorTester.findDifferentPoint(pts, pt0);
      var e = graph.findEdgeInSameDirection(pt0, pt1);
      var de = graph.findEdgeEnd(e);
      var intDe = null;

      if (de.getLabel().getLocation(0, Position.RIGHT) === Location.INTERIOR) {
        intDe = de;
      } else if (de.getSym().getLabel().getLocation(0, Position.RIGHT) === Location.INTERIOR) {
        intDe = de.getSym();
      }

      Assert.isTrue(intDe !== null, "unable to find dirEdge with Interior on RHS");
      this.visitLinkedDirectedEdges(intDe);
    },
    visitShellInteriors: function visitShellInteriors(g, graph) {
      if (g instanceof Polygon) {
        var p = g;
        this.visitInteriorRing(p.getExteriorRing(), graph);
      }

      if (g instanceof MultiPolygon) {
        var mp = g;

        for (var i = 0; i < mp.getNumGeometries(); i++) {
          var p = mp.getGeometryN(i);
          this.visitInteriorRing(p.getExteriorRing(), graph);
        }
      }
    },
    getCoordinate: function getCoordinate() {
      return this._disconnectedRingcoord;
    },
    setInteriorEdgesInResult: function setInteriorEdgesInResult(graph) {
      for (var it = graph.getEdgeEnds().iterator(); it.hasNext();) {
        var de = it.next();

        if (de.getLabel().getLocation(0, Position.RIGHT) === Location.INTERIOR) {
          de.setInResult(true);
        }
      }
    },
    visitLinkedDirectedEdges: function visitLinkedDirectedEdges(start) {
      var startDe = start;
      var de = start;

      do {
        Assert.isTrue(de !== null, "found null Directed Edge");
        de.setVisited(true);
        de = de.getNext();
      } while (de !== startDe);
    },
    buildEdgeRings: function buildEdgeRings(dirEdges) {
      var edgeRings = new ArrayList();

      for (var it = dirEdges.iterator(); it.hasNext();) {
        var de = it.next();

        if (de.isInResult() && de.getEdgeRing() === null) {
          var er = new MaximalEdgeRing(de, this._geometryFactory);
          er.linkDirectedEdgesForMinimalEdgeRings();
          var minEdgeRings = er.buildMinimalRings();
          edgeRings.addAll(minEdgeRings);
        }
      }

      return edgeRings;
    },
    hasUnvisitedShellEdge: function hasUnvisitedShellEdge(edgeRings) {
      for (var i = 0; i < edgeRings.size(); i++) {
        var er = edgeRings.get(i);
        if (er.isHole()) continue;
        var edges = er.getEdges();
        var de = edges.get(0);
        if (de.getLabel().getLocation(0, Position.RIGHT) !== Location.INTERIOR) continue;

        for (var j = 0; j < edges.size(); j++) {
          de = edges.get(j);

          if (!de.isVisited()) {
            this._disconnectedRingcoord = de.getCoordinate();
            return true;
          }
        }
      }

      return false;
    },
    isInteriorsConnected: function isInteriorsConnected() {
      var splitEdges = new ArrayList();

      this._geomGraph.computeSplitEdges(splitEdges);

      var graph = new PlanarGraph(new OverlayNodeFactory());
      graph.addEdges(splitEdges);
      this.setInteriorEdgesInResult(graph);
      graph.linkResultDirectedEdges();
      var edgeRings = this.buildEdgeRings(graph.getEdgeEnds());
      this.visitShellInteriors(this._geomGraph.getGeometry(), graph);
      return !this.hasUnvisitedShellEdge(edgeRings);
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return ConnectedInteriorTester;
    }
  });

  ConnectedInteriorTester.findDifferentPoint = function (coord, pt) {
    for (var i = 0; i < coord.length; i++) {
      if (!coord[i].equals(pt)) return coord[i];
    }

    return null;
  };

  function RelateNodeGraph() {
    this._nodes = new NodeMap(new RelateNodeFactory());
  }
  extend(RelateNodeGraph.prototype, {
    insertEdgeEnds: function insertEdgeEnds(ee) {
      for (var i = ee.iterator(); i.hasNext();) {
        var e = i.next();

        this._nodes.add(e);
      }
    },
    getNodeIterator: function getNodeIterator() {
      return this._nodes.iterator();
    },
    copyNodesAndLabels: function copyNodesAndLabels(geomGraph, argIndex) {
      for (var nodeIt = geomGraph.getNodeIterator(); nodeIt.hasNext();) {
        var graphNode = nodeIt.next();

        var newNode = this._nodes.addNode(graphNode.getCoordinate());

        newNode.setLabel(argIndex, graphNode.getLabel().getLocation(argIndex));
      }
    },
    build: function build(geomGraph) {
      this.computeIntersectionNodes(geomGraph, 0);
      this.copyNodesAndLabels(geomGraph, 0);
      var eeBuilder = new EdgeEndBuilder();
      var eeList = eeBuilder.computeEdgeEnds(geomGraph.getEdgeIterator());
      this.insertEdgeEnds(eeList);
    },
    computeIntersectionNodes: function computeIntersectionNodes(geomGraph, argIndex) {
      for (var edgeIt = geomGraph.getEdgeIterator(); edgeIt.hasNext();) {
        var e = edgeIt.next();
        var eLoc = e.getLabel().getLocation(argIndex);

        for (var eiIt = e.getEdgeIntersectionList().iterator(); eiIt.hasNext();) {
          var ei = eiIt.next();

          var n = this._nodes.addNode(ei.coord);

          if (eLoc === Location.BOUNDARY) n.setLabelBoundary(argIndex);else {
            if (n.getLabel().isNull(argIndex)) n.setLabel(argIndex, Location.INTERIOR);
          }
        }
      }
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return RelateNodeGraph;
    }
  });

  function ConsistentAreaTester() {
    this._li = new RobustLineIntersector();
    this._geomGraph = null;
    this._nodeGraph = new RelateNodeGraph();
    this._invalidPoint = null;
    var geomGraph = arguments[0];
    this._geomGraph = geomGraph;
  }
  extend(ConsistentAreaTester.prototype, {
    isNodeEdgeAreaLabelsConsistent: function isNodeEdgeAreaLabelsConsistent() {
      for (var nodeIt = this._nodeGraph.getNodeIterator(); nodeIt.hasNext();) {
        var node = nodeIt.next();

        if (!node.getEdges().isAreaLabelsConsistent(this._geomGraph)) {
          this._invalidPoint = node.getCoordinate().copy();
          return false;
        }
      }

      return true;
    },
    getInvalidPoint: function getInvalidPoint() {
      return this._invalidPoint;
    },
    hasDuplicateRings: function hasDuplicateRings() {
      for (var nodeIt = this._nodeGraph.getNodeIterator(); nodeIt.hasNext();) {
        var node = nodeIt.next();

        for (var i = node.getEdges().iterator(); i.hasNext();) {
          var eeb = i.next();

          if (eeb.getEdgeEnds().size() > 1) {
            this._invalidPoint = eeb.getEdge().getCoordinate(0);
            return true;
          }
        }
      }

      return false;
    },
    isNodeConsistentArea: function isNodeConsistentArea() {
      var intersector = this._geomGraph.computeSelfNodes(this._li, true, true);

      if (intersector.hasProperIntersection()) {
        this._invalidPoint = intersector.getProperIntersectionPoint();
        return false;
      }

      this._nodeGraph.build(this._geomGraph);

      return this.isNodeEdgeAreaLabelsConsistent();
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return ConsistentAreaTester;
    }
  });

  function IndexedNestedRingTester() {
    this._graph = null;
    this._rings = new ArrayList();
    this._totalEnv = new Envelope();
    this._index = null;
    this._nestedPt = null;
    var graph = arguments[0];
    this._graph = graph;
  }
  extend(IndexedNestedRingTester.prototype, {
    buildIndex: function buildIndex() {
      this._index = new STRtree();

      for (var i = 0; i < this._rings.size(); i++) {
        var ring = this._rings.get(i);

        var env = ring.getEnvelopeInternal();

        this._index.insert(env, ring);
      }
    },
    getNestedPoint: function getNestedPoint() {
      return this._nestedPt;
    },
    isNonNested: function isNonNested() {
      this.buildIndex();

      for (var i = 0; i < this._rings.size(); i++) {
        var innerRing = this._rings.get(i);

        var innerRingPts = innerRing.getCoordinates();

        var results = this._index.query(innerRing.getEnvelopeInternal());

        for (var j = 0; j < results.size(); j++) {
          var searchRing = results.get(j);
          var searchRingPts = searchRing.getCoordinates();
          if (innerRing === searchRing) continue;
          if (!innerRing.getEnvelopeInternal().intersects(searchRing.getEnvelopeInternal())) continue;
          var innerRingPt = IsValidOp.findPtNotNode(innerRingPts, searchRing, this._graph);
          if (innerRingPt === null) continue;
          var isInside = PointLocation.isInRing(innerRingPt, searchRingPts);

          if (isInside) {
            this._nestedPt = innerRingPt;
            return false;
          }
        }
      }

      return true;
    },
    add: function add(ring) {
      this._rings.add(ring);

      this._totalEnv.expandToInclude(ring.getEnvelopeInternal());
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return IndexedNestedRingTester;
    }
  });

  function TopologyValidationError() {
    this._errorType = null;
    this._pt = null;

    if (arguments.length === 1) {
      var errorType = arguments[0];
      TopologyValidationError.call(this, errorType, null);
    } else if (arguments.length === 2) {
      var _errorType = arguments[0],
          pt = arguments[1];
      this._errorType = _errorType;
      if (pt !== null) this._pt = pt.copy();
    }
  }
  extend(TopologyValidationError.prototype, {
    getErrorType: function getErrorType() {
      return this._errorType;
    },
    getMessage: function getMessage() {
      return TopologyValidationError.errMsg[this._errorType];
    },
    getCoordinate: function getCoordinate() {
      return this._pt;
    },
    toString: function toString() {
      var locStr = "";
      if (this._pt !== null) locStr = " at or near point " + this._pt;
      return this.getMessage() + locStr;
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return TopologyValidationError;
    }
  });
  TopologyValidationError.ERROR = 0;
  TopologyValidationError.REPEATED_POINT = 1;
  TopologyValidationError.HOLE_OUTSIDE_SHELL = 2;
  TopologyValidationError.NESTED_HOLES = 3;
  TopologyValidationError.DISCONNECTED_INTERIOR = 4;
  TopologyValidationError.SELF_INTERSECTION = 5;
  TopologyValidationError.RING_SELF_INTERSECTION = 6;
  TopologyValidationError.NESTED_SHELLS = 7;
  TopologyValidationError.DUPLICATE_RINGS = 8;
  TopologyValidationError.TOO_FEW_POINTS = 9;
  TopologyValidationError.INVALID_COORDINATE = 10;
  TopologyValidationError.RING_NOT_CLOSED = 11;
  TopologyValidationError.errMsg = ["Topology Validation Error", "Repeated Point", "Hole lies outside shell", "Holes are nested", "Interior is disconnected", "Self-intersection", "Ring Self-intersection", "Nested shells", "Duplicate Rings", "Too few distinct points in geometry component", "Invalid Coordinate", "Ring is not closed"];

  function IsValidOp() {
    this._parentGeometry = null;
    this._isSelfTouchingRingFormingHoleValid = false;
    this._validErr = null;
    var parentGeometry = arguments[0];
    this._parentGeometry = parentGeometry;
  }
  extend(IsValidOp.prototype, {
    checkInvalidCoordinates: function checkInvalidCoordinates() {
      if (arguments[0] instanceof Array) {
        var coords = arguments[0];

        for (var i = 0; i < coords.length; i++) {
          if (!IsValidOp.isValid(coords[i])) {
            this._validErr = new TopologyValidationError(TopologyValidationError.INVALID_COORDINATE, coords[i]);
            return null;
          }
        }
      } else if (arguments[0] instanceof Polygon) {
        var poly = arguments[0];
        this.checkInvalidCoordinates(poly.getExteriorRing().getCoordinates());
        if (this._validErr !== null) return null;

        for (var i = 0; i < poly.getNumInteriorRing(); i++) {
          this.checkInvalidCoordinates(poly.getInteriorRingN(i).getCoordinates());
          if (this._validErr !== null) return null;
        }
      }
    },
    checkHolesNotNested: function checkHolesNotNested(p, graph) {
      var nestedTester = new IndexedNestedRingTester(graph);

      for (var i = 0; i < p.getNumInteriorRing(); i++) {
        var innerHole = p.getInteriorRingN(i);
        nestedTester.add(innerHole);
      }

      var isNonNested = nestedTester.isNonNested();

      if (!isNonNested) {
        this._validErr = new TopologyValidationError(TopologyValidationError.NESTED_HOLES, nestedTester.getNestedPoint());
      }
    },
    checkConsistentArea: function checkConsistentArea(graph) {
      var cat = new ConsistentAreaTester(graph);
      var isValidArea = cat.isNodeConsistentArea();

      if (!isValidArea) {
        this._validErr = new TopologyValidationError(TopologyValidationError.SELF_INTERSECTION, cat.getInvalidPoint());
        return null;
      }

      if (cat.hasDuplicateRings()) {
        this._validErr = new TopologyValidationError(TopologyValidationError.DUPLICATE_RINGS, cat.getInvalidPoint());
      }
    },
    isValid: function isValid() {
      this.checkValid(this._parentGeometry);
      return this._validErr === null;
    },
    checkShellInsideHole: function checkShellInsideHole(shell, hole, graph) {
      var shellPts = shell.getCoordinates();
      var holePts = hole.getCoordinates();
      var shellPt = IsValidOp.findPtNotNode(shellPts, hole, graph);

      if (shellPt !== null) {
        var insideHole = PointLocation.isInRing(shellPt, holePts);

        if (!insideHole) {
          return shellPt;
        }
      }

      var holePt = IsValidOp.findPtNotNode(holePts, shell, graph);

      if (holePt !== null) {
        var insideShell = PointLocation.isInRing(holePt, shellPts);

        if (insideShell) {
          return holePt;
        }

        return null;
      }

      Assert.shouldNeverReachHere("points in shell and hole appear to be equal");
      return null;
    },
    checkNoSelfIntersectingRings: function checkNoSelfIntersectingRings(graph) {
      for (var i = graph.getEdgeIterator(); i.hasNext();) {
        var e = i.next();
        this.checkNoSelfIntersectingRing(e.getEdgeIntersectionList());
        if (this._validErr !== null) return null;
      }
    },
    checkConnectedInteriors: function checkConnectedInteriors(graph) {
      var cit = new ConnectedInteriorTester(graph);
      if (!cit.isInteriorsConnected()) this._validErr = new TopologyValidationError(TopologyValidationError.DISCONNECTED_INTERIOR, cit.getCoordinate());
    },
    checkNoSelfIntersectingRing: function checkNoSelfIntersectingRing(eiList) {
      var nodeSet = new TreeSet();
      var isFirst = true;

      for (var i = eiList.iterator(); i.hasNext();) {
        var ei = i.next();

        if (isFirst) {
          isFirst = false;
          continue;
        }

        if (nodeSet.contains(ei.coord)) {
          this._validErr = new TopologyValidationError(TopologyValidationError.RING_SELF_INTERSECTION, ei.coord);
          return null;
        } else {
          nodeSet.add(ei.coord);
        }
      }
    },
    checkHolesInShell: function checkHolesInShell(p, graph) {
      var shell = p.getExteriorRing();
      var pir = new IndexedPointInAreaLocator(shell);

      for (var i = 0; i < p.getNumInteriorRing(); i++) {
        var hole = p.getInteriorRingN(i);
        var holePt = IsValidOp.findPtNotNode(hole.getCoordinates(), shell, graph);
        if (holePt === null) return null;
        var outside = Location.EXTERIOR === pir.locate(holePt);

        if (outside) {
          this._validErr = new TopologyValidationError(TopologyValidationError.HOLE_OUTSIDE_SHELL, holePt);
          return null;
        }
      }
    },
    checkTooFewPoints: function checkTooFewPoints(graph) {
      if (graph.hasTooFewPoints()) {
        this._validErr = new TopologyValidationError(TopologyValidationError.TOO_FEW_POINTS, graph.getInvalidPoint());
        return null;
      }
    },
    getValidationError: function getValidationError() {
      this.checkValid(this._parentGeometry);
      return this._validErr;
    },
    checkValid: function checkValid() {
      if (arguments[0] instanceof Point) {
        var _g = arguments[0];
        this.checkInvalidCoordinates(_g.getCoordinates());
      } else if (arguments[0] instanceof MultiPoint) {
        var _g2 = arguments[0];
        this.checkInvalidCoordinates(_g2.getCoordinates());
      } else if (arguments[0] instanceof LinearRing) {
        var _g3 = arguments[0];
        this.checkInvalidCoordinates(_g3.getCoordinates());
        if (this._validErr !== null) return null;
        this.checkClosedRing(_g3);
        if (this._validErr !== null) return null;
        var graph = new GeometryGraph(0, _g3);
        this.checkTooFewPoints(graph);
        if (this._validErr !== null) return null;
        var li = new RobustLineIntersector();
        graph.computeSelfNodes(li, true, true);
        this.checkNoSelfIntersectingRings(graph);
      } else if (arguments[0] instanceof LineString) {
        var _g4 = arguments[0];
        this.checkInvalidCoordinates(_g4.getCoordinates());
        if (this._validErr !== null) return null;
        var graph = new GeometryGraph(0, _g4);
        this.checkTooFewPoints(graph);
      } else if (arguments[0] instanceof Polygon) {
        var _g5 = arguments[0];
        this.checkInvalidCoordinates(_g5);
        if (this._validErr !== null) return null;
        this.checkClosedRings(_g5);
        if (this._validErr !== null) return null;
        var graph = new GeometryGraph(0, _g5);
        this.checkTooFewPoints(graph);
        if (this._validErr !== null) return null;
        this.checkConsistentArea(graph);
        if (this._validErr !== null) return null;

        if (!this._isSelfTouchingRingFormingHoleValid) {
          this.checkNoSelfIntersectingRings(graph);
          if (this._validErr !== null) return null;
        }

        this.checkHolesInShell(_g5, graph);
        if (this._validErr !== null) return null;
        this.checkHolesNotNested(_g5, graph);
        if (this._validErr !== null) return null;
        this.checkConnectedInteriors(graph);
      } else if (arguments[0] instanceof MultiPolygon) {
        var _g6 = arguments[0];

        for (var i = 0; i < _g6.getNumGeometries(); i++) {
          var p = _g6.getGeometryN(i);

          this.checkInvalidCoordinates(p);
          if (this._validErr !== null) return null;
          this.checkClosedRings(p);
          if (this._validErr !== null) return null;
        }

        var graph = new GeometryGraph(0, _g6);
        this.checkTooFewPoints(graph);
        if (this._validErr !== null) return null;
        this.checkConsistentArea(graph);
        if (this._validErr !== null) return null;

        if (!this._isSelfTouchingRingFormingHoleValid) {
          this.checkNoSelfIntersectingRings(graph);
          if (this._validErr !== null) return null;
        }

        for (var i = 0; i < _g6.getNumGeometries(); i++) {
          var p = _g6.getGeometryN(i);

          this.checkHolesInShell(p, graph);
          if (this._validErr !== null) return null;
        }

        for (var i = 0; i < _g6.getNumGeometries(); i++) {
          var p = _g6.getGeometryN(i);

          this.checkHolesNotNested(p, graph);
          if (this._validErr !== null) return null;
        }

        this.checkShellsNotNested(_g6, graph);
        if (this._validErr !== null) return null;
        this.checkConnectedInteriors(graph);
      } else if (arguments[0] instanceof GeometryCollection) {
        var gc = arguments[0];

        for (var i = 0; i < gc.getNumGeometries(); i++) {
          var g = gc.getGeometryN(i);
          this.checkValid(g);
          if (this._validErr !== null) return null;
        }
      } else if (arguments[0] instanceof Geometry) {
        var _g7 = arguments[0];
        this._validErr = null;
        if (_g7.isEmpty()) return null;
        if (_g7 instanceof Point) this.checkValid(_g7);else if (_g7 instanceof MultiPoint) this.checkValid(_g7);else if (_g7 instanceof LinearRing) this.checkValid(_g7);else if (_g7 instanceof LineString) this.checkValid(_g7);else if (_g7 instanceof Polygon) this.checkValid(_g7);else if (_g7 instanceof MultiPolygon) this.checkValid(_g7);else if (_g7 instanceof GeometryCollection) this.checkValid(_g7);else throw new UnsupportedOperationException(_g7.getClass().getName());
      }
    },
    setSelfTouchingRingFormingHoleValid: function setSelfTouchingRingFormingHoleValid(isValid) {
      this._isSelfTouchingRingFormingHoleValid = isValid;
    },
    checkShellNotNested: function checkShellNotNested(shell, p, graph) {
      var shellPts = shell.getCoordinates();
      var polyShell = p.getExteriorRing();
      var polyPts = polyShell.getCoordinates();
      var shellPt = IsValidOp.findPtNotNode(shellPts, polyShell, graph);
      if (shellPt === null) return null;
      var insidePolyShell = PointLocation.isInRing(shellPt, polyPts);
      if (!insidePolyShell) return null;

      if (p.getNumInteriorRing() <= 0) {
        this._validErr = new TopologyValidationError(TopologyValidationError.NESTED_SHELLS, shellPt);
        return null;
      }

      var badNestedPt = null;

      for (var i = 0; i < p.getNumInteriorRing(); i++) {
        var hole = p.getInteriorRingN(i);
        badNestedPt = this.checkShellInsideHole(shell, hole, graph);
        if (badNestedPt === null) return null;
      }

      this._validErr = new TopologyValidationError(TopologyValidationError.NESTED_SHELLS, badNestedPt);
    },
    checkClosedRings: function checkClosedRings(poly) {
      this.checkClosedRing(poly.getExteriorRing());
      if (this._validErr !== null) return null;

      for (var i = 0; i < poly.getNumInteriorRing(); i++) {
        this.checkClosedRing(poly.getInteriorRingN(i));
        if (this._validErr !== null) return null;
      }
    },
    checkClosedRing: function checkClosedRing(ring) {
      if (!ring.isClosed()) {
        var pt = null;
        if (ring.getNumPoints() >= 1) pt = ring.getCoordinateN(0);
        this._validErr = new TopologyValidationError(TopologyValidationError.RING_NOT_CLOSED, pt);
      }
    },
    checkShellsNotNested: function checkShellsNotNested(mp, graph) {
      for (var i = 0; i < mp.getNumGeometries(); i++) {
        var p = mp.getGeometryN(i);
        var shell = p.getExteriorRing();

        for (var j = 0; j < mp.getNumGeometries(); j++) {
          if (i === j) continue;
          var p2 = mp.getGeometryN(j);
          this.checkShellNotNested(shell, p2, graph);
          if (this._validErr !== null) return null;
        }
      }
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return IsValidOp;
    }
  });

  IsValidOp.findPtNotNode = function (testCoords, searchRing, graph) {
    var searchEdge = graph.findEdge(searchRing);
    var eiList = searchEdge.getEdgeIntersectionList();

    for (var i = 0; i < testCoords.length; i++) {
      var pt = testCoords[i];
      if (!eiList.isIntersection(pt)) return pt;
    }

    return null;
  };

  IsValidOp.isValid = function () {
    if (arguments[0] instanceof Geometry) {
      var geom = arguments[0];
      var isValidOp = new IsValidOp(geom);
      return isValidOp.isValid();
    } else if (arguments[0] instanceof Coordinate) {
      var coord = arguments[0];
      if (Double.isNaN(coord.x)) return false;
      if (Double.isInfinite(coord.x)) return false;
      if (Double.isNaN(coord.y)) return false;
      if (Double.isInfinite(coord.y)) return false;
      return true;
    }
  };



  var valid = /*#__PURE__*/Object.freeze({
    IsValidOp: IsValidOp,
    ConsistentAreaTester: ConsistentAreaTester
  });



  var operation = /*#__PURE__*/Object.freeze({
    BoundaryOp: BoundaryOp,
    IsSimpleOp: IsSimpleOp,
    buffer: buffer,
    distance: distance,
    linemerge: linemerge,
    overlay: overlay,
    polygonize: polygonize,
    relate: relate,
    union: union,
    valid: valid
  });

  function PrecisionReducerCoordinateOperation() {
    GeometryEditor.CoordinateOperation.apply(this);
    this._targetPM = null;
    this._removeCollapsed = true;
    var targetPM = arguments[0],
        removeCollapsed = arguments[1];
    this._targetPM = targetPM;
    this._removeCollapsed = removeCollapsed;
  }
  inherits(PrecisionReducerCoordinateOperation, GeometryEditor.CoordinateOperation);
  extend(PrecisionReducerCoordinateOperation.prototype, {
    edit: function edit() {
      if (arguments.length === 2 && arguments[1] instanceof Geometry && arguments[0] instanceof Array) {
        var coordinates = arguments[0],
            geom = arguments[1];
        if (coordinates.length === 0) return null;
        var reducedCoords = new Array(coordinates.length).fill(null);

        for (var i = 0; i < coordinates.length; i++) {
          var coord = new Coordinate(coordinates[i]);

          this._targetPM.makePrecise(coord);

          reducedCoords[i] = coord;
        }

        var noRepeatedCoordList = new CoordinateList(reducedCoords, false);
        var noRepeatedCoords = noRepeatedCoordList.toCoordinateArray();
        var minLength = 0;
        if (geom instanceof LineString) minLength = 2;
        if (geom instanceof LinearRing) minLength = 4;
        var collapsedCoords = reducedCoords;
        if (this._removeCollapsed) collapsedCoords = null;

        if (noRepeatedCoords.length < minLength) {
          return collapsedCoords;
        }

        return noRepeatedCoords;
      } else return GeometryEditor.CoordinateOperation.prototype.edit.apply(this, arguments);
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return PrecisionReducerCoordinateOperation;
    }
  });

  function GeometryPrecisionReducer() {
    this._targetPM = null;
    this._removeCollapsed = true;
    this._changePrecisionModel = false;
    this._isPointwise = false;
    var pm = arguments[0];
    this._targetPM = pm;
  }
  extend(GeometryPrecisionReducer.prototype, {
    fixPolygonalTopology: function fixPolygonalTopology(geom) {
      var geomToBuffer = geom;

      if (!this._changePrecisionModel) {
        geomToBuffer = this.changePM(geom, this._targetPM);
      }

      var bufGeom = BufferOp.bufferOp(geomToBuffer, 0);
      var finalGeom = bufGeom;

      if (!this._changePrecisionModel) {
        finalGeom = bufGeom.copy();
        this.changePM(finalGeom, geom.getPrecisionModel());
      }

      return finalGeom;
    },
    reducePointwise: function reducePointwise(geom) {
      var geomEdit = null;

      if (this._changePrecisionModel) {
        var newFactory = this.createFactory(geom.getFactory(), this._targetPM);
        geomEdit = new GeometryEditor(newFactory);
      } else geomEdit = new GeometryEditor();

      var finalRemoveCollapsed = this._removeCollapsed;
      if (geom.getDimension() >= 2) finalRemoveCollapsed = true;
      var reduceGeom = geomEdit.edit(geom, new PrecisionReducerCoordinateOperation(this._targetPM, finalRemoveCollapsed));
      return reduceGeom;
    },
    changePM: function changePM(geom, newPM) {
      var geomEditor = this.createEditor(geom.getFactory(), newPM);
      return geomEditor.edit(geom, new GeometryEditor.NoOpGeometryOperation());
    },
    setRemoveCollapsedComponents: function setRemoveCollapsedComponents(removeCollapsed) {
      this._removeCollapsed = removeCollapsed;
    },
    createFactory: function createFactory(inputFactory, pm) {
      var newFactory = new GeometryFactory(pm, inputFactory.getSRID(), inputFactory.getCoordinateSequenceFactory());
      return newFactory;
    },
    setChangePrecisionModel: function setChangePrecisionModel(changePrecisionModel) {
      this._changePrecisionModel = changePrecisionModel;
    },
    reduce: function reduce(geom) {
      var reducePW = this.reducePointwise(geom);
      if (this._isPointwise) return reducePW;
      if (!hasInterface(reducePW, Polygonal)) return reducePW;
      if (IsValidOp.isValid(reducePW)) return reducePW;
      return this.fixPolygonalTopology(reducePW);
    },
    setPointwise: function setPointwise(isPointwise) {
      this._isPointwise = isPointwise;
    },
    createEditor: function createEditor(geomFactory, newPM) {
      if (geomFactory.getPrecisionModel() === newPM) return new GeometryEditor();
      var newFactory = this.createFactory(geomFactory, newPM);
      var geomEdit = new GeometryEditor(newFactory);
      return geomEdit;
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return GeometryPrecisionReducer;
    }
  });

  GeometryPrecisionReducer.reduce = function (g, precModel) {
    var reducer = new GeometryPrecisionReducer(precModel);
    return reducer.reduce(g);
  };

  GeometryPrecisionReducer.reducePointwise = function (g, precModel) {
    var reducer = new GeometryPrecisionReducer(precModel);
    reducer.setPointwise(true);
    return reducer.reduce(g);
  };



  var precision = /*#__PURE__*/Object.freeze({
    GeometryPrecisionReducer: GeometryPrecisionReducer
  });

  function DouglasPeuckerLineSimplifier() {
    this._pts = null;
    this._usePt = null;
    this._distanceTolerance = null;
    this._seg = new LineSegment();
    var pts = arguments[0];
    this._pts = pts;
  }
  extend(DouglasPeuckerLineSimplifier.prototype, {
    simplifySection: function simplifySection(i, j) {
      if (i + 1 === j) {
        return null;
      }

      this._seg.p0 = this._pts[i];
      this._seg.p1 = this._pts[j];
      var maxDistance = -1.0;
      var maxIndex = i;

      for (var k = i + 1; k < j; k++) {
        var distance = this._seg.distance(this._pts[k]);

        if (distance > maxDistance) {
          maxDistance = distance;
          maxIndex = k;
        }
      }

      if (maxDistance <= this._distanceTolerance) {
        for (var k = i + 1; k < j; k++) {
          this._usePt[k] = false;
        }
      } else {
        this.simplifySection(i, maxIndex);
        this.simplifySection(maxIndex, j);
      }
    },
    setDistanceTolerance: function setDistanceTolerance(distanceTolerance) {
      this._distanceTolerance = distanceTolerance;
    },
    simplify: function simplify() {
      this._usePt = new Array(this._pts.length).fill(null);

      for (var i = 0; i < this._pts.length; i++) {
        this._usePt[i] = true;
      }

      this.simplifySection(0, this._pts.length - 1);
      var coordList = new CoordinateList();

      for (var i = 0; i < this._pts.length; i++) {
        if (this._usePt[i]) coordList.add(new Coordinate(this._pts[i]));
      }

      return coordList.toCoordinateArray();
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return DouglasPeuckerLineSimplifier;
    }
  });

  DouglasPeuckerLineSimplifier.simplify = function (pts, distanceTolerance) {
    var simp = new DouglasPeuckerLineSimplifier(pts);
    simp.setDistanceTolerance(distanceTolerance);
    return simp.simplify();
  };

  function DouglasPeuckerSimplifier() {
    this._inputGeom = null;
    this._distanceTolerance = null;
    this._isEnsureValidTopology = true;
    var inputGeom = arguments[0];
    this._inputGeom = inputGeom;
  }
  extend(DouglasPeuckerSimplifier.prototype, {
    setEnsureValid: function setEnsureValid(isEnsureValidTopology) {
      this._isEnsureValidTopology = isEnsureValidTopology;
    },
    getResultGeometry: function getResultGeometry() {
      if (this._inputGeom.isEmpty()) return this._inputGeom.copy();
      return new DPTransformer(this._isEnsureValidTopology, this._distanceTolerance).transform(this._inputGeom);
    },
    setDistanceTolerance: function setDistanceTolerance(distanceTolerance) {
      if (distanceTolerance < 0.0) throw new IllegalArgumentException("Tolerance must be non-negative");
      this._distanceTolerance = distanceTolerance;
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return DouglasPeuckerSimplifier;
    }
  });

  DouglasPeuckerSimplifier.simplify = function (geom, distanceTolerance) {
    var tss = new DouglasPeuckerSimplifier(geom);
    tss.setDistanceTolerance(distanceTolerance);
    return tss.getResultGeometry();
  };

  function DPTransformer() {
    GeometryTransformer.apply(this);
    this._isEnsureValidTopology = true;
    this._distanceTolerance = null;
    var isEnsureValidTopology = arguments[0],
        distanceTolerance = arguments[1];
    this._isEnsureValidTopology = isEnsureValidTopology;
    this._distanceTolerance = distanceTolerance;
  }

  inherits(DPTransformer, GeometryTransformer);
  extend(DPTransformer.prototype, {
    transformPolygon: function transformPolygon(geom, parent) {
      if (geom.isEmpty()) return null;
      var rawGeom = GeometryTransformer.prototype.transformPolygon.call(this, geom, parent);

      if (parent instanceof MultiPolygon) {
        return rawGeom;
      }

      return this.createValidArea(rawGeom);
    },
    createValidArea: function createValidArea(rawAreaGeom) {
      if (this._isEnsureValidTopology) return rawAreaGeom.buffer(0.0);
      return rawAreaGeom;
    },
    transformCoordinates: function transformCoordinates(coords, parent) {
      var inputPts = coords.toCoordinateArray();
      var newPts = null;

      if (inputPts.length === 0) {
        newPts = new Array(0).fill(null);
      } else {
        newPts = DouglasPeuckerLineSimplifier.simplify(inputPts, this._distanceTolerance);
      }

      return this._factory.getCoordinateSequenceFactory().create(newPts);
    },
    transformMultiPolygon: function transformMultiPolygon(geom, parent) {
      var rawGeom = GeometryTransformer.prototype.transformMultiPolygon.call(this, geom, parent);
      return this.createValidArea(rawGeom);
    },
    transformLinearRing: function transformLinearRing(geom, parent) {
      var removeDegenerateRings = parent instanceof Polygon;
      var simpResult = GeometryTransformer.prototype.transformLinearRing.call(this, geom, parent);
      if (removeDegenerateRings && !(simpResult instanceof LinearRing)) return null;
      return simpResult;
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return DPTransformer;
    }
  });
  DouglasPeuckerSimplifier.DPTransformer = DPTransformer;

  function TaggedLineSegment() {
    this._parent = null;
    this._index = null;

    if (arguments.length === 2) {
      var p0 = arguments[0],
          p1 = arguments[1];
      TaggedLineSegment.call(this, p0, p1, null, -1);
    } else if (arguments.length === 4) {
      var _p = arguments[0],
          _p2 = arguments[1],
          parent = arguments[2],
          index = arguments[3];
      LineSegment.call(this, _p, _p2);
      this._parent = parent;
      this._index = index;
    }
  }
  inherits(TaggedLineSegment, LineSegment);
  extend(TaggedLineSegment.prototype, {
    getIndex: function getIndex() {
      return this._index;
    },
    getParent: function getParent() {
      return this._parent;
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return TaggedLineSegment;
    }
  });

  function TaggedLineString() {
    this._parentLine = null;
    this._segs = null;
    this._resultSegs = new ArrayList();
    this._minimumSize = null;

    if (arguments.length === 1) {
      var parentLine = arguments[0];
      TaggedLineString.call(this, parentLine, 2);
    } else if (arguments.length === 2) {
      var _parentLine = arguments[0],
          minimumSize = arguments[1];
      this._parentLine = _parentLine;
      this._minimumSize = minimumSize;
      this.init();
    }
  }
  extend(TaggedLineString.prototype, {
    addToResult: function addToResult(seg) {
      this._resultSegs.add(seg);
    },
    asLineString: function asLineString() {
      return this._parentLine.getFactory().createLineString(TaggedLineString.extractCoordinates(this._resultSegs));
    },
    getResultSize: function getResultSize() {
      var resultSegsSize = this._resultSegs.size();

      return resultSegsSize === 0 ? 0 : resultSegsSize + 1;
    },
    getParent: function getParent() {
      return this._parentLine;
    },
    getSegment: function getSegment(i) {
      return this._segs[i];
    },
    getParentCoordinates: function getParentCoordinates() {
      return this._parentLine.getCoordinates();
    },
    getMinimumSize: function getMinimumSize() {
      return this._minimumSize;
    },
    asLinearRing: function asLinearRing() {
      return this._parentLine.getFactory().createLinearRing(TaggedLineString.extractCoordinates(this._resultSegs));
    },
    getSegments: function getSegments() {
      return this._segs;
    },
    init: function init() {
      var pts = this._parentLine.getCoordinates();

      this._segs = new Array(pts.length - 1).fill(null);

      for (var i = 0; i < pts.length - 1; i++) {
        var seg = new TaggedLineSegment(pts[i], pts[i + 1], this._parentLine, i);
        this._segs[i] = seg;
      }
    },
    getResultCoordinates: function getResultCoordinates() {
      return TaggedLineString.extractCoordinates(this._resultSegs);
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return TaggedLineString;
    }
  });

  TaggedLineString.extractCoordinates = function (segs) {
    var pts = new Array(segs.size() + 1).fill(null);
    var seg = null;

    for (var i = 0; i < segs.size(); i++) {
      seg = segs.get(i);
      pts[i] = seg.p0;
    }

    pts[pts.length - 1] = seg.p1;
    return pts;
  };

  function LineSegmentIndex() {
    this._index = new Quadtree();
  }
  extend(LineSegmentIndex.prototype, {
    remove: function remove(seg) {
      this._index.remove(new Envelope(seg.p0, seg.p1), seg);
    },
    add: function add() {
      if (arguments[0] instanceof TaggedLineString) {
        var line = arguments[0];
        var segs = line.getSegments();

        for (var i = 0; i < segs.length; i++) {
          var seg = segs[i];
          this.add(seg);
        }
      } else if (arguments[0] instanceof LineSegment) {
        var _seg = arguments[0];

        this._index.insert(new Envelope(_seg.p0, _seg.p1), _seg);
      }
    },
    query: function query(querySeg) {
      var env = new Envelope(querySeg.p0, querySeg.p1);
      var visitor = new LineSegmentVisitor(querySeg);

      this._index.query(env, visitor);

      var itemsFound = visitor.getItems();
      return itemsFound;
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return LineSegmentIndex;
    }
  });

  function LineSegmentVisitor() {
    this._querySeg = null;
    this._items = new ArrayList();
    var querySeg = arguments[0];
    this._querySeg = querySeg;
  }

  extend(LineSegmentVisitor.prototype, {
    visitItem: function visitItem(item) {
      var seg = item;
      if (Envelope.intersects(seg.p0, seg.p1, this._querySeg.p0, this._querySeg.p1)) this._items.add(item);
    },
    getItems: function getItems() {
      return this._items;
    },
    interfaces_: function interfaces_() {
      return [ItemVisitor];
    },
    getClass: function getClass() {
      return LineSegmentVisitor;
    }
  });

  function TaggedLineStringSimplifier() {
    this._li = new RobustLineIntersector();
    this._inputIndex = new LineSegmentIndex();
    this._outputIndex = new LineSegmentIndex();
    this._line = null;
    this._linePts = null;
    this._distanceTolerance = 0.0;
    var inputIndex = arguments[0],
        outputIndex = arguments[1];
    this._inputIndex = inputIndex;
    this._outputIndex = outputIndex;
  }
  extend(TaggedLineStringSimplifier.prototype, {
    flatten: function flatten(start, end) {
      var p0 = this._linePts[start];
      var p1 = this._linePts[end];
      var newSeg = new LineSegment(p0, p1);
      this.remove(this._line, start, end);

      this._outputIndex.add(newSeg);

      return newSeg;
    },
    hasBadIntersection: function hasBadIntersection(parentLine, sectionIndex, candidateSeg) {
      if (this.hasBadOutputIntersection(candidateSeg)) return true;
      if (this.hasBadInputIntersection(parentLine, sectionIndex, candidateSeg)) return true;
      return false;
    },
    setDistanceTolerance: function setDistanceTolerance(distanceTolerance) {
      this._distanceTolerance = distanceTolerance;
    },
    simplifySection: function simplifySection(i, j, depth) {
      depth += 1;
      var sectionIndex = new Array(2).fill(null);

      if (i + 1 === j) {
        var newSeg = this._line.getSegment(i);

        this._line.addToResult(newSeg);

        return null;
      }

      var isValidToSimplify = true;

      if (this._line.getResultSize() < this._line.getMinimumSize()) {
        var worstCaseSize = depth + 1;
        if (worstCaseSize < this._line.getMinimumSize()) isValidToSimplify = false;
      }

      var distance = new Array(1).fill(null);
      var furthestPtIndex = this.findFurthestPoint(this._linePts, i, j, distance);
      if (distance[0] > this._distanceTolerance) isValidToSimplify = false;
      var candidateSeg = new LineSegment();
      candidateSeg.p0 = this._linePts[i];
      candidateSeg.p1 = this._linePts[j];
      sectionIndex[0] = i;
      sectionIndex[1] = j;
      if (this.hasBadIntersection(this._line, sectionIndex, candidateSeg)) isValidToSimplify = false;

      if (isValidToSimplify) {
        var newSeg = this.flatten(i, j);

        this._line.addToResult(newSeg);

        return null;
      }

      this.simplifySection(i, furthestPtIndex, depth);
      this.simplifySection(furthestPtIndex, j, depth);
    },
    hasBadOutputIntersection: function hasBadOutputIntersection(candidateSeg) {
      var querySegs = this._outputIndex.query(candidateSeg);

      for (var i = querySegs.iterator(); i.hasNext();) {
        var querySeg = i.next();

        if (this.hasInteriorIntersection(querySeg, candidateSeg)) {
          return true;
        }
      }

      return false;
    },
    findFurthestPoint: function findFurthestPoint(pts, i, j, maxDistance) {
      var seg = new LineSegment();
      seg.p0 = pts[i];
      seg.p1 = pts[j];
      var maxDist = -1.0;
      var maxIndex = i;

      for (var k = i + 1; k < j; k++) {
        var midPt = pts[k];
        var distance = seg.distance(midPt);

        if (distance > maxDist) {
          maxDist = distance;
          maxIndex = k;
        }
      }

      maxDistance[0] = maxDist;
      return maxIndex;
    },
    simplify: function simplify(line) {
      this._line = line;
      this._linePts = line.getParentCoordinates();
      this.simplifySection(0, this._linePts.length - 1, 0);
    },
    remove: function remove(line, start, end) {
      for (var i = start; i < end; i++) {
        var seg = line.getSegment(i);

        this._inputIndex.remove(seg);
      }
    },
    hasInteriorIntersection: function hasInteriorIntersection(seg0, seg1) {
      this._li.computeIntersection(seg0.p0, seg0.p1, seg1.p0, seg1.p1);

      return this._li.isInteriorIntersection();
    },
    hasBadInputIntersection: function hasBadInputIntersection(parentLine, sectionIndex, candidateSeg) {
      var querySegs = this._inputIndex.query(candidateSeg);

      for (var i = querySegs.iterator(); i.hasNext();) {
        var querySeg = i.next();

        if (this.hasInteriorIntersection(querySeg, candidateSeg)) {
          if (TaggedLineStringSimplifier.isInLineSection(parentLine, sectionIndex, querySeg)) continue;
          return true;
        }
      }

      return false;
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return TaggedLineStringSimplifier;
    }
  });

  TaggedLineStringSimplifier.isInLineSection = function (line, sectionIndex, seg) {
    if (seg.getParent() !== line.getParent()) return false;
    var segIndex = seg.getIndex();
    if (segIndex >= sectionIndex[0] && segIndex < sectionIndex[1]) return true;
    return false;
  };

  function TaggedLinesSimplifier() {
    this._inputIndex = new LineSegmentIndex();
    this._outputIndex = new LineSegmentIndex();
    this._distanceTolerance = 0.0;
  }
  extend(TaggedLinesSimplifier.prototype, {
    setDistanceTolerance: function setDistanceTolerance(distanceTolerance) {
      this._distanceTolerance = distanceTolerance;
    },
    simplify: function simplify(taggedLines) {
      for (var i = taggedLines.iterator(); i.hasNext();) {
        this._inputIndex.add(i.next());
      }

      for (var i = taggedLines.iterator(); i.hasNext();) {
        var tlss = new TaggedLineStringSimplifier(this._inputIndex, this._outputIndex);
        tlss.setDistanceTolerance(this._distanceTolerance);
        tlss.simplify(i.next());
      }
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return TaggedLinesSimplifier;
    }
  });

  function TopologyPreservingSimplifier() {
    this._inputGeom = null;
    this._lineSimplifier = new TaggedLinesSimplifier();
    this._linestringMap = null;
    var inputGeom = arguments[0];
    this._inputGeom = inputGeom;
  }
  extend(TopologyPreservingSimplifier.prototype, {
    getResultGeometry: function getResultGeometry() {
      if (this._inputGeom.isEmpty()) return this._inputGeom.copy();
      this._linestringMap = new HashMap();

      this._inputGeom.apply(new LineStringMapBuilderFilter(this));

      this._lineSimplifier.simplify(this._linestringMap.values());

      var result = new LineStringTransformer(this._linestringMap).transform(this._inputGeom);
      return result;
    },
    setDistanceTolerance: function setDistanceTolerance(distanceTolerance) {
      if (distanceTolerance < 0.0) throw new IllegalArgumentException("Tolerance must be non-negative");

      this._lineSimplifier.setDistanceTolerance(distanceTolerance);
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return TopologyPreservingSimplifier;
    }
  });

  TopologyPreservingSimplifier.simplify = function (geom, distanceTolerance) {
    var tss = new TopologyPreservingSimplifier(geom);
    tss.setDistanceTolerance(distanceTolerance);
    return tss.getResultGeometry();
  };

  function LineStringTransformer() {
    GeometryTransformer.apply(this);
    this._linestringMap = null;
    var linestringMap = arguments[0];
    this._linestringMap = linestringMap;
  }

  inherits(LineStringTransformer, GeometryTransformer);
  extend(LineStringTransformer.prototype, {
    transformCoordinates: function transformCoordinates(coords, parent) {
      if (coords.size() === 0) return null;

      if (parent instanceof LineString) {
        var taggedLine = this._linestringMap.get(parent);

        return this.createCoordinateSequence(taggedLine.getResultCoordinates());
      }

      return GeometryTransformer.prototype.transformCoordinates.call(this, coords, parent);
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return LineStringTransformer;
    }
  });

  function LineStringMapBuilderFilter() {
    this.tps = null;
    var tps = arguments[0];
    this.tps = tps;
  }

  extend(LineStringMapBuilderFilter.prototype, {
    filter: function filter(geom) {
      if (geom instanceof LineString) {
        var line = geom;
        if (line.isEmpty()) return null;
        var minSize = line.isClosed() ? 4 : 2;
        var taggedLine = new TaggedLineString(line, minSize);

        this.tps._linestringMap.put(line, taggedLine);
      }
    },
    interfaces_: function interfaces_() {
      return [GeometryComponentFilter];
    },
    getClass: function getClass() {
      return LineStringMapBuilderFilter;
    }
  });
  TopologyPreservingSimplifier.LineStringTransformer = LineStringTransformer;
  TopologyPreservingSimplifier.LineStringMapBuilderFilter = LineStringMapBuilderFilter;



  var simplify = /*#__PURE__*/Object.freeze({
    DouglasPeuckerSimplifier: DouglasPeuckerSimplifier,
    TopologyPreservingSimplifier: TopologyPreservingSimplifier
  });

  function SplitSegment() {
    this._seg = null;
    this._segLen = null;
    this._splitPt = null;
    this._minimumLen = 0.0;
    var seg = arguments[0];
    this._seg = seg;
    this._segLen = seg.getLength();
  }
  extend(SplitSegment.prototype, {
    splitAt: function splitAt() {
      if (arguments.length === 1) {
        var pt = arguments[0];
        var minFrac = this._minimumLen / this._segLen;

        if (pt.distance(this._seg.p0) < this._minimumLen) {
          this._splitPt = this._seg.pointAlong(minFrac);
          return null;
        }

        if (pt.distance(this._seg.p1) < this._minimumLen) {
          this._splitPt = SplitSegment.pointAlongReverse(this._seg, minFrac);
          return null;
        }

        this._splitPt = pt;
      } else if (arguments.length === 2) {
        var length = arguments[0],
            endPt = arguments[1];
        var actualLen = this.getConstrainedLength(length);
        var frac = actualLen / this._segLen;
        if (endPt.equals2D(this._seg.p0)) this._splitPt = this._seg.pointAlong(frac);else this._splitPt = SplitSegment.pointAlongReverse(this._seg, frac);
      }
    },
    setMinimumLength: function setMinimumLength(minLen) {
      this._minimumLen = minLen;
    },
    getConstrainedLength: function getConstrainedLength(len) {
      if (len < this._minimumLen) return this._minimumLen;
      return len;
    },
    getSplitPoint: function getSplitPoint() {
      return this._splitPt;
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return SplitSegment;
    }
  });

  SplitSegment.pointAlongReverse = function (seg, segmentLengthFraction) {
    var coord = new Coordinate();
    coord.x = seg.p1.x - segmentLengthFraction * (seg.p1.x - seg.p0.x);
    coord.y = seg.p1.y - segmentLengthFraction * (seg.p1.y - seg.p0.y);
    return coord;
  };

  function ConstraintSplitPointFinder() {}
  extend(ConstraintSplitPointFinder.prototype, {
    findSplitPoint: function findSplitPoint(seg, encroachPt) {},
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return ConstraintSplitPointFinder;
    }
  });

  function NonEncroachingSplitPointFinder() {}
  extend(NonEncroachingSplitPointFinder.prototype, {
    findSplitPoint: function findSplitPoint(seg, encroachPt) {
      var lineSeg = seg.getLineSegment();
      var segLen = lineSeg.getLength();
      var midPtLen = segLen / 2;
      var splitSeg = new SplitSegment(lineSeg);
      var projPt = NonEncroachingSplitPointFinder.projectedSplitPoint(seg, encroachPt);
      var nonEncroachDiam = projPt.distance(encroachPt) * 2 * 0.8;
      var maxSplitLen = nonEncroachDiam;

      if (maxSplitLen > midPtLen) {
        maxSplitLen = midPtLen;
      }

      splitSeg.setMinimumLength(maxSplitLen);
      splitSeg.splitAt(projPt);
      return splitSeg.getSplitPoint();
    },
    interfaces_: function interfaces_() {
      return [ConstraintSplitPointFinder];
    },
    getClass: function getClass() {
      return NonEncroachingSplitPointFinder;
    }
  });

  NonEncroachingSplitPointFinder.projectedSplitPoint = function (seg, encroachPt) {
    var lineSeg = seg.getLineSegment();
    var projPt = lineSeg.project(encroachPt);
    return projPt;
  };

  function TrianglePredicate() {}
  extend(TrianglePredicate.prototype, {
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return TrianglePredicate;
    }
  });

  TrianglePredicate.triArea = function (a, b, c) {
    return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  };

  TrianglePredicate.isInCircleDDNormalized = function (a, b, c, p) {
    var adx = DD.valueOf(a.x).selfSubtract(p.x);
    var ady = DD.valueOf(a.y).selfSubtract(p.y);
    var bdx = DD.valueOf(b.x).selfSubtract(p.x);
    var bdy = DD.valueOf(b.y).selfSubtract(p.y);
    var cdx = DD.valueOf(c.x).selfSubtract(p.x);
    var cdy = DD.valueOf(c.y).selfSubtract(p.y);
    var abdet = adx.multiply(bdy).selfSubtract(bdx.multiply(ady));
    var bcdet = bdx.multiply(cdy).selfSubtract(cdx.multiply(bdy));
    var cadet = cdx.multiply(ady).selfSubtract(adx.multiply(cdy));
    var alift = adx.multiply(adx).selfAdd(ady.multiply(ady));
    var blift = bdx.multiply(bdx).selfAdd(bdy.multiply(bdy));
    var clift = cdx.multiply(cdx).selfAdd(cdy.multiply(cdy));
    var sum = alift.selfMultiply(bcdet).selfAdd(blift.selfMultiply(cadet)).selfAdd(clift.selfMultiply(abdet));
    var isInCircle = sum.doubleValue() > 0;
    return isInCircle;
  };

  TrianglePredicate.checkRobustInCircle = function (a, b, c, p) {
    var nonRobustInCircle = TrianglePredicate.isInCircleNonRobust(a, b, c, p);
    var isInCircleDD = TrianglePredicate.isInCircleDDSlow(a, b, c, p);
    var isInCircleCC = TrianglePredicate.isInCircleCC(a, b, c, p);
    var circumCentre = Triangle.circumcentre(a, b, c);
    System.out.println("p radius diff a = " + Math.abs(p.distance(circumCentre) - a.distance(circumCentre)) / a.distance(circumCentre));

    if (nonRobustInCircle !== isInCircleDD || nonRobustInCircle !== isInCircleCC) {
      System.out.println("inCircle robustness failure (double result = " + nonRobustInCircle + ", DD result = " + isInCircleDD + ", CC result = " + isInCircleCC + ")");
      System.out.println(WKTWriter.toLineString(new CoordinateArraySequence([a, b, c, p])));
      System.out.println("Circumcentre = " + WKTWriter.toPoint(circumCentre) + " radius = " + a.distance(circumCentre));
      System.out.println("p radius diff a = " + Math.abs(p.distance(circumCentre) / a.distance(circumCentre) - 1));
      System.out.println("p radius diff b = " + Math.abs(p.distance(circumCentre) / b.distance(circumCentre) - 1));
      System.out.println("p radius diff c = " + Math.abs(p.distance(circumCentre) / c.distance(circumCentre) - 1));
      System.out.println();
    }
  };

  TrianglePredicate.isInCircleDDFast = function (a, b, c, p) {
    var aTerm = DD.sqr(a.x).selfAdd(DD.sqr(a.y)).selfMultiply(TrianglePredicate.triAreaDDFast(b, c, p));
    var bTerm = DD.sqr(b.x).selfAdd(DD.sqr(b.y)).selfMultiply(TrianglePredicate.triAreaDDFast(a, c, p));
    var cTerm = DD.sqr(c.x).selfAdd(DD.sqr(c.y)).selfMultiply(TrianglePredicate.triAreaDDFast(a, b, p));
    var pTerm = DD.sqr(p.x).selfAdd(DD.sqr(p.y)).selfMultiply(TrianglePredicate.triAreaDDFast(a, b, c));
    var sum = aTerm.selfSubtract(bTerm).selfAdd(cTerm).selfSubtract(pTerm);
    var isInCircle = sum.doubleValue() > 0;
    return isInCircle;
  };

  TrianglePredicate.isInCircleCC = function (a, b, c, p) {
    var cc = Triangle.circumcentre(a, b, c);
    var ccRadius = a.distance(cc);
    var pRadiusDiff = p.distance(cc) - ccRadius;
    return pRadiusDiff <= 0;
  };

  TrianglePredicate.isInCircleNormalized = function (a, b, c, p) {
    var adx = a.x - p.x;
    var ady = a.y - p.y;
    var bdx = b.x - p.x;
    var bdy = b.y - p.y;
    var cdx = c.x - p.x;
    var cdy = c.y - p.y;
    var abdet = adx * bdy - bdx * ady;
    var bcdet = bdx * cdy - cdx * bdy;
    var cadet = cdx * ady - adx * cdy;
    var alift = adx * adx + ady * ady;
    var blift = bdx * bdx + bdy * bdy;
    var clift = cdx * cdx + cdy * cdy;
    var disc = alift * bcdet + blift * cadet + clift * abdet;
    return disc > 0;
  };

  TrianglePredicate.isInCircleDDSlow = function (a, b, c, p) {
    var px = DD.valueOf(p.x);
    var py = DD.valueOf(p.y);
    var ax = DD.valueOf(a.x);
    var ay = DD.valueOf(a.y);
    var bx = DD.valueOf(b.x);
    var by = DD.valueOf(b.y);
    var cx = DD.valueOf(c.x);
    var cy = DD.valueOf(c.y);
    var aTerm = ax.multiply(ax).add(ay.multiply(ay)).multiply(TrianglePredicate.triAreaDDSlow(bx, by, cx, cy, px, py));
    var bTerm = bx.multiply(bx).add(by.multiply(by)).multiply(TrianglePredicate.triAreaDDSlow(ax, ay, cx, cy, px, py));
    var cTerm = cx.multiply(cx).add(cy.multiply(cy)).multiply(TrianglePredicate.triAreaDDSlow(ax, ay, bx, by, px, py));
    var pTerm = px.multiply(px).add(py.multiply(py)).multiply(TrianglePredicate.triAreaDDSlow(ax, ay, bx, by, cx, cy));
    var sum = aTerm.subtract(bTerm).add(cTerm).subtract(pTerm);
    var isInCircle = sum.doubleValue() > 0;
    return isInCircle;
  };

  TrianglePredicate.isInCircleNonRobust = function (a, b, c, p) {
    var isInCircle = (a.x * a.x + a.y * a.y) * TrianglePredicate.triArea(b, c, p) - (b.x * b.x + b.y * b.y) * TrianglePredicate.triArea(a, c, p) + (c.x * c.x + c.y * c.y) * TrianglePredicate.triArea(a, b, p) - (p.x * p.x + p.y * p.y) * TrianglePredicate.triArea(a, b, c) > 0;
    return isInCircle;
  };

  TrianglePredicate.isInCircleRobust = function (a, b, c, p) {
    return TrianglePredicate.isInCircleNormalized(a, b, c, p);
  };

  TrianglePredicate.triAreaDDSlow = function (ax, ay, bx, by, cx, cy) {
    return bx.subtract(ax).multiply(cy.subtract(ay)).subtract(by.subtract(ay).multiply(cx.subtract(ax)));
  };

  TrianglePredicate.triAreaDDFast = function (a, b, c) {
    var t1 = DD.valueOf(b.x).selfSubtract(a.x).selfMultiply(DD.valueOf(c.y).selfSubtract(a.y));
    var t2 = DD.valueOf(b.y).selfSubtract(a.y).selfMultiply(DD.valueOf(c.x).selfSubtract(a.x));
    return t1.selfSubtract(t2);
  };

  function Vertex() {
    this._p = null;

    if (arguments.length === 1) {
      var _p = arguments[0];
      this._p = new Coordinate(_p);
    } else if (arguments.length === 2) {
      var _x = arguments[0],
          _y = arguments[1];
      this._p = new Coordinate(_x, _y);
    } else if (arguments.length === 3) {
      var _x2 = arguments[0],
          _y2 = arguments[1],
          _z = arguments[2];
      this._p = new Coordinate(_x2, _y2, _z);
    }
  }
  extend(Vertex.prototype, {
    circleCenter: function circleCenter(b, c) {
      var a = new Vertex(this.getX(), this.getY());
      var cab = this.bisector(a, b);
      var cbc = this.bisector(b, c);
      var hcc = new HCoordinate(cab, cbc);
      var cc = null;

      try {
        cc = new Vertex(hcc.getX(), hcc.getY());
      } catch (nre) {
        if (nre instanceof NotRepresentableException) {
          System.err.println("a: " + a + "  b: " + b + "  c: " + c);
          System.err.println(nre);
        } else throw nre;
      } finally {}

      return cc;
    },
    dot: function dot(v) {
      return this._p.x * v.getX() + this._p.y * v.getY();
    },
    magn: function magn() {
      return Math.sqrt(this._p.x * this._p.x + this._p.y * this._p.y);
    },
    getZ: function getZ() {
      return this._p.z;
    },
    bisector: function bisector(a, b) {
      var dx = b.getX() - a.getX();
      var dy = b.getY() - a.getY();
      var l1 = new HCoordinate(a.getX() + dx / 2.0, a.getY() + dy / 2.0, 1.0);
      var l2 = new HCoordinate(a.getX() - dy + dx / 2.0, a.getY() + dx + dy / 2.0, 1.0);
      return new HCoordinate(l1, l2);
    },
    equals: function equals() {
      if (arguments.length === 1) {
        var _x = arguments[0];

        if (this._p.x === _x.getX() && this._p.y === _x.getY()) {
          return true;
        } else {
          return false;
        }
      } else if (arguments.length === 2) {
        var _x3 = arguments[0],
            tolerance = arguments[1];

        if (this._p.distance(_x3.getCoordinate()) < tolerance) {
          return true;
        } else {
          return false;
        }
      }
    },
    getCoordinate: function getCoordinate() {
      return this._p;
    },
    isInCircle: function isInCircle(a, b, c) {
      return TrianglePredicate.isInCircleRobust(a._p, b._p, c._p, this._p);
    },
    interpolateZValue: function interpolateZValue(v0, v1, v2) {
      var x0 = v0.getX();
      var y0 = v0.getY();
      var a = v1.getX() - x0;
      var b = v2.getX() - x0;
      var c = v1.getY() - y0;
      var d = v2.getY() - y0;
      var det = a * d - b * c;
      var dx = this.getX() - x0;
      var dy = this.getY() - y0;
      var t = (d * dx - b * dy) / det;
      var u = (-c * dx + a * dy) / det;
      var z = v0.getZ() + t * (v1.getZ() - v0.getZ()) + u * (v2.getZ() - v0.getZ());
      return z;
    },
    midPoint: function midPoint(a) {
      var xm = (this._p.x + a.getX()) / 2.0;
      var ym = (this._p.y + a.getY()) / 2.0;
      var zm = (this._p.z + a.getZ()) / 2.0;
      return new Vertex(xm, ym, zm);
    },
    rightOf: function rightOf(e) {
      return this.isCCW(e.dest(), e.orig());
    },
    isCCW: function isCCW(b, c) {
      return (b._p.x - this._p.x) * (c._p.y - this._p.y) - (b._p.y - this._p.y) * (c._p.x - this._p.x) > 0;
    },
    getX: function getX() {
      return this._p.x;
    },
    crossProduct: function crossProduct(v) {
      return this._p.x * v.getY() - this._p.y * v.getX();
    },
    setZ: function setZ(_z) {
      this._p.z = _z;
    },
    times: function times(c) {
      return new Vertex(c * this._p.x, c * this._p.y);
    },
    cross: function cross() {
      return new Vertex(this._p.y, -this._p.x);
    },
    leftOf: function leftOf(e) {
      return this.isCCW(e.orig(), e.dest());
    },
    toString: function toString() {
      return "POINT (" + this._p.x + " " + this._p.y + ")";
    },
    sub: function sub(v) {
      return new Vertex(this._p.x - v.getX(), this._p.y - v.getY());
    },
    getY: function getY() {
      return this._p.y;
    },
    classify: function classify(p0, p1) {
      var p2 = this;
      var a = p1.sub(p0);
      var b = p2.sub(p0);
      var sa = a.crossProduct(b);
      if (sa > 0.0) return Vertex.LEFT;
      if (sa < 0.0) return Vertex.RIGHT;
      if (a.getX() * b.getX() < 0.0 || a.getY() * b.getY() < 0.0) return Vertex.BEHIND;
      if (a.magn() < b.magn()) return Vertex.BEYOND;
      if (p0.equals(p2)) return Vertex.ORIGIN;
      if (p1.equals(p2)) return Vertex.DESTINATION;
      return Vertex.BETWEEN;
    },
    sum: function sum(v) {
      return new Vertex(this._p.x + v.getX(), this._p.y + v.getY());
    },
    distance: function distance(v1, v2) {
      return Math.sqrt(Math.pow(v2.getX() - v1.getX(), 2.0) + Math.pow(v2.getY() - v1.getY(), 2.0));
    },
    circumRadiusRatio: function circumRadiusRatio(b, c) {
      var x = this.circleCenter(b, c);
      var radius = this.distance(x, b);
      var edgeLength = this.distance(this, b);
      var el = this.distance(b, c);

      if (el < edgeLength) {
        edgeLength = el;
      }

      el = this.distance(c, this);

      if (el < edgeLength) {
        edgeLength = el;
      }

      return radius / edgeLength;
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return Vertex;
    }
  });

  Vertex.interpolateZ = function () {
    if (arguments.length === 3) {
      var p = arguments[0],
          p0 = arguments[1],
          p1 = arguments[2];
      var segLen = p0.distance(p1);
      var ptLen = p.distance(p0);
      var dz = p1.z - p0.z;
      var pz = p0.z + dz * (ptLen / segLen);
      return pz;
    } else if (arguments.length === 4) {
      var _p2 = arguments[0],
          v0 = arguments[1],
          v1 = arguments[2],
          v2 = arguments[3];
      var x0 = v0.x;
      var y0 = v0.y;
      var a = v1.x - x0;
      var b = v2.x - x0;
      var c = v1.y - y0;
      var d = v2.y - y0;
      var det = a * d - b * c;
      var dx = _p2.x - x0;
      var dy = _p2.y - y0;
      var t = (d * dx - b * dy) / det;
      var u = (-c * dx + a * dy) / det;
      var z = v0.z + t * (v1.z - v0.z) + u * (v2.z - v0.z);
      return z;
    }
  };

  Vertex.LEFT = 0;
  Vertex.RIGHT = 1;
  Vertex.BEYOND = 2;
  Vertex.BEHIND = 3;
  Vertex.BETWEEN = 4;
  Vertex.ORIGIN = 5;
  Vertex.DESTINATION = 6;

  function ConstraintVertex() {
    this._isOnConstraint = null;
    this._constraint = null;
    var p = arguments[0];
    Vertex.call(this, p);
  }
  inherits(ConstraintVertex, Vertex);
  extend(ConstraintVertex.prototype, {
    getConstraint: function getConstraint() {
      return this._constraint;
    },
    setOnConstraint: function setOnConstraint(isOnConstraint) {
      this._isOnConstraint = isOnConstraint;
    },
    merge: function merge(other) {
      if (other._isOnConstraint) {
        this._isOnConstraint = true;
        this._constraint = other._constraint;
      }
    },
    isOnConstraint: function isOnConstraint() {
      return this._isOnConstraint;
    },
    setConstraint: function setConstraint(constraint) {
      this._isOnConstraint = true;
      this._constraint = constraint;
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return ConstraintVertex;
    }
  });

  function QuadEdge() {
    this._rot = null;
    this._vertex = null;
    this._next = null;
    this._data = null;
  }
  extend(QuadEdge.prototype, {
    equalsNonOriented: function equalsNonOriented(qe) {
      if (this.equalsOriented(qe)) return true;
      if (this.equalsOriented(qe.sym())) return true;
      return false;
    },
    toLineSegment: function toLineSegment() {
      return new LineSegment(this._vertex.getCoordinate(), this.dest().getCoordinate());
    },
    dest: function dest() {
      return this.sym().orig();
    },
    oNext: function oNext() {
      return this._next;
    },
    equalsOriented: function equalsOriented(qe) {
      if (this.orig().getCoordinate().equals2D(qe.orig().getCoordinate()) && this.dest().getCoordinate().equals2D(qe.dest().getCoordinate())) return true;
      return false;
    },
    dNext: function dNext() {
      return this.sym().oNext().sym();
    },
    lPrev: function lPrev() {
      return this._next.sym();
    },
    rPrev: function rPrev() {
      return this.sym().oNext();
    },
    rot: function rot() {
      return this._rot;
    },
    oPrev: function oPrev() {
      return this._rot._next._rot;
    },
    sym: function sym() {
      return this._rot._rot;
    },
    setOrig: function setOrig(o) {
      this._vertex = o;
    },
    lNext: function lNext() {
      return this.invRot().oNext().rot();
    },
    getLength: function getLength() {
      return this.orig().getCoordinate().distance(this.dest().getCoordinate());
    },
    invRot: function invRot() {
      return this._rot.sym();
    },
    setDest: function setDest(d) {
      this.sym().setOrig(d);
    },
    setData: function setData(data) {
      this._data = data;
    },
    getData: function getData() {
      return this._data;
    },
    delete: function _delete() {
      this._rot = null;
    },
    orig: function orig() {
      return this._vertex;
    },
    rNext: function rNext() {
      return this._rot._next.invRot();
    },
    toString: function toString() {
      var p0 = this._vertex.getCoordinate();

      var p1 = this.dest().getCoordinate();
      return WKTWriter.toLineString(p0, p1);
    },
    isLive: function isLive() {
      return this._rot !== null;
    },
    getPrimary: function getPrimary() {
      if (this.orig().getCoordinate().compareTo(this.dest().getCoordinate()) <= 0) return this;else return this.sym();
    },
    dPrev: function dPrev() {
      return this.invRot().oNext().invRot();
    },
    setNext: function setNext(next) {
      this._next = next;
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return QuadEdge;
    }
  });

  QuadEdge.makeEdge = function (o, d) {
    var q0 = new QuadEdge();
    var q1 = new QuadEdge();
    var q2 = new QuadEdge();
    var q3 = new QuadEdge();
    q0._rot = q1;
    q1._rot = q2;
    q2._rot = q3;
    q3._rot = q0;
    q0.setNext(q0);
    q1.setNext(q3);
    q2.setNext(q2);
    q3.setNext(q1);
    var base = q0;
    base.setOrig(o);
    base.setDest(d);
    return base;
  };

  QuadEdge.swap = function (e) {
    var a = e.oPrev();
    var b = e.sym().oPrev();
    QuadEdge.splice(e, a);
    QuadEdge.splice(e.sym(), b);
    QuadEdge.splice(e, a.lNext());
    QuadEdge.splice(e.sym(), b.lNext());
    e.setOrig(a.dest());
    e.setDest(b.dest());
  };

  QuadEdge.splice = function (a, b) {
    var alpha = a.oNext().rot();
    var beta = b.oNext().rot();
    var t1 = b.oNext();
    var t2 = a.oNext();
    var t3 = beta.oNext();
    var t4 = alpha.oNext();
    a.setNext(t1);
    b.setNext(t2);
    alpha.setNext(t3);
    beta.setNext(t4);
  };

  QuadEdge.connect = function (a, b) {
    var e = QuadEdge.makeEdge(a.dest(), b.orig());
    QuadEdge.splice(e, a.lNext());
    QuadEdge.splice(e.sym(), b);
    return e;
  };

  function IncrementalDelaunayTriangulator() {
    this._subdiv = null;
    this._isUsingTolerance = false;
    var subdiv = arguments[0];
    this._subdiv = subdiv;
    this._isUsingTolerance = subdiv.getTolerance() > 0.0;
  }
  extend(IncrementalDelaunayTriangulator.prototype, {
    insertSite: function insertSite(v) {
      var e = this._subdiv.locate(v);

      if (this._subdiv.isVertexOfEdge(e, v)) {
        return e;
      } else if (this._subdiv.isOnEdge(e, v.getCoordinate())) {
        e = e.oPrev();

        this._subdiv.delete(e.oNext());
      }

      var base = this._subdiv.makeEdge(e.orig(), v);

      QuadEdge.splice(base, e);
      var startEdge = base;

      do {
        base = this._subdiv.connect(e, base.sym());
        e = base.oPrev();
      } while (e.lNext() !== startEdge);

      do {
        var t = e.oPrev();

        if (t.dest().rightOf(e) && v.isInCircle(e.orig(), t.dest(), e.dest())) {
          QuadEdge.swap(e);
          e = e.oPrev();
        } else if (e.oNext() === startEdge) {
          return base;
        } else {
          e = e.oNext().lPrev();
        }
      } while (true);
    },
    insertSites: function insertSites(vertices) {
      for (var i = vertices.iterator(); i.hasNext();) {
        var v = i.next();
        this.insertSite(v);
      }
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return IncrementalDelaunayTriangulator;
    }
  });

  function QuadEdgeLocator() {}
  extend(QuadEdgeLocator.prototype, {
    locate: function locate(v) {},
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return QuadEdgeLocator;
    }
  });

  function LastFoundQuadEdgeLocator() {
    this._subdiv = null;
    this._lastEdge = null;
    var subdiv = arguments[0];
    this._subdiv = subdiv;
    this.init();
  }
  extend(LastFoundQuadEdgeLocator.prototype, {
    init: function init() {
      this._lastEdge = this.findEdge();
    },
    locate: function locate(v) {
      if (!this._lastEdge.isLive()) {
        this.init();
      }

      var e = this._subdiv.locateFromEdge(v, this._lastEdge);

      this._lastEdge = e;
      return e;
    },
    findEdge: function findEdge() {
      var edges = this._subdiv.getEdges();

      return edges.iterator().next();
    },
    interfaces_: function interfaces_() {
      return [QuadEdgeLocator];
    },
    getClass: function getClass() {
      return LastFoundQuadEdgeLocator;
    }
  });

  function LocateFailureException() {
    this._seg = null;

    if (arguments.length === 1) {
      if (typeof arguments[0] === "string") {
        var msg = arguments[0];
        RuntimeException.call(this, msg);
      } else if (arguments[0] instanceof LineSegment) {
        var seg = arguments[0];
        RuntimeException.call(this, "Locate failed to converge (at edge: " + seg + ").  Possible causes include invalid Subdivision topology or very close sites");
        this._seg = new LineSegment(seg);
      }
    } else if (arguments.length === 2) {
      var _msg = arguments[0],
          _seg = arguments[1];
      RuntimeException.call(this, LocateFailureException.msgWithSpatial(_msg, _seg));
      this._seg = new LineSegment(_seg);
    }
  }
  inherits(LocateFailureException, RuntimeException);
  extend(LocateFailureException.prototype, {
    getSegment: function getSegment() {
      return this._seg;
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return LocateFailureException;
    }
  });

  LocateFailureException.msgWithSpatial = function (msg, seg) {
    if (seg !== null) return msg + " [ " + seg + " ]";
    return msg;
  };

  function TriangleVisitor() {}
  extend(TriangleVisitor.prototype, {
    visit: function visit(triEdges) {},
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return TriangleVisitor;
    }
  });

  function QuadEdgeSubdivision() {
    this._visitedKey = 0;
    this._quadEdges = new ArrayList();
    this._startingEdge = null;
    this._tolerance = null;
    this._edgeCoincidenceTolerance = null;
    this._frameVertex = new Array(3).fill(null);
    this._frameEnv = null;
    this._locator = null;
    this._seg = new LineSegment();
    this._triEdges = new Array(3).fill(null);
    var env = arguments[0],
        tolerance = arguments[1];
    this._tolerance = tolerance;
    this._edgeCoincidenceTolerance = tolerance / QuadEdgeSubdivision.EDGE_COINCIDENCE_TOL_FACTOR;
    this.createFrame(env);
    this._startingEdge = this.initSubdiv();
    this._locator = new LastFoundQuadEdgeLocator(this);
  }
  extend(QuadEdgeSubdivision.prototype, {
    getTriangleVertices: function getTriangleVertices(includeFrame) {
      var visitor = new TriangleVertexListVisitor();
      this.visitTriangles(visitor, includeFrame);
      return visitor.getTriangleVertices();
    },
    isFrameVertex: function isFrameVertex(v) {
      if (v.equals(this._frameVertex[0])) return true;
      if (v.equals(this._frameVertex[1])) return true;
      if (v.equals(this._frameVertex[2])) return true;
      return false;
    },
    isVertexOfEdge: function isVertexOfEdge(e, v) {
      if (v.equals(e.orig(), this._tolerance) || v.equals(e.dest(), this._tolerance)) {
        return true;
      }

      return false;
    },
    connect: function connect(a, b) {
      var q = QuadEdge.connect(a, b);

      this._quadEdges.add(q);

      return q;
    },
    getVoronoiCellPolygon: function getVoronoiCellPolygon(qe, geomFact) {
      var cellPts = new ArrayList();
      var startQE = qe;

      do {
        var cc = qe.rot().orig().getCoordinate();
        cellPts.add(cc);
        qe = qe.oPrev();
      } while (qe !== startQE);

      var coordList = new CoordinateList();
      coordList.addAll(cellPts, false);
      coordList.closeRing();

      if (coordList.size() < 4) {
        System.out.println(coordList);
        coordList.add(coordList.get(coordList.size() - 1), true);
      }

      var pts = coordList.toCoordinateArray();
      var cellPoly = geomFact.createPolygon(geomFact.createLinearRing(pts));
      var v = startQE.orig();
      cellPoly.setUserData(v.getCoordinate());
      return cellPoly;
    },
    setLocator: function setLocator(locator) {
      this._locator = locator;
    },
    initSubdiv: function initSubdiv() {
      var ea = this.makeEdge(this._frameVertex[0], this._frameVertex[1]);
      var eb = this.makeEdge(this._frameVertex[1], this._frameVertex[2]);
      QuadEdge.splice(ea.sym(), eb);
      var ec = this.makeEdge(this._frameVertex[2], this._frameVertex[0]);
      QuadEdge.splice(eb.sym(), ec);
      QuadEdge.splice(ec.sym(), ea);
      return ea;
    },
    isFrameBorderEdge: function isFrameBorderEdge(e) {
      var leftTri = new Array(3).fill(null);
      QuadEdgeSubdivision.getTriangleEdges(e, leftTri);
      var rightTri = new Array(3).fill(null);
      QuadEdgeSubdivision.getTriangleEdges(e.sym(), rightTri);
      var vLeftTriOther = e.lNext().dest();
      if (this.isFrameVertex(vLeftTriOther)) return true;
      var vRightTriOther = e.sym().lNext().dest();
      if (this.isFrameVertex(vRightTriOther)) return true;
      return false;
    },
    makeEdge: function makeEdge(o, d) {
      var q = QuadEdge.makeEdge(o, d);

      this._quadEdges.add(q);

      return q;
    },
    visitTriangles: function visitTriangles(triVisitor, includeFrame) {
      this._visitedKey++;
      var edgeStack = new Stack();
      edgeStack.push(this._startingEdge);
      var visitedEdges = new HashSet();

      while (!edgeStack.empty()) {
        var edge = edgeStack.pop();

        if (!visitedEdges.contains(edge)) {
          var triEdges = this.fetchTriangleToVisit(edge, edgeStack, includeFrame, visitedEdges);
          if (triEdges !== null) triVisitor.visit(triEdges);
        }
      }
    },
    isFrameEdge: function isFrameEdge(e) {
      if (this.isFrameVertex(e.orig()) || this.isFrameVertex(e.dest())) return true;
      return false;
    },
    isOnEdge: function isOnEdge(e, p) {
      this._seg.setCoordinates(e.orig().getCoordinate(), e.dest().getCoordinate());

      var dist = this._seg.distance(p);

      return dist < this._edgeCoincidenceTolerance;
    },
    getEnvelope: function getEnvelope() {
      return new Envelope(this._frameEnv);
    },
    createFrame: function createFrame(env) {
      var deltaX = env.getWidth();
      var deltaY = env.getHeight();
      var offset = 0.0;

      if (deltaX > deltaY) {
        offset = deltaX * 10.0;
      } else {
        offset = deltaY * 10.0;
      }

      this._frameVertex[0] = new Vertex((env.getMaxX() + env.getMinX()) / 2.0, env.getMaxY() + offset);
      this._frameVertex[1] = new Vertex(env.getMinX() - offset, env.getMinY() - offset);
      this._frameVertex[2] = new Vertex(env.getMaxX() + offset, env.getMinY() - offset);
      this._frameEnv = new Envelope(this._frameVertex[0].getCoordinate(), this._frameVertex[1].getCoordinate());

      this._frameEnv.expandToInclude(this._frameVertex[2].getCoordinate());
    },
    getTriangleCoordinates: function getTriangleCoordinates(includeFrame) {
      var visitor = new TriangleCoordinatesVisitor();
      this.visitTriangles(visitor, includeFrame);
      return visitor.getTriangles();
    },
    getVertices: function getVertices(includeFrame) {
      var vertices = new HashSet();

      for (var i = this._quadEdges.iterator(); i.hasNext();) {
        var qe = i.next();
        var v = qe.orig();
        if (includeFrame || !this.isFrameVertex(v)) vertices.add(v);
        var vd = qe.dest();
        if (includeFrame || !this.isFrameVertex(vd)) vertices.add(vd);
      }

      return vertices;
    },
    fetchTriangleToVisit: function fetchTriangleToVisit(edge, edgeStack, includeFrame, visitedEdges) {
      var curr = edge;
      var edgeCount = 0;
      var isFrame = false;

      do {
        this._triEdges[edgeCount] = curr;
        if (this.isFrameEdge(curr)) isFrame = true;
        var sym = curr.sym();
        if (!visitedEdges.contains(sym)) edgeStack.push(sym);
        visitedEdges.add(curr);
        edgeCount++;
        curr = curr.lNext();
      } while (curr !== edge);

      if (isFrame && !includeFrame) return null;
      return this._triEdges;
    },
    getEdges: function getEdges() {
      if (arguments.length === 0) {
        return this._quadEdges;
      } else if (arguments.length === 1) {
        var geomFact = arguments[0];
        var quadEdges = this.getPrimaryEdges(false);
        var edges = new Array(quadEdges.size()).fill(null);
        var i = 0;

        for (var it = quadEdges.iterator(); it.hasNext();) {
          var qe = it.next();
          edges[i++] = geomFact.createLineString([qe.orig().getCoordinate(), qe.dest().getCoordinate()]);
        }

        return geomFact.createMultiLineString(edges);
      }
    },
    getVertexUniqueEdges: function getVertexUniqueEdges(includeFrame) {
      var edges = new ArrayList();
      var visitedVertices = new HashSet();

      for (var i = this._quadEdges.iterator(); i.hasNext();) {
        var qe = i.next();
        var v = qe.orig();

        if (!visitedVertices.contains(v)) {
          visitedVertices.add(v);

          if (includeFrame || !this.isFrameVertex(v)) {
            edges.add(qe);
          }
        }

        var qd = qe.sym();
        var vd = qd.orig();

        if (!visitedVertices.contains(vd)) {
          visitedVertices.add(vd);

          if (includeFrame || !this.isFrameVertex(vd)) {
            edges.add(qd);
          }
        }
      }

      return edges;
    },
    getTriangleEdges: function getTriangleEdges(includeFrame) {
      var visitor = new TriangleEdgesListVisitor();
      this.visitTriangles(visitor, includeFrame);
      return visitor.getTriangleEdges();
    },
    getPrimaryEdges: function getPrimaryEdges(includeFrame) {
      this._visitedKey++;
      var edges = new ArrayList();
      var edgeStack = new Stack();
      edgeStack.push(this._startingEdge);
      var visitedEdges = new HashSet();

      while (!edgeStack.empty()) {
        var edge = edgeStack.pop();

        if (!visitedEdges.contains(edge)) {
          var priQE = edge.getPrimary();
          if (includeFrame || !this.isFrameEdge(priQE)) edges.add(priQE);
          edgeStack.push(edge.oNext());
          edgeStack.push(edge.sym().oNext());
          visitedEdges.add(edge);
          visitedEdges.add(edge.sym());
        }
      }

      return edges;
    },
    delete: function _delete(e) {
      QuadEdge.splice(e, e.oPrev());
      QuadEdge.splice(e.sym(), e.sym().oPrev());
      var eSym = e.sym();
      var eRot = e.rot();
      var eRotSym = e.rot().sym();

      this._quadEdges.remove(e);

      this._quadEdges.remove(eSym);

      this._quadEdges.remove(eRot);

      this._quadEdges.remove(eRotSym);

      e.delete();
      eSym.delete();
      eRot.delete();
      eRotSym.delete();
    },
    locateFromEdge: function locateFromEdge(v, startEdge) {
      var iter = 0;

      var maxIter = this._quadEdges.size();

      var e = startEdge;

      while (true) {
        iter++;

        if (iter > maxIter) {
          throw new LocateFailureException(e.toLineSegment());
        }

        if (v.equals(e.orig()) || v.equals(e.dest())) {
          break;
        } else if (v.rightOf(e)) {
          e = e.sym();
        } else if (!v.rightOf(e.oNext())) {
          e = e.oNext();
        } else if (!v.rightOf(e.dPrev())) {
          e = e.dPrev();
        } else {
          break;
        }
      }

      return e;
    },
    getTolerance: function getTolerance() {
      return this._tolerance;
    },
    getVoronoiCellPolygons: function getVoronoiCellPolygons(geomFact) {
      this.visitTriangles(new TriangleCircumcentreVisitor(), true);
      var cells = new ArrayList();
      var edges = this.getVertexUniqueEdges(false);

      for (var i = edges.iterator(); i.hasNext();) {
        var qe = i.next();
        cells.add(this.getVoronoiCellPolygon(qe, geomFact));
      }

      return cells;
    },
    getVoronoiDiagram: function getVoronoiDiagram(geomFact) {
      var vorCells = this.getVoronoiCellPolygons(geomFact);
      return geomFact.createGeometryCollection(GeometryFactory.toGeometryArray(vorCells));
    },
    getTriangles: function getTriangles(geomFact) {
      var triPtsList = this.getTriangleCoordinates(false);
      var tris = new Array(triPtsList.size()).fill(null);
      var i = 0;

      for (var it = triPtsList.iterator(); it.hasNext();) {
        var triPt = it.next();
        tris[i++] = geomFact.createPolygon(geomFact.createLinearRing(triPt));
      }

      return geomFact.createGeometryCollection(tris);
    },
    insertSite: function insertSite(v) {
      var e = this.locate(v);

      if (v.equals(e.orig(), this._tolerance) || v.equals(e.dest(), this._tolerance)) {
        return e;
      }

      var base = this.makeEdge(e.orig(), v);
      QuadEdge.splice(base, e);
      var startEdge = base;

      do {
        base = this.connect(e, base.sym());
        e = base.oPrev();
      } while (e.lNext() !== startEdge);

      return startEdge;
    },
    locate: function locate() {
      if (arguments.length === 1) {
        if (arguments[0] instanceof Vertex) {
          var v = arguments[0];
          return this._locator.locate(v);
        } else if (arguments[0] instanceof Coordinate) {
          var p = arguments[0];
          return this._locator.locate(new Vertex(p));
        }
      } else if (arguments.length === 2) {
        var p0 = arguments[0],
            p1 = arguments[1];

        var e = this._locator.locate(new Vertex(p0));

        if (e === null) return null;
        var base = e;
        if (e.dest().getCoordinate().equals2D(p0)) base = e.sym();
        var locEdge = base;

        do {
          if (locEdge.dest().getCoordinate().equals2D(p1)) return locEdge;
          locEdge = locEdge.oNext();
        } while (locEdge !== base);

        return null;
      }
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return QuadEdgeSubdivision;
    }
  });

  QuadEdgeSubdivision.getTriangleEdges = function (startQE, triEdge) {
    triEdge[0] = startQE;
    triEdge[1] = triEdge[0].lNext();
    triEdge[2] = triEdge[1].lNext();
    if (triEdge[2].lNext() !== triEdge[0]) throw new IllegalArgumentException("Edges do not form a triangle");
  };

  function TriangleCircumcentreVisitor() {}

  extend(TriangleCircumcentreVisitor.prototype, {
    visit: function visit(triEdges) {
      var a = triEdges[0].orig().getCoordinate();
      var b = triEdges[1].orig().getCoordinate();
      var c = triEdges[2].orig().getCoordinate();
      var cc = Triangle.circumcentre(a, b, c);
      var ccVertex = new Vertex(cc);

      for (var i = 0; i < 3; i++) {
        triEdges[i].rot().setOrig(ccVertex);
      }
    },
    interfaces_: function interfaces_() {
      return [TriangleVisitor];
    },
    getClass: function getClass() {
      return TriangleCircumcentreVisitor;
    }
  });

  function TriangleEdgesListVisitor() {
    this._triList = new ArrayList();
  }

  extend(TriangleEdgesListVisitor.prototype, {
    getTriangleEdges: function getTriangleEdges() {
      return this._triList;
    },
    visit: function visit(triEdges) {
      this._triList.add(triEdges);
    },
    interfaces_: function interfaces_() {
      return [TriangleVisitor];
    },
    getClass: function getClass() {
      return TriangleEdgesListVisitor;
    }
  });

  function TriangleVertexListVisitor() {
    this._triList = new ArrayList();
  }

  extend(TriangleVertexListVisitor.prototype, {
    visit: function visit(triEdges) {
      this._triList.add([triEdges[0].orig(), triEdges[1].orig(), triEdges[2].orig()]);
    },
    getTriangleVertices: function getTriangleVertices() {
      return this._triList;
    },
    interfaces_: function interfaces_() {
      return [TriangleVisitor];
    },
    getClass: function getClass() {
      return TriangleVertexListVisitor;
    }
  });

  function TriangleCoordinatesVisitor() {
    this._coordList = new CoordinateList();
    this._triCoords = new ArrayList();
  }

  extend(TriangleCoordinatesVisitor.prototype, {
    checkTriangleSize: function checkTriangleSize(pts) {
      var loc = "";
      if (pts.length >= 2) loc = WKTWriter.toLineString(pts[0], pts[1]);else {
        if (pts.length >= 1) loc = WKTWriter.toPoint(pts[0]);
      }
    },
    visit: function visit(triEdges) {
      this._coordList.clear();

      for (var i = 0; i < 3; i++) {
        var v = triEdges[i].orig();

        this._coordList.add(v.getCoordinate());
      }

      if (this._coordList.size() > 0) {
        this._coordList.closeRing();

        var pts = this._coordList.toCoordinateArray();

        if (pts.length !== 4) {
          return null;
        }

        this._triCoords.add(pts);
      }
    },
    getTriangles: function getTriangles() {
      return this._triCoords;
    },
    interfaces_: function interfaces_() {
      return [TriangleVisitor];
    },
    getClass: function getClass() {
      return TriangleCoordinatesVisitor;
    }
  });
  QuadEdgeSubdivision.TriangleCircumcentreVisitor = TriangleCircumcentreVisitor;
  QuadEdgeSubdivision.TriangleEdgesListVisitor = TriangleEdgesListVisitor;
  QuadEdgeSubdivision.TriangleVertexListVisitor = TriangleVertexListVisitor;
  QuadEdgeSubdivision.TriangleCoordinatesVisitor = TriangleCoordinatesVisitor;
  QuadEdgeSubdivision.EDGE_COINCIDENCE_TOL_FACTOR = 1000;

  function Segment() {
    this._ls = null;
    this._data = null;

    if (arguments.length === 2) {
      var p0 = arguments[0],
          p1 = arguments[1];
      this._ls = new LineSegment(p0, p1);
    } else if (arguments.length === 3) {
      var _p = arguments[0],
          _p2 = arguments[1],
          data = arguments[2];
      this._ls = new LineSegment(_p, _p2);
      this._data = data;
    } else if (arguments.length === 6) {
      var x1 = arguments[0],
          y1 = arguments[1],
          z1 = arguments[2],
          x2 = arguments[3],
          y2 = arguments[4],
          z2 = arguments[5];
      Segment.call(this, new Coordinate(x1, y1, z1), new Coordinate(x2, y2, z2));
    } else if (arguments.length === 7) {
      var _x = arguments[0],
          _y = arguments[1],
          _z = arguments[2],
          _x2 = arguments[3],
          _y2 = arguments[4],
          _z2 = arguments[5],
          _data = arguments[6];
      Segment.call(this, new Coordinate(_x, _y, _z), new Coordinate(_x2, _y2, _z2), _data);
    }
  }
  extend(Segment.prototype, {
    getLineSegment: function getLineSegment() {
      return this._ls;
    },
    getEndZ: function getEndZ() {
      var p = this._ls.getCoordinate(1);

      return p.z;
    },
    getStartZ: function getStartZ() {
      var p = this._ls.getCoordinate(0);

      return p.z;
    },
    intersection: function intersection(s) {
      return this._ls.intersection(s.getLineSegment());
    },
    getStart: function getStart() {
      return this._ls.getCoordinate(0);
    },
    getEnd: function getEnd() {
      return this._ls.getCoordinate(1);
    },
    getEndY: function getEndY() {
      var p = this._ls.getCoordinate(1);

      return p.y;
    },
    getStartX: function getStartX() {
      var p = this._ls.getCoordinate(0);

      return p.x;
    },
    equalsTopo: function equalsTopo(s) {
      return this._ls.equalsTopo(s.getLineSegment());
    },
    getStartY: function getStartY() {
      var p = this._ls.getCoordinate(0);

      return p.y;
    },
    setData: function setData(data) {
      this._data = data;
    },
    getData: function getData() {
      return this._data;
    },
    getEndX: function getEndX() {
      var p = this._ls.getCoordinate(1);

      return p.x;
    },
    toString: function toString() {
      return this._ls.toString();
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return Segment;
    }
  });

  function ConformingDelaunayTriangulator() {
    this._initialVertices = null;
    this._segVertices = null;
    this._segments = new ArrayList();
    this._subdiv = null;
    this._incDel = null;
    this._convexHull = null;
    this._splitFinder = new NonEncroachingSplitPointFinder();
    this._kdt = null;
    this._vertexFactory = null;
    this._computeAreaEnv = null;
    this._splitPt = null;
    this._tolerance = null;
    var initialVertices = arguments[0],
        tolerance = arguments[1];
    this._initialVertices = new ArrayList(initialVertices);
    this._tolerance = tolerance;
    this._kdt = new KdTree(tolerance);
  }
  extend(ConformingDelaunayTriangulator.prototype, {
    getInitialVertices: function getInitialVertices() {
      return this._initialVertices;
    },
    getKDT: function getKDT() {
      return this._kdt;
    },
    enforceConstraints: function enforceConstraints() {
      this.addConstraintVertices();
      var count = 0;
      var splits = 0;

      do {
        splits = this.enforceGabriel(this._segments);
        count++;
      } while (splits > 0 && count < ConformingDelaunayTriangulator.MAX_SPLIT_ITER);
    },
    insertSites: function insertSites(vertices) {
      for (var i = vertices.iterator(); i.hasNext();) {
        var v = i.next();
        this.insertSite(v);
      }
    },
    getVertexFactory: function getVertexFactory() {
      return this._vertexFactory;
    },
    getPointArray: function getPointArray() {
      var pts = new Array(this._initialVertices.size() + this._segVertices.size()).fill(null);
      var index = 0;

      for (var i = this._initialVertices.iterator(); i.hasNext();) {
        var v = i.next();
        pts[index++] = v.getCoordinate();
      }

      for (var i2 = this._segVertices.iterator(); i2.hasNext();) {
        var v = i2.next();
        pts[index++] = v.getCoordinate();
      }

      return pts;
    },
    setConstraints: function setConstraints(segments, segVertices) {
      this._segments = segments;
      this._segVertices = segVertices;
    },
    computeConvexHull: function computeConvexHull() {
      var fact = new GeometryFactory();
      var coords = this.getPointArray();
      var hull = new ConvexHull(coords, fact);
      this._convexHull = hull.getConvexHull();
    },
    addConstraintVertices: function addConstraintVertices() {
      this.computeConvexHull();
      this.insertSites(this._segVertices);
    },
    findNonGabrielPoint: function findNonGabrielPoint(seg) {
      var p = seg.getStart();
      var q = seg.getEnd();
      var midPt = new Coordinate((p.x + q.x) / 2.0, (p.y + q.y) / 2.0);
      var segRadius = p.distance(midPt);
      var env = new Envelope(midPt);
      env.expandBy(segRadius);

      var result = this._kdt.query(env);

      var closestNonGabriel = null;
      var minDist = Double.MAX_VALUE;

      for (var i = result.iterator(); i.hasNext();) {
        var nextNode = i.next();
        var testPt = nextNode.getCoordinate();
        if (testPt.equals2D(p) || testPt.equals2D(q)) continue;
        var testRadius = midPt.distance(testPt);

        if (testRadius < segRadius) {
          var testDist = testRadius;

          if (closestNonGabriel === null || testDist < minDist) {
            closestNonGabriel = testPt;
            minDist = testDist;
          }
        }
      }

      return closestNonGabriel;
    },
    getConstraintSegments: function getConstraintSegments() {
      return this._segments;
    },
    setSplitPointFinder: function setSplitPointFinder(splitFinder) {
      this._splitFinder = splitFinder;
    },
    getConvexHull: function getConvexHull() {
      return this._convexHull;
    },
    getTolerance: function getTolerance() {
      return this._tolerance;
    },
    enforceGabriel: function enforceGabriel(segsToInsert) {
      var newSegments = new ArrayList();
      var splits = 0;
      var segsToRemove = new ArrayList();

      for (var i = segsToInsert.iterator(); i.hasNext();) {
        var seg = i.next();
        var encroachPt = this.findNonGabrielPoint(seg);
        if (encroachPt === null) continue;
        this._splitPt = this._splitFinder.findSplitPoint(seg, encroachPt);
        var splitVertex = this.createVertex(this._splitPt, seg);
        var insertedVertex = this.insertSite(splitVertex);

        if (!insertedVertex.getCoordinate().equals2D(this._splitPt)) ;

        var s1 = new Segment(seg.getStartX(), seg.getStartY(), seg.getStartZ(), splitVertex.getX(), splitVertex.getY(), splitVertex.getZ(), seg.getData());
        var s2 = new Segment(splitVertex.getX(), splitVertex.getY(), splitVertex.getZ(), seg.getEndX(), seg.getEndY(), seg.getEndZ(), seg.getData());
        newSegments.add(s1);
        newSegments.add(s2);
        segsToRemove.add(seg);
        splits = splits + 1;
      }

      segsToInsert.removeAll(segsToRemove);
      segsToInsert.addAll(newSegments);
      return splits;
    },
    createVertex: function createVertex() {
      if (arguments.length === 1) {
        var p = arguments[0];
        var v = null;
        if (this._vertexFactory !== null) v = this._vertexFactory.createVertex(p, null);else v = new ConstraintVertex(p);
        return v;
      } else if (arguments.length === 2) {
        var _p = arguments[0],
            seg = arguments[1];
        var v = null;
        if (this._vertexFactory !== null) v = this._vertexFactory.createVertex(_p, seg);else v = new ConstraintVertex(_p);
        v.setOnConstraint(true);
        return v;
      }
    },
    getSubdivision: function getSubdivision() {
      return this._subdiv;
    },
    computeBoundingBox: function computeBoundingBox() {
      var vertexEnv = ConformingDelaunayTriangulator.computeVertexEnvelope(this._initialVertices);
      var segEnv = ConformingDelaunayTriangulator.computeVertexEnvelope(this._segVertices);
      var allPointsEnv = new Envelope(vertexEnv);
      allPointsEnv.expandToInclude(segEnv);
      var deltaX = allPointsEnv.getWidth() * 0.2;
      var deltaY = allPointsEnv.getHeight() * 0.2;
      var delta = Math.max(deltaX, deltaY);
      this._computeAreaEnv = new Envelope(allPointsEnv);

      this._computeAreaEnv.expandBy(delta);
    },
    setVertexFactory: function setVertexFactory(vertexFactory) {
      this._vertexFactory = vertexFactory;
    },
    formInitialDelaunay: function formInitialDelaunay() {
      this.computeBoundingBox();
      this._subdiv = new QuadEdgeSubdivision(this._computeAreaEnv, this._tolerance);

      this._subdiv.setLocator(new LastFoundQuadEdgeLocator(this._subdiv));

      this._incDel = new IncrementalDelaunayTriangulator(this._subdiv);
      this.insertSites(this._initialVertices);
    },
    insertSite: function insertSite() {
      if (arguments[0] instanceof ConstraintVertex) {
        var v = arguments[0];

        var kdnode = this._kdt.insert(v.getCoordinate(), v);

        if (!kdnode.isRepeated()) {
          this._incDel.insertSite(v);
        } else {
          var snappedV = kdnode.getData();
          snappedV.merge(v);
          return snappedV;
        }

        return v;
      } else if (arguments[0] instanceof Coordinate) {
        var p = arguments[0];
        this.insertSite(this.createVertex(p));
      }
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return ConformingDelaunayTriangulator;
    }
  });

  ConformingDelaunayTriangulator.computeVertexEnvelope = function (vertices) {
    var env = new Envelope();

    for (var i = vertices.iterator(); i.hasNext();) {
      var v = i.next();
      env.expandToInclude(v.getCoordinate());
    }

    return env;
  };

  ConformingDelaunayTriangulator.MAX_SPLIT_ITER = 99;

  function DelaunayTriangulationBuilder() {
    this._siteCoords = null;
    this._tolerance = 0.0;
    this._subdiv = null;
  }
  extend(DelaunayTriangulationBuilder.prototype, {
    create: function create() {
      if (this._subdiv !== null) return null;
      var siteEnv = DelaunayTriangulationBuilder.envelope(this._siteCoords);
      var vertices = DelaunayTriangulationBuilder.toVertices(this._siteCoords);
      this._subdiv = new QuadEdgeSubdivision(siteEnv, this._tolerance);
      var triangulator = new IncrementalDelaunayTriangulator(this._subdiv);
      triangulator.insertSites(vertices);
    },
    setTolerance: function setTolerance(tolerance) {
      this._tolerance = tolerance;
    },
    setSites: function setSites() {
      if (arguments[0] instanceof Geometry) {
        var geom = arguments[0];
        this._siteCoords = DelaunayTriangulationBuilder.extractUniqueCoordinates(geom);
      } else if (hasInterface(arguments[0], Collection)) {
        var coords = arguments[0];
        this._siteCoords = DelaunayTriangulationBuilder.unique(CoordinateArrays.toCoordinateArray(coords));
      }
    },
    getEdges: function getEdges(geomFact) {
      this.create();
      return this._subdiv.getEdges(geomFact);
    },
    getSubdivision: function getSubdivision() {
      this.create();
      return this._subdiv;
    },
    getTriangles: function getTriangles(geomFact) {
      this.create();
      return this._subdiv.getTriangles(geomFact);
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return DelaunayTriangulationBuilder;
    }
  });

  DelaunayTriangulationBuilder.extractUniqueCoordinates = function (geom) {
    if (geom === null) return new CoordinateList();
    var coords = geom.getCoordinates();
    return DelaunayTriangulationBuilder.unique(coords);
  };

  DelaunayTriangulationBuilder.envelope = function (coords) {
    var env = new Envelope();

    for (var i = coords.iterator(); i.hasNext();) {
      var coord = i.next();
      env.expandToInclude(coord);
    }

    return env;
  };

  DelaunayTriangulationBuilder.unique = function (coords) {
    var coordsCopy = CoordinateArrays.copyDeep(coords);
    Arrays.sort(coordsCopy);
    var coordList = new CoordinateList(coordsCopy, false);
    return coordList;
  };

  DelaunayTriangulationBuilder.toVertices = function (coords) {
    var verts = new ArrayList();

    for (var i = coords.iterator(); i.hasNext();) {
      var coord = i.next();
      verts.add(new Vertex(coord));
    }

    return verts;
  };

  function ConformingDelaunayTriangulationBuilder() {
    this._siteCoords = null;
    this._constraintLines = null;
    this._tolerance = 0.0;
    this._subdiv = null;
    this._constraintVertexMap = new TreeMap();
  }
  extend(ConformingDelaunayTriangulationBuilder.prototype, {
    createSiteVertices: function createSiteVertices(coords) {
      var verts = new ArrayList();

      for (var i = coords.iterator(); i.hasNext();) {
        var coord = i.next();
        if (this._constraintVertexMap.containsKey(coord)) continue;
        verts.add(new ConstraintVertex(coord));
      }

      return verts;
    },
    create: function create() {
      if (this._subdiv !== null) return null;
      var siteEnv = DelaunayTriangulationBuilder.envelope(this._siteCoords);
      var segments = new ArrayList();

      if (this._constraintLines !== null) {
        siteEnv.expandToInclude(this._constraintLines.getEnvelopeInternal());
        this.createVertices(this._constraintLines);
        segments = ConformingDelaunayTriangulationBuilder.createConstraintSegments(this._constraintLines);
      }

      var sites = this.createSiteVertices(this._siteCoords);
      var cdt = new ConformingDelaunayTriangulator(sites, this._tolerance);
      cdt.setConstraints(segments, new ArrayList(this._constraintVertexMap.values()));
      cdt.formInitialDelaunay();
      cdt.enforceConstraints();
      this._subdiv = cdt.getSubdivision();
    },
    setTolerance: function setTolerance(tolerance) {
      this._tolerance = tolerance;
    },
    setConstraints: function setConstraints(constraintLines) {
      this._constraintLines = constraintLines;
    },
    setSites: function setSites(geom) {
      this._siteCoords = DelaunayTriangulationBuilder.extractUniqueCoordinates(geom);
    },
    getEdges: function getEdges(geomFact) {
      this.create();
      return this._subdiv.getEdges(geomFact);
    },
    getSubdivision: function getSubdivision() {
      this.create();
      return this._subdiv;
    },
    getTriangles: function getTriangles(geomFact) {
      this.create();
      return this._subdiv.getTriangles(geomFact);
    },
    createVertices: function createVertices(geom) {
      var coords = geom.getCoordinates();

      for (var i = 0; i < coords.length; i++) {
        var v = new ConstraintVertex(coords[i]);

        this._constraintVertexMap.put(coords[i], v);
      }
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return ConformingDelaunayTriangulationBuilder;
    }
  });

  ConformingDelaunayTriangulationBuilder.createConstraintSegments = function () {
    if (arguments.length === 1) {
      var geom = arguments[0];
      var lines = LinearComponentExtracter.getLines(geom);
      var constraintSegs = new ArrayList();

      for (var i = lines.iterator(); i.hasNext();) {
        var line = i.next();
        ConformingDelaunayTriangulationBuilder.createConstraintSegments(line, constraintSegs);
      }

      return constraintSegs;
    } else if (arguments.length === 2) {
      var _line = arguments[0],
          _constraintSegs = arguments[1];

      var coords = _line.getCoordinates();

      for (var i = 1; i < coords.length; i++) {
        _constraintSegs.add(new Segment(coords[i - 1], coords[i]));
      }
    }
  };

  function VoronoiDiagramBuilder() {
    this._siteCoords = null;
    this._tolerance = 0.0;
    this._subdiv = null;
    this._clipEnv = null;
    this._diagramEnv = null;
  }
  extend(VoronoiDiagramBuilder.prototype, {
    create: function create() {
      if (this._subdiv !== null) return null;
      var siteEnv = DelaunayTriangulationBuilder.envelope(this._siteCoords);
      this._diagramEnv = siteEnv;
      var expandBy = Math.max(this._diagramEnv.getWidth(), this._diagramEnv.getHeight());

      this._diagramEnv.expandBy(expandBy);

      if (this._clipEnv !== null) this._diagramEnv.expandToInclude(this._clipEnv);
      var vertices = DelaunayTriangulationBuilder.toVertices(this._siteCoords);
      this._subdiv = new QuadEdgeSubdivision(siteEnv, this._tolerance);
      var triangulator = new IncrementalDelaunayTriangulator(this._subdiv);
      triangulator.insertSites(vertices);
    },
    getDiagram: function getDiagram(geomFact) {
      this.create();

      var polys = this._subdiv.getVoronoiDiagram(geomFact);

      return VoronoiDiagramBuilder.clipGeometryCollection(polys, this._diagramEnv);
    },
    setTolerance: function setTolerance(tolerance) {
      this._tolerance = tolerance;
    },
    setSites: function setSites() {
      if (arguments[0] instanceof Geometry) {
        var geom = arguments[0];
        this._siteCoords = DelaunayTriangulationBuilder.extractUniqueCoordinates(geom);
      } else if (hasInterface(arguments[0], Collection)) {
        var coords = arguments[0];
        this._siteCoords = DelaunayTriangulationBuilder.unique(CoordinateArrays.toCoordinateArray(coords));
      }
    },
    setClipEnvelope: function setClipEnvelope(clipEnv) {
      this._clipEnv = clipEnv;
    },
    getSubdivision: function getSubdivision() {
      this.create();
      return this._subdiv;
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return VoronoiDiagramBuilder;
    }
  });

  VoronoiDiagramBuilder.clipGeometryCollection = function (geom, clipEnv) {
    var clipPoly = geom.getFactory().toGeometry(clipEnv);
    var clipped = new ArrayList();

    for (var i = 0; i < geom.getNumGeometries(); i++) {
      var g = geom.getGeometryN(i);
      var result = null;
      if (clipEnv.contains(g.getEnvelopeInternal())) result = g;else if (clipEnv.intersects(g.getEnvelopeInternal())) {
        result = clipPoly.intersection(g);
        result.setUserData(g.getUserData());
      }

      if (result !== null && !result.isEmpty()) {
        clipped.add(result);
      }
    }

    return geom.getFactory().createGeometryCollection(GeometryFactory.toGeometryArray(clipped));
  };



  var quadedge = /*#__PURE__*/Object.freeze({
    Vertex: Vertex
  });



  var triangulate = /*#__PURE__*/Object.freeze({
    ConformingDelaunayTriangulationBuilder: ConformingDelaunayTriangulationBuilder,
    DelaunayTriangulationBuilder: DelaunayTriangulationBuilder,
    VoronoiDiagramBuilder: VoronoiDiagramBuilder,
    quadedge: quadedge
  });

  function LinearLocation() {
    this._componentIndex = 0;
    this._segmentIndex = 0;
    this._segmentFraction = 0.0;

    if (arguments.length === 0) ; else if (arguments.length === 1) {
      var loc = arguments[0];
      this._componentIndex = loc._componentIndex;
      this._segmentIndex = loc._segmentIndex;
      this._segmentFraction = loc._segmentFraction;
    } else if (arguments.length === 2) {
      var segmentIndex = arguments[0],
          segmentFraction = arguments[1];
      LinearLocation.call(this, 0, segmentIndex, segmentFraction);
    } else if (arguments.length === 3) {
      var componentIndex = arguments[0],
          _segmentIndex = arguments[1],
          _segmentFraction = arguments[2];
      this._componentIndex = componentIndex;
      this._segmentIndex = _segmentIndex;
      this._segmentFraction = _segmentFraction;
      this.normalize();
    } else if (arguments.length === 4) {
      var _componentIndex = arguments[0],
          _segmentIndex2 = arguments[1],
          _segmentFraction2 = arguments[2],
          doNormalize = arguments[3];
      this._componentIndex = _componentIndex;
      this._segmentIndex = _segmentIndex2;
      this._segmentFraction = _segmentFraction2;
      if (doNormalize) this.normalize();
    }
  }
  extend(LinearLocation.prototype, {
    getSegmentIndex: function getSegmentIndex() {
      return this._segmentIndex;
    },
    getComponentIndex: function getComponentIndex() {
      return this._componentIndex;
    },
    isEndpoint: function isEndpoint(linearGeom) {
      var lineComp = linearGeom.getGeometryN(this._componentIndex);
      var nseg = lineComp.getNumPoints() - 1;
      return this._segmentIndex >= nseg || this._segmentIndex === nseg && this._segmentFraction >= 1.0;
    },
    isValid: function isValid(linearGeom) {
      if (this._componentIndex < 0 || this._componentIndex >= linearGeom.getNumGeometries()) return false;
      var lineComp = linearGeom.getGeometryN(this._componentIndex);
      if (this._segmentIndex < 0 || this._segmentIndex > lineComp.getNumPoints()) return false;
      if (this._segmentIndex === lineComp.getNumPoints() && this._segmentFraction !== 0.0) return false;
      if (this._segmentFraction < 0.0 || this._segmentFraction > 1.0) return false;
      return true;
    },
    normalize: function normalize() {
      if (this._segmentFraction < 0.0) {
        this._segmentFraction = 0.0;
      }

      if (this._segmentFraction > 1.0) {
        this._segmentFraction = 1.0;
      }

      if (this._componentIndex < 0) {
        this._componentIndex = 0;
        this._segmentIndex = 0;
        this._segmentFraction = 0.0;
      }

      if (this._segmentIndex < 0) {
        this._segmentIndex = 0;
        this._segmentFraction = 0.0;
      }

      if (this._segmentFraction === 1.0) {
        this._segmentFraction = 0.0;
        this._segmentIndex += 1;
      }
    },
    toLowest: function toLowest(linearGeom) {
      var lineComp = linearGeom.getGeometryN(this._componentIndex);
      var nseg = lineComp.getNumPoints() - 1;
      if (this._segmentIndex < nseg) return this;
      return new LinearLocation(this._componentIndex, nseg, 1.0, false);
    },
    getCoordinate: function getCoordinate(linearGeom) {
      var lineComp = linearGeom.getGeometryN(this._componentIndex);
      var p0 = lineComp.getCoordinateN(this._segmentIndex);
      if (this._segmentIndex >= lineComp.getNumPoints() - 1) return p0;
      var p1 = lineComp.getCoordinateN(this._segmentIndex + 1);
      return LinearLocation.pointAlongSegmentByFraction(p0, p1, this._segmentFraction);
    },
    getSegmentFraction: function getSegmentFraction() {
      return this._segmentFraction;
    },
    getSegment: function getSegment(linearGeom) {
      var lineComp = linearGeom.getGeometryN(this._componentIndex);
      var p0 = lineComp.getCoordinateN(this._segmentIndex);

      if (this._segmentIndex >= lineComp.getNumPoints() - 1) {
        var prev = lineComp.getCoordinateN(lineComp.getNumPoints() - 2);
        return new LineSegment(prev, p0);
      }

      var p1 = lineComp.getCoordinateN(this._segmentIndex + 1);
      return new LineSegment(p0, p1);
    },
    clamp: function clamp(linear) {
      if (this._componentIndex >= linear.getNumGeometries()) {
        this.setToEnd(linear);
        return null;
      }

      if (this._segmentIndex >= linear.getNumPoints()) {
        var line = linear.getGeometryN(this._componentIndex);
        this._segmentIndex = line.getNumPoints() - 1;
        this._segmentFraction = 1.0;
      }
    },
    setToEnd: function setToEnd(linear) {
      this._componentIndex = linear.getNumGeometries() - 1;
      var lastLine = linear.getGeometryN(this._componentIndex);
      this._segmentIndex = lastLine.getNumPoints() - 1;
      this._segmentFraction = 1.0;
    },
    compareTo: function compareTo(o) {
      var other = o;
      if (this._componentIndex < other._componentIndex) return -1;
      if (this._componentIndex > other._componentIndex) return 1;
      if (this._segmentIndex < other._segmentIndex) return -1;
      if (this._segmentIndex > other._segmentIndex) return 1;
      if (this._segmentFraction < other._segmentFraction) return -1;
      if (this._segmentFraction > other._segmentFraction) return 1;
      return 0;
    },
    copy: function copy() {
      return new LinearLocation(this._componentIndex, this._segmentIndex, this._segmentFraction);
    },
    toString: function toString() {
      return "LinearLoc[" + this._componentIndex + ", " + this._segmentIndex + ", " + this._segmentFraction + "]";
    },
    isOnSameSegment: function isOnSameSegment(loc) {
      if (this._componentIndex !== loc._componentIndex) return false;
      if (this._segmentIndex === loc._segmentIndex) return true;
      if (loc._segmentIndex - this._segmentIndex === 1 && loc._segmentFraction === 0.0) return true;
      if (this._segmentIndex - loc._segmentIndex === 1 && this._segmentFraction === 0.0) return true;
      return false;
    },
    snapToVertex: function snapToVertex(linearGeom, minDistance) {
      if (this._segmentFraction <= 0.0 || this._segmentFraction >= 1.0) return null;
      var segLen = this.getSegmentLength(linearGeom);
      var lenToStart = this._segmentFraction * segLen;
      var lenToEnd = segLen - lenToStart;

      if (lenToStart <= lenToEnd && lenToStart < minDistance) {
        this._segmentFraction = 0.0;
      } else if (lenToEnd <= lenToStart && lenToEnd < minDistance) {
        this._segmentFraction = 1.0;
      }
    },
    compareLocationValues: function compareLocationValues(componentIndex1, segmentIndex1, segmentFraction1) {
      if (this._componentIndex < componentIndex1) return -1;
      if (this._componentIndex > componentIndex1) return 1;
      if (this._segmentIndex < segmentIndex1) return -1;
      if (this._segmentIndex > segmentIndex1) return 1;
      if (this._segmentFraction < segmentFraction1) return -1;
      if (this._segmentFraction > segmentFraction1) return 1;
      return 0;
    },
    getSegmentLength: function getSegmentLength(linearGeom) {
      var lineComp = linearGeom.getGeometryN(this._componentIndex);
      var segIndex = this._segmentIndex;
      if (this._segmentIndex >= lineComp.getNumPoints() - 1) segIndex = lineComp.getNumPoints() - 2;
      var p0 = lineComp.getCoordinateN(segIndex);
      var p1 = lineComp.getCoordinateN(segIndex + 1);
      return p0.distance(p1);
    },
    isVertex: function isVertex() {
      return this._segmentFraction <= 0.0 || this._segmentFraction >= 1.0;
    },
    interfaces_: function interfaces_() {
      return [Comparable];
    },
    getClass: function getClass() {
      return LinearLocation;
    }
  });

  LinearLocation.getEndLocation = function (linear) {
    var loc = new LinearLocation();
    loc.setToEnd(linear);
    return loc;
  };

  LinearLocation.pointAlongSegmentByFraction = function (p0, p1, frac) {
    if (frac <= 0.0) return p0;
    if (frac >= 1.0) return p1;
    var x = (p1.x - p0.x) * frac + p0.x;
    var y = (p1.y - p0.y) * frac + p0.y;
    var z = (p1.z - p0.z) * frac + p0.z;
    return new Coordinate(x, y, z);
  };

  LinearLocation.compareLocationValues = function (componentIndex0, segmentIndex0, segmentFraction0, componentIndex1, segmentIndex1, segmentFraction1) {
    if (componentIndex0 < componentIndex1) return -1;
    if (componentIndex0 > componentIndex1) return 1;
    if (segmentIndex0 < segmentIndex1) return -1;
    if (segmentIndex0 > segmentIndex1) return 1;
    if (segmentFraction0 < segmentFraction1) return -1;
    if (segmentFraction0 > segmentFraction1) return 1;
    return 0;
  };

  function LinearIterator() {
    this._linearGeom = null;
    this._numLines = null;
    this._currentLine = null;
    this._componentIndex = 0;
    this._vertexIndex = 0;

    if (arguments.length === 1) {
      var linear = arguments[0];
      LinearIterator.call(this, linear, 0, 0);
    } else if (arguments.length === 2) {
      var _linear = arguments[0],
          start = arguments[1];
      LinearIterator.call(this, _linear, start.getComponentIndex(), LinearIterator.segmentEndVertexIndex(start));
    } else if (arguments.length === 3) {
      var linearGeom = arguments[0],
          componentIndex = arguments[1],
          vertexIndex = arguments[2];
      if (!hasInterface(linearGeom, Lineal)) throw new IllegalArgumentException("Lineal geometry is required");
      this._linearGeom = linearGeom;
      this._numLines = linearGeom.getNumGeometries();
      this._componentIndex = componentIndex;
      this._vertexIndex = vertexIndex;
      this.loadCurrentLine();
    }
  }
  extend(LinearIterator.prototype, {
    getComponentIndex: function getComponentIndex() {
      return this._componentIndex;
    },
    getLine: function getLine() {
      return this._currentLine;
    },
    getVertexIndex: function getVertexIndex() {
      return this._vertexIndex;
    },
    getSegmentEnd: function getSegmentEnd() {
      if (this._vertexIndex < this.getLine().getNumPoints() - 1) return this._currentLine.getCoordinateN(this._vertexIndex + 1);
      return null;
    },
    next: function next() {
      if (!this.hasNext()) return null;
      this._vertexIndex++;

      if (this._vertexIndex >= this._currentLine.getNumPoints()) {
        this._componentIndex++;
        this.loadCurrentLine();
        this._vertexIndex = 0;
      }
    },
    loadCurrentLine: function loadCurrentLine() {
      if (this._componentIndex >= this._numLines) {
        this._currentLine = null;
        return null;
      }

      this._currentLine = this._linearGeom.getGeometryN(this._componentIndex);
    },
    getSegmentStart: function getSegmentStart() {
      return this._currentLine.getCoordinateN(this._vertexIndex);
    },
    isEndOfLine: function isEndOfLine() {
      if (this._componentIndex >= this._numLines) return false;
      if (this._vertexIndex < this._currentLine.getNumPoints() - 1) return false;
      return true;
    },
    hasNext: function hasNext() {
      if (this._componentIndex >= this._numLines) return false;
      if (this._componentIndex === this._numLines - 1 && this._vertexIndex >= this._currentLine.getNumPoints()) return false;
      return true;
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return LinearIterator;
    }
  });

  LinearIterator.segmentEndVertexIndex = function (loc) {
    if (loc.getSegmentFraction() > 0.0) return loc.getSegmentIndex() + 1;
    return loc.getSegmentIndex();
  };

  function LocationIndexOfPoint() {
    this._linearGeom = null;
    var linearGeom = arguments[0];
    this._linearGeom = linearGeom;
  }
  extend(LocationIndexOfPoint.prototype, {
    indexOf: function indexOf(inputPt) {
      return this.indexOfFromStart(inputPt, null);
    },
    indexOfFromStart: function indexOfFromStart(inputPt, minIndex) {
      var minDistance = Double.MAX_VALUE;
      var minComponentIndex = 0;
      var minSegmentIndex = 0;
      var minFrac = -1.0;
      var seg = new LineSegment();

      for (var it = new LinearIterator(this._linearGeom); it.hasNext(); it.next()) {
        if (!it.isEndOfLine()) {
          seg.p0 = it.getSegmentStart();
          seg.p1 = it.getSegmentEnd();
          var segDistance = seg.distance(inputPt);
          var segFrac = seg.segmentFraction(inputPt);
          var candidateComponentIndex = it.getComponentIndex();
          var candidateSegmentIndex = it.getVertexIndex();

          if (segDistance < minDistance) {
            if (minIndex === null || minIndex.compareLocationValues(candidateComponentIndex, candidateSegmentIndex, segFrac) < 0) {
              minComponentIndex = candidateComponentIndex;
              minSegmentIndex = candidateSegmentIndex;
              minFrac = segFrac;
              minDistance = segDistance;
            }
          }
        }
      }

      if (minDistance === Double.MAX_VALUE) {
        return new LinearLocation(minIndex);
      }

      var loc = new LinearLocation(minComponentIndex, minSegmentIndex, minFrac);
      return loc;
    },
    indexOfAfter: function indexOfAfter(inputPt, minIndex) {
      if (minIndex === null) return this.indexOf(inputPt);
      var endLoc = LinearLocation.getEndLocation(this._linearGeom);
      if (endLoc.compareTo(minIndex) <= 0) return endLoc;
      var closestAfter = this.indexOfFromStart(inputPt, minIndex);
      Assert.isTrue(closestAfter.compareTo(minIndex) >= 0, "computed location is before specified minimum location");
      return closestAfter;
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return LocationIndexOfPoint;
    }
  });

  LocationIndexOfPoint.indexOf = function (linearGeom, inputPt) {
    var locater = new LocationIndexOfPoint(linearGeom);
    return locater.indexOf(inputPt);
  };

  LocationIndexOfPoint.indexOfAfter = function (linearGeom, inputPt, minIndex) {
    var locater = new LocationIndexOfPoint(linearGeom);
    return locater.indexOfAfter(inputPt, minIndex);
  };

  function LocationIndexOfLine() {
    this._linearGeom = null;
    var linearGeom = arguments[0];
    this._linearGeom = linearGeom;
  }
  extend(LocationIndexOfLine.prototype, {
    indicesOf: function indicesOf(subLine) {
      var startPt = subLine.getGeometryN(0).getCoordinateN(0);
      var lastLine = subLine.getGeometryN(subLine.getNumGeometries() - 1);
      var endPt = lastLine.getCoordinateN(lastLine.getNumPoints() - 1);
      var locPt = new LocationIndexOfPoint(this._linearGeom);
      var subLineLoc = new Array(2).fill(null);
      subLineLoc[0] = locPt.indexOf(startPt);

      if (subLine.getLength() === 0.0) {
        subLineLoc[1] = subLineLoc[0].copy();
      } else {
        subLineLoc[1] = locPt.indexOfAfter(endPt, subLineLoc[0]);
      }

      return subLineLoc;
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return LocationIndexOfLine;
    }
  });

  LocationIndexOfLine.indicesOf = function (linearGeom, subLine) {
    var locater = new LocationIndexOfLine(linearGeom);
    return locater.indicesOf(subLine);
  };

  function LinearGeometryBuilder() {
    this._geomFact = null;
    this._lines = new ArrayList();
    this._coordList = null;
    this._ignoreInvalidLines = false;
    this._fixInvalidLines = false;
    this._lastPt = null;
    var geomFact = arguments[0];
    this._geomFact = geomFact;
  }
  extend(LinearGeometryBuilder.prototype, {
    getGeometry: function getGeometry() {
      this.endLine();
      return this._geomFact.buildGeometry(this._lines);
    },
    getLastCoordinate: function getLastCoordinate() {
      return this._lastPt;
    },
    endLine: function endLine() {
      if (this._coordList === null) {
        return null;
      }

      if (this._ignoreInvalidLines && this._coordList.size() < 2) {
        this._coordList = null;
        return null;
      }

      var rawPts = this._coordList.toCoordinateArray();

      var pts = rawPts;
      if (this._fixInvalidLines) pts = this.validCoordinateSequence(rawPts);
      this._coordList = null;
      var line = null;

      try {
        line = this._geomFact.createLineString(pts);
      } catch (ex) {
        if (ex instanceof IllegalArgumentException) {
          if (!this._ignoreInvalidLines) throw ex;
        } else throw ex;
      } finally {}

      if (line !== null) this._lines.add(line);
    },
    setFixInvalidLines: function setFixInvalidLines(fixInvalidLines) {
      this._fixInvalidLines = fixInvalidLines;
    },
    add: function add() {
      if (arguments.length === 1) {
        var pt = arguments[0];
        this.add(pt, true);
      } else if (arguments.length === 2) {
        var _pt = arguments[0],
            allowRepeatedPoints = arguments[1];
        if (this._coordList === null) this._coordList = new CoordinateList();

        this._coordList.add(_pt, allowRepeatedPoints);

        this._lastPt = _pt;
      }
    },
    setIgnoreInvalidLines: function setIgnoreInvalidLines(ignoreInvalidLines) {
      this._ignoreInvalidLines = ignoreInvalidLines;
    },
    validCoordinateSequence: function validCoordinateSequence(pts) {
      if (pts.length >= 2) return pts;
      var validPts = [pts[0], pts[0]];
      return validPts;
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return LinearGeometryBuilder;
    }
  });

  function ExtractLineByLocation() {
    this._line = null;
    var line = arguments[0];
    this._line = line;
  }
  extend(ExtractLineByLocation.prototype, {
    computeLinear: function computeLinear(start, end) {
      var builder = new LinearGeometryBuilder(this._line.getFactory());
      builder.setFixInvalidLines(true);
      if (!start.isVertex()) builder.add(start.getCoordinate(this._line));

      for (var it = new LinearIterator(this._line, start); it.hasNext(); it.next()) {
        if (end.compareLocationValues(it.getComponentIndex(), it.getVertexIndex(), 0.0) < 0) break;
        var pt = it.getSegmentStart();
        builder.add(pt);
        if (it.isEndOfLine()) builder.endLine();
      }

      if (!end.isVertex()) builder.add(end.getCoordinate(this._line));
      return builder.getGeometry();
    },
    computeLine: function computeLine(start, end) {
      var coordinates = this._line.getCoordinates();

      var newCoordinates = new CoordinateList();
      var startSegmentIndex = start.getSegmentIndex();
      if (start.getSegmentFraction() > 0.0) startSegmentIndex += 1;
      var lastSegmentIndex = end.getSegmentIndex();
      if (end.getSegmentFraction() === 1.0) lastSegmentIndex += 1;
      if (lastSegmentIndex >= coordinates.length) lastSegmentIndex = coordinates.length - 1;
      if (!start.isVertex()) newCoordinates.add(start.getCoordinate(this._line));

      for (var i = startSegmentIndex; i <= lastSegmentIndex; i++) {
        newCoordinates.add(coordinates[i]);
      }

      if (!end.isVertex()) newCoordinates.add(end.getCoordinate(this._line));
      if (newCoordinates.size() <= 0) newCoordinates.add(start.getCoordinate(this._line));
      var newCoordinateArray = newCoordinates.toCoordinateArray();

      if (newCoordinateArray.length <= 1) {
        newCoordinateArray = [newCoordinateArray[0], newCoordinateArray[0]];
      }

      return this._line.getFactory().createLineString(newCoordinateArray);
    },
    extract: function extract(start, end) {
      if (end.compareTo(start) < 0) {
        return this.reverse(this.computeLinear(end, start));
      }

      return this.computeLinear(start, end);
    },
    reverse: function reverse(linear) {
      if (linear instanceof LineString) return linear.reverse();
      if (linear instanceof MultiLineString) return linear.reverse();
      Assert.shouldNeverReachHere("non-linear geometry encountered");
      return null;
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return ExtractLineByLocation;
    }
  });

  ExtractLineByLocation.extract = function (line, start, end) {
    var ls = new ExtractLineByLocation(line);
    return ls.extract(start, end);
  };

  function LocationIndexedLine() {
    this._linearGeom = null;
    var linearGeom = arguments[0];
    this._linearGeom = linearGeom;
    this.checkGeometryType();
  }
  extend(LocationIndexedLine.prototype, {
    clampIndex: function clampIndex(index) {
      var loc = index.copy();
      loc.clamp(this._linearGeom);
      return loc;
    },
    project: function project(pt) {
      return LocationIndexOfPoint.indexOf(this._linearGeom, pt);
    },
    checkGeometryType: function checkGeometryType() {
      if (!(this._linearGeom instanceof LineString || this._linearGeom instanceof MultiLineString)) throw new IllegalArgumentException("Input geometry must be linear");
    },
    extractPoint: function extractPoint() {
      if (arguments.length === 1) {
        var index = arguments[0];
        return index.getCoordinate(this._linearGeom);
      } else if (arguments.length === 2) {
        var _index = arguments[0],
            offsetDistance = arguments[1];

        var indexLow = _index.toLowest(this._linearGeom);

        return indexLow.getSegment(this._linearGeom).pointAlongOffset(indexLow.getSegmentFraction(), offsetDistance);
      }
    },
    isValidIndex: function isValidIndex(index) {
      return index.isValid(this._linearGeom);
    },
    getEndIndex: function getEndIndex() {
      return LinearLocation.getEndLocation(this._linearGeom);
    },
    getStartIndex: function getStartIndex() {
      return new LinearLocation();
    },
    indexOfAfter: function indexOfAfter(pt, minIndex) {
      return LocationIndexOfPoint.indexOfAfter(this._linearGeom, pt, minIndex);
    },
    extractLine: function extractLine(startIndex, endIndex) {
      return ExtractLineByLocation.extract(this._linearGeom, startIndex, endIndex);
    },
    indexOf: function indexOf(pt) {
      return LocationIndexOfPoint.indexOf(this._linearGeom, pt);
    },
    indicesOf: function indicesOf(subLine) {
      return LocationIndexOfLine.indicesOf(this._linearGeom, subLine);
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return LocationIndexedLine;
    }
  });

  function LengthIndexOfPoint() {
    this._linearGeom = null;
    var linearGeom = arguments[0];
    this._linearGeom = linearGeom;
  }
  extend(LengthIndexOfPoint.prototype, {
    indexOf: function indexOf(inputPt) {
      return this.indexOfFromStart(inputPt, -1.0);
    },
    indexOfFromStart: function indexOfFromStart(inputPt, minIndex) {
      var minDistance = Double.MAX_VALUE;
      var ptMeasure = minIndex;
      var segmentStartMeasure = 0.0;
      var seg = new LineSegment();
      var it = new LinearIterator(this._linearGeom);

      while (it.hasNext()) {
        if (!it.isEndOfLine()) {
          seg.p0 = it.getSegmentStart();
          seg.p1 = it.getSegmentEnd();
          var segDistance = seg.distance(inputPt);
          var segMeasureToPt = this.segmentNearestMeasure(seg, inputPt, segmentStartMeasure);

          if (segDistance < minDistance && segMeasureToPt > minIndex) {
            ptMeasure = segMeasureToPt;
            minDistance = segDistance;
          }

          segmentStartMeasure += seg.getLength();
        }

        it.next();
      }

      return ptMeasure;
    },
    indexOfAfter: function indexOfAfter(inputPt, minIndex) {
      if (minIndex < 0.0) return this.indexOf(inputPt);

      var endIndex = this._linearGeom.getLength();

      if (endIndex < minIndex) return endIndex;
      var closestAfter = this.indexOfFromStart(inputPt, minIndex);
      Assert.isTrue(closestAfter >= minIndex, "computed index is before specified minimum index");
      return closestAfter;
    },
    segmentNearestMeasure: function segmentNearestMeasure(seg, inputPt, segmentStartMeasure) {
      var projFactor = seg.projectionFactor(inputPt);
      if (projFactor <= 0.0) return segmentStartMeasure;
      if (projFactor <= 1.0) return segmentStartMeasure + projFactor * seg.getLength();
      return segmentStartMeasure + seg.getLength();
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return LengthIndexOfPoint;
    }
  });

  LengthIndexOfPoint.indexOf = function (linearGeom, inputPt) {
    var locater = new LengthIndexOfPoint(linearGeom);
    return locater.indexOf(inputPt);
  };

  LengthIndexOfPoint.indexOfAfter = function (linearGeom, inputPt, minIndex) {
    var locater = new LengthIndexOfPoint(linearGeom);
    return locater.indexOfAfter(inputPt, minIndex);
  };

  function LengthLocationMap() {
    this._linearGeom = null;
    var linearGeom = arguments[0];
    this._linearGeom = linearGeom;
  }
  extend(LengthLocationMap.prototype, {
    getLength: function getLength(loc) {
      var totalLength = 0.0;
      var it = new LinearIterator(this._linearGeom);

      while (it.hasNext()) {
        if (!it.isEndOfLine()) {
          var p0 = it.getSegmentStart();
          var p1 = it.getSegmentEnd();
          var segLen = p1.distance(p0);

          if (loc.getComponentIndex() === it.getComponentIndex() && loc.getSegmentIndex() === it.getVertexIndex()) {
            return totalLength + segLen * loc.getSegmentFraction();
          }

          totalLength += segLen;
        }

        it.next();
      }

      return totalLength;
    },
    resolveHigher: function resolveHigher(loc) {
      if (!loc.isEndpoint(this._linearGeom)) return loc;
      var compIndex = loc.getComponentIndex();
      if (compIndex >= this._linearGeom.getNumGeometries() - 1) return loc;

      do {
        compIndex++;
      } while (compIndex < this._linearGeom.getNumGeometries() - 1 && this._linearGeom.getGeometryN(compIndex).getLength() === 0);

      return new LinearLocation(compIndex, 0, 0.0);
    },
    getLocation: function getLocation() {
      if (arguments.length === 1) {
        var length = arguments[0];
        return this.getLocation(length, true);
      } else if (arguments.length === 2) {
        var _length = arguments[0],
            resolveLower = arguments[1];
        var forwardLength = _length;

        if (_length < 0.0) {
          var lineLen = this._linearGeom.getLength();

          forwardLength = lineLen + _length;
        }

        var loc = this.getLocationForward(forwardLength);

        if (resolveLower) {
          return loc;
        }

        return this.resolveHigher(loc);
      }
    },
    getLocationForward: function getLocationForward(length) {
      if (length <= 0.0) return new LinearLocation();
      var totalLength = 0.0;
      var it = new LinearIterator(this._linearGeom);

      while (it.hasNext()) {
        if (it.isEndOfLine()) {
          if (totalLength === length) {
            var compIndex = it.getComponentIndex();
            var segIndex = it.getVertexIndex();
            return new LinearLocation(compIndex, segIndex, 0.0);
          }
        } else {
          var p0 = it.getSegmentStart();
          var p1 = it.getSegmentEnd();
          var segLen = p1.distance(p0);

          if (totalLength + segLen > length) {
            var frac = (length - totalLength) / segLen;
            var compIndex = it.getComponentIndex();
            var segIndex = it.getVertexIndex();
            return new LinearLocation(compIndex, segIndex, frac);
          }

          totalLength += segLen;
        }

        it.next();
      }

      return LinearLocation.getEndLocation(this._linearGeom);
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return LengthLocationMap;
    }
  });

  LengthLocationMap.getLength = function (linearGeom, loc) {
    var locater = new LengthLocationMap(linearGeom);
    return locater.getLength(loc);
  };

  LengthLocationMap.getLocation = function () {
    if (arguments.length === 2) {
      var linearGeom = arguments[0],
          length = arguments[1];
      var locater = new LengthLocationMap(linearGeom);
      return locater.getLocation(length);
    } else if (arguments.length === 3) {
      var _linearGeom = arguments[0],
          _length2 = arguments[1],
          resolveLower = arguments[2];
      var locater = new LengthLocationMap(_linearGeom);
      return locater.getLocation(_length2, resolveLower);
    }
  };

  function LengthIndexedLine() {
    this._linearGeom = null;
    var linearGeom = arguments[0];
    this._linearGeom = linearGeom;
  }
  extend(LengthIndexedLine.prototype, {
    clampIndex: function clampIndex(index) {
      var posIndex = this.positiveIndex(index);
      var startIndex = this.getStartIndex();
      if (posIndex < startIndex) return startIndex;
      var endIndex = this.getEndIndex();
      if (posIndex > endIndex) return endIndex;
      return posIndex;
    },
    locationOf: function locationOf() {
      if (arguments.length === 1) {
        var index = arguments[0];
        return LengthLocationMap.getLocation(this._linearGeom, index);
      } else if (arguments.length === 2) {
        var _index = arguments[0],
            resolveLower = arguments[1];
        return LengthLocationMap.getLocation(this._linearGeom, _index, resolveLower);
      }
    },
    project: function project(pt) {
      return LengthIndexOfPoint.indexOf(this._linearGeom, pt);
    },
    positiveIndex: function positiveIndex(index) {
      if (index >= 0.0) return index;
      return this._linearGeom.getLength() + index;
    },
    extractPoint: function extractPoint() {
      if (arguments.length === 1) {
        var index = arguments[0];
        var loc = LengthLocationMap.getLocation(this._linearGeom, index);
        return loc.getCoordinate(this._linearGeom);
      } else if (arguments.length === 2) {
        var _index2 = arguments[0],
            offsetDistance = arguments[1];
        var loc = LengthLocationMap.getLocation(this._linearGeom, _index2);
        var locLow = loc.toLowest(this._linearGeom);
        return locLow.getSegment(this._linearGeom).pointAlongOffset(locLow.getSegmentFraction(), offsetDistance);
      }
    },
    isValidIndex: function isValidIndex(index) {
      return index >= this.getStartIndex() && index <= this.getEndIndex();
    },
    getEndIndex: function getEndIndex() {
      return this._linearGeom.getLength();
    },
    getStartIndex: function getStartIndex() {
      return 0.0;
    },
    indexOfAfter: function indexOfAfter(pt, minIndex) {
      return LengthIndexOfPoint.indexOfAfter(this._linearGeom, pt, minIndex);
    },
    extractLine: function extractLine(startIndex, endIndex) {
      var lil = new LocationIndexedLine(this._linearGeom);
      var startIndex2 = this.clampIndex(startIndex);
      var endIndex2 = this.clampIndex(endIndex);
      var resolveStartLower = startIndex2 === endIndex2;
      var startLoc = this.locationOf(startIndex2, resolveStartLower);
      var endLoc = this.locationOf(endIndex2);
      return ExtractLineByLocation.extract(this._linearGeom, startLoc, endLoc);
    },
    indexOf: function indexOf(pt) {
      return LengthIndexOfPoint.indexOf(this._linearGeom, pt);
    },
    indicesOf: function indicesOf(subLine) {
      var locIndex = LocationIndexOfLine.indicesOf(this._linearGeom, subLine);
      var index = [LengthLocationMap.getLength(this._linearGeom, locIndex[0]), LengthLocationMap.getLength(this._linearGeom, locIndex[1])];
      return index;
    },
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return LengthIndexedLine;
    }
  });



  var linearref = /*#__PURE__*/Object.freeze({
    LengthIndexedLine: LengthIndexedLine,
    LengthLocationMap: LengthLocationMap,
    LinearGeometryBuilder: LinearGeometryBuilder,
    LinearIterator: LinearIterator,
    LinearLocation: LinearLocation,
    LocationIndexedLine: LocationIndexedLine
  });

  function UnionOp() {}
  extend(UnionOp.prototype, {
    interfaces_: function interfaces_() {
      return [];
    },
    getClass: function getClass() {
      return UnionOp;
    }
  });

  UnionOp.union = function (g, other) {
    if (g.isEmpty() || other.isEmpty()) {
      if (g.isEmpty() && other.isEmpty()) return OverlayOp.createEmptyResult(OverlayOp.UNION, g, other, g.getFactory());
      if (g.isEmpty()) return other.copy();
      if (other.isEmpty()) return g.copy();
    }

    g.checkNotGeometryCollection(g);
    g.checkNotGeometryCollection(other);
    return SnapIfNeededOverlayOp.overlayOp(g, other, OverlayOp.UNION);
  };

  extend(Geometry.prototype, {
    equalsTopo: function equalsTopo(g) {
      if (!this.getEnvelopeInternal().equals(g.getEnvelopeInternal())) return false;
      return RelateOp.relate(this, g).isEquals(this.getDimension(), g.getDimension());
    },
    union: function union() {
      if (arguments.length === 0) {
        return UnaryUnionOp.union(this);
      } else if (arguments.length === 1) {
        var other = arguments[0];
        return UnionOp.union(this, other);
      }
    },
    isValid: function isValid() {
      return IsValidOp.isValid(this);
    },
    intersection: function intersection(other) {
      if (this.isEmpty() || other.isEmpty()) return OverlayOp.createEmptyResult(OverlayOp.INTERSECTION, this, other, this._factory);

      if (this.isGeometryCollection()) {
        var g2 = other;
        return GeometryCollectionMapper.map(this, {
          interfaces_: function interfaces_() {
            return [MapOp];
          },
          map: function map(g) {
            return g.intersection(g2);
          }
        });
      }

      this.checkNotGeometryCollection(this);
      this.checkNotGeometryCollection(other);
      return SnapIfNeededOverlayOp.overlayOp(this, other, OverlayOp.INTERSECTION);
    },
    covers: function covers(g) {
      return RelateOp.covers(this, g);
    },
    coveredBy: function coveredBy(g) {
      return RelateOp.covers(g, this);
    },
    touches: function touches(g) {
      return RelateOp.touches(this, g);
    },
    intersects: function intersects(g) {
      return RelateOp.intersects(this, g);
    },
    within: function within(g) {
      return RelateOp.contains(g, this);
    },
    overlaps: function overlaps(g) {
      return RelateOp.overlaps(this, g);
    },
    disjoint: function disjoint(g) {
      return RelateOp.disjoint(this, g);
    },
    crosses: function crosses(g) {
      return RelateOp.crosses(this, g);
    },
    buffer: function buffer() {
      if (arguments.length === 1) {
        var distance = arguments[0];
        return BufferOp.bufferOp(this, distance);
      } else if (arguments.length === 2) {
        var _distance = arguments[0],
            quadrantSegments = arguments[1];
        return BufferOp.bufferOp(this, _distance, quadrantSegments);
      } else if (arguments.length === 3) {
        var _distance2 = arguments[0],
            _quadrantSegments = arguments[1],
            endCapStyle = arguments[2];
        return BufferOp.bufferOp(this, _distance2, _quadrantSegments, endCapStyle);
      }
    },
    convexHull: function convexHull() {
      return new ConvexHull(this).getConvexHull();
    },
    relate: function relate() {
      for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
        args[_key] = arguments[_key];
      }

      if (arguments.length === 1) {
        var geometry = arguments[0];
        return RelateOp.relate(this, geometry);
      } else if (arguments.length === 2) {
        var _geometry = arguments[0],
            intersectionPattern = arguments[1];
        return RelateOp.relate(this, _geometry).matches(intersectionPattern);
      }
    },
    getCentroid: function getCentroid() {
      if (this.isEmpty()) return this._factory.createPoint();
      var centPt = Centroid.getCentroid(this);
      return this.createPointFromInternalCoord(centPt, this);
    },
    getInteriorPoint: function getInteriorPoint() {
      if (this.isEmpty()) return this._factory.createPoint();
      var interiorPt = null;
      var dim = this.getDimension();

      if (dim === 0) {
        var intPt = new InteriorPointPoint(this);
        interiorPt = intPt.getInteriorPoint();
      } else if (dim === 1) {
        var intPt = new InteriorPointLine(this);
        interiorPt = intPt.getInteriorPoint();
      } else {
        var intPt = new InteriorPointArea(this);
        interiorPt = intPt.getInteriorPoint();
      }

      return this.createPointFromInternalCoord(interiorPt, this);
    },
    symDifference: function symDifference(other) {
      if (this.isEmpty() || other.isEmpty()) {
        if (this.isEmpty() && other.isEmpty()) return OverlayOp.createEmptyResult(OverlayOp.SYMDIFFERENCE, this, other, this._factory);
        if (this.isEmpty()) return other.copy();
        if (other.isEmpty()) return this.copy();
      }

      this.checkNotGeometryCollection(this);
      this.checkNotGeometryCollection(other);
      return SnapIfNeededOverlayOp.overlayOp(this, other, OverlayOp.SYMDIFFERENCE);
    },
    createPointFromInternalCoord: function createPointFromInternalCoord(coord, exemplar) {
      exemplar.getPrecisionModel().makePrecise(coord);
      return exemplar.getFactory().createPoint(coord);
    },
    toText: function toText() {
      var writer = new WKTWriter();
      return writer.write(this);
    },
    toString: function toString() {
      this.toText();
    },
    contains: function contains(g) {
      return RelateOp.contains(this, g);
    },
    difference: function difference(other) {
      if (this.isEmpty()) return OverlayOp.createEmptyResult(OverlayOp.DIFFERENCE, this, other, this._factory);
      if (other.isEmpty()) return this.copy();
      this.checkNotGeometryCollection(this);
      this.checkNotGeometryCollection(other);
      return SnapIfNeededOverlayOp.overlayOp(this, other, OverlayOp.DIFFERENCE);
    },
    isSimple: function isSimple() {
      var op = new IsSimpleOp(this);
      return op.isSimple();
    },
    isWithinDistance: function isWithinDistance(geom, distance) {
      var envDist = this.getEnvelopeInternal().distance(geom.getEnvelopeInternal());
      if (envDist > distance) return false;
      return DistanceOp.isWithinDistance(this, geom, distance);
    },
    distance: function distance(g) {
      return DistanceOp.distance(this, g);
    },
    isEquivalentClass: function isEquivalentClass(other) {
      return this.getClass() === other.getClass();
    }
  });

  var version = '1.6.2 (258b53b)';

  exports.version = version;
  exports.algorithm = algorithm;
  exports.densify = densify;
  exports.dissolve = dissolve;
  exports.geom = geom;
  exports.geomgraph = geomgraph;
  exports.index = index;
  exports.io = io;
  exports.noding = noding;
  exports.operation = operation;
  exports.precision = precision;
  exports.simplify = simplify;
  exports.triangulate = triangulate;
  exports.linearref = linearref;

  Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=jsts.js.map
