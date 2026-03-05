const express = require('express');
const router = express.Router();
const { queryAll, queryOne } = require('../db/database');

router.get('/', (req, res) => {
    res.json(queryAll('SELECT id, title, slug, excerpt, category, author, created_at FROM blog_posts WHERE is_published = 1 ORDER BY created_at DESC'));
});

router.get('/:slug', (req, res) => {
    const post = queryOne('SELECT * FROM blog_posts WHERE slug = ? AND is_published = 1', [req.params.slug]);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    res.json(post);
});

module.exports = router;
