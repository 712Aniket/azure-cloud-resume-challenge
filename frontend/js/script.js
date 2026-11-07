// Visitor Counter
const visitorCountElement = document.getElementById("visitor-count");

const API_URL = "http://localhost:7071/api/visitor-count";

async function updateVisitorCount() {
    try {
        visitorCountElement.textContent = "Connecting...";

        const response = await fetch(API_URL);

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();

        visitorCountElement.textContent = data.visitor_count;

    } catch (error) {
        console.error("Visitor counter error:", error);
        visitorCountElement.textContent = "Unavailable";
    }
}

updateVisitorCount();
