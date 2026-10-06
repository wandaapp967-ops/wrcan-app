# Media House Hub enhancement

## What will change
- Reframe the existing Live Studio as a professional Media House Hub while keeping its current preview, program, classroom, recording, and participation tools.
- Add a left-side desk selector with four clearly labelled, keyboard- and touch-friendly training desks.
- Place each desk’s active controls beside the video output so students can test them without leaving the studio.

## Training desks
1. **Radio Presenter Desk** — ON AIR switch, microphone mute, and animated sound-level bars that respond to the active state.
2. **TV / Actor Prompter** — vertically scrolling script, play/pause and adjustable speed controls.
3. **Vlogger Engagement Sim** — trigger realistic mock likes, comments, follows, and viewer alerts over the video, with a dismissible alert queue.
4. **Producer Booth** — drag-and-drop or browse upload for image cover art, immediate local preview, file replacement/removal, and a visible Now Playing card.

## Design and usability
- Use Wanda’s existing black, gold, and rose-metal design tokens.
- Give all controls clear borders, selected/disabled states, focus rings, labels, and suitable touch sizes.
- Make the hub responsive: a compact horizontal desk selector on phones and a stable sidebar on larger screens.
- Keep uploaded producer artwork local to the browser and revoke temporary file URLs safely.

## Verification
- Test desk switching and each interactive control in the running preview.
- Check desktop and mobile layouts for clipping or overlap.
- Confirm the page builds without errors and retains its route metadata.

## Technical details
- Implement the enhancement in the existing Live Studio route using React state, refs, and browser file APIs.
- Use the shared Button component for command controls and semantic Tailwind theme classes for styling.
- Preserve the current local-only practice model; no student media is uploaded or stored.
