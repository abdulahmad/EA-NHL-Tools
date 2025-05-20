// quantizeColors-fixed.js - A fixed version of the quantize colors function to use in genesis-color-reduce.js

// Quantize colors to a smaller palette using k-means clustering
export function quantizeColors(colorMap, maxColors) {
    // Extract color points with their frequencies
    const colorPoints = [];
    for (const [key, count] of colorMap.entries()) {
        const [r, g, b] = key.split(',').map(Number);
        // We'll use Lab color space for better clustering
        const lab = rgbToLab(r, g, b);
        colorPoints.push({
            r, g, b,
            l: lab.l, 
            a: lab.a, 
            bValue: lab.b, // Renamed to avoid conflict with the RGB 'b' property
            count
        });
    }
    
    // Initialize centroids with "k-means++" approach
    const centroids = [];
    
    // First centroid - pick randomly with probability proportional to frequency
    let totalCount = 0;
    for (const point of colorPoints) {
        totalCount += point.count;
    }
    
    let rnd = Math.random() * totalCount;
    let selectedIndex = 0;
    for (let i = 0; i < colorPoints.length; i++) {
        rnd -= colorPoints[i].count;
        if (rnd <= 0) {
            selectedIndex = i;
            break;
        }
    }
    
    // Add first centroid
    centroids.push({...colorPoints[selectedIndex]});
    
    // Choose remaining centroids
    for (let k = 1; k < maxColors && k < colorPoints.length; k++) {
        // Calculate minimum distance from each point to any existing centroid
        const distances = [];
        for (const point of colorPoints) {
            let minDistance = Infinity;
            for (const centroid of centroids) {
                const distance = Math.sqrt(
                    Math.pow(point.l - centroid.l, 2) +
                    Math.pow(point.a - centroid.a, 2) +
                    Math.pow(point.bValue - centroid.bValue, 2)
                ) * point.count; // Weight by frequency
                
                minDistance = Math.min(minDistance, distance);
            }
            distances.push(minDistance);
        }
        
        // Choose point with maximum distance as the next centroid
        let maxDistance = -1;
        let maxIndex = -1;
        for (let i = 0; i < distances.length; i++) {
            if (distances[i] > maxDistance) {
                maxDistance = distances[i];
                maxIndex = i;
            }
        }
        
        centroids.push({...colorPoints[maxIndex]});
    }
    
    // Run k-means iterations
    const MAX_ITERATIONS = 10;
    for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
        // Assign points to clusters
        const clusters = Array(centroids.length).fill().map(() => []);
        
        for (const point of colorPoints) {
            let minDistance = Infinity;
            let closestCentroid = 0;
            
            for (let i = 0; i < centroids.length; i++) {
                const distance = Math.sqrt(
                    Math.pow(point.l - centroids[i].l, 2) +
                    Math.pow(point.a - centroids[i].a, 2) +
                    Math.pow(point.bValue - centroids[i].bValue, 2)
                );
                
                if (distance < minDistance) {
                    minDistance = distance;
                    closestCentroid = i;
                }
            }
            
            clusters[closestCentroid].push(point);
        }
        
        // Update centroids
        let changed = false;
        for (let i = 0; i < centroids.length; i++) {
            if (clusters[i].length === 0) continue;
            
            let sumL = 0, sumA = 0, sumBValue = 0, sumR = 0, sumG = 0, sumBlue = 0, totalWeight = 0;
            
            for (const point of clusters[i]) {
                sumL += point.l * point.count;
                sumA += point.a * point.count;
                sumBValue += point.bValue * point.count;
                sumR += point.r * point.count;
                sumG += point.g * point.count;
                sumBlue += point.b * point.count;
                totalWeight += point.count;
            }
            
            // Ensure RGB values are clamped to valid range 0-255
            const clamp = (value) => Math.max(0, Math.min(255, Math.round(value)));
            
            const newCentroid = {
                l: sumL / totalWeight,
                a: sumA / totalWeight,
                bValue: sumBValue / totalWeight,
                r: clamp(sumR / totalWeight),
                g: clamp(sumG / totalWeight),
                b: clamp(sumBlue / totalWeight),
                count: totalWeight
            };
            
            // Check if centroid changed significantly
            const dist = Math.sqrt(
                Math.pow(newCentroid.l - centroids[i].l, 2) +
                Math.pow(newCentroid.a - centroids[i].a, 2) +
                Math.pow(newCentroid.bValue - centroids[i].bValue, 2)
            );
            
            if (dist > 1.0) {
                changed = true;
            }
            
            centroids[i] = newCentroid;
        }
        
        // If centroids didn't change much, we're done
        if (!changed) break;
    }
    
    // Convert centroids to the format expected by the rest of the code
    return centroids.map(c => ({
        r: c.r,
        g: c.g,
        b: c.b,
        count: c.count
    }));
}

// Helper function for lab color conversion
function rgbToLab(r, g, b) {
    // Convert RGB to XYZ
    let rr = r / 255;
    let gg = g / 255;
    let bb = b / 255;
    
    rr = rr > 0.04045 ? Math.pow((rr + 0.055) / 1.055, 2.4) : rr / 12.92;
    gg = gg > 0.04045 ? Math.pow((gg + 0.055) / 1.055, 2.4) : gg / 12.92;
    bb = bb > 0.04045 ? Math.pow((bb + 0.055) / 1.055, 2.4) : bb / 12.92;
    
    const x = (rr * 0.4124 + gg * 0.3576 + bb * 0.1805) / 0.95047;
    const y = (rr * 0.2126 + gg * 0.7152 + bb * 0.0722) / 1.00000;
    const z = (rr * 0.0193 + gg * 0.1192 + bb * 0.9505) / 1.08883;
    
    // Convert XYZ to Lab
    const xr = x > 0.008856 ? Math.pow(x, 1/3) : (7.787 * x) + 16/116;
    const yr = y > 0.008856 ? Math.pow(y, 1/3) : (7.787 * y) + 16/116;
    const zr = z > 0.008856 ? Math.pow(z, 1/3) : (7.787 * z) + 16/116;
    
    const l = (116 * yr) - 16;
    const a = 500 * (xr - yr);
    const bb2 = 200 * (yr - zr);
    
    return { l, a, b: bb2 };
}
