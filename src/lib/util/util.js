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

}

module.exports = Util;
