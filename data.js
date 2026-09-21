// Program data. Edit freely — the app reads this at runtime.
export const PROGRAM = {
  mon: {
    name: "Push",
    accent: "push",
    items: [
      { n: "Barbell Bench Press",      sets: 3, reps: "8",  heavy: true },
      { n: "Incline Dumbbell Press",   sets: 3, reps: "10", heavy: true },
      { n: "Overhead Press",           sets: 3, reps: "8",  heavy: true },
      { n: "Dumbbell Lateral Raise",   sets: 3, reps: "12" },
      { n: "Cable Triceps Pushdown",   sets: 3, reps: "12" },
      { n: "Incline Treadmill Walk",   sets: 1, reps: "10 min", cardio: true }
    ]
  },
  tue: {
    name: "Pull",
    accent: "pull",
    items: [
      { n: "Lat Pulldown",             sets: 3, reps: "10", heavy: true },
      { n: "Seated Cable Row",         sets: 3, reps: "10", heavy: true },
      { n: "One-Arm Dumbbell Row",     sets: 3, reps: "10 / side", heavy: true },
      { n: "Cable Face Pull",          sets: 3, reps: "15" },
      { n: "Barbell Curl",             sets: 3, reps: "10" },
      { n: "Easy Cycle",               sets: 1, reps: "10 min", cardio: true }
    ]
  },
  wed: {
    name: "Legs + Core",
    accent: "legs",
    items: [
      { n: "Squat",                    sets: 3, reps: "8",  heavy: true },
      { n: "Romanian Deadlift",        sets: 3, reps: "8",  heavy: true },
      { n: "Leg Press",                sets: 3, reps: "12", heavy: true },
      { n: "Leg Curl",                 sets: 3, reps: "12" },
      { n: "Calf Raise",               sets: 3, reps: "15" },
      { n: "Plank",                    sets: 3, reps: "45 sec", hold: 45 },
      { n: "Hanging Knee Raise",       sets: 3, reps: "12" }
    ]
  },
  thu: {
    name: "Push 2",
    accent: "push",
    items: [
      { n: "Incline Barbell Press",    sets: 3, reps: "10", heavy: true },
      { n: "Dumbbell Shoulder Press",  sets: 3, reps: "10", heavy: true },
      { n: "Cable Fly or Pec Deck",    sets: 3, reps: "12" },
      { n: "Lateral Raise",            sets: 3, reps: "15" },
      { n: "Overhead Triceps Extension", sets: 3, reps: "12" }
    ]
  },
  fri: {
    name: "Pull 2",
    accent: "pull",
    items: [
      { n: "Pull-Ups", note: "assisted / negatives", sets: 3, reps: "max", heavy: true },
      { n: "Chest-Supported Row",      sets: 3, reps: "12", heavy: true },
      { n: "Straight-Arm Pulldown",    sets: 3, reps: "12" },
      { n: "Rear Delt Fly",            sets: 3, reps: "15" },
      { n: "Hammer Curl",              sets: 3, reps: "12" }
    ]
  },
  sat: {
    name: "Conditioning + Legs",
    accent: "legs",
    items: [
      { n: "Bulgarian Split Squat",    sets: 3, reps: "10 / leg", heavy: true },
      { n: "Leg Extension",            sets: 3, reps: "15" },
      { n: "Intervals", note: "30s hard / 90s easy", sets: 6, reps: "round", cardio: true },
      { n: "Dead Bug",                 sets: 3, reps: "12 / side" },
      { n: "Side Plank",               sets: 3, reps: "30 sec / side", hold: 30 }
    ]
  },
  sun: {
    name: "Rest",
    accent: "rest",
    items: [
      { n: "Walk",                     sets: 1, reps: "20–30 min", cardio: true },
      { n: "Stretch / Mobility",       sets: 1, reps: "10 min", cardio: true }
    ]
  }
};

export const DAYS = ["mon","tue","wed","thu","fri","sat","sun"];
export const DAY_LABEL = { mon:"Mon", tue:"Tue", wed:"Wed", thu:"Thu", fri:"Fri", sat:"Sat", sun:"Sun" };
export const START_WEIGHT = 62;
