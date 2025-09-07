// Test script for yousei-notebook.html functionality
// This can be run in browser console to test the application

function testYouseiNotebook() {
    console.log('🧪 Testing Yousei Notebook v1.2...');
    
    // Test 1: Check if app is initialized
    if (typeof window.youseiApp === 'undefined') {
        console.error('❌ YouseiNotebook app not initialized');
        return false;
    }
    console.log('✅ App initialized successfully');
    
    // Test 2: Check data structure
    const app = window.youseiApp;
    if (!app.data || !Array.isArray(app.data)) {
        console.error('❌ Data structure invalid');
        return false;
    }
    console.log('✅ Data structure valid');
    
    // Test 3: Test calculation logic
    const testItem = {
        id: 'test001',
        code: 'test001',
        name: 'テスト商品',
        priceEx: 500,
        orderUnit: 6,
        arrival: 12,
        carryPrev: 3,
        movement: -2,
        waste: 1,
        endStock: 4,
        budget_d1: { qty: 10, amountEx: 0 },
        budget_d2: { qty: 8, amountEx: 0 }
    };
    
    app.performCalculations(testItem);
    
    // Expected: salesQty = max(0, 12 + 3 + (-2) - 4 - 1) = max(0, 8) = 8
    if (testItem.salesQty !== 8) {
        console.error(`❌ Sales quantity calculation failed. Expected: 8, Got: ${testItem.salesQty}`);
        return false;
    }
    console.log('✅ Sales quantity calculation correct');
    
    // Expected: revenueEx = 8 * 500 = 4000
    if (testItem.revenueEx !== 4000) {
        console.error(`❌ Revenue calculation failed. Expected: 4000, Got: ${testItem.revenueEx}`);
        return false;
    }
    console.log('✅ Revenue calculation correct');
    
    // Expected: budget amounts = qty * priceEx
    if (testItem.budget_d1.amountEx !== 5000) {
        console.error(`❌ Budget D+1 amount calculation failed. Expected: 5000, Got: ${testItem.budget_d1.amountEx}`);
        return false;
    }
    if (testItem.budget_d2.amountEx !== 4000) {
        console.error(`❌ Budget D+2 amount calculation failed. Expected: 4000, Got: ${testItem.budget_d2.amountEx}`);
        return false;
    }
    console.log('✅ Budget amount calculations correct');
    
    // Test 4: Test localStorage functionality
    try {
        app.saveData();
        console.log('✅ Data save functionality working');
    } catch (error) {
        console.error('❌ Data save failed:', error);
        return false;
    }
    
    // Test 5: Test CSV export functionality
    try {
        // Create a mock for CSV export testing (without actually triggering download)
        const originalCreateElement = document.createElement;
        let csvContent = '';
        
        document.createElement = function(tag) {
            const element = originalCreateElement.call(document, tag);
            if (tag === 'a') {
                element.click = function() {
                    // Capture CSV content instead of downloading
                    csvContent = element.href;
                    console.log('✅ CSV export functionality working');
                };
            }
            return element;
        };
        
        app.exportToCSV();
        
        // Restore original createElement
        document.createElement = originalCreateElement;
        
    } catch (error) {
        console.error('❌ CSV export failed:', error);
        return false;
    }
    
    console.log('🎉 All tests passed! Yousei Notebook v1.2 is working correctly.');
    return true;
}

// Test data validation
function testValidation() {
    console.log('🧪 Testing validation logic...');
    
    const app = window.youseiApp;
    
    // Test order unit validation
    const testInput = document.createElement('input');
    testInput.value = '13'; // Not divisible by 6
    
    const testItem = {
        orderUnit: 6
    };
    
    app.validateOrderUnit(testInput, testItem);
    
    if (!testInput.classList.contains('validation-error')) {
        console.error('❌ Order unit validation failed');
        return false;
    }
    console.log('✅ Order unit validation working');
    
    // Test valid order unit
    testInput.value = '12'; // Divisible by 6
    testInput.classList.remove('validation-error');
    
    app.validateOrderUnit(testInput, testItem);
    
    if (testInput.classList.contains('validation-error')) {
        console.error('❌ Valid order unit incorrectly flagged as error');
        return false;
    }
    console.log('✅ Valid order unit validation working');
    
    console.log('🎉 Validation tests passed!');
    return true;
}

// Run tests automatically when script is loaded
console.log('Test script loaded. Run testYouseiNotebook() and testValidation() in console to test the application.');