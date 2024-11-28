document.addEventListener('DOMContentLoaded', async () => {
    const form = document.getElementById('qc-form');
    const checklistContainer = document.getElementById('checklist-container');
    const generatePdfButton = document.getElementById('generate-pdf');

    // Fetch JSON data
    const response = await fetch('https://ultraexpress.github.io/QC/riverside-checklist.json');
    const data = await response.json();

    // Build form dynamically
    data.items.forEach((item, index) => {
        const formItem = document.createElement('div');
        formItem.classList.add('form-item');
        formItem.setAttribute('data-weight', item.weight);

        formItem.innerHTML = `
            <label for="item-${index}">${item.name}</label>
            <div class="rating-buttons">
                ${[1, 2, 3, 4, 5].map(
                    (value) => `<label><input type="radio" name="rating-${index}" value="${value}" required> ${value}</label>`
                ).join('')}
            </div>
            <textarea placeholder="Enter notes" name="notes-${index}" required></textarea>
            <input type="file" name="image-${index}" accept="image/*" required>
            <span class="error" id="error-${index}"></span>
        `;

        checklistContainer.appendChild(formItem);
    });

    // Validate and generate PDF
    generatePdfButton.addEventListener('click', () => {
        const items = document.querySelectorAll('.form-item');
        let totalScore = 0;
        const pdfData = [];

        for (const [index, item] of items.entries()) {
            const weight = parseFloat(item.dataset.weight);
            const rating = item.querySelector(`input[name="rating-${index}"]:checked`);
            const notes = item.querySelector(`textarea`).value;
            const image = item.querySelector(`input[name="image-${index}"]`).files[0];

            if (!rating || !notes || !image) {
                document.getElementById(`error-${index}`).textContent = 'All fields are required.';
                return;
            } else {
                document.getElementById(`error-${index}`).textContent = '';
            }

            const weightedScore = weight * parseFloat(rating.value);
            totalScore += weightedScore;

            pdfData.push({
                name: data.items[index].name,
                notes,
                rating: rating.value,
                weightedScore,
                image,
            });
        }

        generatePDF(pdfData, totalScore);
    });

    const generatePDF = (pdfData, totalScore) => {
        const pdfDoc = PDFLib.PDFDocument.create();
        pdfData.forEach(async (item, index) => {
            const page = pdfDoc.addPage([600, 900]);
            page.drawText(`Item: ${item.name}`, { x: 50, y: 850 });
            page.drawText(`Notes: ${item.notes}`, { x: 50, y: 800 });
            page.drawText(`Rating: ${item.rating}`, { x: 50, y: 750 });
            page.drawText(`Weighted Score: ${item.weightedScore}`, { x: 50, y: 700 });

            if (item.rating < 4) {
                page.drawText(`⚠️ Rating below acceptable threshold`, { x: 50, y: 650, color: [1, 0, 0] });
            }

            const imageBytes = await item.image.arrayBuffer();
            const imageEmbed = await pdfDoc.embedPng(imageBytes);
            page.drawImage(imageEmbed, {
                x: 50,
                y: 400,
                width: 200,
                height: 200,
            });
        });

        pdfDoc.save().then((pdfBytes) => {
            const blob = new Blob([pdfBytes], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `RIVERSIDE-QC-${Date.now()}.pdf`;
            a.click();
        });
    };
});
