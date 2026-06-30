// /help
// Lists every command the bot currently has, built automatically from the
// loaded command files. You never need to edit this file when new commands
// are added in later phases - it reads the live command list at the moment
// someone runs /help.
//
// Discord caps a single embed field's value at 1024 characters. Commands
// with a lot of subcommands (like /recruit) can easily produce more text
// than that, so this file splits long command descriptions across multiple
// fields automatically, instead of crashing when a command grows too big.

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const FIELD_VALUE_LIMIT = 1024;

/**
 * Turns a single slash command's data into an array of text lines -
 * one line per usable subcommand (or one line total for a simple command
 * with no subcommands).
 */
function describeCommandLines(command) {
  const json = command.data.toJSON();
  const lines = [];

  const subcommands = [];
  const groups = [];

  for (const opt of json.options || []) {
    if (opt.type === 1) {
      // SUB_COMMAND
      subcommands.push(opt);
    } else if (opt.type === 2) {
      // SUB_COMMAND_GROUP
      groups.push(opt);
    }
  }

  if (subcommands.length === 0 && groups.length === 0) {
    // Simple command with no subcommands - just show its own options.
    const optionList = (json.options || [])
      .map((o) => `${o.required ? '' : '[optional] '}${o.name}`)
      .join(', ');
    lines.push(`\`/${json.name}${optionList ? ' ' + optionList : ''}\` — ${json.description}`);
    return lines;
  }

  for (const sub of subcommands) {
    const optionList = (sub.options || [])
      .map((o) => `${o.required ? '' : '[optional] '}${o.name}`)
      .join(' ');
    lines.push(`\`/${json.name} ${sub.name}${optionList ? ' ' + optionList : ''}\` — ${sub.description}`);
  }

  for (const group of groups) {
    for (const sub of group.options || []) {
      const optionList = (sub.options || [])
        .map((o) => `${o.required ? '' : '[optional] '}${o.name}`)
        .join(' ');
      lines.push(
        `\`/${json.name} ${group.name} ${sub.name}${optionList ? ' ' + optionList : ''}\` — ${sub.description}`
      );
    }
  }

  return lines;
}

/**
 * Packs an array of text lines into as few chunks as possible, where each
 * chunk stays under Discord's 1024-character field limit. A single line
 * that's somehow still too long on its own gets hard-truncated as a last
 * resort, so this can never throw no matter what gets added in the future.
 */
function packLinesIntoChunks(lines, limit = FIELD_VALUE_LIMIT) {
  const chunks = [];
  let current = '';

  for (let line of lines) {
    if (line.length > limit) {
      line = line.slice(0, limit - 3) + '...';
    }

    const candidate = current ? `${current}\n${line}` : line;
    if (candidate.length > limit) {
      if (current) chunks.push(current);
      current = line;
    } else {
      current = candidate;
    }
  }

  if (current) chunks.push(current);
  return chunks;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show all available bot commands'),

  async execute(interaction) {
    const commands = [...interaction.client.commands.values()].sort((a, b) =>
      a.data.name.localeCompare(b.data.name)
    );

    const embed = new EmbedBuilder()
      .setTitle('📖 PnW Recruitment Bot — Commands')
      .setColor(0x3498db)
      .setDescription('This list always reflects exactly what the bot can currently do.');

    for (const command of commands) {
      const lines = describeCommandLines(command);
      const chunks = packLinesIntoChunks(lines);

      chunks.forEach((chunk, i) => {
        embed.addFields({
          name: i === 0 ? `/${command.data.name}` : `/${command.data.name} (cont'd)`,
          value: chunk,
        });
      });
    }

    return interaction.reply({ embeds: [embed], flags: 64 });
  },
};
