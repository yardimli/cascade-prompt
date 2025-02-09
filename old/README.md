# cascade-prompt
Cascading prompts on spreadsheet to automate advanced LLM and Image generation.

-------

build a excel sheet like application using javascript and jquery
there should be an underlying array of 100 rows and column
there should be a rendering engine that creates this grid using <div> for each cell
the underlying data should have properties for each column and row for width and height
each cell should have cell-width and cell-height, these should default to 1 but if either one is more than 1 the div for the cell should be drawn bigger and the other cells it overlaps should not be rendered.
when rendering each div, use whitespace none so it won't wrap, if the cells to the right are empty allow the text inside it to overflow but not beyond a filled cell.
there should be global settings for cell background, border, width and height
