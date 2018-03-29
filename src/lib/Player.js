const { EventEmitter } = require("events");

/**
 * LavaLink Player
 * @extends {EventEmitter}
 */
class Player extends EventEmitter {

    /**
	 * @typedef {Object} PlayerOptions
	 * @property {string} id Client user id
	 * @property {external:Client} client Client
     * @property {PlayerManager} manager The player's manager
     * @property {LavalinkNode} node Lavalink node for the Player
     * @property {string} channel Channel id for the player
	 */

    /**
     * LavaLink Player Options
     * @param {PlayerOptions} options Player Options
     */
    constructor(options = {}) {
        super();

        /**
         * Player options
         * @type {Object}
         */
        this.options = options;
        /**
         * Player id (Guild ID)
         * @type {string}
         */
        this.id = options.id;
        /**
         * Discord.js Client
         * @type {external:Client}
         */
        this.client = options.client;
        /**
         * The PlayerManager that initilized the player
         * @type {PlayerManager}
         */
        this.manager = options.manager;
        /**
         * The current node for this Player
         * @type {LavalinkNode}
         */
        this.node = options.node;
        /**
         * The current channel id
         * @type {string}
         */
        this.channel = options.channel;
        /**
         * Playing boolean
         * @type {boolean}
         */
        this.playing = false;
        /**
         * LavaLink Player state
         * @type {Object}
         */
        this.state = {};
        /**
         * The current track that the Player is playing
         * @type {?string}
         */
        this.track = null;
        /**
         * The timestamp the Player started playing
         * @type {number}
         */
        this.timestamp = null;
    }

    /**
     * Sends a packet to Lavalink for voiceUpdate
     * @param {Object} data voiceUpdate event data
     */
    connect(data) {
        this.node.send({
            op: "voiceUpdate",
            guildId: this.id,
            sessionId: data.session,
            event: data.event
        });
    }

    /**
     * Disconnects the player
     * @param {string} msg Disconnect reason
     */
    disconnect(msg) {
        this.playing = false;
        this.stop();
        /**
         * Emitted when the Player disconnects
         * @event PLayer#disconnect
         * @param {string} msg Disconnection reason
         */
        this.emit("disconnect", msg);
    }

    /**
     * Plays a song
     * @param {string} track A Base64 string from LavaLink API
     * @param {Object} [options] Other options
     * @param {number} [options.startTime] Start time
     * @param {number} [options.endTime] End time
     */
    play(track, options = {}) {
        this.track = track;
        const payload = Object.assign({
            op: "play",
            guildId: this.id,
            track
        }, options);
        this.node.send(payload);
        this.playing = true;
        this.timestamp = Date.now();
    }

    /**
     * stops the Player
     */
    stop() {
        this.node.send({
            op: "stop",
            guildId: this.id
        });
        this.playing = false;
        this.track = null;
    }

    /**
     * Pauses or Resumes the player
     * @param {boolean} [pause=true] Whether to resume or pause the player
     */
    pause(pause = true) {
        if ((pause && this.paused) || (!pause && !this.paused)) return;
        this.node.send({
            op: "pause",
            guildId: this.id,
            pause
        });
        this.paused = Boolean(pause);
    }

    /**
     * Sets the volume for the player
     * @param {number} volume Volume
     */
    volume(volume) {
        this.node.send({
            op: "volume",
            guildId: this.id,
            volume
        });
    }

    /**
     * Seeks to a specified position
     * @param {number} position The position to seek to
     */
    seek(position) {
        this.node.send({
            op: "seek",
            guildId: this.id,
            position
        });
    }

    /**
     * Destroys the Player
     */
    destroy() {
        this.node.send({
            op: "destroy",
            guildId: this.id
        });
    }

    /**
     * Switch player channel
     * @param {string} channel Channel id
     * @param {boolean} [reactive=false] Whether to switch channel
     * @return {boolean}
     */
    switchChannel(channel, reactive = false) {
        if (this.channel === channel) return false;
        this.channel = channel;
        if (reactive) this.updateVoiceState(channel);
        return true;
    }

    /**
     * @param {Object} message a packet
     * @returns {void}
     * @private
     */
    event(message) {
        switch (message.type) {
            case "TrackEndEvent": {
                if (message.reason !== "REPLACED") {
                    this.playing = false;
                    this.track = null;
                }
                return this.emit("end", message);
            }
            case "TrackExceptionEvent": {
                /**
		         * Emmited when the player encounters an error
		         * @event LavaPlayer#error
		         * @prop {object} message The raw message
		         */
                return this.emit("error", message);
            }
            case "TrackStuckEvent": {
                this.stop();
                /**
                 * Emitted whenever the Player gets Stuck or ends
                 * @event Player#end
                 * @param {string} message Data containg reason
                 */
                return this.emit("end", message);
            }
            default: return this.emit("warn", `Unexpected event type: ${message.type}`);
        }
    }

    /**
     * Updates the Client's voice state
     * @param {string} channel Channel id
     * @param {Object} [options] selfmute and selfdeaf options
     * @param {boolean} [options.selfmute=false] selfmute option
     * @param {boolean} [options.selfdeaf=false] selfdeaf option
     * @private
     */
    updateVoiceState(channel, { selfmute = false, selfdeaf = false } = {}) {
        this.client.ws.send({
            op: 4,
            shard: this.client.shard ? this.client.shard.id : 0,
            d: {
                guild_id: this.id,
                channel_id: channel,
                self_mute: selfmute,
                self_deaf: selfdeaf
            }
        });
    }

}

module.exports = Player;
