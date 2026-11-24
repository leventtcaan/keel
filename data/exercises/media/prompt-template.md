# Form image prompt template (K-1219, ADR-091 #4)

One standard prompt for every move's form image, so all 40 look like one set. `tools/media_prompt.py <id>` fills the
slots below and prints the prompt; `tools/media_gen.sh <id>` sends it to the image model and saves the result to
`apps/mobile/assets/exercises/<id>/form.webp`. The block between the markers is the template, read verbatim.

## Slots (nothing is typed by hand per move)
| Slot | Comes from |
|---|---|
| `{name}`, `{cue1}`..`{cue3}` | `data/copy/en.json` › `exercises.<id>.name`, `.cue1`..`.cue3` |
| `{equipment}`, `{setup}`, `{muscles}` | `data/exercises/<id>.yaml` (`equipment`, `setup`, `muscles`; setup labels from `exerciseSetup.<field>.label`, muscle words from `demo.muscle.<m>`) |
| `{apparatus}`, `{view}`, `{start}`, `{end}`, `{path}` | `data/exercises/media/poses.json` (the pose of each move: side or front view, the two end positions, the path of the bar or limb) |

## Review (every image, before it ships)
Each image passes `docs/hareket-cekim-kontrol-listesi.md` (the parts that apply to a drawing: full range, setup visible, no
face, correct joint angles) and gets an `image_review` record in the move's YAML, set by the product owner only
(`pending` until then; the API serves the image only when the review passes).

<!-- prompt:begin -->
Create one image: a flat vector instructional illustration of the exercise "{name}", in the style of a clean fitness-app
exercise diagram. The image is a portrait canvas of 1080 x 1350 pixels with two panels side by side, left panel titled
"Start" and right panel titled "End". Those two titles are the only text in the image; no other words, numbers, logos,
watermarks or labels anywhere.

STYLE (fixed, identical for every exercise)
- Flat vector look, soft light-grey shading on the body and equipment, thin dark-grey outlines, no photo realism, no gradients on the background.
- Background: plain off-white (#FAF8F3) in both panels.
- The person is a faceless, gender-neutral grey mannequin: smooth featureless head (no eyes, nose, mouth, hair), neutral athletic proportions, simple shorts and shoes.
- Exactly one accent colour, turquoise #007684. Use it only for (a) the target muscles ({muscles}) drawn as a turquoise patch on the body, and (b) one curved or straight arrow showing the path of the bar, handle or limb. Everything else stays grey.
- Camera: {view}. Both panels use the same camera, same scale and same floor line, so the two positions can be compared at a glance.
- Perspective (strict): in a side view the barbell is seen end-on: it points toward the viewer, only the near plate is visible, drawn face-on and centred on the hands or bar position; never a bar drawn horizontally across the body with two plates. Machines and cable stations are drawn from the same side as the body, never from behind or in three-quarter view. In a front view, the bar or handles may run across the picture.
- The path arrow is drawn beside the figure, never over the body or the equipment.
- Neck neutral: head in line with the spine, no tilting back or craning forward.
- Anatomically correct joint angles and realistic proportions; limbs the right length, correct number of hands and fingers, nothing floating or merged.

THE MOVE
- Equipment: {apparatus}. Equipment type: {equipment}.
- Setup that must be visible and drawn correctly: {setup}.
- Left panel "Start": {start}.
- Right panel "End": {end}.
- Arrow (turquoise, in the End panel only): {path}.

COACHING CUES the drawing must agree with (do not write them in the image): "{cue1}" "{cue2}" "{cue3}"
<!-- prompt:end -->
