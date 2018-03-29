/**
 * @private
 */
class Util {

    /**
     * check to see if something is a class???
     * @param {Function} input Function to check. what else?
     * @returns {boolean}
     */
    static isClass(input) {
        return typeof input === "function" &&
			typeof input.constructor !== "undefined" &&
			typeof input.constructor.constructor.toString === "function" &&
			input.prototype.constructor.toString().substring(0, 5) === "class";
    }

}

module.exports = Util;
