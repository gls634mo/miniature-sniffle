import { Events, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, PermissionFlagsBits } from "discord.js";
import GiveawaySchema from "../../Models/GiveawaySchema.js";

export const data = {
    name: Events.InteractionCreate,
}

export async function execute(interaction, client) {
    if(interaction.customId === 'join.giveaway') {
        const giveaway = await GiveawaySchema.findOne({ guildId: interaction.guild.id, ended: false, messageId: interaction.message.id })
        
        if(!giveaway) return interaction.reply({ content: 'Этот конкурс уже закончен', ephemeral: true })
        
        if(giveaway.members.includes(interaction.user.id)) {
            const leave = new ButtonBuilder().setCustomId(`leave.giveaway.${interaction.message.id}`).setLabel('Да, я хочу покинуть конкурс').setStyle(ButtonStyle.Danger)
            return interaction.reply({ content: 'Вы **уже учавствуете** в этом конкурсе, Вы **хотите** его покинуть?', ephemeral: true, components: [new ActionRowBuilder().addComponents(leave)] })
        }
        
        if(giveaway.voice && !interaction.member.voice.channel) {
            return interaction.reply({ content: 'Для **участия** в конкурсе, Вы **должны** находиться в **голосовом канале**.', ephemeral: true })
        }
        
        giveaway.members.push(interaction.user.id)
        await giveaway.save()
        
        return interaction.reply({ content: 'Вы **участвуете** в конкурсе', ephemeral: true }).then(() => {
            const embed = interaction.message.embeds[0]
            embed.fields[1].value = `\`\`\`${giveaway.members.length}\`\`\``
            interaction.message.edit({ embeds: [embed] })
        })
    }
    
    if(interaction.isButton()) {
        if(interaction.customId.includes('leave.giveaway')) {
            const id = interaction.customId.split('.')[2]
            const message = await interaction.channel.messages.fetch(id).catch(err => null)
            
            if(!message) {
                const giveaway = await GiveawaySchema.findOne({ messageId: id })
                if(giveaway) await giveaway.deleteOne()
                return interaction.update({ content: 'Что-то пошло не так.', embeds: [], components: [], ephemeral: true })
            }
            
            const giveaway = await GiveawaySchema.findOne({ guildId: interaction.guild.id, ended: false, messageId: id })
            if(!giveaway) return interaction.reply({ content: 'Этот конкурс уже закончен', ephemeral: true })
            if(!giveaway.members.includes(interaction.user.id)) return interaction.update({ content: 'Вы **и так не учавствуете** в этом конкурсе.', embeds: [], components: [], ephemeral: true })
            
            giveaway.members.splice(giveaway.members.indexOf(interaction.user.id), 1)
            await giveaway.save()
            
            return interaction.update({ content: 'Вы **покинули** конкурс.', embeds: [], components: [], ephemeral: true }).then(() => {
                const embed = message.embeds[0]
                embed.fields[1].value = `\`\`\`${giveaway.members.length}\`\`\``
                message.edit({ embeds: [embed] })
            })
        }
        
        if(interaction.customId.includes('giveaway.reroll')) {
            if(!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                return interaction.reply({ content: 'Только **администраторы** могут перевыберать победителей.', ephemeral: true })
            }
            
            interaction.deferUpdate({})
            interaction.message.edit({ components: [] })
            
            const id = interaction.customId.split('.')[2]
            const message = await interaction.channel.messages.fetch(id ?? null).catch(err => null)
            if(!message) return interaction.followUp({ content: 'Сообщения конкурса не найдено.', ephemeral: true })
            
            const doc = await GiveawaySchema.findOne({ guildId: interaction.guild.id, messageId: id })
            if(!doc) return interaction.followUp({ content: 'Конкурс не найден.', ephemeral: true })
            
            function winners() {
                let randomWinners = ``
                for (let i = 0; i < Math.min(doc.members.length, doc.winners); i++) {
                    const winnerIndex = Math.floor(Math.random() * doc.members.length)
                    const member = interaction.guild.members.cache.get(doc.members[winnerIndex])
                    if (member && !randomWinners.includes(member)) randomWinners += `${member} (\`${member.user.tag}\`), `
                }
                return randomWinners.slice(0, -2)
            }
            
            const win = winners()
            const embed = message.embeds[0]
            const newembed = EmbedBuilder.from(embed).setDescription(`> Победител${doc.winners > 1 ? 'и' : 'ь'} ${win}`)
            await message.edit({ embeds: [newembed], components: [] })
            
            const reroll = new ButtonBuilder().setCustomId(`giveaway.reroll.${doc.messageId}`).setLabel(`Перевыбрать победителя`).setStyle(ButtonStyle.Secondary)
            await message.reply({ content: `Победител${doc.winners > 1 ? 'и' : 'ь'} ${win}`, components: [new ActionRowBuilder().addComponents(reroll)] })
        }
    }
}