import type { VideoSource } from 'expo-video';

/**
 * The form loop clips in the app's assets (ADR-091 Ek 6, K-1219): the server names one by its asset path (`Exercise.loop`,
 * only once the clip passed its review), and Metro needs a static `require` for each file, so the paths map to them here.
 * Written by `python3 tools/media_loop.py --map` from the files on disk (form-loops.test.ts keeps the two the same).
 */
const LOOPS: Record<string, VideoSource> = {
  'exercises/barbell_curl/loop.mp4': require('../../assets/exercises/barbell_curl/loop.mp4'),
  'exercises/barbell_row/loop.mp4': require('../../assets/exercises/barbell_row/loop.mp4'),
  'exercises/bench_press/loop.mp4': require('../../assets/exercises/bench_press/loop.mp4'),
  'exercises/bulgarian_split_squat/loop.mp4': require('../../assets/exercises/bulgarian_split_squat/loop.mp4'),
  'exercises/cable_fly/loop.mp4': require('../../assets/exercises/cable_fly/loop.mp4'),
  'exercises/cable_lateral_raise/loop.mp4': require('../../assets/exercises/cable_lateral_raise/loop.mp4'),
  'exercises/chest_supported_row/loop.mp4': require('../../assets/exercises/chest_supported_row/loop.mp4'),
  'exercises/close_grip_lat_pulldown/loop.mp4': require('../../assets/exercises/close_grip_lat_pulldown/loop.mp4'),
  'exercises/dip/loop.mp4': require('../../assets/exercises/dip/loop.mp4'),
  'exercises/dumbbell_bench_press/loop.mp4': require('../../assets/exercises/dumbbell_bench_press/loop.mp4'),
  'exercises/dumbbell_curl/loop.mp4': require('../../assets/exercises/dumbbell_curl/loop.mp4'),
  'exercises/dumbbell_shoulder_press/loop.mp4': require('../../assets/exercises/dumbbell_shoulder_press/loop.mp4'),
  'exercises/face_pull/loop.mp4': require('../../assets/exercises/face_pull/loop.mp4'),
  'exercises/hack_squat/loop.mp4': require('../../assets/exercises/hack_squat/loop.mp4'),
  'exercises/hammer_curl/loop.mp4': require('../../assets/exercises/hammer_curl/loop.mp4'),
  'exercises/hip_thrust/loop.mp4': require('../../assets/exercises/hip_thrust/loop.mp4'),
  'exercises/incline_dumbbell_press/loop.mp4': require('../../assets/exercises/incline_dumbbell_press/loop.mp4'),
  'exercises/lat_pulldown/loop.mp4': require('../../assets/exercises/lat_pulldown/loop.mp4'),
  'exercises/lateral_raise/loop.mp4': require('../../assets/exercises/lateral_raise/loop.mp4'),
  'exercises/leg_extension/loop.mp4': require('../../assets/exercises/leg_extension/loop.mp4'),
  'exercises/leg_press/loop.mp4': require('../../assets/exercises/leg_press/loop.mp4'),
  'exercises/lying_leg_curl/loop.mp4': require('../../assets/exercises/lying_leg_curl/loop.mp4'),
  'exercises/machine_chest_press/loop.mp4': require('../../assets/exercises/machine_chest_press/loop.mp4'),
  'exercises/one_arm_dumbbell_row/loop.mp4': require('../../assets/exercises/one_arm_dumbbell_row/loop.mp4'),
  'exercises/overhead_press/loop.mp4': require('../../assets/exercises/overhead_press/loop.mp4'),
  'exercises/overhead_triceps_extension/loop.mp4': require('../../assets/exercises/overhead_triceps_extension/loop.mp4'),
  'exercises/pec_deck/loop.mp4': require('../../assets/exercises/pec_deck/loop.mp4'),
  'exercises/pull_up/loop.mp4': require('../../assets/exercises/pull_up/loop.mp4'),
  'exercises/push_up/loop.mp4': require('../../assets/exercises/push_up/loop.mp4'),
  'exercises/rear_delt_fly/loop.mp4': require('../../assets/exercises/rear_delt_fly/loop.mp4'),
  'exercises/reverse_curl/loop.mp4': require('../../assets/exercises/reverse_curl/loop.mp4'),
  'exercises/reverse_pec_deck/loop.mp4': require('../../assets/exercises/reverse_pec_deck/loop.mp4'),
  'exercises/romanian_deadlift/loop.mp4': require('../../assets/exercises/romanian_deadlift/loop.mp4'),
  'exercises/seated_calf_raise/loop.mp4': require('../../assets/exercises/seated_calf_raise/loop.mp4'),
  'exercises/seated_leg_curl/loop.mp4': require('../../assets/exercises/seated_leg_curl/loop.mp4'),
  'exercises/seated_row/loop.mp4': require('../../assets/exercises/seated_row/loop.mp4'),
  'exercises/squat/loop.mp4': require('../../assets/exercises/squat/loop.mp4'),
  'exercises/standing_calf_raise/loop.mp4': require('../../assets/exercises/standing_calf_raise/loop.mp4'),
  'exercises/t_bar_row/loop.mp4': require('../../assets/exercises/t_bar_row/loop.mp4'),
  'exercises/triceps_pushdown/loop.mp4': require('../../assets/exercises/triceps_pushdown/loop.mp4'),
};

/** The clip a path from the server names; nothing when this build has no such file (an older app, a newer catalog). */
export function formLoop(path: string | undefined): VideoSource | undefined {
  return path === undefined ? undefined : LOOPS[path];
}

/** The paths this build has a file for. */
export const formLoopPaths = Object.keys(LOOPS);
