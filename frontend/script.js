const map = L.map('map').setView([13.0827, 80.2707], 13);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors'
}).addTo(map);

const mockReports = [
  { id: 1, lat: 13.0827, lng: 80.2707, hazard_type: "Flood", severity: "High", confidence: 0.91 },
  { id: 2, lat: 13.0067, lng: 80.2206, hazard_type: "Fire", severity: "Medium", confidence: 0.78 },
  { id: 3, lat: 13.0475, lng: 80.2824, hazard_type: "Landslide", severity: "Low", confidence: 0.65 },
  { id: 4, lat: 13.0358, lng: 80.2297, hazard_type: "Flood", severity: "High", confidence: 0.88 }
];

function getSeverityColor(severity) {
  switch (severity) {
    case 'High': return 'red';
    case 'Medium': return 'orange';
    case 'Low': return 'green';
    default: return 'blue';
  }
}

mockReports.forEach(report => {
  L.circleMarker([report.lat, report.lng], {
    radius: 10,
    fillColor: getSeverityColor(report.severity),
    color: '#333',
    weight: 1,
    fillOpacity: 0.9
  })
    .addTo(map)
    .bindPopup(`
      <b>${report.hazard_type}</b><br>
      Severity: ${report.severity}<br>
      Confidence: ${(report.confidence * 100).toFixed(0)}%
    `);
});

document.getElementById('reportForm').addEventListener('submit', function(e) {
  e.preventDefault();
  const image = document.getElementById('reportImage').files[0];
  const lat = document.getElementById('lat').value;
  const lng = document.getElementById('lng').value;
  console.log('Report submitted:', { image, lat, lng });
});