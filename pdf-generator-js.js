function generatePDF() {
    if (!selectedLocation) {
        alert('Please select a location first');
        return;
    }

    const incompleteItems = items.filter(item => !item.isComplete);
    if (incompleteItems.length > 0) {
        alert('Please complete all items before generating the PDF report.');
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.text('Quality Control Report', 20, 20);
    doc.setFontSize(16);
    doc.text(`Location: ${selectedLocation}`, 20, 30);
    doc.setFontSize(12);
    
    // Summary information
    let yPos = 45;
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, yPos);
    yPos += 10;
    doc.text(`Overall Score: ${calculateTotalScore().toFixed(1)}%`, 20, yPos);
    yPos += 20;

    // Individual items
    items.forEach(item => {
        if (yPos > 250) {
            doc.addPage();
            yPos = 20;
        }

        // Item header
        doc.setFontSize(14);
        doc.text(`${item.name}`, 20, yPos);
        yPos += 10;
        
        // Item details
        doc.setFontSize(12);
        doc.text(`Score: ${item.score}/5 | Weight: ${item.weight}`, 30, yPos);
        yPos += 10;
        
        // Notes
        if (item.notes) {
            const splitNotes = doc.splitTextToSize(item.notes, 150);
            doc.text(splitNotes, 30, yPos);
            yPos += splitNotes.length * 7;
        }

        // Images
        if (item