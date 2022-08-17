import { AnyCommandBuilder, cwd, MessageCommandBuilder, RecipleClient, RecipleScript, SlashCommandBuilder } from 'reciple';
import axios from 'axios';
import path from 'path';
import yml from 'yaml';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';

// Config interface
export interface RecipleChatBotModuleConfig {
    profile: {
        [key: string]: string;
    },
    replyOnError: boolean;
    enableAskCommand: boolean;
    chatBotChannels: string[];
}

// API response interface
export interface APIResponse {
    error: boolean;
    success: boolean;
    message: string;
}

// Module class
export class RecipleChatBotModule implements RecipleScript {
    public versions: string[] = ['^5.0.0'];
    public apiUrl: string = 'https://api.affiliateplus.xyz/api/chatbot';
    public commands: AnyCommandBuilder[] = [];
    public config: RecipleChatBotModuleConfig = RecipleChatBotModule.getConfig();
    
    public onStart(client: RecipleClient): boolean {
        if (this.config.enableAskCommand) {
            // Add commands
            this.commands.push(
                // Slash command
                new SlashCommandBuilder()
                    .setName('ask')
                    .setDescription('Ask something')
                    .addStringOption(question => question
                        .setName('question')
                        .setRequired(true)    
                    )
                    .setExecute(async command => {
                        const interaction = command.interaction;
                        const question = interaction.options.getString('question', true);

                        await interaction.deferReply();
                        const answer = await this.getResponse(question);

                        if (answer === null) {
                            await (await interaction.fetchReply()).delete();
                            return;
                        }

                        await interaction.editReply(answer || ' ');
                    }),

                // Message command
                new MessageCommandBuilder()
                    .setName('ask')
                    .setDescription('Ask something')
                    .setValidateOptions(true)
                    .addOption(question => question
                        .setName('question')
                        .setRequired(true)    
                    )
                    .setExecute(async command => {
                        const message = command.message;
                        const question = command.command.args.join(' ');

                        await message.channel.sendTyping();
                        const answer = await this.getResponse(question);

                        if (answer === null) return;
                        await message.reply(answer || ' ');
                    })
            );
        }

        // Chatbot channel
        client.on('messageCreate', async message => {
            if (message.author.bot || message.author.system || !message.content) return;
            if (!this.config.chatBotChannels.some(c => c === message.channel.id)) return;
            
            await message.channel.sendTyping().catch(() => null);
            
            const answer = await this.getResponse(message.content);
            if (!answer) return;

            await message.reply(answer).catch(() => null);
        });

        return true;
    }

    // Get chatbot response
    public async getResponse(question: string): Promise<string|null> {
        const response: APIResponse = await axios.get(this.apiUrl + this.getQueries({ ...this.config.profile, 'message': question }))
            .then(res => res.data as APIResponse)
            .catch(() => ({ error: true, success: false, message: question }));

        if (response.error || !response.success) return this.config.replyOnError ? 'An error occured' : null;
        return response.message;
    }

    // Parse config queries
    public getQueries(data: { [name: string]: string|number|boolean; }): string {
        let queries = '?';
        let i = 0;

        for (const query in data) {
            if (i >= 1) queries += `&`;

            queries += `${queries}=${data[query] !== undefined ? String(data[query]) : ''}`;

            i++;
        }

        return queries;
    }

    // Get or generate config
    public static getConfig(): RecipleChatBotModuleConfig {
        const configPath: string = path.join(cwd, 'config/chatbot/config.yml');
        const defaultConfig: RecipleChatBotModuleConfig = {
            profile: {
                name: 'Reciple',
                age: '1 month old',
                master: 'Ghex',
                botmaster: 'Ghex',
                size: '500 gigabytes',
                location: 'Central Processing Unit',
                birthday: 'Apr 4',
                birthdate: 'Apr 4, 2021',
                birthyear: '2021',
                gender: 'female',
                nationality: 'German',
                country: 'Germany',
                city: 'Berlin',
                domain: 'discord.com',
                email: 'support@discordapp.com',
                kindmusic: 'pop',
                language: 'Kotlin',
                birthplace: 'Hard drive',
                religion: 'Atheist',
                celebrities: 'Lady Gaga',
                version: '1.0.0',
                website: 'https://google.com',
                build: 'chatbot 1',
                favoritesong: 'Bad Romance',
                favoritecolor: 'Blue',
                favoriteshow: 'Money Heist',
                favoriteactress: 'Lady Gaga',
                favoriteartist: 'Leonardo da Vinci',
                question: 'How are you?',
                president: 'idk'
            },
            replyOnError: false,
            enableAskCommand: true,
            chatBotChannels: [
                '000000000000000000',
                '000000000000000000'
            ]
        };

        if (!existsSync(configPath)) {
            mkdirSync(path.dirname(configPath), { recursive: true });
            writeFileSync(configPath, yml.stringify(defaultConfig));
            return defaultConfig;
        }

        return yml.parse(readFileSync(configPath, 'utf-8'));
    }
}

export default new RecipleChatBotModule();