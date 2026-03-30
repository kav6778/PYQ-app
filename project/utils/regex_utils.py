"""
Regular expression utilities for detecting question boundaries and
option patterns in competitive exam OCR text.
"""

import re

QUESTION_PATTERNS: list[re.Pattern] = [
    re.compile(r"^Q\.\s*\d+", re.MULTILINE),
    re.compile(r"^Q\d+[\.\s]", re.MULTILINE),
    re.compile(r"^\d+\.", re.MULTILINE),
    re.compile(r"^\(\d+\)", re.MULTILINE),
]

OPTION_PATTERN: re.Pattern = re.compile(
    r"^\s*\(?([A-D])\)?\s*[.\):]?\s*(.+)", re.MULTILINE
)

PASSAGE_HEADER_PATTERN: re.Pattern = re.compile(
    r"(Passage|Paragraph|Comprehension|Direction|Read\s+the\s+following)",
    re.IGNORECASE,
)

QUESTION_NUMBER_RE: re.Pattern = re.compile(
    r"(Q\.\s*\d+|Q\d+[\.\s]|\b\d+\.\s|\(\d+\))"
)


def find_question_starts(text: str) -> list[int]:
    """
    Find character positions where new questions begin in the given text.

    Applies all QUESTION_PATTERNS and returns a sorted, deduplicated list of
    match start positions.

    Args:
        text: The raw OCR text to search.

    Returns:
        Sorted list of character indices where questions start.
    """
    positions: set[int] = set()
    for pattern in QUESTION_PATTERNS:
        for match in pattern.finditer(text):
            positions.add(match.start())
    return sorted(positions)


def split_into_questions(text: str) -> list[str]:
    """
    Split a block of OCR text into individual question strings.

    Uses find_question_starts to locate boundaries, then slices the text
    at each boundary. If no boundaries are found, returns the entire text
    as a single-element list.

    Args:
        text: The raw OCR text block.

    Returns:
        List of question text strings (may include option lines).
    """
    starts = find_question_starts(text)
    if not starts:
        return [text.strip()] if text.strip() else []

    questions: list[str] = []
    for i, start in enumerate(starts):
        end = starts[i + 1] if i + 1 < len(starts) else len(text)
        chunk = text[start:end].strip()
        if chunk:
            questions.append(chunk)
    return questions


def parse_options(text: str) -> dict[str, str]:
    """
    Parse answer options (A, B, C, D) from a question text block.

    Looks for lines matching the OPTION_PATTERN and extracts each option
    letter and its associated text.

    Args:
        text: The question text that may contain option lines.

    Returns:
        Dictionary mapping option letter ('A'–'D') to its text, or empty
        dict if no options are found.
    """
    options: dict[str, str] = {}
    for match in OPTION_PATTERN.finditer(text):
        letter = match.group(1).upper()
        value = match.group(2).strip()
        options[letter] = value
    return options


def strip_options(text: str) -> str:
    """
    Remove option lines (A/B/C/D) from the question text.

    Args:
        text: Raw question text including option lines.

    Returns:
        Text with option lines removed, preserving the question stem.
    """
    return OPTION_PATTERN.sub("", text).strip()


def is_passage_header(text: str) -> bool:
    """
    Determine whether the given text block is a passage or comprehension header.

    Args:
        text: A short text block (e.g. the first line of a detected region).

    Returns:
        True if the block matches a known passage-header pattern.
    """
    return bool(PASSAGE_HEADER_PATTERN.search(text))
