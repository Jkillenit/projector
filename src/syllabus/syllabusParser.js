export function parseSyllabus(text) {
  const source = String(text || "");
  return {
    grading: extractGrading(source),
    gradingScale: extractGradingScale(source),
    attendance: extractAttendancePolicy(source),
    meeting: extractMeeting(source),
  };
}

// Only lines that talk about the class meeting. "Office hours: Zoom" is not the class.
const MEETING_LINE = /\b(class(?:es)?\s+meets?|meeting\s+(?:time|place|days?)|class\s+time|time\s+and\s+place|location|classroom|lecture|course\s+format)\b/i;
const TIME_RANGE =
  /(\d{1,2}):(\d{2})\s*([ap]\.?\s?m\.?)?\s*(?:-|–|—|to)\s*(\d{1,2}):(\d{2})\s*([ap]\.?\s?m\.?)?/i;
const SHORT_DAYS = /\b((?:Tu|Th|M|T|W|R|F)(?:\s?(?:Tu|Th|M|T|W|R|F))*)\b(?=\s*\d)/;
const DAY_LETTER = { M: "M", T: "T", Tu: "T", W: "W", Th: "R", R: "R", F: "F", mon: "M", tues: "T", wednes: "W", thurs: "R", fri: "F" };
const ROOM = /([A-Z][A-Za-z.&'-]*(?:\s+[A-Z][A-Za-z.&'-]*){0,3})\s+(?:Room\s+|Rm\.?\s+)?(\d{1,4}[A-Z]?)\b(?![:.]\d)/;

/**
 * Where and when the class meets, from syllabus text.
 * { mode: in_person | online_sync | online_async | hybrid | unknown, days: "MWF" (R = Thursday),
 *   start: "09:00", end: "09:50", building: "Bidgood Hall", room: "116" }
 */
export function extractMeeting(text) {
  const lines = String(text || "")
    .split(/\r?\n/)
    .filter((line) => MEETING_LINE.test(line) && !/office\s+hours?/i.test(line));
  const scope = lines.join("\n");

  const time = scope.match(TIME_RANGE);
  const times = time ? meetingTimes(time) : { start: null, end: null };
  const days = meetingDays(scope);

  let building = "";
  let room = "";
  for (const line of lines) {
    const place = line.replace(TIME_RANGE, " ").match(ROOM);
    if (place && !/^(room|rm\.?)$/i.test(place[1])) {
      building = place[1].trim();
      room = place[2];
      break;
    }
  }

  const online = /\b(zoom|online|virtual|remote|teams)\b/i.test(scope);
  const selfPaced = /asynchronous|self-paced|no\s+scheduled\s+(?:class\s+)?meetings|no\s+set\s+meeting/i.test(scope);
  let mode = "unknown";
  if (room && online) mode = "hybrid";
  else if (room) mode = "in_person";
  else if (selfPaced || (online && !time)) mode = "online_async";
  else if (online) mode = "online_sync";

  if (mode === "online_async") return { mode, days: "", start: null, end: null, building: "", room: "" };
  return { mode, days, ...times, building, room };
}

function meetingDays(scope) {
  const short = scope.match(SHORT_DAYS);
  const found = short
    ? short[1].match(/Tu|Th|M|T|W|R|F/g)
    : [...scope.matchAll(/\b(mon|tues|wednes|thurs|fri)day\b/gi)].map((m) => m[1].toLowerCase());
  const letters = new Set(found.map((d) => DAY_LETTER[d]));
  return [..."MTWRF"].filter((d) => letters.has(d)).join("");
}

function meetingTimes(match) {
  const [, sh, sm, smer, eh, em, emer] = match;
  const meridiem = (raw) => (raw ? raw.toLowerCase()[0] : null);
  const to24 = (h, mer) => {
    const hour = Number(h) % 12;
    if (mer === "p") return hour + 12;
    if (mer === "a") return hour;
    return hour >= 1 && hour <= 7 ? hour + 12 : Number(h); // no AM/PM: 1 to 7 is afternoon
  };
  const end = to24(eh, meridiem(emer));
  let start = to24(sh, meridiem(smer) || meridiem(emer));
  if (!smer && start * 60 + Number(sm) > end * 60 + Number(em)) start -= 12; // "11:00 - 12:15 PM"
  const hhmm = (h, m) => `${String(h).padStart(2, "0")}:${m}`;
  return { start: hhmm(start, sm), end: hhmm(end, em) };
}

function extractGrading(text) {
  const components = [];
  const seen = new Set();

  const pipeComponents = extractFromPipeTable(text);
  if (pipeComponents.length >= 2) {
    return normalizeWeights(pipeComponents);
  }

  const tabComponents = extractFromTabTable(text);
  if (tabComponents.length >= 2) {
    return normalizeWeights(tabComponents);
  }

  const percentPattern = /^(.{2,50}?)\s{2,}(\d{1,3})\s*%/gm;
  let match;

  while ((match = percentPattern.exec(text)) !== null) {
    const name = cleanComponentName(match[1]);
    const weight = parseInt(match[2], 10);
    if (isValidComponent(name, weight, seen)) {
      seen.add(name.toLowerCase());
      components.push({
        name,
        weight: weight / 100,
        category: inferCategory(name),
      });
    }
  }

  if (components.length === 0) {
    const altPattern = /([A-Za-z][A-Za-z\s]{1,40}?)[\s:]+\(?(\d{1,3})\s*%\)?/g;
    while ((match = altPattern.exec(text)) !== null) {
      const name = cleanComponentName(match[1]);
      const weight = parseInt(match[2], 10);
      if (isValidComponent(name, weight, seen)) {
        seen.add(name.toLowerCase());
        components.push({
          name,
          weight: weight / 100,
          category: inferCategory(name),
        });
      }
    }
  }

  if (components.length === 0) {
    const pointsPattern = /^(.{2,50}?)\s{2,}(\d+)\s*(?:points?|pts?)/gim;
    const pointsItems = [];
    let totalPoints = 0;
    while ((match = pointsPattern.exec(text)) !== null) {
      const name = cleanComponentName(match[1]);
      const pts = parseInt(match[2], 10);
      if (name.length > 1 && pts > 0) {
        pointsItems.push({ name, pts });
        totalPoints += pts;
      }
    }
    if (pointsItems.length > 0 && totalPoints > 0) {
      pointsItems.forEach((component) => {
        const key = component.name.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          components.push({
            name: component.name,
            weight: component.pts / totalPoints,
            category: inferCategory(component.name),
            pointBased: true,
            points: component.pts,
          });
        }
      });
    }
  }

  return normalizeWeights(components);
}

function extractFromPipeTable(text) {
  const components = [];
  const seen = new Set();
  let match;

  const multiPctPattern = /\|\s*([^|]{2,60}?)\s*\|\s*((?:\d{1,3}\s*%\s*){2,})\|?/g;
  while ((match = multiPctPattern.exec(text)) !== null) {
    const nameField = String(match[1] || "").trim();
    const weightField = String(match[2] || "");
    const weights = [];
    const pctRe = /(\d{1,3})\s*%/g;
    let pctMatch;
    while ((pctMatch = pctRe.exec(weightField)) !== null) {
      weights.push(parseInt(pctMatch[1], 10));
    }
    const names = splitCombinedComponentNames(nameField);
    if (names.length === weights.length) {
      names.forEach((name, index) => {
        const clean = cleanComponentName(name);
        if (isValidComponent(clean, weights[index], seen)) {
          seen.add(clean.toLowerCase());
          components.push({
            name: clean,
            weight: weights[index] / 100,
            category: inferCategory(clean),
          });
        }
      });
    } else {
      weights.forEach((weight, index) => {
        const fallbackName = names[index] || `${cleanComponentName(nameField)} ${index + 1}`;
        if (isValidComponent(fallbackName, weight, seen)) {
          seen.add(fallbackName.toLowerCase());
          components.push({
            name: fallbackName,
            weight: weight / 100,
            category: inferCategory(fallbackName),
          });
        }
      });
    }
  }

  const pipePattern = /\|\s*([^|]{2,60}?)\s*\|\s*(\d{1,3})\s*%\s*\|?/g;
  while ((match = pipePattern.exec(text)) !== null) {
    const name = cleanComponentName(match[1]);
    const weight = parseInt(match[2], 10);
    if (isValidComponent(name, weight, seen)) {
      seen.add(name.toLowerCase());
      components.push({
        name,
        weight: weight / 100,
        category: inferCategory(name),
      });
    }
  }

  return components;
}

function extractFromTabTable(text) {
  const components = [];
  const seen = new Set();
  const lines = text.split("\n");
  lines.forEach((line) => {
    const parts = line.split("\t");
    if (parts.length < 2) return;

    const namePart = parts[0].trim();
    const weightPart = parts.slice(1).join("").trim();
    const weights = [];
    const pctRe = /(\d{1,3})%/g;
    let match;
    while ((match = pctRe.exec(weightPart)) !== null) {
      weights.push(parseInt(match[1], 10));
    }
    if (weights.length === 0) return;

    if (weights.length === 1) {
      const name = cleanComponentName(namePart);
      if (isValidComponent(name, weights[0], seen)) {
        seen.add(name.toLowerCase());
        components.push({
          name,
          weight: weights[0] / 100,
          category: inferCategory(name),
        });
      }
      return;
    }

    const splitNames = namePart
      .split(/(?<=\d)(?=[A-Z])/)
      .map((name) => cleanComponentName(name))
      .filter((name) => name.length > 1);

    if (splitNames.length === weights.length) {
      splitNames.forEach((name, index) => {
        if (isValidComponent(name, weights[index], seen)) {
          seen.add(name.toLowerCase());
          components.push({
            name,
            weight: weights[index] / 100,
            category: inferCategory(name),
          });
        }
      });
    } else {
      weights.forEach((weight, index) => {
        const name = index === 0 ? cleanComponentName(namePart) : `${cleanComponentName(namePart)} ${index + 1}`;
        if (isValidComponent(name, weight, seen)) {
          seen.add(name.toLowerCase());
          components.push({
            name,
            weight: weight / 100,
            category: inferCategory(name),
          });
        }
      });
    }
  });

  return components;
}

function splitCombinedComponentNames(nameField) {
  const cleaned = cleanComponentName(nameField);
  const numberedChunks = cleaned.match(/[A-Za-z/&\-]+(?:\s+[A-Za-z/&\-]+)*\s+\d+/g);
  if (numberedChunks && numberedChunks.length >= 2) {
    return numberedChunks.map((chunk) => cleanComponentName(chunk));
  }
  const splits = cleaned.split(/\s+(?=[A-Z][a-z]*\s+\d+)/).map((part) => cleanComponentName(part)).filter(Boolean);
  if (splits.length >= 2) return splits;
  return [cleaned];
}

function normalizeWeights(components) {
  const total = components.reduce((sum, component) => sum + component.weight, 0);
  if (total > 0.9 && total < 1.15 && Math.abs(total - 1.0) > 0.01) {
    components.forEach((component) => {
      component.weight = component.weight / total;
    });
  }

  return components;
}

function cleanComponentName(raw) {
  return String(raw || "")
    .replace(/[:\-–—]+$/, "")
    .replace(/^\s+|\s+$/g, "")
    .replace(/\s+/g, " ")
    .replace(/^[\d.)]+\s*/, "")
    .trim();
}

function isValidComponent(name, weight, seen) {
  if (!name || name.length < 2) return false;
  if (weight <= 0 || weight > 100) return false;
  if (seen.has(name.toLowerCase())) return false;
  const lower = name.toLowerCase();
  const noiseExact = [
    "total",
    "grade",
    "final grade",
    "course grade",
    "points",
    "percentage",
    "grading",
    "weight",
    "assessment",
    "marks",
    "letter grade",
  ];
  if (noiseExact.includes(lower)) return false;

  const noisePhrases = [
    "handed in",
    "submitted late",
    "late will be",
    "marked off",
    "penalty",
    "will not be accepted",
    "after the deadline",
    "incomplete",
    "plagiarism",
    "misconduct",
    "make-up",
    "no make",
  ];
  if (noisePhrases.some((phrase) => lower.includes(phrase))) return false;
  if (name.length > 50) return false;
  if (/\b(will|shall|must|can|may|is|are|was|were|be|been|being|have|has|had)\b/i.test(name)) return false;
  return true;
}

function inferCategory(name) {
  const n = name.toLowerCase();
  if (/exam|midterm|final|test/.test(n)) return "exam";
  if (/quiz|quizzes/.test(n)) return "quiz";
  if (/homework|hw|assignment|problem set/.test(n)) return "homework";
  if (/project|paper|essay|report/.test(n)) return "project";
  if (/lab|laboratory/.test(n)) return "lab";
  if (/participation|attendance|engage/.test(n)) return "participation";
  return "other";
}

function extractGradingScale(text) {
  const scale = {};
  const patterns = [/\b([ABCDF][+-]?)\s*[=:]\s*(\d{2,3})/g, /\b([ABCDF][+-]?)\s+(\d{2,3})\s*[-–]/g];
  patterns.forEach((pattern) => {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const letter = match[1].toUpperCase();
      const threshold = parseInt(match[2], 10);
      if (!scale[letter] && threshold >= 50 && threshold <= 100) {
        scale[letter] = threshold;
      }
    }
  });
  if (Object.keys(scale).length === 0) {
    return { A: 90, B: 80, C: 70, D: 60 };
  }
  return scale;
}

function extractAttendancePolicy(text) {
  const patterns = [
    /(?:may|can)\s+miss\s+(?:up\s+to\s+)?(\d+)\s+class/i,
    /more\s+than\s+(\d+)\s+(?:unexcused\s+)?absences?/i,
    /(\d+)\s+(?:unexcused\s+)?absences?\s+(?:are\s+)?(?:allowed|permitted)/i,
    /after\s+(\d+)\s+absences?/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const max = parseInt(match[1], 10);
      if (max > 0 && max < 30) {
        return {
          maxAbsences: max,
          penaltyType: inferPenaltyType(text),
        };
      }
    }
  }
  return null;
}

function inferPenaltyType(text) {
  const source = text.toLowerCase();
  if (/letter\s+grade|grade\s+reduc/.test(source)) return "letter_grade";
  if (/fail|failing|automatic\s+f/.test(source)) return "fail";
  if (/points?\s+deduct/.test(source)) return "points";
  return "grade_impact";
}
