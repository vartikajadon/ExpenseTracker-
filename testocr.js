const Tesseract = require('tesseract.js');
const fs = require('fs');

async function test() {
    try {
        console.log("Loading worker...");
        const worker = await Tesseract.createWorker('eng');
        console.log("Worker initialized.");
        await worker.terminate();
    } catch (err) {
        console.error("TESSERACT ERROR:");
        console.error(err);
    }
}
test();
