import { Events, EmbedBuilder } from "discord.js";
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
                    const availableMembers = [...doc.members]
                    const selectedWinners = []
                    const winnersCount = Math.min(availableMembers.length, doc.winners)
                    
                    for (let i = 0; i < winnersCount; i++) {
                        const winnerIndex = Math.floor(Math.random() * availableMembers.length)
                        const memberId = availableMembers.splice(winnerIndex, 1)[0]
                        const member = guild.members.cache.get(memberId)
                        if (member) {
                            selectedWinners.push(`${member} (\`${member.user.tag}\`)`)
                        }
                    }
                    return selectedWinners.join(', ')
                }
                doc.ended = true
                await doc.save()
                const win = winners()
                const message = await guild.channels.cache.get(doc.channelId).messages.fetch(doc.messageId).catch(err => null)
                if (!message) return await doc.deleteOne()
                const embed = message.embeds[0]
                const newembed = EmbedBuilder.from(embed).setDescription(`> Победител${doc.winners > 1 ? 'и' : 'ь'} ${win}`)
                await message.edit({ embeds: [newembed], components: [] })
                await message.reply({ content: `Победител${doc.winners > 1 ? 'и' : 'ь'} ${win}` })
            }
        }
    } 
    
    giveaway()
    setInterval(giveaway, 60000)
}