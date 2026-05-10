const queues = new Map();

module.exports = {
    name: 'pause',
    description: 'Pause the current song',
    async execute(interaction) {
        const queue = queues.get(interaction.guildId);
        
        if (!queue || !queue.playing) {
            return interaction.reply('❌ No music is currently playing!');
        }
        
        if (!interaction.member.voice.channel) {
            return interaction.reply('❌ You need to be in a voice channel to pause music!');
        }
        
        const botVoiceChannel = interaction.guild.members.me.voice.channel;
        if (!botVoiceChannel || botVoiceChannel.id !== interaction.member.voice.channel.id) {
            return interaction.reply('❌ You need to be in the same voice channel as the bot to pause!');
        }
        
        const paused = queue.pause();
        if (paused) {
            interaction.reply('⏸️ Music paused! Use `/resume` to continue.');
        } else {
            interaction.reply('⚠️ Music is already paused!');
        }
    },
};
