import "dotenv/config"; // charge les variables du fichier .env
import { Client, GatewayIntentBits, EmbedBuilder, PermissionsBitField } from "discord.js";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.MessageContent,
  ],
});

const TOKEN = process.env.TOKEN; // ✅ récupéré depuis .env ou Render
const PREFIX = "!";

let extraScores = {}; // { userId: { skin:0, drole:0, lieu:0 } }

client.on("messageCreate", async (message) => {
  if (!message.content.startsWith(PREFIX) || message.author.bot) return;

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  // Ajouter un participant
  if (command === "addparticipant") {
    const member = message.mentions.users.first();
    if (!member || args.length < 3) {
      return message.reply("Usage : !addParticipant @pseudo lien1 lien2 lien3");
    }
    const [img1, img2, img3] = args;

    const embed = new EmbedBuilder()
      .setTitle(`Participant : ${member.username}`)
      .setDescription("Réagissez 👍 pour voter pour ce participant !")
      .setColor("Blue")
      .setImage(img1)
      .addFields(
        { name: "Photo hiver ❄️", value: img1 },
        { name: "Photo été ☀️", value: img2 },
        { name: "Photo originale 🤪", value: img3 }
      );

    const sent = await message.channel.send({ embeds: [embed] });
    await sent.react("👍");
  }

  // Ajouter des points manuellement
  if (command === "score") {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return message.reply("Tu n’as pas la permission d’attribuer des scores !");
    }
    const member = message.mentions.users.first();
    if (!member) return message.reply("Usage : !score @pseudo skin=3 drole=2 lieu=1");

    const params = args.join(" ");
    const skin = parseInt(params.match(/skin=(\d+)/)?.[1] || "0");
    const drole = parseInt(params.match(/drole=(\d+)/)?.[1] || "0");
    const lieu = parseInt(params.match(/lieu=(\d+)/)?.[1] || "0");

    extraScores[member.id] = { skin, drole, lieu };

    message.reply(
      `✅ Score ajouté pour ${member.username} → Skin:${skin}, Drôle:${drole}, Lieu:${lieu}`
    );
  }

  // Résultats
  if (command === "results") {
    const messages = await message.channel.messages.fetch({ limit: 100 });
    let results = [];

    for (const msg of messages.values()) {
      if (msg.embeds.length > 0) {
        const embed = msg.embeds[0];
        const participant = embed.title?.replace("Participant : ", "");
        const reaction = msg.reactions.cache.get("👍");

        if (participant && reaction) {
          const userId = msg.mentions.users.first()?.id;
          const votes = reaction.count - 1; // ignorer le bot
          const extra = userId && extraScores[userId] ? extraScores[userId] : { skin: 0, drole: 0, lieu: 0 };
          const total = votes + extra.skin + extra.drole + extra.lieu;

          results.push({
            name: participant,
            votes,
            extra,
            total,
          });
        }
      }
    }

    results.sort((a, b) => b.total - a.total);

    let classement = "🏆 **Résultats du concours :**\n";
    results.forEach((r, i) => {
      classement += `${i + 1}. ${r.name} – ${r.total} pts (👍 ${r.votes}, Skin ${r.extra.skin}, Drôle ${r.extra.drole}, Lieu ${r.extra.lieu})\n`;
    });

    message.channel.send(classement);
  }
});

client.login(TOKEN);
