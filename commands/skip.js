module.exports = {
    name: 'skip',
    description: 'Skip the current song',
    async execute(interaction) {
        const queue = interaction.client.queues.get(interaction.guildId);

        if (!queue || !queue.playing) {
            return interaction.reply('❌ No music is currently playing!');
        }

        if (!interaction.member.voice.channel) {
            return interaction.reply('❌ You need to be in a voice channel to skip songs!');
        }

        const botVoiceChannel = interaction.guild.members.me.voice.channel;
        if (!botVoiceChannel || botVoiceChannel.id !== interaction.member.voice.channel.id) {
            return interaction.reply('❌ You need to be in the same voice channel as the bot to skip!');
        }

        const skippedSong = queue.currentSong;
        queue.skip();

        interaction.reply(`⏭️ Skipped: **${skippedSong?.title || 'Current song'}**`);
    },
};
