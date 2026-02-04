
export interface WeatherAlert {
    headline: string;
    msgtype: string;
    severity: string; // 'Extreme', 'Severe', 'Moderate', 'Minor'
    urgency: string;
    areas: string;
    category: string;
    certainty: string;
    event: string;
    note: string;
    effective: string;
    expires: string;
    desc: string;
    instruction: string;
}

// Open-Meteo WMO Code Interpreter
const getWMOAlert = (code: number): Partial<WeatherAlert> | null => {
    // THUNDERSTORM (Critical)
    if ([95, 96, 99].includes(code)) {
        return {
            event: "Tempestade Severa",
            severity: "Extreme",
            headline: "Alerta de Tempestade",
            desc: "Condições de tempestade com raios e possíveis rajadas de vento detectadas na região.",
            instruction: "Evite áreas abertas e não se abrigue debaixo de árvores."
        };
    }
    // HEAVY RAIN (Warning)
    if ([63, 65, 81, 82].includes(code)) {
        return {
            event: "Chuva Intensa",
            severity: "Severe",
            headline: "Alerta de Chuva Forte",
            desc: "Precipitação de alta intensidade detectada. Risco de alagamentos pontuais.",
            instruction: "Redobre a atenção em áreas propensas a deslizamentos."
        };
    }
    // DRIZZLE / LIGHT RAIN (Info - Optional, maybe don't show banner?)
    if ([51, 53, 55, 61].includes(code)) {
        // Return null to NOT show banner for light rain, or show 'Minor'
        return null;
    }

    return null; // Clear weather
};

const BASE_URL = 'https://api.open-meteo.com/v1/forecast';
const LAT = -23.2236;
const LNG = -44.7156;

export const fetchWeatherAlerts = async (city: string = 'Paraty'): Promise<WeatherAlert[]> => {
    try {
        // 1. Fetch Real Data from Open-Meteo (No Key Needed)
        const response = await fetch(`${BASE_URL}?latitude=${LAT}&longitude=${LNG}&current=weather_code,wind_speed_10m&timezone=auto`);

        if (!response.ok) throw new Error('Open-Meteo Fetch Failed');

        const data = await response.json();
        const currentCode = data.current.weather_code;
        const windSpeed = data.current.wind_speed_10m;

        // --- SIMULATION OVERRIDE FOR DEMO ---
        // Change this to 'false' to use REAL live weather
        const FRAMEWORK_DEMO_MODE = false;

        let activeAlertData = getWMOAlert(currentCode);

        // Logic: If wind > 50km/h, trigger wind alert if no other alert exists
        if (!activeAlertData && windSpeed > 50) {
            activeAlertData = {
                event: "Ventos Fortes",
                severity: "Moderate",
                headline: "Alerta de Vendaval",
                desc: `Rajadas de vento de ${windSpeed}km/h detectadas.`,
                instruction: "Cuidado com queda de galhos e objetos soltos."
            };
        }

        if (FRAMEWORK_DEMO_MODE) {
            // Overwrite with a Mock Thunderstorm for functionality review
            activeAlertData = {
                event: "Tempestade (Simulação)",
                severity: "Extreme",
                headline: "Simulação de Alerta",
                note: "Open-Meteo Demo",
                desc: "Este é um alerta simulado usando a infraestrutura Open-Meteo. O código WMO seria 95.",
                instruction: "Para ver o clima real, altere FRAMEWORK_DEMO_MODE para false no arquivo WeatherService."
            };
        }

        if (activeAlertData) {
            // Map to full WeatherAlert object
            return [{
                headline: activeAlertData.headline!,
                msgtype: "Alert",
                severity: activeAlertData.severity || "Moderate",
                urgency: "Immediate",
                areas: "Paraty, RJ",
                category: "Met",
                certainty: "Observed",
                event: activeAlertData.event!,
                note: activeAlertData.note || "Monitoramento Automático",
                effective: new Date().toISOString(),
                expires: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
                desc: activeAlertData.desc!,
                instruction: activeAlertData.instruction!
            }];
        }

        return [];

    } catch (error) {
        console.warn('Open-Meteo Service Error', error);
        return [];
    }
};
