function handleImageUpload(id, input) {
    // Reset file input value first
    const file = input.files[0];
    
    if (!file) {
        alert('No file selected. Please try selecting the image again.');
        return;
    }

    try {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            const item = items.find(i => i.id === id);
            if (item) {
                item.image = e.target.result;
                saveToLocalStorage();
                renderChecklist();
                updateProgress();
                
                // Reset the file input after successful upload
                input.value = '';
            }
        };

        reader.onerror = function(error) {
            console.error('Error reading file:', error);
            alert('Error uploading image. Please try again.');
            input.value = '';
        };

        reader.readAsDataURL(file);

    } catch (error) {
        console.error('Error handling file:', error);
        alert('Error handling image. Please try again. If the problem persists, try taking a new photo.');
        input.value = '';
    }
}

// Modified createChecklistItem function to include better file input handling
function createChecklistItem(item) {
    checkItemCompletion(item);
    const inputId = `image-${item.id}`;
    
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
                   id="${inputId}" 
                   accept="image/*" 
                   capture="environment"
                   style="display: none"
                   onchange="handleImageUpload(${item.id}, this)">
            <button class="button" onclick="document.getElementById('${inputId}').value='';document.getElementById('${inputId}').click()">
                Upload Photo
            </button>
            <div id="preview-${item.id}">
                ${item.image ? `<img src="${item.image}" class="photo-preview">` : ''}
            </div>
            ${createRequirementsList(item)}
        </div>
    `;
}
