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
     * @param {(Function|Object)} data Data or class
     * @returns {Player}
     * @private
     */
    add(data) {
        if (!data.id) throw new Error("INVALID_DATA: Object or Class doesnt have id property");
        const entry = isClass(data) ? data : new this.Player(data);
        this.set(entry.id, entry);
        return entry;
    }

}
module.exports = PlayerStore;
