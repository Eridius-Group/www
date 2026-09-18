import stopwordsRaw from '../data/stopwords.json';
import affixesRaw from '../data/affixes.json';
import prepositionsRaw from '../data/prepositions.json';
import occupationsRaw from '../data/occupations.json';
import verbsRaw from '../data/verbs.json';
import nounsRaw from '../data/nouns.json';
import techTermsRaw from '../data/techTerms.json';
import objectsRaw from '../data/objects.json';

/**
 * @returns {Promise<Object>} Formatted arrays and sets for grammar parsing.
 */
async function fetchLinguisticDependencies() {
  return {
    stopwords: new Set(stopwordsRaw),
    nouns: new Set(nounsRaw),
    techTerms: new Set(techTermsRaw),
    objects: new Set(objectsRaw),
    suffixes: affixesRaw,
    copulas: ["am", "is", "are", "was", "were", "be", "being", "been"],
    prepositions: prepositionsRaw,
    occupations: new Set(occupationsRaw),
    pastVerbs: verbsRaw,
  };
}

class QuizSession {
  rules: any;
  markdownText: string;
  allQuestions: any[];
  candidatePools: any;
  seenAnswers: Set<string>;
  seenSentences: Set<number>;
  yearRegex: RegExp;
  prepRegex: RegExp;
  copulaRegex: RegExp;
  verbRegex: RegExp;

  constructor(markdownText: string, rules: any) {
    this.rules = rules;
    this.markdownText = markdownText;
    this.allQuestions = [];
    this.candidatePools = {
      TIME: [],
      "LOCATION/ENTITY": [],
      DEFINITION: [],
      ACTION: [],
      CLOZE: [],
    };
    this.seenAnswers = new Set();
    this.seenSentences = new Set();

    this.yearRegex = /^(?:18|19|20)\d{2}$/;
    this.prepRegex = new RegExp(
      `^(.*?)\\s+\\b(${rules.prepositions.join("|")})\\b\\s+([A-Z0-9].*)$`,
      "i",
    );
    this.copulaRegex = new RegExp(
      `^([A-Z][\\w\\s-]+?)\\s+\\b(${rules.copulas.join("|")})\\b\\s+(.+)$`,
      "i",
    );
    this.verbRegex = new RegExp(
      `^([A-Z][\\w\\s-]+?)\\s+\\b(${rules.pastVerbs.slice(0, 500).join("|")})\\b\\s+(.+)$`,
      "i",
    );

    this._generateAllQuestions();
  }

  _cleanMarkdown(text) {
    return text
      .replace(/```[\s\S]*?```/g, "")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/^#+\s+/gm, "")
      .replace(/!\[([^\]]*)\]\([^\)]+\)/g, "$1")
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1")
      .replace(/[*~]{1,3}/g, "")
      .replace(/(?<=^|\s)_{1,2}(\S+?)_{1,2}(?=\s|[.,!?;:]|$)/g, "$1")
      .replace(/^\s*[-*+]\s+/gm, "")
      .replace(/^\s*\d+\.\s+/gm, "");
  }

  _splitSentences(text) {
    return text
      .split(/(?<=[.!?\n])\s+(?=[A-Z0-9])/)
      .map((s) => s.replace(/\s+/g, " ").trim())
      .filter((s) => s.length > 35 && /[.!?]$/.test(s));
  }

  _isTechnical(word) {
    const lower = word.toLowerCase();
    if (this.rules.techTerms.has(lower)) return true;
    return this.rules.suffixes.some(
      (sfx) => lower.endsWith(sfx) && lower.length > sfx.length + 2,
    );
  }

  _buildPools(text) {
    const pools = {
      YEARS: new Set(),
      NUMBERS: new Set(),
      PROPER: new Set(),
      TECHNICAL: new Set(),
      GENERAL: new Set(),
    };

    const tokens = text.match(/\b[A-Za-z0-9_-]+\b/g) || [];
    tokens.forEach((token, idx) => {
      const lower = token.toLowerCase();
      if (this.rules.stopwords.has(lower) || token.length <= 2) return;

      if (this.yearRegex.test(token)) pools.YEARS.add(token);
      else if (/^\d+$/.test(token)) pools.NUMBERS.add(token);
      else if (idx !== 0 && /^[A-Z][a-z0-9_-]+$/.test(token))
        pools.PROPER.add(token);
      else if (this._isTechnical(token)) pools.TECHNICAL.add(token);
      else pools.GENERAL.add(token);
    });

    const rawPhrases =
      text.match(/\b[A-Za-z0-9_-]+(?:\s+[A-Za-z0-9_-]+){1,3}\b/g) || [];
    rawPhrases.forEach((phrase) => {
      if (phrase.split(/\s+/).length >= 2 && this.isValidNounSubject(phrase)) {
        /^[A-Z]/.test(phrase)
          ? pools.PROPER.add(phrase)
          : pools.GENERAL.add(phrase);
      }
    });

    return pools;
  }

  isPerson(text) {
    if (!text) return false;
    const lower = text.toLowerCase();
    return Array.from(this.rules.occupations).some((occ) =>
      lower.includes(occ),
    );
  }

  isPluralWord(word) {
    const w = word.toLowerCase();
    if (/ss|us|is|as|os$/i.test(w) || this.rules.stopwords.has(w)) return false;
    return w.endsWith("s");
  }

  isPlural(text) {
    if (!text) return false;
    const words = text.trim().split(/\s+/);
    return this.isPluralWord(words[words.length - 1]);
  }

  isUnpluralizable(word) {
    return /ed|ing|ly|ful|less|able|ible$/i.test(word.toLowerCase());
  }

  matchPlurality(text: string, makePlural: boolean) {
    const words = text.split(/\s+/);
    let lastWord = words.pop() as string;
    const currentlyPlural = this.isPluralWord(lastWord);

    if (currentlyPlural === makePlural) return text;

    if (makePlural) {
      if (this.isUnpluralizable(lastWord)) return null;
      if (/[^aeiou]y$/i.test(lastWord))
        lastWord = lastWord.slice(0, -1) + "ies";
      else if (/(?:ss|x|z|ch|sh)$/i.test(lastWord)) lastWord += "es";
      else lastWord += "s";
    } else {
      if (lastWord.endsWith("ies") && lastWord.length > 4)
        lastWord = lastWord.slice(0, -3) + "y";
      else if (/(?:ss|x|z|ch|sh)es$/i.test(lastWord))
        lastWord = lastWord.slice(0, -2);
      else if (
        lastWord.endsWith("s") &&
        !lastWord.endsWith("ss") &&
        lastWord.length > 2
      )
        lastWord = lastWord.slice(0, -1);
    }

    return [...words, lastWord].join(" ");
  }

  pickDistractors(target: string, primaryPool: Set<string>, fallbackPool: Set<string>, limit = 3) {
    const targetWords = target.trim().split(/\s+/).filter(Boolean).length;
    const targetLower = target.toLowerCase();
    const targetPlural = this.isPlural(target);

    const getMatchingCandidates = (poolSet: Set<string>) => {
      const candidates = [];
      Array.from(poolSet).forEach((x) => {
        const adjusted = this.matchPlurality(x, targetPlural);
        if (!adjusted || adjusted.toLowerCase() === targetLower) return;
        const wCount = adjusted.trim().split(/\s+/).filter(Boolean).length;
        if (targetWords === 1 && wCount !== 1) return;
        if (targetWords > 1 && Math.abs(wCount - targetWords) > 1) return;
        if (!candidates.includes(adjusted)) candidates.push(adjusted);
      });
      return candidates;
    };

    const primaryCandidates = getMatchingCandidates(primaryPool);
    const fallbackCandidates = getMatchingCandidates(fallbackPool);

    let picked = primaryCandidates
      .sort(() => 0.5 - Math.random())
      .slice(0, limit);

    if (picked.length < limit) {
      const remainingFallback = fallbackCandidates.filter(
        (x) => !picked.includes(x),
      );
      picked.push(
        ...remainingFallback
          .sort(() => 0.5 - Math.random())
          .slice(0, limit - picked.length),
      );
    }

    if (picked.length < limit && targetWords > 1) {
      const candidatePhrases = Array.from(primaryPool)
        .concat(Array.from(fallbackPool))
        .filter((phrase) => {
          if (!this.isValidNounSubject(phrase)) return false;
          const wCount = phrase.trim().split(/\s+/).filter(Boolean).length;
          return Math.abs(wCount - targetWords) <= 1;
        });

      for (const phrase of candidatePhrases) {
        if (picked.length >= limit) break;
        const synthetic = this.matchPlurality(phrase, targetPlural);
        if (
          synthetic &&
          synthetic.toLowerCase() !== targetLower &&
          !picked.includes(synthetic)
        ) {
          picked.push(synthetic);
        }
      }
    }

    return picked.length === limit ? picked : null;
  }

  extractConditionalPrefix(str) {
    if (!str) return { prefix: "", cleanText: str };
    const words = str.trim().split(/\s+/);
    const firstLower = words[0].toLowerCase();

    if (
      (this.rules.prepositions.includes(firstLower) ||
        ["if", "when", "because"].includes(firstLower)) &&
      words.length > 1
    ) {
      const prefix = firstLower.charAt(0).toUpperCase() + firstLower.slice(1);
      const cleanText = words.slice(1).join(" ");
      return { prefix, cleanText };
    }
    return { prefix: "", cleanText: str };
  }

  isValidNounSubject(text) {
    if (!text) return false;
    const words = text.trim().split(/\s+/);
    if (words.length > 4) return false;

    for (const w of words) {
      const lower = w.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (
        this.rules.stopwords.has(lower) &&
        !this.rules.nouns.has(lower) &&
        !this.rules.techTerms.has(lower) &&
        !this.rules.objects.has(lower)
      ) {
        return false;
      }
    }

    const lastWord = words[words.length - 1]
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
    if (
      this.rules.stopwords.has(lastWord) ||
      this.rules.prepositions.includes(lastWord)
    ) {
      return false;
    }
    return true;
  }

  _parseCandidatesForSentence(sentence, sIdx, pools) {
    const candidates = [];
    let clean = sentence.replace(/^["\"']|["\"']$/g, "").trim();

    if (clean.includes(",")) {
      const splitByComma = clean.split(/,\s*/);
      if (
        splitByComma.length >= 2 &&
        splitByComma[0].split(/\s+/).length <= 4
      ) {
        clean = splitByComma.slice(1).join(", ").trim();
      }
    }

    const prepMatch = clean.match(this.prepRegex);
    if (prepMatch) {
      const [, clause, prep, target] = prepMatch;
      if (this.yearRegex.test(target)) {
        const distractors = this.pickDistractors(
          target,
          pools.YEARS,
          pools.NUMBERS,
        );
        if (distractors) {
          candidates.push({
            type: "TIME",
            prompt: `In what year ${clause.split("\n")[0].toLowerCase()}?`,
            answer: target,
            options: [...distractors, target].sort(() => 0.5 - Math.random()),
            sentenceIdx: sIdx,
          });
        }
      }
      if (/^[A-Z]/.test(target) && target.split(" ").length < 4) {
        const distractors = this.pickDistractors(
          target,
          pools.PROPER,
          pools.GENERAL,
        );
        if (distractors) {
          candidates.push({
            type: "LOCATION/ENTITY",
            prompt: `Where or with what ${prep.toLowerCase()} did this occur:<br>"${clause.split("\n")[0]}"?`,
            answer: target,
            options: [...distractors, target].sort(() => 0.5 - Math.random()),
            sentenceIdx: sIdx,
          });
        }
      }
    }

    const copulaMatch = clean.match(this.copulaRegex);
    if (copulaMatch) {
      let [, subject, copula, predicate] = copulaMatch;
      if (subject.includes(",")) subject = subject.split(/,\s*/).pop().trim();

      const { prefix, cleanText: cleanSubject } =
        this.extractConditionalPrefix(subject);
      subject = cleanSubject;
      const whWord = this.isPerson(subject) ? "Who" : "What";

      if (
        this.isValidNounSubject(subject) &&
        !this.rules.stopwords.has(subject.toLowerCase()) &&
        subject.length > 0
      ) {
        const primaryPool = this._isTechnical(subject)
          ? pools.TECHNICAL
          : pools.PROPER;
        const distractors = this.pickDistractors(
          subject,
          primaryPool,
          pools.GENERAL,
        );
        if (distractors) {
          candidates.push({
            type: `DEFINITION (${whWord.toUpperCase()})`,
            prompt: `${prefix ? `${prefix} ${whWord.toLowerCase()}` : whWord} ${copula.toLowerCase()} ${predicate}?`,
            answer: subject,
            options: [...distractors, subject].sort(() => 0.5 - Math.random()),
            sentenceIdx: sIdx,
          });
        }
      }
    }

    const actionMatch = clean.match(this.verbRegex);
    if (actionMatch) {
      let [, subject, verb, predicate] = actionMatch;
      if (subject.includes(",")) subject = subject.split(/,\s*/).pop().trim();

      const { prefix, cleanText: cleanSubject } =
        this.extractConditionalPrefix(subject);
      subject = cleanSubject;
      const whWord = this.isPerson(subject) ? "Who" : "What";

      if (
        this.isValidNounSubject(subject) &&
        !this.rules.stopwords.has(subject.toLowerCase()) &&
        subject.length > 0
      ) {
        const primaryPool = this._isTechnical(subject)
          ? pools.TECHNICAL
          : pools.PROPER;
        const distractors = this.pickDistractors(
          subject,
          primaryPool,
          pools.GENERAL,
        );
        if (distractors) {
          candidates.push({
            type: `ACTION (${whWord.toUpperCase()})`,
            prompt: `${prefix ? `${prefix} ${whWord.toLowerCase()}` : whWord} ${verb.toLowerCase()} ${predicate}?`,
            answer: subject,
            options: [...distractors, subject].sort(() => 0.5 - Math.random()),
            sentenceIdx: sIdx,
          });
        }
      }
    }

    const wordsInSent = sentence.match(/\b[A-Za-z0-9_-]+\b/g) || [];
    const scored = [];
    wordsInSent.forEach((w, idx) => {
      if (this.rules.stopwords.has(w.toLowerCase()) || w.length <= 3) return;
      let score = w.length;
      let cat = "GENERAL";

      if (this.yearRegex.test(w) || /^\d+$/.test(w)) {
        score += 15;
        cat = "NUMBERS";
      } else if (idx !== 0 && /^[A-Z][a-z0-9_-]+$/.test(w)) {
        score += 10;
        cat = "PROPER";
      } else if (this._isTechnical(w)) {
        score += 8;
        cat = "TECHNICAL";
      }
      scored.push({ token: w, cat, score });
    });

    if (scored.length > 0) {
      scored.sort((a, b) => b.score - a.score);
      const target = scored[0];
      const distractors = this.pickDistractors(
        target.token,
        pools[target.cat] || pools.GENERAL,
        pools.GENERAL,
      );
      if (distractors) {
        const escapedToken = target.token.replace(
          /[-\/\\^$*+?.()|[\]{}]/g,
          "\\$&",
        );
        const blanked = sentence.replace(
          new RegExp(`\\b${escapedToken}\\b`, "gi"),
          "__________",
        );
        candidates.push({
          type: "CLOZE",
          prompt: `Fill in the blank:<br>"${blanked}"`,
          answer: target.token,
          options: [...distractors, target.token].sort(
            () => 0.5 - Math.random(),
          ),
          sentenceIdx: sIdx,
        });
      }
    }

    return candidates;
  }

  _generateAllQuestions() {
    const plainText = this._cleanMarkdown(this.markdownText);
    const sentences = this._splitSentences(plainText);
    if (sentences.length === 0) return;

    const pools = this._buildPools(plainText);

    sentences.forEach((s, sIdx) => {
      const candidates = this._parseCandidatesForSentence(s, sIdx, pools);
      candidates.forEach((q) => {
        let group = q.type;
        if (q.type.startsWith("ACTION")) group = "ACTION";
        if (q.type.startsWith("DEFINITION")) group = "DEFINITION";
        if (this.candidatePools[group]) {
          this.candidatePools[group].push(q);
        }
      });
    });

    this.allQuestions = Object.values(this.candidatePools).flat();
  }

  selectQuestions(count = 5) {
    if (this.allQuestions.length === 0) return [];

    const pools = {
      TIME: this.candidatePools.TIME.filter(
        (q) => !this.seenAnswers.has(q.answer.toLowerCase()),
      ),
      "LOCATION/ENTITY": this.candidatePools["LOCATION/ENTITY"].filter(
        (q) => !this.seenAnswers.has(q.answer.toLowerCase()),
      ),
      DEFINITION: this.candidatePools.DEFINITION.filter(
        (q) => !this.seenAnswers.has(q.answer.toLowerCase()),
      ),
      ACTION: this.candidatePools.ACTION.filter(
        (q) => !this.seenAnswers.has(q.answer.toLowerCase()),
      ),
      CLOZE: this.candidatePools.CLOZE.filter(
        (q) => !this.seenAnswers.has(q.answer.toLowerCase()),
      ),
    };

    if (Object.values(pools).flat().length === 0) {
      this.resetSeen();
      return this.selectQuestions(count);
    }

    const activeCats = Object.keys(pools).filter((k) => pools[k].length > 0);
    const selected = [];
    const usedSents = new Set();
    const usedAnsw = new Set();

    while (selected.length < count && activeCats.length > 0) {
      const cat = activeCats.shift();
      const pool = pools[cat].sort(() => 0.5 - Math.random());

      const q = pool.find(
        (q) =>
          !usedSents.has(q.sentenceIdx) &&
          !usedAnsw.has(q.answer.toLowerCase()) &&
          !this.seenAnswers.has(q.answer.toLowerCase()),
      );

      if (q) {
        selected.push(q);
        usedSents.add(q.sentenceIdx);
        usedAnsw.add(q.answer.toLowerCase());
        this.seenAnswers.add(q.answer.toLowerCase());
        this.seenSentences.add(q.sentenceIdx);
        activeCats.push(cat);
      }
    }

    return selected.sort(() => 0.5 - Math.random());
  }

  resetSeen() {
    this.seenAnswers.clear();
    this.seenSentences.clear();
  }

  static serializeQuestionsToHtml(questions) {
    if (!questions || questions.length === 0) {
      return '<div class="quiz-empty"><p>No suitable questions available from text.</p></div>';
    }

    const optionLetters = ["A", "B", "C", "D"];
    const questionsMarkup = questions
      .map((q, idx) => {
        const optionsHtml = q.options
          .map(
            (opt, oIdx) => `
        <label class="answer" for="question_${idx}" data-iscorrect="${opt === q.answer}">
          <input type="radio" name="question_${idx}" value="${opt}">
          ${optionLetters[oIdx]}) ${opt}
        </label>`,
          )
          .join("");

        return `
        <article data-type="${q.type}" data-index="${idx}" class="question">
          <p>Question ${idx + 1} of ${questions.length}</p>
          <p>${q.prompt}</p>
          ${optionsHtml}
        </article>`;
      })
      .join("");

    return `${questionsMarkup}`.trim();
  }

  renderHtml(count = 5) {
    const questions = this.selectQuestions(count);
    return QuizSession.serializeQuestionsToHtml(questions);
  }
}

function handleAnswerClick(ev: Event) {
  const target = ev.target as HTMLElement;
  const targetLabel: HTMLElement = target.tagName === "INPUT" ? target.parentElement! : target;
  const container = targetLabel.parentElement!;
  const radio = querySelector("input", targetLabel) as HTMLInputElement;
  const correctLabel = querySelector("[data-iscorrect=true]", container);

  if (radio.disabled) return;
  radio.checked = true;

  window.questionTotal++;
  if ((targetLabel as HTMLElement & { dataset: DOMStringMap }).dataset.iscorrect === "true") window.questionCorrect++;
  else (targetLabel as HTMLElement).style.background = "red";

  for (const input of querySelectorAll("input", container))
    (input as HTMLInputElement).disabled = true;
  (correctLabel as HTMLElement).style.background = "green";

  getElementById("questionTotal").innerText = window.questionTotal.toString();
  getElementById("questionCorrect").innerText = window.questionCorrect.toString();
}

function loadQuestions() {
  window.questionTotal = 0;
  window.questionCorrect = 0;
  getElementById("questionTotal").innerText = "0";
  getElementById("questionCorrect").innerText = "0";

  for (const label of querySelectorAll(".question label.answer")) {
    label.addEventListener("click", handleAnswerClick as EventListener);
  }
}

export async function init() {
  const introContent = getElementById("introContent");
  const rules = await fetchLinguisticDependencies();
  window.activeQuizSession = new QuizSession(introContent.innerText, rules);
  introContent.innerText = "Loading...";
  window.setContents(introContent, window.activeQuizSession.renderHtml(5));

  getElementById("tryAgain").addEventListener("click", () => {
    if (window.activeQuizSession) {
      window.setContents(
        getElementById("introContent"),
        window.activeQuizSession.renderHtml(5),
      );
      loadQuestions();
    }
  });

  loadQuestions();
}
