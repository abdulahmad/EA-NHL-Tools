// run-all-tests.js
// Run all validation and test scripts for JIM-To-BMP tools
import { execSync } from 'child_process';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

// Create tests directory if it doesn't exist
const testsDir = join(process.cwd(), 'tests');
if (!existsSync(testsDir)) {
    mkdirSync(testsDir);
}

// Helper function to run a test script and capture its output
function runTest(scriptName, args = []) {
    console.log(`\n===== Running ${scriptName} =====`);
    try {
        const cmdArgs = [scriptName, ...args].join(' ');
        const startTime = Date.now();
        const output = execSync(`node ${cmdArgs}`, { encoding: 'utf8' });
        const endTime = Date.now();
        
        console.log(`Test completed in ${(endTime - startTime)/1000} seconds.`);
        return { 
            success: true, 
            output,
            time: (endTime - startTime)/1000
        };
    } catch (error) {
        console.error(`Error running ${scriptName}:`);
        console.error(error.message);
        return { 
            success: false, 
            output: error.message,
            time: 0
        };
    }
}

// Main test execution function
async function runAllTests() {
    const results = {
        colorTest: null,
        comprehensiveColorTest: null,
        tileTest: null,
        comprehensiveTileTest: null
    };
    
    console.log("RUNNING ALL JIM-TO-BMP VALIDATION TESTS");
    console.log("======================================");
    console.log("Date: " + new Date().toISOString());
    console.log("Current directory: " + process.cwd());
    
    // Run color tests
    if (existsSync('test-color-conversion.js')) {
        results.colorTest = runTest('test-color-conversion.js');
    } else {
        console.log("test-color-conversion.js not found");
    }
    
    if (existsSync('comprehensive-color-test.js')) {
        results.comprehensiveColorTest = runTest('comprehensive-color-test.js');
    } else {
        console.log("comprehensive-color-test.js not found");
    }
    
    // Run tile tests
    if (existsSync('test-tile-read.js')) {
        results.tileTest = runTest('test-tile-read.js');
    } else {
        console.log("test-tile-read.js not found");
    }
    
    if (existsSync('comprehensive-tile-test.js')) {
        results.comprehensiveTileTest = runTest('comprehensive-tile-test.js');
    } else {
        console.log("comprehensive-tile-test.js not found");
    }
    
    // Generate summary
    console.log("\n===== TEST SUMMARY =====");
    
    if (results.colorTest) {
        console.log(`Color Test: ${results.colorTest.success ? '✅ PASSED' : '❌ FAILED'}`);
    }
    
    if (results.comprehensiveColorTest) {
        console.log(`Comprehensive Color Test: ${results.comprehensiveColorTest.success ? '✅ PASSED' : '❌ FAILED'}`);
    }
    
    if (results.tileTest) {
        console.log(`Tile Test: ${results.tileTest.success ? '✅ PASSED' : '❌ FAILED'}`);
    }
    
    if (results.comprehensiveTileTest) {
        console.log(`Comprehensive Tile Test: ${results.comprehensiveTileTest.success ? '✅ PASSED' : '❌ FAILED'}`);
    }
    
    // Save summary to file
    const summaryPath = join(testsDir, 'test-summary.txt');
    const summary = `
JIM-TO-BMP TEST SUMMARY
======================
Date: ${new Date().toISOString()}

Color Test: ${results.colorTest ? (results.colorTest.success ? 'PASSED' : 'FAILED') : 'NOT RUN'}
${results.colorTest ? `Time: ${results.colorTest.time}s` : ''}

Comprehensive Color Test: ${results.comprehensiveColorTest ? (results.comprehensiveColorTest.success ? 'PASSED' : 'FAILED') : 'NOT RUN'}
${results.comprehensiveColorTest ? `Time: ${results.comprehensiveColorTest.time}s` : ''}

Tile Test: ${results.tileTest ? (results.tileTest.success ? 'PASSED' : 'FAILED') : 'NOT RUN'}
${results.tileTest ? `Time: ${results.tileTest.time}s` : ''}

Comprehensive Tile Test: ${results.comprehensiveTileTest ? (results.comprehensiveTileTest.success ? 'PASSED' : 'FAILED') : 'NOT RUN'}
${results.comprehensiveTileTest ? `Time: ${results.comprehensiveTileTest.time}s` : ''}

OVERALL RESULT: ${
    Object.values(results).filter(r => r !== null).every(r => r.success) 
    ? 'ALL TESTS PASSED' 
    : 'SOME TESTS FAILED'
}
`;
    
    writeFileSync(summaryPath, summary);
    console.log(`Summary saved to ${summaryPath}`);
}

runAllTests();
