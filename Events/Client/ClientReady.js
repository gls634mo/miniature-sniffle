import { Events, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } from "discord.js";
import ms from 'ms';
import GiveawaySchema from "../../Models/GiveawaySchema.js";

export const data = {
    name: Events.ClientReady,
    once: true
}

export async function execute(client) {
    console.log(`[КЛИЕНТ]`.green + ` ${client.user.tag} в сети.`);
    const guild = await client.guilds.fetch(client.config.main.guild)

    async function giveaway() {
        const alldoc = await GiveawaySchema.find({ guildId: guild.id })
        for (let i = 0; i < alldoc.length; i++) {
            const doc = alldoc[i]
            if (!doc.ended && (ms(doc.duration) + doc.createdAt) < Date.now()) {
                function winners() {
                    let randomWinners = ``
                    for (let i = 0; i < Math.min(doc.members.length, doc.winners); i++) {
                        const winnerIndex = Math.floor(Math.random() * doc.members.length)
                        const member = guild.members.cache.get(doc.members[winnerIndex])
                        if (member && !randomWinners.includes(member)) randomWinners += `${member} (\`${member.user.tag}\`), `
                    }
                    return randomWinners.slice(0, -2)
                }
                doc.ended = true
                await doc.save()
                const win = winners()
                const message = await guild.channels.cache.get(doc.channelId).messages.fetch(doc.messageId).catch(err => null)
                if (!message) return await doc.deleteOne()
                const embed = message.embeds[0]
                const newembed = EmbedBuilder.from(embed).setDescription(`> Победител${doc.winners > 1 ? 'и' : 'ь'} ${win}`)
                await message.edit({ embeds: [newembed], components: [] })
                const reroll = new ButtonBuilder().setCustomId(`giveaway.reroll.${doc.messageId}`).setLabel(`Перевыбрать победителя`).setStyle(ButtonStyle.Secondary)
                await message.reply({ content: `Победител${doc.winners > 1 ? 'и' : 'ь'} ${win}`, components: [new ActionRowBuilder().addComponents(reroll)] })
            }
        }
    } 
    
    giveaway()
    setInterval(giveaway, 60000)
}