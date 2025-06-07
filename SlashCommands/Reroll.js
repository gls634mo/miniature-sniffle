import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from "discord.js";
import GiveawaySchema from "../Models/GiveawaySchema.js";

export const data = new SlashCommandBuilder()
    .setName("reroll")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false)
    .setDescription('Перевыбрать победителей розыгрыша.')
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
    
    if (!giveaway.ended) {
        return interaction.editReply({ 
            content: 'Этот розыгрыш еще не завершен. Дождитесь его окончания или завершите вручную.', 
            ephemeral: true 
        })
    }
    
    if (!giveaway.members || giveaway.members.length === 0) {
        return interaction.editReply({ 
            content: 'В этом розыгрыше нет участников для перевыбора.', 
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
    
    const newWinners = selectWinners()
    
    if (newWinners.length === 0) {
        return interaction.editReply({ 
            content: 'Не удалось найти действительных участников для перевыбора.', 
            ephemeral: true 
        })
    }
    
    // Форматирование списка победителей
    const winnersText = newWinners.map(member => `${member} (\`${member.user.tag}\`)`).join(', ')
    
    // Обновление embed сообщения
    const embed = message.embeds[0]
    const newEmbed = EmbedBuilder.from(embed)
        .setDescription(`> Победител${giveaway.winners > 1 ? 'и' : 'ь'} ${winnersText}`)
    
    await message.edit({ embeds: [newEmbed], components: [] })
    
    // Найти последнее сообщение с результатами и обновить его
    const messages = await channel.messages.fetch({ after: messageId, limit: 10 })
    const resultMessage = messages.find(msg => 
        msg.author.id === client.user.id && 
        msg.content.includes('Победител')
    )
    
    if (resultMessage) {
        await resultMessage.edit({ 
            content: `Победител${giveaway.winners > 1 ? 'и' : 'ь'} ${winnersText}`, 
            components: [] 
        })
    } else {
        // Если сообщение с результатами не найдено, создать новое
        await message.reply({ 
            content: `Победител${giveaway.winners > 1 ? 'и' : 'ь'} ${winnersText}`
        })
    }
    
    return interaction.editReply({ 
        content: `Победители успешно перевыбраны! Новые победители: ${winnersText}`, 
        ephemeral: true 
    })
}