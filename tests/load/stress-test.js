import http from 'k6/http';
import ws from 'k6/ws';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const successfulRequests = new Counter('successful_requests');
const concurrentUsers = new Trend('concurrent_users');

export const options = {
  scenarios: {
    // Stress test scenario - gradually increase load beyond normal capacity
    stress_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 50 },   // Normal load
        { duration: '2m', target: 100 },  // Above normal
        { duration: '2m', target: 200 },  // Stress level
        { duration: '3m', target: 300 },  // Maximum stress
        { duration: '2m', target: 400 },  // Breaking point
        { duration: '3m', target: 0 },    // Recovery
      ],
    },
  },
  
  thresholds: {
    http_req_duration: ['p(95)<5000'],  // More lenient for stress test
    http_req_failed: ['rate<0.05'],     // 5% error rate acceptable under stress
    errors: ['rate<0.10'],              // 10% error rate for extreme stress
  },
};

const BASE_URL = 'https://sosiozakhzrnapvxrtrb.supabase.co';
const AUTH_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test';

export default function () {
  concurrentUsers.add(__VU);
  
  const headers = {
    'Authorization': `Bearer ${AUTH_TOKEN}`,
    'Content-Type': 'application/json',
    'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNvc2lvemFraHpybmFwdnhydHJiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5NzY4NTgsImV4cCI6MjA2OTU1Mjg1OH0.IawV0L49n590JCMDZ1Fy9KzcxMKRb6HHyudanZBQRP0'
  };

  // Simulate realistic user journey under stress
  const userJourney = [
    () => {
      // Step 1: Load dashboard data
      const response = http.get(`${BASE_URL}/rest/v1/analysis_reports?select=*&limit=5`, { headers });
      if (response.status === 200) successfulRequests.add(1);
      return response.status === 200;
    },
    () => {
      // Step 2: Get active procedures
      const response = http.get(`${BASE_URL}/rest/v1/active_procedures?select=*`, { headers });
      if (response.status === 200) successfulRequests.add(1);
      return response.status === 200;
    },
    () => {
      // Step 3: Call AI agent
      const response = http.post(`${BASE_URL}/functions/v1/agent-ceo`, 
        JSON.stringify({ action: 'get_kpis' }), 
        { headers, timeout: '10s' }
      );
      if (response.status === 200) successfulRequests.add(1);
      return response.status === 200;
    },
    () => {
      // Step 4: Request inventory forecast
      const response = http.post(`${BASE_URL}/functions/v1/inventory-forecast`, 
        JSON.stringify({ action: 'forecast_demand' }), 
        { headers, timeout: '15s' }
      );
      if (response.status === 200) successfulRequests.add(1);
      return response.status === 200;
    }
  ];

  // Execute user journey
  let allSuccessful = true;
  for (let i = 0; i < userJourney.length; i++) {
    try {
      const success = userJourney[i]();
      if (!success) {
        allSuccessful = false;
        errorRate.add(1);
      }
    } catch (error) {
      console.error(`Step ${i + 1} failed:`, error.message);
      allSuccessful = false;
      errorRate.add(1);
    }
    
    // Brief pause between requests
    sleep(0.5 + Math.random() * 1);
  }

  if (!allSuccessful) {
    console.log(`VU ${__VU}: Some requests failed during stress test`);
  }

  // Longer pause between iterations during stress test
  sleep(1 + Math.random() * 3);
}

export function setup() {
  console.log('🔥 Starting STRESS TEST for GENIUS MedicalCor AI');
  console.log('⚠️  This test will push the system beyond normal limits');
  console.log('📊 Stress Test Configuration:');
  console.log('   - Peak Load: 400 concurrent users');
  console.log('   - Duration: 14 minutes');
  console.log('   - Acceptable Error Rate: <10%');
  
  return { startTime: new Date() };
}

export function teardown(data) {
  const duration = (new Date() - data.startTime) / 1000;
  console.log('🏁 Stress Test Completed');
  console.log(`⏱️  Total Duration: ${Math.round(duration)}s`);
  console.log('📈 Check metrics above for system behavior under stress');
  console.log('🎯 Key Indicators:');
  console.log('   - Error rates during peak load');
  console.log('   - Response time degradation');
  console.log('   - System recovery after load reduction');
}