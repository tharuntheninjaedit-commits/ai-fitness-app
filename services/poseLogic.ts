// @ts-nocheck
// Refactored poseLogic.ts –
// Added a readiness check to prevent false counts on initialization and idle movements.
// A user must hold the starting position before the rep counter will activate.

// ---------- TYPES ----------
type Keypoint = {
  x: number
  y: number
  score: number
  name: string
}

type Pose = {
  keypoints: Keypoint[]
}

type ExerciseState = {
  stage: "up" | "down"
  counter: number
  cooldown: number
  history: Keypoint[][]
  isReady: boolean
  readyFrames: number
}

// ---------- GLOBAL STATES ----------
const pushupState: ExerciseState = { stage: "up", counter: 0, cooldown: 0, history: [], isReady: false, readyFrames: 0 }
const squatState: ExerciseState = { stage: "up", counter: 0, cooldown: 0, history: [], isReady: false, readyFrames: 0 }

// ---------- CONSTANTS ----------
const MAX_HISTORY = 8          // Frames for smoothing
const COOLDOWN_FRAMES = 10     // Cooldown frames to prevent double counts
const MIN_CONFIDENCE = 0.5     // Minimum average confidence for a pose to be considered
const FRAMES_TO_BE_READY = 5   // Frames in start position to be "ready"

// --- Fixed Angle thresholds for exercises (in degrees) ---
const PUSHUP_DOWN_THRESHOLD = 100 // Elbow angle for 'down' position
const PUSHUP_UP_THRESHOLD = 150   // Elbow angle for 'up' position

const SQUAT_DOWN_THRESHOLD = 110  // Knee angle for 'down' position
const SQUAT_UP_THRESHOLD = 165  // Knee angle for 'up' position

// ---------- HELPERS ----------
const findKeypoint = (pose: Pose, name: string): Keypoint | undefined => {
  return pose.keypoints.find(k => k.name === name && k.score > 0.3)
}

const avgConfidence = (pose: Pose): number => {
  const valid = pose.keypoints.filter(k => k.score > MIN_CONFIDENCE)
  if (!valid.length) return 0
  return valid.reduce((a, k) => a + k.score, 0) / valid.length
}

const getAngle = (a: Keypoint, b: Keypoint, c: Keypoint): number => {
  const rad = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x)
  let angle = Math.abs((rad * 180.0) / Math.PI)
  if (angle > 180.0) angle = 360 - angle
  return angle
}

const smoothKeypoints = (history: Keypoint[][]): Keypoint[] => {
  if (history.length === 0) return []
  const keypointNames = history[0].map(k => k.name)
  return keypointNames.map(name => {
    const points = history.flatMap(frame => frame.filter(k => k.name === name))
    const avgX = points.reduce((a, k) => a + k.x, 0) / points.length
    const avgY = points.reduce((a, k) => a + k.y, 0) / points.length
    const avgScore = points.reduce((a, k) => a + k.score, 0) / points.length
    return { name, x: avgX, y: avgY, score: avgScore }
  })
}

// Rep counting state machine with readiness check
const updateExerciseState = (
  state: ExerciseState,
  currentAngle: number,
  downThreshold: number,
  upThreshold: number
): "up" | "down" | null => {
  let transition: "up" | "down" | null = null

  // --- Readiness Check ---
  // This block runs until the user is in a stable 'up' position.
  if (!state.isReady) {
    if (currentAngle > upThreshold) {
      state.readyFrames++
    } else {
      // If they move out of the 'up' position, reset the ready counter.
      state.readyFrames = 0
    }

    if (state.readyFrames >= FRAMES_TO_BE_READY) {
      state.isReady = true
      state.stage = "up" // Ensure stage is 'up' when ready
    }
    return null // Don't count reps until ready
  }
  
  // --- Rep Counting Logic (only runs if state.isReady is true) ---
  if (state.cooldown > 0) {
    state.cooldown--
    return null
  }

  // Stage: UP -> DOWN
  if (state.stage === "up" && currentAngle < downThreshold) {
    state.stage = "down"
    transition = "down"
  }

  // Stage: DOWN -> UP (Rep counted here)
  if (state.stage === "down" && currentAngle > upThreshold) {
    state.stage = "up"
    state.counter++
    state.cooldown = COOLDOWN_FRAMES
    transition = "up"
  }

  return transition
}

// ---------- PUSHUP ANALYSIS ----------
export const analysePushup = (pose: Pose): { reps: number; feedback: string; stage: string; voice_feedback: string | null } => {
  const conf = avgConfidence(pose)
  if (conf < MIN_CONFIDENCE) {
    return { reps: pushupState.counter, feedback: "Pose not clear — move closer to camera", stage: pushupState.stage, voice_feedback: null }
  }

  pushupState.history.push(pose.keypoints)
  if (pushupState.history.length > MAX_HISTORY) pushupState.history.shift()

  const smoothed = smoothKeypoints(pushupState.history)
  const leftShoulder = findKeypoint({ keypoints: smoothed }, "left_shoulder")
  const leftElbow = findKeypoint({ keypoints: smoothed }, "left_elbow")
  const leftWrist = findKeypoint({ keypoints: smoothed }, "left_wrist")
  const rightShoulder = findKeypoint({ keypoints: smoothed }, "right_shoulder")
  const rightElbow = findKeypoint({ keypoints: smoothed }, "right_elbow")
  const rightWrist = findKeypoint({ keypoints: smoothed }, "right_wrist")
  const leftHip = findKeypoint({ keypoints: smoothed }, "left_hip")
  const rightHip = findKeypoint({ keypoints: smoothed }, "right_hip")


  if (!(leftShoulder && leftElbow && leftWrist && rightShoulder && rightElbow && rightWrist && leftHip && rightHip)) {
    return { reps: pushupState.counter, feedback: "Keep full arms and hips in frame", stage: pushupState.stage, voice_feedback: null }
  }

  const leftTorsoAngle = Math.abs(Math.atan2(leftHip.y - leftShoulder.y, leftHip.x - leftShoulder.x) * 180 / Math.PI);
  const rightTorsoAngle = Math.abs(Math.atan2(rightHip.y - rightShoulder.y, rightHip.x - rightShoulder.x) * 180 / Math.PI);
  const avgTorsoAngle = (leftTorsoAngle + rightTorsoAngle) / 2;

  const IS_TOO_VERTICAL_THRESHOLD = 45;
  if (avgTorsoAngle > IS_TOO_VERTICAL_THRESHOLD && avgTorsoAngle < (180 - IS_TOO_VERTICAL_THRESHOLD)) {
      if (pushupState.isReady) {
        pushupState.isReady = false;
        pushupState.readyFrames = 0;
      }
      return { reps: pushupState.counter, feedback: "Get into pushup position", stage: pushupState.stage, voice_feedback: "Get into pushup position" };
  }

  const leftAngle = getAngle(leftShoulder, leftElbow, leftWrist)
  const rightAngle = getAngle(rightShoulder, rightElbow, rightWrist)
  const avgAngle = (leftAngle + rightAngle) / 2

  const transition = updateExerciseState(pushupState, avgAngle, PUSHUP_DOWN_THRESHOLD, PUSHUP_UP_THRESHOLD)

  let feedback = "Get into pushup position";
  let voice_feedback: string | null = null;
  
  if (pushupState.isReady) {
      feedback = "Start your pushup";
      if (transition === "down") feedback = "Lower down — good form!";
      if (transition === "up") feedback = "Push up — rep counted!";
      
      // Partial rep detection
      if (pushupState.stage === 'up' && avgAngle < (PUSHUP_UP_THRESHOLD - 15) && avgAngle > PUSHUP_DOWN_THRESHOLD) {
          voice_feedback = "Try for a full range of motion.";
          feedback = "Lower your chest for a full rep.";
      }
  } else {
    voice_feedback = "Get into pushup position";
  }

  return { reps: pushupState.counter, feedback, stage: pushupState.stage, voice_feedback }
}

// ---------- SQUAT ANALYSIS ----------
export const analyseSquat = (pose: Pose): { reps: number; feedback: string; stage: string; voice_feedback: string | null } => {
  const conf = avgConfidence(pose)
  if (conf < MIN_CONFIDENCE) {
    return { reps: squatState.counter, feedback: "Pose not clear — stand centered", stage: squatState.stage, voice_feedback: null }
  }

  squatState.history.push(pose.keypoints)
  if (squatState.history.length > MAX_HISTORY) squatState.history.shift()

  const smoothed = smoothKeypoints(squatState.history)
  const leftHip = findKeypoint({ keypoints: smoothed }, "left_hip")
  const leftKnee = findKeypoint({ keypoints: smoothed }, "left_knee")
  const leftAnkle = findKeypoint({ keypoints: smoothed }, "left_ankle")
  const rightHip = findKeypoint({ keypoints: smoothed }, "right_hip")
  const rightKnee = findKeypoint({ keypoints: smoothed }, "right_knee")
  const rightAnkle = findKeypoint({ keypoints: smoothed }, "right_ankle")

  if (!(leftHip && leftKnee && leftAnkle && rightHip && rightKnee && rightAnkle)) {
    return { reps: squatState.counter, feedback: "Ensure legs fully visible", stage: squatState.stage, voice_feedback: null }
  }

  const leftAngle = getAngle(leftHip, leftKnee, leftAnkle)
  const rightAngle = getAngle(rightHip, rightKnee, rightAnkle)
  const avgAngle = (leftAngle + rightAngle) / 2
  
  const transition = updateExerciseState(squatState, avgAngle, SQUAT_DOWN_THRESHOLD, SQUAT_UP_THRESHOLD)

  let feedback = "Stand straight to begin";
  let voice_feedback: string | null = null;

  if(squatState.isReady) {
      feedback = "Start your squat";
      if (transition === "down") feedback = "Go lower — controlled descent!";
      if (transition === "up") feedback = "Great! Rep completed";

      // Partial rep detection
      if (squatState.stage === 'up' && avgAngle < (SQUAT_UP_THRESHOLD - 15) && avgAngle > SQUAT_DOWN_THRESHOLD) {
          voice_feedback = "Go a little deeper.";
          feedback = "Go deeper to complete the squat.";
      }
  } else {
    voice_feedback = "Stand straight to begin";
  }

  return { reps: squatState.counter, feedback, stage: squatState.stage, voice_feedback }
}

// ---------- RESET ----------
export const resetPushupCounter = () => {
  pushupState.counter = 0
  pushupState.stage = "up"
  pushupState.cooldown = 0
  pushupState.history = []
  pushupState.isReady = false
  pushupState.readyFrames = 0
}

export const resetSquatCounter = () => {
  squatState.counter = 0
  squatState.stage = "up"
  squatState.cooldown = 0
  squatState.history = []
  squatState.isReady = false
  squatState.readyFrames = 0
}