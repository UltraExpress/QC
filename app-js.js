function handleImageUpload(id, input) {
    const file = input.files[0];
    if (!file) {
        return;
    }

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

function createFileInput(id) {
    // Remove any existing file input with this ID
    const existingInput = document.getElementById(`file-input-${id}`);
    if (existingInput) {
        existingInput.remove();
    }

    // Create a new file input
    const input = document.createElement('input');
    input.type = 'file';
    input.id = `file-input-${id}`;
    input.accept = 'image/*';
    input.capture = 'environment';
    input.style.display = 'none';
    input.onchange = (e) => handleImageUpload(id, e.target);
    
    document.body.appendChild(input);
    return input;
}

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
            <button class="button" onclick="triggerImageUpload(${item.id})">
                Upload Photo
            </button>
            <div id="preview-${item.id}">
                ${item.image ? `<img src="${item.image}" class="photo-preview">` : ''}
            </div>
            ${createRequirementsList(item)}
        </div>
    `;
}

// Add this new function
function triggerImageUpload(id) {
    const input = createFileInput(id);
    input.click();
}

// Add these utility functions
function isMobile() {
    return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}

// Modify the original loadChecklist function to clean up old file inputs
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
        
        // Clean up any existing file inputs
        document.querySelectorAll('input[type="file"]').forEach(input => input.remove());
        
        loadFromLocalStorage();
        renderChecklist();
        updateProgress();
    } catch (error) {
        console.error('Error:', error);
        alert('Error loading checklist: ' + error.message);
    }
}
