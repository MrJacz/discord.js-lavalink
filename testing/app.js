const { Client } = require("discord.js");
const config = require("./config.json");
const { PlayerManager } = require("../src/index");

class MusicClient extends Client {

    constructor(options) {
        super(options);

        this.player = null;

        this.ready = false;
        this.once("ready", this._ready.bind(this));
    }

    _ready() {
        this.player = new PlayerManager(this, config.nodes, {
            userId: this.user.id,
            shardCount: 1,
            region: "us"
        });
    }

}

const client = new MusicClient();

client.login(config.token);

client.on("error", console.error)
    .on("warn", console.warn)
    .on("debug", console.log);
