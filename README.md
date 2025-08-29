# 🥭 Mango Nexus Feedback Wall

A beautiful, real-time feedback wall application with a stunning yellow aesthetic theme, enhanced UI effects, and comment functionality.

## ✨ Features

- 🌟 **Beautiful Yellow Theme** - Stunning gradient backgrounds with reduced glow effects
- 🌙 **Dark/Light Mode** - Seamless theme switching with enhanced visual effects
- 📝 **Real-time Feedback** - Instant updates across all connected users
- 💬 **Comment System** - Add comments to any feedback post with real-time updates
- 🔍 **Search & Filter** - Find feedback by message content or author name
- ⬆️ **Upvote System** - Vote on feedback posts (one vote per user per post)
- 📱 **Responsive Design** - Works perfectly on desktop, tablet, and mobile
- 🎨 **Enhanced UI** - Smooth animations, hover effects, and modern design
- 📖 **Smart Preview** - Shows preview of long messages with "Read more" functionality
- 🖼️ **Expanded Card View** - Full-screen overlay for detailed feedback and comments

## 🚀 New Features (Latest Update)

### Comment System
- **Real-time Comments** - Comments update instantly across all users
- **Expanded Card View** - Click "Read more" to open a full-screen overlay
- **Comment Form** - Add comments with optional author name
- **Scrollable Comments** - Handles many comments with smooth scrolling
- **Close Button** - Easy way to return to the main view

### Enhanced UI
- **Reduced Glow Effects** - More subtle and elegant visual effects
- **Fixed Brand Title** - "Mango" text clipping issue resolved
- **Better Card Preview** - Shows only first few words, expands on click
- **Improved Animations** - Smoother transitions and hover effects

## 🛠️ Tech Stack

- **Frontend**: React 18 with Vite
- **Styling**: Tailwind CSS with custom animations
- **Backend**: Supabase (PostgreSQL + Real-time)
- **Authentication**: Anonymous user tracking via localStorage
- **Deployment**: Netlify-ready

## 🎨 Design Highlights

- **Yellow Aesthetic Theme** - Company brand colors throughout
- **3D Background Animation** - Subtle floating ambient glow effects
- **Card Hover Effects** - Interactive feedback with scale and shadow animations
- **Gradient Buttons** - Beautiful yellow gradient buttons with glow effects
- **Responsive Grid** - Adaptive layout for all screen sizes
- **Smooth Transitions** - 300ms ease transitions for all interactions

## 📋 Setup Instructions

### 1. Database Setup

First, create the comments table in your Supabase database:

```sql
-- Create comments table
CREATE TABLE IF NOT EXISTS comments (
  id SERIAL PRIMARY KEY,
  feedback_id UUID REFERENCES feedback(id) ON DELETE CASCADE,
  author VARCHAR(255) NOT NULL DEFAULT 'Anonymous',
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_comments_feedback_id ON comments(feedback_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at);

-- Enable Row Level Security (RLS)
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (for now)
CREATE POLICY "Allow all operations on comments" ON comments
  FOR ALL USING (true);
```

### 2. Environment Variables

Create a `.env` file in the root directory:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Installation

```bash
npm install
npm run dev
```

### 4. Build for Production

```bash
npm run build
```

## 🎯 How to Use

### Adding Feedback
1. Type your feedback message in the text area
2. Optionally add your name
3. Click "Post" to submit

### Viewing and Commenting
1. **Short messages** are displayed in full
2. **Long messages** show a preview with "Read more" button
3. Click "Read more" to open the expanded card view
4. In the expanded view, you can:
   - Read the full message
   - Add comments with optional author name
   - View all existing comments
   - Close the view with the × button

### Searching and Filtering
- Use the search bar to find specific feedback
- Use the dropdown to sort by "Newest" or "Most Upvoted"

### Upvoting
- Click the upvote button on any feedback
- You can only vote once per feedback
- You cannot vote on your own posts

## 🔧 Customization

### Theme Colors
The yellow theme colors can be customized in `src/index.css`:
- Primary yellow: `#f59e0b`
- Light yellow: `#fbbf24`
- Bright yellow: `#fde047`

### Animation Speed
Adjust animation durations in the CSS:
- Card hover: `0.3s ease`
- Button hover: `0.2s ease`
- Background float: `18s ease-in-out`

## 🚀 Deployment

### Netlify Deployment
1. Connect your GitHub repository to Netlify
2. Set environment variables in Netlify dashboard
3. Deploy automatically on push to main branch

### Environment Variables for Netlify
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## 📱 Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is open source and available under the MIT License.

---

**Built with ❤️ and 🥭 for Mango Nexus**