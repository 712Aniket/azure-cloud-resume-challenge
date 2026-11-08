// Visitor Counter
const visitorCountElement = document.getElementById("visitor-count");

const API_URL = "https://aniket-portfolio-api.azurewebsites.net/api/visitor-count";

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




// Certificate viewer functionality
const certificateModal = document.getElementById("certificate-modal");
const certificateImage = document.getElementById("certificate-image");
const certificateContainer = document.querySelector(".certificate-image-container");
const certificateClose = document.getElementById("certificate-close");

let certificateZoom = 1;

function updateCertificateZoom() {
    certificateImage.style.transform = `scale(${certificateZoom})`;
    certificateContainer.style.overflow = certificateZoom > 1 ? "auto" : "auto";
}

function openCertificate(card) {
    const certificatePath = card.dataset.certificate;
    card.classList.add("is-flipping");

    setTimeout(() => {
        card.classList.remove("is-flipping");
        certificateImage.src = certificatePath;
        certificateZoom = 1;
        updateCertificateZoom();
        certificateModal.classList.add("active");
        certificateModal.setAttribute("aria-hidden", "false");
        document.body.style.overflow = "hidden";
        certificateClose.focus();
    }, 320);
}

function closeCertificate() {
    certificateModal.classList.remove("active");
    certificateModal.setAttribute("aria-hidden", "true");
    certificateImage.src = "";
    document.body.style.overflow = "";
}

document.querySelectorAll(".certification-card").forEach(card => {
    card.addEventListener("click", () => openCertificate(card));
});

certificateClose.addEventListener("click", closeCertificate);

certificateModal.addEventListener("click", event => {
    if (event.target === certificateModal) {
        closeCertificate();
    }
});

document.getElementById("zoom-in").addEventListener("click", () => {
    certificateZoom = Math.min(certificateZoom + 0.2, 3);
    updateCertificateZoom();
});

document.getElementById("zoom-out").addEventListener("click", () => {
    certificateZoom = Math.max(certificateZoom - 0.2, 0.6);
    updateCertificateZoom();
});

document.getElementById("zoom-reset").addEventListener("click", () => {
    certificateZoom = 1;
    updateCertificateZoom();
});

document.addEventListener("keydown", event => {
    if (event.key === "Escape" && certificateModal.classList.contains("active")) {
        closeCertificate();
    }
});
