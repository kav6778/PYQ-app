"""
Bounding box utility functions for sorting and processing layout regions
detected by LayoutParser on two-column PDF page images.
"""

from dataclasses import dataclass
from typing import Any


@dataclass
class BBox:
    """
    Represents a detected layout region with its type, coordinates, and column.

    Attributes:
        box_type: Classification label, one of: text_block, math_block,
                  figure, table.
        x1: Left coordinate in pixels.
        y1: Top coordinate in pixels.
        x2: Right coordinate in pixels.
        y2: Bottom coordinate in pixels.
        column: 'left' or 'right', assigned by assign_columns().
        score: Confidence score from the layout detection model.
    """

    box_type: str
    x1: float
    y1: float
    x2: float
    y2: float
    column: str = "left"
    score: float = 1.0

    @property
    def center_x(self) -> float:
        """Horizontal midpoint of the bounding box."""
        return (self.x1 + self.x2) / 2

    @property
    def center_y(self) -> float:
        """Vertical midpoint of the bounding box."""
        return (self.y1 + self.y2) / 2


def assign_columns(bboxes: list[BBox], page_width: int) -> list[BBox]:
    """
    Assign each bounding box to either the 'left' or 'right' column.

    Uses the horizontal midpoint of each box relative to the page midpoint.
    Boxes whose center_x is less than half the page width are labelled 'left';
    all others are labelled 'right'.

    Args:
        bboxes: List of BBox objects to label.
        page_width: Total width of the page image in pixels.

    Returns:
        The same list with the 'column' attribute set on each BBox.
    """
    midpoint = page_width / 2
    for bbox in bboxes:
        bbox.column = "left" if bbox.center_x < midpoint else "right"
    return bboxes


def sort_reading_order(bboxes: list[BBox]) -> list[BBox]:
    """
    Sort bounding boxes into two-column reading order.

    Left-column boxes come before right-column boxes. Within each column
    boxes are sorted top-to-bottom by their y1 coordinate.

    Args:
        bboxes: List of BBox objects already labelled with 'column'.

    Returns:
        New sorted list in reading order: left column top-to-bottom, then
        right column top-to-bottom.
    """
    left = sorted(
        [b for b in bboxes if b.column == "left"], key=lambda b: b.y1
    )
    right = sorted(
        [b for b in bboxes if b.column == "right"], key=lambda b: b.y1
    )
    return left + right


def layoutparser_block_to_bbox(block: Any, label_map: dict[int, str]) -> BBox:
    """
    Convert a LayoutParser layout block into a BBox dataclass.

    Args:
        block: A LayoutParser Block object with .block (coordinates) and
               .type (integer label) attributes.
        label_map: Mapping from integer type codes to string labels
                   (e.g. {0: 'text_block', 1: 'math_block'}).

    Returns:
        A BBox populated from the block's coordinates and type.
    """
    coords = block.block
    x1, y1, x2, y2 = coords.x_1, coords.y_1, coords.x_2, coords.y_2
    box_type = label_map.get(block.type, "text_block")
    score = float(block.score) if hasattr(block, "score") else 1.0
    return BBox(box_type=box_type, x1=x1, y1=y1, x2=x2, y2=y2, score=score)


def crop_image_for_bbox(image: Any, bbox: BBox) -> Any:
    """
    Crop a PIL Image to the region defined by a BBox.

    Args:
        image: A PIL.Image.Image object of the full page.
        bbox: The BBox defining the region to crop.

    Returns:
        A new PIL.Image.Image cropped to (x1, y1, x2, y2).
    """
    return image.crop((int(bbox.x1), int(bbox.y1), int(bbox.x2), int(bbox.y2)))
