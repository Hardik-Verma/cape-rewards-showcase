const { SlashCommandBuilder } = require('discord.js');
const { Order } = require('../../database/db');
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
        const roleIds = (process.env.REWARD_ROLE_ID || '').split(',').map(id => id.trim()).filter(Boolean);

        await interaction.deferReply({ ephemeral: true });

        if (roleIds.length === 0) {
            return interaction.editReply({ content: 'Reward roles are not configured on this server.' });
        }

        try {
            const order = await Order.findOne({ token: code });
            if (!order) {
                return interaction.editReply({ content: 'Invalid code.' });
            }

            if (order.redeemed) {
                return interaction.editReply({ content: 'This code has already been redeemed.' });
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
                console.error('Roles not found in guild.');
                return interaction.editReply({ content: 'Reward role is not configured correctly on this server.' });
            }

            order.redeemed = true;
            order.redeemed_by = interaction.user.id;
            await order.save();

            await interaction.editReply({ content: 'Code redeemed successfully! You have been granted the reward role.' });
        } catch (discordErr) {
            console.error('Error during redemption:', discordErr);
            await interaction.editReply({ content: 'Failed to assign the role. Make sure I have the correct permissions.' });
        }
    },
};