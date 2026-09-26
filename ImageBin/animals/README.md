# PETMATCH 2000 assets and records

The seven records in `script/animals.js` use the names and photographs supplied in `ImageBin/animals/owned/` and `ImageBin/animals/fosters/`. Owned profiles show a name, species, and six additional details. Foster profiles show only a name and species. Values render as text, not HTML.

| Group | Animal | Gallery photos |
| --- | --- | --- |
| Owned | Imoogi | 4 |
| Owned | Nala | 6 |
| Owned | Niko | 7 |
| Foster | Fuji | 1 |
| Foster | Chunkie | 1 |
| Foster | Tabitha | 1 |
| Foster | Zeva | 1 |

All 18 supplied photo files are used across 21 gallery entries. The two Nala/Niko pictures appear in both galleries, and the Niko/Imoogi picture appears in both galleries. Fuji's supplied photo is `chess.jpeg`. The remaining photos are unchanged; filenames and extension casing are preserved for static hosting.

Categories are an array of `current` and/or `foster`. Owned animals use `current`. The View menu offers All Animals, Current Residents, and Fosters. Frames can be `wood`, `polaroid`, `gold`, or `gray`. Photo and animal navigation each wrap independently; changing animals or filters starts at photo 1. Zero or one photo disables the photo buttons.

Owned profile fields use two columns. Foster profiles contain only name and species. On small screens each label sits above its value within the same two-column grid.

The heading Easter egg uses these supplied images:

- `ImageBin/shared/CM2.gif` — the "CLICK HERE!" prompt inside the paw button.
- `ImageBin/shared/handL-small.gif` — the pointing hand beside the paw icon.
- `ImageBin/animals/ui/paw.gif` — the original 20 × 20, six-frame paw animation.
- `ImageBin/animals/ui/paw-still.png` — its exact first frame, extracted without altering the original GIF. This is the idle image.
- `ImageBin/animals/ui/cat_run.gif` — the original 500 × 50 running-cat strip, unmodified.

Photo navigation uses `ImageBin/animals/ui/animal_photo_prev.gif` and `ImageBin/animals/ui/animal_photo_next.gif` as the previous/next photo buttons. Animal switching remains on separate text buttons.

Clicking the paw plays one 1100ms cycle, restores the still image, then releases the cat. The cat runs across the page at its native proportions and knocks only the small sign down to 12px above the full document's bottom, beyond the current view on a long page. The sign stays there when you scroll down to it. PETMATCH stays in place and remains usable. `[put it back]` in the page footer or Escape restores the sign, cancels pending animation, and preserves the selected pet and photograph. Resize restores the sign; reduced motion skips the moving GIFs and fall. There is no light switch or damage counter.

Add future photos to `ImageBin/animals/owned/` or `ImageBin/animals/fosters/` and update that animal's `photos` in `script/animals.js`. Missing images get a readable placeholder; successful images fit their frames without cropping. Empty `animals` or empty filtered results are supported. The supplied `ImageBin/animals/ui/Cat_Lover.png` badge appears below the profile browser.

No build tools or dependencies are required. Serve the repository as a static site and open `animals.html` (also linked from the homepage). Without JavaScript, the explanation and home link remain available and the paw control is disabled.
