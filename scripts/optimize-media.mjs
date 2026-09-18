import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { optimize } from 'svgo';

// Run against the assets/images directory
const imagesDir = path.join(process.cwd(), 'assets', 'images');

if (!fs.existsSync(imagesDir)) {
  console.log('No assets/images directory found. Skipping media optimization.');
  process.exit(0);
}

const files = fs.readdirSync(imagesDir);

const responsiveImages = {
  'logo.webp': [64, 128, 256],
  'logo.png': [64, 128, 256],
  'logo.jpg': [64, 128, 256]
};

async function processMedia() {
  console.log('Starting Media Optimization...');
  let totalSaved = 0;

  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    const filePath = path.join(imagesDir, file);
    
    // Skip already generated responsive variants so we don't infinitely process them
    if (file.match(/-\d+\.webp$/)) {
      continue;
    }

    const originalSize = fs.statSync(filePath).size;

    if (ext === '.svg') {
      process.stdout.write(`Optimizing SVG: ${file}... `);
      const svgData = fs.readFileSync(filePath, 'utf8');
      const result = optimize(svgData, { 
        path: filePath, 
        multipass: true,
        plugins: [{ name: 'preset-default' }]
      });
      fs.writeFileSync(filePath, result.data);
      
      const newSize = result.data.length;
      totalSaved += (originalSize - newSize);
      console.log(`Done! (${(originalSize/1024).toFixed(1)}kb -> ${(newSize/1024).toFixed(1)}kb)`);
      
    } else if (['.png', '.jpg', '.jpeg', '.webp', '.avif'].includes(ext)) {
      const parsedPath = path.parse(filePath);
      const sizes = responsiveImages[file] || [];
      
      if (sizes.length > 0) {
        console.log(`Generating responsive sizes for ${file}: [${sizes.join(', ')}]`);
        const imgBuffer = fs.readFileSync(filePath);
        let totalNewSize = 0;
        
        for (const size of sizes) {
           const outPath = path.join(imagesDir, `${parsedPath.name}-${size}.webp`);
           await sharp(imgBuffer)
             .resize({ width: size, height: size, fit: 'inside', withoutEnlargement: true })
             .webp({ quality: 75, effort: 6 }) // Minor lossy compression for huge size savings
             .toFile(outPath);
           const newSize = fs.statSync(outPath).size;
           totalNewSize += newSize;
           console.log(`  -> ${parsedPath.name}-${size}.webp (${(newSize/1024).toFixed(1)}kb)`);
        }
        
        // Remove the un-sized version so it isn't deployed, we only use the sized ones
        fs.unlinkSync(filePath);
        totalSaved += (originalSize - totalNewSize);
        console.log(`  -> Original removed. Saved ${(originalSize/1024 - totalNewSize/1024).toFixed(1)}kb overall.`);
      } else {
        // Normal single-file optimization logic for non-responsive images
        process.stdout.write(`Optimizing Image: ${file}... `);
        const outPath = path.join(imagesDir, `${parsedPath.name}.webp`);
        const isSameFile = ext === '.webp';
        const tempPath = isSameFile ? path.join(imagesDir, `${parsedPath.name}.temp.webp`) : outPath;
        
        await sharp(fs.readFileSync(filePath))
          .webp({ quality: 80, effort: 6 })
          .toFile(tempPath);
          
        if (isSameFile) {
          fs.renameSync(tempPath, filePath);
        } else {
          fs.unlinkSync(filePath);
        }
        
        const newSize = fs.statSync(isSameFile ? filePath : outPath).size;
        totalSaved += (originalSize - newSize);
        console.log(`Done! (${(originalSize/1024).toFixed(1)}kb -> ${(newSize/1024).toFixed(1)}kb)`);
      }
    } else {
      console.log(`Skipping unknown media type: ${file}`);
    }
  }
  
  console.log(`\nMedia Optimization Complete! Total saved: ${(totalSaved/1024).toFixed(2)} KB.`);
}

processMedia().catch(err => {
  console.error('\nError optimizing media:', err);
  process.exit(1);
});
