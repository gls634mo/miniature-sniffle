import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } from "discord.js";
import GiveawaySchema from "../Models/GiveawaySchema.js";

export const data = new SlashCommandBuilder()
    .setName("end-giveaway")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false)
    .setDescription('Завершить активный розыгрыш досрочно.')
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
        messageId: messageId,
        ended: false
    })
    
    if (!giveaway) {
        return interaction.editReply({ 
            content: 'Активный розыгрыш с таким ID сообщения не найден.', 
            ephemeral: true 
        })
    }
    
    // Получить сообщение розыгрыша
    const channel = interaction.guild.channels.cache.get(giveaway.channelId)
    if (!channel) {
        return interaction.editReply({ 
            content: 'Канал розыгрыша не найден.', 
            ephemeral: true 
        })
    }
    
    const message = await channel.messages.fetch(messageId).catch(() => null)
    if (!message) {
        return interaction.editReply({ 
            content: 'Сообщение розыгрыша не найдено.', 
            ephemeral: true 
        })
    }
    
    // Проверить, есть ли участники
    if (!giveaway.members || giveaway.members.length === 0) {
        // Завершить розыгрыш без победителей
        giveaway.ended = true
        await giveaway.save()
        
        const embed = message.embeds[0]
        const newEmbed = EmbedBuilder.from(embed)
            .setDescription(`> Розыгрыш завершен досрочно. Участников не было.`)
        
        await message.edit({ embeds: [newEmbed], components: [] })
        
        return interaction.editReply({ 
            content: 'Розыгрыш завершен досрочно. Участников не было.', 
            ephemeral: true 
        })
    }
    
    // Функция для выбора случайных победителей
    function selectWinners() {
        let winners = []
        let availableMembers = [...giveaway.members]
        
        for (let i = 0; i < Math.min(giveaway.winners, availableMembers.length); i++) {
            const randomIndex = Math.floor(Math.random() * availableMembers.length)
            const winnerId = availableMembers[randomIndex]
            const member = interaction.guild.members.cache.get(winnerId)
            
            if (member) {
                winners.push(member)
                availableMembers.splice(randomIndex, 1)
            }
        }
        
        return winners
    }
    
    const winners = selectWinners()
    
    if (winners.length === 0) {
        // Завершить розыгрыш без победителей
        giveaway.ended = true
        await giveaway.save()
        
        const embed = message.embeds[0]
        const newEmbed = EmbedBuilder.from(embed)
            .setDescription(`> Розыгрыш завершен досрочно. Действительных участников не найдено.`)
        
        await message.edit({ embeds: [newEmbed], components: [] })
        
        return interaction.editReply({ 
            content: 'Розыгрыш завершен досрочно. Действительных участников не найдено.', 
            ephemeral: true 
        })
    }
    
    // Завершить розыгрыш с победителями
    giveaway.ended = true
    await giveaway.save()
    
    // Форматирование списка победителей
    const winnersText = winners.map(member => `${member} (\`${member.user.tag}\`)`).join(', ')
    
    // Обновление embed сообщения
    const embed = message.embeds[0]
    const newEmbed = EmbedBuilder.from(embed)
        .setDescription(`> Победител${giveaway.winners > 1 ? 'и' : 'ь'} ${winnersText}`)
    
    await message.edit({ embeds: [newEmbed], components: [] })
    
    // Создание кнопки для перевыбора
    const rerollButton = new ButtonBuilder()
        .setCustomId(`giveaway.reroll.${messageId}`)
        .setLabel(`Перевыбрать победителя`)
        .setStyle(ButtonStyle.Secondary)
    
    // Отправить сообщение с результатами
    await message.reply({ 
        content: `Победител${giveaway.winners > 1 ? 'и' : 'ь'} ${winnersText}`, 
        components: [new ActionRowBuilder().addComponents(rerollButton)] 
    })
    
    return interaction.editReply({ 
        content: `Розыгрыш успешно завершен досрочно! Победители: ${winnersText}`, 
        ephemeral: true 
    })
}