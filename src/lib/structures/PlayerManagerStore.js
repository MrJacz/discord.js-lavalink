const { Collection } = require("discord.js");
/**
 * Player Manager Store
 * @extends {Collection}
 */
class PlayerManagerStore extends Collection {

    constructor(Player) {
        super();

        this.Player = Player;
    }

    add(obj, replace = false) {
        if (!(obj instanceof this.Player)) return;
        if (!obj.id) throw new Error("Missing object id");
        const existing = this.get(obj.id);
        if (existing && !replace) return existing;

        this.set(obj.id, obj);
        return obj;
    }

}
module.exports = PlayerManagerStore;
