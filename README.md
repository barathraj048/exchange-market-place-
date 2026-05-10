<img width="1280" height="666" alt="1772548855230" src="https://github.com/user-attachments/assets/66822daf-f5f7-408a-8bd4-ffb6d8e871f9" />

# Custom Event-Driven Exchange Infrastructure

A high-performance, low-latency trading engine built from scratch. This system handles real-time order matching and execution by decoupling the API ingestion layer from the core matching logic using an event-driven architecture.

## 🚀 Architectural Overview

The system is designed to handle massive concurrency by ensuring the API server remains non-blocking. It uses a **Redis-backed queue** to buffer incoming orders, allowing the matching engine to process trades asynchronously without bottlenecking the user experience.

### System Components:
* **API Server (Node.js):** Validates incoming orders (Limit/Market), generates a unique `order_id`, and pushes the payload to the ingestion queue.
* **In-Memory Orderbooks:** A custom matching engine implementation. It maintains separate bid/ask trees for different markets (e.g., `TATA_INR`, `PAYTM_INR`, `ZOMATO_INR`) to allow for localized state management.
* **Event Queue:** Orchestrates communication between the API, Orderbooks, and WebSockets to ensure data integrity across services.
* **WebSocket Server:** Subscribes to `ORDER_FILLED` and `BOOK_UPDATED` events via Redis Pub/Sub to broadcast real-time state changes to the client with sub-millisecond latency.

---

## 🛠 Tech Stack

* **Runtime:** Node.js
* **State & Messaging:** Redis (Pub/Sub & List-based Queuing)
* **Real-time Communication:** WebSockets (`ws`)
* **Data Ingestion:** Integrated with high-performance feeds (Backpack Exchange API)

---

## 🏗 Key Features & Engineering Challenges

### 1. Decoupled Matching Engine
The matching logic is isolated from the API layer. This architecture allows the system to scale horizontally; high-volume markets can be moved to dedicated worker nodes without affecting the rest of the exchange.

### 2. Event-Driven Consistency
The system utilizes a strict unidirectional event flow to maintain state:
1.  **Ingestion:** `ORDER_PLACED` is pushed to the Redis Queue.
2.  **Processing:** The Engine consumes the queue, matches trades, and emits `ORDER_FILLED`.
3.  **Broadcast:** The WebSocket server listens for engine events and pushes `BOOK_UPDATED` to the frontend.

### 3. Concurrency & Race Condition Management
By leveraging Node.js's non-blocking I/O and Redis's atomic operations, the engine avoids common race conditions found in multi-threaded environments, ensuring an order is never double-filled or lost during high-volatility spikes.

---

## 🚦 Getting Started

### Prerequisites
* Node.js (v18+)
* Redis Server (Running on localhost:6379 or configured via .env)

### Installation
1.  **Clone the repository:**
    ```bash
    git clone [https://github.com/barathraj048/exchange-market-place-](https://github.com/barathraj048/exchange-market-place-)
    cd exchange-market-place-
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    ```
3.  **Environment Setup:**
    Create a `.env` file in the root directory:
    ```env
    PORT=3000
    REDIS_URL=redis://localhost:6379
    ```

### Running the System
Start the complete infrastructure:
```bash
npm run start
