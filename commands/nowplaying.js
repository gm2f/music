module.exports = {
    name: 'nowplaying',
    description: 'Show the currently playing song',
    async execute(interaction) {
        const queue = interaction.client.queues.get(interaction.guildId);

        if (!queue || !queue.playing || !queue.currentSong) {
            return interaction.reply('❌ No music is currently playing!');
        }

        const song = queue.currentSong;
        const status = queue.paused ? '⏸️ Paused' : '▶️ Playing';

        const embed = {
            color: 0x1db954,
            title: '🎵 Now Playing',
            description: `**${song.title || song.url}**`,
            fields: [
                { name: 'Status', value: status, inline: true },
                { name: 'Requested by', value: song.requestedBy || 'Unknown', inline: true },
            ],
            timestamp: new Date()
        };

        interaction.reply({ embeds: [embed] });
    },
};
