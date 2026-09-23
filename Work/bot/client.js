const { Client, GatewayIntentBits, Collection, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const db = require('../database/db');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers
    ]
});

client.commands = new Collection();

const commandsPath = path.join(__dirname, 'commands');
if (fs.existsSync(commandsPath)) {
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
        } else {
            console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
        }
    }
}

client.once('ready', async () => {
    console.log(`Ready! Logged in as ${client.user.tag}`);
    
    // Auto-register slash commands
    try {
        const { REST, Routes } = require('discord.js');
        const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
        const commandsData = client.commands.map(cmd => cmd.data.toJSON());
        
        console.log(`Started refreshing ${commandsData.length} application (/) commands.`);
        
        const data = await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: commandsData },
        );
        
        console.log(`Successfully reloaded ${data.length} application (/) commands.`);
    } catch (error) {
        console.error('Error registering slash commands:', error);
    }
});

client.on('interactionCreate', async interaction => {
    if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);

        if (!command) {
            console.error(`No command matching ${interaction.commandName} was found.`);
            return;
        }

        try {
            await command.execute(interaction);
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
        }
    } else if (interaction.isButton()) {
        if (interaction.customId === 'btn_redeem') {
            const modal = new ModalBuilder()
                .setCustomId('modal_redeem')
                .setTitle('Verify Reward Code');

            const codeInput = new TextInputBuilder()
                .setCustomId('code_input')
                .setLabel('Enter your reward code')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            const firstActionRow = new ActionRowBuilder().addComponents(codeInput);
            modal.addComponents(firstActionRow);

            await interaction.showModal(modal);
        }
    } else if (interaction.isModalSubmit()) {
        if (interaction.customId === 'modal_redeem') {
            const code = interaction.fields.getTextInputValue('code_input').trim();
            const roleIds = (process.env.REWARD_ROLE_ID || '').split(',').map(id => id.trim()).filter(Boolean);

            await interaction.deferReply({ ephemeral: true });

            if (roleIds.length === 0) {
                return interaction.editReply({ content: 'Reward roles are not configured on this server.' });
            }

            try {
                const order = await db.Order.findOne({ token: code });
                if (!order) {
                    return interaction.editReply({ content: 'Invalid code.' });
                }

                if (order.redeemed) {
                    return interaction.editReply({ content: 'This code has already been verified.' });
                }

                const member = await interaction.guild.members.fetch(interaction.user.id);

                let successCount = 0;
                for (const rId of roleIds) {
                    if (!rId) continue;
                    const role = interaction.guild.roles.cache.get(rId);
                    if (role) {
                        await member.roles.add(role).catch(err => console.error(`Failed to add role ${rId}`, err));
                        successCount++;
                    }
                }

                if (successCount === 0) {
                    return interaction.editReply({ content: 'Reward role is not configured correctly on this server.' });
                }

                order.redeemed = true;
                order.redeemed_by = interaction.user.id;
                await order.save();

                await interaction.editReply({ content: '✅ Code verified successfully! You have been granted the reward role.' });
            } catch (error) {
                console.error('Error during redemption:', error);
                await interaction.editReply({ content: 'Failed to assign the role. Make sure I have the correct permissions.' });
            }
        }
    }
});

// Only login if token is provided
if (process.env.DISCORD_TOKEN) {
    client.login(process.env.DISCORD_TOKEN);
} else {
    console.log('Skipping Discord bot login (no valid token in .env)');
}

module.exports = client;