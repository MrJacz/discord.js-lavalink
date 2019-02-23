const config = require("./config.json");
const fetch = require("node-fetch");
const { URLSearchParams } = require("url");
const { Client } = require("discord.js");
const { PlayerManager } = require("../src/index");

class MusicClient extends Client {

    constructor(...args) {
        super(...args);

        this.player = null;

        this.on("ready", () => {
            this.player = new PlayerManager(client, config.nodes, {
                user: client.user.id,
                shards: 0
            });

            console.log("Bot is online!");
        }).on("error", console.error).on("warn", console.warn);
    }

}
const client = new MusicClient();

client.on("message", async msg => {
    if (msg.author.bot || !msg.guild) return;
    if (!msg.content.startsWith(config.prefix)) return;
    const args = msg.content.slice(config.prefix.length).trim().split(/ +/g);
    const command = args.shift().toLowerCase();

    if (command === "play") {
        if (!msg.member || !msg.member.voice.channel) return msg.reply("You must be in a voice channel for this command.");

        const track = args.join(" ");
        const [song] = await getSongs(`ytsearch: ${track}`);
        if (!song) return msg.reply("No songs found. try again!");

        const player = await client.player.join({
            guild: msg.guild.id,
            channel: msg.member.voice.channel.id,
            host: client.player.nodes.first().host
        }, { selfdeaf: true });

        if (!player) return msg.reply("Could not join");

        player.play(song.track);

        player.once("error", console.error);
        player.once("end", async data => {
            if (data.reason === "REPLACED") return;
            msg.channel.send("Song has ended...");
            await client.player.leave(msg.guild.id);
        });
        return msg.reply(`Now playing: **${song.info.title}** by *${song.info.author}*`);
    }
    if (command === "leave") {
        await client.player.leave(msg.guild.id);
        return msg.reply("Successfully left the voice channel");
    }
    if (command === "pause") {
        const player = client.player.get(msg.guild.id);
        if (!player) return msg.reply("No lavalink player found");
        await player.pause(true);
        return msg.reply("Paused the music");
    }
    if (command === "resume") {
        const player = client.player.get(msg.guild.id);
        if (!player) return msg.reply("No lavalink player found");
        await player.pause(false);
        return msg.reply("Resumed the music");
    }
});

function getSongs(search) {
    const node = client.player.nodes.first();

    const params = new URLSearchParams();
    params.append("identifier", search);

    return fetch(`http://${node.host}:${node.port}/loadtracks?${params.toString()}`, { headers: { Authorization: node.password } })
        .then(res => res.json())
        .then(data => data.tracks)
        .catch(err => {
            console.error(err);
            return null;
        });
}

client.login(config.token);
