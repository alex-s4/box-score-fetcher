# Design Guidelines: Sports Box Score Link Generator

## Design Approach
**System Selected:** Material Design-inspired utility application
**Rationale:** This is a function-first tool prioritizing speed, clarity, and ease of use. Users need quick access to search functionality and clear presentation of results.

## Core Design Elements

### Typography
- **Primary Font:** Inter or Roboto (Google Fonts)
- **Headings:** 
  - H1: text-3xl font-bold (App title)
  - H2: text-xl font-semibold (Section headers)
  - H3: text-lg font-medium (Result cards, league names)
- **Body:** text-base, text-sm for metadata
- **Links:** text-sm font-medium with underline on hover

### Layout System
**Spacing Primitives:** Tailwind units of 2, 4, 6, 8, and 12
- Form gaps: gap-4
- Section padding: p-6 to p-8
- Card spacing: space-y-4
- Button padding: px-6 py-3

**Container Strategy:**
- Max width: max-w-4xl mx-auto (centered application)
- Responsive padding: px-4 md:px-6

### Component Library

**Primary Components:**

1. **Search Form Section**
   - Prominent centered form card with shadow-lg
   - Three input fields stacked vertically (sm:grid sm:grid-cols-3 for desktop)
   - Input fields: Player name (autocomplete), Team name (dropdown/autocomplete), Game date (date picker)
   - Large, prominent "Generate Links" button
   - Clear visual hierarchy with labels above inputs

2. **Results Display**
   - Grouped by source category: "Official League Sites" and "Third-Party Providers"
   - Card-based layout (divide-y for list items within cards)
   - Each result shows: League/site logo (small), game description, direct link button
   - Copy-to-clipboard functionality for each URL
   - Visual feedback for successful copy action

3. **Navigation**
   - Simple top bar with app name/logo
   - Optional: Recent searches dropdown, Settings icon

4. **Empty/Loading States**
   - Centered empty state with sports-themed icon when no results
   - Skeleton loaders during API calls
   - Error states with clear messaging and retry options

**Form Elements:**
- Rounded input fields (rounded-lg) with focus:ring states
- Dropdown menus with search capability for teams
- Date picker with calendar interface
- All inputs with clear labels and placeholder text

**Buttons:**
- Primary: Solid fill, rounded-lg, prominent size
- Secondary: Outline style for links
- Copy button: Icon button with minimal styling

**Cards:**
- White/surface background with shadow-md
- Rounded corners (rounded-xl)
- Hover state: subtle shadow increase (hover:shadow-lg)
- Padding: p-6

### Page Structure

**Single-Page Application Layout:**
1. **Header** (h-16): App title, optional search history
2. **Hero/Search Section** (py-12): Centered form card with brief tagline above
3. **Results Section** (py-8): Two-column grid on desktop (official sites | third-party), stacked on mobile
4. **Footer** (py-6): Minimal - supported leagues, API credits

### Images
**No large hero image required** - this is a utility-focused tool
- **Small icons/logos:** Team logos (24x24), league badges (32x32), provider icons (20x20)
- Use placeholder sports-themed icon in empty state
- All images as inline SVG or small PNG with proper alt text

### Animations
**Minimal and functional only:**
- Smooth transitions on form submission (transition-all duration-200)
- Fade-in for results appearance
- Micro-interaction on copy-to-clipboard (scale briefly)
- NO decorative animations

### Accessibility
- All form inputs with proper labels and ARIA attributes
- Keyboard navigation throughout
- Focus indicators on all interactive elements
- Error messages associated with form fields
- High contrast for all text (minimum WCAG AA)

### Unique Design Considerations
- **Sport-agnostic visual language:** Works for NBA, MLB, NFL, NHL, etc.
- **Link preview:** Show game matchup (Team A vs Team B) before clicking
- **Quick actions:** One-click copy, one-click open in new tab
- **Responsive search:** Mobile-first form design that works at all sizes

This design prioritizes clarity, speed, and ease of use - getting users to their box score links in the fewest steps possible.