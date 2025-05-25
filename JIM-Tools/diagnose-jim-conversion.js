import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

/**
 * Comprehensive diagnostic tool for JIM to BMP conversion
 * 
 * This script creates a complete diagnostic workflow to:
 * 1. Analyze the original JIM file structure
 * 2. Extract the JIM to BMP using the latest fixed version
 * 3. Compare the extracted BMP with reference BMPs (if available)
 * 4. Provide detailed insights into problems in the conversion process
 */

// Default configuration
const CONFIG = {
    // Scripts to use
    jimAnalyzerScript: 'jim-data-structure-analyzer.js',
    extractScript: 'fixed-extractJimFull-v5.js',
    bmpCompareScript: 'advanced-bmp-compare.js',
    
    // Directories
    outputDir: 'diagnostic-results',
    
    // Reference BMP (if available)
    referenceOriginal: null,
    
    // Run options
    skipJimAnalysis: false,
    skipExtraction: false,
    skipBmpComparison: false,
    
    // Debug options
    verbose: false
};

/**
 * Run a Node.js script and capture output
 * @param {string} scriptPath - Path to script
 * @param {Array} args - Command line arguments
 * @returns {Promise<string>} - Output from the script
 */
function runScript(scriptPath, args = []) {
    return new Promise((resolve, reject) => {
        console.log(`Running: node ${scriptPath} ${args.join(' ')}`);
        
        const process = spawn('node', [scriptPath, ...args]);
        
        let stdout = '';
        let stderr = '';
        
        process.stdout.on('data', (data) => {
            const output = data.toString();
            stdout += output;
            if (CONFIG.verbose) console.log(output);
        });
        
        process.stderr.on('data', (data) => {
            const output = data.toString();
            stderr += output;
            if (CONFIG.verbose) console.error(output);
        });
        
        process.on('close', (code) => {
            if (code !== 0) {
                reject(new Error(`Script exited with code ${code}: ${stderr}`));
            } else {
                resolve(stdout);
            }
        });
    });
}

/**
 * Analyze a JIM file structure
 * @param {string} jimPath - Path to JIM file
 * @param {string} outputDir - Directory to write results
 * @returns {Promise<Object>} - Analysis results
 */
async function analyzeJimStructure(jimPath, outputDir) {
    if (CONFIG.skipJimAnalysis) {
        console.log('Skipping JIM analysis as per configuration');
        return null;
    }
    
    console.log(`\n=== ANALYZING JIM FILE STRUCTURE ===`);
    
    try {
        // Run the jim-data-structure-analyzer.js script
        const output = await runScript(CONFIG.jimAnalyzerScript, [jimPath]);
        
        // Find the analysis JSON file path from the output
        const jsonMatch = output.match(/See\s+([^\s]+)\s+for full analysis details/);
        let analysisFilePath = null;
        
        if (jsonMatch && jsonMatch[1]) {
            analysisFilePath = jsonMatch[1];
            
            // Copy analysis files to our output directory
            const filename = path.basename(analysisFilePath);
            const destination = path.join(outputDir, filename);
            fs.copyFileSync(analysisFilePath, destination);
            
            // Look for tile map file too
            const mapFilePath = analysisFilePath.replace('-analysis.json', '-tile-map.txt');
            if (fs.existsSync(mapFilePath)) {
                const mapDestination = path.join(outputDir, path.basename(mapFilePath));
                fs.copyFileSync(mapFilePath, mapDestination);
            }
            
            // Load the analysis results
            const analysisResults = JSON.parse(fs.readFileSync(analysisFilePath, 'utf8'));
            return analysisResults;
        }
        
        return { success: true, output };
    } catch (error) {
        console.error('Error analyzing JIM structure:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Extract a JIM file to BMP
 * @param {string} jimPath - Path to JIM file
 * @param {string} outputDir - Directory to write results
 * @returns {Promise<Object>} - Extraction results
 */
async function extractJimToBmp(jimPath, outputDir) {
    if (CONFIG.skipExtraction) {
        console.log('Skipping JIM extraction as per configuration');
        return null;
    }
    
    console.log(`\n=== EXTRACTING JIM TO BMP ===`);
    
    try {
        // Run the extraction script
        const output = await runScript(CONFIG.extractScript, [jimPath]);
        
        // Find the extracted BMP file path from the output
        const outputDirMatch = output.match(/Output saved to:\s+([^\s]+)/);
        
        if (outputDirMatch && outputDirMatch[1]) {
            const extractionDir = outputDirMatch[1];
            const bmpPath = path.join(extractionDir, 'full_map.bmp');
            
            if (fs.existsSync(bmpPath)) {
                // Copy extracted BMP to our output directory
                const destination = path.join(outputDir, 'extracted_full_map.bmp');
                fs.copyFileSync(bmpPath, destination);
                
                return {
                    success: true,
                    bmpPath: destination,
                    extractionDir,
                    output
                };
            } else {
                return {
                    success: false,
                    error: `Extracted BMP file not found: ${bmpPath}`
                };
            }
        }
        
        return { success: false, error: 'Could not determine extraction output path', output };
    } catch (error) {
        console.error('Error extracting JIM to BMP:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Compare extracted BMP with reference BMP
 * @param {string} extractedBmpPath - Path to extracted BMP
 * @param {string} referenceBmpPath - Path to reference BMP
 * @param {string} outputDir - Directory to write results
 * @returns {Promise<Object>} - Comparison results
 */
async function compareBmpImages(extractedBmpPath, referenceBmpPath, outputDir) {
    if (CONFIG.skipBmpComparison || !referenceBmpPath) {
        if (!referenceBmpPath) {
            console.log('Skipping BMP comparison because no reference BMP is available');
        } else {
            console.log('Skipping BMP comparison as per configuration');
        }
        return null;
    }
    
    console.log(`\n=== COMPARING BMP IMAGES ===`);
    console.log(`Comparing:\n- Reference: ${referenceBmpPath}\n- Extracted: ${extractedBmpPath}`);
    
    try {
        // Run the advanced-bmp-compare.js script
        const output = await runScript(CONFIG.bmpCompareScript, [referenceBmpPath, extractedBmpPath]);
        
        // The script creates a detailed-analysis folder in the same directory as the extracted BMP
        const analysisDir = path.join(path.dirname(extractedBmpPath), 'detailed-analysis');
        
        if (fs.existsSync(analysisDir)) {
            // Copy all analysis files to our output directory
            const files = fs.readdirSync(analysisDir);
            
            files.forEach(file => {
                const sourcePath = path.join(analysisDir, file);
                const destPath = path.join(outputDir, file);
                fs.copyFileSync(sourcePath, destPath);
            });
            
            // Look for the JSON results file
            const jsonFile = files.find(f => f.endsWith('-analysis-results.json'));
            let analysisResults = null;
            
            if (jsonFile) {
                const jsonPath = path.join(analysisDir, jsonFile);
                analysisResults = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
            }
            
            return {
                success: true,
                output,
                analysisResults,
                analysisFiles: files
            };
        }
        
        return { success: true, output };
    } catch (error) {
        console.error('Error comparing BMP images:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Generate a comprehensive diagnostic report
 * @param {Object} results - Results from all diagnostic steps
 * @param {string} outputPath - Path to write report
 */
function generateDiagnosticReport(results, outputPath) {
    let report = `# JIM Conversion Diagnostic Report\n\n`;
    report += `Generated: ${new Date().toISOString()}\n\n`;
    
    // Add JIM structure analysis
    report += `## JIM Structure Analysis\n\n`;
    
    if (results.jimAnalysis) {
        const issues = results.jimAnalysis.potentialIssues || [];
        
        // Group issues by type
        const criticalIssues = issues.filter(i => i.type === 'CRITICAL');
        const errorIssues = issues.filter(i => i.type === 'ERROR');
        const warningIssues = issues.filter(i => i.type === 'WARNING');
        const infoIssues = issues.filter(i => i.type === 'INFO');
        
        report += `- File: ${results.jimAnalysis.fileName}\n`;
        report += `- File size: ${results.jimAnalysis.fileSize} bytes\n`;
        report += `- Issues: ${issues.length} (${criticalIssues.length} critical, ${errorIssues.length} errors, ${warningIssues.length} warnings, ${infoIssues.length} info)\n\n`;
        
        if (issues.length > 0) {
            report += `### Potential Issues\n\n`;
            
            issues.forEach((issue, index) => {
                report += `#### ${index + 1}. [${issue.type}] ${issue.description}\n`;
                report += `${issue.details}\n\n`;
            });
        }
        
        // Add tile and palette information
        if (results.jimAnalysis.tileData) {
            const tileData = results.jimAnalysis.tileData;
            
            report += `### Tile Analysis\n\n`;
            report += `- Number of tiles: ${tileData.numTiles}\n`;
            report += `- Unique tile patterns: ${tileData.statistics.uniqueTilePatterns}\n`;
            report += `- Empty tiles: ${tileData.statistics.emptyTiles.length}\n`;
            report += `- Potentially corrupted tiles: ${tileData.statistics.potentiallyCorruptedTiles.length}\n`;
            report += `- Duplicate tiles: ${tileData.statistics.duplicateTiles.length}\n\n`;
        }
        
        if (results.jimAnalysis.paletteData && !results.jimAnalysis.paletteData.error) {
            const palettes = results.jimAnalysis.paletteData.palettes;
            
            report += `### Palette Analysis\n\n`;
            report += `- Number of palettes: ${palettes.length}\n`;
            
            // Add duplicate color information
            const duplicates = results.jimAnalysis.paletteData.statistics.duplicateColors || [];
            if (duplicates.length > 0) {
                report += `- Duplicate colors across palettes: ${duplicates.length}\n\n`;
                
                report += `#### Top Duplicate Colors\n\n`;
                duplicates.slice(0, 5).forEach((dup, index) => {
                    const instances = dup.instances.map(i => 
                        `Palette ${i.palette}, Index ${i.index}`).join(', ');
                    
                    report += `${index + 1}. Color RGB(${dup.color}) appears in: ${instances}\n`;
                });
                report += `\n`;
            }
        }
        
        if (results.jimAnalysis.mapData && !results.jimAnalysis.mapData.error) {
            const mapData = results.jimAnalysis.mapData;
            
            report += `### Map Analysis\n\n`;
            report += `- Map dimensions: ${mapData.width}x${mapData.height}\n`;
            report += `- Palettes used: ${Array.from(mapData.palettesUsed).join(', ')}\n`;
            report += `- Invalid tile references: ${mapData.invalidTileRefs.length}\n`;
            report += `- Unused tiles: ${mapData.unusedTiles.length}\n\n`;
            
            if (!mapData.consistent) {
                report += `Map data appears inconsistent. Issues:\n`;
                mapData.issues.forEach(issue => {
                    report += `- ${issue}\n`;
                });
                report += `\n`;
            }
        }
    } else {
        report += `JIM structure analysis was skipped or failed.\n\n`;
    }
    
    // Add extraction results
    report += `## JIM to BMP Extraction\n\n`;
    
    if (results.extraction && results.extraction.success) {
        report += `- Extraction was successful\n`;
        report += `- Extracted BMP saved to: ${results.extraction.bmpPath}\n\n`;
    } else if (results.extraction) {
        report += `- Extraction failed: ${results.extraction.error}\n\n`;
    } else {
        report += `Extraction was skipped.\n\n`;
    }
    
    // Add BMP comparison results
    report += `## BMP Comparison Analysis\n\n`;
    
    if (results.bmpComparison && results.bmpComparison.analysisResults) {
        const analysis = results.bmpComparison.analysisResults;
        
        // Palette differences
        report += `### Palette Comparison\n\n`;
        report += `- Exact color matches: ${analysis.palette.exactMatches}\n`;
        report += `- Similar color matches: ${analysis.palette.similarMatches}\n`;
        report += `- Unmapped colors in original: ${analysis.palette.unmapped1}\n`;
        report += `- Unmapped colors in extracted: ${analysis.palette.unmapped2}\n\n`;
        
        if (analysis.palette.commonShiftPatterns && analysis.palette.commonShiftPatterns.length > 0) {
            report += `#### Common Color Shift Patterns\n\n`;
            
            analysis.palette.commonShiftPatterns.forEach((pattern, index) => {
                report += `${index + 1}. Pattern affecting ${pattern.count} colors: RGB shift (${pattern.averageShift.r}, ${pattern.averageShift.g}, ${pattern.averageShift.b})\n`;
            });
            report += `\n`;
        }
        
        // Genesis palette quadrant analysis
        report += `#### Genesis Palette Quadrant Analysis\n\n`;
        for (const quadrant of analysis.palette.quadrantAnalysis) {
            report += `- Quadrant ${quadrant.quadrant} (indices ${quadrant.quadrant*16}-${quadrant.quadrant*16+15}):\n`;
            report += `  - Exact matches: ${quadrant.exactMatches}\n`;
            report += `  - Same quadrant mappings: ${quadrant.mappingToSameQuadrant}\n`;
            report += `  - Cross-quadrant mappings: ${quadrant.mappingToOtherQuadrant}\n`;
            report += `  - Unmapped: ${quadrant.unmapped}\n\n`;
            
            if (quadrant.crossQuadrantMappings && quadrant.crossQuadrantMappings.length > 0) {
                report += `  - Cross-quadrant mapping examples:\n`;
                quadrant.crossQuadrantMappings.slice(0, 3).forEach(mapping => {
                    report += `    - Index ${mapping.fromIndex} -> ${mapping.toIndex} (quadrant ${mapping.toQuadrant})\n`;
                });
                report += `\n`;
            }
        }
        
        // Pixel differences
        report += `### Pixel Differences\n\n`;
        report += `- Total different pixels: ${analysis.pixels.totalDifferences} (${analysis.pixels.percentageDifferent.toFixed(2)}%)\n`;
        report += `- Differences by region:\n`;
        report += `  - Top third: ${analysis.pixels.regionDifferences[0]} pixels\n`;
        report += `  - Middle third: ${analysis.pixels.regionDifferences[1]} pixels\n`;
        report += `  - Bottom third: ${analysis.pixels.regionDifferences[2]} pixels\n\n`;
        
        // Tile analysis
        report += `### Tile Analysis\n\n`;
        report += `- Total tiles: ${analysis.tiles.totalTiles}\n`;
        report += `- Problematic tiles: ${analysis.tiles.problematicTiles} (${((analysis.tiles.problematicTiles / analysis.tiles.totalTiles) * 100).toFixed(2)}%)\n`;
        
        // Issue summary
        report += `- Issues by type:\n`;
        for (const [issueType, count] of Object.entries(analysis.tiles.issueSummary)) {
            report += `  - ${issueType}: ${count} tiles\n`;
        }
        report += `\n`;
        
        // Worst rows
        if (analysis.tiles.worstRows && analysis.tiles.worstRows.length > 0) {
            report += `#### Most Problematic Rows\n\n`;
            
            analysis.tiles.worstRows.slice(0, 5).forEach((row, index) => {
                report += `${index + 1}. Row ${row.index}: ${row.problemTiles}/${row.tiles} tiles (${row.problemPercentage.toFixed(2)}%)\n`;
                report += `   - Issues: Palette issues: ${row.issueTypes.paletteIssues}, Index shifts: ${row.issueTypes.indexShifts}, Data corruption: ${row.issueTypes.dataCorruption}\n`;
            });
            report += `\n`;
        }
        
    } else if (results.bmpComparison) {
        report += `- Comparison analysis results not available or failed: ${results.bmpComparison.error || 'Unknown error'}\n\n`;
    } else {
        report += `BMP comparison was skipped.\n\n`;
    }
    
    // Add recommendations section
    report += `## Recommendations\n\n`;
    
    // Generating recommendations based on combined findings
    const recommendations = [];
    
    // Check for JIM structure issues
    if (results.jimAnalysis && results.jimAnalysis.potentialIssues) {
        const criticalOrErrors = results.jimAnalysis.potentialIssues.filter(
            i => i.type === 'CRITICAL' || i.type === 'ERROR'
        );
        
        if (criticalOrErrors.length > 0) {
            recommendations.push(
                "Fix critical JIM structure issues before proceeding with extraction improvements."
            );
        }
        
        // Check for specific issues
        if (results.jimAnalysis.potentialIssues.some(i => i.description.includes('Map references tiles beyond'))) {
            recommendations.push(
                "The JIM file contains invalid tile references. This could cause data corruption in the output."
            );
        }
        
        if (results.jimAnalysis.potentialIssues.some(i => i.description.includes('Gap between tile data'))) {
            recommendations.push(
                "There's a gap between tile data and palette data. This may indicate incorrect offset calculations."
            );
        }
    }
    
    // Check for palette mapping issues
    if (results.bmpComparison && results.bmpComparison.analysisResults) {
        const analysis = results.bmpComparison.analysisResults;
        
        if (analysis.tiles.issueSummary.paletteIssues > 0) {
            recommendations.push(
                "Palette mapping issues detected. Consider enhancing the getPaletteIndexMapping function with more specific color corrections."
            );
        }
        
        if (analysis.pixels.regionDifferences[0] > analysis.pixels.regionDifferences[1] && 
            analysis.pixels.regionDifferences[0] > analysis.pixels.regionDifferences[2]) {
            recommendations.push(
                "The top third of the image has more differences than other areas. Focus on rows 0-24 for palette mapping improvements."
            );
        } else if (analysis.pixels.regionDifferences[1] > analysis.pixels.regionDifferences[0] && 
                   analysis.pixels.regionDifferences[1] > analysis.pixels.regionDifferences[2]) {
            recommendations.push(
                "The middle third of the image has more differences. Focus on rows 24-47 for palette mapping improvements."
            );
        }
        
        // Specific quadrant issues
        const problematicQuadrants = analysis.palette.quadrantAnalysis
            .filter(q => q.unmapped > 5 || q.crossQuadrantMappings.length > 5)
            .map(q => q.quadrant);
            
        if (problematicQuadrants.length > 0) {
            recommendations.push(
                `Palette quadrants ${problematicQuadrants.join(', ')} have significant mapping issues. Check color mapping for these palettes.`
            );
        }
    }
    
    // Check for tile data corruption
    const hasCorruption = (results.bmpComparison?.analysisResults?.tiles?.issueSummary?.dataCorruption || 0) > 0;
    const hasInvalidRefs = results.jimAnalysis?.mapData?.invalidTileRefs?.length > 0;
    
    if (hasCorruption || hasInvalidRefs) {
        recommendations.push(
            "Possible data corruption detected. This could be due to invalid tile references or misaligned data sections."
        );
        
        if (hasInvalidRefs) {
            recommendations.push(
                "Implement bounds checking when accessing tile data to prevent reading invalid tiles."
            );
        }
    }
    
    // Add the recommendations to the report
    if (recommendations.length > 0) {
        recommendations.forEach((rec, index) => {
            report += `${index + 1}. ${rec}\n`;
        });
    } else {
        report += `No specific recommendations available based on the analysis.\n`;
    }
    
    // Write the report
    fs.writeFileSync(outputPath, report);
    console.log(`Diagnostic report written to ${outputPath}`);
}

/**
 * Main diagnostic workflow
 */
async function runDiagnostic() {
    // Check for command line arguments
    if (process.argv.length < 3) {
        console.log('Usage: node diagnose-jim-conversion.js <jim-file> [reference-bmp]');
        process.exit(1);
    }
    
    const jimPath = process.argv[2];
    
    // If a reference BMP is provided, use it
    if (process.argv.length >= 4) {
        CONFIG.referenceOriginal = process.argv[3];
    }
    
    // Create output directory
    const baseFileName = path.basename(jimPath, '.jim');
    const outputDir = path.join(CONFIG.outputDir, baseFileName);
    
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    
    console.log(`Starting diagnostic workflow for ${jimPath}`);
    console.log(`Results will be saved to ${outputDir}`);
    
    // Track results from each step
    const results = {
        jimPath,
        outputDir,
        referenceOriginal: CONFIG.referenceOriginal,
        timestamp: new Date().toISOString()
    };
    
    // Step 1: Analyze JIM file structure
    results.jimAnalysis = await analyzeJimStructure(jimPath, outputDir);
    
    // Step 2: Extract JIM to BMP
    results.extraction = await extractJimToBmp(jimPath, outputDir);
    
    // Step 3: Compare extracted BMP with reference (if available)
    if (results.extraction && results.extraction.success && CONFIG.referenceOriginal) {
        results.bmpComparison = await compareBmpImages(
            results.extraction.bmpPath,
            CONFIG.referenceOriginal,
            outputDir
        );
    }
    
    // Step 4: Generate diagnostic report
    const reportPath = path.join(outputDir, 'diagnostic-report.md');
    generateDiagnosticReport(results, reportPath);
    
    console.log(`\n=== DIAGNOSTIC WORKFLOW COMPLETE ===`);
    console.log(`- JIM analysis: ${results.jimAnalysis ? 'Completed' : 'Skipped'}`);
    console.log(`- JIM extraction: ${results.extraction ? (results.extraction.success ? 'Successful' : 'Failed') : 'Skipped'}`);
    console.log(`- BMP comparison: ${results.bmpComparison ? (results.bmpComparison.success ? 'Successful' : 'Failed') : 'Skipped'}`);
    console.log(`\nSee diagnostic report at: ${reportPath}`);
}

// Run the diagnostic workflow
runDiagnostic().catch(error => {
    console.error('Error in diagnostic workflow:', error);
    process.exit(1);
});
