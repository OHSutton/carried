export const STANDARD_MUSCLES = [
    "Abs", "Back", "Biceps", "Calves", "Cardio", "Chest", "Core", "Forearms", "Glutes", "Hamstrings", "Lats", "Lower Back", "Neck", "Obliques", "Quads", "Shoulders", "Traps", "Triceps"
].sort();

export const INITIAL_EXERCISES = [
  // CHEST
  { name: "Barbell Bench Press", type: "weight", notes: "", muscles: ["Chest", "Shoulders", "Triceps"] },
  { name: "Barbell Incline Bench Press", type: "weight", notes: "", muscles: ["Chest", "Shoulders", "Triceps"] },
  { name: "Barbell Decline Bench Press", type: "weight", notes: "", muscles: ["Chest", "Triceps"] },
  { name: "Dumbbell Bench Press", type: "weight", notes: "", muscles: ["Chest", "Shoulders", "Triceps"] },
  { name: "Incline Dumbbell Press", type: "weight", notes: "", muscles: ["Chest", "Shoulders", "Triceps"] },
  { name: "Machine Pec Deck Fly", type: "weight", notes: "", muscles: ["Chest"] },
  { name: "Cable Crossover", type: "weight", notes: "High or low variants", muscles: ["Chest"] },
  { name: "Push Up", type: "weight", notes: "Bodyweight or weighted", muscles: ["Chest", "Shoulders", "Triceps", "Core"] },
  { name: "Chest Dip", type: "weight", notes: "Leaning forward on dip bars", muscles: ["Chest", "Triceps", "Shoulders"] },
  
  // BACK
  { name: "Barbell Deadlift", type: "weight", notes: "Conventional stance", muscles: ["Back", "Glutes", "Hamstrings", "Lower Back"] },
  { name: "Barbell Sumo Deadlift", type: "weight", notes: "Wide stance", muscles: ["Back", "Glutes", "Quads", "Lower Back"] },
  { name: "Pull Up", type: "weight", notes: "Overhand grip", muscles: ["Back", "Biceps", "Lats"] },
  { name: "Chin Up", type: "weight", notes: "Underhand grip", muscles: ["Back", "Biceps", "Lats"] },
  { name: "Cable Lat Pulldown", type: "weight", notes: "", muscles: ["Back", "Biceps", "Lats"] },
  { name: "Barbell Row", type: "weight", notes: "Bent over", muscles: ["Back", "Biceps", "Lats"] },
  { name: "Dumbbell Row", type: "weight", notes: "Single arm", muscles: ["Back", "Biceps", "Lats"] },
  { name: "Seated Cable Row", type: "weight", notes: "", muscles: ["Back", "Biceps"] },
  { name: "T-Bar Row", type: "weight", notes: "Machine or barbell", muscles: ["Back", "Lats", "Biceps"] },
  { name: "Cable Face Pull", type: "weight", notes: "", muscles: ["Shoulders", "Traps", "Back"] },
  { name: "Machine Back Extension", type: "weight", notes: "", muscles: ["Lower Back", "Glutes", "Hamstrings"] },
  
  // SHOULDERS
  { name: "Standing Barbell Overhead Press", type: "weight", notes: "Strict press", muscles: ["Shoulders", "Triceps"] },
  { name: "Seated Dumbbell Shoulder Press", type: "weight", notes: "", muscles: ["Shoulders", "Triceps"] },
  { name: "Arnold Press", type: "weight", notes: "Twisting DB press", muscles: ["Shoulders", "Triceps"] },
  { name: "Dumbbell Lateral Raise", type: "weight", notes: "", muscles: ["Shoulders"] },
  { name: "Cable Lateral Raise", type: "weight", notes: "", muscles: ["Shoulders"] },
  { name: "Dumbbell Front Raise", type: "weight", notes: "", muscles: ["Shoulders"] },
  { name: "Reverse Pec Deck Fly", type: "weight", notes: "Rear delt machine", muscles: ["Shoulders", "Back"] },
  { name: "Barbell Upright Row", type: "weight", notes: "", muscles: ["Shoulders", "Traps"] },
  { name: "Dumbbell Shrug", type: "weight", notes: "", muscles: ["Traps"] },
  
  // ARMS
  { name: "Dumbbell Bicep Curl", type: "weight", notes: "", muscles: ["Biceps"] },
  { name: "Barbell Bicep Curl", type: "weight", notes: "EZ-bar or straight", muscles: ["Biceps"] },
  { name: "Dumbbell Hammer Curl", type: "weight", notes: "Neutral grip", muscles: ["Biceps", "Forearms"] },
  { name: "Machine Preacher Curl", type: "weight", notes: "", muscles: ["Biceps"] },
  { name: "Cable Bicep Curl", type: "weight", notes: "", muscles: ["Biceps"] },
  { name: "Cable Tricep Pushdown", type: "weight", notes: "Straight bar or rope", muscles: ["Triceps"] },
  { name: "Dumbbell Overhead Tricep Extension", type: "weight", notes: "", muscles: ["Triceps"] },
  { name: "Barbell Skullcrusher", type: "weight", notes: "Lying extension", muscles: ["Triceps"] },
  { name: "Tricep Dip", type: "weight", notes: "Upright on parallel bars", muscles: ["Triceps", "Chest"] },
  { name: "Close Grip Barbell Bench Press", type: "weight", notes: "", muscles: ["Triceps", "Chest", "Shoulders"] },
  { name: "Dumbbell Wrist Curl", type: "weight", notes: "", muscles: ["Forearms"] },
  
  // LEGS
  { name: "Barbell Back Squat", type: "weight", notes: "", muscles: ["Glutes", "Quads"] },
  { name: "Barbell Front Squat", type: "weight", notes: "", muscles: ["Quads", "Glutes", "Core"] },
  { name: "Machine Leg Press", type: "weight", notes: "", muscles: ["Calves", "Glutes", "Quads", "Hamstrings"] },
  { name: "Dumbbell Walking Lunge", type: "weight", notes: "", muscles: ["Glutes", "Quads", "Hamstrings"] },
  { name: "Bulgarian Split Squat", type: "weight", notes: "Foot elevated lunge", muscles: ["Glutes", "Quads"] },
  { name: "Machine Leg Extension", type: "weight", notes: "", muscles: ["Quads"] },
  { name: "Machine Leg Curl", type: "weight", notes: "Seated or lying", muscles: ["Hamstrings"] },
  { name: "Romanian Deadlift", type: "weight", notes: "RDL", muscles: ["Hamstrings", "Glutes", "Lower Back"] },
  { name: "Barbell Hip Thrust", type: "weight", notes: "", muscles: ["Glutes", "Hamstrings"] },
  { name: "Standing Machine Calf Raise", type: "weight", notes: "", muscles: ["Calves"] },
  { name: "Seated Machine Calf Raise", type: "weight", notes: "", muscles: ["Calves"] },
  
  // CORE / TIME / CARDIO
  { name: "Crunch", type: "weight", notes: "Bodyweight or weighted", muscles: ["Abs", "Core"] },
  { name: "Hanging Leg Raise", type: "weight", notes: "", muscles: ["Abs", "Core"] },
  { name: "Kneeling Cable Crunch", type: "weight", notes: "", muscles: ["Abs", "Core"] },
  { name: "Weighted Russian Twist", type: "weight", notes: "", muscles: ["Abs", "Core", "Obliques"] },
  { name: "Forearm Plank", type: "time", notes: "For time", muscles: ["Abs", "Core"] },
  { name: "Side Plank", type: "time", notes: "For time", muscles: ["Abs", "Core", "Obliques"] },
  { name: "Treadmill Running", type: "time", notes: "", muscles: ["Cardio"] },
  { name: "Stationary Bike", type: "time", notes: "", muscles: ["Cardio", "Quads"] },
  { name: "Rowing Machine", type: "time", notes: "", muscles: ["Cardio", "Back", "Lats"] },
  { name: "Jump Rope", type: "time", notes: "For time", muscles: ["Cardio", "Calves"] },
];
