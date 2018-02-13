const PlayerManagerStore = require("./structures/PlayerManagerStore");
const Player = require("./Player");
/**
 * Player Manager class
 * @extends {PlayerManagerStore}
 */
class PlayerManager extends PlayerManagerStore {

    constructor(client, options = {}) {
        super(options.player || Player);

        this.client = client;
    }

}

module.exports = PlayerManager;
