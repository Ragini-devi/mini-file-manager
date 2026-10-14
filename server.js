//load nodes http module so we can create a server without express

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PUBLIC_DIR = path.join(__dirname, 'public');
const DATA_DIR = path.join(__dirname, 'data');

// Create data folder if it does not exist
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

const server = http.createServer((req, res) => {

    // Home page
    if (req.method === 'GET' && req.url === '/') {
        return serveFile(res, 'index.html', 'text/html');
    }

    // CSS file
    if (req.method === 'GET' && req.url === '/style.css') {
        return serveFile(res, 'style.css', 'text/css');
    }

    // JavaScript file
    if (req.method === 'GET' && req.url === '/app.js') {
        return serveFile(
            res,
            'app.js',
            'application/javascript'
        );
    }

    // Get all files
    if (req.method === 'GET' && req.url === '/api/files') {
        return fs.readdir(DATA_DIR, (error, files) => {
            if (error) {
                return sendJSON(res, 500, {
                    error: 'Could not read files'
                });
            }

            sendJSON(res, 200, { files });
        });
    }

    // Create a new file
    if (req.method === 'POST' && req.url === '/api/files') {
        return readBody(req, (error, body) => {
            if (error) {
                return sendJSON(res, 400, {
                    error: 'Invalid JSON'
                });
            }

            const filename = body.filename;
            const content = body.content ?? '';

            if (
                typeof filename !== 'string' ||
                !filename.trim() ||
                filename !== path.basename(filename) ||
                filename === '.' ||
                filename === '..' ||
                /[<>:"/\\|?*\x00-\x1f]/.test(filename)
            ) {
                return sendJSON(res, 400, {
                    error: 'Invalid filename'
                });
            }

            if (typeof content !== 'string') {
                return sendJSON(res, 400, {
                    error: 'Invalid file content'
                });
            }

            const filePath = path.join(DATA_DIR, filename);

            fs.writeFile(filePath, content, { flag: 'wx' }, error => {
                if (error) {
                    return sendJSON(
                        res,
                        error.code === 'EEXIST' ? 409 : 500,
                        {
                            error: error.code === 'EEXIST'
                                ? 'File already exists'
                                : 'Could not create file'
                        }
                    );
                }

                sendJSON(res, 201, {
                    message: 'File created successfully'
                });
            });
        });
    }

    // Read one file
    if (req.method === 'GET' && req.url.startsWith('/api/file?')) {
        const url = new URL(req.url, 'http://localhost:3000');
        const filename = url.searchParams.get('filename');

        if (
            !filename ||
            filename !== path.basename(filename) ||
            filename === '.' ||
            filename === '..'
        ) {
            return sendJSON(res, 400, {
                error: 'Invalid filename'
            });
        }

        return fs.readFile(
            path.join(DATA_DIR, filename),
            'utf8',
            (error, content) => {
                if (error) {
                    return sendJSON(res, 404, {
                        error: 'File not found'
                    });
                }

                sendJSON(res, 200, { content });
            }
        );
    }

    // Delete a file
    if (req.method === 'DELETE' && req.url.startsWith('/api/files?')) {
        const url = new URL(req.url, 'http://localhost:3000');
        const filename = url.searchParams.get('filename');

        if (
            !filename ||
            filename !== path.basename(filename) ||
            filename === '.' ||
            filename === '..'
        ) {
            return sendJSON(res, 400, {
                error: 'Invalid filename'
            });
        }

        return fs.unlink(
            path.join(DATA_DIR, filename),
            error => {
                if (error) {
                    return sendJSON(res, 404, {
                        error: 'File not found'
                    });
                }

                sendJSON(res, 200, {
                    message: 'File deleted successfully'
                });
            }
        );
    }

    // System information
    if (req.method === 'GET' && req.url === '/api/system') {
        return sendJSON(res, 200, {
            platform: os.platform(),
            hostname: os.hostname(),
            freeMemory: os.freemem(),
            totalMemory: os.totalmem(),
            uptime: os.uptime()
        });
    }

    // Unknown route
    sendJSON(res, 404, {
        error: 'Route not found'
    });
});

// Read request body
function readBody(req, callback) {
    let body = '';

    req.on('data', chunk => {
        body += chunk;

        if (body.length > 1024 * 1024) {
            req.destroy();
        }
    });

    req.on('end', () => {
        try {
            callback(null, JSON.parse(body || '{}'));
        } catch (error) {
            callback(error);
        }
    });

    req.on('error', error => {
        callback(error);
    });
}

// Send JSON response
function sendJSON(res, statusCode, data) {
    res.writeHead(statusCode, {
        'Content-Type': 'application/json; charset=utf-8'
    });

    res.end(JSON.stringify(data));
}

// Serve HTML, CSS and JavaScript
function serveFile(res, filename, contentType) {
    const filePath = path.join(PUBLIC_DIR, filename);

    fs.readFile(filePath, (error, data) => {
        if (error) {
            res.writeHead(404, {
                'Content-Type': 'text/plain; charset=utf-8'
            });

            return res.end('File not found');
        }

        res.writeHead(200, {
            'Content-Type': contentType
        });

        res.end(data);
    });
}

// Start server
server.listen(3000, () => {
    console.log('Mini File Manager: http://localhost:3000');
});
