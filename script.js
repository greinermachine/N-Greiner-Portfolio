const messages = [
    "I needed a portfolio.\n\nApparently a PDF was not dramatic enough.",
    "I spent several hours making this website look like I did not spend several hours making this website.",
    "Independent peer review\n\nReviewer: me\nSample size: 1\nConfidence: extremely high",
    "Built using advanced technologies including HTML.",
    "If something on this website looks unusually well aligned, please know that it was not always that way."
];

const infoTrigger = document.querySelector("#info-trigger");
const infoPanel = document.querySelector("#info-panel");
const infoMessage = document.querySelector("#info-message");
const infoClose = document.querySelector("#info-close");

let lastMessageIndex = -1;
let pointerStartedOutside = false;

function openInfoPanel(event) {
    let messageIndex;

    // Pick again if the result matches the previous opening.
    do {
        messageIndex = Math.floor(Math.random() * messages.length);
    } while (messageIndex === lastMessageIndex);

    lastMessageIndex = messageIndex;
    infoMessage.textContent = messages[messageIndex];

    // Keyboard activation opens instantly; pointer activation gets the CSS entrance.
    infoPanel.dataset.instant = event.detail === 0;
    infoPanel.showModal();
    infoTrigger.setAttribute("aria-expanded", "true");
}

function closeInfoPanel() {
    infoPanel.close();
    infoTrigger.setAttribute("aria-expanded", "false");
    infoTrigger.focus({ preventScroll: true });
}

infoTrigger.addEventListener("click", openInfoPanel);
infoClose.addEventListener("click", closeInfoPanel);

// Native dialogs send a cancel event when Escape is pressed.
infoPanel.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeInfoPanel();
});

function isOutsideInfoPanel(event) {
    const bounds = infoPanel.getBoundingClientRect();
    return event.clientX < bounds.left || event.clientX > bounds.right ||
        event.clientY < bounds.top || event.clientY > bounds.bottom;
}

// Require the click to start and finish outside, so selecting text won't close it.
infoPanel.addEventListener("pointerdown", (event) => {
    pointerStartedOutside = isOutsideInfoPanel(event);
});

infoPanel.addEventListener("click", (event) => {
    if (pointerStartedOutside && isOutsideInfoPanel(event)) {
        closeInfoPanel();
    }
    pointerStartedOutside = false;
});
