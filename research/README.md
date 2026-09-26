# Research presentation assets

The research page keeps the current experiment visible in a compact, old-web layout. Presentation exports are still deferred until the decks are touched up. No source presentations have been copied into the site, and the old slide-preview and selected-figure sections are currently removed.

The VLA page uses these existing research assets:

- `ImageBin/research/vla/VLAResearch.png` — experiment-overview infographic placed below the VLA research question.
- `ImageBin/research/vla/NTWTI.png` — near-terminal warning diagram used with the near-terminal warning section.
- `ImageBin/research/vla/VLAResearchENV.gif` — animated LIBERO rollout environment example used with the Current Setup section.


## Add the revised exports

1. Put the PDFs at `research/vla-presentation.pdf` and `research/xai-presentation.pdf`.
2. Replace the pending PDF text with the view/download anchors already commented beside it in `research.html`. The source PPTX does not need to be publicly hosted.
3. When selected figures are ready, add only the figures chosen for the page. A figure can use the shared viewer pattern below; its `href` still opens the full image without JavaScript, while the viewer adds enlargement, Escape/close, focus return, and an original-image link when JavaScript is available.

```html
<a href="ImageBin/research/xai/slide-15.png"
   data-research-image
   data-caption="Slide 15 — ID / near-OOD / far-OOD class split">
    <img src="ImageBin/research/xai/thumb-15.jpg"
         alt="Examples of ID, near-OOD, and far-OOD classes"
         loading="lazy" decoding="async">
</a>
```

Do not make missing exports active links or broken `<img>` elements. Nothing should appear to be a research image until the real export is present.

## Content provenance

- **VLA:** `UF-Research-VLA (1).pptx`, 85 slides as supplied. The page presents the current activation-based near-terminal warning experiment: OpenVLA-7B on LIBERO-Spatial; hidden activations as the primary signal; predicted actions, end-effector state, gripper state, rewards, and outcomes as recorded rollout data; conservative positive / excluded / far-negative / terminal-step labels; episode-intact splits; held-out rollout initializations; and clean/visual-shift transfer directions. The early-eventual-failure task and old selected-figure placeholders remain removed. The presentation caption uses `Activation-Based Failure Warning Signals in Vision-Language-Action Models` and notes that the deck is being revised.
- **XAI:** `ABC-PCA XAI Research 2_26.pdf`, 75 pages as supplied. The page emphasizes the range of experiments instead of a selected numerical result: model and feature extraction choices, attribution methods, MLPs trained on extracted features, and ID / near-OOD / far-OOD data splits. The longer approach, split, model, pipeline, and feature-extraction sections use native details disclosures so the research question stays easy to scan. Feature counts are model-input descriptions, not performance claims. The old highlights dropdown, full-slide index, and selected-figure placeholders remain removed while the deck is being revised.
- **Contribution credit:** Nick confirmed he led the group and did most of the work. The page uses “Project lead and primary contributor,” credits Caio Miyake and Karla Tran as collaborators, and Chase Walker as mentor, matching the current page credit. It does not invent task-by-task ownership.

## Code organization

- `script/script.js` contains the shared homepage name switch.
- `script/projects.js` contains the Projects-page floating pointer behavior.
- `script/research.js` contains the Research-page image viewer; the disclosure sections use native HTML and need no JavaScript.
- `styles/style.css` keeps shared document rules first, followed by labeled homepage, Projects-page, and Research-page sections.

This is a static HTML/CSS/vanilla-JavaScript page. There is no upload flow, backend, gallery dependency, publication system, or automatic deck conversion.
