// Constants for Cloudinary configuration
const CLOUD_NAME = 'drnkghxvx';
const API_KEY = '735847793412469';

class VideoHandler {
    constructor(itemId) {
        this.itemId = itemId;
        this.mediaRecorder = null;
        this.recordedChunks = [];
        this.timerInterval = null;
        this.recording = false;
        this.cloudinaryUrl = '';
    }

    getSupportedMimeType() {
        const types = [
            'video/webm;codecs=vp8,opus',
            'video/webm',
            'video/mp4',
            'video/quicktime',
            'video/webm;codecs=vp9',
            'video/webm;codecs=h264',
            'video/x-matroska;codecs=avc1'
        ];
        
        for (const type of types) {
            if (MediaRecorder.isTypeSupported(type)) {
                return type;
            }
        }
        
        return '';
    }

    async startRecording() {
        try {
            const stream = await this.getMediaStream();
            
            const preview = document.querySelector(`#video-preview-${this.itemId}`);
            preview.srcObject = stream;
            preview.style.display = 'block';
            preview.setAttribute('playsinline', '');
            preview.setAttribute('webkit-playsinline', '');
            
            try {
                await preview.play();
            } catch (playError) {
                console.log('Preview play error:', playError);
            }

            const mimeType = this.getSupportedMimeType();
            const options = mimeType ? { mimeType } : {};
            
            this.mediaRecorder = new MediaRecorder(stream, options);
            this.recordedChunks = [];
            
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.recordedChunks.push(event.data);
                }
            };
            
            this.mediaRecorder.onstop = () => this.handleRecordingStop();
            
            this.mediaRecorder.start(1000); // Record in 1-second chunks
            this.recording = true;
            this.startTimer();
            
            const recordBtn = document.querySelector(`#record-btn-${this.itemId}`);
            recordBtn.textContent = 'Stop Recording';
            
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
        const constraints = {
            audio: true,
            video: {
                facingMode: { ideal: 'environment' },
                width: { ideal: 1280 }, // Reduced from 1920 for better compatibility
                height: { ideal: 720 }  // Reduced from 1080 for better compatibility
            }
        };

        try {
            return await navigator.mediaDevices.getUserMedia(constraints);
        } catch (error) {
            console.log('Failed with environment camera, trying basic constraints');
            return await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: true
            });
        }
    }

    stopRecording() {
        if (this.mediaRecorder?.state === 'recording') {
            this.mediaRecorder.stop();
            this.recording = false;
            clearInterval(this.timerInterval);
            
            const timer = document.querySelector(`#timer-${this.itemId}`);
            timer.style.display = 'none';
            
            const recordBtn = document.querySelector(`#record-btn-${this.itemId}`);
            recordBtn.textContent = 'Start Recording';
            
            const preview = document.querySelector(`#video-preview-${this.itemId}`);
            const tracks = preview.srcObject?.getTracks() || [];
            tracks.forEach(track => track.stop());
            preview.srcObject = null;
            preview.style.display = 'none';
        }
    }

    // ... rest of the code remains the same ...
    startTimer() {
        const timer = document.querySelector(`#timer-${this.itemId}`);
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

        const blob = new Blob(this.recordedChunks);
        try {
            this.showStatus('Uploading to Cloudinary...', '');
            await this.uploadToCloudinary(blob);
        } catch (error) {
            this.showStatus('Upload failed: ' + error.message, 'error');
        }
    }

    async uploadToCloudinary(blob) {
        const formData = new FormData();
        formData.append('file', blob);
        formData.append('upload_preset', 'testvideo');
        formData.append('api_key', API_KEY);
        
        try {
            const response = await fetch(
                `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/upload`,
                {
                    method: 'POST',
                    body: formData
                }
            );
            
            const data = await response.json();
            
            if (data.secure_url) {
                this.cloudinaryUrl = data.secure_url;
                const playback = document.querySelector(`#video-playback-${this.itemId}`);
                playback.src = this.cloudinaryUrl;
                playback.setAttribute('playsinline', '');
                playback.setAttribute('webkit-playsinline', '');
                playback.style.display = 'block';
                
                const itemIndex = checklistItems.findIndex(item => item.id === this.itemId);
                if (itemIndex !== -1) {
                    checklistItems[itemIndex].video = this.cloudinaryUrl;
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
        status.textContent = message;
        status.className = `status ${type}`;
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
