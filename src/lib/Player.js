const { EventEmitter } = require("events");

/**
 * LavaLink Player
 * @extends {EventEmitter}
 */
class Player extends EventEmitter {

    /**
     * LavaLink Player Options
     * @param {Object} options Player Options
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
         * @type {String}
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
         * @type {Node}
         */
        this.node = options.node;
        /**
         * The current channel id
         * @type {String}
         */
        this.channel = options.channel;
        /**
         * Playing boolean
         * @type {Boolean}
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
         * @type {Number}
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
     * @param {String} msg Disconnect reason
     */
    disconnect(msg) {
        this.playing = false;
        this.stop();
        this.emit("disconnect", msg);
    }

    /**
     * Plays a song
     * @param {String} track A Base64 string from LavaLink API
     * @param {Object} [options] Other options
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
     * @param {Boolean} [pause=true] Whether to resume or pause the player
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
     * @param {Number} volume Volume
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
     * @param {Number} position The position to seek to
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
     * @param {String} channel Channel id
     * @param {Boolean} [reactive=false] Whether to switch channel
     * @return {Boolean}
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
                this.emit("end", message);
                return;
            }
            case "TrackExceptionEvent": return this.emit("error", message);
            case "TrackStuckEvent": {
                this.stop();
                this.emit("end", message);
                return;
            }
            default: return this.emit("warn", `Unexpected event type: ${message.type}`);
        }
    }

    /**
     * Updates the Client's voice state
     * @param {String} channel Channel id
     * @param {Object} [options] selfmute and selfdeaf options
     * @param {Boolean} [options.selfmute=false] selfmute option
     * @param {Boolean} [options.selfdeaf=false] selfdeaf option
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
