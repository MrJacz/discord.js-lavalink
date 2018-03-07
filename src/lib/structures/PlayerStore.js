const { Collection } = require("discord.js");
const { isClass } = require("../util/util");
/**
 * Player Store
 * @extends {Collection}
 * @private
 */
class PlayerStore extends Collection {

    /**
     * PlayerStore player
     * @param {Player} Player The Player for the store
     */
    constructor(Player) {
        super();
        /**
         * The player for the store
         * @type {Player}
         * @private
         */
        Object.defineProperty(this, "Player", { value: Player });
    }

    /**
     * Sets player into collection from object or class
     * @param {any} obj obj or class
     * @returns {Player}
     */
    add(obj) {
        if (!obj.id) throw new Error("Missing object id");
        const entry = isClass(obj) ? obj : new this.Player(obj);
        this.set(entry.id, entry);
        return entry;
    }

}
module.exports = PlayerStore;
