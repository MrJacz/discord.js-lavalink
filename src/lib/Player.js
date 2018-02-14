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
    }

    connect(data) {
        this.emit("connect");
        this.node.send({
            op: "voiceUpdate",
            guildId: data.guildId,
            sessionId: data.sessionId,
            event: data.event
        });

        process.nextTick(() => this.emit("ready"));
    }

    disconnect(msg) {
        this.playing = false;
        this.stop();
        this.emit("disconnect", msg);
    }

    stop() {
        this.node.send({
            op: "stop",
            guildId: this.id
        });
        this.playing = false;
        this.lastTrack = this.track;
        this.track = null;
    }

    switchChannel(channel) {
        if (typeof channel === "string") channel = this.client.channels.find(c => c.id === channel && c.type === "voice");
        if (!channel) return;
        if (this.channel.id === channel.id) return;
        this.channel = channel;
        this.updateVoiceState(channel.id);
    }

    updateVoiceState(channelId, selfMute, selfDeaf) {
        this.client.ws.send({
            op: 4, d: {
                guild_id: this.id,
                channel_id: channelId || null,
                self_mute: Boolean(selfMute),
                self_deaf: Boolean(selfDeaf)
            }
        });
    }

}

module.exports = Player;
