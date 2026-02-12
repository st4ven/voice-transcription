import { useState, useRef, useEffect } from "react";

const mimeType = 'audio/webm';

const AudioRecorder = () => {
    const [permission, setPermission] = useState<boolean>(false);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const mediaRecorder = useRef<MediaRecorder | null>(null);
    const [recordingStatus, setRecordingStatus] = useState<'idle' | 'recording' | 'paused'>('idle');
    const audioChunksRef = useRef<Blob[]>([]);
    const [audio, setAudio] = useState<string | null>(null);

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

    // stop recording
    const stopRecording = () => {
        if (!mediaRecorder.current) return;

        // stop the media recorder
        mediaRecorder.current.stop();

        // set the recording status to idle
        setRecordingStatus('idle');

        // revoke the audio URL
        if (audio) URL.revokeObjectURL(audio);

        mediaRecorder.current.onstop = () => {
            // create a blob from the audio chunks
            const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });

            // create a URL for the audio blob
            const audioUrl = URL.createObjectURL(audioBlob);

            // set the audio URL
            setAudio(audioUrl);

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

    return (
        <>
            <div>
                {!permission ? (
                    <button onClick={requestPermission}>Request Permission</button>
                ) : null}
                {permission && recordingStatus === 'idle' ? (
                    <button onClick={startRecording}>Record Audio</button>
                ) : null}
                {permission && recordingStatus === 'recording' ? (
                    <button onClick={stopRecording}>Stop Recording</button>
                ) : null}
                {permission && recordingStatus === 'paused' ? (
                    <button onClick={resumeRecording}>Resume Recording</button>
                ) : null}
                {permission && recordingStatus === 'recording' ? (
                    <button onClick={pauseRecording}>Pause Recording</button>
                ) : null}
                {audio && (
                    <>
                        <audio controls src={audio} />
                        <a href={audio} download="audio.webm">Download Audio</a>
                    </>
                )}
            </div>
        </>
    )
}

export default AudioRecorder;