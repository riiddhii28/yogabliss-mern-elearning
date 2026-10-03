// Original written demo lessons. Times include reading and optional practice;
// they are estimates, not video runtimes. See MEDIA_SOURCES.md for cover credits
// and the video recordings still needed. Importing this file never touches a DB.
export const COURSES = [
  {
    title: "Foundations of Hatha Yoga",
    description:
      "Explore a steady, unhurried approach to yoga with a short introduction to posture, comfortable alignment, and rest. Three written lessons offer a starting point for your own practice.",
    category: "Hatha",
    level: "Beginner",
    createdBy: "YogaBliss",
    duration: 15,
    durationUnit: "minutes",
    price: 0,
    image: "uploads/hatha-foundations.jpg",
    learningOutcomes: [
      "Recognize the steady pace of a Hatha practice.",
      "Identify basic alignment cues in Mountain and Warrior II.",
      "Plan a short practice with time for pauses and rest.",
    ],
    lessons: [
      {
        title: "Begin with a Steady Base",
        description: "An introduction to Hatha, a comfortable practice space, and Mountain pose.",
        durationMinutes: 4,
        content: [
          "Hatha practice gives you time to explore individual postures without rushing from one movement to the next. This short course introduces a few ideas through written notes; it is not an instructor-led video class.",
          "Choose a clear space and a surface where your feet will not slip. In Mountain pose, stand with your feet comfortably apart, arms relaxed, and knees soft. Notice how your weight rests across your feet and let your breathing stay natural. You can also explore an upright position while seated.",
          "Take a moment to notice your starting position. Rather than aiming for a particular shape, ask whether you can remain comfortable and breathe easily. Pause or stop any movement that feels painful or makes you dizzy.",
        ].join("\n\n"),
      },
      {
        title: "Explore Standing Alignment",
        description: "Use Warrior II as an example of a stable stance and comfortable range of movement.",
        durationMinutes: 6,
        content: [
          "Warrior II is a standing posture with the feet apart, one knee bent, and the arms reaching in opposite directions. The aim here is to recognize the shape and its alignment cues, not to copy the exact depth of a photograph.",
          "Notice three relationships: the front knee follows the direction of the front toes, the torso stays upright, and the shoulders remain relaxed. A shorter stance and a smaller knee bend can make the position more manageable. Arms can rest on the hips rather than staying raised.",
          "If this posture is already familiar, explore it briefly on each side with natural breathing, returning to a comfortable standing position between sides. If it is new to you, use these notes as preparation for learning with a qualified teacher rather than attempting an unfamiliar pose from text alone.",
        ].join("\n\n"),
      },
      {
        title: "Close with Rest and Reflection",
        description: "Bring the ideas together into a small, repeatable practice with a quiet finish.",
        durationMinutes: 5,
        content: [
          "A short practice can have a simple beginning, middle, and end: settle into a comfortable position, explore a familiar standing posture on both sides, then rest. There is no need to add more poses just to fill time.",
          "Choose a comfortable seated or lying position for the final pause. Let your arms relax and allow your breath to return to its usual rhythm. Notice the support beneath you without trying to produce a particular feeling.",
          "Reflect on one cue you want to remember, such as soft knees, relaxed shoulders, or making room for a pause. Mark this lesson complete when you have read the notes and considered a practice that fits your experience.",
        ].join("\n\n"),
      },
    ],
  },
  {
    title: "Vinyasa Flow & Strength",
    description:
      "Explore how breath, controlled transitions, and steady support fit together in Vinyasa. Three short written lessons help learners with some yoga experience plan a manageable flow.",
    category: "Vinyasa",
    level: "Intermediate",
    createdBy: "YogaBliss",
    duration: 18,
    durationUnit: "minutes",
    price: 0,
    image: "uploads/vinyasa-flow-strength.jpg",
    learningOutcomes: [
      "Explain how a comfortable breath can guide movement pace.",
      "Recognize supported options for strength-focused postures.",
      "Outline a short flow with controlled transitions and rest.",
    ],
    lessons: [
      {
        title: "Find Your Movement Rhythm",
        description: "Understand breath-led movement without rushing or forcing the breath.",
        durationMinutes: 5,
        content: [
          "Vinyasa links postures through transitions. A flow does not have to be fast: moving at a pace that allows comfortable breathing matters more than keeping up with a fixed count. These written lessons assume some familiarity with basic yoga postures.",
          "Explore the idea with a familiar, simple movement such as slowly raising and lowering your arms while standing or seated. Notice whether the movement can follow your natural inhale and exhale without breath-holding. Reduce the range or pause if the rhythm feels forced.",
          "Before adding stronger postures, choose where you will pause. A standing or seated rest is part of the sequence, not a missed step. Keep this principle in mind when planning the next lesson's strength work.",
        ].join("\n\n"),
      },
      {
        title: "Build Support Before Speed",
        description: "Consider alignment, load, and supported options in plank-based strength work.",
        durationMinutes: 7,
        content: [
          "Strength-focused yoga asks you to support your body while continuing to breathe. Plank is one example, but a longer hold or a lower position is not automatically a better choice. The course cover illustrates forearm support; it is not a form assessment or a required pose.",
          "For a plank variation you already know, consider how the shoulders are supported and whether you can keep the trunk steady without straining. A wall-supported version or a knees-down variation can reduce the load. Choose the option that matches your experience rather than copying the photo.",
          "Use short efforts with comfortable rests instead of a maximum hold. Stop if you feel pain, and seek in-person guidance for unfamiliar strength postures. Write down a support option and a rest position you could include in your own flow.",
        ].join("\n\n"),
      },
      {
        title: "Plan a Short, Controlled Flow",
        description: "Combine familiar movements, a supported strength option, and a deliberate finish.",
        durationMinutes: 6,
        content: [
          "Sketch a small sequence using movements you already know: a gentle warm-up, a familiar standing movement on each side, an optional supported strength posture, and a rest. This is a planning exercise, not a complete follow-along video routine.",
          "Pay attention to the transitions as well as the poses. Give yourself time to place your feet and hands before shifting weight. Leave out jumps, demanding balances, or transitions you have not learned; a slower step is a valid choice.",
          "Review the plan for balance: both sides have time, breathing stays comfortable, and rest is available throughout. Finish by choosing one transition to explore more deliberately in a future practice.",
        ].join("\n\n"),
      },
    ],
  },
  {
    title: "Mindful Meditation & Breathwork",
    description:
      "Make room for a quiet pause with three short written lessons on comfortable sitting, noticing the natural breath, and returning attention when it wanders. No previous meditation experience is needed.",
    category: "Meditation",
    level: "Beginner",
    createdBy: "YogaBliss",
    duration: 12,
    durationUnit: "minutes",
    price: 0,
    image: "uploads/mindful-meditation-breathwork.jpg",
    learningOutcomes: [
      "Choose a comfortable seated position for a brief pause.",
      "Observe natural breathing without forcing or holding it.",
      "Practice returning attention gently after a distraction.",
    ],
    lessons: [
      {
        title: "Settle into a Comfortable Seat",
        description: "Prepare a simple space and choose a supported position without requiring a lotus pose.",
        durationMinutes: 3,
        content: [
          "Meditation does not require a special room or a particular leg position. Choose a place where you can pause for a few minutes. Sit on a chair with your feet supported, or use a cushion if sitting on the floor is comfortable.",
          "Let your hands rest and allow your shoulders to soften. Your eyes may stay open with a gentle gaze or close if that feels comfortable. Adjust your position when needed rather than trying to remain perfectly still.",
          "Notice one sound and the contact between your body and the seat. There is no need to clear your mind before beginning. This small act of noticing is enough to start.",
        ].join("\n\n"),
      },
      {
        title: "Notice the Natural Breath",
        description: "Use ordinary breathing as an attention anchor, without breath holds or forceful techniques.",
        durationMinutes: 4,
        content: [
          "For this introductory breathwork lesson, the practice is observation rather than changing how you breathe. Notice where the breath is easiest to feel: near the nose, in the chest, or in the movement of the abdomen.",
          "Follow a few natural breaths. Let each inhale and exhale arrive without trying to make it deeper or longer. There is no prescribed count and no breath retention. If focusing on breathing feels uncomfortable, return your attention to sounds or the support of your chair.",
          "When a thought takes your attention elsewhere, notice that it happened and gently return to the next breath. Wandering attention is an ordinary part of this exercise, not evidence that you are doing it incorrectly.",
        ].join("\n\n"),
      },
      {
        title: "A Short Pause and Gentle Return",
        description: "Bring posture and attention together, then finish with a brief reflection.",
        durationMinutes: 5,
        content: [
          "Set aside a few quiet minutes and choose an anchor: the natural breath, surrounding sounds, or the feeling of your feet on the floor. You can use a gentle timer if you prefer not to watch the clock.",
          "Each time you notice your mind has wandered, return to the anchor without judging the distraction. Adjust your seat or stop whenever you need to. The aim is to practice returning, not to maintain uninterrupted concentration.",
          "To finish, take in the room around you and move at your usual pace. Reflect on which anchor felt most accessible and where a short pause might fit into your day. No particular mood or result is required to complete the lesson.",
        ].join("\n\n"),
      },
    ],
  },
];
