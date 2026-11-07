// Visitor Counter
const visitorCountElement = document.getElementById("visitor-count");

async function updateVisitorCount() {
    try {
        visitorCountElement.textContent = "Connecting...";

        // Azure Function API endpoint will be added here later.

    } catch (error) {
        console.error("Visitor counter error:", error);
        visitorCountElement.textContent = "Unavailable";
    }
}

updateVisitorCount();
