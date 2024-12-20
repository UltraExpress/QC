// qc-data-transformer.js transforms data from QC app front end to match data to sheets requirments for backend DB
class QCDataTransformer {
    constructor() {
        this.LOCATION = 'RIVERSIDE';  // Hardcoded as per spec
    }

    generatePartId(numericId) {
        const randomChars = Math.random().toString(36).substring(2, 7);
        return `${numericId}_${randomChars}`;
    }

    mapPriority(score) {
        if (score <= 2) return 'Critical';
        if (score === 3) return 'High';
        return 'Medium';
    }

formatTimestamp() {
    const now = new Date();
    const month = now.getMonth() + 1;
    const day = now.getDate();
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes());
    const seconds = String(now.getSeconds());

    return `${month}/${day}/${year} ${hours}:${minutes}:${seconds}`;
}






    

    // Transform QC data to sheet format
    transformForSheet(qcData) {
        const transformedItems = qcData.map(item => ({
            timestamp: this.formatTimestamp(),
            location: this.LOCATION,
            partId: this.generatePartId(item.id),
            partName: item.name,
            status: 'Needs Work',
            priority: this.mapPriority(item.score),
            notes: item.notes,
            score: item.score,
            image: item.image || null,
            videoUrl: item.videoUrl || null
        }));

        return transformedItems;
    }
}
