/**
 * Safely parses naive ISO datetime strings from the backend by assuming UTC
 * if timezone info is missing.
 */
export const safeParseDate = (dateStr: string | null | undefined): Date => {
  if (!dateStr) return new Date();

  // If the date string doesn't end with Z and has no timezone offset (+/- hh:mm)
  if (!dateStr.endsWith('Z') && !/[+-]\d{2}:?\d{2}$/.test(dateStr)) {
    return new Date(dateStr + 'Z');
  }
  return new Date(dateStr);
};
