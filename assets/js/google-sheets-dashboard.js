import ApexCharts from 'apexcharts';
import Modal from 'bootstrap/js/dist/modal';

const SHEET_CONFIG = {
  apiKey: 'AIzaSyBRaKHk8iTEf09tQqo6eixAOEdiFusTToA',
  spreadsheetId: '1ZawvGDZfqdH2K1A_gr1GkYbYmtrM97ingWGKftkus0w',
  range: 'Live Stock!A:D',
  updateApi: 'https://script.google.com/macros/s/AKfycbwhLsuGJcBjszFbvQbMWbDj8anAVLf6MRlHdNXQFJNPuncOcCu3KEiwvDpi9wbxgZRHzA/exec',
};

const state = {
  branches: [],
  chart: null,
  currentBranch: '',
};

document.addEventListener('DOMContentLoaded', () => {
  const content = document.getElementById('content');

  if (!content || !isDashboardPage()) {
    return;
  }

  content.innerHTML = getDashboardTemplate();
  bindDashboardEvents();
  loadSheetData();

  window.setInterval(loadSheetData, 30000);
});

function isDashboardPage() {
  const page = window.location.pathname.split('/').pop();
  return page === '' || page === 'index.html';
}

function getDashboardTemplate() {
  return `
    <div class="container-fluid">
      <div class="row align-items-center g-3 mb-4">
        <div class="col-lg-8">
          <div class="d-flex align-items-center gap-3">
            <div class="icon-shape icon-lg bg-primary text-white rounded-2">
              <i class="ti ti-car fs-3"></i>
            </div>
            <div>
              <h1 class="fs-3 mb-1">VVR Autos Hub</h1>
              <p class="mb-0 text-secondary">Live inventory management powered by Google Sheets.</p>
            </div>
          </div>
        </div>
        <div class="col-lg-4 text-lg-end">
          <span id="sheet-status" class="badge text-bg-secondary-subtle text-secondary border px-3 py-2">
            Connecting...
          </span>
          <button id="refresh-sheet" class="btn btn-outline-primary btn-sm ms-2">
            <i class="ti ti-refresh me-1"></i>Refresh
          </button>
        </div>
      </div>

      <div class="row g-3 mb-4">
        <div class="col-md-4">
          <div class="card stat-card p-4 border-0 shadow-sm">
            <div class="d-flex align-items-center gap-3">
              <div class="icon-shape icon-md bg-primary text-white rounded-2">
                <i class="ti ti-package fs-4"></i>
              </div>
              <div>
                <p class="text-secondary mb-1">Total Stock</p>
                <h2 id="stat-stock" class="fw-bold mb-0">0</h2>
              </div>
            </div>
          </div>
        </div>
        <div class="col-md-4">
          <div class="card stat-card p-4 border-0 shadow-sm">
            <div class="d-flex align-items-center gap-3">
              <div class="icon-shape icon-md bg-warning text-white rounded-2">
                <i class="ti ti-clipboard-list fs-4"></i>
              </div>
              <div>
                <p class="text-secondary mb-1">Total Bookings</p>
                <h2 id="stat-booking" class="fw-bold mb-0">0</h2>
              </div>
            </div>
          </div>
        </div>
        <div class="col-md-4">
          <div class="card stat-card p-4 border-0 shadow-sm">
            <div class="d-flex align-items-center gap-3">
              <div class="icon-shape icon-md bg-success text-white rounded-2">
                <i class="ti ti-currency-rupee fs-4"></i>
              </div>
              <div>
                <p class="text-secondary mb-1">Total Payments</p>
                <h2 id="stat-payment" class="fw-bold mb-0">0</h2>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="row g-4">
        <div class="col-xl-6">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-body">
              <div class="d-flex align-items-center justify-content-between mb-3">
                <div>
                  <h2 class="fs-5 mb-1">Branch Analytics</h2>
                  <p class="text-secondary mb-0 small">Stock, bookings, and payments by branch.</p>
                </div>
              </div>
              <div id="branch-chart" class="branch-chart"></div>
            </div>
          </div>
        </div>

        <div class="col-xl-6">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-body border-bottom">
              <div class="d-flex flex-wrap gap-3 align-items-center justify-content-between">
                <div>
                  <h2 class="fs-5 mb-1">Branch Data</h2>
                  <p id="branch-count" class="text-secondary mb-0 small">No branches loaded yet.</p>
                </div>
                <div class="input-group input-group-sm dashboard-search">
                  <span class="input-group-text bg-white"><i class="ti ti-search"></i></span>
                  <input id="branch-search" type="search" class="form-control" placeholder="Search branch">
                </div>
              </div>
            </div>
            <div class="table-responsive branch-table-wrap">
              <table class="table table-hover align-middle mb-0">
                <thead class="table-light">
                  <tr>
                    <th>Branch</th>
                    <th>Stock</th>
                    <th>Booking</th>
                    <th>Payment</th>
                    <th class="text-end">Action</th>
                  </tr>
                </thead>
                <tbody id="branch-table-body">
                  <tr>
                    <td colspan="5" class="text-center text-secondary py-5">Loading sheet data...</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <footer class="text-center py-2 mt-6 text-secondary">
        <p class="mb-0">VVR Autos live dashboard. Data syncs from Google Sheets every 30 seconds.</p>
      </footer>
    </div>

    <div class="modal fade" id="branchEditModal" tabindex="-1" aria-labelledby="branchEditModalLabel" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <form id="branch-edit-form" class="modal-content">
          <div class="modal-header">
            <div>
              <h2 class="modal-title fs-5" id="branchEditModalLabel">Edit Branch</h2>
              <p id="edit-branch-name" class="text-secondary mb-0 small"></p>
            </div>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <div class="mb-3">
              <label for="edit-stock" class="form-label">Stock</label>
              <input id="edit-stock" type="number" min="0" class="form-control" required>
            </div>
            <div class="mb-3">
              <label for="edit-booking" class="form-label">Booking</label>
              <input id="edit-booking" type="number" min="0" class="form-control" required>
            </div>
            <div>
              <label for="edit-payment" class="form-label">Payment</label>
              <input id="edit-payment" type="number" min="0" class="form-control" required>
            </div>
            <div id="edit-message" class="small mt-3"></div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-light" data-bs-dismiss="modal">Cancel</button>
            <button id="save-branch" type="submit" class="btn btn-primary">
              <i class="ti ti-device-floppy me-1"></i>Save
            </button>
          </div>
        </form>
      </div>
    </div>
  `;
}

function bindDashboardEvents() {
  document.getElementById('refresh-sheet')?.addEventListener('click', loadSheetData);
  document.getElementById('branch-search')?.addEventListener('input', (event) => {
    const query = event.target.value.toLowerCase();
    renderTable(state.branches.filter((item) => item.branch.toLowerCase().includes(query)));
  });
  document.getElementById('branch-edit-form')?.addEventListener('submit', saveChanges);
}

async function loadSheetData() {
  setStatus('Connecting...', 'secondary');

  const sheetRange = encodeURIComponent(SHEET_CONFIG.range);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_CONFIG.spreadsheetId}/values/${sheetRange}?key=${SHEET_CONFIG.apiKey}`;

  try {
    const response = await fetch(url);
    const result = await response.json();

    if (!response.ok || !result.values) {
      throw new Error(result.error?.message || 'No sheet rows returned.');
    }

    processData(result.values);
    setStatus('Connected', 'success');
  } catch (error) {
    setStatus('Connection failed', 'danger');
    renderEmptyState(error.message);
  }
}

function processData(rows) {
  let totalStock = 0;
  let totalBooking = 0;
  let totalPayment = 0;

  state.branches = rows.slice(1).reduce((items, row) => {
    const branch = String(row[0] || '').trim();

    if (!branch || branch.toLowerCase() === 'totals') {
      return items;
    }

    const stock = parseNumber(row[1]);
    const booking = parseNumber(row[2]);
    const payment = parseNumber(row[3]);

    totalStock += stock;
    totalBooking += booking;
    totalPayment += payment;

    items.push({ branch, stock, booking, payment });
    return items;
  }, []);

  setText('stat-stock', totalStock.toLocaleString('en-IN'));
  setText('stat-booking', totalBooking.toLocaleString('en-IN'));
  setText('stat-payment', totalPayment.toLocaleString('en-IN'));
  setText('branch-count', `${state.branches.length.toLocaleString('en-IN')} branches loaded`);

  renderTable(state.branches);
  renderChart(state.branches);
}

function renderTable(data) {
  const table = document.getElementById('branch-table-body');

  if (!table) {
    return;
  }

  if (!data.length) {
    table.innerHTML = '<tr><td colspan="5" class="text-center text-secondary py-5">No matching branches found.</td></tr>';
    return;
  }

  table.innerHTML = data.map((item) => {
    const stockClass = item.stock <= 15
      ? 'badge text-bg-danger-subtle text-danger border border-danger-subtle'
      : 'fw-semibold';

    return `
      <tr>
        <td class="fw-semibold">${escapeHtml(item.branch)}</td>
        <td><span class="${stockClass}">${item.stock.toLocaleString('en-IN')}</span></td>
        <td>${item.booking.toLocaleString('en-IN')}</td>
        <td>${item.payment.toLocaleString('en-IN')}</td>
        <td class="text-end">
          <button class="btn btn-sm btn-outline-primary" type="button" data-branch="${escapeHtml(item.branch)}">
            <i class="ti ti-edit me-1"></i>Edit
          </button>
        </td>
      </tr>
    `;
  }).join('');

  table.querySelectorAll('[data-branch]').forEach((button) => {
    button.addEventListener('click', () => {
      const branch = state.branches.find((item) => item.branch === button.dataset.branch);
      if (branch) {
        openEditModal(branch);
      }
    });
  });
}

function renderChart(data) {
  const chartEl = document.getElementById('branch-chart');

  if (!chartEl) {
    return;
  }

  if (state.chart) {
    state.chart.destroy();
  }

  state.chart = new ApexCharts(chartEl, {
    chart: {
      type: 'bar',
      height: 360,
      toolbar: { show: false },
    },
    series: [
      { name: 'Stock', data: data.map((item) => item.stock) },
      { name: 'Bookings', data: data.map((item) => item.booking) },
      { name: 'Payments', data: data.map((item) => item.payment) },
    ],
    colors: ['#2563eb', '#f59e0b', '#16a34a'],
    plotOptions: {
      bar: {
        borderRadius: 4,
        columnWidth: '64%',
      },
    },
    dataLabels: { enabled: false },
    grid: { borderColor: '#e2e8f0' },
    xaxis: {
      categories: data.map((item) => item.branch),
      labels: { rotate: -35, trim: true },
    },
    yaxis: {
      min: 0,
      labels: {
        formatter: (value) => Number(value).toLocaleString('en-IN'),
      },
    },
    legend: {
      position: 'top',
      horizontalAlign: 'left',
    },
    tooltip: {
      y: {
        formatter: (value) => Number(value).toLocaleString('en-IN'),
      },
    },
    responsive: [
      {
        breakpoint: 768,
        options: {
          chart: { height: 320 },
          plotOptions: { bar: { columnWidth: '78%' } },
          xaxis: { labels: { rotate: -45 } },
        },
      },
    ],
  });

  state.chart.render();
}

function openEditModal(branch) {
  state.currentBranch = branch.branch;
  setText('edit-branch-name', `Editing: ${branch.branch}`);
  setText('edit-message', '');

  document.getElementById('edit-stock').value = branch.stock;
  document.getElementById('edit-booking').value = branch.booking;
  document.getElementById('edit-payment').value = branch.payment;

  const modalElement = document.getElementById('branchEditModal');
  const modal = Modal.getOrCreateInstance(modalElement);
  modal.show();
}

async function saveChanges(event) {
  event.preventDefault();

  const saveButton = document.getElementById('save-branch');
  const message = document.getElementById('edit-message');
  const payload = {
    branch: state.currentBranch,
    stock: parseNumber(document.getElementById('edit-stock').value),
    booking: parseNumber(document.getElementById('edit-booking').value),
    payment: parseNumber(document.getElementById('edit-payment').value),
  };

  saveButton.disabled = true;
  message.className = 'small mt-3 text-secondary';
  message.textContent = 'Saving changes...';

  try {
    const response = await fetch(SHEET_CONFIG.updateApi, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || 'Update failed.');
    }

    message.className = 'small mt-3 text-success';
    message.textContent = 'Saved successfully.';
    Modal.getInstance(document.getElementById('branchEditModal'))?.hide();
    loadSheetData();
  } catch (error) {
    message.className = 'small mt-3 text-danger';
    message.textContent = error.message || 'Connection failed.';
  } finally {
    saveButton.disabled = false;
  }
}

function renderEmptyState(message) {
  const table = document.getElementById('branch-table-body');

  if (table) {
    table.innerHTML = `<tr><td colspan="5" class="text-center text-danger py-5">${escapeHtml(message)}</td></tr>`;
  }
}

function setStatus(text, tone) {
  const status = document.getElementById('sheet-status');

  if (!status) {
    return;
  }

  status.className = `badge text-bg-${tone}-subtle text-${tone} border px-3 py-2`;
  status.textContent = text;
}

function setText(id, value) {
  const element = document.getElementById(id);

  if (element) {
    element.textContent = value;
  }
}

function parseNumber(value) {
  return Number.parseInt(String(value || '0').replace(/,/g, ''), 10) || 0;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
