const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads', 'consultation-pdfs');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

async function generateConsultationPDF(caseData) {
  ensureDir(UPLOADS_DIR);

  const fileName = `consultation-${caseData._id}-${Date.now()}.pdf`;
  const filePath = path.join(UPLOADS_DIR, fileName);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    const blue = '#2563eb';
    const darkGray = '#1f2937';
    const gray = '#6b7280';

    // Header bar
    doc.rect(0, 0, doc.page.width, 80).fill(blue);
    doc.fillColor('#ffffff').fontSize(22).font('Helvetica-Bold')
      .text('Aurora Health', 50, 20);
    doc.fontSize(11).font('Helvetica')
      .text('Consultation Summary Report', 50, 48);

    doc.moveDown(3);
    const y = 100;

    // Patient & Doctor info
    doc.fillColor(darkGray).fontSize(11).font('Helvetica-Bold');
    const patientName = caseData.patient_id?.user_id?.name || 'Patient';
    const doctorName = caseData.doctor_id?.user_id?.name || 'Doctor';
    const caseDate = new Date(caseData.createdAt || Date.now()).toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });

    doc.text(`Patient: ${patientName}`, 50, y);
    doc.font('Helvetica').fillColor(gray).text(`Doctor: Dr. ${doctorName}`, 50);
    doc.text(`Date: ${caseDate}`, 50);
    doc.text(`Case: ${caseData.title || 'General Consultation'}`, 50);
    doc.moveDown(1);

    // Divider
    doc.strokeColor('#e5e7eb').lineWidth(1)
      .moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).stroke();
    doc.moveDown(0.5);

    // Diagnosis
    if (caseData.diagnosis) {
      doc.fillColor(blue).fontSize(13).font('Helvetica-Bold').text('Diagnosis');
      doc.fillColor(darkGray).fontSize(11).font('Helvetica').text(caseData.diagnosis);
      if (caseData.symptoms?.length) {
        doc.fillColor(gray).fontSize(10).text(`Symptoms: ${caseData.symptoms.join(', ')}`);
      }
      doc.moveDown(1);
    }

    // Lab Results
    if (caseData.lab_tests?.length) {
      doc.fillColor(blue).fontSize(13).font('Helvetica-Bold').text('Lab Results');
      doc.moveDown(0.3);
      for (const test of caseData.lab_tests) {
        doc.fillColor(darkGray).fontSize(10).font('Helvetica-Bold').text(`${test.name}`, { continued: true });
        doc.font('Helvetica').fillColor(gray).text(` — ${test.status}${test.results ? ': ' + test.results : ''}`);
      }
      doc.moveDown(1);
    }

    // Prescriptions
    if (caseData.prescriptions?.length) {
      doc.fillColor(blue).fontSize(13).font('Helvetica-Bold').text('Prescribed Medications');
      doc.moveDown(0.3);

      const tableTop = doc.y;
      const col = [50, 200, 310, 400];
      doc.fillColor(gray).fontSize(9).font('Helvetica-Bold');
      doc.text('Medicine', col[0], tableTop);
      doc.text('Dosage', col[1], tableTop);
      doc.text('Frequency', col[2], tableTop);
      doc.text('Duration', col[3], tableTop);

      doc.strokeColor('#e5e7eb').lineWidth(0.5)
        .moveTo(50, tableTop + 14).lineTo(doc.page.width - 50, tableTop + 14).stroke();

      let rowY = tableTop + 20;
      doc.font('Helvetica').fontSize(9).fillColor(darkGray);
      for (const p of caseData.prescriptions) {
        if (rowY > 720) {
          doc.addPage();
          rowY = 50;
        }
        doc.text(p.medication_name || '', col[0], rowY, { width: 145 });
        doc.text(p.dosage || '', col[1], rowY, { width: 105 });
        doc.text(p.frequency || '', col[2], rowY, { width: 85 });
        doc.text(p.duration || '', col[3], rowY, { width: 80 });
        rowY += 16;
      }
      doc.y = rowY;
      doc.moveDown(1);
    }

    // Consultation Document
    if (caseData.consultation_document) {
      doc.fillColor(blue).fontSize(13).font('Helvetica-Bold').text('Consultation Notes');
      doc.moveDown(0.3);
      doc.fillColor(darkGray).fontSize(10).font('Helvetica')
        .text(caseData.consultation_document, { align: 'left', lineGap: 3 });
      doc.moveDown(1);
    }

    // Billing
    if (caseData.billing?.total > 0) {
      doc.fillColor(blue).fontSize(13).font('Helvetica-Bold').text('Billing Summary');
      doc.moveDown(0.3);
      for (const item of (caseData.billing.items || [])) {
        doc.fillColor(darkGray).fontSize(10).font('Helvetica')
          .text(`${item.description}: Rs. ${(item.amount || 0).toFixed(2)}`);
      }
      doc.font('Helvetica-Bold')
        .text(`Total: Rs. ${(caseData.billing.total || 0).toFixed(2)}`);
      doc.moveDown(1);
    }

    // Footer
    doc.moveDown(2);
    doc.strokeColor('#e5e7eb').lineWidth(1)
      .moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).stroke();
    doc.moveDown(0.5);
    doc.fillColor(gray).fontSize(8).font('Helvetica')
      .text('This is a computer-generated document from Aurora Health System.', 50, doc.y, { align: 'center' });

    doc.end();

    stream.on('finish', () => resolve(filePath));
    stream.on('error', reject);
  });
}

module.exports = { generateConsultationPDF };
