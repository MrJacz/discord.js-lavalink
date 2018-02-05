const WebSocket = require("ws");
const { EventEmitter } = require("events");

/**
 * Lavalink Websocket
 * @extends {EventEmitter}
 */
class LavaLink extends EventEmitter {

    constructor(options) {
        super();

        this.host = options.host;
        this.port = options.port || 80;
        this.address = `ws://${options.host}:${options.port}`;
        this.region = options.region || null;
        this.userId = options.userId;
        this.shardCount = options.shardCount;
        this.password = options.password || "youshallnotpass";
        this.connected = false;
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

        this.ws.on("open", () => this._onOpen());
        this.ws.on("close", (code, reason) => this._onClose(code, reason));
        this.ws.on("message", data => this._onMessage(data));
        this.ws.on("error", error => this.emit("error", error));
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

    destroy() {
        if (!this.ws) return false;
        this.ws.close();
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


}

module.exports = LavaLink;
