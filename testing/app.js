const { Client, Collection } = require("discord.js");
const snekfetch = require("snekfetch");
const config = require("./config.json");
const { PlayerManager } = require("../src/index");
const { inspect } = require("util");

class MusicClient extends Client {

    constructor(options) {
        super(options);

        this.player = null;

        this.ready = false;

        this.music = new Collection();

        this.once("ready", this._ready.bind(this));
    }

    _ready() {
        this.player = new PlayerManager(this, config.nodes, {
            user: this.user.id,
            shards: 1,
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

    if (command === "join" || command === "play") {
        let [...track] = args;
        track = track.join(" ");
        const channel = message.member.voiceChannel;
        if (!channel) return message.reply("Must be in a voice channel");

        const [song] = await getSong(track);
        await handle(song, message);
        return message.reply(`Now playing: **${song.info.title}** by *${song.info.author}*`);
    }
    if (command === "leave") {
        await client.player.leave(message.guild.id);
        return message.reply("Sucessfully left the voice channel");
    }
    if (command === "pause") {
        const player = client.player.get(message.guild.id);
        if (!player) return message.reply("No lavalink player found");
        await player.pause(true);
        return message.reply("Paused the music");
    }
    if (command === "resume") {
        const player = client.player.get(message.guild.id);
        if (!player) return message.reply("No lavalink player found");
        await player.pause(false);
        return message.reply("Resumed the music");
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
    if (typeof text !== "string") text = inspect(text, { depth: 1, showHidden: false });
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

async function getSong(string) {
    const res = await snekfetch.get(`http://localhost:2333/loadtracks?identifier=ytsearch:${string}`)
        .set("Authorization", "youshallnotpass")
        .catch(() => null);
    if (!res.body.length) throw `No tracks found`;
    return res.body;
}

async function handle(song, msg) {
    const player = await client.player.join({
        guild: msg.guild.id,
        channel: msg.member.voiceChannel.id,
        host: "localhost"
    }, { selfdeaf: true });
    player.play(song.track);
    player.on("error", console.error);
    player.on("end", async () => {
        msg.channel.send("Song has ended... leaving voice channel");
        await client.player.leave(msg.guild.id);
    });
    client.music.set(msg.guild.id, {
        songs: [song],
        player
    });
    return player;
}

process.on("unhandledRejection", error => console.log(`unhandledRejection:\n${error.stack}`))
    .on("error", error => console.log(`Error:\n${error.stack}`))
    .on("warn", error => console.log(`Warning:\n${error.stack}`));
