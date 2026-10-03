# YogaBliss demo content and media

Phase 1 source record, checked 2026-10-03. The three demo courses are free,
short written introductions. Course and lesson content lives in
`server/src/seed/catalog.js`. Durations are estimated reading plus optional
practice time, not video runtimes or multi-week programs. “YogaBliss” identifies
the demo content author; no instructor credentials or endorsements are claimed.

## Course cover photographs

All three photos are from **Pexels**, under the
[Pexels License](https://www.pexels.com/license/). It permits free website use
and modifications; attribution is optional, but recorded here. Do not imply
endorsement by the photographers or people pictured. These are illustrative
course covers, not photos of YogaBliss instructors.

| Course | Repository file | Photographer | Original source page |
| --- | --- | --- | --- |
| Foundations of Hatha Yoga | `server/uploads/hatha-foundations.jpg` | cottonbro studio | [Woman Practicing Yoga with Dog at Home, photo 4056510](https://www.pexels.com/photo/woman-girl-animal-dog-4056510/) |
| Vinyasa Flow & Strength | `server/uploads/vinyasa-flow-strength.jpg` | Klaus Nielsen | [Black sportswoman doing forearm plank, photo 6303455](https://www.pexels.com/photo/black-sportswoman-doing-forearm-plank-6303455/) |
| Mindful Meditation & Breathwork | `server/uploads/mindful-meditation-breathwork.jpg` | Jan Kopřiva | [Calm woman meditating with closed eyes at home, photo 6593243](https://www.pexels.com/photo/calm-woman-meditating-with-closed-eyes-at-home-6593243/) |

Downloaded photo URLs (also usable if the local files need restoring):

- Hatha: <https://images.pexels.com/photos/4056510/pexels-photo-4056510.jpeg?auto=compress&cs=tinysrgb&w=1200>
- Vinyasa: <https://images.pexels.com/photos/6303455/pexels-photo-6303455.jpeg?auto=compress&cs=tinysrgb&w=1200>
- Meditation: <https://images.pexels.com/photos/6593243/pexels-photo-6593243.jpeg?auto=compress&cs=tinysrgb&w=1200>

The downloaded images were visually inspected, center-cropped to 1197×798,
then resized to 960×640 and saved as JPEG at quality 76. There is no added text,
watermark, or AI-generated imagery. The 3:2 ratio is used on cards and details.
One cover per course is intentionally reused on Home, Courses, details, and
Account through the existing database image field and URL helpers.

The seed uploads these local files to Cloudinary when configured, or stores
their `uploads/...` paths for local development. The application does not
hotlink Pexels or need a Pexels API key. Existing Cloudinary thumbnail
transformations remain in use. No image downloads are outstanding.

## Lesson videos: intentionally not supplied

The old `server/uploads/sample-lecture.mp4` is approximately 8:10 at 640×360.
The audit sampled facial massage/exercise segments including Soft Eye Circles,
Forehead Massage, Puffer Fish Pose, Eyebrow Pinch, and Face Tapping. It is not
appropriate instruction for these three curricula, and its reuse rights are
not documented. The updated seed neither uploads it nor associates it with
any lesson. No replacement video was downloaded or fabricated.

Pexels has reusable stock footage, for example
[Women Doing Meditation by Cliff Booth](https://www.pexels.com/video/women-doing-meditation-4106467/),
covered by the Pexels License linked above. This was considered as a source,
but its listing does not establish a complete narrated lesson matching our
curriculum. Stock footage is not being passed off as teaching content. No
complete, suitably licensed teaching videos were verified for this phase.

The demo is usable with its written lessons. To add video instruction later,
record or obtain explicit reuse permission for these **nine distinct assets**:

| Course | Suggested filename | Required subject | Approximate target |
| --- | --- | --- | --- |
| Hatha | `hatha-steady-base.mp4` | Practice setup and an accessible introduction to Mountain pose | 4 min |
| Hatha | `hatha-standing-alignment.mp4` | Warrior II alignment with accessible options, both sides | 6 min |
| Hatha | `hatha-rest-reflection.mp4` | A quiet finish and reflection on a short Hatha practice | 5 min |
| Vinyasa | `vinyasa-movement-rhythm.mp4` | Comfortable breath-led movement and pauses | 5 min |
| Vinyasa | `vinyasa-supported-strength.mp4` | Supported plank options and controlled effort/rest | 7 min |
| Vinyasa | `vinyasa-controlled-flow.mp4` | A short familiar sequence with deliberate transitions | 6 min |
| Meditation | `meditation-comfortable-seat.mp4` | Chair/cushion options and settling attention | 3 min |
| Meditation | `meditation-natural-breath.mp4` | Observing ordinary breathing without retention or forcing | 4 min |
| Meditation | `meditation-gentle-return.mp4` | A brief attention practice and gentle finish | 5 min |

These filenames describe future assets; they are not referenced as existing
files in code. When supplied, record the creator, source URL, license/permission,
and any audio rights here. Review the full recordings before publishing and
update durations to match. Use compressed MP4s through the existing Cloudinary
flow; do not add large source recordings to Git. No new paid service is needed.

## Existing assets and database rollout

- `client/src/assets/banner-1.jpg`, `banner-2.jpg`, and the logo are unchanged.
  This source record does not establish provenance for those older assets.
- The old `course-1.jpg`, `course-2.jpg`, `course-3.jpg`, and
  `sample-lecture.mp4` are retained at their existing paths **only for legacy
  database references**. No updated seed record uses them. Without inspecting
  or migrating the database, removing them could break existing local records.
  Remove them after those references are confirmed absent; do not reuse them
  for the new catalog.
- No database was seeded or migrated in Phase 1. Existing MongoDB records and
  Cloudinary assets are unchanged; updating code alone does not replace them.
- `npm run seed` remains a **destructive reset** of users, courses, lectures,
  and progress. Use it only with a verified disposable development database.
  Do not point it at production to apply this content update. A separately
  approved content migration is required to preserve real enrollments/data.
- Older courses retain week-based duration interpretation. The new seeds use
  explicit minute units. Existing admin video uploads are still supported.
- Free labels reflect the existing free enrollment API even for older records
  that still contain a nonzero historical price. New demo seeds and newly
  created courses store zero; this phase does not rewrite old database values.
