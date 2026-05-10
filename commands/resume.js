const queues = new Map();

module.exports = {
    name: 'resume',
    description: 'Resume the paused song',
    async execute(interaction) {
        const queue = queues.get(interaction.guildId);
        
        if (!queue || !queue.playing) {
            return interaction.reply('❌ No music is currently playing!');
        }
        
        if (!interaction.member.voice.channel) {
            return interaction.reply('❌ You need to be in a voice channel to resume music!');
        }
        
        const resumed = queue.resume();
        if (resumed) {
            interaction.reply('▶️ Music resumed!');
        } else {
            interaction.reply('⚠️ Music is not paused!');
        }
    },
};
