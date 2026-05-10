module.exports = {
    name: 'queue',
    description: 'Display the current music queue',
    async execute(interaction) {
        const queue = interaction.client.queues.get(interaction.guildId);

        if (!queue || queue.songs.length === 0) {
            return interaction.reply('📭 The queue is empty! Use `/play` to add some songs.');
        }

        const currentSong = queue.currentSong;
        const upcomingSongs = queue.songs.slice(1, 11);

        let queueList = `**Now Playing:**\n🎵 ${currentSong?.title || 'None'}\n\n`;

        if (upcomingSongs.length > 0) {
            queueList += `**Up Next (${queue.songs.length - 1} songs):**\n`;
            upcomingSongs.forEach((song, index) => {
                queueList += `${index + 1}. ${song.title}\n`;
            });
        } else {
            queueList += 'No more songs in queue.';
        }

        if (queue.songs.length > 11) {
            queueList += `\n\nAnd ${queue.songs.length - 11} more songs...`;
        }

        const embed = {
            color: 0x00ff00,
            title: '🎵 Music Queue',
            description: queueList,
            footer: {
                text: `Total songs: ${queue.songs.length}`
            },
            timestamp: new Date()
        };

        interaction.reply({ embeds: [embed] });
    },
};
