# Incident list (`/breaches`)

The page lists cyber incidents announced in Japan: data breaches, ransomware, outages, fraud. The data is one file, `src/data/breaches.json`
(newest first); the page, `src/tools/breaches/`, only shows it. Real organizations are named, so **an entry that cannot be backed by a source is not
published.**

## What an entry must have

| field | meaning |
| --- | --- |
| `id`, `date` | kebab-case id; the date the organization (or the first report) announced it, `YYYY-MM-DD`, or `YYYY-MM` when only the month is known. Never invent a day. |
| `name`, `type` | the organization; `leak`, `ransomware`, `outage`, `fraud`, `other` |
| `count`, `countNote` | `count` is a number for sorting and the bar, `null` when none is published; `countNote` is the words as published ("最大", "可能性" included). The number must appear in the note. |
| `data`, `cause`, `note` | what was exposed, how it happened, anything else (conflicting figures between sources go in `note`) |
| `verification` | how well it was checked, below |
| `checkedAt` | the day the sources were last read |
| `sources` | `{ name, url, kind }`, `kind` = `official` (the organization's own page), `press`, `aggregator` (a roundup that rewrites others' reports) |

## How well it was checked

- `official`: a page of the organization itself is among the sources. Read the page, not only its title.
- `reported`: at least two outlets on **different sites** agree, not counting aggregators, and none merely copies another (a wire story reprinted by
  newspapers is one report).
- `single`: only one outlet was found. It is shown with a warning, it is the first to re-check, and when the organization's own page is found it is
  upgraded to `official`.

A figure that only an aggregator gives (the organization's page does not state it) is kept, with the aggregator among the sources and a line in `note`.

## Where it came from (`origin`)

- `attack`: someone outside broke in or deceived - unauthorized access, malware, ransomware, phishing, fraud, a vulnerability that was used. Most entries.
- `insider`: someone inside the organization, or one of its secondees, took the data.
- `mistake`: not an attack - a loss, a mistaken send, a wrong setting, a defect, staff using a tool they should not.

What is not an attack must say why (`originBasis`) and name the words its sources use for it (`originProof`, e.g. "紛失", "誤送信", "出向"). The
source check reads the pages and warns when none of them has the word, so that "not an attack" is something that was read, not assumed. A ransomware
or a fraud cannot be one. When unsure, call it an attack: it is the case that needs the least explaining.

## The checks

1. **Rules, offline** - `src/tools/breaches/breaches-rules.mjs`, run by `npm test` on every pull request (`breaches-data.test.mjs`): ids, dates (not in
   the future), `https` sources, the verification rules above, and that `count` appears in `countNote`. A change to the list that breaks one cannot merge.
2. **Sources, on the web** - `npm run breaches:check` (`scripts/check-breaches.mjs`; `-- --only id,id`, `-- --no-content`, `-- --strict`). It opens every
   link and prints, per entry:
   - `FAIL` for a dead link (404/410/no answer): the entry is not backed any more - find a new source or remove it. (This found a dead link and two
     sources that were about another company when the list was first checked.)
   - `WARN` for a block (403/429), a page that does not name the organization, or a page that does not show the count. Open it: the page may load its
     text by script or write the number differently, or the entry may be wrong.
   The weekly workflow `.github/workflows/breaches-check.yml` runs it and fails on a dead link, so it shows up in the Actions tab.
3. **By eye, when adding or changing an entry**: read the sources; copy the figure and the date as written; if two sources disagree, say so in `note`
   rather than choosing silently; set `checkedAt`. Do not add an entry from a roundup alone without opening the page it points to.

Dates and counts change as an investigation goes on (first report, second report, final). The date is the first announcement; the latest figure goes
in `countNote`, with the earlier one in `note`.

## The charts

Above the list, for the entries the filters leave: incidents per month by type (stacked columns) and the size of each incident with a published
count (dots, log scale). The numbers are in `breaches-stats.ts` (tested in `breaches-stats.test.mjs`); the drawing is `breaches-charts.tsx`. The axis
always covers the whole list, so a filter takes columns down but does not move anything. The colours are the validated categorical palette for the five
types; the contrast of some of them against the surface is under 3:1, so the legend, the tooltips and the table under the chart are not optional.
The charts count what is listed, not what happened: the page says so, and months that were researched less show lower.
