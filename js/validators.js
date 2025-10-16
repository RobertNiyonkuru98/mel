/* ============================================
   CAMPUS PLANNER - VALIDATION MODULE
   Regex-based input validation for tasks
   ============================================ */

/* ============================================
   REGEX PATTERNS
   ============================================ */

// 1. Title - No leading/trailing spaces, collapse doubles
const TITLE_REGEX = /^\S+(?:\s\S+)*$/;

// 2. Duration (minutes) - Positive integer
const DURATION_REGEX = /^[1-9]\d*$/;

// 3. Date (YYYY-MM-DD)
const DATE_REGEX = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

// 4. Tag - Letters, spaces, hyphens
const TAG_REGEX = /^[A-Za-z]+(?:[ -][A-Za-z]+)*$/;

// 5. ADVANCED - Tag Filter Pattern (@tag:Academic)
const TAG_FILTER_REGEX = /^@tag:(\w+)$/i;

// 6. ADVANCED - Time Token Pattern (14:30)
const TIME_TOKEN_REGEX = /\b\d{2}:\d{2}\b/;

// 7. ADVANCED - Duplicate Words
const DUPLICATE_WORD_REGEX = /\b(\w+)\s+\1\b/i;

/* ============================================
   VALIDATION FUNCTIONS
   ============================================ */

/**
 * Validate title field
 */
export function validateTitle(title) {
  if (!title || typeof title !== "string") {
    return { valid: false, error: "Title is required" };
  }

  const trimmed = title.trim();

  if (trimmed.length < 3) {
    return { valid: false, error: "Title must be at least 3 characters" };
  }

  if (trimmed.length > 100) {
    return { valid: false, error: "Title must not exceed 100 characters" };
  }

  if (title !== trimmed) {
    return {
      valid: false,
      error: "Title cannot have leading or trailing spaces",
    };
  }

  if (!TITLE_REGEX.test(title)) {
    return { valid: false, error: "Title cannot contain consecutive spaces" };
  }

  if (DUPLICATE_WORD_REGEX.test(title)) {
    return { valid: false, error: "Title contains duplicate words" };
  }

  return { valid: true, error: "" };
}

/**
 * Validate duration field (minutes)
 */
export function validateDuration(duration) {
  if (duration === null || duration === undefined || duration === "") {
    return { valid: false, error: "Duration is required" };
  }

  const durationStr = String(duration).trim();

  if (!DURATION_REGEX.test(durationStr)) {
    return {
      valid: false,
      error: "Duration must be a positive number (e.g., 120)",
    };
  }

  const numValue = parseInt(durationStr, 10);

  if (isNaN(numValue) || numValue <= 0) {
    return { valid: false, error: "Duration must be greater than 0" };
  }

  if (numValue > 1440) {
    return {
      valid: false,
      error: "Duration cannot exceed 24 hours (1440 minutes)",
    };
  }

  return { valid: true, error: "" };
}

/**
 * Validate due date field
 */
export function validateDueDate(date) {
  if (!date || typeof date !== "string") {
    return { valid: false, error: "Due date is required" };
  }

  const trimmed = date.trim();

  if (!DATE_REGEX.test(trimmed)) {
    return { valid: false, error: "Date must be in YYYY-MM-DD format" };
  }

  const [year, month, day] = trimmed.split("-").map(Number);
  const dateObj = new Date(year, month - 1, day);

  if (
    dateObj.getFullYear() !== year ||
    dateObj.getMonth() !== month - 1 ||
    dateObj.getDate() !== day
  ) {
    return {
      valid: false,
      error: "Invalid date (e.g., Feb 30 does not exist)",
    };
  }

  // Allow future dates (tasks can be due in the future)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  oneYearAgo.setHours(0, 0, 0, 0);

  if (dateObj < oneYearAgo) {
    return {
      valid: false,
      error: "Date cannot be more than 1 year in the past",
    };
  }

  const twoYearsFromNow = new Date();
  twoYearsFromNow.setFullYear(twoYearsFromNow.getFullYear() + 2);

  if (dateObj > twoYearsFromNow) {
    return {
      valid: false,
      error: "Date cannot be more than 2 years in the future",
    };
  }

  return { valid: true, error: "" };
}

/**
 * Validate tag field
 */
export function validateTag(tag) {
  if (!tag || typeof tag !== "string") {
    return { valid: false, error: "Tag is required" };
  }

  const trimmed = tag.trim();

  if (trimmed.length < 3) {
    return { valid: false, error: "Tag must be at least 3 characters" };
  }

  if (trimmed.length > 30) {
    return { valid: false, error: "Tag must not exceed 30 characters" };
  }

  if (!TAG_REGEX.test(trimmed)) {
    return {
      valid: false,
      error: "Tag can only contain letters, spaces, or hyphens",
    };
  }

  return { valid: true, error: "" };
}

/**
 * Validate priority field
 */
export function validatePriority(priority) {
  const validPriorities = ["High", "Medium", "Low"];

  if (!priority || !validPriorities.includes(priority)) {
    return { valid: false, error: "Priority must be High, Medium, or Low" };
  }

  return { valid: true, error: "" };
}

/* ============================================
   SEARCH/FILTER HELPERS
   ============================================ */

/**
 * Safely compile regex pattern
 */
export function compileRegex(pattern, flags = "i") {
  if (!pattern || typeof pattern !== "string") {
    return null;
  }

  try {
    return new RegExp(pattern, flags);
  } catch (error) {
    console.error("Invalid regex:", error.message);
    return null;
  }
}

/**
 * Check if text matches tag filter (@tag:Academic)
 */
export function matchesTagFilter(text, task) {
  const match = text.match(TAG_FILTER_REGEX);
  if (!match) return false;

  const filterTag = match[1].toLowerCase();
  return task.tag.toLowerCase() === filterTag;
}

/**
 * Check if text contains time token (14:30)
 */
export function hasTimeToken(text) {
  return TIME_TOKEN_REGEX.test(String(text));
}

/**
 * Check if text has duplicate words
 */
export function hasDuplicateWords(text) {
  return DUPLICATE_WORD_REGEX.test(String(text));
}

/**
 * Highlight regex matches
 */
export function highlightMatches(text, regex) {
  if (!regex || !text) {
    return text;
  }

  try {
    const escaped = String(text).replace(/[&<>"']/g, (char) => {
      const escapeMap = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      };
      return escapeMap[char];
    });

    return escaped.replace(regex, (match) => `<mark>${match}</mark>`);
  } catch (error) {
    console.error("Error highlighting:", error);
    return text;
  }
}

/* ============================================
   TASK VALIDATION
   ============================================ */

/**
 * Validate entire task object
 */
export function validateTask(task) {
  const errors = [];

  const titleResult = validateTitle(task.title);
  if (!titleResult.valid) {
    errors.push({ field: "title", message: titleResult.error });
  }

  const durationResult = validateDuration(task.duration);
  if (!durationResult.valid) {
    errors.push({ field: "duration", message: durationResult.error });
  }

  const dateResult = validateDueDate(task.dueDate);
  if (!dateResult.valid) {
    errors.push({ field: "dueDate", message: dateResult.error });
  }

  const tagResult = validateTag(task.tag);
  if (!tagResult.valid) {
    errors.push({ field: "tag", message: tagResult.error });
  }

  if (task.priority) {
    const priorityResult = validatePriority(task.priority);
    if (!priorityResult.valid) {
      errors.push({ field: "priority", message: priorityResult.error });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Sanitize user input
 */
export function sanitizeInput(input) {
  if (typeof input !== "string") {
    return "";
  }

  return input.trim().replace(/[<>]/g, "").substring(0, 200);
}

/* ============================================
   UTILITY: Duration Conversion
   ============================================ */

/**
 * Convert minutes to hours
 */
export function minutesToHours(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours === 0) {
    return `${mins}min`;
  } else if (mins === 0) {
    return `${hours}h`;
  } else {
    return `${hours}h ${mins}min`;
  }
}

/**
 * Convert hours to minutes
 */
export function hoursToMinutes(hours) {
  return Math.round(hours * 60);
}

/* ============================================
   EXPORTS
   ============================================ */

export const PATTERNS = {
  TITLE: TITLE_REGEX,
  DURATION: DURATION_REGEX,
  DATE: DATE_REGEX,
  TAG: TAG_REGEX,
  TAG_FILTER: TAG_FILTER_REGEX,
  TIME_TOKEN: TIME_TOKEN_REGEX,
  DUPLICATE_WORD: DUPLICATE_WORD_REGEX,
};

export default {
  validateTitle,
  validateDuration,
  validateDueDate,
  validateTag,
  validatePriority,
  validateTask,
  compileRegex,
  highlightMatches,
  matchesTagFilter,
  hasTimeToken,
  hasDuplicateWords,
  sanitizeInput,
  minutesToHours,
  hoursToMinutes,
  PATTERNS,
};
