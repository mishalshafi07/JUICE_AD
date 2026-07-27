const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = 8085;
const PUBLIC_DIR = __dirname;
const USERS_FILE = path.join(__dirname, 'data', 'users.json');
const ORDERS_FILE = path.join(__dirname, 'data', 'orders.json');

// Ensure data directory exists
if (!fs.existsSync(path.join(__dirname, 'data'))) {
  fs.mkdirSync(path.join(__dirname, 'data'));
}

// Ensure database files exist
if (!fs.existsSync(USERS_FILE)) {
  fs.writeFileSync(USERS_FILE, JSON.stringify([], null, 2));
}
if (!fs.existsSync(ORDERS_FILE)) {
  fs.writeFileSync(ORDERS_FILE, JSON.stringify([], null, 2));
}

// Helper: Read Data
function readJSON(file) {
  try {
    const data = fs.readFileSync(file, 'utf8');
    return JSON.parse(data || '[]');
  } catch (err) {
    return [];
  }
}

// Helper: Save Data
function saveJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// Helper: Hash Password using PBKDF2
function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
}

// Active Sessions Store (in-memory)
const sessions = new Map();

// MIME Types
const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.json': 'application/json',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml'
};

const server = http.createServer((req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Parse URL
  const reqUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname = reqUrl.pathname;

  // --------------------------------------------------------------------------
  // API ENDPOINTS
  // --------------------------------------------------------------------------
  if (pathname.startsWith('/api/')) {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      let data = {};
      try {
        if (body) data = JSON.parse(body);
      } catch (e) {}

      // 1. REGISTER ENDPOINT
      if (pathname === '/api/register' && req.method === 'POST') {
        const { fullName, email, phone, password } = data;

        if (!fullName || !email || !password) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ success: false, message: 'All fields are required.' }));
        }

        const users = readJSON(USERS_FILE);
        const existingUser = users.find(u => u.email.toLowerCase() === email.toLowerCase());

        if (existingUser) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ success: false, message: 'Email address is already registered.' }));
        }

        const salt = crypto.randomBytes(16).toString('hex');
        const hashedPassword = hashPassword(password, salt);

        const newUser = {
          id: 'usr_' + Date.now(),
          fullName,
          email: email.toLowerCase(),
          phone: phone || '',
          salt,
          password: hashedPassword,
          createdAt: new Date().toISOString()
        };

        users.push(newUser);
        saveJSON(USERS_FILE, users);

        // Auto-login session
        const token = crypto.randomBytes(32).toString('hex');
        sessions.set(token, { userId: newUser.id, email: newUser.email, fullName: newUser.fullName });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({
          success: true,
          message: 'Account created successfully!',
          token,
          user: { id: newUser.id, fullName: newUser.fullName, email: newUser.email }
        }));
      }

      // 2. LOGIN ENDPOINT
      if (pathname === '/api/login' && req.method === 'POST') {
        const { email, password } = data;

        if (!email || !password) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ success: false, message: 'Please enter both email and password.' }));
        }

        const users = readJSON(USERS_FILE);
        const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());

        if (!user) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ success: false, message: 'Invalid email or password.' }));
        }

        const verifyHash = hashPassword(password, user.salt);
        if (verifyHash !== user.password) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ success: false, message: 'Invalid email or password.' }));
        }

        const token = crypto.randomBytes(32).toString('hex');
        sessions.set(token, { userId: user.id, email: user.email, fullName: user.fullName });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({
          success: true,
          message: 'Logged in successfully!',
          token,
          user: { id: user.id, fullName: user.fullName, email: user.email }
        }));
      }

      // 3. ME (SESSION VERIFY) ENDPOINT
      if (pathname === '/api/me' && req.method === 'GET') {
        const authHeader = req.headers['authorization'];
        const token = authHeader ? authHeader.replace('Bearer ', '') : null;

        if (token && sessions.has(token)) {
          const session = sessions.get(token);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ success: true, user: session }));
        } else {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ success: false, message: 'Not authenticated.' }));
        }
      }

      // 4. LOGOUT ENDPOINT
      if (pathname === '/api/logout' && req.method === 'POST') {
        const authHeader = req.headers['authorization'];
        const token = authHeader ? authHeader.replace('Bearer ', '') : null;

        if (token) sessions.delete(token);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ success: true, message: 'Logged out successfully.' }));
      }

      // 5. CREATE ORDER ENDPOINT
      if (pathname === '/api/orders' && req.method === 'POST') {
        const { items, customer, payment } = data;

        if (!items || !customer || !customer.fullName || !customer.address || !customer.city) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ success: false, message: 'Missing required shipping or item details.' }));
        }

        const orders = readJSON(ORDERS_FILE);
        const orderId = 'STR-' + Math.floor(100000 + Math.random() * 900000);

        const newOrder = {
          orderId,
          createdAt: new Date().toISOString(),
          estimatedDelivery: 'Express Chilled Delivery within 1 hour',
          items,
          customer,
          payment: {
            method: payment.method || 'Credit Card',
            status: 'Paid',
            cardLast4: payment.cardNumber ? payment.cardNumber.slice(-4) : '4242'
          },
          status: 'Confirmed'
        };

        orders.push(newOrder);
        saveJSON(ORDERS_FILE, orders);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({
          success: true,
          message: 'Order processed successfully!',
          order: newOrder
        }));
      }

      // 6. ADMIN LOGIN ENDPOINT
      if (pathname === '/api/admin/login' && req.method === 'POST') {
        const { email, password } = data;
        if ((email === 'admin@strawberry.com' || email === 'admin') && password === 'admin123') {
          const adminToken = 'admin_session_' + crypto.randomBytes(24).toString('hex');
          sessions.set(adminToken, { userId: 'admin-01', email: 'admin@strawberry.com', role: 'Administrator' });

          res.writeHead(200, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({
            success: true,
            message: 'Admin authenticated successfully.',
            token: adminToken,
            admin: { email: 'admin@strawberry.com', role: 'Administrator' }
          }));
        } else {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ success: false, message: 'Invalid Admin Email or Password.' }));
        }
      }

      // 7. ADMIN DATA ENDPOINT (USERS, ORDERS, PAID DETAILS)
      if (pathname === '/api/admin/data' && req.method === 'GET') {
        const authHeader = req.headers['authorization'];
        const token = authHeader ? authHeader.replace('Bearer ', '') : null;

        if (!token || !sessions.has(token) || sessions.get(token).role !== 'Administrator') {
          res.writeHead(403, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ success: false, message: 'Unauthorized Admin Access.' }));
        }

        const rawUsers = readJSON(USERS_FILE);
        const users = rawUsers.map(u => ({ id: u.id, fullName: u.fullName, email: u.email, phone: u.phone || 'N/A', createdAt: u.createdAt }));
        const orders = readJSON(ORDERS_FILE);

        let totalRevenue = 0;
        orders.forEach(o => {
          if (o.items && Array.isArray(o.items)) {
            o.items.forEach(it => {
              const qty = it.quantity || 1;
              const unit = it.unitPrice || 5;
              totalRevenue += qty * unit;
            });
          }
        });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({
          success: true,
          stats: {
            totalOrders: orders.length,
            totalUsers: users.length,
            totalRevenueQAR: totalRevenue
          },
          users,
          orders
        }));
      }

      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, message: 'Endpoint not found.' }));
    });
    return;
  }

  // --------------------------------------------------------------------------
  // STATIC FILE SERVING
  // --------------------------------------------------------------------------
  let filePath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end(`Server Error: ${err.code}`);
      }
    } else {
      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': ext === '.png' ? 'public, max-age=31536000' : 'no-cache'
      });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, () => {
  console.log(`STRAWBERRY Server running at http://localhost:${PORT}/`);
});
