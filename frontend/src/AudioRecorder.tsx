import { useState, useRef, useEffect } from "react";
import { API_BASE_URL } from "./config";
import FileDrop from "./components/FileDrop";
import { TbMicrophone, TbPlayerRecord, TbWaveSawTool } from "react-icons/tb";
import { HiPlay, HiStop, HiPause } from "react-icons/hi2";
import { FaCheck } from "react-icons/fa6";
import { MdContentCopy, MdDownload } from "react-icons/md";


const mimeType = 'audio/webm';

const AudioRecorder = () => {
    const [permission, setPermission] = useState<boolean>(false);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const mediaRecorder = useRef<MediaRecorder | null>(null);
    const [recordingStatus, setRecordingStatus] = useState<'idle' | 'recording' | 'paused'>('idle');
    const audioChunksRef = useRef<Blob[]>([]);
    const [audio, setAudio] = useState<string | null>(null);

    const [transcript, setTranscript] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(false);

    const [copySuccess, setCopySuccess] = useState<boolean>(false);
    const [audioDuration, setAudioDuration] = useState<number>(0);
    const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
    const [recordingTime, setRecordingTime] = useState<number>(0);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Get audio duration when loaded
    useEffect(() => {
        if (audio && audioRef.current) {
            audioRef.current.onloadedmetadata = () => {
                setAudioDuration(audioRef.current?.duration || 0);
            };
        }
    }, [audio]);

    // Timer for recording duration
    useEffect(() => {
        if (recordingStatus === 'recording') {
            recordingTimerRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);
        } else if (recordingStatus === 'paused' || recordingStatus === 'idle') {
            if (recordingTimerRef.current) {
                clearInterval(recordingTimerRef.current);
            }
        }

        return () => {
            if (recordingTimerRef.current) {
                clearInterval(recordingTimerRef.current);
            }
        };
    }, [recordingStatus]);

    // check if the browser supports the mimeType
    useEffect(() => {
        if (!MediaRecorder.isTypeSupported(mimeType)) {
            alert("Unsupported format");
        }
    }, []);

    // request permission to access the microphone
    const requestPermission = async (): Promise<MediaStream | null> => {
        try {
            const newStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            setStream(newStream);
            setPermission(true);
            return newStream;
        } catch (error) {
            console.error(error);
            return null;
        }
    };

    // start recording
    const startRecording = async (activeStream?: MediaStream) => {
        const currentStream = activeStream || stream;

        if (!currentStream) {
            alert("No audio stream available");
            return;
        }

        setRecordingStatus('recording');

        // create new media recorder instance using the stream
        const media = new MediaRecorder(currentStream, { mimeType });

        // set the media recorder instance to the media recorder ref
        mediaRecorder.current = media;

        // invoke the start method to start recording
        mediaRecorder.current.start()

        audioChunksRef.current = [];

        // set the ondataavailable event handler
        mediaRecorder.current.ondataavailable = (event) => {
            if (typeof event.data === "undefined") return;
            if (event.data.size === 0) return;
            audioChunksRef.current.push(event.data);
        }

    };

    const handleStartRecording = async () => {
        try {
            let activeStream = stream;

            // If no permission yet, request it
            if (!permission || !stream) {
                activeStream = await requestPermission();
            }

            if (!activeStream) return;

            // Start recording
            await startRecording(activeStream);
        } catch (error) {
            console.error("Error starting recording:", error);
        }
    };

    // stop recording
    const stopRecording = () => {
        if (!mediaRecorder.current) return;

        // stop the media recorder
        mediaRecorder.current.stop();

        // set the recording status to idle
        setRecordingStatus('idle');

        // reset recording time
        setRecordingTime(0);

        // revoke the audio URL
        if (audio) URL.revokeObjectURL(audio);

        // set the onstop event handler
        mediaRecorder.current.onstop = async () => {
            // create a blob from the audio chunks
            const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });

            // create a URL for the audio blob
            const audioUrl = URL.createObjectURL(audioBlob);

            // set the audio URL
            setAudio(audioUrl);

            // send the audio blob to the backend
            await sendAudioToBackend(audioBlob);

            // reset the audio chunks
            audioChunksRef.current = [];
        }
    };

    // pause recording
    const pauseRecording = () => {
        if (recordingStatus !== 'recording') return;
        if (!mediaRecorder.current) return;
        mediaRecorder.current.pause();
        setRecordingStatus('paused');
    };

    // resume recording
    const resumeRecording = () => {
        if (recordingStatus !== 'paused') return;
        if (!mediaRecorder.current) return;
        mediaRecorder.current.resume();
        setRecordingStatus('recording');
    };

    // send audio to backend
    const sendAudioToBackend = async (blob: Blob) => {
        // create form data and append the audio blob
        const formData = new FormData();
        formData.append("file", blob, "recording.webm");

        try {
            // set loading to true while the request is being made
            setLoading(true);

            // send the audio blob to the backend
            const response = await fetch(`${API_BASE_URL}/api/transcribe`, {
                method: "POST",
                body: formData,
            });

            // parse the response as JSON and set the transcript state
            const data = await response.json();
            setTranscript(data.text);
        } catch (error) {
            console.error("Upload failed:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleFileSelect = async (file: File) => {
        // get the file extension
        const extension = file.name.split('.').pop()?.toLowerCase();

        // allowed extensions
        const allowedExtensions = ['webm', 'wav', 'mp3', 'm4a'];

        // if no extension or the extension is not allowed, alert the user and return
        if (!extension || !allowedExtensions.includes(extension)) {
            alert("Unsupported file type");
            return;
        }

        // if the file size is greater than 10MB, alert the user and return
        if (file.size > 10 * 1024 * 1024) {
            alert("File too large (10MB max)");
            return;
        }

        // revoke the audio URL
        if (audio) URL.revokeObjectURL(audio);

        // create a URL for the selected file
        const audioUrl = URL.createObjectURL(file);

        // set the audio URL
        setAudio(audioUrl);

        // send the selected file to the backend
        await sendAudioToBackend(file);
    }

    // Copy transcript to clipboard
    const copyToClipboard = async () => {
        if (transcript) {
            await navigator.clipboard.writeText(transcript);
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 2000);
        }
    };

    // Format time in MM:SS
    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <>
            <div className="max-w-3xl mx-auto p-6 space-y-5 bg-white backdrop-blur-sm rounded-2xl shadow-xl">

                {/* Header Section */}
                <div className="relative bg-linear-to-r from-blue-600 to-purple-600 p-8 text-white overflow-hidden rounded-2xl">
                    <div className="absolute inset-0 opacity-10">
                        <TbWaveSawTool className="w-full h-full" />
                    </div>
                    <div className="relative text-center space-y-2">
                        <h1 className="text-4xl font-bold mb-2">Voice Transcription</h1>
                        <p className="text-lg">Record your voice or upload an audio file to get an instant transcription</p>
                    </div>
                </div>

                {/* Recording Status and Timer */}
                <div className="p-3 space-y-6">
                    <div className="p-4">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                {recordingStatus === "recording" && (
                                    <>
                                        <div className="relative">
                                            <div className="w-4 h-4 bg-red-500 rounded-full animate-ping absolute" />
                                            <div className="w-4 h-4 bg-red-500 rounded-full relative" />
                                        </div>
                                        <span className="font-mono text-2xl font-bold text-gray-700">
                                            {formatTime(recordingTime)}
                                        </span>
                                    </>
                                )}

                                {recordingStatus === "paused" && (
                                    <>
                                        <div className="w-4 h-4 bg-yellow-500 rounded-full" />
                                        <span className="font-mono text-2xl font-bold text-gray-700">
                                            {formatTime(recordingTime)}
                                        </span>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Recording Controls */}
                        <div className="flex flex-wrap gap-4 justify-center">
                            {recordingStatus === 'idle' && (
                                <button
                                    onClick={handleStartRecording}
                                    className="relative px-10 py-6 bg-linear-to-r from-blue-500 to-blue-600 text-white rounded-full hover:from-blue-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center gap-3"
                                >
                                    <TbMicrophone size={24} />
                                    Start Recording
                                </button>
                            )}

                            {recordingStatus === 'recording' && (
                                <>
                                    <button
                                        onClick={stopRecording}
                                        className="relative px-10 py-6 bg-linear-to-r from-red-500 to-red-600 text-white rounded-full hover:from-red-600 hover:to-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center gap-3"
                                    >
                                        <HiStop size={20} />
                                        Stop Recording
                                    </button>
                                    <button
                                        onClick={pauseRecording}
                                        className="relative px-8 py-6 bg-linear-to-r from-yellow-500 to-yellow-600 text-white rounded-full hover:from-yellow-600 hover:to-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center gap-2"
                                    >
                                        <HiPause size={20} />
                                        Pause Recording
                                    </button>
                                </>
                            )}

                            {recordingStatus === 'paused' && (
                                <button
                                    onClick={resumeRecording}
                                    className="relative px-8 py-6 bg-linear-to-r from-green-500 to-green-600 text-white rounded-full hover:from-green-600 hover:to-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center gap-2"
                                >
                                    <HiPlay size={20} />
                                    Resume Recording
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <hr className="flex-1 text-[#CED4DA]" />
                    <span className="text-[#6C757D] text-sm">OR</span>
                    <hr className="flex-1 text-[#CED4DA]" />
                </div>

                {/* File Drop Area */}
                <div>
                    <FileDrop onFileSelect={handleFileSelect} loading={loading} />
                </div>

                {audio && (
                    <div className="bg-linear-to-r from-gray-50 to-gray-100 rounded-xl p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                <TbPlayerRecord className="text-blue-500" />
                                Recording ({formatTime(Math.floor(audioDuration))})
                            </h3>
                            <a
                                href={audio}
                                download="audio.webm"
                                className="flex items-center gap-2 px-4 py-2 text-sm text-blue-600 bg-white rounded-lg hover:bg-blue-50 transition-colors duration-200 shadow-sm"
                            >
                                <MdDownload size={16} />
                                Download
                            </a>
                        </div>
                        <audio
                            ref={audioRef}
                            controls
                            src={audio}
                            className="w-full rounded-lg"
                        />
                    </div>
                )}

                {/* Loading State */}
                {loading && (
                    <div className="bg-blue-50 rounded-xl p-8 text-center">
                        <div className="inline-flex items-center gap-3">
                            <div className="w-6 h-6 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                            <span className="text-blue-700 font-medium">Transcribing audio, please wait...</span>
                        </div>
                    </div>
                )}

                {/* Transcript */}
                {transcript && (
                    <div className="bg-linear-to-r from-gray-50 to-white rounded-xl border border-gray-200 overflow-hidden">
                        <div className="flex items-center justify-between p-4 bg-gray-50 border-b border-gray-200">
                            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                                <TbWaveSawTool size={20} className="text-blue-600" />
                                Transcript
                            </h3>
                            <button
                                onClick={copyToClipboard}
                                className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 bg-white rounded-lg hover:bg-gray-100 transition-colors duration-200">
                                {copySuccess ? (
                                    <>
                                        <FaCheck size={14} className="text-green-500" />
                                        <span className="text-green-500">Copied!</span>
                                    </>
                                ) : (
                                    <>
                                        <MdContentCopy size={14} className="text-gray-500" />
                                        <span className="text-gray-500">Copy</span>
                                    </>
                                )}
                            </button>
                        </div>

                        <div className="p-4">
                            <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                                {transcript}
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </>
    )
}

export default AudioRecorder;