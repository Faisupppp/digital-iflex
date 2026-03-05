const { runSql } = require('../db/database');

module.exports = function analyticsMiddleware(req, res, next) {
    if (req.method === 'GET' && !req.path.startsWith('/api/') && !req.path.startsWith('/admin') && !req.path.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|map)$/i)) {
        try {
            const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';
            const userAgent = req.headers['user-agent'] || 'unknown';
            const referrer = req.headers['referer'] || req.headers['referrer'] || 'direct';
            runSql('INSERT INTO analytics (page, ip, user_agent, referrer) VALUES (?, ?, ?, ?)', [req.path || '/', ip, userAgent, referrer]);
        } catch (err) { }
    }
    next();
};
