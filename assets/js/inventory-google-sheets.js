const SHEET_CONFIG = {
  apiKey: 'AIzaSyBRaKHk8iTEf09tQqo6eixAOEdiFusTToA',
  spreadsheetId: '1ZawvGDZfqdH2K1A_gr1GkYbYmtrM97ingWGKftkus0w',
  range: 'Inventory!A:I',
  sheetUrl: 'https://docs.google.com/spreadsheets/d/1ZawvGDZfqdH2K1A_gr1GkYbYmtrM97ingWGKftkus0w/edit',
};

const LOW_STOCK_LIMIT = 10;
let inventoryItems = [];
let lowStockOnly = false;

document.addEventListener('DOMContentLoaded', () => {
  if (!isInventoryPage()) {
    return;
  }

  setupInventoryControls();
  loadInventoryData();
  window.setInterval(loadInventoryData, 30000);
});

function isInventoryPage() {
  return window.location.pathname.endsWith('inventory.html');
}

function setupInventoryControls() {
  const searchInput = document.querySelector('input[placeholder="Search products..."]');
  const buttons = [...document.querySelectorAll('button')];
  const filterButton = buttons.find((button) => button.textContent.includes('Filter'));
  const excelButton = buttons.find((button) => button.textContent.includes('Excel'));
  const pdfButton = buttons.find((button) => button.textContent.includes('PDF'));

  searchInput?.addEventListener('input', renderInventoryTable);

  filterButton?.addEventListener('click', () => {
    lowStockOnly = !lowStockOnly;
    filterButton.classList.toggle('btn-primary', lowStockOnly);
    filterButton.classList.toggle('btn-outline-secondary', !lowStockOnly);
    filterButton.innerHTML = lowStockOnly
      ? '<i class="ti ti-filter-check"></i> Low Stock'
      : '<i class="ti ti-filter"></i> Filter';
    renderInventoryTable();
  });

  excelButton?.addEventListener('click', exportInventoryCsv);
  pdfButton?.addEventListener('click', () => window.print());
}

async function loadInventoryData() {
  const tbody = getInventoryTableBody();

  if (tbody) {
    tbody.innerHTML = '<tr><td colspan="8" class="text-center text-secondary py-5">Loading inventory from Google Sheets...</td></tr>';
  }

  const range = encodeURIComponent(SHEET_CONFIG.range);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_CONFIG.spreadsheetId}/values/${range}?key=${SHEET_CONFIG.apiKey}`;

  try {
    const response = await fetch(url);
    const result = await response.json();

    if (!response.ok || !result.values) {
      throw new Error(result.error?.message || 'No inventory rows found.');
    }

    inventoryItems = parseInventoryRows(result.values);
    renderInventoryTable();
  } catch (error) {
    renderSetupState(error.message);
  }
}

function parseInventoryRows(rows) {
  return rows.slice(1).reduce((items, row, index) => {
    const name = clean(row[0]);
    const variant = clean(row[1]);

    if (!name && !variant) {
      return items;
    }

    items.push({
      name,
      variant,
      code: clean(row[2]) || `INV${String(index + 1).padStart(3, '0')}`,
      category: clean(row[3]) || 'Vehicle',
      brand: clean(row[4]) || 'VVR Autos',
      price: clean(row[5]) || '-',
      unit: clean(row[6]) || 'pcs',
      quantity: parseNumber(row[7]),
      image: clean(row[8]) || `./assets/images/product-${(index % 10) + 1}.png`,
    });

    return items;
  }, []);
}

function renderInventoryTable() {
  const tbody = getInventoryTableBody();

  if (!tbody) {
    return;
  }

  const search = document.querySelector('input[placeholder="Search products..."]')?.value.toLowerCase() || '';
  const filtered = inventoryItems.filter((item) => {
    const searchable = [
      item.name,
      item.variant,
      item.code,
      item.category,
      item.brand,
      item.price,
      item.unit,
      String(item.quantity),
    ].join(' ').toLowerCase();

    return searchable.includes(search) && (!lowStockOnly || item.quantity <= LOW_STOCK_LIMIT);
  });

  updateFooter(filtered.length);

  if (!filtered.length) {
    tbody.innerHTML = '<tr><td colspan="8" class="text-center text-secondary py-5">No matching inventory items found.</td></tr>';
    return;
  }

  tbody.innerHTML = filtered.map((item) => {
    const displayName = [item.name, item.variant].filter(Boolean).join(' - ');
    const quantityClass = item.quantity <= LOW_STOCK_LIMIT ? 'text-danger' : 'text-primary';

    return `
      <tr class="align-middle">
        <td>
          <a href="${SHEET_CONFIG.sheetUrl}" target="_blank" rel="noreferrer">
            <img src="${escapeHtml(item.image)}" alt="" class="avatar avatar-md rounded" />
            <span class="ms-3">${escapeHtml(displayName)}</span>
          </a>
        </td>
        <td>${escapeHtml(item.code)}</td>
        <td>${escapeHtml(item.category)}</td>
        <td>${escapeHtml(item.brand)}</td>
        <td>${escapeHtml(formatPrice(item.price))}</td>
        <td>${escapeHtml(item.unit)}</td>
        <td><span class="fw-semibold ${quantityClass}">${item.quantity.toLocaleString('en-IN')}</span></td>
        <td>
          <a href="${SHEET_CONFIG.sheetUrl}" target="_blank" rel="noreferrer" title="Edit in Google Sheets">
            <i class="ti ti-edit"></i>
          </a>
        </td>
      </tr>
    `;
  }).join('');
}

function renderSetupState(message) {
  const tbody = getInventoryTableBody();

  if (!tbody) {
    return;
  }

  updateFooter(0);
  tbody.innerHTML = `
    <tr>
      <td colspan="8" class="py-5">
        <div class="alert alert-warning mb-0">
          <h3 class="h6 mb-2">Inventory sheet not ready yet</h3>
          <p class="mb-2">Create a tab named <strong>Inventory</strong> in your Google spreadsheet with these headers:</p>
          <code>Name, Variant, Code, Category, Brand, Price, Unit, Quantity, Image</code>
          <p class="mb-0 mt-2 small text-secondary">Example: Maxima, Maxima Z, MXZ001, Vehicle, VVR Autos, 0, pcs, 12</p>
          <p class="mb-0 mt-2 small text-secondary">Google response: ${escapeHtml(message)}</p>
        </div>
      </td>
    </tr>
  `;
}

function exportInventoryCsv() {
  const rows = [
    ['Name', 'Variant', 'Code', 'Category', 'Brand', 'Price', 'Unit', 'Quantity'],
    ...inventoryItems.map((item) => [
      item.name,
      item.variant,
      item.code,
      item.category,
      item.brand,
      item.price,
      item.unit,
      item.quantity,
    ]),
  ];

  const csv = rows.map((row) => row.map(csvCell).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'inventory.csv';
  link.click();
  URL.revokeObjectURL(url);
}

function updateFooter(count) {
  const footerCell = document.querySelector('tfoot td:first-child');

  if (footerCell) {
    footerCell.textContent = `Showing ${count.toLocaleString('en-IN')} inventory item${count === 1 ? '' : 's'}`;
  }
}

function getInventoryTableBody() {
  return document.querySelector('table tbody');
}

function formatPrice(value) {
  if (value === '-') {
    return value;
  }

  const numeric = Number(String(value).replace(/[₹$,]/g, ''));
  return Number.isFinite(numeric) && String(value).trim() !== ''
    ? `₹${numeric.toLocaleString('en-IN')}`
    : value;
}

function parseNumber(value) {
  return Number.parseInt(String(value || '0').replace(/,/g, ''), 10) || 0;
}

function clean(value) {
  return String(value || '').trim();
}

function csvCell(value) {
  return `"${String(value ?? '').replaceAll('"', '""')}"`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
