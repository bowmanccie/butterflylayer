// scripts/fetch_quiet_daily.js
// Fetch USCCB Daily Readings page for today's date (Eastern time),
// extract feast name, lectionary, reading citations, and rosary mysteries,
// then write site/assets/meta/quiet_daily.json

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

// --- Helpers -------------------------------------------------------------

function getEasternDateParts() {
  const now = new Date();

  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'long',
  });

  const parts = fmt.formatToParts(now);
  const get = (type) => parts.find((p) => p.type === type)?.value;

  const year = get('year');
  const month = get('month'); // 01–12
  const day = get('day');     // 01–31
  const weekday = get('weekday'); // Monday, Tuesday, ...

  return { year, month, day, weekday };
}

function weekdayToRosaryMysteries(weekday) {
  // Weekday names from Intl in en-US: Sunday, Monday, ...
  switch (weekday) {
    case 'Monday':
    case 'Saturday':
      return 'joyful';
    case 'Tuesday':
    case 'Friday':
      return 'sorrowful';
    case 'Wednesday':
    case 'Sunday':
      return 'glorious';
    case 'Thursday':
      return 'luminous';
    default:
      return null;
  }
}

// --- Main ----------------------------------------------------------------

(async () => {
  try {
    const { year, month, day, weekday } = getEasternDateParts();

    const yy = String(parseInt(year, 10) % 100).padStart(2, '0');
    const mm = month;
    const dd = day;

    const isoDate = `${year}-${mm}-${dd}`;
    const usccbUrl = `https://bible.usccb.org/bible/readings/${mm}${dd}${yy}.cfm`;

    console.log(`Fetching USCCB daily readings for ${isoDate} (${weekday})`);
    console.log(`URL: ${usccbUrl}`);

    const res = await fetch(usccbUrl);
    if (!res.ok) {
      throw new Error(`Failed to fetch USCCB page: ${res.status} ${res.statusText}`);
    }
    const html = await res.text();

    const dom = new JSDOM(html);
    const doc = dom.window.document;

    // Feast / title line (e.g. "Thursday of the Second Week of Advent")
    const titleEl = doc.querySelector('h2');
    const feast = titleEl ? titleEl.textContent.trim() : null;

    // Lectionary: look for a block that starts with "Lectionary:"
    let lectionary = null;
    const textBlocks = Array.from(doc.querySelectorAll('p, div'));
    for (const el of textBlocks) {
      const text = el.textContent.trim();
      const m = /^Lectionary:\s*(.+)$/.exec(text);
      if (m) {
        lectionary = m[1].trim();
        break;
      }
    }

    // Readings: use <h3> headings to find Reading I, Responsorial Psalm, Alleluia, Gospel
    const readings = [];
    const h3s = Array.from(doc.querySelectorAll('h3'));

    for (const h3 of h3s) {
      const label = h3.textContent.trim();

      let type;
      if (/^Reading/i.test(label)) type = 'reading';
      else if (/Responsorial Psalm/i.test(label)) type = 'psalm';
      else if (/Alleluia/i.test(label)) type = 'alleluia';
      else if (/Gospel/i.test(label)) type = 'gospel';
      else continue; // ignore other headings

      // Walk forward until we find the first <a> (the citation),
      // or hit another <h3>.
      let node = h3.nextElementSibling;
      let citation = null;

      while (node && node.tagName !== 'H3') {
        const link = node.querySelector && node.querySelector('a');
        if (link && link.textContent.trim()) {
          citation = link.textContent.trim();
          break;
        }
        node = node.nextElementSibling;
      }

      readings.push({
        label,
        type,
        citation,
      });
    }

    const rosaryMysteries = weekdayToRosaryMysteries(weekday);

    const quietData = {
      source: 'usccb',
      generated_at: new Date().toISOString(),
      date: isoDate,
      weekday,                // e.g. "Thursday"
      usccb_url: usccbUrl,
      feast,                  // e.g. "Thursday of the Second Week of Advent"
      lectionary,             // e.g. "184"
      liturgical_color: null, // TODO: fill from official calendar in a later phase
      rosary_mysteries: rosaryMysteries, // "joyful" / "sorrowful" / "glorious" / "luminous"
      readings,               // array of { label, type, citation }
    };

    const targetPath = path.join(
      __dirname,
      '..',
      'site',
      'assets',
      'meta',
      'quiet_daily.json'
    );

    const jsonText = JSON.stringify(quietData, null, 2) + '\n';

    let existing = null;
    if (fs.existsSync(targetPath)) {
      existing = fs.readFileSync(targetPath, 'utf8');
    }

    if (existing && existing.trim() === jsonText.trim()) {
      console.log('quiet_daily.json unchanged; nothing to commit.');
      process.exit(0);
    }

    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.writeFileSync(targetPath, jsonText, 'utf8');

    console.log(`Updated ${targetPath}`);
  } catch (err) {
    console.error('Error updating quiet_daily.json:', err);
    process.exit(1);
  }
})();
