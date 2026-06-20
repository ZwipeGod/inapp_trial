import ApexCharts from 'apexcharts';

const SHEET_CONFIG = {
  apiKey: 'AIzaSyBRaKHk8iTEf09tQqo6eixAOEdiFusTToA',
  spreadsheetId: '1ZawvGDZfqdH2K1A_gr1GkYbYmtrM97ingWGKftkus0w',
  range: 'Live Stock!A:D',
};

let branchChart = null;

document.addEventListener('DOMContentLoaded', () => {
  if (!document.getElementById('salesPurchaseChart')) {
    return;
  }

  loadSheetData();
  window.setInterval(loadSheetData, 30000);
});

async function loadSheetData() {
  const range = encodeURIComponent(SHEET_CONFIG.range);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_CONFIG.spreadsheetId}/values/${range}?key=${SHEET_CONFIG.apiKey}`;

  try {
    const response = await fetch(url);
    const result = await response.json();

    if (!response.ok || !result.values) {
      throw new Error(result.error?.message || 'No Google Sheet rows found.');
    }

    const data = parseSheetRows(result.values);
    updateDashboard(data);
  } catch (error) {
    showSheetError(error.message);
  }
}

function parseSheetRows(rows) {
  return rows.slice(1).reduce((branches, row) => {
    const branch = String(row[0] || '').trim();

    if (!branch || branch.toLowerCase() === 'totals') {
      return branches;
    }

    branches.push({
      branch,
      stock: parseNumber(row[1]),
      booking: parseNumber(row[2]),
      payment: parseNumber(row[3]),
    });

    return branches;
  }, []);
}

function updateDashboard(branches) {
  const totals = branches.reduce((summary, item) => {
    summary.stock += item.stock;
    summary.booking += item.booking;
    summary.payment += item.payment;
    return summary;
  }, { stock: 0, booking: 0, payment: 0 });

  setMetric('Total Sales', 'Total Stock', formatNumber(totals.stock), `${branches.length} branches`);
  setMetric('Total Purchase', 'Total Bookings', formatNumber(totals.booking), 'Live from Google Sheets');
  setMetric('Total Expenses', 'Total Payments', formatNumber(totals.payment), 'Live from Google Sheets');
  setMetric('Invoice Due', 'Branches', formatNumber(branches.length), 'Auto refreshes every 30 seconds');

  setSmallMetric('Total Profit', formatNumber(totals.stock - totals.booking));
  setSmallMetric('Total Payment Returns', formatNumber(totals.booking));
  setSmallMetric('Total Expenses', formatNumber(totals.payment));

  renderBranchChart(branches);
}

function renderBranchChart(branches) {
  const chartEl = document.getElementById('salesPurchaseChart');

  if (!chartEl) {
    return;
  }

  chartEl.innerHTML = '';

  if (branchChart) {
    branchChart.destroy();
  }

  branchChart = new ApexCharts(chartEl, {
    series: [
      { name: 'Stock', data: branches.map((item) => item.stock) },
      { name: 'Bookings', data: branches.map((item) => item.booking) },
      { name: 'Payments', data: branches.map((item) => item.payment) },
    ],
    colors: ['#E66239', '#f7a085', '#00B8D9'],
    chart: {
      type: 'bar',
      height: 350,
      width: '100%',
      parentHeightOffset: 0,
      toolbar: { show: false },
    },
    grid: {
      show: true,
      borderColor: '#e2e8f0',
    },
    legend: {
      show: true,
      fontFamily: 'Poppins, serif',
      fontWeight: 500,
      markers: {
        size: 5,
        shape: 'square',
        strokeWidth: 0,
        offsetX: -2,
      },
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: '75%',
        borderRadius: 3,
        borderRadiusApplication: 'end',
      },
    },
    dataLabels: { enabled: false },
    stroke: {
      show: false,
      width: 2,
      colors: ['transparent'],
    },
    xaxis: {
      categories: branches.map((item) => item.branch),
      labels: {
        rotate: -35,
        trim: true,
      },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      labels: {
        formatter: (value) => formatNumber(value),
      },
    },
    fill: { opacity: 1 },
    tooltip: {
      y: {
        formatter: (value) => formatNumber(value),
      },
    },
  });

  branchChart.render();
}

function setMetric(currentLabel, newLabel, value, helperText) {
  const label = [...document.querySelectorAll('h2')].find((heading) => {
    const text = heading.textContent.trim();
    return text === currentLabel || text === newLabel;
  });
  const cardBody = label?.closest('.d-flex')?.querySelector('div:last-child');

  if (!cardBody) {
    return;
  }

  const valueEl = cardBody.querySelector('h3');
  const helperEl = cardBody.querySelector('p');

  label.textContent = newLabel;
  if (valueEl) valueEl.textContent = value;
  if (helperEl) helperEl.textContent = helperText;
}

function setSmallMetric(labelText, value) {
  const label = [...document.querySelectorAll('span')].find((item) => item.textContent.trim() === labelText);
  const card = label?.closest('.card-body');
  const valueEl = card?.querySelector('h3');

  if (valueEl) {
    valueEl.textContent = value;
  }
}

function showSheetError(message) {
  const chartEl = document.getElementById('salesPurchaseChart');

  if (chartEl) {
    chartEl.innerHTML = `<div class="alert alert-danger mb-0">Google Sheets connection failed: ${escapeHtml(message)}</div>`;
  }
}

function parseNumber(value) {
  return Number.parseInt(String(value || '0').replace(/,/g, ''), 10) || 0;
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString('en-IN');
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
