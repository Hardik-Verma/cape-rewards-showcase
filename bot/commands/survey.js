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
        .addIntegerOption(option => 
            option.setName('hours')
                .setDescription('Hours until the survey expires (0-24)')
                .setMinValue(0)
                .setMaxValue(24)
                .setRequired(true))
        .addIntegerOption(option => 
            option.setName('minutes')
                .setDescription('Minutes until the survey expires (0-59)')
                .setMinValue(0)
                .setMaxValue(59)
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('seconds')
                .setDescription('Number of seconds')
                .setRequired(false)
                .setMinValue(0)
                .setMaxValue(59))
        .addIntegerOption(option =>
            option.setName('days')
                .setDescription('Number of days')
                .setRequired(false)
                .setMinValue(0))
        .addIntegerOption(option =>
            option.setName('months')
                .setDescription('Number of months')
                .setRequired(false)
                .setMinValue(0))
        .addBooleanOption(option =>
            option.setName('permanent')
                .setDescription('Make this message permanent (no expiration)')
                .setRequired(false)),
    
    async execute(interaction) {
        // Only allow administrators
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ content: '❌ You need Administrator permissions to use this command.', ephemeral: true });
        }

        const role = interaction.options.getRole('role');
        const hours = interaction.options.getInteger('hours') || 0;
        const minutes = interaction.options.getInteger('minutes') || 0;
        const seconds = interaction.options.getInteger('seconds') || 0;
        const days = interaction.options.getInteger('days') || 0;
        const months = interaction.options.getInteger('months') || 0;
        const permanent = interaction.options.getBoolean('permanent') || false;

        // Create the embed and buttons
        const embed = new EmbedBuilder()
            .setTitle('🎉 Giveaway Entry Required')
            .setColor('#dc2626') // Matching CAPEVERSE red
            .setFooter({ text: 'CAPEVERSE | Automated Verification System' })
            .setTimestamp();

        if (permanent) {
            embed.setDescription(`To participate in the giveaway, you must claim the ${role} role!\n\n**Instructions**\n1. Click **Claim Role** below to visit our secure portal.\n2. Complete the quick verification process to authenticate your session.\n3. Return here and click **Verify Role** with your completion code.\n\n*If you experience issues, please open a support ticket.*`);
        } else {
            const totalSeconds = seconds + (minutes * 60) + (hours * 3600) + (days * 86400) + (months * 30 * 86400);
            
            if (totalSeconds === 0) {
                return interaction.reply({ content: '❌ You must specify a duration greater than 0, or select permanent.', ephemeral: true });
            }

            const endTime = Math.floor(Date.now() / 1000) + totalSeconds;
            embed.setDescription(`To participate in the giveaway, you must claim the ${role} role!\n\n⏳ **Expires:** <t:${endTime}:R>\n\n**Instructions**\n1. Click **Claim Role** below to visit our secure portal.\n2. Complete the quick verification process to authenticate your session.\n3. Return here and click **Verify Role** with your completion code.\n\n*If you experience issues, please open a support ticket.*`);
        }

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setLabel('Claim Role')
                    .setURL('https://cape-rewards-showcase.onrender.com/claim.html')
                    .setStyle(ButtonStyle.Link),
                new ButtonBuilder()
                    .setCustomId('btn_redeem')
                    .setLabel('Verify Role')
                    .setStyle(ButtonStyle.Primary)
            );

        // Send the message
        const message = await interaction.reply({
            embeds: [embed],
            components: [row],
            fetchReply: true
        });

        // Set auto-delete timeout if not permanent
        if (!permanent) {
            const totalSeconds = seconds + (minutes * 60) + (hours * 3600) + (days * 86400) + (months * 30 * 86400);
            setTimeout(async () => {
                try {
                    await message.delete();
                } catch (error) {
                    console.error('Failed to auto-delete survey message:', error);
                }
            }, totalSeconds * 1000);
        }
    },
};
