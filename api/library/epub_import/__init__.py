"""Pure EPUB inspection, cleaning and conversion, adapted from the legacy engines."""


class EpubImportError(ValueError):
    """An actionable package error, safe to report without exposing storage paths."""
