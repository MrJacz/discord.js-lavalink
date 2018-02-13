const PlayerManagerStore = require("./structures/PlayerManagerStore");
const Player = require("./Player");
const LavaLink = require("./LavaLink");
const { Collection } = require("discord.js");

/**
 * Player Manager class
 * @extends {PlayerManagerStore}
 */
class PlayerManager extends PlayerManagerStore {

    constructor(client, nodes = [], options = {}) {
        super(options.player || Player);

        this.client = client;
        this.nodes = new Collection();

        for (let i = 0; i < nodes.length; i++) this.createNode(Object.assign({}, nodes[i], options));
    }

    createNode(options) {
        const node = new LavaLink({
            host: options.host,
            port: options.port,
            region: options.region,
            shardCount: options.shardCount,
            userId: options.userId,
            password: options.password
        });

        node.on("error", error => this.client.emit("error", error));
        node.on("disconnect", this.onDisconnect.bind(this, node));
        node.on("message", this.onMessage.bind(this, node));

        this.nodes.set(options.host, node);
    }

    onDisconnect(node, reason) {
        if (!this.nodes.size) throw new Error("No available voice nodes.");
        throw new Error(reason);
    }

    onMessage(node, message) {
        if (!message || !message.op) return;

        switch (message.op) {
            case "playerUpdate": {
                const player = this.get(message.guildId);
                if (!player) return;
                /**
                 * @todo when player class is done set player state
                 */
                return;
            }
            case "stats": return console.log(message.data);
        }
    }

}

module.exports = PlayerManager;
