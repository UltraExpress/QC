class VideoHandler {
    constructor(itemId) {
        this.itemId = itemId;
        this.mediaRecorder = null;
        this.recordedChunks = [];
        this.timerInterval = null;
        this.recording = false;
        this.cloudinaryUrl = '';
        this.stream = null;
        // Hardcode the config since it's constant
        this.cloudinaryConfig = {
            cloudName: 'drnkghxvx',
            uploadPreset: 'testvideo'
        };
    }

    async startRecording() {
        try {
            // Always get a new stream when starting recording
            this.stream = await this.getMediaStream();
            
            const preview = document.querySelector(`#video-preview-${this.itemId}`);
            if (!preview) {
                console.error('Preview element not found');
                return;
            }

            // Set up preview
            preview.srcObject = this.stream;
            preview.style.display = 'block';
            preview.setAttribute('playsinline', 'true');
            preview.setAttribute('webkit-playsinline', 'true');
            preview.muted = true;

            // Ensure preview starts playing
            try {
                await preview.play();
            } catch (playError) {
                console.error('Preview play error:', playError);
                this.showStatus('Error starting camera preview. Please check permissions.', 'error');
                return;
            }

            // Set up MediaRecorder with fallback options
            let options = {};
            const mimeTypes = [
                'video/webm;codecs=vp8,opus',
                'video/webm',
                'video/mp4',
                ''
            ];

            for (const mimeType of mimeTypes) {
                if (!mimeType || MediaRecorder.isTypeSupported(mimeType)) {
                    options = mimeType ? { mimeType } : {};
                    break;
                }
            }

            try {
                this.mediaRecorder = new MediaRecorder(this.stream, options);
            } catch (e) {
                console.error('MediaRecorder creation failed:', e);
                this.showStatus('Recording not supported on this device', 'error');
                return;
            }

            // Set up recording handlers
            this.recordedChunks = [];
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data && event.data.size > 0) {
                    this.recordedChunks.push(event.data);
                }
            };
            
            this.mediaRecorder.onstop = () => this.handleRecordingStop();
            
            // Start recording
            this.mediaRecorder.start(100); // Smaller timeslice for more frequent chunks
            this.recording = true;
            this.startTimer();
            
            const recordBtn = document.querySelector(`#record-btn-${this.itemId}`);
            if (recordBtn) {
                recordBtn.textContent = 'Stop Recording';
            }
            
            // Auto-stop after 30 seconds
            setTimeout(() => {
                if (this.recording) {
                    this.stopRecording();
                }
            }, 30000);
            
        } catch (error) {
            console.error('Recording error:', error);
            this.showStatus('Error: ' + (error.message || 'Failed to start recording'), 'error');
            this.cleanupStream();
        }
    }

    async getMediaStream() {
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
            constraints.video.facingMode = 'user';
            try {
                return await navigator.mediaDevices.getUserMedia({
                    audio: true,
                    video: { facingMode: 'user' }
                });
            } catch (fallbackError) {
                console.error('Camera access failed:', fallbackError);
                this.showStatus('Camera access denied. Please check permissions.', 'error');
                throw fallbackError;
            }
        }
    }

    stopRecording() {
        if (this.mediaRecorder?.state === 'recording') {
            this.mediaRecorder.stop();
            this.recording = false;
            clearInterval(this.timerInterval);
            
            const timer = document.querySelector(`#timer-${this.itemId}`);
            if (timer) {
                timer.style.display = 'none';
            }
            
            const recordBtn = document.querySelector(`#record-btn-${this.itemId}`);
            if (recordBtn) {
                recordBtn.textContent = 'Start Recording';
            }
            
            this.cleanupStream();
            
            const preview = document.querySelector(`#video-preview-${this.itemId}`);
            if (preview) {
                preview.srcObject = null;
                preview.style.display = 'none';
            }
        }
    }

    cleanupStream() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
    }

    startTimer() {
        const timer = document.querySelector(`#timer-${this.itemId}`);
        if (!timer) return;

        timer.style.display = 'block';
        let seconds = 0;
        
        this.timerInterval = setInterval(() => {
            seconds++;
            const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
            const secs = (seconds % 60).toString().padStart(2, '0');
            timer.textContent = `${mins}:${secs}`;
            
            if (seconds >= 30) {
                this.stopRecording();
            }
        }, 1000);
    }

    async handleRecordingStop() {
        if (this.recordedChunks.length === 0) {
            this.showStatus('No video data recorded', 'error');
            return;
        }

        const blob = new Blob(this.recordedChunks, {
            type: this.recordedChunks[0].type || 'video/webm'
        });
        
        try {
            this.showStatus('Uploading to Cloudinary...', '');
            await this.uploadToCloudinary(blob);
        } catch (error) {
            console.error('Upload error:', error);
            this.showStatus('Upload failed: ' + error.message, 'error');
        }
    }

    async uploadToCloudinary(blob) {
        const formData = new FormData();
        formData.append('file', blob);
        formData.append('upload_preset', this.cloudinaryConfig.uploadPreset);
        
        try {
            const response = await fetch(
                `https://api.cloudinary.com/v1_1/${this.cloudinaryConfig.cloudName}/video/upload`,
                {
                    method: 'POST',
                    body: formData
                }
            );
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error?.message || `Upload failed with status: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.secure_url) {
                this.cloudinaryUrl = data.secure_url;
                const playback = document.querySelector(`#video-playback-${this.itemId}`);
                if (playback) {
                    playback.src = this.cloudinaryUrl;
                    playback.style.display = 'block';
                }
                
                const itemIndex = checklistItems.findIndex(item => item.id === this.itemId);
                if (itemIndex !== -1) {
                   
                    checklistItems[itemIndex].videoUrl = this.cloudinaryUrl;
                    saveToLocalStorage();
                    checkComplete(itemIndex);
                    checkAllItemsComplete();
                }
                
                this.showStatus('Upload successful! Video ready to play.', 'success');
            } else {
                throw new Error(data.error?.message || 'Upload failed');
            }
        } catch (error) {
            throw new Error(`Upload failed: ${error.message}`);
        }
    }

    showStatus(message, type) {
        const status = document.querySelector(`#video-status-${this.itemId}`);
        if (status) {
            status.textContent = message;
            status.className = `status ${type}`;
        }
    }

    async toggleRecording() {
        if (!this.recording) {
            await this.startRecording();
        } else {
            this.stopRecording();
        }
    }
}

// Export the VideoHandler class
window.VideoHandler = VideoHandler;
