const express = require('express');
const router = express.Router();
const { queryAll, runSql } = require('../db/database');
const nodemailer = require('nodemailer');

// POST /api/contact
router.post('/', async (req, res) => {
    try {
        const { name, email, phone, country_code, service, message } = req.body;
        if (!name || !email) return res.status(400).json({ error: 'Name and email are required' });

        runSql('INSERT INTO contacts (name, email, phone, country_code, service, message) VALUES (?, ?, ?, ?, ?, ?)',
            [name, email, phone || '', country_code || '+91', service || '', message || '']);

        console.log('New contact from:', name, email);

        sendEmailNotification({ name, email, phone: (country_code || '+91') + ' ' + (phone || ''), service, message }).catch(() => { });

        res.json({ success: true, message: 'Thank you! Your message has been sent successfully.' });
    } catch (err) {
        console.error('Contact error:', err.message);
        res.status(500).json({ error: 'Failed to submit form.' });
    }
});

router.get('/', (req, res) => {
    res.json(queryAll('SELECT * FROM contacts ORDER BY created_at DESC'));
});

async function sendEmailNotification(data) {
    if (!process.env.EMAIL_USER || process.env.EMAIL_USER === 'your-email@gmail.com') throw new Error('Not configured');
    const transporter = nodemailer.createTransport({ host: process.env.EMAIL_HOST || 'smtp.gmail.com', port: parseInt(process.env.EMAIL_PORT) || 587, secure: false, auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS } });
    await transporter.sendMail({ from: '"Digital iflex" <' + process.env.EMAIL_USER + '>', to: process.env.EMAIL_TO || process.env.EMAIL_USER, subject: 'New Contact: ' + data.name, html: '<h2>New Contact</h2><p>Name: ' + data.name + '</p><p>Email: ' + data.email + '</p><p>Phone: ' + data.phone + '</p><p>Service: ' + (data.service || 'N/A') + '</p><p>Message: ' + (data.message || 'N/A') + '</p>' });
}

module.exports = router;
