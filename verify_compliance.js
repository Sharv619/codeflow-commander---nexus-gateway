import { scanContent, scanDirectory } from './cli-tool/src/services/compliance.js';

console.log("🕵️  Starting Compliance Engine Verification...\n");

const tests = [
  {
    name: "Safe File",
    content: "const x = 10; console.log('Hello');",
    expected: 0
  },
  {
    name: "AWS Key Leak",
    content: "const AWS_KEY = 'AKIAIOSFODNN7EXAMPLE';",
    expected: 1,
    rule: 'SEC_AWS_KEY'
  },
  {
    name: "HIPAA (SSN) Leak",
    content: "const user_ssn = '123-45-6789';",
    expected: 1,
    rule: 'HIPAA_SSN'
  },
  {
    name: "Valid SSN Should Pass",
    content: "const fake_ssn = '000-00-0000';",  // Invalid SSN pattern
    expected: 0
  },
  {
    name: "GDPR (Email List)",
    content: "const mailingList = ['user1@test.com', 'user2@test.com', 'user3@test.com'];",
    expected: 1,
    rule: 'GDPR_EMAIL_LIST'
  },
  {
    name: "Private Key Block",
    content: "-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQEA...",
    expected: 1,
    rule: 'SEC_PRIVATE_KEY'
  },
  {
    name: "API Key Pattern",
    content: "const api_key = 'sk-1234567890abcdef1234567890abcdef';",
    expected: 1,
    rule: 'SEC_API_KEY'
  }
];

let passed = 0;
let totalViolations = 0;

tests.forEach(test => {
  const violations = scanContent(test.content, 'test_file.js');
  const count = violations.length;
  totalViolations += count;

  if (count === test.expected) {
    // If we expected a specific rule, check for it
    if (test.expected > 0 && test.rule) {
      const foundRule = violations.find(v => v.ruleId === test.rule);
      if (foundRule) {
        console.log(`✅ [PASS] ${test.name}: Detected ${test.rule}`);
        console.log(`   💡 ${foundRule.message}`);
        console.log(`   👉 ${foundRule.remediation}`);
        passed++;
      } else {
        console.log(`❌ [FAIL] ${test.name}: Wrong rule detected. Expected ${test.rule}, got ${violations[0]?.ruleId}`);
      }
    } else {
      console.log(`✅ [PASS] ${test.name}: Clean (${count} violations found)`);
      passed++;
    }
  } else {
    console.log(`❌ [FAIL] ${test.name}: Expected ${test.expected} violations, found ${count}.`);
    violations.forEach(v => console.log(`   ${v.message}`));
  }
  console.log();
});

console.log(`📊 Test Summary: ${passed}/${tests.length} basic tests passed`);
console.log(`🚨 Total violations detected across all tests: ${totalViolations}`);

// Now test directory scanning
console.log("\n🔍 Testing Directory Scanning:");
try {
  const dirViolations = scanDirectory('./');
  const filteredViolations = dirViolations.filter(v => !v.file.includes('/node_modules/') && !v.file.includes('/.git/'));
  console.log(`📁 Directory scan found ${filteredViolations.length} violations in actual codebase`);
  if (filteredViolations.length > 0) {
    console.log("🚨 Issues found in actual code:");
    filteredViolations.slice(0, 3).forEach(v => console.log(`   ${v.message}`));
  }
} catch (error) {
  console.log(`⚠️  Directory scan test failed: ${error.message}`);
}

console.log("\n" + "=".repeat(50));
if (passed === tests.length) {
  console.log("🎉 ALL COMPLIANCE TESTS PASSED! Your security claims are now REAL.");
} else {
  console.log("⚠️  Some tests failed. Review the compliance rules.");
}
