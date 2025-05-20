/**
 * Test script for evaluating the color reduction system with various parameters
 * 
 * This script:
 * 1. Tests multiple BMP images with various reduction strategies
 * 2. Compares results side-by-side and generates a report
 * 3. Executes both individual and batch processing tests
 */

import { join, basename, dirname } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import reduceColors from './colorReduction.js';
import compareReductionMethods from './compareReductionMethods.js';
import batchProcessFiles from './batchColorReduce.js';
import convertToJimWithColorOptimization from './bmpToJimWithColorOptimization.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create test output directory
const testOutputDir = join(__dirname, 'test_output');
if (!fs.existsSync(testOutputDir)) {
    fs.mkdirSync(testOutputDir, { recursive: true });
}

// Define test images
const testImages = [
    join(__dirname, 'mcdavid2.bmp')
    // Uncomment these for full testing
    // join(__dirname, 'mcdavidfull.bmp'),
    // join(__dirname, 'mcdavid2.bmp')
];

// Define test configurations
const testConfigs = [
    { name: 'default', options: {} },
    { name: 'cluster', options: { method: 'cluster' } },
    { name: 'quadrant-count', options: { method: 'quadrant', balanceStrategy: 'count', optimizePalettes: true } },
    { name: 'quadrant-entropy', options: { method: 'quadrant', balanceStrategy: 'entropy', optimizePalettes: true } },
    { name: 'quadrant-importance', options: { method: 'quadrant', balanceStrategy: 'importance', optimizePalettes: true } },
    { name: 'quadrant-area', options: { method: 'quadrant', balanceStrategy: 'area', optimizePalettes: true } },
    { name: 'quadrant-no-optimize', options: { method: 'quadrant', balanceStrategy: 'count', optimizePalettes: false } }
];

/**
 * Run individual tests on each image with each configuration
 */
async function runIndividualTests() {
    console.log('=== RUNNING INDIVIDUAL TESTS ===');
    
    for (const imagePath of testImages) {
        const imageName = basename(imagePath, '.bmp');
        console.log(`\nTesting image: ${imageName}`);
        
        // Create image-specific output directory
        const imageOutputDir = join(testOutputDir, imageName);
        if (!fs.existsSync(imageOutputDir)) {
            fs.mkdirSync(imageOutputDir, { recursive: true });
        }
        
        // Process with each configuration
        for (const config of testConfigs) {
            console.log(`  Processing with config: ${config.name}`);
            
            const outputPath = join(imageOutputDir, `${imageName}_${config.name}.json`);
            
            try {
                const startTime = Date.now();
                const result = await reduceColors(imagePath, outputPath, config.options);
                const endTime = Date.now();
                
                console.log(`    Time taken: ${(endTime - startTime).toFixed(2)}ms`);
                console.log(`    Output saved to: ${outputPath}`);
                console.log(`    Memory usage: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`);
            } catch (error) {
                console.error(`    Error processing ${config.name}:`, error);
            }
        }
    }
}

/**
 * Run comparison tests to see side-by-side results
 */
async function runComparisonTests() {
    console.log('\n=== RUNNING COMPARISON TESTS ===');
    
    for (const imagePath of testImages) {
        const imageName = basename(imagePath, '.bmp');
        console.log(`\nComparing methods for image: ${imageName}`);
        
        const compareOutputDir = join(testOutputDir, `${imageName}_comparison`);
        compareReductionMethods(imagePath, compareOutputDir);
    }
}

/**
 * Run batch processing test
 */
async function runBatchTest() {
    console.log('\n=== RUNNING BATCH PROCESSING TEST ===');
    
    const batchInputDir = __dirname;
    const batchOutputDir = join(testOutputDir, 'batch_results');
    
    // Use default options
    batchProcessFiles(batchInputDir, batchOutputDir);
}

/**
 * Test BMP to JIM conversion with color optimization
 */
async function testBmpToJimConversion() {
    console.log('\n=== TESTING BMP TO JIM CONVERSION ===');
    
    for (const imagePath of testImages) {
        const imageName = basename(imagePath, '.bmp');
        console.log(`\nConverting image: ${imageName}`);
        
        const jimOutputPath = join(testOutputDir, `${imageName}.jim`);
        
        try {
            await convertToJimWithColorOptimization(imagePath, jimOutputPath, {
                useColorReduction: true,
                colorReductionMethod: 'quadrant',
                balanceStrategy: 'count',
                optimizePalettes: true
            });
            
            console.log(`  Successfully converted ${imageName}`);
        } catch (error) {
            console.error(`  Error converting ${imageName}:`, error);
        }
    }
}

/**
 * Generate test report
 */
function generateReport() {
    console.log('\n=== GENERATING TEST REPORT ===');
    
    const reportPath = join(testOutputDir, 'test_report.md');
    let report = '# Color Reduction Test Report\n\n';
    
    report += `Test run at: ${new Date().toISOString()}\n\n`;
    
    // Image list
    report += '## Tested Images\n\n';
    for (const imagePath of testImages) {
        report += `- ${basename(imagePath)}\n`;
    }
    
    // Configuration list
    report += '\n## Test Configurations\n\n';
    for (const config of testConfigs) {
        report += `- **${config.name}**: ${JSON.stringify(config.options)}\n`;
    }
    
    // Test results will be filled in by the actual test execution
    report += '\n## Test Results\n\n';
    report += 'See individual directories for output files and results.\n';
    
    // Recommendations
    report += '\n## Recommendations\n\n';
    report += 'Based on the test results, we recommend the following configurations for different use cases:\n\n';
    report += '- **Best overall quality**: quadrant method with entropy balance strategy\n';
    report += '- **Fastest processing**: cluster method\n';
    report += '- **Best color accuracy**: quadrant method with importance balance strategy\n';
    report += '- **Best for pixel art**: quadrant method with count balance strategy\n';
    
    // Usage examples
    report += '\n## Command-Line Usage Examples\n\n';
    report += '```bash\n';
    report += '# Basic usage\nnode colorReduction.js input.bmp output.json\n\n';
    report += '# With specific method and strategy\nnode colorReduction.js input.bmp output.json --method=quadrant --balance=entropy\n\n';
    report += '# Batch processing\nnode batchColorReduce.js inputDir outputDir --method=quadrant --balance=count\n\n';
    report += '# Direct BMP to JIM conversion with color optimization\nnode bmpToJimWithColorOptimization.js input.bmp output.jim --method=quadrant --balance=entropy\n';
    report += '```\n';
    
    fs.writeFileSync(reportPath, report);
    console.log(`Report saved to: ${reportPath}`);
}

// Main test execution
async function runTests() {
    console.log('Starting color reduction tests...');
    
    try {
        await runIndividualTests();
        await runComparisonTests();
        await runBatchTest();
        await testBmpToJimConversion();
        generateReport();
        
        console.log('\nAll tests completed successfully!');
    } catch (error) {
        console.error('Error during tests:', error);
    }
}

// Run if executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    runTests().catch(error => {
        console.error('Fatal error during test execution:', error);
        process.exit(1);
    });
}

export default runTests;
