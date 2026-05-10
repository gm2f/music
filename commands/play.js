const play = require('play-dl');
const { joinVoiceChannel } = require('@discordjs/voice');
const { MusicQueue } = require('../utils/queue');
const { spawn } = require('child_process');

const YTDLP_ARGS = ['--extractor-args', 'youtube:player_client=android', '-q', '--no-warnings'];

function ytdlpSearch(query) {
    return new Promise((resolve, reject) => {
        const proc = spawn('python3', [
            '-m', 'yt_dlp',
            ...YTDLP_ARGS,
            '--dump-json',
            `ytsearch1:${query}`,
        ], { stdio: ['ignore', 'pipe', 'ignore'] });

        let output = '';
        proc.stdout.on('data', d => output += d);
        proc.on('close', () => {
            if (output) {
                try { resolve(JSON.parse(output)); }
                catch (e) { resolve(null); }
            } else {
                resolve(null);
            }
        });
        proc.on('error', () => resolve(null));
    });
}

module.exports = {
    name: 'play',
    description: 'Play a song from YouTube',
    async execute(interaction) {
        await interaction.deferReply();

        const query = interaction.options.getString('query');

        const voiceChannel = interaction.member.voice.channel;
        if (!voiceChannel) {
            return interaction.editReply('❌ You need to be in a voice channel to play music!');
        }

        const queues = interaction.client.queues;
        let queue = queues.get(interaction.guildId);

        // Resolve URL — handle direct URLs, playlist-tagged URLs, and search queries
        let songUrl;
        const validation = play.yt_validate(query);

        if (validation === 'video' || validation === 'playlist') {
            // Normalize to full URL — handles youtu.be, ?v=xxx&list=yyy, etc.
            const shortMatch = query.match(/youtu\.be\/([^?&]+)/);
            const longMatch = query.match(/[?&]v=([^&]+)/);
            const videoId = shortMatch?.[1] ?? longMatch?.[1];
            songUrl = videoId
                ? `https://www.youtube.com/watch?v=${videoId}`
                : query;
        } else {
            // Search using yt-dlp (android client bypasses bot detection)
            const result = await ytdlpSearch(query);
            if (!result) {
                return interaction.editReply('❌ No results found for that search!');
            }
            songUrl = result.webpage_url;
        }

        if (!queue) {
            const permissions = voiceChannel.permissionsFor(interaction.client.user);
            if (!permissions.has('Connect') || !permissions.has('Speak')) {
                return interaction.editReply('❌ I need permissions to join and speak in your voice channel!');
            }

            queue = new MusicQueue(
                interaction.guildId,
                voiceChannel,
                interaction.channel
            );

            try {
                const connection = joinVoiceChannel({
                    channelId: voiceChannel.id,
                    guildId: interaction.guildId,
                    adapterCreator: interaction.guild.voiceAdapterCreator,
                    selfDeaf: true,
                });

                queue.connection = connection;
                connection.subscribe(queue.player);
                queues.set(interaction.guildId, queue);
            } catch (error) {
                console.error('Voice connection error:', error);
                queues.delete(interaction.guildId);
                return interaction.editReply('❌ Could not join your voice channel!');
            }
        } else {
            const botVoiceChannel = interaction.guild.members.me.voice.channel;
            if (botVoiceChannel && botVoiceChannel.id !== voiceChannel.id) {
                return interaction.editReply('❌ You need to be in the same voice channel as the bot!');
            }
        }

        const song = {
            url: songUrl,
            requestedBy: interaction.user.tag,
        };

        await queue.addSong(song);

        if (queue.songs.length > 1) {
            interaction.editReply(`✅ Added to queue: **${song.title || query}**\n📋 Position: ${queue.songs.length}`);
        } else {
            interaction.editReply(`🎵 Now playing: **${song.title || query}**`);
        }
    },
};
