import { Events, InteractionType, EmbedBuilder } from "discord.js";

export const data = {
    name: Events.InteractionCreate,
}

export async function execute(interaction, client) {
    if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName); 
        if (!command) return interaction.reply({ content: "Команда не найдена.", ephemeral: true })
        
        try {
            if (command.developer && interaction.user.id != client.config.main.developer) {
                return interaction.reply({ 
                    embeds: [new EmbedBuilder()
                        .setTitle("Стоп-стоп-стоп.")
                        .setDescription("> Увы, **Вы не можете** использовать **данную команду.**")
                        .setImage("https://cdn.discordapp.com/attachments/1124343980419731476/1151851418861457428/Error.png")
                    ], 
                    ephemeral: true 
                });
            }
            
            if (command.off) {
                return interaction.reply({ 
                    embeds: [new EmbedBuilder()
                        .setTitle("Стоп-стоп-стоп.")
                        .setDescription("> Данную команду **невозможно** использовать, так как **разработчик отключил эту команду.**")
                        .setImage("https://cdn.discordapp.com/attachments/1124343980419731476/1151851418861457428/Error.png")
                    ], 
                    ephemeral: true 
                })
            }
            
            if (command.dont_execute) return
            
            if (client.user.presence.status === 'dnd' && interaction.user.id != client.config.main.developer) {
                return interaction.reply({ 
                    embeds: [new EmbedBuilder()
                        .setTitle(`> Технические работы.`)
                        .setDescription("Введутся технические работы бота. **Все команды временно** недоступны. Приносим извенения за неудобства.")
                        .setImage("https://cdn.discordapp.com/attachments/1124343980419731476/1151851418861457428/Error.png")
                    ] 
                })
            }
            
            await command.execute(interaction, client);
        } catch (error) {
            console.log(error);
            interaction.reply({ 
                embeds: [new EmbedBuilder()
                    .setTitle("Что-то пошло не так...")
                    .setDescription("> Произошли **неизвестные ошибки** при использовании **данной команды**. Я уже **отправил лог с ошибкой**. Приносим извенения за неудобства.")
                    .setImage("https://cdn.discordapp.com/attachments/1124343980419731476/1151851418861457428/Error.png")
                ], 
                ephemeral: true 
            });
            
            return interaction.guild.channels.cache.get(client.config.logs.error ?? null)?.send({ 
                embeds: [new EmbedBuilder()
                    .setTitle("> Ошибка при использовании команды.")
                    .setDescription(`\`\`\`js\n${error}\n\`\`\``)
                    .addFields(
                        { 
                            name: "> Использовал команду:", 
                            value: `・${interaction.user}\n・${interaction.user.id}\n・${interaction.user.tag}`, 
                            inline: true 
                        }, 
                        { 
                            name: "> Команда:", 
                            value: `・</${interaction.commandName}:${interaction.commandId}>\n・${interaction.commandId}\n・${interaction.commandName}`, 
                            inline: true 
                        }
                    )
                    .setImage("https://cdn.discordapp.com/attachments/1124343980419731476/1151851418861457428/Error.png")
                ] 
            }).then(() => {
                client.user.setStatus('idle')
            })
        }
    } else if (interaction.type == InteractionType.ApplicationCommandAutocomplete) {
        const auto = client.commands.get(interaction.commandName);
        if (!auto) return;

        try { 
            await auto.autocomplete(interaction, client) 
        } catch (error) {
            return interaction.reply({ 
                embeds: [new EmbedBuilder()
                    .setTitle("Что-то пошло не так...")
                    .setDescription("> Произошли **неизвестные ошибки** при использовании **данной команды**. Я уже **отправил лог с ошибкой**. Приносим извенения за неудобства.")
                    .setImage("https://cdn.discordapp.com/attachments/1124343980419731476/1151851418861457428/Error.png")
                ], 
                ephemeral: true 
            });
        }
    }
}