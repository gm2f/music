const ytdl = require('ytdl-core');
const { joinVoiceChannel } = require('@discordjs/voice');
const { MusicQueue } = require('../utils/queue');

const queues = new Map();

module.exports = {
    name: 'play',
    description: 'Play a song from YouTube',
    async execute(interaction) {
        await interaction.deferReply();
        
        const query = interaction.options.getString('query');
        
        // Check voice channel
        const voiceChannel = interaction.member.voice.channel;
        if (!voiceChannel) {
            return interaction.editReply('❌ You need to be in a voice channel to play music!');
        }
        
        // Validate YouTube URL
        let url = query;
        if (!ytdl.validateURL(query)) {
            return interaction.editReply('❌ Please provide a valid YouTube URL!');
        }
        
        // Get or create queue
        let queue = queues.get(interaction.guildId);
        
        if (!queue) {
            // Check permissions
            const permissions = voiceChannel.permissionsFor(interaction.client.user);
            if (!permissions.has('Connect') || !permissions.has('Speak')) {
                return interaction.editReply('❌ I need permissions to join and speak in your voice channel!');
            }
            
            queue = new MusicQueue(
                interaction.guildId,
                voiceChannel,
                interaction.channel
            );
            
            // Join voice channel
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
                console.error(error);
                return interaction.editReply('❌ Could not join your voice channel!');
            }
        } else {
            const botVoiceChannel = interaction.guild.members.me.voice.channel;
            if (botVoiceChannel && botVoiceChannel.id !== voiceChannel.id) {
                return interaction.editReply('❌ You need to be in the same voice channel as the bot!');
            }
        }
        
        // Add song to queue
        const song = {
            url: url,
            requestedBy: interaction.user.tag,
        };
        
        await queue.addSong(song);
        
        if (queue.songs.length > 1) {
            interaction.editReply(`✅ Added to queue: **${song.title || query}**\n📋 Position: ${queue.songs.length}`);
        } else {
            interaction.editReply(`🎵 Playing: **${song.title || query}**`);
        }
    },
};
