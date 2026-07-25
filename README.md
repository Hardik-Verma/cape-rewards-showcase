# Minecraft Cape Reward System

A complete, production-ready survey-wall reward system designed for Minecraft communities. This platform features a sleek, obsidian dark-themed frontend with anti-bypass security, a secure token verification backend, and a fully integrated Discord bot for seamless role delivery.

## Features

- **Dynamic Discord Command:** Use `/survey <role> <duration>` to instantly generate an interactive embedded giveaway/reward panel with direct links to your portal.
- **Interactive Redeem Modal:** Users can click "Redeem Key" on the Discord embed to open a sleek, built-in popup form to claim their role, avoiding clunky slash commands.
- **Anti-Bypass Protection:** Robust frontend security prevents users from right-clicking, using developer tools (`F12`, `Ctrl+Shift+I`), or rapidly refreshing the simulation. A `debugger` trap freezes the UI if tools are forced open.
- **State Preservation:** Generated keys are saved securely in the browser's `localStorage`. If a user accidentally reloads, they won't lose their key.
- **Secure Token Lifecycle:** SQLite backend validates that a generated key is valid, tracks the user ID who claims it, and permanently marks it as redeemed.

## Project Structure

- `server.js`: The main Express server entry point. Serves the API, static frontend files, and boots the Discord bot.
- `database/db.js`: Initializes the local `database.sqlite` and handles the `tokens` and `survey_sessions` schema.
- `routes/api.js`: Handles backend logic for pre-survey sessions, simulation tokens, and survey postbacks.
- `bot/client.js`: Discord.js bot client initialization and event handlers for buttons and modals.
- `bot/commands/`: Contains the modular slash command files (`survey.js`, `redeem.js`).
- `bot/deploy-commands.js`: Utility script to register slash commands with the Discord API.
- `public/index.html`: The modern, dark-themed frontend simulation portal built with TailwindCSS.

## Installation & Setup

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Configure Environment Variables:**
   Rename `.env.example` to `.env` and fill in the required fields:
   - `DISCORD_TOKEN`: Your Discord Bot Token (from the Discord Developer Portal).
   - `CLIENT_ID`: Your Bot's Application ID.
   - `GUILD_ID`: The ID of your Discord Server.
   - `REWARD_ROLE_ID`: The ID of the role you want the bot to assign (e.g., the Cape role).
   - `PORT`: The port for the web server (default is 3000).

3. **Deploy Discord Commands:**
   Run the following script to register the slash commands (`/survey`, `/redeem`) in your server:
   ```bash
   node bot/deploy-commands.js
   ```

4. **Start the Application:**
   ```bash
   node server.js
   ```
   *Note: For production, it is highly recommended to run this using a process manager like PM2 (`pm2 start server.js`).*

## Discord Role Hierarchy (Important!)

For the bot to successfully grant roles to users, you **must** ensure the following in your Discord Server Settings:
1. The Bot's integration role must have the **Manage Roles** permission.
2. The Bot's role must be placed **higher** in the Roles list than the reward role it is trying to assign.

## Simulation Mode (Testing)

The frontend is currently in **Development Mode**. It simulates the delay and flow of a real survey network (like Bitcotasks).
- Navigate to `http://localhost:3000`.
- Attempting to inspect the code or bypass the steps will trigger the security guards.
- Click "Complete Survey to Unlock" to generate a test token, copy it, and paste it into the Discord bot's "Redeem Key" modal.

## Moving to Production (Live CPA Network)

When you are ready to connect a real survey network (like Bitcotasks):
1. Configure your CPA network's **Postback URL** to point to your live server (e.g., `https://your-domain.com/api/postback?user_id={user_id}&secret=your_postback_secret_here`).
2. Replace the placeholder simulation buttons in `public/index.html` with the direct redirect links provided by your CPA network.
