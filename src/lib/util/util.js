class Util {

    static parse(data) {
        return new Promise((res, rej) => {
            try {
                return res(JSON.parse(data));
            } catch (error) {
                return rej(error);
            }
        });
    }

    static stringify(data) {
        return new Promise((res, rej) => {
            try {
                return res(JSON.stringify(data));
            } catch (error) {
                return rej(error);
            }
        });
    }

    static isClass(input) {
        return typeof input === "function" &&
			typeof input.constructor !== "undefined" &&
			typeof input.constructor.constructor.toString === "function" &&
			input.prototype.constructor.toString().substring(0, 5) === "class";
    }

}

module.exports = Util;
