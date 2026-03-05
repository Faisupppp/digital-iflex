require('dotenv').config();
const express = require('express');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const { initDB } = require('./db/database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Rate limiting
const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100, message: { error: 'Too many requests' } });
app.use('/api/', apiLimiter);

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Start server after DB is ready
async function start() {
    await initDB();

    // Analytics middleware (after DB init)
    app.use(require('./middleware/analytics'));

    // API Routes
    app.use('/api/contact', require('./routes/contact'));
    app.use('/api/blog', require('./routes/blog'));
    app.use('/api/whatsapp', require('./routes/whatsapp'));
    app.use('/api/analytics', require('./routes/analytics'));

    // Admin Routes
    app.use('/admin', require('./routes/admin'));

    // Catch-all
    app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    });

    // Error handler
    app.use((err, req, res, next) => {
        console.error('Error:', err.message);
        res.status(500).json({ error: 'Internal server error' });
    });

    app.listen(PORT, () => {
        console.log('');
        console.log('  ================================');
        console.log('  Digital iflex Server Running!');
        console.log('  ================================');
        console.log('  Website:  http://localhost:' + PORT);
        console.log('  Admin:    http://localhost:' + PORT + '/admin');
        console.log('  --------------------------------');
        console.log('  Admin User: ' + (process.env.ADMIN_USER || 'admin'));
        console.log('  Admin Pass: ' + (process.env.ADMIN_PASS || 'admin123'));
        console.log('  ================================');
        console.log('');
    });
}

start().catch(err => {
    console.error('Failed to start server:', err);
    process.exit(1);
});
