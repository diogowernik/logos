// Keep mounted editors and their drafts, while hiding all app portals as well.
// The unlock dialog is the only body-level surface allowed while locked.
export const deviceLockStyles = {
  'body[data-books-locked="true"] > :not([data-books-lock-root="true"])': {
    display: "none !important",
  },
};
