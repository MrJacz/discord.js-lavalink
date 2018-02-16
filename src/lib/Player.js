const { EventEmitter } = require("events");

class Player extends EventEmitter {

    constructor(options) {
        super();

        this.options = options || {};
        this.id = options.id;
        this.client = options.client;
        this.manager = options.manager;
        this.node = options.node;
        this.channel = options.channel;
        this.ready = false;
        this.playing = false;
        this.state = {};
        this.track = null;
        this.timestamp = null;
    }

    connect(data) {
        this.node.send({
            op: "voiceUpdate",
            guildId: this.id,
            sessionId: data.session,
            event: data.event
        });
    }

    disconnect(msg) {
        this.playing = false;
        this.stop();
        this.emit("disconnect", msg);
    }

    play(track, options) {
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

    stop() {
        this.node.send({
            op: "stop",
            guildId: this.id
        });
        this.playing = false;
        this.track = null;
    }

    pause(pause) {
        if ((pause && this.paused) || (!pause && !this.paused)) return;
        this.node.send({
            op: "pause",
            guildId: this.id,
            pause
        });
        this.paused = Boolean(pause);
    }

    volume(volume) {
        this.node.send({
            op: "volume",
            guildId: this.id,
            volume
        });
    }

    seek(position) {
        this.node.send({
            op: "seek",
            guildId: this.id,
            position
        });
    }

    end(message) {
        if (message.reason !== "REPLACED") {
            this.playing = false;
            this.track = null;
        }

        this.emit("end", message);
    }

    exception(message) {
        this.emit("error", message);
    }

    stuck(message) {
        this.stop();
        this.emit("end", message);
    }

}

module.exports = Player;
