// /config - Admin-only bot configuration commands.
// /config recruiter-role set/clear/status
// /config mail-log-channel set/clear/status

const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const db = require('../database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('config')
    .setDescription('Bot configuration (Administrator only)')
    .addSubcommandGroup((group) =>
      group
        .setName('recruiter-role')
        .setDescription('Control who can send recruitment mail through the bot')
        .addSubcommand((sub) =>
          sub
            .setName('set')
            .setDescription('Only Administrators and this role can use /mail send and /recruit bulk')
            .addRoleOption((opt) => opt.setName('role').setDescription('The recruiter role').setRequired(true))
        )
        .addSubcommand((sub) =>
          sub.setName('clear').setDescription('Remove the restriction - everyone can send recruitment mail again')
        )
        .addSubcommand((sub) => sub.setName('status').setDescription('Show the current recruiter role setting'))
    )
    .addSubcommandGroup((group) =>
      group
        .setName('mail-log-channel')
        .setDescription('Set which channel mail logs and recruit threads are posted in')
        .addSubcommand((sub) =>
          sub
            .setName('set')
            .setDescription('Set the mail log channel')
            .addChannelOption((opt) =>
              opt.setName('channel').setDescription('The channel to post mail logs in').setRequired(true)
            )
        )
        .addSubcommand((sub) =>
          sub.setName('clear').setDescription('Revert to the MAIL_LOG_CHANNEL_ID value in .env')
        )
        .addSubcommand((sub) => sub.setName('status').setDescription('Show the current mail log channel'))
    ),

  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return interaction.reply({ content: '❌ You need Administrator permission to use this.', flags: 64 });
    }

    const group = interaction.options.getSubcommandGroup();
    const sub = interaction.options.getSubcommand();

    // ---------- /config recruiter-role ----------
    if (group === 'recruiter-role') {
      if (sub === 'set') {
        const role = interaction.options.getRole('role');
        db.setRecruiterRoleId(role.id);
        return interaction.reply({
          content: `✅ Only Administrators and members with the **${role.name}** role can now use \`/mail send\` and \`/recruit bulk\`.`,
          flags: 64,
        });
      }

      if (sub === 'clear') {
        db.setRecruiterRoleId(null);
        return interaction.reply({
          content: '✅ Recruiter role restriction removed. Everyone can use `/mail send` and `/recruit bulk` again.',
          flags: 64,
        });
      }

      if (sub === 'status') {
        const roleId = db.getRecruiterRoleId();
        return interaction.reply({
          content: roleId
            ? `Current recruiter role: <@&${roleId}> (plus Administrators)`
            : 'No recruiter role set - everyone can currently use `/mail send` and `/recruit bulk`.',
          flags: 64,
        });
      }
    }

    // ---------- /config mail-log-channel ----------
    if (group === 'mail-log-channel') {
      if (sub === 'set') {
        const channel = interaction.options.getChannel('channel');
        db.setMailLogChannelId(channel.id);
        return interaction.reply({
          content: `✅ Mail log channel set to ${channel}. All recruit threads and mail logs will now be posted there.`,
          flags: 64,
        });
      }

      if (sub === 'clear') {
        db.setMailLogChannelId(null);
        const fallback = process.env.MAIL_LOG_CHANNEL_ID;
        return interaction.reply({
          content: fallback
            ? `✅ Cleared. Mail log channel reverted to the \`MAIL_LOG_CHANNEL_ID\` value in your .env file (<#${fallback}>).`
            : `✅ Cleared. Note: no \`MAIL_LOG_CHANNEL_ID\` is set in your .env either — you'll need to set a channel before mail logging will work.`,
          flags: 64,
        });
      }

      if (sub === 'status') {
        const dbChannel = db.getSetting('mailLogChannelId');
        const envChannel = process.env.MAIL_LOG_CHANNEL_ID;
        const active = dbChannel || envChannel;

        return interaction.reply({
          content: active
            ? `Current mail log channel: <#${active}>${dbChannel ? ' (set via /config)' : ' (from .env file)'}`
            : '❌ No mail log channel configured. Use `/config mail-log-channel set` to set one.',
          flags: 64,
        });
      }
    }
  },
};
