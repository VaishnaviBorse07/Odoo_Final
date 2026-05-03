# ZenFlow V2 - Appointment Booking System

ZenFlow V2 is a comprehensive full-stack appointment scheduling and management system. It provides a robust, real-time platform for booking appointments, managing working hours, processing payments, and handling user roles for organizers and clients.

## Project Structure

The project is structured into distinct components located within the `V2` directory:

- **`V2/appointment_frontend/`**: The React-based frontend application.
- **`V2/appointment_backend/`**: The Python FastAPI backend service.
- **`V2/docker-compose.yml`**: Docker configuration for setting up the local PostgreSQL database.

## Tech Stack

### Frontend
- **Framework:** React 18 with Vite
- **Styling:** Tailwind CSS, PostCSS
- **Routing:** React Router v6
- **HTTP Client:** Axios
- **State Management:** React Context APIs (Auth, Socket, Toast)

### Backend
- **Framework:** FastAPI (Python)
- **Server:** Uvicorn
- **Database Driver:** `asyncpg` (PostgreSQL)
- **Authentication:** JWT, `bcrypt`, `passlib`
- **Payments:** Razorpay API Integration
- **Validation:** Pydantic

## Key Features

- **Dynamic Appointment Booking:** Users can browse classes, view availability, select time slots, and book appointments through an intuitive booking wizard.
- **Payment Integration:** Seamless and secure payment processing using Razorpay.
- **Working Hours Management:** Organizers can define flexible or fixed working hours and manage multiple daily time slots with auto-calculated durations.
- **Rescheduling & Management:** Built-in workflow to reschedule existing appointments via PATCH updates without creating redundant records.
- **Role-Based Access Control (RBAC):** Secure access control and custom dashboards for Organizers, Administrators, and Customers.
- **Resource & Slot Management:** Comprehensive UI for managing class availability, instructor schedules, and booking capacities.

## Getting Started

### Prerequisites
- Node.js (v18+)
- Python (3.9+)
- Docker & Docker Compose

### 1. Database Setup (Docker)

To quickly spin up the PostgreSQL database using Docker:

```bash
cd V2
docker-compose up -d
```
*This starts a PostgreSQL container (`zenflow_v2_db`) exposed on port 5432. Default credentials are in the `docker-compose.yml` file.*

### 2. Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd V2/appointment_backend
   ```
2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   # On Windows
   venv\Scripts\activate
   # On macOS/Linux
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Set up your environment variables:
   - Copy `.env.example` to `.env` and configure your PostgreSQL database credentials, JWT secrets, and Razorpay keys.
5. Start the backend development server:
   ```bash
   python run_dev.py
   ```
   *The FastAPI server will start, and you can view the interactive API documentation (Swagger UI) at `http://localhost:8000/docs`.*

### 3. Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd V2/appointment_frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up your environment variables:
   - Copy `.env.example` to `.env` and ensure your API base URL points to the backend (e.g., `http://localhost:8000`).
4. Start the Vite development server:
   ```bash
   npm run dev
   ```
   *The React application will be available at the URL provided by Vite (typically `http://localhost:5173`).*

## Troubleshooting

- **Database Connections:** Ensure your `.env` `DATABASE_URL` matches the credentials defined in the `docker-compose.yml`.
- **Payment Network Errors:** If you experience network errors during Razorpay checkout, verify that your backend has the correct test/live keys in `.env` and that the frontend is passing the correct amount in paise.
- **Port Conflicts:** If `localhost:5432` is already in use by a local Postgres installation, stop the local service or modify the port mapping in `docker-compose.yml`.
