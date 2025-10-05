// @ts-nocheck
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Exercise } from '../types';
import { analysePushup, resetPushupCounter, analyseSquat, resetSquatCounter } from '../services/poseLogic';
import Spinner from './Spinner';
import { CameraIcon, TimerIcon, RepeatIcon, SwitchCameraIcon } from './Icons';

const MOTIVATIONAL_PHRASES = ["Keep up the great work!", "You're doing great, push through!", "Amazing effort!"];
const SPEECH_COOLDOWN = 2500; // 2.5 seconds between spoken feedback

const PoseDetectScreen: React.FC = () => {
    const [isCameraOn, setIsCameraOn] = useState(false);
    const [detector, setDetector] = useState(null);
    const [loading, setLoading] = useState(true);
    const [exercise, setExercise] = useState<Exercise>('Pushups');
    const [reps, setReps] = useState(0);
    const [timer, setTimer] = useState(0);
    const [feedback, setFeedback] = useState('Select an exercise and start camera.');
    const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationFrameId = useRef<number>();
    const timerIntervalId = useRef<number>();
    const lastFeedbackRef = useRef<string>('');
    const lastSpokenTimeRef = useRef(0);
    const lastSpokenFormFeedback = useRef<string | null>(null);
    const lastRepCountForMilestone = useRef(0);
    const isSwitchingCamera = useRef(false);

    const loadDetector = useCallback(async () => {
        try {
            const detectorConfig = { modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING };
            const loadedDetector = await poseDetection.createDetector(poseDetection.SupportedModels.MoveNet, detectorConfig);
            setDetector(loadedDetector);
        } catch (error) {
            console.error("Error loading MoveNet model:", error);
            setFeedback("Error loading model. Please refresh.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadDetector();
        return () => { // Cleanup on unmount
            stopCamera();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loadDetector]);

    useEffect(() => {
        if (isSwitchingCamera.current) {
            isSwitchingCamera.current = false;
            resetCounters();
            startCamera();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [facingMode]);

    const startTimer = () => {
        setTimer(0);
        timerIntervalId.current = window.setInterval(() => {
            setTimer(t => t + 1);
        }, 1000);
    };

    const stopTimer = () => {
        if (timerIntervalId.current) {
            clearInterval(timerIntervalId.current);
        }
    };
    
    const speak = useCallback((text: string, cancelPrevious = true) => {
        if ('speechSynthesis' in window) {
            if (cancelPrevious) {
                speechSynthesis.cancel();
            }
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 0.9; // Slower, more natural pace
            speechSynthesis.speak(utterance);
        }
    }, []);

    const detectPose = useCallback(async () => {
        if (!detector || !videoRef.current || !canvasRef.current || videoRef.current.readyState < 3) {
            animationFrameId.current = requestAnimationFrame(detectPose);
            return;
        }

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const poses = await detector.estimatePoses(video);
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (poses && poses.length > 0) {
            const pose = poses[0];
            ctx.fillStyle = '#00FF00';
            pose.keypoints.forEach(keypoint => {
                if (keypoint.score > 0.3) {
                    ctx.beginPath();
                    ctx.arc(keypoint.x, keypoint.y, 5, 0, 2 * Math.PI);
                    ctx.fill();
                }
            });

            const analysisResult = exercise === 'Pushups' ? analysePushup(pose) : analyseSquat(pose);

            // Update UI feedback text
            if (analysisResult.feedback !== lastFeedbackRef.current) {
                setFeedback(analysisResult.feedback);
                lastFeedbackRef.current = analysisResult.feedback;
            }
            
            // Update Rep Counter
            if (analysisResult.reps > reps) {
                setReps(analysisResult.reps);
            }

            // --- Voice Assistant Logic ---
            const now = Date.now();
            let whatToSay = '';

            // Check for new reps to trigger milestones
            if (analysisResult.reps > lastRepCountForMilestone.current) {
                const newReps = analysisResult.reps;
                lastRepCountForMilestone.current = newReps;

                if (newReps > 0 && newReps % 10 === 0) {
                    const phrase = MOTIVATIONAL_PHRASES[Math.floor(Math.random() * MOTIVATIONAL_PHRASES.length)];
                    whatToSay = `${phrase} You've reached ${newReps} reps!`;
                } else if (newReps > 0 && newReps % 5 === 0) {
                    whatToSay = `Great, you've reached ${newReps} reps!`;
                }
            }
            
            // Form Correction - only if no milestone was triggered
            if (!whatToSay && analysisResult.voice_feedback) {
                if (analysisResult.voice_feedback !== lastSpokenFormFeedback.current) {
                    whatToSay = analysisResult.voice_feedback;
                    lastSpokenFormFeedback.current = analysisResult.voice_feedback;
                }
            } else if (!analysisResult.voice_feedback) {
                // Reset when form is good, so correction can be triggered again.
                lastSpokenFormFeedback.current = null;
            }
            
            // Speak if there's something to say and cooldown has passed
            if (whatToSay && now - lastSpokenTimeRef.current > SPEECH_COOLDOWN) {
                speak(whatToSay, true);
                lastSpokenTimeRef.current = now;
            }
        }

        animationFrameId.current = requestAnimationFrame(detectPose);
    }, [detector, exercise, reps, speak]);

    const startCamera = async () => {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode } });
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.onloadedmetadata = () => {
                        videoRef.current?.play();
                        setIsCameraOn(true);
                        const startMsg = 'Camera started. Get in position.';
                        setFeedback(startMsg);
                        lastFeedbackRef.current = startMsg;
                        animationFrameId.current = requestAnimationFrame(detectPose);
                        startTimer();
                    };
                }
            } catch (error) {
                console.error("Error accessing camera:", error);
                setFeedback("Camera access denied. Please enable camera permissions.");
            }
        }
    };

    const stopCamera = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
            videoRef.current.srcObject = null;
        }
        if (animationFrameId.current) {
            cancelAnimationFrame(animationFrameId.current);
        }
        stopTimer();
        
        if ('speechSynthesis' in window) {
            speechSynthesis.cancel();
        }

        setIsCameraOn(false);
        if (!isSwitchingCamera.current) {
            setFeedback('Camera stopped.');
        }
        resetCounters();
    };

    const handleStartStop = () => {
        isSwitchingCamera.current = false;
        if (isCameraOn) {
            stopCamera();
        } else {
            resetCounters();
            startCamera();
        }
    };
    
    const resetCounters = () => {
        resetPushupCounter();
        resetSquatCounter();
        setReps(0);
        setTimer(0);
        lastRepCountForMilestone.current = 0;
        lastSpokenFormFeedback.current = null;
    }
    
    const handleExerciseChange = (newExercise: Exercise) => {
        if(isCameraOn) stopCamera();
        setExercise(newExercise);
        resetCounters();
        setFeedback(`Selected ${newExercise}. Press start.`);
    }

    const handleCameraSwitch = () => {
        if (isCameraOn) {
            isSwitchingCamera.current = true;
            stopCamera();
        }
        setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    if (loading) {
        return <div className="flex justify-center items-center h-full"><Spinner /> <p className="ml-4">Loading AI Model...</p></div>;
    }

    return (
        <div className="p-4 flex flex-col h-full">
            <h1 className="text-2xl font-bold mb-4 text-center">AI Pose Detection</h1>
            <div className="flex justify-center gap-2 mb-4">
                {(['Pushups', 'Squats'] as Exercise[]).map(ex => (
                    <button
                        key={ex}
                        onClick={() => handleExerciseChange(ex)}
                        className={`px-4 py-2 rounded-full font-semibold transition ${exercise === ex ? 'bg-teal-500 text-white' : 'bg-gray-700 text-gray-300'}`}
                    >
                        {ex}
                    </button>
                ))}
            </div>
            <div className="relative w-full aspect-video bg-gray-800 rounded-lg overflow-hidden mb-4">
                <video ref={videoRef} className="w-full h-full object-cover scale-x-[-1]" playsInline muted></video>
                <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full scale-x-[-1]"></canvas>
                {isCameraOn && (
                    <button
                        onClick={handleCameraSwitch}
                        className="absolute top-2 right-2 bg-black/50 text-white p-2 rounded-full hover:bg-black/75 transition"
                        aria-label="Switch Camera"
                    >
                        <SwitchCameraIcon className="w-6 h-6" />
                    </button>
                )}
                {!isCameraOn && (
                    <div className="absolute inset-0 flex flex-col justify-center items-center bg-black/60 p-4">
                        <CameraIcon className="w-16 h-16 text-gray-400 mb-4"/>
                        <p className="text-gray-300 text-center">{feedback}</p>
                    </div>
                )}
            </div>
            <div className="grid grid-cols-2 gap-4 text-center mb-4">
                <div className="bg-gray-800 p-4 rounded-lg">
                    <p className="text-sm text-gray-400 flex items-center justify-center"><RepeatIcon className="w-4 h-4 mr-2" />REPS</p>
                    <p className="text-4xl font-bold">{reps}</p>
                </div>
                <div className="bg-gray-800 p-4 rounded-lg">
                    <p className="text-sm text-gray-400 flex items-center justify-center"><TimerIcon className="w-4 h-4 mr-2" />TIME</p>
                    <p className="text-4xl font-bold">{formatTime(timer)}</p>
                </div>
            </div>
            <button
                onClick={handleStartStop}
                className={`w-full py-4 rounded-lg text-xl font-bold transition ${isCameraOn ? 'bg-red-500 hover:bg-red-600' : 'bg-teal-500 hover:bg-teal-600'}`}
            >
                {isCameraOn ? 'Stop' : 'Start'}
            </button>
        </div>
    );
};

export default PoseDetectScreen;