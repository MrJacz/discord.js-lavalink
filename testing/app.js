const { Client } = require("discord.js");
const snekfetch = require("snekfetch");
const config = require("./config.json");
const { PlayerManager } = require("../src/index");
const { inspect } = require("util");
const defaultRegions = {
    asia: ["sydney", "singapore", "japan", "hongkong"],
    eu: ["london", "frankfurt", "amsterdam", "russia", "eu-central", "eu-west"],
    us: ["us-central", "us-west", "us-east", "us-south", "brazil"]
};

class MusicClient extends Client {

    constructor(options) {
        super(options);

        this.player = null;

        this.once("ready", this._ready.bind(this));
    }

    _ready() {
        this.player = new PlayerManager(this, config.nodes, {
            user: this.user.id,
            shards: 1
        });
        console.log("Music Client is Ready!");
    }

}

const client = new MusicClient();

client.login(config.token);

client.on("error", console.error)
    .on("warn", console.warn);

client.on("message", async message => {
    if (message.author.bot || !message.guild) return;
    if (!message.content.startsWith(config.prefix)) return;
    const args = message.content.slice(config.prefix.length).trim().split(/ +/g);
    const command = args.shift().toLowerCase();

    if (command === "join" || command === "play") {
        if (!message.member || !message.member.voiceChannel || !message.member.voiceChannelID) return message.reply("Must be in a voice channel");
        let [...track] = args;
        track = track.join(" ");
        const [song] = await getSong(track);
        const player = await client.player.join({
            guild: message.guild.id,
            channel: message.member.voiceChannelID,
            host: getIdealHost(message.guild.region)
        }, { selfdeaf: true });
        if (!player) throw "No player found...";
        player.play(song.track);
        player.once("error", console.error);
        player.once("end", data => {
            if (data.reason === "REPLACED") return;
            message.channel.send("Song has ended...");
        });
        return message.reply(`Now playing: **${song.info.title}** by *${song.info.author}*`);
    }
    if (command === "leave") {
        await client.player.leave(message.guild.id);
        return message.reply("Successfully left the voice channel");
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
        if (message.author.id !== config.owner) return;
        try {
            const code = args.join(" ");
            const evaled = eval(code);
            return message.channel.send(await clean(evaled), { code: "js" });
        } catch (err) {
            return message.channel.send(`\`ERROR\` \`\`\`js\n${await clean(err)}\n\`\`\``);
        }
    }
});

async function clean(text) {
    if (text instanceof Promise || (Boolean(text) && typeof text.then === "function" && typeof text.catch === "function")) text = await text;
    if (typeof text !== "string") text = inspect(text, { depth: 0, showHidden: false });
    text = text.replace(/`/g, `\`${String.fromCharCode(8203)}`).replace(/@/g, `@${String.fromCharCode(8203)}`);
    return text;
}

async function getSong(string) {
    const res = await snekfetch.get(`http://${config.restnode.host}:${config.restnode.port}/loadtracks`)
        .query({ identifier: string })
        .set("Authorization", config.restnode.password)
        .catch(err => {
            console.error(err);
            return null;
        });
    if (!res) throw "There was an error, try again";
    if (!res.body.length) throw `No tracks found`;
    return res.body;
}

function getRegion(region) {
    region = region.replace("vip-", "");
    for (const key in defaultRegions) {
        const nodes = client.player.nodes.filter(node => node.connected && node.region === key);
        if (!nodes) continue;
        for (const id of defaultRegions[key]) {
            if (id === region || region.startsWith(id) || region.includes(id)) return key;
        }
    }
    return "asia";
}

function getIdealHost(region) {
    region = getRegion(region);
    const foundNode = client.player.nodes.find(node => node.ready && node.region === region);
    if (foundNode) return foundNode.host;
    return client.player.nodes.first().host;
}

process.on("unhandledRejection", console.log)
    .on("error", console.error)
    .on("warn", console.warn);
