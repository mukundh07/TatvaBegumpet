// Set this to your live Render URL after deployment
const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000/api'
    : 'https://tatvabegumpet.onrender.com/api';

// --- DOM Elements ---
const loginOverlay = document.getElementById('login-overlay');
const dashboard = document.getElementById('dashboard');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const logoutBtn = document.getElementById('logout-btn');

// Nav Buttons & Panels
const navBtns = document.querySelectorAll('.nav-btn');
const panels = document.querySelectorAll('.panel');

// Tables
const menuTableBody = document.querySelector('#menu-table tbody');
const resTableBody = document.querySelector('#reservations-table tbody');
const enqTableBody = document.querySelector('#enquiries-table tbody');

// Menu Form Modal
const menuModal = document.getElementById('menu-modal');
const closeModal = document.querySelector('.close-modal');
const addMenuBtn = document.getElementById('add-menu-btn');
const menuForm = document.getElementById('menu-form');

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
});

// --- Auth Functions ---
async function checkAuth() {
    try {
        // Include credentials to send session cookies
        const res = await fetch(`${API_URL}/admin/check`, { credentials: 'include' });
        if (res.ok) {
            showDashboard();
        } else {
            showLogin();
        }
    } catch (error) {
        showLogin();
    }
}

function showLogin() {
    loginOverlay.classList.remove('hidden');
    dashboard.classList.add('hidden');
}

function showDashboard() {
    loginOverlay.classList.add('hidden');
    dashboard.classList.remove('hidden');
    loadPanelData('menu-panel'); // Load default panel
}

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
        const res = await fetch(`${API_URL}/admin/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
            credentials: 'include'
        });

        const data = await res.json();
        if (res.ok && data.success) {
            loginError.textContent = '';
            showDashboard();
        } else {
            loginError.textContent = data.error || 'Login failed';
        }
    } catch (err) {
        loginError.textContent = 'Server error. Is the backend running?';
    }
});

logoutBtn.addEventListener('click', async () => {
    try {
        await fetch(`${API_URL}/admin/logout`, { method: 'POST', credentials: 'include' });
    } finally {
        showLogin();
    }
});

// --- Navigation ---
navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        // Update active states
        navBtns.forEach(b => b.classList.remove('active'));
        panels.forEach(p => p.classList.add('hidden'));

        btn.classList.add('active');
        const targetId = btn.getAttribute('data-target');
        document.getElementById(targetId).classList.remove('hidden');

        // Load data for active panel
        loadPanelData(targetId);
    });
});

function loadPanelData(panelId) {
    if (panelId === 'menu-panel') fetchMenu();
    if (panelId === 'reservations-panel') fetchReservations();
    if (panelId === 'enquiries-panel') fetchEnquiries();
}

// --- Menu Management ---
async function fetchMenu() {
    try {
        const res = await fetch(`${API_URL}/admin/menu`, { credentials: 'include' });
        if (!res.ok) throw new Error('Failed to fetch');
        const items = await res.json();

        menuTableBody.innerHTML = '';
        items.forEach(item => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
        <td>${item.id}</td>
        <td>${item.category}</td>
        <td>${item.name}</td>
        <td>${item.price.toFixed(2)}</td>
        <td>
          <span class="badge ${item.is_available ? 'badge-success' : 'badge-danger'}">
            ${item.is_available ? 'Yes' : 'No'}
          </span>
        </td>
        <td class="td-actions">
          <button class="btn btn-sm" onclick='editMenuItem(${JSON.stringify(item)})'>Edit</button>
          <button class="btn btn-sm btn-danger" onclick='deleteMenuItem(${item.id})'>Delete</button>
        </td>
      `;
            menuTableBody.appendChild(tr);
        });
    } catch (err) {
        console.error(err);
    }
}

// Modal Logic
addMenuBtn.addEventListener('click', () => {
    document.getElementById('modal-title').textContent = 'Add Menu Item';
    document.getElementById('menu-id').value = '';
    menuForm.reset();

    // Reset category selectors
    document.getElementById('menu-category-select').value = '';
    document.getElementById('menu-category-custom').classList.add('hidden');
    document.getElementById('menu-category-custom').required = false;

    menuModal.classList.remove('hidden');
});

closeModal.addEventListener('click', () => {
    menuModal.classList.add('hidden');
});

window.addEventListener('click', (e) => {
    if (e.target === menuModal) menuModal.classList.add('hidden');
});

// Category Dropdown Logic
window.handleCategoryChange = (selectElem) => {
    const customInput = document.getElementById('menu-category-custom');
    if (selectElem.value === 'new') {
        customInput.classList.remove('hidden');
        customInput.required = true;
    } else {
        customInput.classList.add('hidden');
        customInput.required = false;
        customInput.value = '';
    }
};


window.editMenuItem = (item) => {
    document.getElementById('modal-title').textContent = 'Edit Menu Item';
    document.getElementById('menu-id').value = item.id;

    const selectElem = document.getElementById('menu-category-select');
    const customInput = document.getElementById('menu-category-custom');

    // Check if category exists in dropdown, else set to custom
    let optionExists = Array.from(selectElem.options).some(opt => opt.value === item.category);

    if (optionExists) {
        selectElem.value = item.category;
        customInput.classList.add('hidden');
        customInput.required = false;
    } else {
        selectElem.value = 'new';
        customInput.classList.remove('hidden');
        customInput.required = true;
        customInput.value = item.category;
    }

    document.getElementById('menu-name').value = item.name;
    document.getElementById('menu-description').value = item.description;
    document.getElementById('menu-price').value = item.price;
    document.getElementById('menu-available').checked = item.is_available === 1;
    menuModal.classList.remove('hidden');
};

menuForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const id = document.getElementById('menu-id').value;
    const isEdit = id !== '';

    // Determine final category
    let category = document.getElementById('menu-category-select').value;
    if (category === 'new') {
        category = document.getElementById('menu-category-custom').value.trim();
    }

    const payload = {
        category: category,
        name: document.getElementById('menu-name').value,
        description: document.getElementById('menu-description').value,
        price: parseFloat(document.getElementById('menu-price').value),
        is_available: document.getElementById('menu-available').checked ? 1 : 0
    };

    const url = isEdit ? `${API_URL}/admin/menu/${id}` : `${API_URL}/admin/menu`;
    const method = isEdit ? 'PUT' : 'POST';

    try {
        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            credentials: 'include'
        });
        if (res.ok) {
            menuModal.classList.add('hidden');
            fetchMenu();
        } else {
            alert('Failed to save menu item');
        }
    } catch (err) {
        console.error(err);
        alert('Network error');
    }
});

window.deleteMenuItem = async (id) => {
    if (!confirm('Are you sure you want to delete this item?')) return;

    try {
        const res = await fetch(`${API_URL}/admin/menu/${id}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        if (res.ok) fetchMenu();
    } catch (err) {
        console.error(err);
    }
};

// --- Reservations Management ---
async function fetchReservations() {
    try {
        const res = await fetch(`${API_URL}/admin/reservations`, { credentials: 'include' });
        if (!res.ok) throw new Error('Failed to fetch');
        const items = await res.json();

        resTableBody.innerHTML = '';
        items.forEach(item => {
            let badgeClass = item.status === 'pending' ? 'badge-warning' :
                item.status === 'confirmed' ? 'badge-success' : 'badge-danger';
            const tr = document.createElement('tr');
            tr.innerHTML = `
        <td>${item.id}</td>
        <td>${item.name}</td>
        <td>${item.phone}<br><small>${item.email}</small></td>
        <td>${item.date} <br> ${item.time}</td>
        <td>${item.guests}</td>
        <td><span class="badge ${badgeClass}">${item.status}</span></td>
        <td class="td-actions">
          <select onchange="updateReservationStatus(${item.id}, this.value)" style="margin-right:0.5rem">
            <option value="pending" ${item.status === 'pending' ? 'selected' : ''}>Pending</option>
            <option value="confirmed" ${item.status === 'confirmed' ? 'selected' : ''}>Confirm</option>
            <option value="cancelled" ${item.status === 'cancelled' ? 'selected' : ''}>Cancel</option>
          </select>
          <button class="btn btn-sm btn-danger" onclick='deleteReservation(${item.id})'>Del</button>
        </td>
      `;
            resTableBody.appendChild(tr);
        });
    } catch (err) {
        console.error(err);
    }
}

window.updateReservationStatus = async (id, status) => {
    try {
        await fetch(`${API_URL}/admin/reservations/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status }),
            credentials: 'include'
        });
        fetchReservations(); // Refresh
    } catch (err) {
        console.error(err);
    }
};

window.deleteReservation = async (id) => {
    if (!confirm('Delete reservation?')) return;
    try {
        await fetch(`${API_URL}/admin/reservations/${id}`, { method: 'DELETE', credentials: 'include' });
        fetchReservations();
    } catch (err) { console.error(err); }
};

// --- Enquiries Management ---
async function fetchEnquiries() {
    try {
        const res = await fetch(`${API_URL}/admin/enquiries`, { credentials: 'include' });
        if (!res.ok) throw new Error('Failed to fetch');
        const items = await res.json();

        enqTableBody.innerHTML = '';
        items.forEach(item => {
            let badgeClass = item.status === 'unread' ? 'badge-warning' : 'badge-success';
            const tr = document.createElement('tr');
            tr.innerHTML = `
        <td>${item.id}</td>
        <td>${item.name}</td>
        <td>${item.phone}<br><small>${item.email}</small></td>
        <td>${item.subject || 'N/A'}</td>
        <td><small>${item.message}</small></td>
        <td><span class="badge ${badgeClass}">${item.status}</span></td>
        <td class="td-actions">
          <select onchange="updateEnquiryStatus(${item.id}, this.value)" style="margin-right:0.5rem">
            <option value="unread" ${item.status === 'unread' ? 'selected' : ''}>Unread</option>
            <option value="read" ${item.status === 'read' ? 'selected' : ''}>Read</option>
          </select>
          <button class="btn btn-sm btn-danger" onclick='deleteEnquiry(${item.id})'>Del</button>
        </td>
      `;
            enqTableBody.appendChild(tr);
        });
    } catch (err) {
        console.error(err);
    }
}

window.updateEnquiryStatus = async (id, status) => {
    try {
        await fetch(`${API_URL}/admin/enquiries/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status }),
            credentials: 'include'
        });
        fetchEnquiries();
    } catch (err) {
        console.error(err);
    }
};

window.deleteEnquiry = async (id) => {
    if (!confirm('Delete enquiry?')) return;
    try {
        await fetch(`${API_URL}/admin/enquiries/${id}`, { method: 'DELETE', credentials: 'include' });
        fetchEnquiries();
    } catch (err) { console.error(err); }
};
