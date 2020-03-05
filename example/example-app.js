const config = require("./config.json");
const fetch = require("node-fetch");
const { inspect } = require("util");
const { URLSearchParams } = require("url");
const { Client } = require("discord.js");
const { PlayerManager, Player } = require("../dist/index.js");

class MusicClient extends Client {
    constructor(...args) {
        super(...args);

        this.player = null;

        this.on("ready", () => {
            this.player = new PlayerManager(this, config.nodes, {
                user: this.user.id,
                shards: 1,
                Player: ExamplePlayer
            });

            this.player.on("ready", node => console.log(`${node.host}: Is ready`));
            this.player.on("disconnect", (node, event) => console.log(`${node.host}: Disconnected with code ${event.code} and reason ${event.reason || "No Reason Specified"}`));
            this.player.on("raw", (node, data) => console.log(node.host, data));
            this.player.on("error", (node, error) => console.error(node.host, error));

            console.log("Bot is online!");
        })
            .on("error", console.error)
            .on("warn", console.warn);
    }
}
const client = new MusicClient();

client.on("message", async msg => {
    if (msg.author.bot || !msg.guild) return;
    if (!msg.content.startsWith(config.prefix)) return;
    const args = msg.content
        .slice(config.prefix.length)
        .trim()
        .split(/ +/g);
    const command = args.shift().toLowerCase();

    if (command === "play") {
        if (!msg.member || !msg.member.voice.channel) return msg.reply("You must be in a voice channel for this command.");

        const track = args.join(" ");
        const [song] = await getSongs(`ytsearch:${track}`);
        if (!song) return msg.reply("No songs found. try again!");

        const player = client.player.join(
            {
                guild: msg.guild.id,
                channel: msg.member.voice.channel.id,
                host: client.player.nodes.first().host
            },
            { selfdeaf: true }
        );

        if (!player) return msg.reply("Could not join");

        await player.play(song.track);

        player.textChannel = msg.channel;

        return msg.reply(`Now playing: **${song.info.title}** by *${song.info.author}*`);
    }
    if (command === "leave") {
        await client.player.leave(msg.guild.id);
        return msg.reply("Successfully left the voice channel");
    }
    if (command === "pause") {
        const player = client.player.players.get(msg.guild.id);
        if (!player) return msg.reply("No lavalink player found");
        await player.pause(true);
        return msg.reply("Paused the music");
    }
    if (command === "resume") {
        const player = client.player.players.get(msg.guild.id);
        if (!player) return msg.reply("No lavalink player found");
        await player.resume();
        return msg.reply("Resumed the music");
    }
    if (command === "bassboost") {
        const player = client.player.players.get(msg.guild.id);
        if (!player) return msg.reply("No lavalink player found");
        // [0, 0.30, 1, 0.20]
        await player.equalizer([
            { band: 0, gain: 0.3 },
            { band: 1, gain: 0.2 }
        ]);
        return msg.reply("Have now bass boosted sick beat");
    }
});

function getSongs(search) {
    const node = client.player.nodes.first();

    const params = new URLSearchParams();
    params.append("identifier", search);

    return fetch(`http://${node.host}:${node.port}/loadtracks?${params}`, { headers: { Authorization: node.password } })
        .then(res => res.json())
        .then(data => data.tracks)
        .catch(err => {
            console.error(err);
            return null;
        });
}

class ExamplePlayer extends Player {
    constructor(...args) {
        super(...args);

        this.textChannel = null;

        this.on("end", async data => {
            if (data.reason === "REPLACED" || data.reason === "STOPPED") return;
            await client.player.leave(this.id);
            await this.textChannel.send("Song has ended...");
        }).on("error", console.error);
    }
}

client.login(config.token);
