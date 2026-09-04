// ============================================================
// VITALGUARD AI - FRONTEND APPLICATION
// Connects Member 3 UI to Team 4 FastAPI AI Backend
// ============================================================

const $ = (id) => document.getElementById(id);

// ------------------------------------------------------------
// API CONFIGURATION
// ------------------------------------------------------------

let apiBase =
    localStorage.getItem("vitalguard_api") ||
    $("apiUrl").value ||
    "http://127.0.0.1:8000";

apiBase = apiBase.replace(/\/$/, "");

$("apiUrl").value = apiBase;

let demo = false;
let latestData = null;


// ------------------------------------------------------------
// HELPERS
// ------------------------------------------------------------

function val(value, fallback = "--") {
    return value === undefined ||
           value === null ||
           value === ""
        ? fallback
        : value;
}


function boolDot(id, ok) {
    const element = $(id);

    if (!element) return;

    element.className = "dot " + (ok ? "online" : "offline");
}


function setRisk(score, label, confidence) {

    score = Number(score ?? 0);

    const safeScore = Math.max(
        0,
        Math.min(100, score)
    );

    const degrees = safeScore * 3.6;

    const confidenceValue =
        Number(confidence ?? 0);

    $("riskScore").textContent =
        safeScore.toFixed(1);

    $("overallRisk").textContent =
        label || "--";

    $("riskLabel").textContent =
        label || "No assessment yet";

    $("overallConfidence").textContent =
        `Confidence: ${confidenceValue.toFixed(1)}%`;

    $("confidenceText").textContent =
        `Confidence: ${confidenceValue.toFixed(1)}%`;

    $("confidenceFill").style.width =
        `${Math.max(0, Math.min(100, confidenceValue))}%`;

    const gauge =
        document.querySelector(".gauge");

    if (gauge) {
        gauge.style.background =
            `conic-gradient(
                #3478f6 0deg,
                #3478f6 ${degrees}deg,
                #1b2a42 ${degrees}deg
            )`;
    }
}


// ------------------------------------------------------------
// FORECAST DISPLAY
// ------------------------------------------------------------

function renderForecast(forecast) {

    const container = $("forecastContent");

    if (!container) return;

    let points = [];

    if (Array.isArray(forecast)) {
        points = forecast;
    }
    else if (Array.isArray(forecast.points)) {
        points = forecast.points;
    }
    else if (Array.isArray(forecast.forecast)) {
        points = forecast.forecast;
    }

    if (!points.length) {

        const summary =
            forecast.summary ||
            forecast.prediction ||
            "";

        container.textContent =
            summary || "No forecast available yet.";

        return;
    }

    const maxRisk = 100;

    container.innerHTML = `
        <div style="
            display:flex;
            flex-direction:column;
            gap:14px;
            width:100%;
        ">
            ${points.map(point => {

                const minutes =
                    Number(point.minutes ?? 0);

                const risk =
                    Math.max(
                        0,
                        Math.min(
                            maxRisk,
                            Number(point.risk ?? 0)
                        )
                    );

                return `
                    <div style="
                        display:grid;
                        grid-template-columns:70px 1fr 55px;
                        align-items:center;
                        gap:12px;
                    ">

                        <span>
                            +${minutes} min
                        </span>

                        <div style="
                            height:10px;
                            background:#1b2a42;
                            border-radius:10px;
                            overflow:hidden;
                        ">
                            <div style="
                                width:${risk}%;
                                height:100%;
                                background:#3478f6;
                                border-radius:10px;
                                transition:width .3s ease;
                            "></div>
                        </div>

                        <strong>
                            ${risk.toFixed(1)}
                        </strong>

                    </div>
                `;

            }).join("")}
        </div>
    `;
}


// ------------------------------------------------------------
// RECOMMENDATIONS
// ------------------------------------------------------------

function renderRecommendations(recommendations) {

    const list = $("recommendationList");

    if (!list) return;

    if (!Array.isArray(recommendations) ||
        recommendations.length === 0) {

        list.innerHTML =
            "<li>No recommendations available.</li>";

        return;
    }

    list.innerHTML =
        recommendations
            .map(item => {

                if (typeof item === "string") {
                    return `<li>${item}</li>`;
                }

                return `
                    <li>
                        ${item.text || JSON.stringify(item)}
                    </li>
                `;

            })
            .join("");
}


// ------------------------------------------------------------
// MAIN DATA RENDERER
// ------------------------------------------------------------

function render(data) {

    latestData = data;

    const environment =
        data.environment ||
        data.env ||
        {};

    const rppg =
        data.rppg ||
        {};

    const vitals =
        data.vitals ||
        {};

    const hardware =
        data.hardware ||
        {};

    const risk =
        data.risk ||
        data.risk_analysis ||
        {};

    const forecast =
        data.forecast ||
        {};


    // --------------------------------------------------------
    // SENSOR VALUES
    // --------------------------------------------------------

    const heartRate =
        vitals.heart_rate ??
        rppg.heart_rate ??
        rppg.bpm;

    const bodyTemperature =
        vitals.body_temperature ??
        environment.body_temperature;

    const spo2 =
        vitals.spo2;


    $("heartRate").innerHTML =
        `${val(heartRate)}
        <small>bpm</small>`;


    $("temperature").innerHTML =
        `${val(environment.temperature)}
        <small>°C</small>`;


    $("humidity").innerHTML =
        `${val(environment.humidity)}
        <small>%</small>`;


    $("heatIndex").innerHTML =
        `${val(environment.heat_index)}
        <small>°C</small>`;


    // --------------------------------------------------------
    // SENSOR STATUS
    // --------------------------------------------------------

    const rppgQuality =
        rppg.quality;

    if (rppgQuality !== undefined) {

        if (typeof rppgQuality === "number") {

            $("rppgStatus").textContent =
                `rPPG Quality: ${rppgQuality.toFixed(2)}`;

        } else {

            $("rppgStatus").textContent =
                `rPPG Quality: ${rppgQuality}`;

        }

    } else {

        $("rppgStatus").textContent =
            "rPPG observation";

    }


    $("tempSource").textContent =
        environment.source ||
        "Environment backend";


    // --------------------------------------------------------
    // HARDWARE CONNECTIONS
    // --------------------------------------------------------

    const esp32Connected =
        hardware.esp32_connected ??
        false;


    const rppgConnected =
        hardware.rppg_connected ??
        rppg.available ??
        false;


    const fusionAvailable =
        hardware.fusion_available ??
        true;


    boolDot(
        "espDot",
        esp32Connected
    );


    boolDot(
        "rppgDot",
        rppgConnected
    );


    boolDot(
        "fusionDot",
        fusionAvailable
    );


    $("espText").textContent =
        esp32Connected
            ? "Connected and sending data"
            : "Disconnected / no data";


    $("rppgText").textContent =
        rppgConnected
            ? "Observation active"
            : "Camera/rPPG unavailable";


    $("fusionText").textContent =
        fusionAvailable
            ? "Fusion processing available"
            : "Fusion unavailable";


    $("hardwareBadge").textContent =
        esp32Connected || rppgConnected
            ? "ACTIVE"
            : "OFFLINE";


    // --------------------------------------------------------
    // RISK
    // --------------------------------------------------------

    let confidence =
        risk.confidence ??
        data.confidence;


    // Backend may return 0.835
    // UI displays percentage 83.5
    if (confidence !== undefined &&
        Number(confidence) <= 1) {

        confidence =
            Number(confidence) * 100;

    }


    setRisk(
        risk.score ??
        risk.risk_score,

        risk.level ??
        risk.label,

        confidence
    );


    // --------------------------------------------------------
    // RISK EXPLANATION
    // --------------------------------------------------------

    $("riskExplanation").textContent =
        risk.explanation ||
        data.explanation?.summary ||
        "Waiting for AI explanation.";


    // --------------------------------------------------------
    // RECOMMENDATIONS
    // --------------------------------------------------------

    renderRecommendations(
        data.recommendations ||
        risk.recommended_actions ||
        []
    );


    // --------------------------------------------------------
    // FORECAST
    // --------------------------------------------------------

    renderForecast(forecast);


    // --------------------------------------------------------
    // RAW BACKEND DATA
    // --------------------------------------------------------

    $("rawData").textContent =
        JSON.stringify(
            data,
            null,
            2
        );


    // --------------------------------------------------------
    // UPDATE TIME
    // --------------------------------------------------------

    $("lastUpdated").textContent =
        "Updated: " +
        new Date().toLocaleTimeString();
}


// ------------------------------------------------------------
// DEMO DATA
// ------------------------------------------------------------

function demoData() {

    return {

        available: true,

        timestamp:
            new Date().toISOString(),

        environment: {

            temperature: 31.2,

            humidity: 68.4,

            heat_index: 36.1,

            available: true,

            source: "ESP32+DHT11"

        },

        rppg: {

            heart_rate: 82,

            quality: 0.92,

            available: true

        },

        vitals: {

            heart_rate: 82,

            spo2: 98,

            body_temperature: 36.7,

            activity_level: "resting"

        },

        hardware: {

            esp32_connected: true,

            rppg_connected: true,

            fusion_available: true

        },

        risk: {

            score: 42,

            level: "MODERATE",

            confidence: 87,

            explanation:
                "Elevated heat exposure combined with a higher-than-baseline heart rate."

        },

        forecast: {

            points: [

                {
                    minutes: 10,
                    risk: 44
                },

                {
                    minutes: 20,
                    risk: 47
                },

                {
                    minutes: 30,
                    risk: 51
                }

            ]

        },

        recommendations: [

            "Hydrate with water.",

            "Move to a cooler environment.",

            "Continue monitoring heart rate."

        ],

        data_source:
            "DEMO"

    };
}


// ------------------------------------------------------------
// FETCH LIVE BACKEND DATA
// ------------------------------------------------------------

async function fetchData() {

    if (demo) {

        $("apiStatus").innerHTML =
            '<span class="dot online"></span>' +
            '<span>Demo Mode</span>';

        render(
            demoData()
        );

        return;
    }


    $("apiStatus").innerHTML =
        '<span class="dot"></span>' +
        '<span>Connecting...</span>';


    try {

        // Primary endpoint used by your backend
        const endpoints = [

            "/api/live",

            // Compatibility fallbacks
            "/live",

            "/status",

            "/api/status"

        ];


        let responseData = null;


        for (const endpoint of endpoints) {

            try {

                const response =
                    await fetch(
                        apiBase + endpoint,
                        {
                            method: "GET",
                            cache: "no-store"
                        }
                    );


                if (response.ok) {

                    responseData =
                        await response.json();

                    break;

                }

            } catch (error) {

                console.log(
                    "Endpoint failed:",
                    endpoint
                );

            }

        }


        if (!responseData) {

            throw new Error(
                "No compatible backend endpoint found."
            );

        }


        $("apiStatus").innerHTML =
            '<span class="dot online"></span>' +
            '<span>API connected</span>';


        render(
            responseData
        );


    } catch (error) {

        console.error(
            "Backend connection error:",
            error
        );


        $("apiStatus").innerHTML =
            '<span class="dot offline"></span>' +
            '<span>API unavailable</span>';


        $("lastUpdated").textContent =
            "Backend unavailable";
    }
}


// ------------------------------------------------------------
// SAVE API URL
// ------------------------------------------------------------

$("saveApi").onclick = () => {

    apiBase =
        $("apiUrl")
            .value
            .trim()
            .replace(/\/$/, "");


    if (!apiBase) {

        apiBase =
            "http://127.0.0.1:8000";

        $("apiUrl").value =
            apiBase;

    }


    localStorage.setItem(
        "vitalguard_api",
        apiBase
    );


    fetchData();
};


// ------------------------------------------------------------
// REFRESH
// ------------------------------------------------------------

$("refreshBtn").onclick =
    fetchData;


// ------------------------------------------------------------
// DEMO MODE
// ------------------------------------------------------------

$("demoBtn").onclick = () => {

    demo = !demo;


    $("demoBtn").textContent =
        demo
            ? "Live Mode"
            : "Demo Mode";


    fetchData();
};


// ------------------------------------------------------------
// WHAT-IF SLIDERS
// ------------------------------------------------------------

["wiTemp", "wiHumidity", "wiHr"]
    .forEach(id => {

        const slider =
            $(id);

        const output =
            $(id + "Out");


        if (!slider || !output) {
            return;
        }


        slider.oninput = () => {

            if (id === "wiTemp") {

                output.textContent =
                    slider.value + "°C";

            }

            else if (id === "wiHumidity") {

                output.textContent =
                    slider.value + "%";

            }

            else {

                output.textContent =
                    slider.value + " bpm";

            }

        };

    });


// ------------------------------------------------------------
// WHAT-IF SIMULATION
// ------------------------------------------------------------

$("simulateBtn").onclick =
    async () => {

        const ambientTemperature =
            Number(
                $("wiTemp").value
            );


        const humidity =
            Number(
                $("wiHumidity").value
            );


        const heartRate =
            Number(
                $("wiHr").value
            );


        // ----------------------------------------------------
        // Make sure we have current live data
        // ----------------------------------------------------

        if (!latestData ||
            !latestData.vitals) {

            $("whatifResult").textContent =
                "No live backend data available. Refresh the dashboard first.";

            return;

        }


        const environment =
            latestData.environment ||
            {};


        const rppg =
            latestData.rppg ||
            {};


        const vitals =
            latestData.vitals ||
            {};


        // ----------------------------------------------------
        // BUILD EXACT BACKEND REQUEST
        // ----------------------------------------------------

        const payload = {

            data: {

                timestamp:
                    latestData.timestamp ||
                    new Date().toISOString(),


                heart_rate:
                    Number(
                        vitals.heart_rate ??
                        rppg.heart_rate ??
                        104
                    ),


                spo2:
                    Number(
                        vitals.spo2 ??
                        95
                    ),


                body_temperature:
                    Number(
                        vitals.body_temperature ??
                        37.2
                    ),


                ambient_temperature:
                    Number(
                        environment.temperature ??
                        36
                    ),


                humidity:
                    Number(
                        environment.humidity ??
                        75
                    ),


                activity_level:
                    vitals.activity_level ||
                    "walking",


                rppg_quality:
                    Number(
                        rppg.quality
                    ) || 0.8,


                sensor_quality:
                    Number(
                        latestData.sensor_quality
                    ) || 0.87

            },


            changes: {

                ambient_temperature:
                    ambientTemperature,

                humidity:
                    humidity,

                heart_rate:
                    heartRate

            }

        };


        // ----------------------------------------------------
        // DEMO MODE
        // ----------------------------------------------------

        if (demo) {

            const score =
                Math.min(
                    100,
                    Math.max(
                        0,
                        Math.round(

                            (ambientTemperature - 20) * 2 +

                            (humidity - 30) * 0.4 +

                            Math.max(
                                0,
                                heartRate - 70
                            ) * 0.7

                        )
                    )
                );


            let level =
                "LOW";


            if (score >= 70) {

                level =
                    "HIGH";

            }

            else if (score >= 40) {

                level =
                    "MODERATE";

            }


            $("whatifResult").innerHTML = `

                <strong>
                    Predicted Risk: ${score}/100
                </strong>

                <br>

                Risk Level:
                <strong>${level}</strong>

                <br>

                <small>
                    Demo simulation
                </small>

            `;

            return;

        }


        // ----------------------------------------------------
        // CALL BACKEND
        // ----------------------------------------------------

        $("whatifResult").textContent =
            "Running AI simulation...";


        try {

            let response = null;


            // First try the endpoint expected by UI
            try {

                response =
                    await fetch(
                        apiBase + "/whatif",
                        {

                            method: "POST",

                            headers: {

                                "Content-Type":
                                    "application/json"

                            },

                            body:
                                JSON.stringify(
                                    payload
                                )

                        }
                    );

            }

            catch (error) {

                console.log(
                    "Trying /what-if fallback..."
                );

            }


            // If /whatif doesn't work,
            // try original backend endpoint
            if (!response ||
                !response.ok) {

                response =
                    await fetch(
                        apiBase + "/what-if",
                        {

                            method: "POST",

                            headers: {

                                "Content-Type":
                                    "application/json"

                            },

                            body:
                                JSON.stringify(
                                    payload
                                )

                        }
                    );

            }


            if (!response.ok) {

                throw new Error(
                    "HTTP " +
                    response.status
                );

            }


            const result =
                await response.json();


            // ------------------------------------------------
            // RESULT VALUES
            // ------------------------------------------------

            const predictedRisk =
                Number(
                    result.predicted_risk ??
                    result.risk_score ??
                    0
                );


            const riskLevel =
                result.risk_level ??
                result.level ??
                "--";


            let confidence =
                Number(
                    result.confidence ??
                    0
                );


            if (confidence <= 1) {

                confidence *= 100;

            }


            // ------------------------------------------------
            // DISPLAY RESULT
            // ------------------------------------------------

            $("whatifResult").innerHTML = `

                <div style="
                    display:flex;
                    flex-direction:column;
                    gap:8px;
                ">

                    <div style="
                        font-size:20px;
                        font-weight:700;
                    ">

                        Predicted Risk:
                        ${predictedRisk.toFixed(1)}
                        / 100

                    </div>


                    <div>

                        Risk Level:
                        <strong>
                            ${riskLevel}
                        </strong>

                    </div>


                    <div>

                        Confidence:
                        ${confidence.toFixed(1)}%

                    </div>


                    <div style="
                        margin-top:8px;
                        padding:10px;
                        background:#111f35;
                        border-radius:8px;
                    ">

                        Simulation:

                        ${ambientTemperature}°C,
                        ${humidity}% humidity,
                        ${heartRate} bpm

                    </div>

                </div>

            `;


        } catch (error) {

            console.error(
                "What-If simulation error:",
                error
            );


            $("whatifResult").textContent =
                "What-If simulation failed. Check that the FastAPI backend is running.";

        }

    };


// ------------------------------------------------------------
// INITIAL LOAD
// ------------------------------------------------------------

fetchData();


// ------------------------------------------------------------
// AUTOMATIC REFRESH
// Every 5 seconds
// ------------------------------------------------------------

setInterval(
    fetchData,
    5000
);