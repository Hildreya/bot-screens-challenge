require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, REST, Routes, SlashCommandBuilder, PermissionsBitField } = require('discord.js');

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessageReactions]
});

let extraScores = {}; // { userId: { skin:0, drole:0, lieu:0 } }

// Définition des commandes slash
const commands = [
    new SlashCommandBuilder()
        .setName('addparticipant')
        .setDescription('Ajouter un participant avec 3 images')
        .addUserOption(option => option.setName('user').setDescription('Utilisateur').setRequired(true))
        .addStringOption(option => option.setName('img1').setDescription('Photo hiver').setRequired(true))
        .addStringOption(option => option.setName('img2').setDescription('Photo été').setRequired(true))
        .addStringOption(option => option.setName('img3').setDescription('Photo drôle').setRequired(true)),

    new SlashCommandBuilder()
        .setName('score')
        .setDescription('Attribuer des points à un participant')
        .addUserOption(option => option.setName('user').setDescription('Utilisateur').setRequired(true))
        .addIntegerOption(option => option.setName('skin').setDescription('Points skin').setRequired(true))
        .addIntegerOption(option => option.setName('drole').setDescription('Points drôle').setRequired(true))
        .addIntegerOption(option => option.setName('lieu').setDescription('Points lieu').setRequired(true)),

    new SlashCommandBuilder()
        .setName('results')
        .setDescription('Afficher le classement')
].map(cmd => cmd.toJSON());

// Enregistrement global des commandes
const rest = new REST({ version: '10' }).setToken(TOKEN);

client.once('clientReady', async () => {
    console.log(`✅ Connecté en tant que ${client.user.tag}`);
    try {
        await rest.put(
            Routes.applicationCommands(CLIENT_ID),
            { body: commands }
        );
        console.log("✅ Commandes slash enregistrées globalement !");
    } catch (err) {
        console.error(err);
    }
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const { commandName } = interaction;

    if (commandName === 'addparticipant') {
        const user = interaction.options.getUser('user');
        const img1 = interaction.options.getString('img1');
        const img2 = interaction.options.getString('img2');
        const img3 = interaction.options.getString('img3');

        const embed = new EmbedBuilder()
            .setTitle(`Participant : ${user.username}`)
            .setDescription("Réagissez 👍 pour voter pour ce participant !")
            .setColor("Blue")
            .addFields(
                { name: "Photo hiver ❄️", value: img1 },
                { name: "Photo été ☀️", value: img2 },
                { name: "Photo drôle 🤪", value: img3 }
            );

        const sent = await interaction.reply({ embeds: [embed], fetchReply: true });
        await sent.react("👍");
    }

    if (commandName === 'score') {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply("Tu n’as pas la permission d’attribuer des scores !");
        }

        const user = interaction.options.getUser('user');
        const skin = interaction.options.getInteger('skin');
        const drole = interaction.options.getInteger('drole');
        const lieu = interaction.options.getInteger('lieu');

        extraScores[user.id] = { skin, drole, lieu };
        interaction.reply(`✅ Score ajouté pour ${user.username} → Skin:${skin}, Drôle:${drole}, Lieu:${lieu}`);
    }

    if (commandName === 'results') {
        const messages = await interaction.channel.messages.fetch({ limit: 100 });
        let results = [];

        for (const msg of messages.values()) {
            if (msg.embeds.length > 0) {
                const embed = msg.embeds[0];
                const participant = embed.title?.replace("Participant : ", "");
                const reaction = msg.reactions.cache.get("👍");

                if (participant && reaction) {
                    const userId = msg.mentions.users.first()?.id;
                    const votes = reaction.count - 1;
                    const extra = userId && extraScores[userId] ? extraScores[userId] : { skin: 0, drole: 0, lieu: 0 };
                    const total = votes + extra.skin + extra.drole + extra.lieu;

                    results.push({ name: participant, votes, extra, total });
                }
            }
        }

        results.sort((a, b) => b.total - a.total);

        let classement = "🏆 **Résultats du concours :**\n";
        results.forEach((r, i) => {
            classement += `${i + 1}. ${r.name} – ${r.total} pts (👍 ${r.votes}, Skin ${r.extra.skin}, Drôle ${r.extra.drole}, Lieu ${r.extra.lieu})\n`;
        });

        interaction.reply(classement);
    }
});

client.login(TOKEN).catch(err => console.error("Impossible de se connecter :", err));
