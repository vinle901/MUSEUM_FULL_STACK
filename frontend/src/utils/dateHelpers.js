/**
 * Format a date string from the database (YYYY-MM-DD) to a readable format
 * without timezone issues
 * @param {string} dateString - Date string in YYYY-MM-DD format
 * @returns {string} Formatted date string
 */
export function formatDate(dateString) {
  if (!dateString) return '';

  // Parse as local date to avoid timezone issues
  // Split the date string and create date using local timezone
  const [year, month, day] = dateString.split('T')[0].split('-');
  const date = new Date(year, month - 1, day);

  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

/**
 * Format a datetime string from the database to a readable format
 * @param {string} datetimeString - Datetime string
 * @returns {string} Formatted datetime string
 */
export function formatDateTime(datetimeString) {
  if (!datetimeString) return '';

  const date = new Date(datetimeString);

  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}
