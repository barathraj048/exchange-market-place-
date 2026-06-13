import http from 'k6/http';
import { check } from 'k6';
import { Trend } from 'k6/metrics';

const latencyTrend = new Trend('order_matching_latency');

export const options = {
  stages: [
    { duration: '10s', target: 500 }, // Ramp up to 500 concurrent users
    { duration: '30s', target: 500 }, // Blast the API
    { duration: '10s', target: 0 },   // Ramp down
  ],
  thresholds: {
    // Prove to the recruiter that 95% of orders process in under 50ms
    'order_matching_latency': ['p(95)<50'],
    'http_req_failed': ['rate<0.01'], // Less than 1% failure rate
  },
};

export default function () {
  // NOTE: Change this to your actual local API route if it is different!
  const url = 'http://localhost:3001/api/v1/order'; 
  
  // FIX 1: Only use the users seeded with money in engine.ts
  const fundedUsers = ["1", "2", "5"];
  const randomUserId = fundedUsers[Math.floor(Math.random() * fundedUsers.length)];

  // FIX 2: Randomize BUY and SELL so they trade back and forth without running out of money
  const randomSide = Math.random() > 0.5 ? "BUY" : "SELL";
  
  const payload = JSON.stringify({
    userId: randomUserId,
    market: "TATA_INR",
    price: 150.50,
    quantity: 1, // Kept low so they don't lock too much balance per trade
    side: randomSide,
    orderType: "LIMIT"
  });

  const params = {
    headers: { 'Content-Type': 'application/json' },
  };

  const res = http.post(url, payload, params);

  // Track the latency of successful order placements
  if (res.status === 200 || res.status === 201) {
    latencyTrend.add(res.timings.duration);
  }

  check(res, {
    'is status 200/201': (r) => r.status === 200 || r.status === 201,
  });
}