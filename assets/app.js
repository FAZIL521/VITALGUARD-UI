const $ = (id) => document.getElementById(id);

let apiBase = localStorage.getItem("vitalguard_api");
if (!apiBase) {
    apiBase = "https://vitalguard-ai-backend.onrender.com";
}

$("apiUrl").value = apiBase;

let demo = false;

function val(v, fallback = "--") {
    if (v === undefined || v === null || v === "") {
        return fallback;
    }
    return v;
}

function boolDot(id, ok) {
    const e = $(id);
    if (!e) return;
    e.className = "dot " + (ok ? "online" : "offline");
}

function setRisk(score, label, confidence) {
    score = Number(score ?? 0);

    const deg = Math.max(0, Math.min(100, score)) * 3.6;

    $("riskScore").textContent = val(score);
    $("overallRisk").textContent = label || "--";
    $("riskLabel").textContent = label || "No assessment yet";

    let confidenceDisplay = "--";

    if (confidence !== undefined && confidence !== null) {
        confidenceDisplay = Number(confidence) <= 1
            ? Math.round(Number(confidence) * 100)
            : Math.round(Number(confidence));
    }

    $("overallConfidence").textContent =
        "Confidence: " + confidenceDisplay + "%";

    $("confidenceText").textContent =
        "Confidence: " + confidenceDisplay + "%";

    $("confidenceFill").style.width =
        Math.max(0, Math.min(100, Number(confidenceDisplay) || 0)) + "%";

    const gauge = document.querySelector(".gauge");

    if (gauge) {
        gauge.style.background =
            "conic-gradient(#3478f6 0deg, #3478f6 " +
            deg +
            "deg, #1b2a42 " +
            deg +
            "deg)";
    }
}

function render(d) {
    const env = d.environment || d.env || {};
    const rppg = d.rppg || d.vitals || {};
    const hardware = d.hardware || {};
    const risk = d.risk || d.risk_analysis || {};
    const forecast = d.forecast || {};

    $("temperature").innerHTML =
        val(env.temperature) + " <small>°C</small>";

    $("humidity").innerHTML =
        val(env.humidity) + " <small>%</small>";

    $("heatIndex").innerHTML =
        val(env.heat_index) + " <small>°C</small>";

    const hr =
        rppg.heart_rate !== undefined
            ? rppg.heart_rate
            : rppg.bpm;

    $("heartRate").innerHTML =
        val(hr) + " <small>bpm</small>";

    $("tempSource").textContent =
        env.source || "Environment backend";

    $("rppgStatus").textContent =
        rppg.quality || rppg.status || "rPPG observation";

    const esp = Boolean(hardware.esp32_connected);
    const cam = Boolean(hardware.rppg_connected);
    const fus = hardware.fusion_available !== false;

    boolDot("espDot", esp);
    boolDot("rppgDot", cam);
    boolDot("fusionDot", fus);

    $("espText").textContent =
        esp
            ? "Connected and sending data"
            : "Disconnected / no data";

    $("rppgText").textContent =
        cam
            ? "Observation active"
            : "Camera/rPPG unavailable";

    $("fusionText").textContent =
        fus
            ? "Fusion processing available"
            : "Fusion unavailable";

    $("hardwareBadge").textContent =
        esp || cam ? "ACTIVE" : "OFFLINE";

    let riskScore = risk.risk_score;

    if (riskScore === undefined) {
        riskScore = risk.score;
    }

    let riskLevel = risk.risk_level;

    if (!riskLevel) {
        riskLevel = risk.level;
    }

    let confidence = risk.confidence;

    if (
        confidence === undefined &&
        d.confidence &&
        d.confidence.score !== undefined
    ) {
        confidence = d.confidence.score;
    }

    setRisk(riskScore, riskLevel, confidence);

    $("riskExplanation").textContent =
        risk.explanation ||
        d.explanation?.summary ||
        "Waiting for AI explanation.";

    const rec = d.recommendations || risk.recommended_actions || [];

    if (rec.length) {
        $("recommendationList").innerHTML = rec
            .map(function (x) {
                if (typeof x === "string") {
                    return "<li>" + x + "</li>";
                }

                return "<li>" +
                    (x.text || JSON.stringify(x)) +
                    "</li>";
            })
            .join("");
    } else {
        $("recommendationList").innerHTML =
            "<li>No recommendations available.</li>";
    }

    if (forecast.points && forecast.points.length) {
        $("forecastContent").textContent =
            forecast.points
                .map(function (p) {
                    return p.minutes + " min → " + p.risk;
                })
                .join("\n");
    } else {
        $("forecastContent").textContent =
            forecast.summary ||
            forecast.prediction ||
            JSON.stringify(forecast, null, 2);
    }

    $("rawData").textContent =
        JSON.stringify(d, null, 2);

    $("lastUpdated").textContent =
        "Updated: " + new Date().toLocaleTimeString();
}

function demoData() {
    return {
        available: true,

        environment: {
            temperature: 31.2,
            humidity: 68.4,
            heat_index: 36.1,
            available: true,
            source: "ESP32+DHT11"
        },

        rppg: {
            heart_rate: 82,
            available: true,
            quality: "good"
        },

        hardware: {
            esp32_connected: true,
            rppg_connected: true,
            fusion_available: true
        },

        risk: {
            risk_score: 42,
            risk_level: "MODERATE",
            confidence: 0.87,
            explanation:
                "Elevated heat index combined with a higher-than-baseline heart rate."
        },

        forecast: {
            points: [
                { minutes: 10, risk: 42 },
                { minutes: 20, risk: 45 },
                { minutes: 30, risk: 48 }
            ]
        },

        recommendations: [
            "Hydrate with water.",
            "Move to a cooler environment.",
            "Continue monitoring heart rate."
        ]
    };
}

async function fetchData() {

    if (demo) {
        render(demoData());
        return;
    }

    $("apiStatus").innerHTML =
        '<span class="dot"></span><span>Connecting...</span>';

    try {

        const endpoints = [
            "/api/live",
            "/live",
            "/status",
            "/api/status"
        ];

        let data = null;

        for (const ep of endpoints) {

            try {

                const res = await fetch(apiBase + ep);

                if (res.ok) {
                    data = await res.json();
                    break;
                }

            } catch (error) {
                console.error("Endpoint failed:", apiBase + ep, error);
            }
        }

        if (!data) {
            throw new Error("No compatible backend endpoint responded.");
        }

        $("apiStatus").innerHTML =
            '<span class="dot online"></span><span>API connected</span>';

        render(data);

    } catch (e) {

        console.error("VITALGUARD API ERROR:", e);

        $("apiStatus").innerHTML =
            '<span class="dot offline"></span><span>API unavailable</span>';

        $("lastUpdated").textContent =
            "Backend unavailable";
    }
}

$("saveApi").onclick = function () {

    apiBase = $("apiUrl")
        .value
        .trim()
        .replace(/\/+$/, "");

    localStorage.setItem(
        "vitalguard_api",
        apiBase
    );

    fetchData();
};

$("refreshBtn").onclick = fetchData;

$("demoBtn").onclick = function () {

    demo = !demo;

    $("demoBtn").textContent =
        demo ? "Live Mode" : "Demo Mode";

    fetchData();
};

const sliders = [
    "wiTemp",
    "wiHumidity",
    "wiHr"
];

sliders.forEach(function (id) {

    const element = $(id);

    if (!element) return;

    element.oninput = function () {

        const output = $(id + "Out");

        if (!output) return;

        let suffix = "";

        if (id === "wiTemp") {
            suffix = "°C";
        } else if (id === "wiHumidity") {
            suffix = "%";
        } else {
            suffix = " bpm";
        }

        output.textContent =
            element.value + suffix;
    };
});

$("simulateBtn").onclick = async function () {

    const payload = {
        temperature: Number($("wiTemp").value),
        humidity: Number($("wiHumidity").value),
        heart_rate: Number($("wiHr").value)
    };

    if (demo) {

        const score = Math.min(
            100,
            Math.round(
                (payload.temperature - 20) * 2 +
                (payload.humidity - 30) * 0.4 +
                Math.max(0, payload.heart_rate - 70) * 0.7
            )
        );

        $("whatifResult").textContent =
            "Demo result: predicted risk score " +
            score +
            "/100.";

        return;
    }

    try {

        const current = {
            timestamp: new Date().toISOString(),
            heart_rate: payload.heart_rate,
            spo2: 95,
            body_temperature: 37.2,
            ambient_temperature: payload.temperature,
            humidity: payload.humidity,
            activity_level: "walking",
            rppg_quality: 0.8,
            sensor_quality: 0.87
        };

        const requestBody = {
            data: current,
            changes: {
                ambient_temperature: payload.temperature,
                humidity: payload.humidity,
                heart_rate: payload.heart_rate
            }
        };

        const response = await fetch(
            apiBase + "/whatif",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(requestBody)
            }
        );

        if (!response.ok) {
            throw new Error(
                "HTTP " + response.status
            );
        }

        const result = await response.json();

        $("whatifResult").textContent =
            JSON.stringify(result, null, 2);

    } catch (e) {

        console.error("What-if error:", e);

        $("whatifResult").textContent =
            "What-if endpoint unavailable.";
    }
};

fetchData();

setInterval(
    fetchData,
    5000
);