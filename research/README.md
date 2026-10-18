# Research presentation assets

The research page keeps the current experiment visible in a compact, old-web layout. Presentation exports are still deferred until the decks are touched up. No source presentations have been copied into the site, and the old slide-preview and selected-figure sections are currently removed.

The VLA page uses these existing research assets:

- `ImageBin/research/vla/VLAResearch.png` — experiment-overview infographic placed below the VLA research question.
- `ImageBin/research/vla/NTWTI.png` — near-terminal warning diagram used with the near-terminal warning section.
- `ImageBin/research/vla/VLAEventWarning.gif` — full V3.1 visual-shift rollout with a separate event/rollout statistics panel, used with the Current Setup section. The original environment GIF remains available in the asset folder.


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

## October 18, 2026 source review

The attribution additions preserve the existing document layout and native disclosures. Sources were read without running training or changing the remote notebooks. The Jupyter file browser was explicitly verified at `OBJ` before inspecting attribution code; the separate VLA browser was used only for rollout media.

- **Initial presentation:** `P5-Presentation.pptx`, 13 slides, read in SharePoint. Slides 3–4 establish the CIFAR-100 / ResNet-50 / Integrated Gradients prototype; slide 5 proposes VLM descriptions and LLM specification checks; slide 8 distinguishes implemented attribution work from the detector-dataset work still in progress. The page describes the contract-verification component as a proposal, not a demonstrated capability.
- **Karla iteration:** `MLResearchNOV7: IntegratedGradients`, read in Google Slides and exported locally for text inspection. Slides 8–11 describe the ImageNet dog-class ID split, near/far OOD groups, three detector setups, and class-wise train/validation splitting. The older CIFAR-100 slides remain historical context.
- **Caio iteration:** `ABC-PCA XAI Research 2/26`, read in Google Slides and exported locally for text inspection. This live revision exported 67 slides, superseding the earlier 75-page PDF as the source for this update. Slides 50, 54, 57, 60, and 63 describe the 24/55/58/61/583 feature variants; slides 66–67 report the 583-feature results. The source uses both decimal and percentage metric conventions; the site uses decimal AUROC/AUPRC.
- **OBJ notebooks:** `FE58_IG_BICLASS.ipynb`, `FE700IG_BICLASS.ipynb`, `IG_BICLASS_KNN_added.ipynb`, and `attr_map_ig_pipelime.ipynb` were downloaded through Jupyter's file-browser Download action and inspected as JSON. Despite its filename, `FE700IG_BICLASS.ipynb` explicitly consumes `features583`, validates 583 values, instantiates three `FeatureMLP(583)` models, and records the same test results as the final deck. Its calls specify 20% validation and 10% test. Its normalization uses `compute_feature_mean_std(id_df)`, including ID validation/test rows; the results disclosure states that limitation rather than presenting the scores as an independently normalized benchmark.
- **Feature implementations:** `OBJ/Feature_Extract_Programs/extractFunc.py` confirms the 58-feature extractor, seven top-1/top-2 comparison features in the 65-feature variant, and twelve localization/compactness measurements in the 70-feature variant. Their existence does not establish performance improvements, so none are claimed.
- **Feature acknowledgment:** Nick requested a single sentence thanking Will English for suggesting this part and writing it up, with Will's name linked to `https://willenglish.tech/`. The supplied `NickWriteup.pdf` is copied unchanged to `research/NickWriteup.pdf` and linked immediately below the acknowledgment.
- **Nearest-neighbor follow-up:** saved outputs in `IG_BICLASS_KNN_added.ipynb` give ID-only AUROC 0.6643 for near-OOD and 0.8631 for far-OOD. The implementation uses 15 neighbors, 56-pixel attribution-energy maps, cosine distance, and an ID-validation threshold targeting 95% ID acceptance. It is a separate representation/setup, not a controlled MLP comparison.
- **VLA GIF:** downloaded `VLA/results/layer16_event_warning_v3_1/pilot_v3_1_close_window/gifs/pilot-openvla-task04-init002-seed7-repeat00-visual_shift_full.gif` through Jupyter. The full 616 × 320 GIF has 220 frames (steps 0–219) and is copied unchanged to `ImageBin/research/vla/VLAEventWarning.gif` (9,690,825 bytes). Sampled first, middle, and final frames confirm the camera view and separate statistics panel: earliest raw candidate (drop), current step, onset 78, confirmation 80, persistent-fall onset basis, target object, and changing target distance. These are retrospective heuristic annotations, not probe probabilities; the public caption describes them as such. Nick selected event/rollout statistics and requested the full rollout after reviewing its event-window clip. Neither the inspected plain `VLA/rollout_debug/rollout2.gif` nor the short event-window GIF was added to the site. The figure uses the existing full-width infographic style so the panel remains readable.

## Code organization

- `script/script.js` contains the shared homepage name switch.
- `script/projects.js` contains the Projects-page floating pointer behavior.
- `script/research.js` contains the Research-page image viewer; the disclosure sections use native HTML and need no JavaScript.
- `styles/style.css` keeps shared document rules first, followed by labeled homepage, Projects-page, and Research-page sections.

This is a static HTML/CSS/vanilla-JavaScript page. There is no upload flow, backend, gallery dependency, publication system, or automatic deck conversion.
