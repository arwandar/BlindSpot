import Fuse from "fuse.js";
import levenshtein from "fast-levenshtein";

interface ValidationOptions {
  titleThreshold?: number;
  artistThreshold?: number;
  minWordRatio?: number;
  minLengthRatio?: number;
}

interface ValidationResult {
  titleMatch: boolean;
  artistMatch: boolean;
  confidence: {
    title: number;
    artist: number;
  };
  debug: {
    normalizedInput: string;
    normalizedTitle: string;
    normalizedArtists: string[];
    titleWordRatio: number;
    artistWordRatios: number[];
  };
}

function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['']/g, " ") // Remplace apostrophes par espaces
    .replace(/[-\/]/g, " ")
    .replace(/\b(le|la|les|un|une|des|the|a|an)\b/gi, "")
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function calculateWordMatchRatio(input: string, target: string): number {
  const inputWords = input.split(/\s+/).filter((w) => w.length > 0);
  const targetWords = target.split(/\s+/).filter((w) => w.length > 0);

  if (targetWords.length === 0) return 0;

  let matchedWords = 0;

  for (const targetWord of targetWords) {
    const found = inputWords.some((inputWord) => {
      // Match exact
      if (inputWord === targetWord) return true;

      const maxLen = Math.max(inputWord.length, targetWord.length);
      const minLen = Math.min(inputWord.length, targetWord.length);

      // Si la différence de taille est trop grande, pas de match partiel
      if (maxLen > minLen * 1.5) {
        return false;
      }

      // Match par inclusion (pluriels, etc.)
      if (inputWord.includes(targetWord) || targetWord.includes(inputWord)) {
        return true;
      }

      // Match par distance de Levenshtein pour les fautes de frappe
      // Pour les mots courts (4-6 chars), on tolère 1 faute
      // Pour les mots plus longs, on tolère 2 fautes
      const distance = levenshtein.get(inputWord, targetWord);
      const maxDistance = targetWord.length <= 6 ? 1 : 2;

      return distance <= maxDistance;
    });

    if (found) matchedWords++;
  }

  return matchedWords / targetWords.length;
}

function isValidMatch(
  input: string,
  target: string,
  minWordRatio: number = 0.6,
  minLengthRatio: number = 0.4 // Réduit de 0.5 à 0.4
): boolean {
  const wordRatio = calculateWordMatchRatio(input, target);
  const lengthRatio =
    Math.min(input.length, target.length) /
    Math.max(input.length, target.length);

  const targetWords = target.split(/\s+/).filter((w) => w.length > 0);

  // Pour les titres/artistes très courts (1-2 mots)
  if (targetWords.length <= 2) {
    return wordRatio >= 0.8 && lengthRatio >= 0.5; // Réduit de 0.6 à 0.5
  }

  // Pour les titres/artistes plus longs (3+ mots)
  // Si tous les mots matchent, on accepte même avec un ratio de longueur plus faible
  if (wordRatio === 1.0) {
    return true; // Tous les mots sont présents, c'est bon !
  }

  return wordRatio >= minWordRatio && lengthRatio >= minLengthRatio;
}

export function validateBlindTest(
  userInput: string,
  correctTitle: string,
  correctArtists: string[],
  options: ValidationOptions = {}
): ValidationResult {
  const {
    titleThreshold = 0.4,
    artistThreshold = 0.4,
    minWordRatio = 0.6,
    minLengthRatio = 0.4, // Réduit de 0.5 à 0.4
  } = options;

  const normalizedInput = normalizeString(userInput);
  const normalizedTitle = normalizeString(correctTitle);
  const normalizedArtists = correctArtists.map((a) => normalizeString(a));

  const fuseOptions = {
    includeScore: true,
    threshold: 0.5,
    ignoreLocation: true,
    minMatchCharLength: 2,
    distance: 100,
  };

  // === VÉRIFICATION DU TITRE ===
  let titleValid = false;
  let titleConfidence = 0;

  const titleFuse = new Fuse([normalizedTitle], fuseOptions);
  const titleMatches = titleFuse.search(normalizedInput);

  if (
    titleMatches.length > 0 &&
    titleMatches[0].score !== undefined &&
    titleMatches[0].score <= titleThreshold
  ) {
    if (
      isValidMatch(
        normalizedInput,
        normalizedTitle,
        minWordRatio,
        minLengthRatio
      )
    ) {
      titleValid = true;
      titleConfidence = 1 - titleMatches[0].score;
    }
  }

  // Match exact ou sous-chaîne
  if (!titleValid) {
    if (normalizedInput === normalizedTitle) {
      titleValid = true;
      titleConfidence = 1;
    } else if (
      normalizedInput.includes(normalizedTitle) ||
      normalizedTitle.includes(normalizedInput)
    ) {
      const lengthRatio =
        Math.min(normalizedInput.length, normalizedTitle.length) /
        Math.max(normalizedInput.length, normalizedTitle.length);
      if (lengthRatio >= 0.6) {
        // Réduit de 0.7 à 0.6
        titleValid = true;
        titleConfidence = lengthRatio;
      }
    }
  }

  // === VÉRIFICATION DE L'ARTISTE ===
  let artistValid = false;
  let artistConfidence = 0;

  for (let i = 0; i < normalizedArtists.length; i++) {
    const artist = normalizedArtists[i];

    const artistFuse = new Fuse([artist], fuseOptions);
    const artistMatches = artistFuse.search(normalizedInput);

    if (
      artistMatches.length > 0 &&
      artistMatches[0].score !== undefined &&
      artistMatches[0].score <= artistThreshold
    ) {
      if (isValidMatch(normalizedInput, artist, minWordRatio, minLengthRatio)) {
        artistValid = true;
        artistConfidence = Math.max(
          artistConfidence,
          1 - artistMatches[0].score
        );
      }
    }

    if (!artistValid) {
      if (normalizedInput === artist) {
        artistValid = true;
        artistConfidence = 1;
      } else if (
        normalizedInput.includes(artist) ||
        artist.includes(normalizedInput)
      ) {
        const lengthRatio =
          Math.min(normalizedInput.length, artist.length) /
          Math.max(normalizedInput.length, artist.length);
        if (lengthRatio >= 0.6) {
          // Réduit de 0.7 à 0.6
          artistValid = true;
          artistConfidence = Math.max(artistConfidence, lengthRatio);
        }
      }
    }

    if (artistValid) break;
  }

  return {
    titleMatch: titleValid,
    artistMatch: artistValid,
    confidence: {
      title: titleConfidence,
      artist: artistConfidence,
    },
    debug: {
      normalizedInput,
      normalizedTitle,
      normalizedArtists,
      titleWordRatio: calculateWordMatchRatio(normalizedInput, normalizedTitle),
      artistWordRatios: normalizedArtists.map((a) =>
        calculateWordMatchRatio(normalizedInput, a)
      ),
    },
  };
}

// Tests
console.log("=== Tests de validation ===\n");

console.log('Test BUG - "twenty one pilots stressed out":');
const resultBug = validateBlindTest(
  "twenty one pilots stressed out",
  "Stressed Out",
  ["Twenty One Pilots"]
);
console.log(
  `titleMatch: ${resultBug.titleMatch}, artistMatch: ${resultBug.artistMatch}`
);
console.log(`Debug - Input: "${resultBug.debug.normalizedInput}"`);
console.log(
  `Debug - Title: "${
    resultBug.debug.normalizedTitle
  }" (wordRatio: ${resultBug.debug.titleWordRatio.toFixed(2)})`
);
console.log(
  `Debug - Artist: "${
    resultBug.debug.normalizedArtists[0]
  }" (wordRatio: ${resultBug.debug.artistWordRatios[0].toFixed(2)})`
);
console.log();

console.log('Test 1 - "mort" ne devrait PAS matcher "mort ou vif":');
const result1 = validateBlindTest("mort", "Mort ou vif", ["Dernière Chance"]);
console.log(
  `titleMatch: ${result1.titleMatch}, artistMatch: ${result1.artistMatch}\n`
);

console.log('Test 2 - "mort ou vif" devrait matcher:');
const result2 = validateBlindTest("mort ou vif", "Mort ou vif", [
  "Dernière Chance",
]);
console.log(`titleMatch: ${result2.titleMatch}\n`);

console.log('Test 3 - "mort vif derniere" devrait matcher SEULEMENT le titre:');
const result3 = validateBlindTest("mort vif derniere", "Mort ou vif", [
  "Dernière Chance",
]);
console.log(
  `titleMatch: ${result3.titleMatch}, artistMatch: ${result3.artistMatch}\n`
);

console.log('Test 4 - "skiillet" (faute) devrait matcher "Skillet":');
const result4 = validateBlindTest("skiillet", "Some Song", ["Skillet"]);
console.log(`artistMatch: ${result4.artistMatch}\n`);

console.log('Test 5 - "mallory know" devrait matcher "Mallory Knox":');
const result5 = validateBlindTest("mallory know", "Some Song", [
  "Mallory Knox",
]);
console.log(`artistMatch: ${result5.artistMatch}`);
console.log(
  `Debug - wordRatio: ${result5.debug.artistWordRatios[0].toFixed(2)}\n`
);

export default validateBlindTest;
