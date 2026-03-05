const express = require('express');
const router = express.Router();
const { queryAll, queryOne, runSql, getCount } = require('../db/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'digital_iflex_secret';

function requireAuth(req, res, next) {
    const token = req.cookies.admin_token;
    if (!token) return res.redirect('/admin/login');
    try { req.admin = jwt.verify(token, JWT_SECRET); next(); }
    catch (err) { res.clearCookie('admin_token'); res.redirect('/admin/login'); }
}

router.get('/', requireAuth, (req, res) => res.redirect('/admin/dashboard'));

router.get('/login', (req, res) => {
    const token = req.cookies.admin_token;
    if (token) { try { jwt.verify(token, JWT_SECRET); return res.redirect('/admin/dashboard'); } catch (e) { } }
    res.render('admin/login', { error: null });
});

router.post('/login', (req, res) => {
    const { username, password } = req.body;
    const user = queryOne('SELECT * FROM admin_users WHERE username = ?', [username]);
    if (!user || !bcrypt.compareSync(password, user.password)) {
        return res.render('admin/login', { error: 'Invalid username or password' });
    }
    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '24h' });
    res.cookie('admin_token', token, { httpOnly: true, maxAge: 24 * 60 * 60 * 1000 });
    res.redirect('/admin/dashboard');
});

router.get('/logout', (req, res) => { res.clearCookie('admin_token'); res.redirect('/admin/login'); });

router.get('/dashboard', requireAuth, (req, res) => {
    const today = new Date().toISOString().split('T')[0];
    const stats = {
        totalViews: getCount('SELECT COUNT(*) FROM analytics'),
        todayViews: getCount("SELECT COUNT(*) FROM analytics WHERE DATE(created_at) = '" + today + "'"),
        uniqueVisitors: getCount('SELECT COUNT(DISTINCT ip) FROM analytics'),
        totalContacts: getCount('SELECT COUNT(*) FROM contacts'),
        unreadContacts: getCount('SELECT COUNT(*) FROM contacts WHERE is_read = 0'),
        totalWhatsapp: getCount('SELECT COUNT(*) FROM whatsapp_clicks'),
        totalPosts: getCount('SELECT COUNT(*) FROM blog_posts')
    };
    const recentContacts = queryAll('SELECT * FROM contacts ORDER BY created_at DESC LIMIT 5');
    const dailyViews = queryAll("SELECT DATE(created_at) as date, COUNT(*) as views FROM analytics WHERE created_at >= datetime('now','-7 days') GROUP BY DATE(created_at) ORDER BY date");
    res.render('admin/dashboard', { stats, recentContacts, dailyViews, admin: req.admin });
});

router.get('/contacts', requireAuth, (req, res) => {
    res.render('admin/contacts', { contacts: queryAll('SELECT * FROM contacts ORDER BY created_at DESC'), admin: req.admin });
});

router.post('/contacts/:id/read', requireAuth, (req, res) => {
    runSql('UPDATE contacts SET is_read = 1 WHERE id = ?', [parseInt(req.params.id)]);
    res.redirect('/admin/contacts');
});

router.post('/contacts/:id/delete', requireAuth, (req, res) => {
    runSql('DELETE FROM contacts WHERE id = ?', [parseInt(req.params.id)]);
    res.redirect('/admin/contacts');
});

router.get('/blog', requireAuth, (req, res) => {
    res.render('admin/blog', { posts: queryAll('SELECT * FROM blog_posts ORDER BY created_at DESC'), admin: req.admin, editing: null });
});

router.get('/blog/edit/:id', requireAuth, (req, res) => {
    res.render('admin/blog', { posts: queryAll('SELECT * FROM blog_posts ORDER BY created_at DESC'), admin: req.admin, editing: queryOne('SELECT * FROM blog_posts WHERE id = ?', [parseInt(req.params.id)]) });
});

router.post('/blog/create', requireAuth, (req, res) => {
    const { title, excerpt, content, category } = req.body;
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    runSql('INSERT INTO blog_posts (title, slug, excerpt, content, category) VALUES (?, ?, ?, ?, ?)', [title, slug, excerpt, content, category || 'Digital Marketing']);
    res.redirect('/admin/blog');
});

router.post('/blog/edit/:id', requireAuth, (req, res) => {
    const { title, excerpt, content, category, is_published } = req.body;
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    runSql('UPDATE blog_posts SET title=?, slug=?, excerpt=?, content=?, category=?, is_published=?, updated_at=datetime("now") WHERE id=?', [title, slug, excerpt, content, category, is_published ? 1 : 0, parseInt(req.params.id)]);
    res.redirect('/admin/blog');
});

router.post('/blog/delete/:id', requireAuth, (req, res) => {
    runSql('DELETE FROM blog_posts WHERE id = ?', [parseInt(req.params.id)]);
    res.redirect('/admin/blog');
});

router.get('/analytics', requireAuth, (req, res) => {
    res.render('admin/analytics', {
        dailyViews: queryAll("SELECT DATE(created_at) as date, COUNT(*) as views, COUNT(DISTINCT ip) as unique_visitors FROM analytics WHERE created_at >= datetime('now','-30 days') GROUP BY DATE(created_at) ORDER BY date"),
        topPages: queryAll('SELECT page, COUNT(*) as views FROM analytics GROUP BY page ORDER BY views DESC LIMIT 10'),
        topReferrers: queryAll("SELECT referrer, COUNT(*) as count FROM analytics WHERE referrer != 'direct' GROUP BY referrer ORDER BY count DESC LIMIT 10"),
        whatsappClicks: queryAll("SELECT DATE(created_at) as date, COUNT(*) as clicks FROM whatsapp_clicks WHERE created_at >= datetime('now','-30 days') GROUP BY DATE(created_at) ORDER BY date"),
        totalViews: getCount('SELECT COUNT(*) FROM analytics'),
        uniqueVisitors: getCount('SELECT COUNT(DISTINCT ip) FROM analytics'),
        totalWhatsapp: getCount('SELECT COUNT(*) FROM whatsapp_clicks'),
        admin: req.admin
    });
});

module.exports = router;
