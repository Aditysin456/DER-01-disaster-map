const accessOverlay =
  document.getElementById("accessOverlay");

const accessCloseBtn =
  document.getElementById("accessCloseBtn");

const accessApplyBtn =
  document.getElementById("accessApplyBtn");

const map = L.map("map").setView(
  [13.0827, 80.2707],
  13
);

L.tileLayer(
  "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  {
    attribution:
      "© OpenStreetMap contributors"
  }
).addTo(map);

const pointerCursor =
  document.getElementById("pointerCursor");

const latInput =
  document.getElementById("lat");

const lngInput =
  document.getElementById("lng");

const gpsSourceNote =
  document.getElementById("gpsSourceNote");

const currentLat =
  document.getElementById("currentLat");

const currentLon =
  document.getElementById("currentLon");

const reportImage =
  document.getElementById("reportImage");

const fileNameDisplay =
  document.getElementById("fileNameDisplay");

const thermalImage =
  document.getElementById("thermalImage");

const thermalImageLabel =
  document.getElementById("thermalImageLabel");

const thermalFileNameDisplay =
  document.getElementById(
    "thermalFileNameDisplay"
  );

const sourceSwitch =
  document.getElementById("sourceSwitch");

const tabMobile =
  document.getElementById("tabMobile");

const tabDrone =
  document.getElementById("tabDrone");

const reportForm =
  document.getElementById("reportForm");

let selectedLat = null;
let selectedLon = null;

const renderedReportIds =
  new Set();

const DB_NAME =
  "der01_offline_queue";

const STORE_NAME =
  "pending_reports";

function updateCurrentLocation(
  lat,
  lon
) {
  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lon)
  ) {
    return;
  }

  if (currentLat) {
    currentLat.textContent =
      `${Math.abs(lat).toFixed(5)}° ${lat >= 0 ? "N" : "S"}`;
  }

  if (currentLon) {
    currentLon.textContent =
      `${Math.abs(lon).toFixed(5)}° ${lon >= 0 ? "E" : "W"}`;
  }
}

function setGPSStatus(
  message
) {
  if (gpsSourceNote) {
    gpsSourceNote.textContent =
      message;
  }
}

function setSelectedLocation(
  lat,
  lon
) {
  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lon)
  ) {
    return;
  }

  selectedLat = lat;
  selectedLon = lon;

  if (latInput) {
    latInput.value =
      lat.toFixed(6);
  }

  if (lngInput) {
    lngInput.value =
      lon.toFixed(6);
  }

  updateCurrentLocation(
    lat,
    lon
  );

  setGPSStatus(
    `Pointer: ${lat.toFixed(6)}, ${lon.toFixed(6)}`
  );
}

function handlePointerOnMap(
  event
) {
  const rect =
    map.getContainer()
      .getBoundingClientRect();

  const clientX =
    event.clientX;

  const clientY =
    event.clientY;

  if (
    clientX < rect.left ||
    clientX > rect.right ||
    clientY < rect.top ||
    clientY > rect.bottom
  ) {
    return;
  }

  const latlng =
    map.mouseEventToLatLng(
      event
    );

  setSelectedLocation(
    latlng.lat,
    latlng.lng
  );

  if (pointerCursor) {
    pointerCursor.style.display =
      "block";

    pointerCursor.style.left =
      `${clientX}px`;

    pointerCursor.style.top =
      `${clientY}px`;
  }
}

const mapContainer =
  map.getContainer();

mapContainer.addEventListener(
  "pointermove",
  handlePointerOnMap
);

mapContainer.addEventListener(
  "pointerdown",
  handlePointerOnMap
);

mapContainer.addEventListener(
  "pointerenter",
  event => {
    if (pointerCursor) {
      pointerCursor.style.display =
        "block";
    }

    handlePointerOnMap(event);
  }
);

mapContainer.addEventListener(
  "pointerleave",
  () => {
    if (
      pointerCursor &&
      window.matchMedia(
        "(hover: hover)"
      ).matches
    ) {
      pointerCursor.style.display =
        "none";
    }
  }
);

mapContainer.addEventListener(
  "touchstart",
  event => {
    if (
      event.touches &&
      event.touches.length
    ) {
      handlePointerOnMap(
        event.touches[0]
      );
    }
  },
  {
    passive: true
  }
);

mapContainer.addEventListener(
  "touchmove",
  event => {
    if (
      event.touches &&
      event.touches.length
    ) {
      handlePointerOnMap(
        event.touches[0]
      );
    }
  },
  {
    passive: true
  }
);

function openQueueDB() {
  return new Promise(
    (resolve, reject) => {
      const request =
        indexedDB.open(
          DB_NAME,
          1
        );

      request.onupgradeneeded =
        event => {
          const db =
            event.target.result;

          if (
            !db.objectStoreNames.contains(
              STORE_NAME
            )
          ) {
            db.createObjectStore(
              STORE_NAME,
              {
                keyPath:
                  "queueId",
                autoIncrement:
                  true
              }
            );
          }
        };

      request.onsuccess =
        event => {
          resolve(
            event.target.result
          );
        };

      request.onerror =
        event => {
          reject(
            event.target.error
          );
        };
    }
  );
}

async function queueReport(
  entry
) {
  const db =
    await openQueueDB();

  return new Promise(
    (resolve, reject) => {
      const transaction =
        db.transaction(
          STORE_NAME,
          "readwrite"
        );

      transaction
        .objectStore(
          STORE_NAME
        )
        .add(entry);

      transaction.oncomplete =
        () => resolve();

      transaction.onerror =
        event =>
          reject(
            event.target.error
          );
    }
  );
}

async function getAllQueuedReports() {
  const db =
    await openQueueDB();

  return new Promise(
    (resolve, reject) => {
      const transaction =
        db.transaction(
          STORE_NAME,
          "readonly"
        );

      const request =
        transaction
          .objectStore(
            STORE_NAME
          )
          .getAll();

      request.onsuccess =
        () => {
          resolve(
            request.result
          );
        };

      request.onerror =
        event =>
          reject(
            event.target.error
          );
    }
  );
}

async function deleteQueuedReport(
  queueId
) {
  const db =
    await openQueueDB();

  return new Promise(
    (resolve, reject) => {
      const transaction =
        db.transaction(
          STORE_NAME,
          "readwrite"
        );

      transaction
        .objectStore(
          STORE_NAME
        )
        .delete(queueId);

      transaction.oncomplete =
        () => resolve();

      transaction.onerror =
        event =>
          reject(
            event.target.error
          );
    }
  );
}

function updateQueueBadge(
  count
) {
  const badge =
    document.getElementById(
      "queueBadge"
    );

  if (!badge) {
    return;
  }

  if (count > 0) {
    badge.style.display =
      "block";

    badge.textContent =
      `${count} report(s) queued offline`;
  } else {
    badge.style.display =
      "none";
  }
}

async function refreshQueueBadge() {
  try {
    const queued =
      await getAllQueuedReports();

    updateQueueBadge(
      queued.length
    );
  } catch (error) {
    console.error(
      "Unable to refresh queue badge:",
      error
    );
  }
}

async function syncQueuedReports() {
  let queued;

  try {
    queued =
      await getAllQueuedReports();
  } catch (error) {
    console.error(
      "Unable to read offline queue:",
      error
    );

    return;
  }

  if (queued.length === 0) {
    return;
  }

  queued.sort(
    (a, b) =>
      (a.captured_at || "")
        .localeCompare(
          b.captured_at || ""
        )
  );

  for (const entry of queued) {
    const formData =
      new FormData();

    if (entry.image) {
      formData.append(
        "image",
        entry.image,
        entry.imageName ||
          "image.jpg"
      );
    }

    if (entry.thermal_image) {
      formData.append(
        "thermal_image",
        entry.thermal_image,
        entry.thermalImageName ||
          "thermal.jpg"
      );
    }

    formData.append(
      "lat",
      entry.lat
    );

    formData.append(
      "lon",
      entry.lon
    );

    formData.append(
      "source",
      entry.source
    );

    formData.append(
      "captured_at",
      entry.captured_at
    );

    try {
      const response =
        await fetch(
          "http://localhost:8000/api/reports",
          {
            method: "POST",
            body: formData
          }
        );

      if (!response.ok) {
        console.error(
          "Queued report rejected:",
          await response.text()
        );

        continue;
      }

      await deleteQueuedReport(
        entry.queueId
      );
    } catch (error) {
      console.error(
        "Still offline:",
        error
      );

      break;
    }
  }

  await refreshQueueBadge();
  loadReports();
}

function getSeverityColor(
  severity
) {
  switch (severity) {
    case "High":
      return "red";

    case "Medium":
      return "orange";

    case "Low":
      return "green";

    default:
      return "blue";
  }
}

function buildPopupContent(
  report
) {
  const hazard =
    report.hazard_type ||
    "Unknown";

  const severity =
    report.severity ||
    "Unknown";

  const confidence =
    typeof report.confidence ===
    "number"
      ? (
          report.confidence *
          100
        ).toFixed(0) + "%"
      : "N/A";

  const lowConfidenceFlag =
    typeof report.confidence ===
      "number" &&
    report.confidence < 0.5
      ? `
        <div
          style="
            color:#ff6678;
            font-size:11px;
            margin-top:5px;
          "
        >
          ⚠ Low confidence
        </div>
      `
      : "";

  const thermalInfo =
    report.source === "drone" &&
    report.humans_detected !==
      null &&
    report.humans_detected !==
      undefined
      ? `
        <div
          style="
            margin-top:8px;
            padding-top:8px;
            border-top:1px solid rgba(255,255,255,.1);
          "
        >
          Thermal:
          ${
            report.humans_detected
              ? `
                <b style="color:#ff5367;">
                  ${report.human_count_estimate}
                  human(s) detected
                </b>
              `
              : "No humans detected"
          }

          <br>

          Thermal confidence:
          ${
            typeof report.thermal_confidence ===
            "number"
              ? (
                  report.thermal_confidence *
                  100
                ).toFixed(0) + "%"
              : "N/A"
          }
        </div>
      `
      : "";

  const sourceTag =
    report.source
      ? `
        <div
          style="
            font-size:10px;
            color:#74828e;
            margin-top:6px;
            font-family:'JetBrains Mono',monospace;
          "
        >
          SOURCE: ${report.source}
        </div>
      `
      : "";

  return `
    <div
      style="
        min-width:180px;
        font-family:'Inter',sans-serif;
        line-height:1.6;
      "
    >
      <div
        style="
          font-size:14px;
          font-weight:700;
          margin-bottom:3px;
        "
      >
        ${hazard}
      </div>

      <div>
        Severity:
        <b
          style="
            color:${getSeverityColor(
              severity
            )};
          "
        >
          ${severity}
        </b>
      </div>

      <div>
        Confidence:
        <b>${confidence}</b>
      </div>

      ${lowConfidenceFlag}
      ${thermalInfo}
      ${sourceTag}
    </div>
  `;
}

function addReportMarker(
  report,
  openPopup = false
) {
  if (
    !report ||
    report.id === undefined ||
    report.lat === undefined ||
    report.lon === undefined
  ) {
    return;
  }

  if (
    report.lat === null ||
    report.lon === null
  ) {
    return;
  }

  if (
    renderedReportIds.has(
      report.id
    )
  ) {
    return;
  }

  const marker =
    L.circleMarker(
      [
        Number(report.lat),
        Number(report.lon)
      ],
      {
        radius: 10,
        fillColor:
          getSeverityColor(
            report.severity
          ),
        color: "#ffffff",
        weight: 2,
        fillOpacity: 0.9
      }
    );

  marker
    .addTo(map)
    .bindPopup(
      buildPopupContent(
        report
      )
    );

  renderedReportIds.add(
    report.id
  );

  if (openPopup) {
    marker.openPopup();
  }
}

function loadReports() {
  fetch(
    "http://localhost:8000/api/reports"
  )
    .then(response => {
      if (!response.ok) {
        throw new Error(
          "Failed to load reports"
        );
      }

      return response.json();
    })
    .then(reports => {
      if (
        !Array.isArray(reports)
      ) {
        return;
      }

      reports.forEach(
        report => {
          addReportMarker(
            report
          );
        }
      );
    })
    .catch(error => {
      console.error(
        "Failed to load reports:",
        error
      );
    });
}

function requestDeviceLocation(
  centerMap = false
) {
  if (!navigator.geolocation) {
    setGPSStatus(
      "GPS unavailable"
    );

    return;
  }

  setGPSStatus(
    "Requesting device location..."
  );

  navigator.geolocation.getCurrentPosition(
    position => {
      const lat =
        position.coords.latitude;

      const lon =
        position.coords.longitude;

      updateCurrentLocation(
        lat,
        lon
      );

      if (centerMap) {
        map.setView(
          [lat, lon],
          15
        );
      }

      setGPSStatus(
        "GPS ready. Move pointer over map"
      );
    },
    () => {
      setGPSStatus(
        selectedLat !== null
          ? `Pointer: ${selectedLat.toFixed(6)}, ${selectedLon.toFixed(6)}`
          : "GPS unavailable"
      );
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 30000
    }
  );
}

function getPhotoGPS(
  file
) {
  return new Promise(
    resolve => {
      if (
        !file ||
        typeof EXIF ===
          "undefined"
      ) {
        resolve(null);
        return;
      }

      try {
        EXIF.getData(
          file,
          function () {
            const lat =
              EXIF.getTag(
                this,
                "GPSLatitude"
              );

            const latRef =
              EXIF.getTag(
                this,
                "GPSLatitudeRef"
              );

            const lon =
              EXIF.getTag(
                this,
                "GPSLongitude"
              );

            const lonRef =
              EXIF.getTag(
                this,
                "GPSLongitudeRef"
              );

            if (
              !lat ||
              !lon ||
              !latRef ||
              !lonRef
            ) {
              resolve(null);
              return;
            }

            const toDecimal =
              (dms, ref) => {
                const decimal =
                  dms[0] +
                  dms[1] / 60 +
                  dms[2] / 3600;

                return (
                  ref === "S" ||
                  ref === "W"
                )
                  ? -decimal
                  : decimal;
              };

            resolve({
              lat: toDecimal(
                lat,
                latRef
              ),
              lon: toDecimal(
                lon,
                lonRef
              )
            });
          }
        );
      } catch (error) {
        resolve(null);
      }
    }
  );
}

if (reportImage) {
  reportImage.addEventListener(
    "change",
    async event => {
      const file =
        event.target.files[0];

      if (!file) {
        fileNameDisplay.textContent =
          "Upload Photo";

        return;
      }

      fileNameDisplay.textContent =
        file.name;

      setGPSStatus(
        "Checking photo GPS..."
      );

      const photoGPS =
        await getPhotoGPS(
          file
        );

      if (photoGPS) {
        setSelectedLocation(
          photoGPS.lat,
          photoGPS.lon
        );

        updateCurrentLocation(
          photoGPS.lat,
          photoGPS.lon
        );

        setGPSStatus(
          "GPS: from photo"
        );
      } else {
        requestDeviceLocation();
      }
    }
  );
}

async function startCamera() {
  if (
    !navigator.mediaDevices ||
    !navigator.mediaDevices
      .getUserMedia
  ) {
    alert(
      "Camera access is not supported in this browser."
    );

    return;
  }

  let stream = null;

  try {
    stream =
      await navigator.mediaDevices.getUserMedia(
        {
          video: {
            facingMode: {
              ideal: "environment"
            }
          },
          audio: false
        }
      );

    const cameraModal =
      document.createElement(
        "div"
      );

    cameraModal.id =
      "cameraModal";

    cameraModal.innerHTML = `
      <div id="cameraBox">

        <video
          id="cameraPreview"
          autoplay
          playsinline
        ></video>

        <div id="cameraActions">

          <button
            type="button"
            id="takePhotoBtn"
          >
            Take Photo
          </button>

          <button
            type="button"
            id="closeCameraBtn"
          >
            Cancel
          </button>

        </div>

      </div>
    `;

    document.body.appendChild(
      cameraModal
    );

    const preview =
      document.getElementById(
        "cameraPreview"
      );

    preview.srcObject =
      stream;

    await preview.play();

    const closeCamera =
      () => {
        if (stream) {
          stream
            .getTracks()
            .forEach(
              track =>
                track.stop()
            );
        }

        cameraModal.remove();
      };

    document
      .getElementById(
        "closeCameraBtn"
      )
      .addEventListener(
        "click",
        closeCamera
      );

    document
      .getElementById(
        "takePhotoBtn"
      )
      .addEventListener(
        "click",
        () => {
          if (
            !preview.videoWidth ||
            !preview.videoHeight
          ) {
            alert(
              "Camera is still starting."
            );

            return;
          }

          const canvas =
            document.createElement(
              "canvas"
            );

          canvas.width =
            preview.videoWidth;

          canvas.height =
            preview.videoHeight;

          const context =
            canvas.getContext(
              "2d"
            );

          context.drawImage(
            preview,
            0,
            0,
            canvas.width,
            canvas.height
          );

          canvas.toBlob(
            blob => {
              if (!blob) {
                alert(
                  "Unable to capture photo."
                );

                return;
              }

              const file =
                new File(
                  [blob],
                  `camera-${Date.now()}.jpg`,
                  {
                    type:
                      "image/jpeg"
                  }
                );

              const dataTransfer =
                new DataTransfer();

              dataTransfer.items.add(
                file
              );

              reportImage.files =
                dataTransfer.files;

              reportImage.dispatchEvent(
                new Event(
                  "change",
                  {
                    bubbles:
                      true
                  }
                )
              );

              closeCamera();
            },
            "image/jpeg",
            0.9
          );
        }
      );
  } catch (error) {
    if (stream) {
      stream
        .getTracks()
        .forEach(
          track =>
            track.stop()
        );
    }

    alert(
      "Unable to access the camera. Please allow camera permission in Microsoft Edge."
    );
  }
}

const openCameraBtn =
  document.getElementById(
    "openCameraBtn"
  );

if (openCameraBtn) {
  openCameraBtn.addEventListener(
    "click",
    startCamera
  );
}

const uploadGalleryBtn =
  document.getElementById(
    "uploadGalleryBtn"
  );

if (uploadGalleryBtn) {
  uploadGalleryBtn.addEventListener(
    "click",
    () => {
      reportImage.removeAttribute(
        "capture"
      );

      reportImage.click();
    }
  );
}

if (thermalImage) {
  thermalImage.addEventListener(
    "change",
    event => {
      const file =
        event.target.files[0];

      if (
        thermalFileNameDisplay
      ) {
        thermalFileNameDisplay.textContent =
          file?.name ||
          "Upload Thermal Image";
      }
    }
  );
}

function setSourceMode(
  isDrone
) {
  if (sourceSwitch) {
    sourceSwitch.checked =
      isDrone;
  }

  if (tabMobile) {
    tabMobile.classList.toggle(
      "sourceTabActive",
      !isDrone
    );

    tabMobile.setAttribute(
      "aria-selected",
      String(!isDrone)
    );
  }

  if (tabDrone) {
    tabDrone.classList.toggle(
      "sourceTabActive",
      isDrone
    );

    tabDrone.setAttribute(
      "aria-selected",
      String(isDrone)
    );
  }

  if (thermalImageLabel) {
    thermalImageLabel.style.display =
      isDrone
        ? "flex"
        : "none";
  }

  if (
    !isDrone &&
    thermalImage
  ) {
    thermalImage.value = "";

    if (
      thermalFileNameDisplay
    ) {
      thermalFileNameDisplay.textContent =
        "Upload Thermal Image";
    }
  }
}

if (tabMobile) {
  tabMobile.addEventListener(
    "click",
    () => {
      setSourceMode(
        false
      );
    }
  );
}

if (tabDrone) {
  tabDrone.addEventListener(
    "click",
    () => {
      setSourceMode(
        true
      );
    }
  );
}

if (sourceSwitch) {
  sourceSwitch.addEventListener(
    "change",
    () => {
      setSourceMode(
        sourceSwitch.checked
      );
    }
  );
}

const refreshGpsBtn =
  document.getElementById(
    "refreshGpsBtn"
  );

if (refreshGpsBtn) {
  refreshGpsBtn.addEventListener(
    "click",
    () => {
      refreshGpsBtn.classList.add(
        "is-loading"
      );

      requestDeviceLocation(
        true
      );

      setTimeout(
        () => {
          refreshGpsBtn.classList.remove(
            "is-loading"
          );
        },
        1000
      );
    }
  );
}

const locateBtn =
  document.getElementById(
    "locateBtn"
  );

if (locateBtn) {
  locateBtn.addEventListener(
    "click",
    () => {
      locateBtn.classList.add(
        "located"
      );

      requestDeviceLocation(
        true
      );

      setTimeout(
        () => {
          locateBtn.classList.remove(
            "located"
          );
        },
        1200
      );
    }
  );
}

const copyLocationBtn =
  document.getElementById(
    "copyLocationBtn"
  );

if (copyLocationBtn) {
  copyLocationBtn.addEventListener(
    "click",
    async () => {
      if (
        selectedLat === null ||
        selectedLon === null
      ) {
        alert(
          "Move the pointer over the map first."
        );

        return;
      }

      try {
        await navigator.clipboard.writeText(
          `${selectedLat.toFixed(6)}, ${selectedLon.toFixed(6)}`
        );

        copyLocationBtn.classList.add(
          "copied"
        );

        setTimeout(
          () => {
            copyLocationBtn.classList.remove(
              "copied"
            );
          },
          1000
        );
      } catch (error) {
        console.error(
          "Unable to copy coordinates:",
          error
        );
      }
    }
  );
}

if (accessCloseBtn) {
  accessCloseBtn.addEventListener(
    "click",
    () => {
      accessOverlay.classList.add(
        "hidden"
      );
    }
  );
}

if (accessApplyBtn) {
  accessApplyBtn.addEventListener(
    "click",
    async () => {
      const wantsCamera =
        document.getElementById(
          "permCamera"
        )?.checked;

      const wantsLocation =
        document.getElementById(
          "permLocation"
        )?.checked;

      if (
        wantsCamera &&
        navigator.mediaDevices?.getUserMedia
      ) {
        try {
          const stream =
            await navigator.mediaDevices.getUserMedia(
              {
                video: true
              }
            );

          stream
            .getTracks()
            .forEach(
              track =>
                track.stop()
            );
        } catch (error) {}
      }

      if (
        wantsLocation &&
        navigator.geolocation
      ) {
        requestDeviceLocation();
      }

      accessOverlay.classList.add(
        "hidden"
      );
    }
  );
}

if (reportForm) {
  reportForm.addEventListener(
    "submit",
    async event => {
      event.preventDefault();

      const image =
        reportImage?.files[0];

      const thermal =
        thermalImage?.files[0];

      const source =
        sourceSwitch?.checked
          ? "drone"
          : "mobile";

      if (
        source === "mobile" &&
        !image
      ) {
        alert(
          "Please capture or upload an image."
        );

        return;
      }

      if (
        source === "drone" &&
        !image &&
        !thermal
      ) {
        alert(
          "Please upload a normal image, a thermal image, or both."
        );

        return;
      }

      if (
        image &&
        image.size >
          10 * 1024 * 1024
      ) {
        alert(
          "Normal image must be under 10MB."
        );

        return;
      }

      if (
        thermal &&
        thermal.size >
          10 * 1024 * 1024
      ) {
        alert(
          "Thermal image must be under 10MB."
        );

        return;
      }

      if (
        selectedLat === null ||
        selectedLon === null
      ) {
        alert(
          "Move the pointer over the map to select the report location."
        );

        return;
      }

      const submitBtn =
        reportForm.querySelector(
          'button[type="submit"]'
        );

      const originalText =
        submitBtn.textContent;

      submitBtn.disabled =
        true;

      submitBtn.classList.add(
        "loading"
      );

      submitBtn.textContent =
        "Submitting";

      const capturedAt =
        new Date().toISOString();

      const formData =
        new FormData();

      if (image) {
        formData.append(
          "image",
          image
        );
      }

      formData.append(
        "lat",
        selectedLat
      );

      formData.append(
        "lon",
        selectedLon
      );

      formData.append(
        "source",
        source
      );

      formData.append(
        "captured_at",
        capturedAt
      );

      if (thermal) {
        formData.append(
          "thermal_image",
          thermal
        );
      }

      try {
        const response =
          await fetch(
            "http://localhost:8000/api/reports",
            {
              method: "POST",
              body: formData
            }
          );

        if (!response.ok) {
          let message =
            "Submit failed";

          try {
            const errorData =
              await response.json();

            message =
              errorData.detail ||
              message;
          } catch (error) {}

          throw new Error(
            message
          );
        }

        const data =
          await response.json();

        addReportMarker(
          data,
          true
        );

        alert(
          "Report submitted successfully!"
        );

        reportForm.reset();

        fileNameDisplay.textContent =
          "Upload Photo";

        thermalFileNameDisplay.textContent =
          "Upload Thermal Image";

        setSourceMode(
          false
        );

        setGPSStatus(
          selectedLat !== null &&
          selectedLon !== null
            ? `Pointer: ${selectedLat.toFixed(6)}, ${selectedLon.toFixed(6)}`
            : "Move pointer over map"
        );

        await refreshQueueBadge();
      } catch (error) {
        if (
          error instanceof TypeError
        ) {
          try {
            await queueReport({
              image:
                image || null,

              imageName:
                image
                  ? image.name
                  : null,

              thermal_image:
                thermal || null,

              thermalImageName:
                thermal
                  ? thermal.name
                  : null,

              lat:
                selectedLat,

              lon:
                selectedLon,

              source:
                source,

              captured_at:
                capturedAt
            });

            await refreshQueueBadge();

            alert(
              "No connection. Report saved offline and will sync automatically."
            );

            reportForm.reset();

            fileNameDisplay.textContent =
              "Upload Photo";

            thermalFileNameDisplay.textContent =
              "Upload Thermal Image";

            setSourceMode(
              false
            );
          } catch (queueError) {
            alert(
              "Unable to save the report offline."
            );
          }
        } else {
          console.error(
            "Submit failed:",
            error
          );

          alert(
            "Failed to submit report: " +
              error.message
          );
        }
      } finally {
        submitBtn.disabled =
          false;

        submitBtn.classList.remove(
          "loading"
        );

        submitBtn.textContent =
          originalText;
      }
    }
  );
}

window.addEventListener(
  "online",
  syncQueuedReports
);

window.addEventListener(
  "load",
  () => {
    refreshQueueBadge();
    syncQueuedReports();

    setTimeout(
      () => {
        requestDeviceLocation();
      },
      500
    );
  }
);

setSourceMode(false);

loadReports();

setInterval(
  loadReports,
  8000
);