const { SlashCommandBuilder } = require('discord.js');
const db = require('../../database/db');
require('dotenv').config();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('redeem')
        .setDescription('Redeem your code for a reward!')
        .addStringOption(option =>
            option.setName('code')
                .setDescription('The secret code from the survey-wall')
                .setRequired(true)),
    async execute(interaction) {
        const code = interaction.options.getString('code').trim();
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
                return interaction.editReply({ content: 'This code has already been redeemed.' });
            }

            try {
                const member = await interaction.guild.members.fetch(interaction.user.id);
                const role = interaction.guild.roles.cache.get(roleId);

                if (!role) {
                    console.error(`Role with ID ${roleId} not found in guild.`);
                    return interaction.editReply({ content: 'Reward role is not configured correctly on this server.' });
                }

                await member.roles.add(role);

                db.run('UPDATE tokens SET redeemed = 1, user_id = ? WHERE token = ?', [interaction.user.id, code], async (updateErr) => {
                    if (updateErr) {
                        console.error('Error updating token status', updateErr);
                        return interaction.editReply({ content: 'Role granted, but failed to mark code as used. Please contact an admin.' });
                    }
                    
                    await interaction.editReply({ content: 'Code redeemed successfully! You have been granted the reward role.' });
                });

            } catch (discordErr) {
                console.error('Discord API Error:', discordErr);
                await interaction.editReply({ content: 'Failed to assign the role. Make sure I have the correct permissions.' });
            }
        });
    },
};
