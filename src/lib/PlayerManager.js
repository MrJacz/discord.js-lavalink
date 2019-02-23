const { Collection } = require("discord.js");
const Player = require("./Player");
const LavalinkNode = require("./LavalinkNode");

/**
 * Player Manager class
 * @extends {external:Collection}
 */
class PlayerManager extends Collection {

    /**
	 * @typedef {Object} PlayerManagerOptions
	 * @property {string} user Client user id
	 * @property {number} shards Total number of shards your bot is operating on
     * @property {Player} [player] Custom player class
	 */

    /**
     * Constructs the PlayerManager
     * @param {external:Client} client Discord.js Client
     * @param {Object[]} nodes Array of Lavalink Nodes
     * @param {PlayerManagerOptions} options PlayerManager Options
     */
    constructor(client, nodes = [], options = {}) {
        super();
        if (!client) throw new Error("INVALID_CLIENT: No client provided.");

        /**
         * The client of the PlayerManager
         * @type {external:Client}
         * @private
         */
        Object.defineProperty(this, "client", { value: client });
        /**
         * Collection of LavaLink Nodes
         * @type {external:Collection<string, LavalinkNode>}
         */
        this.nodes = new Collection();
        /**
         * This client's id
         * @type {string}
         */
        this.user = client.user ? client.user.id : options.user;
        /**
         * Total number of shards your bot is operating on
         * @type {number}
         */
        this.shards = options.shards || 1;
        /**
         * The Player class
         * @type {Player}
         */
        this.Player = options.player || Player;

        for (const node of nodes) this.createNode(node);

        client.on("raw", message => {
            if (message.t === "VOICE_SERVER_UPDATE") this.voiceServerUpdate(message.d);
        });
    }

    /**
     * A function to create LavaLink nodes and set them to PlayerManager#nodes
     * @param {Object} options Node options
     * @returns {LavalinkNode}
     */
    createNode(options) {
        const node = new LavalinkNode(this, options);

        node.on("error", error => this.client.emit("error", error));
        node.on("message", this.onMessage.bind(this));

        this.nodes.set(options.host, node);

        return node;
    }

    /**
     * Removes a node by host
     * @param {string} host Node host
     * @returns {boolean}
     */
    removeNode(host) {
        const node = this.nodes.get(host);
        if (!node) return false;
        node.removeAllListeners();
        return this.nodes.delete(host);
    }

    /**
     * Used for the Node message event
     * @param {Object} message Parsed message object
     * @returns {*}
     * @private
     */
    onMessage(message) {
        if (!message || !message.op) return;

        switch (message.op) {
            case "playerUpdate": {
                const player = this.get(message.guildId);
                if (!player) return;
                player.state = Object.assign(player.state, message.state);
                return;
            }
            case "event": {
                const player = this.get(message.guildId);
                if (!player) return;
                return player.event(message);
            }
        }
    }

    /**
     * Joins the voice channel and spawns a new player
     * @param {Object} data Object with guild, channel, host infomation
     * @param {string} data.guild Guild id
     * @param {string} data.channel Channel id
     * @param {string} data.host host
     * @param {Object} [options] Options
     * @param {boolean} [options.selfmute=false] Selfmute
     * @param {boolean} [options.selfdeaf=false] Selfdeaf
     * @returns {Player}
     * @example
     * // Join voice channel
     * PlayerManager.join({
     *  guild: "412180910587379712",
     *  channel: "412180910587379716",
     *  host: "localhost"
     * });
     */
    join(data, { selfmute = false, selfdeaf = false } = {}) {
        const player = this.get(data.guild);
        if (player) return player;
        this.sendWS({
            op: 4,
            d: {
                guild_id: data.guild,
                channel_id: data.channel,
                self_mute: selfmute,
                self_deaf: selfdeaf
            }
        });
        return this.spawnPlayer({
            host: data.host,
            guild: data.guild,
            channel: data.channel
        });
    }

    /**
     * Leaves voice channel and deletes Player
     * @param {string} guild Guild id
     * @returns {boolean}
     * @example
     * // Leave the current channel
     * PlayerManager.leave("412180910587379712");
     */
    leave(guild) {
        this.sendWS({
            op: 4,
            d: {
                guild_id: guild,
                channel_id: null,
                self_mute: false,
                self_deaf: false
            }
        });
        const player = this.get(guild);
        if (!player) return false;
        player.removeAllListeners();
        player.destroy();
        return this.delete(guild);
    }

    /**
     * Used for the Voice Server Update event
     * @param {Object} data Data
     * @returns {void}
     * @private
     */
    async voiceServerUpdate(data) {
        const guild = this.client.guilds.get(data.guild_id);
        if (!guild) return;
        const player = this.get(data.guild_id);
        if (!player) return;
        if (!guild.me) await guild.members.fetch(this.client.user.id).catch(() => null);
        player.connect({
            session: guild.me.voice ? guild.me.voice.sessionID : guild.me.voiceSessionID,
            event: data
        });
    }

    /**
     * Creates or returns a player
     * @param {Object} data Data for the player
     * @param {string} data.guild Player guild id
     * @param {string} data.channel Player channel id
     * @param {string} data.host Player host id
     * @returns {Player}
     */
    spawnPlayer(data) {
        const exists = this.get(data.guild);
        if (exists) return exists;
        const node = this.nodes.get(data.host);
        if (!node) throw new Error(`INVALID_HOST: No available node with ${data.host}`);
        const player = new this.Player({
            id: data.guild,
            client: this.client,
            manager: this,
            node,
            channel: data.channel
        });
        this.set(data.guild, player);
        return player;
    }

    /**
     * Private function for sending WS packets.
     * @param {Object} data Data for the player
     * @param {number} data.op OP for WS
     * @param {Object} data.d The actual data for the WS
     * @returns {void}
     * @private
     */
    sendWS(data) {
        return typeof this.client.ws.send === "function" ? this.client.ws.send(data) : this.client.guilds.get(data.d.guild_id).shard.send(data);
    }

}

module.exports = PlayerManager;
