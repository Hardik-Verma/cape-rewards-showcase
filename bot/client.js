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
                .setTitle('Verify Role Access');

            const codeInput = new TextInputBuilder()
                .setCustomId('code_input')
                .setLabel('Enter your authorization code')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            const firstActionRow = new ActionRowBuilder().addComponents(codeInput);
            modal.addComponents(firstActionRow);

            await interaction.showModal(modal);
        }
    } else if (interaction.isModalSubmit()) {
        if (interaction.customId === 'modal_redeem') {
            const code = interaction.fields.getTextInputValue('code_input').trim();
            const roleId = process.env.REWARD_ROLE_ID;

            await interaction.deferReply({ ephemeral: true });

            db.get('SELECT * FROM tokens WHERE token = ?', [code], async (err, row) => {
                if (err) {
                    console.error(err);
                    return interaction.editReply({ content: 'There was an error checking your code.' });
                }

                if (!row) {
                    return interaction.editReply({ content: 'Invalid code.' });
                }

                if (row.redeemed) {
                    return interaction.editReply({ content: 'This code has already been verified.' });
                }

                try {
                    const member = await interaction.guild.members.fetch(interaction.user.id);
                    const roleIds = process.env.REWARD_ROLE_ID.split(',').map(id => id.trim());
                    
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

                    db.run('UPDATE tokens SET redeemed = 1, user_id = ? WHERE token = ?', [interaction.user.id, code], async (updateErr) => {
                        if (updateErr) {
                            console.error('Error updating token status', updateErr);
                            return interaction.editReply({ content: 'Role granted, but failed to mark code as used.' });
                        }
                        
                        await interaction.editReply({ content: '✅ Code verified successfully! You have been granted the giveaway role.' });
                    });

                } catch (discordErr) {
                    console.error('Discord API Error:', discordErr);
                    await interaction.editReply({ content: 'Failed to assign the role. Make sure I have the correct permissions.' });
                }
            });
        }
    }
});

// Only login if token is provided
if (process.env.DISCORD_TOKEN && process.env.DISCORD_TOKEN !== 'your_discord_bot_token_here') {
    client.login(process.env.DISCORD_TOKEN);
} else {
    console.log('Skipping Discord bot login (no valid token in .env)');
}

module.exports = client;
