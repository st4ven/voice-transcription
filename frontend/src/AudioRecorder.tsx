import { useState, useRef, useEffect } from "react";
import { API_BASE_URL } from "./config";
import FileDrop from "./components/UploadBox";
import { TbMicrophone } from "react-icons/tb";
import { HiPlay, HiStop, HiPause } from "react-icons/hi2";


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

    // check if the browser supports the mimeType
    useEffect(() => {
        if (!MediaRecorder.isTypeSupported(mimeType)) {
            alert("Unsupported format");
        }
    }, []);

    // request permission to access the microphone
    const requestPermission = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            setStream(stream);
            setPermission(true);
        } catch (error) {
            console.error(error);
        }
    };

    // start recording
    const startRecording = async () => {
        if (!stream) return;

        setRecordingStatus('recording');

        // create new media recorder instance using the stream
        const media = new MediaRecorder(stream, { mimeType });

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
            // If no permission yet, request it
            if (!permission) {
                await requestPermission();
            }
            // Start recording
            await startRecording();
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

    return (
        <>
            <div className="max-w-2xl mx-auto p-6 space-y-5 bg-white rounded-xl shadow-md">

                {/* Header Section */}
                <div className="text-center space-y-1">
                    <h1 className="text-4xl text-[#343A40] font-bold mb-5">Voice Transcription</h1>
                    <p className="text-sm text-[#495057]">
                        Record or upload audio to generate a transcript instantly
                    </p>
                </div>

                {/* Recording Controls */}
                <div className="flex flex-wrap gap-3 justify-center p-3 rounded-lg">
                    {recordingStatus === 'idle' && (
                        <button
                            onClick={handleStartRecording}
                            className="px-8 py-6 text-white text-lg bg-blue-400 rounded-2xl hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200 font-medium flex items-center gap-2"
                        >
                            <TbMicrophone size={24} />
                            Start Recording
                        </button>
                    )}

                    {recordingStatus === 'recording' && (
                        <>
                            <button
                                onClick={stopRecording}
                                className="px-8 py-6 text-white text-lg bg-red-600 rounded-2xl hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors duration-200 font-medium flex items-center gap-2"
                            >
                                <HiStop size={20} />
                                Stop Recording
                            </button>
                            <button
                                onClick={pauseRecording}
                                className="px-8 py-6 text-white text-lg bg-yellow-600 rounded-2xl hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 transition-colors duration-200 font-medium flex items-center gap-2"
                            >
                                <HiPause size={20} />
                                Pause Recording
                            </button>
                        </>
                    )}

                    {recordingStatus === 'paused' && (
                        <button
                            onClick={resumeRecording}
                            className="px-8 py-6 text-white text-lg bg-green-600 rounded-2xl hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors duration-200 font-medium flex items-center gap-2"
                        >
                            <HiPlay size={20} />
                            Resume Recording
                        </button>
                    )}
                </div>

                <div className="flex items-center gap-4">
                    <hr className="flex-1 text-[#CED4DA]" />
                    <span className="text-[#6C757D] text-sm">OR</span>
                    <hr className="flex-1 text-[#CED4DA]" />
                </div>

                {/* File Drop Area */}
                <div className="border-2 border-dashed border-blue-400 rounded-lg p-8 hover:border-blue-500 transition-colors duration-200">
                    <FileDrop onFileSelect={handleFileSelect} />
                </div>

                {/* Audio Player and Download */}
                {audio && (
                    <div className="p-4 bg-gray-50 rounded-lg space-y-3">
                        <audio controls src={audio} className="w-full" />
                        <a
                            href={audio}
                            download="audio.webm"
                            className="inline-flex items-center gap-2 px-4 py-2 text-sm text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors duration-200"
                        >
                            Download Audio
                        </a>
                    </div>
                )}

                {/* Loading State */}
                {loading && (
                    <div className="flex items-center justify-center gap-2 p-4 text-gray-600">
                        <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
                        <span>Transcribing...</span>
                    </div>
                )}

                {/* Transcript */}
                {transcript && (
                    <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                        <h3 className="text-lg font-semibold text-gray-800">Transcript:</h3>
                        <p className="text-gray-700 leading-relaxed">{transcript}</p>
                    </div>
                )}
            </div>
        </>
    )
}

export default AudioRecorder;