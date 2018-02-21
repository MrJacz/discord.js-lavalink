const PlayerStore = require("./structures/PlayerManagerStore");
const Player = require("./Player");
const Node = require("./Node");
const { Collection } = require("discord.js");

/**
 * Player Manager class
 * @extends {PlayerStore}
 */
class PlayerManager extends PlayerStore {

    /**
     *
     * @param {external:Client} client Discord.js Client
     * @param {Object[]} nodes Array of Lavalink Nodes
     * @param {Object} options PlayerManager Options
     */
    constructor(client, nodes = [], options = {}) {
        super(options.player || Player);

        /**
         * Discord.js Client for the Player Manager
         * @type {external:Client}
         */
        this.client = client;
        /**
         * Collection of LavaLink Nodes
         * @type {Collection<String, Node>}
         */
        this.nodes = new Collection();
        /**
         * PlayerManager Options
         * @type {Object}
         */
        this.options = options;

        for (let i = 0; i < nodes.length; i++) this.createNode(Object.assign({}, nodes[i], options));

        client.on("raw", message => {
            if (message.t === "VOICE_SERVER_UPDATE") this.voiceServerUpdate(message.d);
        });
    }

    /**
     * A function to create LavaLink nodes and set them to PlayerManager#nodes
     * @param {Object} options Node options
     */
    createNode(options) {
        const node = new Node({
            host: options.host,
            port: options.port,
            region: options.region,
            shard: options.shard,
            user: options.user,
            password: options.password
        });

        node.on("error", error => this.client.emit("error", error));
        node.on("disconnect", reason => {
            if (!this.nodes.size) throw new Error("No available voice nodes.");
            throw new Error(reason);
        });
        node.on("message", this.onMessage.bind(this));

        this.nodes.set(options.host, node);
    }

    /**
     * Removes a node by host
     * @param {String} host Node host
     * @returns {Boolean}
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
                player.state = message.state;
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
     * @param {Object} options Options
     * @returns {Promise<Player>}
     * @example
     * // Join voice channel
     * PlayerManager.join({
     *  guild: "412180910587379712",
     *  channel: "412180910587379716",
     *  host: "localhost"
     * });
     */
    async join(data, options = {}) {
        const player = this.get(data.guild);
        if (player) return player;
        this.client.ws.send({
            op: 4,
            shard: this.client.shard ? this.client.shard.id : 0,
            d: {
                guild_id: data.guild,
                channel_id: data.channel,
                self_mute: options.selfmute || false,
                self_deaf: options.selfdeaf || false
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
     * @param {String} guild Guild id
     * @returns {Boolean}
     * @example
     * // Leave the current channel
     * PlayerManager.leave("412180910587379712");
     */
    leave(guild) {
        const player = this.get(guild);
        if (!player) return false;
        this.client.ws.send({
            op: 4,
            shard: this.client.shard ? this.client.shard.id : 0,
            d: {
                guild_id: guild,
                channel_id: null,
                self_mute: false,
                self_deaf: false
            }
        });
        player.removeAllListeners();
        return this.delete(guild);
    }

    /**
     * Used for the Voice Server Update event
     * @param {Object} data Data
     * @returns {void}
     * @private
     */
    voiceServerUpdate(data) {
        const guild = this.client.guilds.get(data.guild_id);
        if (!guild) return;
        const player = this.get(data.guild_id);
        if (!player) return;
        player.connect({
            session: guild.me.voiceSessionID,
            event: data
        });
    }

    /**
     * Creates or returns a player
     * @param {Object} data Data for the player
     * @returns {Player}
     */
    spawnPlayer(data) {
        const player = this.get(data.guild);
        if (player) return player;
        const node = this.nodes.get(data.host);
        if (!node) throw new Error(`INVALID_HOST: No available node with ${data.host}`);
        return this.add({
            id: data.guild,
            client: this.client,
            manager: this,
            node,
            channel: data.channel
        });
    }

}

module.exports = PlayerManager;
