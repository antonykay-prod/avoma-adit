const API_BASE = "https://platform-api.avoma.com/v1/meetings/";

const fromDateEl = document.getElementById("fromDate");
const toDateEl = document.getElementById("toDate");
const tokenEl = document.getElementById("apiToken");
const loadBtn = document.getElementById("loadBtn");
const statusEl = document.getElementById("status");
const tableBodyEl = document.getElementById("callsTableBody");

const totalCallsEl = document.getElementById("totalCalls");
const avgDurationEl = document.getElementById("avgDuration");
const completedCallsEl = document.getElementById("completedCalls");

const today = new Date();
const isoDate = (d) => d.toISOString().slice(0, 10);
fromDateEl.value = isoDate(new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000));
toDateEl.value = isoDate(today);

let volumeChart;
let typeChart;
let outcomeChart;

const chartDefaults = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      labels: { color: "#e5e7eb" },
    },
  },
};

function toRangeISO(dateStr, end = false) {
  return `${dateStr}T${end ? "23:59:59.999999" : "00:00:00.000000"}Z`;
}

async function fetchAllMeetings(token, fromDate, toDate) {
  const headers = {
    "X-Avoma-API-Type": "platform",
    Authorization: `Bearer ${token}`,
  };

  let url = `${API_BASE}?from_date=${encodeURIComponent(toRangeISO(fromDate))}&to_date=${encodeURIComponent(toRangeISO(toDate))}`;
  const allResults = [];

  while (url) {
    const res = await fetch(url, { headers });
    if (!res.ok) {
      throw new Error(`API error ${res.status}: ${await res.text()}`);
    }
    const data = await res.json();
    allResults.push(...(data.results || []));
    url = data.next;
    statusEl.textContent = `Loaded ${allResults.length} / ${data.count} calls...`;
  }

  return allResults;
}

function groupBy(items, selector) {
  return items.reduce((acc, item) => {
    const key = selector(item) || "Unknown";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function getDailyVolume(calls) {
  const byDay = groupBy(calls, (c) => c.start_at?.slice(0, 10));
  const labels = Object.keys(byDay).sort();
  return {
    labels,
    values: labels.map((d) => byDay[d]),
  };
}

function renderKPIs(calls) {
  const total = calls.length;
  const totalDurationMin = calls.reduce((sum, c) => sum + (c.duration || 0) / 60, 0);
  const completed = calls.filter((c) => c.state === "completed").length;

  totalCallsEl.textContent = total.toLocaleString();
  avgDurationEl.textContent = total ? (totalDurationMin / total).toFixed(1) : "0";
  completedCallsEl.textContent = completed.toLocaleString();
}

function destroyChart(chart) {
  if (chart) {
    chart.destroy();
  }
}

function renderCharts(calls) {
  const daily = getDailyVolume(calls);
  const types = groupBy(calls, (c) => c.type?.label);
  const outcomes = groupBy(calls, (c) => c.outcome?.label);

  destroyChart(volumeChart);
  destroyChart(typeChart);
  destroyChart(outcomeChart);

  volumeChart = new Chart(document.getElementById("volumeChart"), {
    type: "line",
    data: {
      labels: daily.labels,
      datasets: [
        {
          label: "Calls",
          data: daily.values,
          borderColor: "#60a5fa",
          backgroundColor: "rgba(96, 165, 250, 0.25)",
          tension: 0.3,
          fill: true,
        },
      ],
    },
    options: {
      ...chartDefaults,
      scales: {
        x: { ticks: { color: "#d1d5db" } },
        y: { ticks: { color: "#d1d5db" } },
      },
    },
  });

  typeChart = new Chart(document.getElementById("typeChart"), {
    type: "pie",
    data: {
      labels: Object.keys(types),
      datasets: [{ data: Object.values(types) }],
    },
    options: chartDefaults,
  });

  outcomeChart = new Chart(document.getElementById("outcomeChart"), {
    type: "pie",
    data: {
      labels: Object.keys(outcomes),
      datasets: [{ data: Object.values(outcomes) }],
    },
    options: chartDefaults,
  });
}

function renderTable(calls) {
  const topRows = [...calls]
    .sort((a, b) => new Date(b.start_at) - new Date(a.start_at))
    .slice(0, 300);

  tableBodyEl.innerHTML = topRows
    .map(
      (c) => `
      <tr>
        <td>${new Date(c.start_at).toLocaleString()}</td>
        <td><a href="${c.url || "#"}" target="_blank" rel="noreferrer">${c.subject || "-"}</a></td>
        <td>${c.type?.label || "-"}</td>
        <td>${c.outcome?.label || "-"}</td>
        <td>${((c.duration || 0) / 60).toFixed(1)}</td>
        <td>${c.state || "-"}</td>
        <td>${c.organizer_email || "-"}</td>
      </tr>
    `
    )
    .join("");
}

loadBtn.addEventListener("click", async () => {
  const token = tokenEl.value.trim();
  if (!token) {
    statusEl.textContent = "Please provide an API token.";
    return;
  }

  statusEl.textContent = "Loading calls...";
  loadBtn.disabled = true;

  try {
    const calls = await fetchAllMeetings(token, fromDateEl.value, toDateEl.value);
    renderKPIs(calls);
    renderCharts(calls);
    renderTable(calls);
    statusEl.textContent = `Loaded ${calls.length.toLocaleString()} calls.`;
  } catch (error) {
    statusEl.textContent = `Failed to load calls: ${error.message}`;
  } finally {
    loadBtn.disabled = false;
  }
});
