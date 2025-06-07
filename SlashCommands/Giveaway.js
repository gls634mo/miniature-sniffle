import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } from "discord.js";
import GiveawaySchema from "../Models/GiveawaySchema.js";
import ms from "ms";

export const data = new SlashCommandBuilder()
    .setName("giveaway")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false)
    .setDescription('Запустить конкурс.')
    .addStringOption(option => option
        .setName("приз")
        .setDescription("Приз конкурса")
        .setRequired(true)
    )
    .addStringOption(option => option
        .setName("длительность")
        .setDescription("Длительность конкурса")
        .setRequired(true)
    )
    .addIntegerOption(option => option
        .setName("победителей")
        .setDescription("Количество победителей в конкурсе")
        .setRequired(false)
    )
    .addBooleanOption(option => option
        .setName("войс")
        .setDescription("Должен ли находиться пользователь в войсе для участия в конкурсе")
        .setRequired(false)
    )
    .addChannelOption(option => option
        .setName("канал")
        .setDescription("Канал отправки конкурса")
        .setRequired(false)
    )

export async function execute(interaction, client) {
    await interaction.deferReply({ ephemeral: true })
    const prize = interaction.options.getString('приз')
    const duration = interaction.options.getString('длительность')
    const winners = interaction.options.getInteger('победителей') ?? 1
    const voice = interaction.options.getBoolean('войс') ?? false
    const channel = interaction.options.getChannel('канал') ?? interaction.channel

    if(isNaN(ms(duration))) return interaction.editReply({ content: 'Неверная длительность конкурса.', ephemeral: true })

    function toConditions() {
        let conditions = '';
        if (voice) conditions += 'Находиться в войсе'
        return conditions;
    }

    const embed = new EmbedBuilder().setTitle(`Конкурс на ${prize}`)
        .setDescription(`> Нажмите на **кнопку** ниже, чтобы **участвовать** в конкурсе. Окончание конкурса **<t:${Math.floor((Date.now() + ms(duration)) / 1000)}:R>**.`)
        .setFields([
            {
                name: 'Победителей:',
                value: `\`\`\`${winners}\`\`\``,
                inline: true
            },
            {
                name: 'Участвует:',
                value: `\`\`\`0\`\`\``,
                inline: true
            }
        ]).setImage('https://cdn.discordapp.com/attachments/1030797893101178960/1039223508242276383/Rectangle_369.png?ex=68451990&is=6843c810&hm=2aa40e0080f25c584282b1f16029e6068c372502cd469366a77acd9944d6c5d2&')

    if (toConditions()) {
        embed.addFields({ name: 'Условия:', value: `\`\`\`${toConditions()}\`\`\`` })
    }

    const join = new ButtonBuilder().setCustomId('join.giveaway').setLabel('Участвовать').setStyle(ButtonStyle.Success)

    return interaction.editReply({ content: `Вы успешно создали конкурс в ${channel}.`}).then(() => {
        channel.send({ embeds: [embed], components: [new ActionRowBuilder().addComponents(join)]}).then((message) => {
            new GiveawaySchema({
                guildId: interaction.guild.id,
                createdUserId: interaction.user.id,
                channelId: channel.id,
                messageId: message.id,
                prize,
                duration,
                winners,
                voice,
                createdAt: Date.now(),
                ended : false
            }).save()
        })
    })
}