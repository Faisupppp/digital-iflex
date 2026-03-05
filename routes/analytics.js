const express = require('express');
const router = express.Router();
const { queryAll, getCount } = require('../db/database');

router.get('/summary', (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    res.json({
      totalViews: getCount('SELECT COUNT(*) FROM analytics'),
      todayViews: getCount("SELECT COUNT(*) FROM analytics WHERE DATE(created_at) = '" + today + "'"),
      uniqueVisitors: getCount('SELECT COUNT(DISTINCT ip) FROM analytics'),
      totalContacts: getCount('SELECT COUNT(*) FROM contacts'),
      unreadContacts: getCount('SELECT COUNT(*) FROM contacts WHERE is_read = 0'),
      totalWhatsapp: getCount('SELECT COUNT(*) FROM whatsapp_clicks'),
      totalPosts: getCount('SELECT COUNT(*) FROM blog_posts'),
      dailyViews: queryAll("SELECT DATE(created_at) as date, COUNT(*) as views, COUNT(DISTINCT ip) as unique_visitors FROM analytics WHERE created_at >= datetime('now','-7 days') GROUP BY DATE(created_at) ORDER BY date"),
      topPages: queryAll('SELECT page, COUNT(*) as views FROM analytics GROUP BY page ORDER BY views DESC LIMIT 10'),
      recentContacts: queryAll('SELECT * FROM contacts ORDER BY created_at DESC LIMIT 5')
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
