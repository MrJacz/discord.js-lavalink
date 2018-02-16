const { Client } = require("discord.js");
const config = require("./config.json");
const { PlayerManager } = require("../src/index");
const { inspect } = require("util");

class MusicClient extends Client {

    constructor(options) {
        super(options);

        this.player = null;

        this.ready = false;
        this.once("ready", this._ready.bind(this));
    }

    _ready() {
        this.player = new PlayerManager(this, config.nodes, {
            user: this.user.id,
            shard: 1,
            region: "us"
        });
    }

}

const client = new MusicClient();

client.login(config.token);

client.on("error", console.error)
    .on("warn", console.warn)
    .on("debug", console.log);

client.on("message", async message => {
    if (message.author.bot || !message.guild || message.author.id !== config.owner) return;
    const args = message.content.slice(config.prefix.length).trim().split(/ +/g);
    const command = args.shift().toLowerCase();

    if (command === "join") {
        const [track] = args;
        const channel = message.member.voiceChannel;
        if (!channel) return message.reply("Must be in a voice channel");
        await client.player.join({
            op: 4,
            d: {
                guild_id: message.guild.id,
                channel_id: channel.id,
                self_mute: false,
                self_deaf: false
            },
            host: "localhost"
        });
        const player = client.player.get(message.guild.id);
        if (!player) return message.reply("No lavalink player found");
        await player.play(track);
    }
    if (command === "eval" || command === "ev") {
        try {
            const code = args.join(" ");
            const evaled = eval(code);
            const cleanedEval = await clean(evaled);
            return message.channel.send(cleanedEval, { code: "js" });
        } catch (err) {
            const cleanedError = await clean(err);
            return message.channel.send(`\`ERROR\` \`\`\`js\n${cleanedError}\n\`\`\``);
        }
    }
});

async function clean(text) {
    if (isPromise(text)) text = await text;
    if (typeof text !== "string") text = inspect(text, { depth: 0, showHidden: false });
    text = text.replace(/`/g, `\`${String.fromCharCode(8203)}`).replace(/@/g, `@${String.fromCharCode(8203)}`);
    return text;
}

function isPromise(input) {
    if (input instanceof Promise) return true;
    return Boolean(input) && isFunction(input.then) && isFunction(input.catch);
}

function isFunction(input) {
    return typeof input === "function";
}

/*
    Avoid your bot from crashing on any errors
*/
process.on("unhandledRejection", error => console.log(`unhandledRejection:\n${error.stack}`))
    .on("error", error => console.log(`Error:\n${error.stack}`))
    .on("warn", error => console.log(`Warning:\n${error.stack}`));
