const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

// Store queues globally
client.queues = new Map();

// Load commands
client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    client.commands.set(command.name, command);
    console.log(`✅ Loaded command: ${command.name}`);
}

// Ready event
client.once('clientReady', () => {
    console.log(`🎵 ${client.user.tag} is online!`);
    console.log(`📋 Loaded ${client.commands.size} slash commands`);
});

// Interaction handler for slash commands
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(`Error executing ${interaction.commandName}:`, error);

        const errorMessage = {
            content: '❌ There was an error executing this command!',
            flags: 64,
        };

        try {
            if (interaction.deferred || interaction.replied) {
                await interaction.followUp(errorMessage);
            } else {
                await interaction.reply(errorMessage);
            }
        } catch (replyError) {
            console.error('Could not send error reply:', replyError.message);
        }
    }
});

// Prevent unhandled errors from crashing the bot
client.on('error', (error) => {
    console.error('Discord client error:', error.message);
});

process.on('unhandledRejection', (error) => {
    console.error('Unhandled promise rejection:', error);
});

// Login
const TOKEN = process.env.DISCORD_TOKEN;
if (!TOKEN) {
    console.error('❌ DISCORD_TOKEN not found in environment!');
    process.exit(1);
}

client.login(TOKEN);
