// Global state
let items = [];
let selectedLocation = '';

// Item management
function createChecklistItem(item) {
    checkItemCompletion(item);
    return `
        <div class="checklist-item ${item.isComplete ? 'complete' : 'incomplete'}">
            <h3>${item.name} (Weight: ${item.weight})</h3>
            <select onchange="updateScore(${item.id}, this.value)">
                <option value="0" ${item.score === 0 ? 'selected' : ''}>Select Score</option>
                <option value="1" ${item.score === 1 ? 'selected' : ''}>1 - Poor</option>
                <option value="2" ${item.score === 2 ? 'selected' : ''}>2 - Fair</option>
                <option value="3" ${item.score === 3 ? 'selected' : ''}>3 - Good</option>
                <option value="4" ${item.score === 4 ? 'selected' : ''}>4 - Very Good</option>
                <option value="5" ${item.score === 5 ? 'selected' : ''}>5 - Excellent</option>
            </select>
            <textarea 
                id="notes-${item.id}"
                placeholder="Add detailed notes here (minimum 10 characters)..."
                oninput="handleNotesInput(${item.id}, this.value)"
                onblur="handleNotesBlur(${item.id}, this.value)"
            >${item.notes || ''}</textarea>
            <input type="file" 
                   id="image-${item.id}" 
                   accept="image/*" 
                   style="display: none"
                   onchange="handleImageUpload(${item.id}, this)">
            <button class="button" onclick="document.getElementById('image-${item.id}').click()">
                Upload Photo
            </button>
            <div id="preview-${item.id}">
                ${item.image ? `<img src="${item.image}" class="photo-preview">` : ''}
            </div>
            ${createRequirementsList(item)}
        </div>
    `;
}

function createRequirementsList(item) {
    const hasScore = item.score > 0;
    const hasNotes = item.notes.trim().length >= 10;
    const hasImage = item.image !== null;
    
    return `
        <ul class="requirement-list">
            <li class="${hasScore ? 'complete' : ''}">Select a score</li>
            <li class="${hasNotes ? 'complete' : ''}">Add detailed notes (minimum 10 characters)</li>
            <li class="${hasImage ? 'complete' : ''}">Upload a photo</li>
        </ul>
    `;
}

function checkItemCompletion(item) {
    const hasScore = item.score > 0;
    const hasNotes = item.notes.trim().length >= 10;
    const hasImage = item.image !== null;
    item.isComplete = hasScore && hasNotes && hasImage;
    return item.isComplete;
}

// Event handlers
function handleNotesInput(id, value) {
    const item = items.find(i => i.id === id);
    if (item) {
        item.notes = value;
    }
}

function handleNotesBlur(id, value) {
    const item = items.find(i => i.id === id);
    if (item) {
        item.notes = value;
        saveToLocalStorage();
        renderChecklist();
        updateProgress();
    }
}

function handleImageUpload(id, input) {
    const file = input.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const item = items.find(i => i.id === id);
            if (item) {
                item.image = e.target.result;
                saveToLocalStorage();
                renderChecklist();
                updateProgress();
            }
        };
        reader.readAsDataURL(file);
    }
}

// UI updates
function updateScore(id, score) {
    const item = items.find(i => i.id === id);
    if (item) {
        item.score = parseInt(score);
        saveToLocalStorage();
        renderChecklist();
        updateProgress();
    }
}

function selectLocation(location) {
    selectedLocation = location;
    document.querySelectorAll('.location-button').forEach(button => {
        button.classList.remove('selected');
        if (button.textContent === location) {
            button.classList.add('selected');
        }
    });
    document.getElementById('checklist-section').style.display = 'block';
    renderChecklist();
}

function updateProgress() {
    const completedItems = items.filter(item => item.isComplete).length;
    const totalItems = items.length;
    const percentage = (completedItems / totalItems) * 100;
    
    document.getElementById('progress-fill').style.width = `${percentage}%`;
    document.getElementById('progress-text').textContent = 
        `${completedItems} of ${totalItems} items complete (${percentage.toFixed(1)}%)`;
    
    document.getElementById('pdf-button').style.display = 
        completedItems === totalItems ? 'block' : 'none';
    
    calculateTotalScore();
}

function calculateTotalScore() {
    if (items.length === 0) return 0;
    let totalWeight = 0;
    let weightedScore = 0;
    
    items.forEach(item => {
        totalWeight += item.weight;
        weightedScore += (item.score / 5) * item.weight;
    });
    
    const percentage = (weightedScore / totalWeight) * 100;
    document.getElementById('total-score').textContent = 
        `Total Score: ${percentage.toFixed(1)}% of Perfect Operation`;
    return percentage;
}

// Data persistence
function saveToLocalStorage() {
    localStorage.setItem('qcChecklist', JSON.stringify(items));
    localStorage.setItem('selectedLocation', selectedLocation);
}

function loadFromLocalStorage() {
    const savedItems = localStorage.getItem('qcChecklist');
    const savedLocation = localStorage.getItem('selectedLocation');
    
    if (savedItems) {
        const parsed = JSON.parse(savedItems);
        items = items.map(item => ({
            ...item,
            score: (parsed.find(p => p.id === item.id) || {}).score || 0,
            notes: (parsed.find(p => p.id === item.id) || {}).notes || '',
            image: (parsed.find(p => p.id === item.id) || {}).image || null,
        }));
    }
    if (savedLocation) {
        selectLocation(savedLocation);
    }
    updateProgress();
}

// Rendering
function renderChecklist() {
    const container = document.getElementById('checklist');
    container.innerHTML = items.map(item => createChecklistItem(item)).join('');
}

// Initialization
function startNewQC() {
    if (confirm('Start new QC? This will clear all current data.')) {
        localStorage.clear();
        selectedLocation = '';
        document.querySelectorAll('.location-button').forEach(button => {
            button.classList.remove('selected');
        });
        loadChecklist();
    }
}

async function loadChecklist() {
    try {
        const response = await fetch('checklist-items.json');
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        items = data.items.map(item => ({
            ...item,
            score: 0,
            notes: '',
            image: null,
            isComplete: false
        }));
        loadFromLocalStorage();
        renderChecklist();
        updateProgress();
    } catch (error) {
        console.error('Error:', error);
        alert('Error loading checklist: ' + error.message);
    }
}
