import React, { useState } from 'react';
import { Workout } from '../types';
import Spinner from './Spinner';

interface WorkoutPlayerProps {
    video: Workout;
    onClose: () => void;
}

const WorkoutPlayer: React.FC<WorkoutPlayerProps> = ({ video, onClose }) => {
    const [isLoading, setIsLoading] = useState(true);

    // Simple regex check for a valid YouTube ID format.
    // Since the video data is curated in videos.ts, this is a fallback.
    const isValidVideoId = video.videoId && /^[a-zA-Z0-9_-]{11}$/.test(video.videoId);

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={onClose} aria-modal="true" role="dialog">
            <div className="bg-gray-800 rounded-lg w-full max-w-2xl overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
                {isValidVideoId ? (
                    <>
                        <div className="relative" style={{ paddingTop: '56.25%' }}>
                            {isLoading && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <Spinner />
                                </div>
                            )}
                            <iframe
                                className="absolute top-0 left-0 w-full h-full"
                                src={`https://www.youtube.com/embed/${video.videoId}?autoplay=1&rel=0`}
                                title={video.title}
                                frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                                onLoad={() => setIsLoading(false)}
                            ></iframe>
                        </div>
                         <div className="p-4 flex justify-between items-start">
                            <h3 className="text-lg font-bold text-white">{video.title}</h3>
                            <button onClick={onClose} className="text-gray-400 hover:text-white text-3xl leading-none -mt-2" aria-label="Close video player">&times;</button>
                        </div>
                    </>
                ) : (
                    <div className="p-8 text-center">
                        <h3 className="text-lg font-bold text-white mb-2">Video Unavailable</h3>
                        <p className="text-gray-400">This workout video could not be loaded.</p>
                        <button onClick={onClose} className="mt-4 bg-teal-500 text-white font-semibold py-2 px-4 rounded-lg">Close</button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default WorkoutPlayer;
