# Recipe Parser

A web application that extracts recipes from any website, displays them in a clean format, and allows you to save them to your personal recipe book.

## Features

- 🔐 **User Authentication** - Secure sign up and login with Supabase
- 🌐 **Smart Recipe Extraction** - Parse recipes from any website using Claude AI
- 📚 **Personal Recipe Book** - Save and organize your favorite recipes
- 🎨 **Clean Interface** - Beautiful, distraction-free recipe display
- 🔒 **Secure Storage** - All recipes stored securely in Supabase with Row Level Security

## Tech Stack

- **Frontend**: React + Vite + Tailwind CSS
- **Backend**: Supabase (Authentication + PostgreSQL Database)
- **AI**: Claude API for intelligent recipe extraction
- **Icons**: Lucide React

## Prerequisites

Before you begin, make sure you have:

- Node.js 18+ installed
- A Supabase account (free tier works great)
- An Anthropic API key (Claude API access is built into the Claude.ai interface)

## Setup Instructions

### 1. Clone/Download the Project

Download all the files to a new directory on your computer.

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Supabase

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for your database to be provisioned (takes ~2 minutes)
3. Go to the SQL Editor in your Supabase dashboard
4. Copy the contents of `supabase-schema.sql` and run it in the SQL Editor
5. This will create:
   - The `recipes` table
   - Row Level Security policies (users can only see their own recipes)
   - Automatic timestamp updates

### 4. Get Your Supabase Credentials

1. In your Supabase project, go to Settings > API
2. Copy your:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **Anon/Public Key** (starts with `eyJ...`)

### 5. Configure Environment Variables

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and add your Supabase credentials:
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your_anon_key_here
   ```

### 6. Enable Email Authentication in Supabase

1. Go to Authentication > Providers in your Supabase dashboard
2. Make sure Email provider is enabled
3. Configure email templates if desired (optional)

### 7. Run the Development Server

```bash
npm run dev
```

Your app should now be running at `http://localhost:5173`

## Deployment

### Deploy to Vercel (Recommended)

1. Push your code to a GitHub repository

2. Go to [vercel.com](https://vercel.com) and sign in

3. Click "New Project" and import your GitHub repository

4. Configure environment variables:
   - Add `VITE_SUPABASE_URL`
   - Add `VITE_SUPABASE_ANON_KEY`

5. Click "Deploy"

Your app will be live in ~2 minutes!

### Deploy to Netlify

1. Push your code to a GitHub repository

2. Go to [netlify.com](https://netlify.com) and sign in

3. Click "Add new site" > "Import an existing project"

4. Connect to your GitHub repository

5. Configure build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`

6. Add environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

7. Click "Deploy"

### Deploy to Other Platforms

The app is a standard Vite React app, so it can be deployed to:
- Railway
- Render
- DigitalOcean App Platform
- AWS Amplify
- Any static hosting provider

Just make sure to:
1. Run `npm run build` to create the production build
2. Serve the `dist` folder
3. Set the environment variables

## Project Structure

```
recipe-parser/
├── src/
│   ├── App.jsx              # Main application component
│   ├── main.jsx             # React entry point
│   └── index.css            # Tailwind CSS imports
├── index.html               # HTML template
├── package.json             # Dependencies
├── vite.config.js           # Vite configuration
├── tailwind.config.js       # Tailwind CSS configuration
├── postcss.config.js        # PostCSS configuration
├── supabase-schema.sql      # Database schema
├── .env.example             # Environment variables template
└── README.md                # This file
```

## How to Use

1. **Sign Up/Login**: Create an account or log in
2. **Parse a Recipe**: 
   - Paste any recipe URL
   - Click "Parse Recipe"
   - Wait for Claude to extract the recipe
3. **Save to Book**: Click "Save to Book" to add the recipe to your collection
4. **View Recipes**: Switch to "Recipe Book" to see all saved recipes
5. **Manage Recipes**: View, delete, or visit the original source

## Database Schema

The app uses a single `recipes` table with the following structure:

```sql
recipes (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  title TEXT,
  servings TEXT,
  prep_time TEXT,
  cook_time TEXT,
  ingredients JSONB,
  instructions JSONB,
  source_url TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

Row Level Security ensures users can only access their own recipes.

## Troubleshooting

### "Failed to parse recipe"
- Make sure the URL is valid and publicly accessible
- Some websites may block automated parsing
- Try a different recipe URL

### "Failed to save recipe"
- Check that your Supabase credentials are correct
- Verify the SQL schema was run successfully
- Check the browser console for detailed errors

### Authentication Issues
- Make sure email provider is enabled in Supabase
- Check that your environment variables are set correctly
- Clear browser cache and try again

## Contributing

Feel free to fork this project and make it your own! Some ideas for enhancements:

- Add recipe categories/tags
- Implement search functionality
- Add recipe sharing
- Export recipes to PDF
- Add meal planning features
- Import from multiple URLs at once

## License

MIT License - feel free to use this project however you'd like!

## Support

If you run into any issues, please check:
1. The Supabase dashboard for errors
2. Browser console for client-side errors
3. That all environment variables are set correctly

## Acknowledgments

- Built with [React](https://react.dev/)
- Styled with [Tailwind CSS](https://tailwindcss.com/)
- Powered by [Supabase](https://supabase.com/)
- AI extraction using [Claude by Anthropic](https://anthropic.com/)
