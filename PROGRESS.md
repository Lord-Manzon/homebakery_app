# HomeBakery — Build Progress

## Stack
- Framework: React Native (Expo SDK 57)
- Navigation: Expo Router
- Backend: Supabase (Singapore region)
- Language: TypeScript
- Platform target: Android (web browser for dev preview)

## Project Structure
src/
  app/
    (tabs)/         → Main tab screens
    modals/         → Modal screens
  components/
    common/         → Shared UI components
  constants/
    theme.ts        → Color palette (Colors)
  lib/
    supabase.ts     → Supabase client
  services/         → Database query functions
  types/
    index.ts        → TypeScript types

## Database Tables
- ingredients
- products
- product_variants
- recipe_ingredients
- orders
- order_items
- expenses
- inventory_movements
- settings

## Completed Modules

### Dashboard
- [x] Financial summary card (Today / This Week / This Month)
- [x] Real revenue from completed orders
- [x] Real expenses from expenses table
- [x] Net profit (dynamic color: green/red)
- [x] Active orders count
- [x] Low stock ingredients count
- [x] Production required count
- [x] useFocusEffect for auto-refresh

### Orders
- [x] List screen grouped by delivery date with dot separator
- [x] Summary bar (Active, Expected Revenue, Paid, Unpaid)
- [x] Three tabs (Active, Completed, Cancelled)
- [x] Add order modal with product/variant picker
- [x] Order detail screen
- [x] Mark Paid, Complete, Cancel actions
- [x] Custom confirm dialog (replaces Alert — works on web)
- [x] Date/time picker (native on Android, text input on web)
- [x] Inline form validation on Add Order

### Products
- [x] List screen with search and archive
- [x] Add product modal with inline validation
- [x] Edit product modal
- [x] Product detail screen
- [x] Add variant modal
- [x] Add recipe ingredient modal
- [x] useFocusEffect for auto-refresh

### Inventory
- [x] List screen with search and low stock badge
- [x] Add ingredient modal with inline validation
- [x] Edit ingredient modal
- [x] Delete with confirmation
- [x] useFocusEffect for auto-refresh

### Production
- [x] Products to produce summary
- [x] Ingredients required with stock check
- [x] Missing ingredients alert with restock shortcut
- [x] Mark production complete (deducts stock)
- [x] Fixed duplicate header

### Expenses
- [x] List screen with summary (Today / Week / Month)
- [x] Add expense modal with inline validation
- [x] Ingredient purchase type (auto-updates stock)
- [x] Edit and delete expenses

### Reports
- [x] Monthly calendar with multi-dot indicators
  - Green = profit day
  - Red = loss day
  - Blue = deliveries
- [x] Tap a date → updates summary for that day
- [x] Period tabs (Today / This Week / This Month)
- [x] Custom date range input
- [x] Summary card (Revenue, Expenses, Net Profit,
      Orders Delivered, Products Sold, Avg Order Value)
- [x] Best selling products list ranked by quantity

### Settings
- [x] Business name and address
- [x] Currency selector with custom input
- [x] Distance unit (km / miles)
- [x] Theme (Light / Dark / System)
- [x] Fixed updateSettings (insert if no row exists)
- [x] Improved mobile UI (grouped cards, icon badges)

### Navigation
- [x] Sidebar drawer (slides in from right)
- [x] Business name in sidebar header (refreshes on focus)
- [x] Expenses, Reports, Settings via sidebar
- [x] Fixed duplicate headers on Reports, Settings, Expenses

## Bugs Fixed
- [x] Production double header removed
- [x] Dashboard business name not refreshing after settings change
- [x] Settings not saving (insert fallback when no row exists)
- [x] Order status buttons not working on web (Alert → custom Modal)
- [x] Form validation using inline errors instead of Alert.alert
- [x] useFocusEffect dependency fix on orders screen

## Deferred Features (Post-MVP)
- Product images instead of text placeholder
- Cost/pc, selling price, profit on product cards
- Filter orders by nearest delivery location (Google Maps)
- Ingredient detail screen (stock history + recipes using it)
- Quick restock button on inventory cards
- Dark mode
- Export / Import data
- Edit order (currently can only create)
- Edit variant
- Edit recipe ingredient
- Walk-in / Quick Sale mode

## Key Technical Decisions
- useFocusEffect instead of useEffect for list screens
  (ensures data refreshes when returning from modals)
- Platform.OS check for DateTimePicker
  (native picker on Android, text input on web)
- RLS policies use: as permissive for all to anon, authenticated
  using (true) with check (true)
- Supabase client uses platform-aware AsyncStorage
  (undefined on web, AsyncStorage on mobile)
- Colors centralized in src/constants/theme.ts
- All DB queries in src/services/ (never in screen components)
- Modal screens registered in src/app/_layout.tsx
- Alert.alert replaced with custom Modal confirm dialogs
  (Alert does not work on web)
- Inline field errors replace Alert for form validation
  (works on both web and Android, better UX)

## Tab Structure
1. Dashboard
2. Orders
3. Production
4. Products
5. Inventory
(Expenses, Reports, Settings accessible via sidebar drawer)

## Services
- src/services/ingredients.ts
- src/services/products.ts
- src/services/orders.ts
- src/services/expenses.ts
- src/services/production.ts
- src/services/settings.ts
- src/services/dashboard.ts  ← new
- src/services/reports.ts    ← new