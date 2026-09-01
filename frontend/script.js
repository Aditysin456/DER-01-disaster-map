const map = L.map('map').setView([13.0827, 80.2707], 13);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors'
}).addTo(map);

const DB_NAME = 'der01_offline_queue';
const STORE_NAME = 'pending_reports';

function openQueueDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = function(e) {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'queueId', autoIncrement: true });
      }
    };
    request.onsuccess = function(e) { resolve(e.target.result); };
    request.onerror = function(e) { reject(e.target.error); };
  });
}

async function queueReport(entry) {
  const db = await openQueueDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).add(entry);
    tx.oncomplete = () => resolve();
    tx.onerror = (e) => reject(e.target.error);
  });
}

async function getAllQueuedReports() {
  const db = await openQueueDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = (e) => reject(e.target.error);
  });
}

async function deleteQueuedReport(queueId) {
  const db = await openQueueDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(queueId);
    tx.oncomplete = () => resolve();
    tx.onerror = (e) => reject(e.target.error);
  });
}

function updateQueueBadge(count) {
  const badge = document.getElementById('queueBadge');
  if (!badge) return;
  if (count > 0) {
    badge.style.display = 'block';
    badge.textContent = `${count} report(s) queued offline`;
  } else {
    badge.style.display = 'none';
  }
}

async function refreshQueueBadge() {
  const queued = await getAllQueuedReports();
  updateQueueBadge(queued.length);
}

async function syncQueuedReports() {
  let queued = await getAllQueuedReports();
  if (queued.length === 0) return;

  queued.sort((a, b) => (a.captured_at || '').localeCompare(b.captured_at || ''));

  for (const entry of queued) {
    const formData = new FormData();
    if (entry.image) formData.append('image', entry.image, entry.imageName || 'image.jpg');
    if (entry.thermal_image) formData.append('thermal_image', entry.thermal_image, entry.thermalImageName || 'thermal.jpg');
    formData.append('lat', entry.lat);
    formData.append('lon', entry.lon);
    formData.append('source', entry.source);
    if (entry.captured_at) formData.append('captured_at', entry.captured_at);

    try {
      const res = await fetch('http://localhost:8000/api/reports', { method: 'POST', body: formData });
      if (!res.ok) {
        console.error('Queued report rejected by server, leaving in queue:', await res.text());
        continue;
      }
      await deleteQueuedReport(entry.queueId);
    } catch (err) {
      console.error('Still offline, stopping sync:', err);
      break;
    }
  }

  await refreshQueueBadge();
  loadReports();
}

window.addEventListener('online', syncQueuedReports);
window.addEventListener('load', () => {
  refreshQueueBadge();
  syncQueuedReports();
});

function getSeverityColor(severity) {
  switch (severity) {
    case 'High': return 'red';
    case 'Medium': return 'orange';
    case 'Low': return 'green';
    default: return 'blue';
  }
}

function buildPopupContent(report) {
  const hazard = report.hazard_type || 'Unknown';
  const severity = report.severity || 'Unknown';
  const confidence = typeof report.confidence === 'number' ? (report.confidence * 100).toFixed(0) + '%' : 'N/A';
  const image = report.image_url
    ? `<img src="${report.image_url}" style="width:100%; border-radius:4px; margin-bottom:6px;" onerror="this.style.display='none'">`
    : '';
  const lowConfidenceFlag = (typeof report.confidence === 'number' && report.confidence < 0.5)
    ? '<div style="color:#e94560; font-size:11px; margin-top:4px;">⚠️ Low confidence — needs review</div>'
    : '';
  const thermalInfo = (report.source === 'drone' && report.humans_detected !== null && report.humans_detected !== undefined)
    ? `<div style="margin-top:6px; padding-top:6px; border-top:1px solid #444;">
         🌡️ Thermal: ${report.humans_detected ? `<b style="color:#e94560;">${report.human_count_estimate} human(s) detected</b>` : 'No humans detected'}
         <br>Thermal confidence: ${(report.thermal_confidence * 100).toFixed(0)}%
       </div>`
    : '';
  const sourceTag = report.source ? `<div style="font-size:11px; color:#888; margin-top:4px;">Source: ${report.source}</div>` : '';

  return `
    <div style="font-family: sans-serif; min-width: 160px;">
      ${image}
      <b>${hazard}</b><br>
      Severity: <b style="color:${getSeverityColor(severity)}">${severity}</b><br>
      Confidence: ${confidence}
      ${lowConfidenceFlag}
      ${thermalInfo}
      ${sourceTag}
    </div>
  `;
}

const renderedReportIds = new Set();

function loadReports() {
  fetch('http://localhost:8000/api/reports')
    .then(res => res.json())
    .then(reports => {
      reports.forEach(report => {
        if (renderedReportIds.has(report.id)) return;
        renderedReportIds.add(report.id);

        if (report.lat === null || report.lat === undefined || report.lon === null || report.lon === undefined) return;

        L.circleMarker([report.lat, report.lon], {
          radius: 10,
          fillColor: getSeverityColor(report.severity),
          color: '#333',
          weight: 1,
          fillOpacity: 0.9
        })
          .addTo(map)
          .bindPopup(buildPopupContent(report));
      });
    })
    .catch(err => console.error('Failed to load reports:', err));
}

loadReports();
setInterval(loadReports, 8000);

function tryBrowserGeolocation() {
  if (!navigator.geolocation) return;
  navigator.geolocation.getCurrentPosition(
    function(pos) {
      document.getElementById('lat').value = pos.coords.latitude.toFixed(6);
      document.getElementById('lng').value = pos.coords.longitude.toFixed(6);
      document.getElementById('gpsSourceNote').textContent = 'GPS: from device location';
    },
    function() {
      document.getElementById('gpsSourceNote').textContent = 'GPS: enter manually';
    }
  );
}

document.getElementById('reportImage').addEventListener('change', function(e) {
  const file = e.target.files[0];
  const fileName = file?.name || 'Upload Photo';
  document.getElementById('fileNameDisplay').textContent = fileName;

  if (!file) return;

  document.getElementById('gpsSourceNote').textContent = 'GPS: checking photo...';

  EXIF.getData(file, function() {
    const lat = EXIF.getTag(this, 'GPSLatitude');
    const latRef = EXIF.getTag(this, 'GPSLatitudeRef');
    const lon = EXIF.getTag(this, 'GPSLongitude');
    const lonRef = EXIF.getTag(this, 'GPSLongitudeRef');

    if (lat && lon && latRef && lonRef) {
      const toDecimal = (dms, ref) => {
        const decimal = dms[0] + dms[1] / 60 + dms[2] / 3600;
        return (ref === 'S' || ref === 'W') ? -decimal : decimal;
      };
      const latDecimal = toDecimal(lat, latRef);
      const lonDecimal = toDecimal(lon, lonRef);
      document.getElementById('lat').value = latDecimal.toFixed(6);
      document.getElementById('lng').value = lonDecimal.toFixed(6);
      document.getElementById('gpsSourceNote').textContent = 'GPS: from photo';
    } else {
      document.getElementById('gpsSourceNote').textContent = 'GPS: not in photo, trying device...';
      tryBrowserGeolocation();
    }
  });
});

document.getElementById('thermalImage').addEventListener('change', function(e) {
  const fileName = e.target.files[0]?.name || 'Upload Thermal Image';
  document.getElementById('thermalFileNameDisplay').textContent = fileName;
});

document.getElementById('sourceSwitch').addEventListener('change', function() {
  const isDrone = this.checked;
  document.getElementById('labelMobile').style.fontWeight = isDrone ? 'normal' : 'bold';
  document.getElementById('labelMobile').style.color = isDrone ? '#888' : '#000';
  document.getElementById('labelDrone').style.fontWeight = isDrone ? 'bold' : 'normal';
  document.getElementById('labelDrone').style.color = isDrone ? '#000' : '#888';
  document.getElementById('thermalImageLabel').style.display = isDrone ? 'flex' : 'none';
  if (!isDrone) {
    document.getElementById('thermalImage').value = '';
    document.getElementById('thermalFileNameDisplay').textContent = 'Upload Thermal Image';
  }
});

document.getElementById('reportForm').addEventListener('submit', function(e) {
  e.preventDefault();
  const image = document.getElementById('reportImage').files[0];
  const lat = parseFloat(document.getElementById('lat').value);
  const lng = parseFloat(document.getElementById('lng').value);
  const source = document.getElementById('sourceSwitch').checked ? 'drone' : 'mobile';
  const thermalImage = document.getElementById('thermalImage').files[0];

  if (source === 'mobile' && !image) return alert('Please choose an image.');
  if (source === 'drone' && !image && !thermalImage) return alert('Please upload a normal image, a thermal image, or both.');
  if (image && image.size > 10 * 1024 * 1024) return alert('Normal image must be under 10MB.');
  if (image && !image.type.startsWith('image/')) return alert('Normal file must be an image.');
  if (thermalImage && thermalImage.size > 10 * 1024 * 1024) return alert('Thermal image must be under 10MB.');
  if (thermalImage && !thermalImage.type.startsWith('image/')) return alert('Thermal file must be an image.');
  if (isNaN(lat) || lat < -90 || lat > 90) return alert('Latitude must be between -90 and 90.');
  if (isNaN(lng) || lng < -180 || lng > 180) return alert('Longitude must be between -180 and 180.');

  const capturedAt = new Date().toISOString();

  const formData = new FormData();
  if (image) formData.append('image', image);
  formData.append('lat', lat);
  formData.append('lon', lng);
  formData.append('source', source);
  formData.append('captured_at', capturedAt);
  if (thermalImage) {
    formData.append('thermal_image', thermalImage);
  }

  fetch('http://localhost:8000/api/reports', {
    method: 'POST',
    body: formData
  })
    .then(res => {
      if (!res.ok) return res.json().then(err => { throw new Error(err.detail || 'Submit failed'); });
      return res.json();
    })
    .then(data => {
      console.log('Success:', data);
      alert('Report submitted!');
      location.reload();
    })
    .catch(async (err) => {
      const isNetworkError = err instanceof TypeError;
      if (isNetworkError) {
        await queueReport({
          image: image || null,
          imageName: image ? image.name : null,
          thermal_image: thermalImage || null,
          thermalImageName: thermalImage ? thermalImage.name : null,
          lat: lat,
          lon: lng,
          source: source,
          captured_at: capturedAt
        });
        await refreshQueueBadge();
        alert('No connection — report saved offline and will be sent automatically once you\'re back online.');
        e.target.reset();
        document.getElementById('fileNameDisplay').textContent = 'Upload Photo';
        document.getElementById('thermalFileNameDisplay').textContent = 'Upload Thermal Image';
        document.getElementById('thermalImageLabel').style.display = 'none';
      } else {
        console.error('Submit failed:', err);
        alert('Failed to submit report: ' + err.message);
      }
    });
});
