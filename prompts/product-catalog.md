# Product Catalog Page Design Prompt

## High-Level Goal
Design a product listing page that enables efficient product discovery with advanced filtering and sorting capabilities.

## Detailed Instructions
1. Create a filter sidebar with category, price range, and rating filters
2. Design product cards showing image, title, price, rating, and quick add-to-cart
3. Implement a search bar with autocomplete suggestions
4. Add sorting options (price, popularity, rating, newest)
5. Create pagination or infinite scroll navigation
6. Include breadcrumb navigation for category hierarchy
7. Design mobile-optimized filter drawer and product grid

## Product Card Specifications
- **Grid Layout:** 4 columns on desktop, 3 on tablet, 2 on mobile
- **Card Elements:** Product image, title, price, rating stars, "Add to Cart" button
- **Hover States:** Subtle elevation, quick action buttons
- **Loading States:** Skeleton screens for product images
- **Out of Stock:** Clear visual indication with "Notify When Available" option

## Visual Style
- **Product Images:** Consistent aspect ratio (4:3), high-quality medical equipment photos
- **Price Display:** Prominent, using primary maroon color (#8B2E3C)
- **Rating Stars:** Gold/yellow color for positive ratings
- **Add to Cart Button:** Primary maroon background with white text
- **Filter Panel:** Light gray background with clear visual hierarchy

## Technical Requirements
- Implement responsive grid system
- Add smooth transitions for filter changes
- Include keyboard navigation support
- Optimize for screen readers with proper ARIA labels
- Ensure touch targets are minimum 44px on mobile
