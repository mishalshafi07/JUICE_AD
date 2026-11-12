/* -------------------------------------------------------------------------- */
/* STRAWBERRY Juice - Executive Admin Portal Controller                       */
/* -------------------------------------------------------------------------- */

document.addEventListener('DOMContentLoaded', () => {
  let adminData = { users: [], orders: [], stats: {} };
  let currentTab = 'orders';

  // DOM Elements
  const adminLoginScreen = document.getElementById('admin-login-screen');
  const adminDashboardScreen = document.getElementById('admin-dashboard-screen');
  const adminLoginForm = document.getElementById('admin-login-form');
  const adminLoginAlert = document.getElementById('admin-login-alert');
  const btnAdminLogout = document.getElementById('btn-admin-logout');

  const kpiRevenue = document.getElementById('kpi-revenue');
  const kpiOrders = document.getElementById('kpi-orders');
  const kpiUsers = document.getElementById('kpi-users');

  const tabOrders = document.getElementById('tab-orders');
  const tabUsers = document.getElementById('tab-users');
  const viewOrders = document.getElementById('view-orders');
  const viewUsers = document.getElementById('view-users');

  const ordersTableBody = document.getElementById('orders-table-body');
  const usersTableBody = document.getElementById('users-table-body');
  const searchInput = document.getElementById('admin-search-input');

  // Check Existing Token
  const adminToken = localStorage.getItem('strawberry_admin_token');
  if (adminToken) {
    loadDashboardData(adminToken);
  } else {
    showLoginScreen();
  }

  // --------------------------------------------------------------------------
  // 1. Admin Authentication Handlers
  // --------------------------------------------------------------------------
  // Safe API fetch helper
  async function safeApiCall(endpoint, method = 'GET', body = null, headers = {}) {
    let targetUrl = endpoint;
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      if (window.location.port !== '8085') {
        targetUrl = 'http://localhost:8085' + endpoint;
      }
    }
    try {
      const fetchOptions = {
        method,
        headers: { 'Content-Type': 'application/json', ...headers }
      };
      if (body) fetchOptions.body = JSON.stringify(body);
      const res = await fetch(targetUrl, fetchOptions);
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await res.json();
        return { ok: res.ok, data };
      }
    } catch (err) {}
    return null;
  }

  // --------------------------------------------------------------------------
  // 1. Admin Authentication Handlers
  // --------------------------------------------------------------------------
  adminLoginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert();

    const email = document.getElementById('admin-email').value.trim();
    const password = document.getElementById('admin-password').value;

    const btn = document.getElementById('btn-admin-login');
    btn.disabled = true;
    btn.textContent = 'AUTHENTICATING...';

    try {
      const apiRes = await safeApiCall('/api/admin/login', 'POST', { email, password });
      if (apiRes && apiRes.data && apiRes.data.success && apiRes.data.token) {
        localStorage.setItem('strawberry_admin_token', apiRes.data.token);
        loadDashboardData(apiRes.data.token);
      } else if (email === 'admin@strawberry.qa' && password === 'Admin2026!') {
        const fallbackToken = 'admin_token_' + Date.now();
        localStorage.setItem('strawberry_admin_token', fallbackToken);
        loadDashboardData(fallbackToken);
      } else {
        showAlert('Invalid admin credentials. Use admin@strawberry.qa / Admin2026!', 'error');
      }
    } catch (err) {
      showAlert('Connection error. Server not responding.', 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'ACCESS ADMIN DASHBOARD →';
    }
  });

  btnAdminLogout.addEventListener('click', () => {
    localStorage.removeItem('strawberry_admin_token');
    showLoginScreen();
  });

  function showLoginScreen() {
    adminLoginScreen.style.display = 'flex';
    adminDashboardScreen.style.display = 'none';
  }

  function showDashboardScreen() {
    adminLoginScreen.style.display = 'none';
    adminDashboardScreen.style.display = 'flex';
  }

  function showAlert(msg, type = 'error') {
    adminLoginAlert.textContent = msg;
    adminLoginAlert.className = `auth-alert ${type}`;
    adminLoginAlert.style.display = 'block';
  }

  function hideAlert() {
    adminLoginAlert.style.display = 'none';
  }

  // --------------------------------------------------------------------------
  // 2. Load Dashboard Data
  // --------------------------------------------------------------------------
  async function loadDashboardData(token) {
    try {
      const apiRes = await safeApiCall('/api/admin/data', 'GET', null, { 'Authorization': `Bearer ${token}` });
      if (apiRes && apiRes.data && apiRes.data.success) {
        adminData = apiRes.data;
        showDashboardScreen();
        renderKPIs(apiRes.data.stats);
        renderOrdersTable(apiRes.data.orders);
        renderUsersTable(apiRes.data.users);
      } else {
        // Fallback for static hosting
        const localOrders = JSON.parse(localStorage.getItem('juice_orders') || '[]');
        const localUsers = JSON.parse(localStorage.getItem('juice_users') || '[]');
        let totalRevenue = 0;
        localOrders.forEach(o => {
          if (o.items && Array.isArray(o.items)) {
            o.items.forEach(it => {
              totalRevenue += (it.quantity || 1) * (it.unitPrice || 5);
            });
          }
        });
        showDashboardScreen();
        renderKPIs({ totalOrders: localOrders.length, totalUsers: localUsers.length, totalRevenueQAR: totalRevenue });
        renderOrdersTable(localOrders);
        renderUsersTable(localUsers);
      }
    } catch (err) {
      showLoginScreen();
      showAlert('Failed to connect to server backend.', 'error');
    }
  }

  // --------------------------------------------------------------------------
  // 3. Render Dashboard Views & Tables
  // --------------------------------------------------------------------------
  function renderKPIs(stats) {
    kpiRevenue.textContent = `${stats.totalRevenueQAR || 0} QAR`;
    kpiOrders.textContent = stats.totalOrders || 0;
    kpiUsers.textContent = stats.totalUsers || 0;
  }

  function renderOrdersTable(orders) {
    ordersTableBody.innerHTML = '';
    if (!orders || orders.length === 0) {
      ordersTableBody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: #7a7a8e; padding: 30px;">No orders found.</td></tr>`;
      return;
    }

    orders.forEach(o => {
      const tr = document.createElement('tr');

      const dateStr = new Date(o.createdAt || Date.now()).toLocaleString('en-US', {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
      });

      const custName = o.customer ? o.customer.fullName : 'Guest User';
      const custContact = o.customer ? `${o.customer.email}<br><small style="color:#7a7a8e">${o.customer.phone || ''}</small>` : 'N/A';
      const address = o.customer ? `${o.customer.address}, ${o.customer.city}` : 'N/A';

      let itemsSummary = '';
      let totalAmount = 0;
      if (o.items && Array.isArray(o.items)) {
        o.items.forEach(it => {
          itemsSummary += `<strong>${it.title || 'Strawberry Juice'}</strong> (x${it.quantity || 1})<br>`;
          totalAmount += (it.unitPrice || 5) * (it.quantity || 1);
        });
      }

      // Add shipping if any
      const shippingCost = (o.items && o.items[0] && o.items[0].pack === 'twelve') || totalAmount >= 40 ? 0 : 3;
      const grandTotal = totalAmount + shippingCost;

      const isCOD = o.payment && o.payment.method === 'COD';
      const statusBadge = isCOD 
        ? `<span class="badge-status status-cod">Cash on Delivery</span>` 
        : `<span class="badge-status status-paid">Paid (Card)</span>`;

      tr.innerHTML = `
        <td><strong style="color: #ff4d6d;">#${o.orderId}</strong></td>
        <td>${dateStr}</td>
        <td><strong>${custName}</strong></td>
        <td>${custContact}</td>
        <td>${address}</td>
        <td>${itemsSummary}</td>
        <td>${o.payment ? o.payment.method : 'Card'}</td>
        <td>${statusBadge}</td>
        <td><strong style="color: #fff; font-size: 1rem;">${grandTotal} QAR</strong></td>
      `;
      ordersTableBody.appendChild(tr);
    });
  }

  function renderUsersTable(users) {
    usersTableBody.innerHTML = '';
    if (!users || users.length === 0) {
      usersTableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #7a7a8e; padding: 30px;">No registered users found.</td></tr>`;
      return;
    }

    users.forEach(u => {
      const tr = document.createElement('tr');
      const regDate = new Date(u.createdAt || Date.now()).toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric'
      });

      tr.innerHTML = `
        <td><code style="color: #a0a0b5;">${u.id}</code></td>
        <td><strong>${u.fullName}</strong></td>
        <td>${u.email}</td>
        <td><strong>${u.phone || 'N/A'}</strong></td>
        <td>${regDate}</td>
      `;
      usersTableBody.appendChild(tr);
    });
  }

  // --------------------------------------------------------------------------
  // 4. Tab Switching & Search Filtering
  // --------------------------------------------------------------------------
  tabOrders.addEventListener('click', () => {
    currentTab = 'orders';
    tabOrders.classList.add('active');
    tabUsers.classList.remove('active');
    viewOrders.style.display = 'block';
    viewUsers.style.display = 'none';
  });

  tabUsers.addEventListener('click', () => {
    currentTab = 'users';
    tabUsers.classList.add('active');
    tabOrders.classList.remove('active');
    viewUsers.style.display = 'block';
    viewOrders.style.display = 'none';
  });

  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase().trim();

    if (currentTab === 'orders') {
      const filteredOrders = adminData.orders.filter(o => {
        const idMatch = o.orderId && o.orderId.toLowerCase().includes(query);
        const nameMatch = o.customer && o.customer.fullName && o.customer.fullName.toLowerCase().includes(query);
        const emailMatch = o.customer && o.customer.email && o.customer.email.toLowerCase().includes(query);
        return idMatch || nameMatch || emailMatch;
      });
      renderOrdersTable(filteredOrders);
    } else {
      const filteredUsers = adminData.users.filter(u => {
        const nameMatch = u.fullName && u.fullName.toLowerCase().includes(query);
        const emailMatch = u.email && u.email.toLowerCase().includes(query);
        const phoneMatch = u.phone && u.phone.toLowerCase().includes(query);
        return nameMatch || emailMatch || phoneMatch;
      });
      renderUsersTable(filteredUsers);
    }
  });
});
