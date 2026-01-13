# The House Cafe

The House Cafe is a full-stack web application designed for a premium coffee shop, built using Next.js and Supabase. It provides a sleek, responsive customer interface for viewing the menu and a secure administrative dashboard for real-time menu management.

## 🚀 Key Features

* **Dual-Mode Menu**: Customers can switch between the "Permanent" menu and "Daily Specials" via a floating tab system.
* **Visual Presentation**: A clean, paper-textured UI that displays menu items with images, descriptions, prices, and category groupings.
* **Admin Dashboard**: A management portal to view all items, toggle their "Permanent" or "Daily" status, and delete entries.
* **Item Management**:
   * Add new items with title, price, and description.
   * Upload item images directly to Supabase storage.
   * Create and manage custom menu categories on the fly.
* **Integrated Feedback**: Includes a direct link for customers to leave Google Reviews and find the cafe via a map embed.

## 🛠️ Tech Stack

* **Framework**: Next.js (App Router)
* **Backend**: Supabase (Database, Auth, and Storage)
* **Styling**: Tailwind CSS
* **Icons**: Lucide React
* **Language**: TypeScript

## 📁 Project Structure
```
├── app/
│   ├── admin/
│   │   ├── add/page.tsx         # Add new menu item & categories
│   │   ├── dashboard/page.tsx   # Item management dashboard
│   │   └── page.tsx             # Admin entry point
│   ├── layout.tsx               # Global styles & layout
│   └── page.tsx                 # Customer-facing home page
├── components/
│   ├── DynamicMenu.tsx          # Menu state & tab switching logic
│   ├── Header.tsx               # Navigation & brand identity
│   ├── MenuList.tsx             # The visual "Paper Card" menu display
│   └── StatusModal.tsx          # Reusable success/error/confirm dialogs
├── lib/
│   └── supabase.ts              # Supabase client initialization
└── public/                      # Static assets and icons
```

## ⚙️ Setup & Installation

1. **Clone the Repository and install dependencies**:
```bash
npm install
```

2. **Environment Configuration**: Create a `.env.local` file and add your Supabase credentials:
```
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

3. **Run Development Server**:
```bash
npm run dev
```

Open http://localhost:3000 to view the result.

## 📝 Admin Access

The administrative features are protected by a session check. The dashboard requires a `house_admin_session` to be present in the browser's session storage to view or edit menu items. Menu images are stored in a Supabase bucket titled `menu-images`.
