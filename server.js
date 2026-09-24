import express from 'express';
import compression from 'compression';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

// Enable Gzip/Deflate compression for fast transfer of HTML, CSS, JS, SVG
app.use(compression({
  threshold: 1024, // only compress responses above 1KB
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  }
}));

// Configure static files with HTTP browser cache headers and ETag
app.use(express.static(__dirname, {
  extensions: ['html'],
  index: 'index.html',
  etag: true,
  lastModified: true,
  setHeaders: (res, filePath) => {
    // 1 year cache for static assets (images, videos, fonts, minified css/js, pdf)
    if (/\.(webp|jpg|jpeg|png|svg|mp4|webm|woff2|woff|ttf|eot|pdf)$/i.test(filePath)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    } else if (/\.(css|js)$/i.test(filePath)) {
      res.setHeader('Cache-Control', 'no-cache, must-revalidate');
    } else if (/\.html$/i.test(filePath)) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
  }
}));

// Direct PDF download route
app.get('/roteiros-depoimentos.pdf', (req, res) => {
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'inline; filename="roteiros-depoimentos-domedoaoplay.pdf"');
  res.sendFile(path.join(__dirname, 'assets', 'roteiros-depoimentos.pdf'));
});

// Fallback to index.html with appropriate cache headers
app.get('*', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, HOST, () => {
  console.log(`Server listening on http://${HOST}:${PORT}`);
});
