const $ = (id) => document.getElementById(id);

let apiBase =
  localStorage.getItem("vitalguard_api") ||
  "https://vitalguard-ai-backend.onrender.com";

let demo = false;
let latestData = null;

if ($("apiUrl")) {
  $("apiUrl").value = apiBase;
}


/* =========================================================
   BASIC HELPERS
   ========================================================= */

function val(v, fallback = "--") {
  return v === undefined || v === null || v === ""
    ? fallback
    : v;
}


function pct(v) {
  if (v === undefined || v === null || v === "") {
    return "--";
  }

  const n = Number(v);

  return Number.isFinite(n)
    ? (n <= 1 ? n * 100 : n)
    : "--";
}


function fmtPct(v) {
  const n = pct(v);

  return n === "--"
    ? "--"
    : `${n.toFixed(1)}%`;
}


function boolDot(id, ok) {
  const e = $(id);

  if (!e) return;

  e.className =
    "dot " + (ok ? "online" : "offline");
}


function riskClass(level) {
  return String(level || "").toUpperCase();
}


/* =========================================================
   RISK DISPLAY
   ========================================================= */

function setRisk(score, level, confidence) {

  const n = Number(score);

  const safeScore =
    Number.isFinite(n)
      ? Math.max(0, Math.min(100, n))
      : 0;

  const deg = safeScore * 3.6;

  const label = level || "--";


  if ($("riskScore")) {
    $("riskScore").textContent =
      Number.isFinite(n)
        ? n.toFixed(1)
        : "--";
  }


  if ($("overallRisk")) {
    $("overallRisk").textContent = label;
  }


  if ($("riskLabel")) {
    $("riskLabel").textContent =
      label === "--"
        ? "No assessment yet"
        : label;
  }


  if ($("riskLevelBadge")) {
    $("riskLevelBadge").textContent =
      label === "--"
        ? "WAITING"
        : label;
  }


  const confidencePct = pct(confidence);

  const confidenceText =
    confidencePct === "--"
      ? "--"
      : `${confidencePct.toFixed(1)}%`;


  if ($("overallConfidence")) {
    $("overallConfidence").textContent =
      `Confidence: ${confidenceText}`;
  }


  if ($("confidenceText")) {
    $("confidenceText").textContent =
      `Confidence: ${confidenceText}`;
  }


  if ($("confidenceFill")) {

    $("confidenceFill").style.width =
      `${Math.max(
        0,
        Math.min(
          100,
          Number(confidencePct) || 0
        )
      )}%`;
  }


  const gauge =
    document.querySelector(".gauge");


  if (gauge) {

    gauge.style.background =
      `conic-gradient(
        #3478f6 0deg,
        #3478f6 ${deg}deg,
        #1b2a42 ${deg}deg
      )`;
  }


  const colors = {

    LOW: "#25d07f",

    MODERATE: "#65d9ff",

    HIGH: "#f5b642",

    CRITICAL: "#f05252"

  };


  const c =
    colors[riskClass(level)];


  if ($("riskLevelBadge")) {

    if (c) {

      $("riskLevelBadge").style.color = c;

      $("riskLevelBadge").style.border =
        `1px solid ${c}`;

    } else {

      $("riskLevelBadge").style.color = "";

      $("riskLevelBadge").style.border = "";
    }
  }
}


/* =========================================================
   RISK REASONS
   ========================================================= */

function renderReasons(reasons) {

  const box = $("reasonList");

  if (!box) return;


  if (
    !Array.isArray(reasons) ||
    !reasons.length
  ) {

    box.innerHTML =
      '<div class="empty">No individual risk factors were returned.</div>';

    return;
  }


  box.innerHTML =
    reasons
      .map((r) => {

        const factor =
          String(
            r.factor || "risk factor"
          ).replaceAll("_", " ");


        const direction =
          r.direction
            ? ` ${r.direction}`
            : "";


        const contribution =
          Number(r.contribution);


        const value =
          Number.isFinite(contribution)
            ? contribution.toFixed(1)
            : "--";


        return `
          <div class="reason">
            <span>${factor}${direction}</span>
            <b>+${value}</b>
          </div>
        `;

      })
      .join("");
}


/* =========================================================
   FORECAST
   ========================================================= */

function renderForecast(points) {

  const chart = $("forecastChart");

  if (!chart) return;


  if (
    !Array.isArray(points) ||
    !points.length
  ) {

    chart.innerHTML =
      '<div class="empty">No forecast available yet.</div>';

    if ($("forecastSummary")) {
      $("forecastSummary").textContent =
        "Waiting for forecast data.";
    }

    if ($("forecastCurrent")) {
      $("forecastCurrent").textContent = "--";
    }

    if ($("forecast10")) {
      $("forecast10").textContent = "--";
    }

    if ($("forecast30")) {
      $("forecast30").textContent = "--";
    }

    return;
  }


  const sorted =
    [...points].sort(
      (a, b) =>
        Number(a.minutes) -
        Number(b.minutes)
    );


  chart.innerHTML =
    sorted
      .map((p) => {

        const risk =
          Math.max(
            0,
            Math.min(
              100,
              Number(p.risk) || 0
            )
          );


        return `
          <div class="forecast-bar-wrap">

            <div class="forecast-value">
              ${risk.toFixed(1)}
            </div>

            <div
              class="forecast-bar"
              style="height:${Math.max(5, risk)}%"
            ></div>

            <div class="forecast-bar-label">
              ${p.minutes} min
            </div>

          </div>
        `;

      })
      .join("");


  const current =
    Number(
      sorted[0]?.risk ?? 0
    );


  const last =
    Number(
      sorted[sorted.length - 1]?.risk ??
      current
    );


  const delta =
    last - current;


  if ($("forecastSummary")) {

    $("forecastSummary").textContent =

      Math.abs(delta) < 0.5

        ? "The current prototype forecast remains approximately stable over the displayed horizon."

        : delta > 0

          ? `The forecast increases by approximately ${delta.toFixed(1)} points over the displayed horizon.`

          : `The forecast decreases by approximately ${Math.abs(delta).toFixed(1)} points over the displayed horizon.`;
  }


  if ($("forecastCurrent")) {

    $("forecastCurrent").textContent =
      Number.isFinite(current)
        ? current.toFixed(1)
        : "--";
  }


  const p10 =
    sorted.find(
      (p) => Number(p.minutes) === 10
    );


  const p30 =
    sorted.find(
      (p) => Number(p.minutes) === 30
    );


  if ($("forecast10")) {

    $("forecast10").textContent =
      p10
        ? Number(p10.risk).toFixed(1)
        : "--";
  }


  if ($("forecast30")) {

    $("forecast30").textContent =
      p30
        ? Number(p30.risk).toFixed(1)
        : "--";
  }
}


/* =========================================================
   RECOMMENDATIONS
   ========================================================= */

function renderRecommendations(items) {

  const box =
    $("recommendationCards");

  if (!box) return;


  if (
    !Array.isArray(items) ||
    !items.length
  ) {

    box.innerHTML =
      '<div class="empty">No recommendations returned.</div>';

    return;
  }


  box.innerHTML =
    items
      .map((item, i) => {

        const text =
          typeof item === "string"
            ? item
            : (
                item.text ||
                JSON.stringify(item)
              );


        return `
          <div class="recommendation">

            <div class="check">✓</div>

            <div>
              <strong>
                Action ${i + 1}
              </strong>

              <span>
                ${text}
              </span>
            </div>

          </div>
        `;

      })
      .join("");
}


/* =========================================================
   EMERGENCY ALERT SYSTEM
   ========================================================= */

function getEmergencyAction(level) {

  if (level === "CRITICAL") {

    return "Stop activity, move to a cooler area and contact an emergency contact.";
  }


  if (level === "HIGH") {

    return "Rest and move to a cooler area.";
  }


  if (level === "MODERATE") {

    return "Hydrate, reduce activity and continue monitoring.";
  }


  return "Continue monitoring.";
}


/* =========================================================
   BROWSER NOTIFICATION
   ========================================================= */

async function requestNotificationPermission() {

  if (!("Notification" in window)) {

    return false;
  }


  if (
    Notification.permission === "default"
  ) {

    try {

      const permission =
        await Notification.requestPermission();

      return permission === "granted";

    } catch (error) {

      console.error(
        "Notification permission error:",
        error
      );

      return false;
    }
  }


  return (
    Notification.permission === "granted"
  );
}


/* =========================================================
   SHOW EMERGENCY ALERT
   ========================================================= */

function showEmergencyAlert(
  data,
  force = false
) {

  const risk =
    data?.risk || {};


  const score =
    Number(
      risk.score ??
      risk.risk_score ??
      0
    );


  const level =
    String(
      risk.level ??
      risk.risk_level ??
      "LOW"
    ).toUpperCase();


  const confidence =
    Number(
      risk.confidence ??
      data?.confidence?.score ??
      0
    );


  const heartRate =
    data?.vitals?.heart_rate ??
    data?.rppg?.heart_rate ??
    "--";


  const spo2 =
    data?.vitals?.spo2 ??
    "--";


  const ambient =
    data?.environment?.temperature ??
    "--";


  const humidity =
    data?.environment?.humidity ??
    "--";


  const alertBox =
    $("emergencyAlertBox");


  const title =
    $("alertTitle");


  const message =
    $("alertMessage");


  const badge =
    $("alertStatusBadge");


  if (
    !alertBox ||
    !title ||
    !message ||
    !badge
  ) {

    return;
  }


  /*
   * Normal state:
   * LOW / MODERATE
   */

  if (
    !force &&
    level !== "HIGH" &&
    level !== "CRITICAL"
  ) {

    alertBox.className =
      "emergency-alert-box safe";


    title.textContent =
      "No emergency alert";


    message.textContent =
      `Current risk is ${level} (${score.toFixed(1)}/100). VITALGUARD is monitoring.`;


    badge.textContent =
      "MONITORING";


    badge.className =
      "badge neutral";


    return;
  }


  const action =
    getEmergencyAction(level);


  const confidencePct =
    confidence <= 1
      ? confidence * 100
      : confidence;


  /*
   * HIGH
   */

  if (level === "HIGH") {

    alertBox.className =
      "emergency-alert-box high";

    badge.className =
      "badge alert-high";

  }


  /*
   * CRITICAL
   */

  else {

    alertBox.className =
      "emergency-alert-box critical";

    badge.className =
      "badge alert-critical";
  }


  badge.textContent =
    level;


  title.textContent =
    level === "CRITICAL"
      ? "🚨 CRITICAL VITALGUARD ALERT"
      : "🚨 VITALGUARD ALERT";


  message.innerHTML = `

    <strong>
      Risk: ${level} (${score.toFixed(1)}/100)
    </strong>

    <br>

    Confidence:
    ${confidencePct.toFixed(1)}%

    <br><br>

    HR:
    ${heartRate} BPM

    <br>

    SpO2:
    ${spo2}%

    <br>

    Ambient:
    ${ambient}°C

    <br>

    Humidity:
    ${humidity}%

    <br><br>

    <strong>
      Action:
    </strong>

    ${action}

    <br><br>

    <span>
      VITALGUARD — Prototype Alert
    </span>

  `;


  /*
   * Browser notification
   *
   * Only show notification when
   * the alert is forced manually.
   *
   * This prevents repeated notifications
   * every 5 seconds.
   */

  if (
    force &&
    "Notification" in window &&
    Notification.permission === "granted"
  ) {

    new Notification(
      `🚨 VITALGUARD ${level} ALERT`,
      {
        body:
          `Risk ${score.toFixed(1)}/100 | ` +
          `HR ${heartRate} BPM | ` +
          `SpO2 ${spo2}% | ` +
          `Ambient ${ambient}°C`
      }
    );
  }
}


/* =========================================================
   CLEAR ALERT
   ========================================================= */

function clearEmergencyAlert() {

  const alertBox =
    $("emergencyAlertBox");


  const title =
    $("alertTitle");


  const message =
    $("alertMessage");


  const badge =
    $("alertStatusBadge");


  if (!alertBox) return;


  alertBox.className =
    "emergency-alert-box safe";


  title.textContent =
    "No emergency alert";


  message.textContent =
    "VITALGUARD is continuously monitoring the current risk state.";


  badge.textContent =
    "MONITORING";


  badge.className =
    "badge neutral";
}


/* =========================================================
   MAIN RENDER
   ========================================================= */

function render(d) {

  latestData = d;


  const env =
    d.environment || {};


  const rppg =
    d.rppg || {};


  const vitals =
    d.vitals || {};


  const hardware =
    d.hardware || {};


  const risk =
    d.risk || {};


  const forecast =
    d.forecast || {};


  /*
   * LIVE SENSOR VALUES
   */

  if ($("heartRate")) {

    $("heartRate").innerHTML =
      `${val(
        rppg.heart_rate ??
        vitals.heart_rate
      )} <small>bpm</small>`;
  }


  if ($("bodyTemperature")) {

    $("bodyTemperature").innerHTML =
      `${val(
        vitals.body_temperature
      )} <small>°C</small>`;
  }


  if ($("spo2")) {

    $("spo2").innerHTML =
      `${val(
        vitals.spo2
      )} <small>%</small>`;
  }


  if ($("temperature")) {

    $("temperature").innerHTML =
      `${val(
        env.temperature
      )} <small>°C</small>`;
  }


  if ($("humidity")) {

    $("humidity").innerHTML =
      `${val(
        env.humidity
      )} <small>%</small>`;
  }


  if ($("heatIndex")) {

    $("heatIndex").innerHTML =
      `${val(
        env.heat_index
      )} <small>°C</small>`;
  }


  if ($("activityLevel")) {

    $("activityLevel").textContent =
      val(
        vitals.activity_level
      );
  }


  if ($("tempSource")) {

    $("tempSource").textContent =
      env.source ||
      "Environment backend";
  }


  if ($("rppgStatus")) {

    $("rppgStatus").textContent =
      typeof rppg.quality === "number"

        ? `Quality ${fmtPct(
            rppg.quality
          )}`

        : (
            rppg.quality ||
            "rPPG observation"
          );
  }


  /*
   * HARDWARE
   */

  const esp =
    Boolean(
      hardware.esp32_connected
    );


  const cam =
    Boolean(
      hardware.rppg_connected
    );


  const fus =
    hardware.fusion_available !== false;


  boolDot(
    "espDot",
    esp
  );


  boolDot(
    "rppgDot",
    cam
  );


  boolDot(
    "fusionDot",
    fus
  );


  if ($("espText")) {

    $("espText").textContent =
      esp
        ? "Connected and sending data"
        : "Disconnected / no data";
  }


  if ($("rppgText")) {

    $("rppgText").textContent =
      cam
        ? "Observation active"
        : "Camera/rPPG unavailable";
  }


  if ($("fusionText")) {

    $("fusionText").textContent =
      fus
        ? "Fusion processing available"
        : "Fusion unavailable";
  }


  if ($("hardwareBadge")) {

    $("hardwareBadge").textContent =
      esp || cam
        ? "ACTIVE"
        : "OFFLINE";
  }


  /*
   * SIGNAL QUALITY
   */

  const combinedQuality =
    (
      Number(
        rppg.quality ?? 0
      ) +

      Number(
        d.risk?.confidence ??
        d.confidence?.score ??
        0
      )

    ) / 2;


  if ($("signalQuality")) {

    $("signalQuality").innerHTML =
      `${fmtPct(
        combinedQuality
      )} <small></small>`;
  }


  if ($("rppgQuality")) {

    $("rppgQuality").textContent =
      fmtPct(
        rppg.quality
      );
  }


  if ($("sensorQuality")) {

    $("sensorQuality").textContent =
      fmtPct(
        risk.feature_snapshot
          ?.sensor_quality
      );
  }


  if ($("observationTime")) {

    $("observationTime").textContent =
      val(d.timestamp);
  }


  if ($("observationSource")) {

    $("observationSource").textContent =
      val(d.data_source);
  }


  /*
   * RISK
   */

  const score =
    risk.score ??
    risk.risk_score;


  const level =
    risk.level ??
    risk.risk_level;


  const confidence =
    risk.confidence ??
    d.confidence?.score;


  setRisk(
    score,
    level,
    confidence
  );


  if ($("riskExplanation")) {

    $("riskExplanation").textContent =

      risk.explanation ||

      "Risk is calculated from personal baseline, vital deviations, environmental conditions and signal quality.";
  }


  renderReasons(
    risk.reasons
  );


  renderForecast(
    forecast.points
  );


  renderRecommendations(
    d.recommendations ||
    risk.recommended_actions
  );


  /*
   * EMERGENCY ALERT
   *
   * HIGH / CRITICAL automatically
   * changes the dashboard alert panel.
   */

  showEmergencyAlert(d);


  /*
   * DATA SOURCE
   */

  if ($("dataSourceBadge")) {

    $("dataSourceBadge").textContent =

      d.data_source ===
      "SIMULATED_DEMO"

        ? "SIMULATED"

        : "LIVE SENSOR DATA";
  }


  /*
   * DEVELOPER PAYLOAD
   */

  if ($("rawData")) {

    $("rawData").textContent =
      JSON.stringify(
        d,
        null,
        2
      );
  }


  if ($("lastUpdated")) {

    $("lastUpdated").textContent =
      `Updated: ${
        new Date().toLocaleTimeString()
      }`;
  }
}


/* =========================================================
   DEMO DATA
   ========================================================= */

function demoData() {

  return {

    available: true,

    timestamp:
      new Date().toISOString(),


    environment: {

      temperature: 36,

      humidity: 75,

      heat_index: 40.2,

      available: true,

      source:
        "ESP32+DHT11 (DEMO)"
    },


    rppg: {

      heart_rate: 104,

      available: true,

      quality: 0.835
    },


    vitals: {

      heart_rate: 104,

      spo2: 95,

      body_temperature: 37.2,

      activity_level: "walking"
    },


    hardware: {

      esp32_connected: true,

      rppg_connected: true,

      fusion_available: true
    },


    risk: {

      score: 72.5,

      level: "HIGH",

      confidence: 0.835,


      reasons: [

        {
          factor:
            "heat_humidity",

          direction:
            "up",

          contribution:
            20.0
        },


        {
          factor:
            "hr_deviation",

          direction:
            "up",

          contribution:
            12.5
        }

      ],


      explanation:
        "Elevated environmental heat, humidity and heart rate are contributing to high prototype risk.",


      recommended_actions: [

        "Rest and move to a cooler area.",

        "Hydrate with water.",

        "Continue monitoring heart rate."

      ],


      feature_snapshot: {

        sensor_quality:
          0.87
      }
    },


    confidence: {

      score: 0.835
    },


    forecast: {

      points: [

        {
          minutes: 10,
          risk: 74
        },

        {
          minutes: 20,
          risk: 77
        },

        {
          minutes: 30,
          risk: 80
        }

      ]
    },


    recommendations: [

      "Rest and move to a cooler area.",

      "Hydrate with water.",

      "Continue monitoring heart rate."

    ],


    data_source:
      "SIMULATED_DEMO"
  };
}


/* =========================================================
   FETCH LIVE DATA
   ========================================================= */

async function fetchData() {

  /*
   * DEMO MODE
   */

  if (demo) {

    render(
      demoData()
    );


    if ($("apiStatus")) {

      $("apiStatus").innerHTML =
        '<span class="dot online"></span><span>Demo data active</span>';
    }


    return;
  }


  if ($("apiStatus")) {

    $("apiStatus").innerHTML =
      '<span class="dot"></span><span>Connecting...</span>';
  }


  try {

    const response =
      await fetch(
        `${apiBase}/api/live`,
        {
          cache: "no-store"
        }
      );


    if (!response.ok) {

      throw new Error(
        `HTTP ${response.status}`
      );
    }


    const data =
      await response.json();


    if ($("apiStatus")) {

      $("apiStatus").innerHTML =
        '<span class="dot online"></span><span>API connected</span>';
    }


    render(data);

  }


  catch (e) {

    console.error(
      "VITALGUARD API ERROR:",
      e
    );


    if ($("apiStatus")) {

      $("apiStatus").innerHTML =
        '<span class="dot offline"></span><span>API unavailable</span>';
    }


    if ($("lastUpdated")) {

      $("lastUpdated").textContent =
        "Backend unavailable";
    }
  }
}


/* =========================================================
   API URL
   ========================================================= */

if ($("saveApi")) {

  $("saveApi").onclick = () => {

    apiBase =
      $("apiUrl")
        .value
        .trim()
        .replace(/\/+$/, "");


    localStorage.setItem(
      "vitalguard_api",
      apiBase
    );


    fetchData();
  };
}


/* =========================================================
   REFRESH
   ========================================================= */

if ($("refreshBtn")) {

  $("refreshBtn").onclick =
    fetchData;
}


/* =========================================================
   DEMO MODE
   ========================================================= */

if ($("demoBtn")) {

  $("demoBtn").onclick = () => {

    demo = !demo;


    $("demoBtn").textContent =
      demo
        ? "Live Mode"
        : "Demo Mode";


    fetchData();
  };
}


/* =========================================================
   SMOOTH SCROLL BUTTONS
   ========================================================= */

document
  .querySelectorAll("[data-scroll]")
  .forEach((button) => {

    button.addEventListener(
      "click",
      () => {

        const target =
          document.getElementById(
            button.dataset.scroll
          );


        if (target) {

          target.scrollIntoView({
            behavior: "smooth",
            block: "start"
          });
        }
      }
    );
  });


/* =========================================================
   NAVIGATION
   ========================================================= */

document
  .querySelectorAll("#mainNav a")
  .forEach((link) => {

    link.addEventListener(
      "click",
      () => {

        document
          .querySelectorAll(
            "#mainNav a"
          )
          .forEach(
            (x) =>
              x.classList.remove(
                "active"
              )
          );


        link.classList.add(
          "active"
        );
      }
    );
  });


/* =========================================================
   NAVIGATION OBSERVER
   ========================================================= */

if ("IntersectionObserver" in window) {

  const navObserver =
    new IntersectionObserver(

      (entries) => {

        const visible =
          entries

            .filter(
              (entry) =>
                entry.isIntersecting
            )

            .sort(
              (a, b) =>
                b.intersectionRatio -
                a.intersectionRatio
            )[0];


        if (!visible) return;


        const id =
          visible.target.dataset.nav;


        if (!id) return;


        document
          .querySelectorAll(
            "#mainNav a"
          )
          .forEach(
            (a) => {

              a.classList.toggle(
                "active",
                a.dataset.section === id
              );

            }
          );
      },


      {
        rootMargin:
          "-25% 0px -60% 0px",

        threshold:
          [0.1, 0.3, 0.6]
      }

    );


  document
    .querySelectorAll("[data-nav]")
    .forEach(
      (section) =>
        navObserver.observe(
          section
        )
    );
}


/* =========================================================
   WHAT-IF SLIDERS
   ========================================================= */

["wiTemp", "wiHumidity", "wiHr"]
  .forEach((id) => {

    const element = $(id);

    if (!element) return;


    element.addEventListener(
      "input",
      () => {

        const output =
          $(id + "Out");


        if (!output) return;


        const suffix =
          id === "wiTemp"

            ? "°C"

            : id === "wiHumidity"

              ? "%"

              : " bpm";


        output.textContent =
          element.value +
          suffix;
      }
    );
  });


/* =========================================================
   WHAT-IF SCENARIOS
   ========================================================= */

function setScenario(name) {

  const scenarios = {

    cooler: {
      temp: 27,
      humidity: 50,
      hr: 70
    },


    rest: {
      temp: 30,
      humidity: 55,
      hr: 65
    },


    hot: {
      temp: 40,
      humidity: 85,
      hr: 110
    }

  };


  const s =
    scenarios[name];


  if (!s) return;


  if ($("wiTemp")) {

    $("wiTemp").value =
      s.temp;
  }


  if ($("wiHumidity")) {

    $("wiHumidity").value =
      s.humidity;
  }


  if ($("wiHr")) {

    $("wiHr").value =
      s.hr;
  }


  if ($("wiTempOut")) {

    $("wiTempOut").textContent =
      `${s.temp}°C`;
  }


  if ($("wiHumidityOut")) {

    $("wiHumidityOut").textContent =
      `${s.humidity}%`;
  }


  if ($("wiHrOut")) {

    $("wiHrOut").textContent =
      `${s.hr} bpm`;
  }


  runWhatIf();
}


document
  .querySelectorAll("[data-scenario]")
  .forEach((button) => {

    button.addEventListener(
      "click",
      () =>
        setScenario(
          button.dataset.scenario
        )
    );
  });


/* =========================================================
   WHAT-IF ENGINE
   ========================================================= */

async function runWhatIf() {

  const temperature =
    Number(
      $("wiTemp")?.value
    );


  const humidity =
    Number(
      $("wiHumidity")?.value
    );


  const heartRate =
    Number(
      $("wiHr")?.value
    );


  /*
   * DEMO MODE
   */

  if (
    demo ||
    !latestData
  ) {

    const score =
      Math.max(

        0,

        Math.min(

          100,

          Math.round(

            (temperature - 20) * 2 +

            Math.max(
              0,
              humidity - 40
            ) * 0.35 +

            Math.max(
              0,
              heartRate - 70
            ) * 0.65

          )

        )

      );


    showWhatIfResult({

      predicted_risk:
        score,

      risk_level:
        score >= 75
          ? "CRITICAL"
          : score >= 50
            ? "HIGH"
            : score >= 25
              ? "MODERATE"
              : "LOW",

      confidence:
        0.87

    });


    return;
  }


  /*
   * CURRENT DATA
   */

  const current = {

    timestamp:
      latestData.timestamp ||
      new Date().toISOString(),


    heart_rate:
      Number(
        latestData.vitals?.heart_rate ??
        latestData.rppg?.heart_rate ??
        80
      ),


    spo2:
      Number(
        latestData.vitals?.spo2 ??
        98
      ),


    body_temperature:
      Number(
        latestData.vitals?.body_temperature ??
        36.7
      ),


    ambient_temperature:
      Number(
        latestData.environment?.temperature ??
        30
      ),


    humidity:
      Number(
        latestData.environment?.humidity ??
        60
      ),


    activity_level:
      latestData.vitals?.activity_level ||
      "resting",


    rppg_quality:
      Number(
        latestData.rppg?.quality ??
        0.8
      ),


    sensor_quality:
      Number(
        latestData.risk
          ?.feature_snapshot
          ?.sensor_quality ??
        0.87
      )

  };


  const requestBody = {

    data:
      current,

    changes: {

      ambient_temperature:
        temperature,

      humidity:
        humidity,

      heart_rate:
        heartRate
    }

  };


  if ($("whatifResult")) {

    $("whatifResult").innerHTML =
      '<div class="empty">Running simulation...</div>';
  }


  try {

    const response =
      await fetch(
        `${apiBase}/whatif`,
        {

          method:
            "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body:
            JSON.stringify(
              requestBody
            )
        }
      );


    if (!response.ok) {

      throw new Error(
        `HTTP ${response.status}`
      );
    }


    const result =
      await response.json();


    showWhatIfResult(
      result
    );

  }


  catch (e) {

    console.error(
      "What-if error:",
      e
    );


    if ($("whatifResult")) {

      $("whatifResult").innerHTML =
        '<div class="empty">Simulation could not be completed. Check the backend connection.</div>';
    }
  }
}


/* =========================================================
   WHAT-IF RESULT
   ========================================================= */

function showWhatIfResult(result) {

  const score =
    Number(
      result.predicted_risk ??
      result.risk_score ??
      result.score ??
      0
    );


  const level =
    result.risk_level ||
    result.level ||
    "UNKNOWN";


  const confidence =
    result.confidence;


  const current =
    Number(
      latestData?.risk?.score ??
      latestData?.risk?.risk_score ??
      NaN
    );


  const delta =
    Number.isFinite(current)
      ? score - current
      : null;


  if (!$("whatifResult")) {
    return;
  }


  $("whatifResult").innerHTML = `

    <div class="result-main">

      <div class="result-score">

        ${score.toFixed(1)}

        <small>
          / 100
        </small>

      </div>


      <div class="result-meta">

        <strong>
          ${level}
        </strong>


        <span>
          Prototype confidence:
          ${fmtPct(confidence)}
        </span>


        ${
          delta === null
            ? ""
            : `
              <span class="result-improvement">

                ${
                  delta <= 0
                    ? "↓"
                    : "↑"
                }

                ${Math.abs(delta).toFixed(1)}
                points vs current risk

              </span>
            `
        }

      </div>

    </div>

  `;
}


/* =========================================================
   EMERGENCY BUTTONS
   ========================================================= */

async function sendEmergencySms(data) {
  try {
    const alertData = {
      timestamp: data.timestamp || new Date().toISOString(),

      heart_rate:
        data.vitals?.heart_rate ??
        data.heart_rate ??
        104,

      spo2:
        data.vitals?.spo2 ??
        data.spo2 ??
        95,

      body_temperature:
        data.vitals?.body_temperature ??
        data.body_temperature ??
        37.2,

      ambient_temperature:
        data.environment?.temperature ??
        data.ambient_temperature ??
        36,

      humidity:
        data.environment?.humidity ??
        data.humidity ??
        75,

      activity_level:
        data.vitals?.activity_level ??
        data.activity_level ??
        "walking",

      rppg_quality:
        data.rppg?.quality ??
        data.rppg_quality ??
        0.80,

      sensor_quality:
        data.sensor_quality ??
        0.87
    };

    console.log("VITALGUARD emergency payload:", alertData);

    const response = await fetch(
      `${apiBase}/api/alerts/emergency`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          data: alertData,
          channel: "sms"
        })
      }
    );

    const result = await response.json();

    console.log("VITALGUARD emergency backend response:", result);

    if (!response.ok) {
      throw new Error(
        result.detail || "Emergency alert request failed"
      );
    }

    return result.triggered === true;

  } catch (error) {
    console.error(
      "VITALGUARD emergency SMS error:",
      error
    );

    return false;
  }
}


if ($("testAlertBtn")) {

  $("testAlertBtn").onclick =
    async () => {

      await requestNotificationPermission();

      let data;

      if (latestData) {

        data = latestData;

      } else {

        data = {

          timestamp:
            new Date().toISOString(),

          risk: {

            score: 72.5,

            level: "HIGH",

            confidence: 0.835
          },

          vitals: {

            heart_rate: 104,

            spo2: 95,

            body_temperature: 37.2,

            activity_level: "walking"
          },

          environment: {

            temperature: 36,

            humidity: 75
          },

          rppg: {

            quality: 0.80
          },

          sensor_quality: 0.87
        };
      }


      showEmergencyAlert(
        data,
        true
      );


      const sent =
        await sendEmergencySms(data);


      if (sent) {

        alert(
          "VITALGUARD ALERT SENT!\n\n" +
          "The emergency alert was sent " +
          "to the configured emergency contact."
        );

      } else {

        alert(
          "VITALGUARD alert was shown, " +
          "but the SMS could not be confirmed."
        );
      }

    };
}


if ($("clearAlertBtn")) {

  $("clearAlertBtn").onclick =
    clearEmergencyAlert;
}


/* =========================================================
   START SYSTEM
   ========================================================= */

fetchData();


/*
 * Refresh live data every 5 seconds.
 */

setInterval(
  fetchData,
  5000
);