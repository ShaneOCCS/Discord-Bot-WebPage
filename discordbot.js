import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { Client, GatewayIntentBits } from 'discord.js';

// Configuration
dotenv.config();

// Constants
const HOSTNAME = '0.0.0.0';
const DEFAULT_PORT = 10000; // Render.com default port

// Initialize Discord Client
function initializeDiscordClient() {
    if (!process.env.DISCORD_TOKEN) {
        console.error('DISCORD_TOKEN is not set in environment variables');
        process.exit(1);
    }

    const client = new Client({
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.MessageContent
        ]
    });

    setupClientEventHandlers(client);
    loginToDiscord(client);
    
    return client;
}

function setupClientEventHandlers(client) {
    client.on('error', error => {
        console.error('Discord client error:', error);
    });

    client.on('ready', () => {
        console.log(`Bot is online as ${client.user.tag}`);
        startExpressServer(client);
    });
}

function loginToDiscord(client) {
    console.log("Attempting to log in with Discord bot...");
    client.login(process.env.DISCORD_TOKEN).catch(error => {
        console.error('Failed to log in:', error);
        process.exit(1);
    });
}

// Express Server
function startExpressServer(client) {
    const app = express();
    const port = process.env.PORT || DEFAULT_PORT;
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const websitePath = path.join(__dirname, 'website');

    // Middleware
    app.use(express.json());
    app.use(express.static(websitePath));

    // Routes
    app.get('/', (req, res) => {
        res.sendFile(path.join(websitePath, 'index.html'));
    });
    
    app.post('/API/ContactMe', createContactMeHandler(client));

    // Start server
    app.listen(port, HOSTNAME, () => {
        console.log(`Server running at http://${HOSTNAME}:${port}/`);
    });
}

function createContactMeHandler(client) {
    return async (req, res) => {
        try {
            const data = req.body;
            console.log('Received data:', data);

            if (!process.env.DISCORD_USER_ID) {
                throw new Error('DISCORD_USER_ID is not set');
            }

            const user = await client.users.fetch(process.env.DISCORD_USER_ID);
            await user.send(`fullname: ${data.fullname} email: ${data.email} message: ${data.message}`);

            res.status(200).json({
                message: 'POST request received successfully',
                received_data: data
            });
        } catch (error) {
            console.error('Error in ContactMe endpoint:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    };
}

// Main execution
const discordClient = initializeDiscordClient();