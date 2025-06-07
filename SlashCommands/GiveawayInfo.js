import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from "discord.js";
import GiveawaySchema from "../Models/GiveawaySchema.js";
import ms from "ms";

export const data = new SlashCommandBuilder()
    .setName("giveaway-info")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false)
    .setDescription('Получить информацию о розыгрыше.')
    .addStringOption(option => option
        .setName("сообщение")
        .setDescription("ID сообщения розыгрыша")
        .setRequired(true)
    )

export async function execute(interaction, client) {
    await interaction.deferReply({ ephemeral: true })
    
    const messageId = interaction.options.getString('сообщение')
    
    // Найти розыгрыш в базе данных
    const giveaway = await GiveawaySchema.findOne({ 
        guildId: interaction.guild.id, 
        messageId: messageId 
    })
    
    if (!giveaway) {
        return interaction.editReply({ 
            content: 'Розыгрыш с таким ID сообщения не найден.', 
            ephemeral: true 
        })
    }
    
    // Получить информацию о создателе
    const creator = await interaction.guild.members.fetch(giveaway.createdUserId).catch(() => null)
    const creatorText = creator ? `${creator} (\`${creator.user.tag}\`)` : `\`${giveaway.createdUserId}\` (пользователь покинул сервер)`
    
    // Получить информацию о канале
    const channel = interaction.guild.channels.cache.get(giveaway.channelId)
    const channelText = channel ? `${channel}` : `\`${giveaway.channelId}\` (канал удален)`
    
    // Рассчитать время окончания
    const endTime = giveaway.createdAt + ms(giveaway.duration)
    const timeLeft = endTime - Date.now()
    
    // Статус розыгрыша
    let status
    if (giveaway.ended) {
        status = '🔴 Завершен'
    } else if (timeLeft <= 0) {
        status = '🟡 Ожидает обработки'
    } else {
        status = '🟢 Активен'
    }
    
    // Условия участия
    let conditions = []
    if (giveaway.voice) conditions.push('Находиться в войсе')
    
    const embed = new EmbedBuilder()
        .setTitle(`Информация о розыгрыше`)
        .setDescription(`**Приз:** ${giveaway.prize}`)
        .addFields([
            {
                name: 'Статус',
                value: status,
                inline: true
            },
            {
                name: 'Победителей',
                value: `${giveaway.winners}`,
                inline: true
            },
            {
                name: 'Участников',
                value: `${giveaway.members ? giveaway.members.length : 0}`,
                inline: true
            },
            {
                name: 'Создатель',
                value: creatorText,
                inline: false
            },
            {
                name: 'Канал',
                value: channelText,
                inline: true
            },
            {
                name: 'ID сообщения',
                value: `\`${giveaway.messageId}\``,
                inline: true
            },
            {
                name: 'Длительность',
                value: `${giveaway.duration}`,
                inline: true
            },
            {
                name: 'Создан',
                value: `<t:${Math.floor(giveaway.createdAt / 1000)}:F>`,
                inline: true
            },
            {
                name: 'Окончание',
                value: `<t:${Math.floor(endTime / 1000)}:F>`,
                inline: true
            }
        ])
        .setColor(giveaway.ended ? '#f23f43' : (timeLeft <= 0 ? '#f0b232' : '#23a55a'))
    
    if (conditions.length > 0) {
        embed.addFields({
            name: 'Условия участия',
            value: conditions.join(', '),
            inline: false
        })
    }
    
    if (!giveaway.ended && timeLeft > 0) {
        embed.addFields({
            name: 'Осталось времени',
            value: `<t:${Math.floor(endTime / 1000)}:R>`,
            inline: true
        })
    }
    
    return interaction.editReply({ embeds: [embed], ephemeral: true })
}