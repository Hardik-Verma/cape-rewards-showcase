const sharp = require('sharp');
const fs = require('fs');

async function processLogo() {
    console.log("Processing new Capeverse logo...");
    
    if (!fs.existsSync('logo.png')) {
        console.error("ERROR: logo.png not found in the current directory!");
        return;
    }

    try {
        // Create public/logo.png (resized for navbar to save bandwidth)
        await sharp('logo.png')
            .resize(200, 200, { fit: 'inside' })
            .toFile('public/logo.png');
        console.log("✅ Created public/logo.png");

        // Create public/favicon.ico
        await sharp('logo.png')
            .resize(64, 64)
            .toFile('public/favicon.ico');
        console.log("✅ Created public/favicon.ico");

        console.log("🎉 Logo processing complete! You can now upload the public folder to InfinityFree.");
    } catch (err) {
        console.error("Error processing logo:", err);
    }
}

processLogo();
