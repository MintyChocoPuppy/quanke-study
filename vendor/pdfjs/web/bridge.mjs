import { PDFViewerApplication } from './viewer.mjs';
window.oralPDFApplication = PDFViewerApplication;
window.dispatchEvent(new Event('oralpdfready'));
