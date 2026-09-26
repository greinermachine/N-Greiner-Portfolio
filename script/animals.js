// ANIMALS PAGE
const animalsPage = document.querySelector(".animals-page");

if (animalsPage) {
    // Names and photo groupings follow the supplied records. Foster profiles show only name and species.
    // Shared photos appear in both animals' galleries. Keep original filename casing.
    const animals = [
        {
            name: "Imoogi", species: "Lizard", categories: ["current"], frame: "gold",
            stats: [["Status", "Local menace"], ["Age", "6"], ["Occupation", "Basker"], ["Likes", "bugs, greens, digging, and sunlight"], ["Dislikes", "Cold temperatures, and not being alpha"], ["Known crimes", "Terrorizing cats, and biting humans"]],
            photos: [
                { src: "ImageBin/animals/owned/imoogi1.png", alt: "Imoogi resting on a hand", caption: "" },
                { src: "ImageBin/animals/owned/imoogi2.png", alt: "Imoogi perched on a woven hammock", caption: "" },
                { src: "ImageBin/animals/owned/imoogi3.JPG", alt: "Imoogi in an enclosure beside branches", caption: "" },
                { src: "ImageBin/animals/owned/nikoximoogi.jpeg", alt: "Niko in front of Imoogi's enclosure, with Imoogi inside", caption: "" }
            ]
        },
        {
            name: "Nala", species: "Cat", categories: ["current"], frame: "wood",
            stats: [["Status", "Window Watcher, always indoors"], ["Age", "3"], ["Occupation", "Door scratcher"], ["Likes", "eating wet food, meowing, and scratching things"], ["Dislikes", "humans, staying inside"], ["Known crimes", "lizard killer, previously HOMELESS"]],
            photos: [
                { src: "ImageBin/animals/owned/nala.jpeg", alt: "Nala curled up in a laundry basket", caption: "" },
                { src: "ImageBin/animals/owned/nala1.jpeg", alt: "Nala resting on the back of a couch", caption: "" },
                { src: "ImageBin/animals/owned/nala2.jpeg", alt: "Nala sitting beside a notebook", caption: "" },
                { src: "ImageBin/animals/owned/nala3.JPG", alt: "Nala looking up at a cat printed on a curtain", caption: "" },
                { src: "ImageBin/animals/owned/nalaxniko.jpeg", alt: "Nala and Niko on a couch", caption: "" },
                { src: "ImageBin/animals/owned/nalaxniko2.jpeg", alt: "Nala and Niko resting together on a patterned blanket", caption: "" }
            ]
        },
        {
            name: "Niko", species: "Cat", categories: ["current"], frame: "wood",
            stats: [["Status", "cuddle duty 24/7"], ["Age", "2"], ["Occupation", "LOVER"], ["Likes", "cuddling, eating dry food, and cat toys"], ["Dislikes", "loud noises, and scary men"], ["Known crimes", "eating plastic, toe biter"]],
            photos: [
                { src: "ImageBin/animals/owned/niko.jpeg", alt: "Niko yawning beside a window", caption: "" },
                { src: "ImageBin/animals/owned/niko2.jpeg", alt: "Niko stretching a paw along a windowsill", caption: "" },
                { src: "ImageBin/animals/owned/niko3.jpeg", alt: "Niko sitting in a bathtub", caption: "" },
                { src: "ImageBin/animals/owned/niko4.jpeg", alt: "Niko standing upright on furniture", caption: "" },
                { src: "ImageBin/animals/owned/nalaxniko.jpeg", alt: "Nala and Niko on a couch", caption: "" },
                { src: "ImageBin/animals/owned/nalaxniko2.jpeg", alt: "Nala and Niko resting together on a patterned blanket", caption: "" },
                { src: "ImageBin/animals/owned/nikoximoogi.jpeg", alt: "Niko in front of Imoogi's enclosure, with Imoogi inside", caption: "" }
            ]
        },
        {
            name: "Fuji", species: "Cat", categories: ["foster"], frame: "polaroid",
            photos: [
                { src: "ImageBin/animals/fosters/chess.jpeg", alt: "Fuji resting on a colorful blanket", caption: "" }
            ]
        },
        {
            name: "Chunkie", species: "Cat", categories: ["foster"], frame: "polaroid",
            photos: [
                { src: "ImageBin/animals/fosters/chunkie.jpeg", alt: "Chunkie lounging on a cat tree", caption: "" }
            ]
        },
        {
            name: "Tabitha", species: "Cat", categories: ["foster"], frame: "polaroid",
            photos: [
                { src: "ImageBin/animals/fosters/tab.jpeg", alt: "Tab resting beside a window", caption: "" }
            ]
        },
        {
            name: "Zeva", species: "Cat", categories: ["foster"], frame: "polaroid",
            photos: [
                { src: "ImageBin/animals/fosters/zeva.jpeg", alt: "Zeva stretched out on a couch", caption: "" }
            ]
        }
    ];

    const find = (id) => animalsPage.querySelector(`#${id}`);
    const filter = find("animal-filter");
    const photo = find("animal-photo");
    const missingPhoto = find("animal-photo-missing");
    const photoPrevious = find("animal-photo-previous");
    const photoNext = find("animal-photo-next");
    const animalPrevious = find("animal-previous");
    const animalNext = find("animal-next");
    let filteredAnimals = animals;
    let animalIndex = 0;
    let photoIndex = 0;

    // Missing graphics get plain text, including if a cached image failed before JS ran.
    animalsPage.querySelectorAll(".animal-asset").forEach((asset) => {
        const image = asset.querySelector("img");
        const fallback = asset.querySelector("[data-asset-fallback]");
        const updateAsset = () => {
            const loaded = image.complete && image.naturalWidth > 0;
            image.hidden = !loaded;
            fallback.hidden = loaded;
        };
        image.addEventListener("load", updateAsset);
        image.addEventListener("error", updateAsset);
        updateAsset();
    });

    photo.addEventListener("load", () => {
        photo.hidden = false;
        missingPhoto.hidden = true;
    });
    photo.addEventListener("error", () => {
        photo.hidden = true;
        missingPhoto.textContent = "Photograph not added or unavailable.";
        missingPhoto.hidden = false;
    });

    const renderPhoto = () => {
        const animal = filteredAnimals[animalIndex];
        const selectedPhoto = animal.photos[photoIndex];
        photo.hidden = true;
        missingPhoto.hidden = false;
        missingPhoto.textContent = selectedPhoto ? "Photograph loading…" : "Photograph not added yet.";
        photoPrevious.disabled = photoNext.disabled = animal.photos.length < 2;
        find("animal-photo-number").textContent = `photo ${selectedPhoto ? photoIndex + 1 : 0} / ${animal.photos.length}`;
        find("animal-photo-caption").textContent = selectedPhoto?.caption || animal.name || animal.placeholder || "Animal profile";
        if (selectedPhoto) {
            photo.alt = selectedPhoto.alt || `Photo ${photoIndex + 1} of ${animal.name || "an animal whose details are pending"}`;
            photo.src = selectedPhoto.src;
        } else {
            photo.removeAttribute("src");
        }
    };

    const renderAnimal = () => {
        const animal = filteredAnimals[animalIndex];
        const total = filteredAnimals.length;
        find("animal-profile").hidden = !animal;
        find("animal-empty").hidden = Boolean(animal);
        animalPrevious.disabled = animalNext.disabled = total < 2;
        find("animal-record-number").textContent = `PROFILE ${String(animal ? animalIndex + 1 : 0).padStart(2, "0")} / ${String(total).padStart(2, "0")}${animal ? ` — ${animal.name || animal.placeholder || "Unnamed animal"}` : ""}`;
        if (!animal) return;

        find("animal-photo-frame").className = `animal-photo-frame frame-${animal.frame || "gray"}`;
        const stats = find("animal-stats");
        stats.replaceChildren();
        [["Name", animal.name], ["Species", animal.species], ...(animal.stats || [])].forEach(([label, value]) => {
            const entry = document.createElement("div");
            entry.className = "animal-stat";
            const term = document.createElement("dt");
            const description = document.createElement("dd");
            term.textContent = `${label}:`;
            description.textContent = value === "" || value == null ? "[not entered]" : String(value);
            entry.append(term, description);
            stats.append(entry);
        });
        renderPhoto();
    };

    filter.addEventListener("change", () => {
        filteredAnimals = animals.filter((animal) => filter.value === "all" || animal.categories.includes(filter.value));
        animalIndex = photoIndex = 0;
        renderAnimal();
    });

    const changeAnimal = (direction) => {
        if (filteredAnimals.length < 2) return;
        animalIndex = (animalIndex + direction + filteredAnimals.length) % filteredAnimals.length;
        photoIndex = 0;
        renderAnimal();
    };
    const changePhoto = (direction) => {
        const total = filteredAnimals[animalIndex]?.photos.length || 0;
        if (total < 2) return;
        photoIndex = (photoIndex + direction + total) % total;
        renderPhoto();
    };
    animalPrevious.addEventListener("click", () => changeAnimal(-1));
    animalNext.addEventListener("click", () => changeAnimal(1));
    photoPrevious.addEventListener("click", () => changePhoto(-1));
    photoNext.addEventListener("click", () => changePhoto(1));

    // The heading image plays once, then the cat knocks only the small sign down.
    const paw = find("animal-paw");
    const pawImage = paw.querySelector("img");
    const pawStill = pawImage.getAttribute("src");
    const cat = find("animal-cat");
    const catImage = cat.querySelector("img");
    const catSource = catImage.getAttribute("src");
    const sign = find("animal-sign");
    const signHome = sign.parentElement;
    const fallLayer = find("animal-fall-layer");
    const reset = find("animal-reset");
    const gagStatus = find("animal-gag-status");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let gagState = "ready";
    let runNumber = 0;
    let pawStarted = false;
    let catStarted = false;
    let timers = [];
    let fallAnimation;
    let catAnimation;
    let landingTransform = "";

    const sizeFallLayer = () => {
        // Measure the document without letting an earlier run inflate its height.
        fallLayer.style.height = "0px";
        const pageHeight = document.documentElement.scrollHeight;
        fallLayer.style.height = `${pageHeight}px`;
        return pageHeight;
    };
    const freshSource = (source) => {
        const url = new URL(source, document.baseURI);
        url.searchParams.set("run", String(runNumber));
        return url.href;
    };
    const clearRun = () => {
        timers.forEach(clearTimeout);
        timers = [];
        fallAnimation?.cancel();
        catAnimation?.cancel();
        fallAnimation = catAnimation = null;
        cat.hidden = true;
        pawImage.src = pawStill;
    };
    const landSign = () => {
        if (gagState === "ready") return;
        gagState = "fallen";
        sign.dataset.gagState = gagState;
        sign.style.transform = landingTransform;
        gagStatus.textContent = "The sign fell. Use put it back to restore it.";
    };
    const dropSign = () => {
        if (gagState !== "running" && gagState !== "paw") return;
        gagState = "falling";
        const bounds = sign.getBoundingClientRect();
        const pageHeight = sizeFallLayer();
        const documentTop = bounds.top + window.scrollY;
        const angle = 78 * Math.PI / 180;
        const rotatedWidth = bounds.width * Math.cos(angle) + bounds.height * Math.sin(angle);
        const rotatedHeight = bounds.width * Math.sin(angle) + bounds.height * Math.cos(angle);
        const centerX = bounds.left + bounds.width / 2;
        const landingX = Math.max(rotatedWidth / 2 + 12, Math.min(window.innerWidth - rotatedWidth / 2 - 12, centerX));
        const dropX = landingX - centerX;
        const dropY = pageHeight - 12 - rotatedHeight / 2 - (documentTop + bounds.height / 2);
        landingTransform = `translate(${dropX}px, ${dropY}px) rotate(78deg)`;
        sign.style.width = `${bounds.width}px`;
        sign.style.left = `${bounds.left}px`;
        sign.style.top = `${documentTop}px`;
        sign.classList.add("animal-sign-loose");
        sign.dataset.gagState = gagState;
        fallLayer.hidden = false;
        fallLayer.append(sign);
        if (reducedMotion.matches) {
            landSign();
            return;
        }
        fallAnimation = sign.animate([
            { transform: "translate(0, 0) rotate(0deg)", offset: 0 },
            { transform: "translate(0, 0) rotate(16deg)", offset: 0.18 },
            { transform: landingTransform, offset: 1 }
        ], { duration: 720, easing: "cubic-bezier(0.55, 0, 1, 0.45)" });
        fallAnimation.onfinish = landSign;
    };
    const startCatRun = () => {
        if (gagState !== "running" || catStarted) return;
        catStarted = true;
        // Keep the 500 x 50 strip at native size. Moving its container extends the
        // GIF's own run across the viewport without stretching the cat itself.
        const travel = window.innerWidth - 500;
        catAnimation = cat.animate([
            { transform: "translateX(0)" },
            { transform: `translateX(${travel}px)` }
        ], { duration: 4200, easing: "linear", fill: "forwards" });
        // Nose positions measured from cat_run.gif; its 10ms delays play as 100ms.
        const headPositions = [39, 49, 58, 67, 74, 82, 89, 104, 118, 130, 147, 163,
            174, 191, 202, 217, 231, 242, 256, 275, 292, 312, 322, 333, 348, 362,
            373, 387, 406, 423, 447, 458, 475, 486, 500];
        const contactX = sign.getBoundingClientRect().left;
        const contactFrame = headPositions.findIndex((x, frame) => x + travel * frame / 42 >= contactX);
        const contactDelay = catImage.naturalWidth > 0 && contactFrame >= 0 ? contactFrame * 100 : 500;
        timers.push(setTimeout(dropSign, contactDelay));
        timers.push(setTimeout(() => { cat.hidden = true; }, 4200));
    };
    catImage.addEventListener("load", startCatRun);
    catImage.addEventListener("error", startCatRun);

    const releaseCat = () => {
        if (gagState !== "paw") return;
        gagState = "running";
        pawImage.src = pawStill;
        const bounds = sign.getBoundingClientRect();
        sizeFallLayer();
        cat.style.top = `${bounds.bottom + window.scrollY - 50}px`;
        cat.hidden = false;
        fallLayer.hidden = false;
        gagStatus.textContent = "A cat is running toward the sign.";
        catImage.src = freshSource(catSource);
    };
    const playPaw = () => {
        if (gagState !== "paw" || pawStarted) return;
        pawStarted = true;
        // The original paw GIF has six frames totaling 1100ms. Play one cycle.
        timers.push(setTimeout(releaseCat, pawImage.naturalWidth > 0 ? 1100 : 0));
    };
    pawImage.addEventListener("load", playPaw);
    pawImage.addEventListener("error", playPaw);
    paw.addEventListener("click", () => {
        if (gagState !== "ready") return;
        gagState = "paw";
        runNumber += 1;
        pawStarted = catStarted = false;
        paw.setAttribute("aria-disabled", "true");
        reset.hidden = false;
        if (reducedMotion.matches) {
            dropSign();
            return;
        }
        pawImage.src = freshSource(pawImage.dataset.animationSrc);
    });

    const restoreSign = () => {
        gagState = "ready";
        clearRun();
        signHome.append(sign);
        sign.classList.remove("animal-sign-loose");
        sign.removeAttribute("style");
        delete sign.dataset.gagState;
        fallLayer.hidden = true;
        fallLayer.style.height = "";
        catImage.removeAttribute("src");
        reset.hidden = true;
        paw.removeAttribute("aria-disabled");
        gagStatus.textContent = "The sign is back.";
        paw.focus({ preventScroll: true });
    };
    reset.addEventListener("click", restoreSign);
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && gagState !== "ready") restoreSign();
    });
    reducedMotion.addEventListener("change", () => {
        if (!reducedMotion.matches || gagState === "ready") return;
        clearRun();
        if (gagState === "paw" || gagState === "running") dropSign();
        else landSign();
    });
    // Restore on a viewport change instead of stranding the sign off-screen.
    window.addEventListener("resize", () => {
        if (gagState !== "ready") restoreSign();
    });

    renderAnimal();
    paw.disabled = false;
    find("animals-unavailable").hidden = true;
}
