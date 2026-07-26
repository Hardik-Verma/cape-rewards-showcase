const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('survey')
        .setDescription('Generate a survey-wall embed (Admin only)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addRoleOption(option => 
            option.setName('role')
                .setDescription('The role to advertise in the embed')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('duration')
                .setDescription('Estimated time to complete (e.g. "2 minutes")')
                .setRequired(true)),
    
    async execute(interaction) {
        const role = interaction.options.getRole('role');
        
        const embed = new EmbedBuilder()
            .setTitle('🔒 Unlock Giveaway Entries')
            .setDescription(`Complete a quick task and receive the ${role} role to enter!\n\n**📖 How to Unlock**\n1. Click **Generate Key** to visit our portal.\n2. Complete the short survey to support us.\n3. Copy the generated secret key.\n4. Click **Redeem Key** below and paste your code!\n\n*Need Help? Go to #channel to get instructions on how to enter!*`)
            .setColor('#3b82f6')
            .setFooter({ text: 'Powered by Cape Rewards' })
            .setTimestamp();

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setLabel('Generate Key')
                    .setURL('https://cape-rewards-showcase.onrender.com')
                    .setStyle(ButtonStyle.Link),
                new ButtonBuilder()
                    .setCustomId('btn_redeem')
                    .setLabel('Redeem Key')
                    .setStyle(ButtonStyle.Primary)
            );

        await interaction.reply({ embeds: [embed], components: [row] });
    },
};
