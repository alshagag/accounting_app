/**
 * Shorthand for document.getElementById.
 * @param {string} id The ID of the element to find.
 * @returns {HTMLElement|null}
 */
function $(id) {
  return document.getElementById(id);
}

export { $ };
