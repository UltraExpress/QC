class VideoHandler {
    constructor(itemId) {
        this.itemId = itemId;
        this.mediaRecorder = null;
        this.recordedChunks = [];
        this.timerInterval = null;
        this.recording = false;
        this.cloudinaryUrl = '';
        this.stream = null;
    }

    async startRecording() {
        try {
            // If we already have a stream, use it
            if (!this.stream) {
                this.stream = await this.getMediaStream();
            }
            
            const preview = document.querySelector(`#video-preview-${this.itemId}`);
            preview.srcObject = this.stream;
            preview.style.display = 'block';
            preview.setAttribute('playsinline', true);
            preview.setAttribute('webkit-playsinline', true);
            preview.muted = true;
            
            try {
                await preview.play();
            } catch (playError) {
                console.log('Preview play error:', playError);
                this.showStatus('Error starting preview. Please check camera permissions.', 'error');
                return;
            }

            // Try different MIME types for iOS compatibility
            const mimeTypes = [
                'video/webm;codecs=vp8,opus',
                'video/webm',
                'video/mp4',
                ''  // Empty string as fallback for iOS
            ];

            let options = {};
            for (const mimeType of mimeTypes) {
                if (mimeType && !MediaRecorder.isTypeSupported(mimeType)) continue;
                options = mimeType ? { mimeType } : {};
                break;
            }

            try {
                this.mediaRecorder = new MediaRecorder(this.stream, options);
            } catch (e) {
                console.error('MediaRecorder error:', e);
                this.showStatus('Recording not supported on this device', 'error');
                return;
            }

            this.recordedChunks = [];
            
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data && event.data.size > 0) {
                    this.recordedChunks.push(event.data);
                }
            };
            
            this.mediaRecorder.onstop = () => this.handleRecordingStop();
            
            // Start recording with smaller timeslice for more frequent chunks
            this.mediaRecorder.start(100);
            this.recording = true;
            this.startTimer();
            
            const recordBtn = document.querySelector(`#record-btn-${this.itemId}`);
            recordBtn.textContent = 'Stop Recording';
            
            // Auto-stop after 30 seconds
            setTimeout(() => {
                if (this.recording) {
                    this.stopRecording();
                }
            }, 30000);
            
        } catch (error) {
            console.error('Recording error:', error);
            this.showStatus('Error: ' + (error.message || 'Failed to start recording'), 'error');
        }
    }

    async getMediaStream() {
        // iOS-specific constraints
        const constraints = {
            audio: true,
            video: {
                facingMode: 'environment',
                width: { ideal: 1280, max: 1920 },
                height: { ideal: 720, max: 1080 }
            }
        };

        try {
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            return stream;
        } catch (error) {
            console.log('Failed with environment camera, trying user-facing camera');
            // Fallback to front camera
            constraints.video.facingMode = 'user';
            try {
                return await navigator.mediaDevices.getUserMedia(constraints);
            } catch (fallbackError) {
                console.error('Camera access failed:', fallbackError);
                this.showStatus('Camera access denied. Please check permissions.', 'error');
                throw fallbackError;
            }
        }
    }

    // ... rest of the methods remain the same ...
}

// Export the VideoHandler class
window.VideoHandler = VideoHandler;
