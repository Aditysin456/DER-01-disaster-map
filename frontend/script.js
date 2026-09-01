const map = L.map('map').setView([13.0827, 80.2707], 13);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors'
}).addTo(map);

document.getElementById('reportForm').addEventListener('submit', function(e) {
  e.preventDefault();
  const image = document.getElementById('reportImage').files[0];
  const lat = document.getElementById('lat').value;
  const lng = document.getElementById('lng').value;
  console.log('Report submitted:', { image, lat, lng });
});