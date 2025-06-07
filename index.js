import { Client, GatewayIntentBits, Collection, REST, Routes } from 'discord.js';
import { readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import colors from 'colors';
import * as config from './config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMembers
    ]
});

client.config = config;
client.commands = new Collection();

// Загрузка команд
const commandsPath = join(__dirname, 'SlashCommands');
const commandFiles = readdirSync(commandsPath).filter(file => file.endsWith('.js'));

const commands = [];
for (const file of commandFiles) {
    const filePath = join(commandsPath, file);
    const command = await import(`file://${filePath}`);
    if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
        commands.push(command.data.toJSON());
    }
}

// Загрузка событий
const eventsPath = join(__dirname, 'Events');
const eventFolders = readdirSync(eventsPath);

for (const folder of eventFolders) {
    const folderPath = join(eventsPath, folder);
    const eventFiles = readdirSync(folderPath).filter(file => file.endsWith('.js'));
    
    for (const file of eventFiles) {
        const filePath = join(folderPath, file);
        const event = await import(`file://${filePath}`);
        if (event.data?.once) {
            client.once(event.data.name, (...args) => event.execute(...args, client));
        } else {
            client.on(event.data.name, (...args) => event.execute(...args, client));
        }
    }
}

// Регистрация команд после входа
client.once('ready', async () => {
    // Установка статуса DND
    client.user.setStatus('dnd');
    
    const rest = new REST().setToken(config.main.token);

    try {
        console.log('[КОМАНДЫ]'.yellow + ' Начинаю обновление команд...');
        
        await rest.put(
            Routes.applicationGuildCommands(client.user.id, config.main.guild),
            { body: commands },
        );
        
        console.log('[КОМАНДЫ]'.green + ' Команды успешно обновлены!');
    } catch (error) {
        console.error('[ОШИБКА]'.red + ' Ошибка при обновлении команд:', error);
    }
});

// Подключение к MongoDB
mongoose.connect('mongodb://localhost:27017/giveaway-bot').then(() => {
    console.log('[БАЗА ДАННЫХ]'.green + ' Подключение к MongoDB успешно!');
}).catch(err => {
    console.log('[БАЗА ДАННЫХ]'.red + ' Ошибка подключения к MongoDB:', err);
});

client.login(config.main.token);