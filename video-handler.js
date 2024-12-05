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

    async startRecording() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: {
                    facingMode: { exact: "environment" },
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                }, 
                audio: true 
            });
            
            const preview = document.querySelector(`#video-preview-${this.itemId}`);
            preview.srcObject = stream;
            preview.style.display = 'block';
            
            this.mediaRecorder = new MediaRecorder(stream);
            this.recordedChunks = [];
            
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.recordedChunks.push(event.data);
                }
            };
            
            this.mediaRecorder.onstop = () => this.handleRecordingStop();
            
            this.mediaRecorder.start();
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
            if (error.name === 'OverconstrainedError') {
                // Fallback to any available camera
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({ 
                        video: true, 
                        audio: true 
                    });
                    const preview = document.querySelector(`#video-preview-${this.itemId}`);
                    preview.srcObject = stream;
                    preview.style.display = 'block';
                    
                    this.mediaRecorder = new MediaRecorder(stream);
                    this.recordedChunks = [];
                    
                    this.mediaRecorder.ondataavailable = (event) => {
                        if (event.data.size > 0) {
                            this.recordedChunks.push(event.data);
                        }
                    };
                    
                    this.mediaRecorder.onstop = () => this.handleRecordingStop();
                    
                    this.mediaRecorder.start();
                    this.recording = true;
                    this.startTimer();
                    
                    const recordBtn = document.querySelector(`#record-btn-${this.itemId}`);
                    recordBtn.textContent = 'Stop Recording';
                    
                    setTimeout(() => {
                        if (this.recording) {
                            this.stopRecording();
                        }
                    }, 30000);
                } catch (fallbackError) {
                    this.showStatus('Error: No camera available', 'error');
                }
            } else {
                this.showStatus('Error starting recording: ' + error.message, 'error');
            }
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
            
            const tracks = document.querySelector(`#video-preview-${this.itemId}`).srcObject.getTracks();
            tracks.forEach(track => track.stop());
            
            document.querySelector(`#video-preview-${this.itemId}`).style.display = 'none';
        }
    }

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
        const blob = new Blob(this.recordedChunks, { type: 'video/webm' });
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
                playback.style.display = 'block';
                
                // Store the video URL in the checklistItems
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