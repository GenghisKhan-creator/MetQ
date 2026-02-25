# MetQ - Smart Queue & Appointment Management System

## 🚀 Setup Instructions

### Prerequisites
- Node.js (v18+)
- PostgreSQL (Running on localhost)

### 1. Backend Setup
1. Navigate to the `server` directory:
   ```bash
   cd server
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure Environment Variables:
   - Open `.env` and update `DATABASE_URL` with your PostgreSQL credentials.
4. Initialize Database:
   - Run the SQL commands in `schema.sql` inside your PostgreSQL instance (`createdb metq` then `psql -d metq -f schema.sql`).
5. Start the server:
   ```bash
   npm run dev
   ```

### 2. Frontend Setup
1. Navigate to the root directory:
   ```bash
   cd ..
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```

## 🧠 Features Implemented
- **AI Triage Assessment**: Urgency-based patient prioritization.
- **Predictive Wait Algorithm**: Real-time wait time calculation.
- **Digital Medical Passport**: Secure medical history & prescriptions.
- **Hospital Efficiency Dashboard**: Analytics for hospital administrators.
- **Premium UI**: Replicated modern medical aesthetic with GSAP animations.

## 🏛 Backend Structure
- `/controllers`: Request handling logic.
- `/services`: Core business logic (Triage, Queue).
- `/routes`: API endpoint definitions.
- `/middleware`: Auth and security layers.
- `/utils`: Helper functions & validation.

## 🎨 UI/UX Design
- **Theme**: Premium Medical (White/Soft Blue/Deep Navy).
- **Animations**: GSAP for smooth page transitions and number counters.
- **Accessibility**: High-contrast ready and simplified booking flows.
