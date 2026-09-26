// FOR HOME PAGE 
const nameDesigns = [
    "ImageBin/home/NicholasGreiner_T1.png",
    "ImageBin/home/NicholasGreiner_T2.gif",
    "ImageBin/home/NicholasGreiner_T3.png",
    "ImageBin/home/NicholasGreiner_T4.png",
    "ImageBin/home/NicholasGreiner_T5.png"
];

const nameSwitch = document.querySelector("#name-switch");
const nameText = document.querySelector("#name-text");
const nameImage = document.querySelector("#name-image");
let currentNameDesign = -1;

if (nameSwitch && nameText && nameImage) {
    nameSwitch.addEventListener("click", () => {
        currentNameDesign = (currentNameDesign + 1) % nameDesigns.length;
        nameImage.src = nameDesigns[currentNameDesign];
        nameText.hidden = true;
        nameImage.hidden = false;
    });
}
