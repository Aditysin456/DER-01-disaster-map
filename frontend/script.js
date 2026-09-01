const accessOverlay = document.getElementById("accessOverlay");
const accessCloseBtn = document.getElementById("accessCloseBtn");
const accessApplyBtn = document.getElementById("accessApplyBtn");

const map = L.map("map").setView(
  [13.0827, 80.2707],
  13
);

const normalLayer = L.tileLayer(
  "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  {
    attribution: "© OpenStreetMap contributors"
  }
);

const terrainLayer = L.tileLayer(
  "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
  {
    maxZoom: 17,
    attribution: "© OpenStreetMap contributors, © OpenTopoMap"
  }
);

const satelliteLayer = L.tileLayer(
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  {
    attribution: "Tiles © Esri"
  }
);

normalLayer.addTo(map);

const mapThemes = {
  normal: normalLayer,
  terrain: terrainLayer,
  satellite: satelliteLayer
};

const mapThemeNames = {
  normal: "Normal",
  terrain: "Terrain",
  satellite: "Satellite"
};

let activeMapTheme = normalLayer;

const dashboardHeader =
  document.getElementById("appHeader");

if (dashboardHeader) {
  const themeMenu =
    document.createElement("div");

  themeMenu.id = "mapThemeMenu";

  themeMenu.innerHTML = `
    <button
      type="button"
      id="mapThemeToggle"
      aria-label="Choose map theme"
      aria-expanded="false"
    >
      <span id="activeMapTheme">Normal</span>
      <span class="themeChevron">▾</span>
    </button>

    <div id="mapThemePanel">
      <div class="mapThemePanelHeading">
        <span>MAP THEMES</span>
        <span>SELECT VIEW</span>
      </div>

      <div class="mapThemeOptions">
        <button type="button" class="mapThemeOption is-active" data-theme="normal">
          <span class="themeIcon">⌘</span>
          <span>Normal</span>
        </button>

        <button type="button" class="mapThemeOption" data-theme="terrain">
          <span class="themeIcon">△</span>
          <span>Terrain</span>
        </button>

        <button type="button" class="mapThemeOption" data-theme="satellite">
          <span class="themeIcon">◉</span>
          <span>Satellite</span>
        </button>
      </div>
    </div>
  `;

  dashboardHeader.appendChild(themeMenu);

  const toggle =
    document.getElementById("mapThemeToggle");

  const panel =
    document.getElementById("mapThemePanel");

  const activeThemeLabel =
    document.getElementById("activeMapTheme");

  toggle.addEventListener("click", event => {
    event.stopPropagation();

    const isOpen =
      themeMenu.classList.toggle("is-open");

    toggle.setAttribute(
      "aria-expanded",
      String(isOpen)
    );

    document.body.classList.toggle(
      "map-theme-open",
      isOpen
    );
  });

  document.querySelectorAll(".mapThemeOption")
    .forEach(button => {
      button.addEventListener("click", () => {
        const theme =
          button.dataset.theme;

        const nextTheme =
          mapThemes[theme];

        if (
          nextTheme &&
          nextTheme !== activeMapTheme
        ) {
          map.removeLayer(activeMapTheme);
          nextTheme.addTo(map);
          activeMapTheme = nextTheme;
        }

        activeThemeLabel.textContent =
          mapThemeNames[theme];

        document
          .querySelectorAll(".mapThemeOption")
          .forEach(option =>
            option.classList.remove("is-active")
          );

        button.classList.add("is-active");

        themeMenu.classList.remove("is-open");

        document.body.classList.remove(
          "map-theme-open"
        );

        toggle.setAttribute(
          "aria-expanded",
          "false"
        );
      });
    });

  document.addEventListener("click", event => {
    if (!themeMenu.contains(event.target)) {
      themeMenu.classList.remove("is-open");

      document.body.classList.remove(
        "map-theme-open"
      );

      toggle.setAttribute(
        "aria-expanded",
        "false"
      );
    }
  });
}



const latInput = document.getElementById("lat");
const lngInput = document.getElementById("lng");
const gpsSourceNote = document.getElementById("gpsSourceNote");

const currentLat = document.getElementById("currentLat");
const currentLon = document.getElementById("currentLon");

const reportImage = document.getElementById("reportImage");
const fileNameDisplay = document.getElementById("fileNameDisplay");

const thermalImage = document.getElementById("thermalImage");
const thermalImageLabel =
  document.getElementById("thermalImageLabel");
const thermalFileNameDisplay =
  document.getElementById("thermalFileNameDisplay");

const sourceSwitch =
  document.getElementById("sourceSwitch");

const tabMobile =
  document.getElementById("tabMobile");

const tabDrone =
  document.getElementById("tabDrone");

const reportForm =
  document.getElementById("reportForm");

const renderedReportIds =
  new Set();

const DB_NAME =
  "der01_offline_queue";

const STORE_NAME =
  "pending_reports";

let latestLat = null;
let latestLon = null;

let isSyncingQueuedReports = false;

function setGPSStatus(message) {
  if (gpsSourceNote) {
    gpsSourceNote.textContent = message;
  }
}

function updateCurrentLocation(lat, lon) {
  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lon)
  ) {
    return;
  }

  latestLat = lat;
  latestLon = lon;

  if (latInput) {
    latInput.value = lat.toFixed(6);
  }

  if (lngInput) {
    lngInput.value = lon.toFixed(6);
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

function requestDeviceLocation(
  centerMap = false
) {
  if (!navigator.geolocation) {
    setGPSStatus("GPS unavailable");
    return Promise.reject(
      new Error(
        "Geolocation is not supported by this browser."
      )
    );
  }

  setGPSStatus(
    "Getting device location..."
  );

  return new Promise(
    (resolve, reject) => {
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

          setGPSStatus(
            "GPS: from device"
          );

          if (centerMap) {
            map.setView(
              [lat, lon],
              15
            );
          }

          resolve({
            lat,
            lon
          });
        },
        error => {
          setGPSStatus(
            "Device GPS unavailable"
          );

          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    }
  );
}

function getPhotoGPS(file) {
  return new Promise(resolve => {
    if (
      !file ||
      typeof EXIF === "undefined"
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
  });
}

async function getReportLocation(image) {
  try {
    return await requestDeviceLocation(false);
  } catch (gpsError) {
    if (image) {
      const photoGPS =
        await getPhotoGPS(image);

      if (photoGPS) {
        updateCurrentLocation(
          photoGPS.lat,
          photoGPS.lon
        );

        setGPSStatus(
          "GPS: from photo EXIF"
        );

        return photoGPS;
      }
    }

    return null;
  }
}

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

async function queueReport(entry) {
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

function updateQueueBadge(count) {
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
  if (isSyncingQueuedReports) {
    return;
  }

  isSyncingQueuedReports = true;

  try {
    let queued;

    try {
      queued = await getAllQueuedReports();
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

      formData.append("lat", entry.lat);
      formData.append("lon", entry.lon);
      formData.append("source", entry.source);

      if (entry.captured_at) {
        formData.append(
          "captured_at",
          entry.captured_at
        );
      }

      try {
        const response =
          await fetch(
            "/api/reports",
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

        /* Server accepted it: remove it from local queue immediately. */
        await deleteQueuedReport(
          entry.queueId
        );

        try {
          const data =
            await response.json();

          addReportMarker(data);
        } catch (error) {
          console.warn(
            "Report synced but response could not be displayed:",
            error
          );
        }
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
  } finally {
    isSyncingQueuedReports = false;
  }
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

  const thermalInfo =
    report.source === "drone" &&
    report.humans_detected !== null &&
    report.humans_detected !== undefined
      ? `
        <div
          style="
            margin-top:8px;
            padding-top:8px;
            border-top:1px solid rgba(255,255,255,.1);
          "
        >
          🌡 Thermal:
          ${
            report.humans_detected === false
              ? `
                <b style="color:#00ff88;">
                  No people detected
                </b>
              `
              : report.count_confident === true
                ? `
                  <b style="color:#ff5367;">
                    ${report.human_count_estimate}
                    ${
                      Number(
                        report.human_count_estimate
                      ) === 1
                        ? "person"
                        : "people"
                    }
                    detected
                  </b>
                `
                : `
                  <b style="color:#ffaa00;">
                    People detected
                    <span style="font-weight:500;">
                      (count uncertain)
                    </span>
                  </b>
                `
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

  const capturedAt =
    report.captured_at ||
    report.timestamp;

  const capturedInfo =
    capturedAt
      ? `
        <div
          style="
            font-size:10px;
            color:#74828e;
            margin-top:6px;
          "
        >
          TIME: ${capturedAt}
        </div>
      `
      : "";

  return `
    <div
      style="
        min-width:190px;
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

      ${thermalInfo}
      ${sourceTag}
      ${capturedInfo}

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
    report.lon === undefined ||
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

async function loadReports() {
  try {
    const response =
      await fetch(
        "/api/reports"
      );

    if (!response.ok) {
      throw new Error(
        "Failed to load reports"
      );
    }

    const reports =
      await response.json();

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
  } catch (error) {
    console.error(
      "Failed to load reports:",
      error
    );
  }
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

      const photoGPS =
        await getPhotoGPS(
          file
        );

      if (photoGPS) {
        updateCurrentLocation(
          photoGPS.lat,
          photoGPS.lon
        );

        setGPSStatus(
          "Photo GPS available. Device GPS used at submit"
        );
      } else {
        try {
          await requestDeviceLocation(
            false
          );
        } catch (error) {
          setGPSStatus(
            "Waiting for device GPS"
          );
        }
      }
    }
  );
}

async function startCamera() {
  if (
    !navigator.mediaDevices ||
    !navigator.mediaDevices.getUserMedia
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

const refreshGpsBtn =
  document.getElementById(
    "refreshGpsBtn"
  );

if (refreshGpsBtn) {
  refreshGpsBtn.addEventListener(
    "click",
    async () => {
      refreshGpsBtn.classList.add(
        "is-loading"
      );

      try {
        await requestDeviceLocation(
          false
        );
      } finally {
        setTimeout(
          () => {
            refreshGpsBtn.classList.remove(
              "is-loading"
            );
          },
          500
        );
      }
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
    async () => {
      locateBtn.classList.add(
        "located"
      );

      try {
        await requestDeviceLocation(
          true
        );
      } finally {
        setTimeout(
          () => {
            locateBtn.classList.remove(
              "located"
            );
          },
          1000
        );
      }
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
      let lat =
        latestLat;

      let lon =
        latestLon;

      if (
        lat === null ||
        lon === null
      ) {
        try {
          const location =
            await requestDeviceLocation(
              false
            );

          lat =
            location.lat;

          lon =
            location.lon;
        } catch (error) {
          alert(
            "Location is not available yet."
          );

          return;
        }
      }

      try {
        await navigator.clipboard.writeText(
          `${lat.toFixed(6)}, ${lon.toFixed(6)}`
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
        try {
          await requestDeviceLocation(
            false
          );
        } catch (error) {}
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
        image &&
        !image.type.startsWith(
          "image/"
        )
      ) {
        alert(
          "Normal file must be an image."
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
        thermal &&
        !thermal.type.startsWith(
          "image/"
        )
      ) {
        alert(
          "Thermal file must be an image."
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
        "Getting Location";

      const capturedAt =
        new Date().toISOString();

      let reportLocation =
        null;

      try {
        reportLocation =
          await getReportLocation(
            image
          );

        if (!reportLocation) {
          throw new Error(
            "Unable to determine your location."
          );
        }

        updateCurrentLocation(
          reportLocation.lat,
          reportLocation.lon
        );

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
          reportLocation.lat
        );

        formData.append(
          "lon",
          reportLocation.lon
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

        submitBtn.textContent =
          "Submitting";

        const response =
          await fetch(
            "/api/reports",
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

        if (fileNameDisplay) {
          fileNameDisplay.textContent =
            "Upload Photo";
        }

        if (
          thermalFileNameDisplay
        ) {
          thermalFileNameDisplay.textContent =
            "Upload Thermal Image";
        }

        setSourceMode(
          false
        );

        setGPSStatus(
          `GPS: ${reportLocation.lat.toFixed(6)}, ${reportLocation.lon.toFixed(6)}`
        );

        await refreshQueueBadge();
      } catch (error) {
        const isNetworkError =
          error instanceof TypeError;

        if (isNetworkError) {
          if (!reportLocation) {
            try {
              reportLocation =
                await getReportLocation(
                  image
                );
            } catch (locationError) {
              reportLocation = null;
            }
          }

          if (!reportLocation) {
            alert(
              "Unable to determine location. Please enable GPS or use a photo with GPS data."
            );

            return;
          }

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
                reportLocation.lat,

              lon:
                reportLocation.lon,

              source:
                source,

              captured_at:
                capturedAt
            });

            updateCurrentLocation(
              reportLocation.lat,
              reportLocation.lon
            );

            setGPSStatus(
              "GPS: saved offline"
            );

            await refreshQueueBadge();

            alert(
              "No connection. Report saved offline and will sync automatically."
            );

            reportForm.reset();

            if (fileNameDisplay) {
              fileNameDisplay.textContent =
                "Upload Photo";
            }

            if (
              thermalFileNameDisplay
            ) {
              thermalFileNameDisplay.textContent =
                "Upload Thermal Image";
            }

            setSourceMode(
              false
            );
          } catch (queueError) {
            console.error(
              "Failed to save report offline:",
              queueError
            );

            alert(
              "No connection and the report could not be saved offline."
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
  async () => {
    await refreshQueueBadge();

    await syncQueuedReports();

    try {
      await requestDeviceLocation(
        false
      );
    } catch (error) {}
  }
);

setSourceMode(false);

loadReports();

setInterval(
  loadReports,
  8000
);
document.getElementById("minimizeFormBtn")?.addEventListener("click", () => {
  const form = document.getElementById("reportForm");
  const button = document.getElementById("minimizeFormBtn");
  const collapsed = form.classList.toggle("collapsed");

  button.textContent = collapsed ? "+" : "−";
  button.setAttribute("aria-expanded", String(!collapsed));
  button.setAttribute(
    "aria-label",
    collapsed ? "Expand report form" : "Minimize report form"
  );
});
