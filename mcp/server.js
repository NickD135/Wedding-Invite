import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_FILE = join(__dirname, 'rsvp-data.json');

function loadRSVPs() {
  if (!existsSync(DATA_FILE)) return [];
  return JSON.parse(readFileSync(DATA_FILE, 'utf-8'));
}

function saveRSVPs(data) {
  writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

const server = new McpServer({
  name: 'wedding-rsvp',
  version: '1.0.0',
});

// Tool: List all RSVPs
server.tool('list_rsvps', 'List all wedding RSVPs', {}, async () => {
  const rsvps = loadRSVPs();
  if (rsvps.length === 0) {
    return { content: [{ type: 'text', text: 'No RSVPs yet.' }] };
  }
  const summary = rsvps.map((r, i) =>
    `${i + 1}. ${r.primaryGuest} — ${r.attending} (Party: ${r.partySize || 0})`
  ).join('\n');
  return {
    content: [{ type: 'text', text: `${rsvps.length} RSVPs:\n${summary}` }],
  };
});

// Tool: Add an RSVP
server.tool(
  'add_rsvp',
  'Add a new RSVP to the wedding guest list',
  {
    email: z.string().email().describe('Guest email address'),
    primaryGuest: z.string().describe('Primary guest full name'),
    attending: z.enum(['Yes', 'No']).describe('Whether the guest is attending'),
    partySize: z.number().int().min(0).max(10).optional().describe('Number of guests in the party'),
    guests: z.array(z.object({
      name: z.string(),
      meal: z.string().optional(),
      dietary: z.string().optional(),
      other: z.string().optional(),
    })).optional().describe('Guest details including meal and dietary preferences'),
    song: z.string().optional().describe('Song request for the DJ'),
  },
  async ({ email, primaryGuest, attending, partySize, guests, song }) => {
    const rsvps = loadRSVPs();
    const entry = {
      timestamp: new Date().toISOString(),
      email,
      primaryGuest,
      attending,
      partySize: partySize || 0,
      guests: guests || [],
      song: song || '',
    };
    rsvps.push(entry);
    saveRSVPs(rsvps);
    return {
      content: [{ type: 'text', text: `RSVP added for ${primaryGuest} (${attending}).` }],
    };
  }
);

// Tool: Get RSVP stats
server.tool('rsvp_stats', 'Get wedding RSVP statistics', {}, async () => {
  const rsvps = loadRSVPs();
  const attending = rsvps.filter(r => r.attending === 'Yes');
  const declined = rsvps.filter(r => r.attending === 'No');
  const totalGuests = attending.reduce((sum, r) => sum + (r.partySize || 1), 0);

  const mealCounts = {};
  attending.forEach(r => {
    (r.guests || []).forEach(g => {
      if (g.meal) mealCounts[g.meal] = (mealCounts[g.meal] || 0) + 1;
    });
  });

  const mealSummary = Object.entries(mealCounts)
    .map(([meal, count]) => `  ${meal}: ${count}`)
    .join('\n') || '  No meal selections yet';

  const text = [
    `Wedding RSVP Stats`,
    `──────────────────`,
    `Total RSVPs: ${rsvps.length}`,
    `Attending: ${attending.length} (${totalGuests} total guests)`,
    `Declined: ${declined.length}`,
    ``,
    `Meal Breakdown:`,
    mealSummary,
  ].join('\n');

  return { content: [{ type: 'text', text }] };
});

// Tool: Search RSVPs
server.tool(
  'search_rsvps',
  'Search RSVPs by guest name or email',
  {
    query: z.string().describe('Name or email to search for'),
  },
  async ({ query }) => {
    const rsvps = loadRSVPs();
    const q = query.toLowerCase();
    const matches = rsvps.filter(r =>
      r.primaryGuest.toLowerCase().includes(q) ||
      r.email.toLowerCase().includes(q) ||
      (r.guests || []).some(g => g.name.toLowerCase().includes(q))
    );
    if (matches.length === 0) {
      return { content: [{ type: 'text', text: `No RSVPs found matching "${query}".` }] };
    }
    const details = matches.map(r => {
      const guestNames = (r.guests || []).map(g => g.name).filter(Boolean).join(', ');
      return `${r.primaryGuest} (${r.email}) — ${r.attending}, Party: ${r.partySize || 0}\n  Guests: ${guestNames || 'N/A'}\n  Song: ${r.song || 'N/A'}`;
    }).join('\n\n');
    return {
      content: [{ type: 'text', text: `Found ${matches.length} match(es):\n\n${details}` }],
    };
  }
);

// Tool: Remove an RSVP
server.tool(
  'remove_rsvp',
  'Remove an RSVP by email address',
  {
    email: z.string().email().describe('Email address of the RSVP to remove'),
  },
  async ({ email }) => {
    const rsvps = loadRSVPs();
    const idx = rsvps.findIndex(r => r.email.toLowerCase() === email.toLowerCase());
    if (idx === -1) {
      return { content: [{ type: 'text', text: `No RSVP found for ${email}.` }] };
    }
    const removed = rsvps.splice(idx, 1)[0];
    saveRSVPs(rsvps);
    return {
      content: [{ type: 'text', text: `Removed RSVP for ${removed.primaryGuest} (${email}).` }],
    };
  }
);

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Wedding RSVP MCP server running on stdio');
}

main().catch(console.error);
