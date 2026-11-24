import type { ImageSourcePropType } from 'react-native';

/**
 * The drawn form images in the app's assets (ADR-091 #4, K-1219): the server names one by its asset path
 * (`Exercise.image`, only once the image passed its review), and Metro needs a static `require` for each file, so the
 * paths map to them here. A move gets a line here when its image file is added (the form-images test keeps the map and
 * the assets folder the same).
 */
const IMAGES: Record<string, ImageSourcePropType> = {
  'exercises/barbell_curl/form.webp': require('../../assets/exercises/barbell_curl/form.webp'),
  'exercises/barbell_row/form.webp': require('../../assets/exercises/barbell_row/form.webp'),
  'exercises/bench_press/form.webp': require('../../assets/exercises/bench_press/form.webp'),
  'exercises/bulgarian_split_squat/form.webp': require('../../assets/exercises/bulgarian_split_squat/form.webp'),
  'exercises/cable_fly/form.webp': require('../../assets/exercises/cable_fly/form.webp'),
  'exercises/cable_lateral_raise/form.webp': require('../../assets/exercises/cable_lateral_raise/form.webp'),
  'exercises/chest_supported_row/form.webp': require('../../assets/exercises/chest_supported_row/form.webp'),
  'exercises/close_grip_lat_pulldown/form.webp': require('../../assets/exercises/close_grip_lat_pulldown/form.webp'),
  'exercises/dip/form.webp': require('../../assets/exercises/dip/form.webp'),
  'exercises/dumbbell_bench_press/form.webp': require('../../assets/exercises/dumbbell_bench_press/form.webp'),
  'exercises/dumbbell_curl/form.webp': require('../../assets/exercises/dumbbell_curl/form.webp'),
  'exercises/dumbbell_shoulder_press/form.webp': require('../../assets/exercises/dumbbell_shoulder_press/form.webp'),
  'exercises/face_pull/form.webp': require('../../assets/exercises/face_pull/form.webp'),
  'exercises/hack_squat/form.webp': require('../../assets/exercises/hack_squat/form.webp'),
  'exercises/hammer_curl/form.webp': require('../../assets/exercises/hammer_curl/form.webp'),
  'exercises/hip_thrust/form.webp': require('../../assets/exercises/hip_thrust/form.webp'),
  'exercises/incline_dumbbell_press/form.webp': require('../../assets/exercises/incline_dumbbell_press/form.webp'),
  'exercises/lat_pulldown/form.webp': require('../../assets/exercises/lat_pulldown/form.webp'),
  'exercises/lateral_raise/form.webp': require('../../assets/exercises/lateral_raise/form.webp'),
  'exercises/leg_extension/form.webp': require('../../assets/exercises/leg_extension/form.webp'),
  'exercises/leg_press/form.webp': require('../../assets/exercises/leg_press/form.webp'),
  'exercises/lying_leg_curl/form.webp': require('../../assets/exercises/lying_leg_curl/form.webp'),
  'exercises/machine_chest_press/form.webp': require('../../assets/exercises/machine_chest_press/form.webp'),
  'exercises/one_arm_dumbbell_row/form.webp': require('../../assets/exercises/one_arm_dumbbell_row/form.webp'),
  'exercises/overhead_press/form.webp': require('../../assets/exercises/overhead_press/form.webp'),
  'exercises/overhead_triceps_extension/form.webp': require('../../assets/exercises/overhead_triceps_extension/form.webp'),
  'exercises/pec_deck/form.webp': require('../../assets/exercises/pec_deck/form.webp'),
  'exercises/pull_up/form.webp': require('../../assets/exercises/pull_up/form.webp'),
  'exercises/push_up/form.webp': require('../../assets/exercises/push_up/form.webp'),
  'exercises/rear_delt_fly/form.webp': require('../../assets/exercises/rear_delt_fly/form.webp'),
  'exercises/reverse_curl/form.webp': require('../../assets/exercises/reverse_curl/form.webp'),
  'exercises/reverse_pec_deck/form.webp': require('../../assets/exercises/reverse_pec_deck/form.webp'),
  'exercises/romanian_deadlift/form.webp': require('../../assets/exercises/romanian_deadlift/form.webp'),
  'exercises/seated_calf_raise/form.webp': require('../../assets/exercises/seated_calf_raise/form.webp'),
  'exercises/seated_leg_curl/form.webp': require('../../assets/exercises/seated_leg_curl/form.webp'),
  'exercises/seated_row/form.webp': require('../../assets/exercises/seated_row/form.webp'),
  'exercises/squat/form.webp': require('../../assets/exercises/squat/form.webp'),
  'exercises/standing_calf_raise/form.webp': require('../../assets/exercises/standing_calf_raise/form.webp'),
  'exercises/t_bar_row/form.webp': require('../../assets/exercises/t_bar_row/form.webp'),
  'exercises/triceps_pushdown/form.webp': require('../../assets/exercises/triceps_pushdown/form.webp'),
};

/** The image a path from the server names; nothing when this build has no such file (an older app, a newer catalog). */
export function formImage(path: string | undefined): ImageSourcePropType | undefined {
  return path === undefined ? undefined : IMAGES[path];
}

/** The paths this build has a file for. */
export const formImagePaths = Object.keys(IMAGES);
