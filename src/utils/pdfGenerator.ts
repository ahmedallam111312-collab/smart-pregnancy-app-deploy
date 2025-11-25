import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export const generateMedicalReportPDF = async (elementId: string, fileName: string) => {
    const element = document.getElementById(elementId);
    if (!element) {
        console.error(`Element with id ${elementId} not found`);
        return;
    }

    try {
        // 1. Capture the element as a canvas
        const canvas = await html2canvas(element, {
            scale: 2, // Higher scale for better resolution
            useCORS: true, // Allow loading cross-origin images
            logging: false,
            backgroundColor: '#ffffff', // Ensure white background
            windowWidth: element.scrollWidth,
            windowHeight: element.scrollHeight
        });

        // 2. Convert canvas to image data
        const imgData = canvas.toDataURL('image/png');

        // 3. Initialize PDF (A4 size)
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        // 4. Calculate dimensions to fit A4
        const imgWidth = 210; // A4 width in mm
        const pageHeight = 297; // A4 height in mm
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        // 5. Add image to PDF
        // If content is longer than one page, simple scaling (for now we assume 1 page summary)
        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);

        // 6. Save
        pdf.save(`${fileName}.pdf`);

    } catch (error) {
        console.error('PDF Generation failed:', error);
        throw new Error('Failed to generate PDF report');
    }
};