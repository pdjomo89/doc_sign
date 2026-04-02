require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const fs = require('fs');
const db = require('./db');
const { sendSigningRequest, sendCompletionNotice } = require('./email');

const app = express();

app.use(cors());
app.use(express.json({ limit: '25mb' }));

// Middleware to initialize async DB on Vercel
if (db._isAsync) {
  app.use(async (req, res, next) => {
    try {
      await db.initDb();
      next();
    } catch (err) {
      res.status(500).json({ error: 'Database initialization failed' });
    }
  });
}

const isVercel = !!process.env.VERCEL;

// File storage: disk for local, memory for Vercel
const storage = isVercel
  ? multer.memoryStorage()
  : multer.diskStorage({
      destination: path.join(__dirname, 'uploads'),
      filename: (req, file, cb) => {
        cb(null, `${uuidv4()}-${file.originalname}`);
      },
    });

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Only PDF files are allowed'));
  },
  limits: { fileSize: 20 * 1024 * 1024 },
});

if (!isVercel) {
  app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
}

// Serve uploaded PDFs from database on Vercel
app.get('/uploads/:filename', (req, res) => {
  if (!isVercel) return res.status(404).end();

  // Find the document by filename pattern
  const docs = db.prepare('SELECT file_data, filename FROM documents WHERE original_path LIKE ?').all(`%${req.params.filename}%`);
  if (docs.length > 0 && docs[0].file_data) {
    const buffer = Buffer.from(docs[0].file_data, 'base64');
    res.set('Content-Type', 'application/pdf');
    res.set('Content-Disposition', `inline; filename="${docs[0].filename}"`);
    res.send(buffer);
  } else {
    res.status(404).json({ error: 'File not found' });
  }
});

// Upload document and create signing request
app.post('/api/documents', upload.single('file'), async (req, res) => {
  try {
    const { title, ownerName, ownerEmail, signers } = req.body;
    const parsedSigners = JSON.parse(signers);

    if (!req.file) return res.status(400).json({ error: 'PDF file is required' });
    if (!title || !ownerName || !ownerEmail) return res.status(400).json({ error: 'Missing required fields' });
    if (!parsedSigners.length) return res.status(400).json({ error: 'At least one signer is required' });

    const docId = uuidv4();
    const fileId = `${uuidv4()}-${req.file.originalname}`;

    if (isVercel) {
      // Store file as base64 in database
      const fileData = req.file.buffer.toString('base64');
      db.prepare(`
        INSERT INTO documents (id, title, filename, original_path, file_data, owner_name, owner_email, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
      `).run(docId, title, req.file.originalname, fileId, fileData, ownerName, ownerEmail);
    } else {
      db.prepare(`
        INSERT INTO documents (id, title, filename, original_path, owner_name, owner_email, status)
        VALUES (?, ?, ?, ?, ?, ?, 'pending')
      `).run(docId, title, req.file.originalname, req.file.path, ownerName, ownerEmail);
    }

    const insertSigner = db.prepare(`
      INSERT INTO signers (id, document_id, name, email, token, status, sign_order)
      VALUES (?, ?, ?, ?, ?, 'pending', ?)
    `);

    const document = db.prepare('SELECT * FROM documents WHERE id = ?').get(docId);
    const createdSigners = [];

    for (let i = 0; i < parsedSigners.length; i++) {
      const s = parsedSigners[i];
      const signerId = uuidv4();
      const token = uuidv4();
      insertSigner.run(signerId, docId, s.name, s.email, token, i);
      const signer = { id: signerId, name: s.name, email: s.email, token };
      createdSigners.push(signer);
    }

    // Send emails without blocking the response
    const emailErrors = [];
    await Promise.all(createdSigners.map(async (signer) => {
      try {
        await sendSigningRequest(signer, document);
      } catch (emailErr) {
        console.error('Failed to send email to', signer.email, emailErr.message);
        emailErrors.push(signer.email);
      }
    }));

    const response = { id: docId, title, signers: createdSigners };
    if (emailErrors.length > 0) {
      response.emailWarning = `Failed to send email to: ${emailErrors.join(', ')}. Signing links are still available.`;
    }
    res.json(response);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Get all documents
app.get('/api/documents', (req, res) => {
  const docs = db.prepare('SELECT id, title, filename, original_path, signed_path, owner_name, owner_email, status, created_at, completed_at FROM documents ORDER BY created_at DESC').all();
  const result = docs.map(doc => {
    const signers = db.prepare('SELECT id, name, email, status, signed_at, sign_order FROM signers WHERE document_id = ? ORDER BY sign_order').all(doc.id);
    return { ...doc, signers };
  });
  res.json(result);
});

// Get single document
app.get('/api/documents/:id', (req, res) => {
  const doc = db.prepare('SELECT id, title, filename, original_path, signed_path, owner_name, owner_email, status, created_at, completed_at FROM documents WHERE id = ?').get(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Document not found' });

  const signers = db.prepare('SELECT id, name, email, token, status, signed_at, sign_order FROM signers WHERE document_id = ? ORDER BY sign_order').all(doc.id);
  res.json({ ...doc, signers });
});

// Get signing info by token
app.get('/api/sign/:token', (req, res) => {
  const signer = db.prepare('SELECT * FROM signers WHERE token = ?').get(req.params.token);
  if (!signer) return res.status(404).json({ error: 'Invalid signing link' });

  const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(signer.document_id);
  const pdfUrl = isVercel
    ? `/uploads/${doc.original_path}`
    : `/uploads/${path.basename(doc.original_path)}`;

  res.json({
    document: { id: doc.id, title: doc.title, filename: doc.filename, owner_name: doc.owner_name, status: doc.status },
    signer: { id: signer.id, name: signer.name, email: signer.email, status: signer.status },
    pdfUrl,
  });
});

// Submit signature
app.post('/api/sign/:token', async (req, res) => {
  try {
    const { signatureData } = req.body;
    const signer = db.prepare('SELECT * FROM signers WHERE token = ?').get(req.params.token);
    if (!signer) return res.status(404).json({ error: 'Invalid signing link' });
    if (signer.status === 'signed') return res.status(400).json({ error: 'Already signed' });

    // Update signer record
    db.prepare(`
      UPDATE signers SET status = 'signed', signature_data = ?, signed_at = CURRENT_TIMESTAMP
      WHERE token = ?
    `).run(signatureData, req.params.token);

    // Check if all signers have signed
    const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(signer.document_id);
    const allSigners = db.prepare('SELECT * FROM signers WHERE document_id = ?').all(signer.document_id);
    const allSigned = allSigners.every(s => s.status === 'signed' || s.id === signer.id);

    if (allSigned) {
      // Load the original PDF
      let pdfBytes;
      if (isVercel && doc.file_data) {
        pdfBytes = Buffer.from(doc.file_data, 'base64');
      } else {
        pdfBytes = fs.readFileSync(doc.original_path);
      }

      const pdfDoc = await PDFDocument.load(pdfBytes);
      const pages = pdfDoc.getPages();
      const lastPage = pages[pages.length - 1];
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

      // Add signature block to last page
      let yPos = 80 + (allSigners.length * 60);

      lastPage.drawText('Signatures:', {
        x: 50,
        y: yPos + 20,
        size: 14,
        font,
        color: rgb(0.1, 0.1, 0.1),
      });

      for (const s of allSigners) {
        const sigData = s.id === signer.id ? signatureData : s.signature_data;

        // Embed the signature image
        try {
          const base64Data = sigData.replace(/^data:image\/\w+;base64,/, '');
          const sigImage = await pdfDoc.embedPng(Buffer.from(base64Data, 'base64'));
          const sigDims = sigImage.scale(0.3);

          lastPage.drawImage(sigImage, {
            x: 50,
            y: yPos - 40,
            width: Math.min(sigDims.width, 150),
            height: Math.min(sigDims.height, 40),
          });
        } catch {
          // If image embedding fails, just add text
          lastPage.drawText(`[Signed]`, {
            x: 50,
            y: yPos - 20,
            size: 10,
            font,
            color: rgb(0.4, 0.2, 0.8),
          });
        }

        lastPage.drawText(`${s.name} (${s.email}) - ${new Date().toLocaleDateString()}`, {
          x: 210,
          y: yPos - 25,
          size: 9,
          font,
          color: rgb(0.3, 0.3, 0.3),
        });

        yPos -= 60;
      }

      const signedPdfBytes = await pdfDoc.save();

      if (isVercel) {
        // Store signed PDF as base64 in database
        const signedData = Buffer.from(signedPdfBytes).toString('base64');
        db.prepare(`
          UPDATE documents SET status = 'completed', signed_data = ?, completed_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(signedData, doc.id);
      } else {
        const signedPath = path.join(__dirname, 'uploads', `signed-${path.basename(doc.original_path)}`);
        fs.writeFileSync(signedPath, signedPdfBytes);
        db.prepare(`
          UPDATE documents SET status = 'completed', signed_path = ?, completed_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(signedPath, doc.id);
      }

      // Send completion emails to all parties
      const updatedSigners = db.prepare('SELECT * FROM signers WHERE document_id = ?').all(doc.id);
      const recipients = [
        { name: doc.owner_name, email: doc.owner_email },
        ...updatedSigners.map(s => ({ name: s.name, email: s.email })),
      ];

      for (const recipient of recipients) {
        try {
          await sendCompletionNotice(recipient, doc, updatedSigners);
        } catch (emailErr) {
          console.error('Failed to send completion email to', recipient.email, emailErr.message);
        }
      }
    }

    res.json({ success: true, allSigned });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Download signed document
app.get('/api/documents/:id/download', (req, res) => {
  const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Document not found' });

  if (isVercel) {
    const data = doc.signed_data || doc.file_data;
    if (!data) return res.status(404).json({ error: 'File not found' });
    const buffer = Buffer.from(data, 'base64');
    res.set('Content-Type', 'application/pdf');
    res.set('Content-Disposition', `attachment; filename="${doc.title}${doc.signed_data ? '-signed' : ''}.pdf"`);
    res.send(buffer);
  } else {
    const filePath = doc.signed_path || doc.original_path;
    res.download(filePath, `${doc.title}${doc.signed_path ? '-signed' : ''}.pdf`);
  }
});

// Only start listening in non-Vercel (local dev)
if (!isVercel) {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`DocSign server running on http://localhost:${PORT}`);
  });
}

module.exports = app;
