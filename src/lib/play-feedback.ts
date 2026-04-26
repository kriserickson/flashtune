import type { Song } from "./types";

export type ResultCopy = {
  headline: string;
  comment: string;
};

const HASH_MULTIPLIER = 31;
const HASH_START = 0;
const YEAR_1940 = 1940;
const YEAR_1960 = 1960;
const YEAR_1970 = 1970;
const YEAR_1980 = 1980;
const YEAR_1990 = 1990;
const YEAR_2000 = 2000;
const YEAR_2010 = 2010;
const YEAR_2020 = 2020;
const RATIO_PERFECT = 1;
const RATIO_EXCELLENT = 0.9;
const RATIO_VERY_GOOD = 0.8;
const RATIO_GOOD = 0.65;
const RATIO_PASS = 0.5;
const RATIO_WARM = 0.35;

const hashSeed = (seed: string): number => {
  let hash = HASH_START;
  for (let index = HASH_START; index < seed.length; index += 1) {
    hash = (hash * HASH_MULTIPLIER + seed.charCodeAt(index)) >>> 0;
  }
  return hash;
};

const pickVariant = <Variant>(options: readonly Variant[], seed: string): Variant =>
  options[hashSeed(seed) % options.length];

const SUCCESS_VARIANTS = [
  {
    threshold: YEAR_1940,
    options: [
      "Well done. Most precise.",
      "A fine placement indeed.",
      "Excellently judged.",
      "Nicely placed. Very proper.",
    ],
  },
  {
    threshold: YEAR_1960,
    options: [
      "Class act. Right on cue.",
      "Smooth move. Right era.",
      "That landed like a standard.",
      "Nicely timed. Pure poise.",
    ],
  },
  {
    threshold: YEAR_1970,
    options: [
      "Groovy call.",
      "Far out placement.",
      "Right in the groove.",
      "That was a swinging sixties read.",
    ],
  },
  {
    threshold: YEAR_1980,
    options: [
      "Disco-sharp.",
      "Right in the pocket.",
      "Seventies instincts. No notes.",
      "That placement had real flare.",
    ],
  },
  {
    threshold: YEAR_1990,
    options: [
      "Rad placement.",
      "Totally nailed it.",
      "Synth-level precision.",
      "That was arena-ready accuracy.",
    ],
  },
  {
    threshold: YEAR_2000,
    options: [
      "Fresh placement.",
      "That was the jam.",
      "Nineties instincts on display.",
      "Right onto the mixtape.",
    ],
  },
  {
    threshold: YEAR_2010,
    options: [
      "Y2K-approved placement.",
      "Clean hit. No skips.",
      "Playlist-era precision.",
      "That guess went platinum.",
    ],
  },
  {
    threshold: YEAR_2020,
    options: [
      "On fleek.",
      "That placement slapped.",
      "Streaming-era instincts.",
      "You understood the assignment.",
    ],
  },
];

const DEFAULT_SUCCESS_VARIANTS = [
  "Immaculate timing.",
  "Main-character move.",
  "Algorithm-proof placement.",
  "That landed exactly right.",
];

const getSuccessVariants = (year: number): readonly string[] => {
  for (const variant of SUCCESS_VARIANTS) {
    if (year < variant.threshold) {
      return variant.options;
    }
  }
  return DEFAULT_SUCCESS_VARIANTS;
};

export const getSuccessMessage = (song: Pick<Song, "year" | "title" | "artist">): string => {
  const seed = `${song.year}:${song.title}:${song.artist}`;
  return pickVariant(getSuccessVariants(song.year), seed);
};

const VERDICT_VARIANTS: { threshold: number; options: readonly ResultCopy[] }[] = [
  {
    threshold: RATIO_PERFECT,
    options: [
      { comment: "Every song landed exactly where it belonged.", headline: "Perfect ear." },
      {
        comment: "That was crate-digger clairvoyance from start to finish.",
        headline: "Flawless run.",
      },
      { comment: "You read the whole round like liner notes.", headline: "Timeline oracle." },
      { comment: "That round was all instinct, no hesitation.", headline: "No misses." },
    ],
  },
  {
    threshold: RATIO_EXCELLENT,
    options: [
      { comment: "One tiny miss away from a museum-grade round.", headline: "Ridiculously good." },
      { comment: "You were locked in for nearly every era.", headline: "Almost spotless." },
      { comment: "That was elite timeline work.", headline: "Top-shelf instincts." },
      { comment: "Just shy of perfect, still absurdly strong.", headline: "Near classic." },
    ],
  },
  {
    threshold: RATIO_VERY_GOOD,
    options: [
      { comment: "You clearly know your eras.", headline: "Locked in." },
      { comment: "That was a confident read across the timeline.", headline: "Serious range." },
      { comment: "Plenty of strong calls in that round.", headline: "Sharp work." },
      {
        comment: "The timeline only slipped away a couple of times.",
        headline: "You had the groove.",
      },
    ],
  },
  {
    threshold: RATIO_GOOD,
    options: [
      {
        comment: "More hits than misses, and some very clean placements.",
        headline: "Solid round.",
      },
      { comment: "A few misses, but the overall read was strong.", headline: "Nice instincts." },
      { comment: "A few misses, but the overall read was strong.", headline: "Good ear." },
      { comment: "That round had real momentum.", headline: "Well played." },
    ],
  },
  {
    threshold: RATIO_PASS,
    options: [
      {
        comment: "Plenty went right, even if the round got tricky.",
        headline: "Right in the mix.",
      },
      { comment: "You found the timeline more often than not.", headline: "Good footing." },
      { comment: "There is clearly an ear for this in there.", headline: "Halfway and climbing." },
      {
        comment: "A few sharper reads and this turns into a big score.",
        headline: "Promising run.",
      },
    ],
  },
  {
    threshold: RATIO_WARM,
    options: [
      {
        comment: "The feel for the timeline is there, just not consistently yet.",
        headline: "Getting warmer.",
      },
      {
        comment: "Some placements were excellent, some were chaos.",
        headline: "Moments of brilliance.",
      },
      {
        comment: "A few more clean reads and this score jumps fast.",
        headline: "You were around it.",
      },
      { comment: "There were flashes of real precision.", headline: "Close in spots." },
    ],
  },
];

const DEFAULT_VERDICT_VARIANTS: readonly ResultCopy[] = [
  { comment: "The timeline threw every curveball it had.", headline: "Tough round." },
  { comment: "That one belonged to the songs. Run it back.", headline: "A full miss." },
  { comment: "No shame. That was a brutal sequence.", headline: "The timeline won." },
  { comment: "This score is only acceptable as motivation.", headline: "Rematch needed." },
];

const getVerdictVariants = (ratio: number): readonly ResultCopy[] => {
  for (const variant of VERDICT_VARIANTS) {
    if (ratio >= variant.threshold) {
      return variant.options;
    }
  }
  return DEFAULT_VERDICT_VARIANTS;
};

export const verdict = (score: number, total: number): ResultCopy => {
  const ratio = score / total;
  const seed = `${score}/${total}`;
  return pickVariant(getVerdictVariants(ratio), seed);
};
