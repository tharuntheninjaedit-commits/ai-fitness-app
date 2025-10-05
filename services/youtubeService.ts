import { Workout } from '../types';

// NOTE: In a production application, this key should be handled via a backend proxy
// to avoid exposing it on the client-side. For this project, we assume it's in the environment.
const YOUTUBE_API_KEY = 'AIzaSyCdsEMvtWLWDKk7Tqt4wMnatka92zA1doA';
const API_BASE = "https://www.googleapis.com/youtube/v3";
const CACHE_TTL = 12 * 60 * 60 * 1000; // 12 hours
const MAX_RESULTS = 15;

interface YouTubeSearchItem {
    id: { videoId: string };
    snippet: {
        title: string;
        thumbnails: { high: { url: string } };
    };
}

interface YouTubeVideoStatusItem {
    id: string;
    status: {
        uploadStatus: string;
        privacyStatus: string;
        embeddable: boolean;
    };
}

const validationCache = new Map<string, boolean>();

const validateVideoIds = async (videoIds: string[]): Promise<string[]> => {
    if (!YOUTUBE_API_KEY) {
        console.error("YouTube API Key is not configured.");
        return [];
    }

    const idsToValidate = videoIds.filter(id => !validationCache.has(id));
    if (idsToValidate.length > 0) {
        try {
            const response = await fetch(`${API_BASE}/videos?part=status&id=${idsToValidate.join(',')}&key=${YOUTUBE_API_KEY}`);
            if (!response.ok) throw new Error('Failed to validate videos');
            const data = await response.json();

            (data.items as YouTubeVideoStatusItem[]).forEach(item => {
                const isValid = item.status.privacyStatus === 'public' && item.status.embeddable && item.status.uploadStatus === 'processed';
                validationCache.set(item.id, isValid);
            });
            idsToValidate.forEach(id => {
                if (!validationCache.has(id)) {
                    validationCache.set(id, false);
                }
            });

        } catch (error) {
            console.error("Error validating video IDs:", error);
            idsToValidate.forEach(id => validationCache.set(id, false));
        }
    }
    
    return videoIds.filter(id => validationCache.get(id) === true);
};

export const fetchWorkoutVideos = async (category: string): Promise<Workout[]> => {
    if (!YOUTUBE_API_KEY) {
        console.error("YouTube API Key is not configured. Cannot fetch videos.");
        return [];
    }
    
    const cacheKey = `youtube_videos_${category.replace(/\s+/g, '_')}`;
    const cachedItem = localStorage.getItem(cacheKey);

    if (cachedItem) {
        try {
            const parsed = JSON.parse(cachedItem);
            if (Date.now() - parsed.timestamp < CACHE_TTL) {
                return parsed.data;
            }
        } catch (e) {
            console.error("Failed to parse cache", e);
            localStorage.removeItem(cacheKey);
        }
    }
    
    const query = `${category} workout exercise`;

    try {
        const searchResponse = await fetch(`${API_BASE}/search?part=snippet&type=video&maxResults=${MAX_RESULTS}&q=${encodeURIComponent(query)}&key=${YOUTUBE_API_KEY}&videoEmbeddable=true`);
        if (!searchResponse.ok) {
            throw new Error(`YouTube API error: ${searchResponse.statusText}`);
        }
        const searchData = await searchResponse.json();
        
        const videoItems: YouTubeSearchItem[] = searchData.items || [];
        const videoIds = videoItems.map(item => item.id.videoId).filter(id => id);

        const validVideoIds = await validateVideoIds(videoIds);
        
        const seenTitles = new Set<string>();
        const uniqueVideos: Workout[] = [];
        
        videoItems.forEach(item => {
            if (validVideoIds.includes(item.id.videoId)) {
                const simplifiedTitle = item.snippet.title.toLowerCase().split('|')[0].trim();
                if (!seenTitles.has(simplifiedTitle)) {
                    seenTitles.add(simplifiedTitle);
                    uniqueVideos.push({
                        id: item.id.videoId,
                        videoId: item.id.videoId,
                        title: item.snippet.title,
                        thumbnail: item.snippet.thumbnails.high.url,
                        category: category,
                    });
                }
            }
        });

        const finalVideos = uniqueVideos.slice(0, 10);
        localStorage.setItem(cacheKey, JSON.stringify({
            timestamp: Date.now(),
            data: finalVideos
        }));

        return finalVideos;

    } catch (error) {
        console.error(`Failed to fetch videos for category "${category}":`, error);
        return [];
    }
};