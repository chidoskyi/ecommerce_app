import * as fs from "fs";
import * as path from "path";

const imagePath = path.join(__dirname, "public", "fruit.webp");
const imageBuffer = fs.readFileSync(imagePath);

console.log("Image loaded:", imageBuffer.length, "bytes");
