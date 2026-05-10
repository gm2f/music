module.exports = {
    name: 'stop',
    description: 'Stop playing and clear the queue',
    async execute(interaction) {
        const queue = interaction.client.queues.get(interaction.guildId);

        if (!queue || !queue.playing) {
            return interaction.reply('❌ No music is currently playing!');
        }

        if (!interaction.member.voice.channel) {
            return interaction.reply('❌ You need to be in a voice channel to stop music!');
        }

        const botVoiceChannel = interaction.guild.members.me.voice.channel;
        if (!botVoiceChannel || botVoiceChannel.id !== interaction.member.voice.channel.id) {
            return interaction.reply('❌ You need to be in the same voice channel as the bot to stop!');
        }

        queue.stop();
        interaction.client.queues.delete(interaction.guildId);

        interaction.reply('⏹️ Music stopped and queue cleared!');
    },
};
