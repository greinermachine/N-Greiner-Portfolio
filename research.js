// RESEARCH PAGE: progressively enhance real image links; native disclosures need no JS.
const researchViewer = document.querySelector("#research-viewer");

if (researchViewer && typeof researchViewer.showModal === "function") {
    const researchImage = researchViewer.querySelector("#research-viewer-image");
    const researchCaption = researchViewer.querySelector("#research-viewer-caption");
    const researchOriginal = researchViewer.querySelector("#research-viewer-original");
    const researchError = researchViewer.querySelector(".research-viewer-error");
    let researchOpener = null;

    document.addEventListener("click", (event) => {
        const link = event.target.closest("a[data-research-image]");
        if (!link || event.defaultPrevented || event.button !== 0 ||
            event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
            return;
        }

        event.preventDefault();
        researchOpener = link;
        const thumbnail = link.querySelector("img");
        const caption = link.dataset.caption || thumbnail?.alt || "Research image";
        researchCaption.textContent = caption;
        researchImage.alt = thumbnail?.alt || caption;
        researchError.hidden = true;
        researchImage.hidden = false;
        researchOriginal.href = link.href;
        researchImage.src = link.href;
        researchViewer.showModal();
        document.documentElement.classList.add("research-dialog-open");
    });

    researchImage.addEventListener("error", () => {
        researchImage.hidden = true;
        researchError.hidden = false;
    });

    // Keep keyboard navigation cycling through the close and original-image controls.
    researchViewer.addEventListener("keydown", (event) => {
        if (event.key !== "Tab") {
            return;
        }
        const firstControl = researchViewer.querySelector("button");
        if (event.shiftKey && document.activeElement === firstControl) {
            event.preventDefault();
            researchOriginal.focus();
        } else if (!event.shiftKey && document.activeElement === researchOriginal) {
            event.preventDefault();
            firstControl.focus();
        }
    });

    // Only a click on the backdrop closes the viewer; image, caption and panel clicks stay open.
    researchViewer.addEventListener("click", (event) => {
        if (event.target !== researchViewer) {
            return;
        }
        const bounds = researchViewer.getBoundingClientRect();
        if (event.clientX < bounds.left || event.clientX > bounds.right ||
            event.clientY < bounds.top || event.clientY > bounds.bottom) {
            researchViewer.close();
        }
    });

    // Also runs for the native Escape action and the visible form-method="dialog" close button.
    researchViewer.addEventListener("close", () => {
        document.documentElement.classList.remove("research-dialog-open");
        researchImage.hidden = true;
        researchImage.removeAttribute("src");
        if (researchOpener?.isConnected) {
            researchOpener.focus({ preventScroll: true });
        }
        researchOpener = null;
    });
}
