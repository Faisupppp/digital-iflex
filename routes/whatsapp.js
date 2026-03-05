const express = require('express');
const router = express.Router();
const { runSql } = require('../db/database');

router.post('/click', (req, res) => {
    try {
        const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';
        const userAgent = req.headers['user-agent'] || 'unknown';
        runSql('INSERT INTO whatsapp_clicks (page, ip, user_agent) VALUES (?, ?, ?)', [req.body.page || '/', ip, userAgent]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

module.exports = router;
