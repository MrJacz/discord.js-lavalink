const { Collection } = require("discord.js");
const { isClass } = require("../util/util");
/**
 * Player Manager Store
 * @extends {Collection}
 * @private
 */
class PlayerManagerStore extends Collection {

    constructor(Player) {
        super();

        this.Player = Player;
    }

    add(obj) {
        if (!obj.id) throw new Error("Missing object id");
        const entry = isClass(obj) ? obj : new this.Player(obj);
        this.set(entry.id, entry);
        return entry;
    }

}
module.exports = PlayerManagerStore;
