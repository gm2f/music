const { REST, Routes } = require('discord.js');
require('dotenv').config();

const commands = [
    {
        name: 'play',
        description: 'Play a song from YouTube',
        options: [
            {
                name: 'query',
                description: 'YouTube URL or song name to search for',
                type: 3, // STRING type
                required: true,
            },
        ],
    },
    {
        name: 'queue',
        description: 'Display the current music queue',
    },
    {
        name: 'skip',
        description: 'Skip the current song',
    },
    {
        name: 'pause',
        description: 'Pause the current song',
    },
    {
        name: 'resume',
        description: 'Resume the paused song',
    },
    {
        name: 'stop',
        description: 'Stop playing and clear the queue',
    },
    {
        name: 'nowplaying',
        description: 'Show the currently playing song',
    },
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {
        console.log('🔄 Registering slash commands...');

        // For global commands (takes up to 1 hour to propagate)
        await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands }
        );
        
        // For guild-specific commands (instant, for testing)
        if (process.env.GUILD_ID) {
            await rest.put(
                Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
                { body: commands }
            );
            console.log('✅ Guild commands registered instantly!');
        }
        
        console.log('✅ Slash commands registered successfully!');
    } catch (error) {
        console.error('❌ Error registering commands:', error);
    }
})();
