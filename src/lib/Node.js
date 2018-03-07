const WebSocket = require("ws");
const { EventEmitter } = require("events");

/**
 * Lavalink Websocket
 * @extends {EventEmitter}
 */
class Node extends EventEmitter {

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
        this.address = options.address || `ws://${options.host}:${options.port}`;
        /**
         * Region
         * @type {?String}
         */
        this.region = options.region || null;
        /**
         * User ID from Discord
         * @type {String}
         */
        this.user = options.user;
        /**
         * Lavalink node(Shard) count
         * @type {Number}
         */
        this.shards = options.shards;
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
         * @type {?WebSocket}
         */
        this.ws = null;
        /**
         * The interval to use for auto Reconnecting
         * @type {Number}
         */
        this.autoReconnectInterval = options.reconnectInterval || 5000;
        /**
         * Player stats
         * @type {Object}
         */
        this.stats = {
            players: 0,
            playingPlayers: 0
        };

        this.connect();
    }
    /**
     * Connects to the WebSocket server
     */
    connect() {
        this.ws = new WebSocket(this.address, {
            headers: {
                "User-Id": this.user,
                "Num-Shards": this.shards,
                Authorization: this.password
            }
        });

        this.ws.on("message", this._onMessage.bind(this));
        this.ws.on("open", this._onOpen.bind(this));
        this.ws.on("close", this._onClose.bind(this));
        this.ws.on("error", this._onError.bind(this));
    }

    /**
     * Sends data to the Lavalink Node
     * @param {Object} data Object to send
     * @returns {Boolean}
     */
    send(data) {
        if (!this.ws) return false;
        let payload;
        try {
            payload = JSON.stringify(data);
        } catch (err) {
            this.emit("error", "Unable to stringify payload.");
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
        this.ws.close(1000, "destroy");
        this.ws = null;
        return true;
    }

    /**
     * Reconnects the websocket
     * @private
     */
    reconnect() {
        this.ws.removeAllListeners();
        setTimeout(() => {
            this.emit("reconnecting");
            this.connect();
        }, this.autoReconnectInterval);
    }
    /**
     * Function for the onOpen WS event
     * @private
     */
    _onOpen() {
        this.connected = true;
        this.emit("ready");
    }

    /**
     * Function for the onClose event
     * @param {Number} code WebSocket closing code (idk tbh)
     * @param {?String} reason reason
     * @returns {void}
     * @private
     */
    _onClose(code, reason) {
        this.connected = false;
        if (code !== 1000) return this.reconnect();
        this.ws = null;
        this.emit("disconnect", reason);
    }

    /**
     * Function for the onMessage event
     * @param {Object} msg Message object
     * @returns {void}
     * @private
     */
    async _onMessage(msg) {
        let data;
        try {
            data = JSON.parse(msg);
        } catch (err) {
            return this.emit("error", "Unable to parse payload.");
        }
        if (data.op === "stats") this.stats = data;
        this.emit("message", data);
    }
    /**
     * Function for onError event
     * @param {Error} error error from WS
     * @private
     */
    _onError(error) {
        if (error.message.includes("ECONNREFUSED") || (error.code && error.code === "ECONNREFUSED")) this.reconnect();
        this.emit("error", error);
    }


}

module.exports = Node;
