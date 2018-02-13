const WebSocket = require("ws");
const { EventEmitter } = require("events");

/**
 * Lavalink Websocket
 * @extends {EventEmitter}
 */
class LavaLink extends EventEmitter {

    /**
     * LavaLink options
     * @param {Object} options LavaLink options
     */
    constructor(options) {
        super();
        /**
         * Host
         * @type {String}
         */
        this.host = options.host;
        /**
         * Port
         * @type {Number|String}
         */
        this.port = options.port || 80;
        /**
         * Address
         * @type {String}
         */
        this.address = `ws://${options.host}:${options.port}`;
        /**
         * Region
         * @type {?String}
         */
        this.region = options.region || null;
        /**
         * User ID from Discord
         * @type {String}
         */
        this.userId = options.userId;
        /**
         * Lavalink node(Shard) count
         * @type {Number}
         */
        this.shardCount = options.shardCount;
        /**
         * Lavalink Node(Shard) Password
         * @type {String}
         */
        this.password = options.password || "youshallnotpass";
        /**
         * If the lavalink websocket is connected or not
         * @type {Boolean}
         */
        this.connected = false;
        /**
         * The WebSocket
         * @type {WebSocket}
         */
        this.ws = null;

        this.connect();
    }
    /**
     * Connects to the WebSocket server
     * @returns {void}
     */
    connect() {
        this.ws = new WebSocket(this.address, {
            headers: {
                "User-Id": this.userId,
                "Num-Shards": this.shardCount,
                Authorization: this.password
            }
        });

        this.ws.onmessage = this._onMessage.bind(this);
        this.ws.onopen = this._onOpen.bind(this);
        this.ws.onerror = this._onError.bind(this);
        this.ws.onclose = this._onClose.bind(this);
    }

    send(data) {
        if (!this.ws) return false;
        let payload;
        try {
            payload = JSON.stringify(data);
        } catch (error) {
            this.emit("error", error);
            return false;
        }

        this.ws.send(payload);
        return true;
    }
    /**
     * Destroys the WebSocket
     * @returns {Boolean}
     */
    destroy() {
        if (!this.ws) return false;
        this.ws.close();
        this.ws = null;
        return true;
    }

    _onOpen() {
        this.connected = true;
        this.emit("ready");
    }

    _onClose(code, reason) {
        this.connected = false;
        delete this.ws;
        this.emit("disconnect", code, reason);
    }

    _onMessage(msg) {
        let data;
        try {
            data = JSON.parse(msg);
        } catch (error) {
            return this.emit("error", error);
        }

        this.emit("message", data);
    }

    _onError(error) {
        this.emit("error", error);
    }


}

module.exports = LavaLink;
