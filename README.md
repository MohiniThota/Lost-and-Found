# FindIt — Community Lost & Found Application

A simple, modern, full-stack Lost and Found web application built with **HTML5, CSS3, Vanilla JavaScript** on the frontend and **Python (Flask & SQLite)** on the backend.

---

## 🌟 Key Features

1. **Dual Report Modes**:
   - **Found Items**: Finders can upload photos, specify exact place/location details, category, and date.
   - **Lost Items**: Seekers can post what they lost to alert the community.
2. **Privacy-Preserving Contact & Claim System**:
   - The finder's private contact information (phone/WhatsApp, email) is **hidden** by default.
   - When a seeker recognizes their lost item, they submit an **Ownership Claim** with specific verification proof (distinguishing marks, serial numbers, wallpapers, contents).
   - The finder unlocks their post management screen using a **4-digit PIN** they created when publishing.
   - The finder reviews submitted claims and clicks **Approve Ownership**.
   - Upon approval, the finder's contact information is unlocked and revealed to the owner, and the item status automatically updates to **Claimed** / **Returned**.
3. **Claim Tracker**:
   - Seekers receive a unique Claim ID and can track their approval status anytime using the **Check My Claim** button.
4. **Rich Search & Filters**:
   - Instant search by item title, description, or location.
   - Filter by type (*All*, *Found Items*, *Lost Items*).
   - Filter by category (*Electronics*, *Wallets & Bags*, *Keys*, *Documents & IDs*, *Jewelry*, *Clothing*, *Accessories*, *Other*).
   - Filter by status (*Active*, *Claimed*, *Returned*).
5. **Photo Uploads & Responsive Design**:
   - Drag-and-drop or file picker image uploads with instant preview.
   - Fully responsive for mobile devices, tablets, and desktop screens.
   - Zero complex build tools needed (no Node bundle or webpack step required).

---

## 📁 Project Architecture

```
lostAndFound/
├── app.py                 # Flask server & REST API endpoints
├── database.py            # SQLite database schema, connections, and CRUD operations
├── lost_and_found.db      # SQLite database (auto-created on first run with demo data)
├── uploads/               # Uploaded item images directory
├── templates/
│   └── index.html         # Responsive Single Page UI
├── static/
│   ├── css/
│   │   └── style.css      # Modern styling, responsive card grids, modals, badges
│   └── js/
│       └── app.js         # Client-side logic (Fetch API, modals, filtering, claim flows)
└── README.md              # Project documentation
```

---

## 🚀 How to Run the Application

1. Open PowerShell or Terminal in the project directory:
   ```powershell
   cd d:\lostAndFound
   ```

2. Run the Python application:
   ```powershell
   python app.py
   ```

3. Open your browser and visit:
   ```
   http://127.0.0.1:5000
   ```

---

## 🔒 Testing the Claim & Approval Flow

1. **Browse Demo Items**: The app seeds 4 sample items on start (e.g., AirPods, leather wallet, car key).
2. **Submit a Claim**:
   - Click **View & Claim** on the *Black Leather Bifold Wallet* (or any found item).
   - Fill in your Name, Email, and Proof of Ownership (e.g., *"My student ID has name Alex and card ending in 4921"*).
   - Click **Submit Ownership Claim** and note your **Claim ID** (e.g. `#1`).
3. **Approve as Finder**:
   - On that same item card, click **Manage**.
   - Enter PIN `1234` (the demo items use `1234`).
   - You will see the claimant's proof. Click **Approve Ownership**.
4. **View Finder Contact**:
   - Click the top navigation **Check My Claim** button.
   - Enter the Item ID, your Claim ID, and your email.
   - See the approved status and the finder's direct phone & email!
