# Go board behavior notes

This short note captures the current expectations for the Go playground so future changes keep the experience calm and predictable.

## Board sizing
- The playground supports three sizes (9×9, 13×13, 19×19). Switching sizes gently resets the board and clears the surrounding insights so a fresh rhythm can emerge.
- Treat 9×9 as the compact exploration space, 13×13 as an attentive middle ground, and 19×19 as the expansive study mode. Copy that references the board should mirror those adjectives.

## Turn flow
- Black begins every fresh board. After each placement the turn toggles automatically.
- The latest move is highlighted with a soft ring so orientation is never lost. When resetting, clear the highlight alongside the stones.

## Reset expectations
- Manual resets and size changes both call the `onReset` handler provided by the page. Use it to coordinate any supporting context (move logs, insights, etc.).
- When introducing new interactions (e.g., undo or branch review), keep the reset surface simple: one decisive control that always returns the board to an empty, black-to-play state.

## Accessibility touches
- Continue to label each intersection with its coordinate (`A1`, `B2`, etc.) so screen reader users receive precise feedback.
- Maintain focus styles and hover states already present in the component—they help the board feel responsive without becoming noisy.
