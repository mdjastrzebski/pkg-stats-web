# NPM Package Stats

A simple web application to track download statistics for your favorite NPM packages. View weekly, monthly, and yearly download trends with percentage changes.

## Features

- 📊 **Download Statistics**: Track downloads for week, month, and year periods
- 📈 **Trend Analysis**: See percentage changes compared to previous periods
- 💾 **Smart Caching**: Data is cached locally with 6-hour expiration
- 🔄 **Auto-retry**: Automatically retries failed fetches on page reload
- 🎨 **Modern UI**: Clean, dark-themed interface built with Tailwind CSS
- 📱 **Responsive**: Works on desktop and mobile devices

## Tech Stack

- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling
- **NPM API** - Data source

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm, yarn, or bun

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd npm-stats
```

2. Install dependencies:
```bash
npm install
# or
yarn install
# or
bun install
```

3. Start the development server:
```bash
npm run dev
# or
yarn dev
# or
bun dev
```

4. Open your browser and navigate to `http://localhost:5173`

### Building for Production

```bash
npm run build
# or
yarn build
# or
bun build
```

The built files will be in the `dist` directory.

## Usage

1. Enter an NPM package name in the input field
2. Press Enter or click Add to track the package
3. View download statistics:
   - **Week**: Current week vs previous week
   - **Month**: Current month vs previous month
   - **Year**: Current year vs previous year
4. Use the refresh button (top right) to force refresh all data
5. Click the X button on any package card to remove it

## How It Works

- Data is fetched from the [NPM API](https://api.npmjs.org/downloads/)
- Statistics are cached in browser localStorage for 6 hours
- Failed fetches are marked as null and automatically retried on page reload
- Missing entries are automatically refetched even if cache is still valid
- Cache timestamps are preserved when only filling missing data

## Project Structure

```
src/
├── components/     # React components
├── hooks/         # Custom React hooks
├── services/      # API service layer
├── types/         # TypeScript type definitions
└── utils/         # Utility functions
```

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## License

[Add your license here]
