import http from 'k6/http';
import ws from 'k6/ws';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const wsConnectionTime = new Trend('ws_connection_time');
const apiResponseTime = new Trend('api_response_time');

// Test configuration
export const options = {
  scenarios: {
    // HTTP API Load Test
    api_load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 10 },   // Ramp up to 10 users
        { duration: '2m', target: 25 },   // Ramp up to 25 users
        { duration: '2m', target: 50 },   // Ramp up to 50 users
        { duration: '3m', target: 50 },   // Stay at 50 users
        { duration: '2m', target: 0 },    // Ramp down
      ],
      env: { TEST_TYPE: 'api' },
    },
    
    // WebSocket Connection Test
    websocket_load: {
      executor: 'constant-vus',
      vus: 25,
      duration: '5m',
      env: { TEST_TYPE: 'websocket' },
    },
  },
  
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% of requests must complete below 2s
    http_req_failed: ['rate<0.01'],    // Error rate must be below 1%
    ws_connection_time: ['p(95)<1000'], // WebSocket connections under 1s
    errors: ['rate<0.01'],             // Overall error rate below 1%
  },
};

// Base URL configuration
const BASE_URL = 'https://sosiozakhzrnapvxrtrb.supabase.co';
const WS_URL = 'wss://sosiozakhzrnapvxrtrb.functions.supabase.co/realtime-agents';

// Authentication token (mock for testing)
const AUTH_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test';

export default function () {
  const testType = __ENV.TEST_TYPE;
  
  if (testType === 'api') {
    runAPILoadTest();
  } else if (testType === 'websocket') {
    runWebSocketLoadTest();
  }
}

function runAPILoadTest() {
  const headers = {
    'Authorization': `Bearer ${AUTH_TOKEN}`,
    'Content-Type': 'application/json',
    'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNvc2lvemFraHpybmFwdnhydHJiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5NzY4NTgsImV4cCI6MjA2OTU1Mjg1OH0.IawV0L49n590JCMDZ1Fy9KzcxMKRb6HHyudanZBQRP0'
  };

  // Test 1: Get Risk Reports
  console.log('Testing GET /rest/v1/analysis_reports');
  const startTime1 = new Date();
  const response1 = http.get(`${BASE_URL}/rest/v1/analysis_reports?select=*&limit=10`, { headers });
  const duration1 = new Date() - startTime1;
  
  check(response1, {
    'GET analysis_reports status is 200': (r) => r.status === 200,
    'GET analysis_reports response time < 2s': (r) => r.timings.duration < 2000,
    'GET analysis_reports has data': (r) => {
      try {
        const data = JSON.parse(r.body);
        return Array.isArray(data);
      } catch (e) {
        return false;
      }
    },
  }) || errorRate.add(1);
  
  apiResponseTime.add(duration1);

  // Test 2: Get Active Procedures
  console.log('Testing GET /rest/v1/active_procedures');
  const startTime2 = new Date();
  const response2 = http.get(`${BASE_URL}/rest/v1/active_procedures?select=*`, { headers });
  const duration2 = new Date() - startTime2;
  
  check(response2, {
    'GET active_procedures status is 200': (r) => r.status === 200,
    'GET active_procedures response time < 2s': (r) => r.timings.duration < 2000,
  }) || errorRate.add(1);
  
  apiResponseTime.add(duration2);

  // Test 3: Get Lab Queue
  console.log('Testing GET /rest/v1/lab_production_queue');
  const startTime3 = new Date();
  const response3 = http.get(`${BASE_URL}/rest/v1/lab_production_queue?select=*`, { headers });
  const duration3 = new Date() - startTime3;
  
  check(response3, {
    'GET lab_production_queue status is 200': (r) => r.status === 200,
    'GET lab_production_queue response time < 2s': (r) => r.timings.duration < 2000,
  }) || errorRate.add(1);
  
  apiResponseTime.add(duration3);

  // Test 4: Edge Function - Agent CEO
  console.log('Testing Edge Function /functions/v1/agent-ceo');
  const startTime4 = new Date();
  const response4 = http.post(`${BASE_URL}/functions/v1/agent-ceo`, 
    JSON.stringify({
      action: 'get_kpis',
      filters: { timeRange: '24h' }
    }), 
    { headers }
  );
  const duration4 = new Date() - startTime4;
  
  check(response4, {
    'POST agent-ceo status is 200': (r) => r.status === 200,
    'POST agent-ceo response time < 3s': (r) => r.timings.duration < 3000,
  }) || errorRate.add(1);
  
  apiResponseTime.add(duration4);

  // Test 5: Edge Function - Inventory Forecast
  console.log('Testing Edge Function /functions/v1/inventory-forecast');
  const startTime5 = new Date();
  const response5 = http.post(`${BASE_URL}/functions/v1/inventory-forecast`, 
    JSON.stringify({
      action: 'forecast_demand',
      timeframe: '7d'
    }), 
    { headers }
  );
  const duration5 = new Date() - startTime5;
  
  check(response5, {
    'POST inventory-forecast status is 200': (r) => r.status === 200,
    'POST inventory-forecast response time < 5s': (r) => r.timings.duration < 5000,
  }) || errorRate.add(1);
  
  apiResponseTime.add(duration5);

  sleep(1); // Brief pause between iterations
}

function runWebSocketLoadTest() {
  console.log('Starting WebSocket load test...');
  
  const wsStart = new Date();
  
  const res = ws.connect(WS_URL, {
    headers: {
      'Authorization': `Bearer ${AUTH_TOKEN}`,
    },
  }, function (socket) {
    const connectionTime = new Date() - wsStart;
    wsConnectionTime.add(connectionTime);
    
    console.log(`WebSocket connected in ${connectionTime}ms`);
    
    // Authenticate as CEO
    socket.send(JSON.stringify({
      type: 'auth',
      role: 'CEO',
      token: AUTH_TOKEN
    }));

    let messageCount = 0;
    let responseCount = 0;

    socket.on('open', function () {
      console.log('WebSocket connection opened');
      
      // Send initial KPI request
      socket.send(JSON.stringify({
        type: 'request_kpis'
      }));
    });

    socket.on('message', function (data) {
      responseCount++;
      console.log(`Received WebSocket message #${responseCount}`);
      
      try {
        const message = JSON.parse(data);
        
        check(message, {
          'WebSocket message is valid JSON': (msg) => typeof msg === 'object',
          'WebSocket message has type': (msg) => msg.type !== undefined,
        }) || errorRate.add(1);
        
        // Simulate real user behavior - send follow-up requests
        if (message.type === 'kpi_update' && messageCount < 10) {
          setTimeout(() => {
            socket.send(JSON.stringify({
              type: 'request_lab_status'
            }));
          }, Math.random() * 1000); // Random delay 0-1s
          messageCount++;
        }
        
      } catch (e) {
        console.error('Failed to parse WebSocket message:', e);
        errorRate.add(1);
      }
    });

    socket.on('error', function (e) {
      console.error('WebSocket error:', e);
      errorRate.add(1);
    });

    socket.on('close', function () {
      console.log('WebSocket connection closed');
    });

    // Keep connection alive for test duration
    const keepAlive = setInterval(() => {
      socket.send(JSON.stringify({
        type: 'ping',
        timestamp: new Date().toISOString()
      }));
    }, 30000); // Ping every 30 seconds

    // Simulate user activity
    const activityInterval = setInterval(() => {
      const actions = ['request_kpis', 'request_lab_status', 'trigger_forecast'];
      const randomAction = actions[Math.floor(Math.random() * actions.length)];
      
      socket.send(JSON.stringify({
        type: randomAction,
        timestamp: new Date().toISOString()
      }));
    }, 5000 + Math.random() * 10000); // Every 5-15 seconds

    // Cleanup after test duration
    setTimeout(() => {
      clearInterval(keepAlive);
      clearInterval(activityInterval);
      socket.close();
    }, 270000); // 4.5 minutes (slightly less than test duration)
  });

  check(res, {
    'WebSocket connection established': (r) => r && r.status === 101,
  }) || errorRate.add(1);

  sleep(1);
}

// Setup function to prepare test environment
export function setup() {
  console.log('🚀 Starting GENIUS MedicalCor AI Load Test');
  console.log(`📊 Test Configuration:`);
  console.log(`   - Max Users: 50`);
  console.log(`   - Duration: 5 minutes`);
  console.log(`   - WebSocket Connections: 25`);
  console.log(`   - Target Error Rate: <1%`);
  console.log(`   - Target Response Time: <2s (95th percentile)`);
  
  return {
    startTime: new Date().toISOString()
  };
}

// Teardown function to generate final report
export function teardown(data) {
  console.log('📈 Load Test Completed');
  console.log(`   Started: ${data.startTime}`);
  console.log(`   Ended: ${new Date().toISOString()}`);
  console.log('✅ Check detailed metrics in k6 output above');
}
