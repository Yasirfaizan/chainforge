import { ChainForge } from '../chainforge-sdk.js';

// Test configuration
const TEST_API_KEY = process.env.TEST_API_KEY || 'test-key';
const TEST_BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:5001';

async function runTests() {
  console.log('🧪 Running ChainForge SDK Tests...\n');

  let passed = 0;
  let failed = 0;

  function test(name, fn) {
    try {
      fn();
      console.log(`✅ ${name}`);
      passed++;
    } catch (error) {
      console.log(`❌ ${name}: ${error.message}`);
      failed++;
    }
  }

  // Test SDK initialization
  test('SDK Initialization', () => {
    const cf = new ChainForge({ apiKey: TEST_API_KEY });
    if (!cf.apiKey) throw new Error('API key not set');
  });

  // Test configuration
  test('Configuration Options', () => {
    const cf = new ChainForge({
      apiKey: TEST_API_KEY,
      baseURL: TEST_BASE_URL,
      timeout: 5000
    });
    if (cf.baseURL !== TEST_BASE_URL) throw new Error('Base URL not set');
    if (cf.timeout !== 5000) throw new Error('Timeout not set');
  });

  // Test error handling
  test('Error Handling', () => {
    const cf = new ChainForge({ apiKey: 'invalid' });
    if (!cf.errorHandler) throw new Error('Error handler not initialized');
  });

  console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed`);
  
  if (failed > 0) {
    process.exit(1);
  }
}

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests();
}

export { runTests };
