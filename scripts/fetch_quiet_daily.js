// scripts/fetch_quiet_daily.js
// Fetch USCCB Daily Readings page for today's date (Eastern time),
// extract feast name, lectionary, reading citations, and rosary mysteries,
// then write assets/meta/quiet_daily.json

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const fetch = require('node-fetch'); // polyfill for Node 12

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
  function get(type) {
    const found = parts.find(function (p) {
      return p.type === type;
    });
    return found ? found.value : null;
  }

  const year = get('year');
  const month = get('month'); // 01–12
  const day = get('day');     // 01–31
  const weekday = get('weekday'); // Monday, Tuesday, ...

  return { year, month, day, weekday };
}

function weekdayToRosaryMysteries(weekday) {
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
    const parts = getEasternDateParts();
    const year = parts.year;
    const month = parts.month;
    const day = parts.day;
    const weekday = parts.weekday;

    const yy = String(parseInt(year, 10) % 100).padStart(2, '0');
    const mm = month;
    const dd = day;

    const isoDate = year + '-' + mm + '-' + dd;
    const usccbUrl = 'https://bible.usccb.org/bible/readings/' + mm + dd + yy + '.cfm';

    console.log('Fetching USCCB daily readings for ' + isoDate + ' (' + weekday + ')');
    console.log('URL: ' + usccbUrl);

    const res = await fetch(usccbUrl);
    if (!res.ok) {
      throw new Error('Failed to fetch USCCB page: ' + res.status + ' ' + res.statusText);
    }
    const html = await res.text();

    const dom = new JSDOM(html);
    const doc = dom.window.document;

    // Feast / title line
    let feast = null;

    // Look through headings to find the *liturgical* title, not nav items.
    const headingEls = Array.from(doc.querySelectorAll('h2, h3, h4'));

    for (const el of headingEls) {
      const text = el.textContent.trim();

      // Skip obvious nav garbage
      if (text.startsWith('Menu:')) continue;
      if (text === 'Daily Readings') continue;

      // Look for common liturgical patterns
      if (
        /^Feast/i.test(text) ||
        /^Memorial/i.test(text) ||
        /^Optional Memorial/i.test(text) ||
        /^Solemnity/i.test(text) ||
        /Sunday/i.test(text) ||
        /Week of/i.test(text) ||
        /^Saint /i.test(text) ||
        /^St\./i.test(text)
      ) {
        feast = text;
        break;
      }
    }

    // Lectionary
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

    // Readings via <h3> blocks
    const readings = [];
    const h3s = Array.from(doc.querySelectorAll('h3'));

    for (const h3 of h3s) {
      const label = h3.textContent.trim();

      let type;
      if (/^Reading/i.test(label)) type = 'reading';
      else if (/Responsorial Psalm/i.test(label)) type = 'psalm';
      else if (/Alleluia/i.test(label)) type = 'alleluia';
      else if (/Gospel/i.test(label)) type = 'gospel';
      else continue;

      let node = h3.nextElementSibling;
      let citation = null;

      while (node && node.tagName !== 'H3') {
        const link = node.querySelector && node.querySelector('a');
        if (link && link.textContent && link.textContent.trim()) {
          citation = link.textContent.trim();
          break;
        }
        node = node.nextElementSibling;
      }

      readings.push({
        label: label,
        type: type,
        citation: citation,
      });
    }

    const rosaryMysteries = weekdayToRosaryMysteries(weekday);

    const quietData = {
      source: 'usccb',
      generated_at: new Date().toISOString(),
      date: isoDate,
      weekday: weekday,
      usccb_url: usccbUrl,
      feast: feast,
      lectionary: lectionary,
      liturgical_color: null, // placeholder for future enhancement
      rosary_mysteries: rosaryMysteries,
      readings: readings,
    };

    const targetPath = path.join(
      __dirname,
      '..',
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
      console.log('quiet_daily.json unchanged; nothing to write.');
      process.exit(0);
    }

    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.writeFileSync(targetPath, jsonText, 'utf8');

    console.log('Updated ' + targetPath);
  } catch (err) {
    console.error('Error updating quiet_daily.json:', err);
    process.exit(1);
  }
})();
