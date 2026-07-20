import { Stack } from 'expo-router';
import { ThemeProvider, useTheme } from '../contexts/ThemeContext';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

function RootLayoutNav() {
  const Colors = useTheme();

  // Shared look for every screen that shows a native header — background,
  // back-arrow/tint color, and title text color all need to react to theme,
  // not just the tint color like before.
  const headerOptions = {
    headerShown: true,
    headerStyle: { backgroundColor: Colors.card },
    headerTintColor: Colors.primary,
    headerTitleStyle: { color: Colors.textPrimary },
    headerShadowVisible: false,
  };

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="modals/add-ingredient"
        options={{
          presentation: 'transparentModal',
          headerShown: false,
          animation: 'fade',
        }}
      />
      <Stack.Screen
        name="modals/edit-ingredient"
        options={{
          presentation: 'transparentModal',
          headerShown: false,
          animation: 'fade',
        }}
      />
      <Stack.Screen
        name="modals/add-product"
        options={{
          ...headerOptions,
          presentation: 'modal',
          title: 'Add Product',
        }}
      />
      <Stack.Screen
        name="modals/edit-product"
        options={{
          ...headerOptions,
          presentation: 'modal',
          title: 'Edit Product',
        }}
      />
      <Stack.Screen
        name="modals/product-detail"
        options={{
          ...headerOptions,
          presentation: 'modal',
          title: 'Product Details',
        }}
      />
      <Stack.Screen
        name="modals/add-variant"
        options={{
          presentation: 'transparentModal',
          headerShown: false,
          animation: 'fade',
        }}
      />
      <Stack.Screen
        name="modals/add-recipe-ingredient"
        options={{
          presentation: 'transparentModal',
          headerShown: false,
          animation: 'fade',
        }}
      />
      <Stack.Screen
        name="modals/add-order"
        options={{
          ...headerOptions,
          presentation: 'modal',
          title: 'New Order',
        }}
      />
      <Stack.Screen
        name="modals/order-detail"
        options={{
          ...headerOptions,
          presentation: 'modal',
          title: 'Order Details',
        }}
      />
      <Stack.Screen
        name="modals/edit-order"
        options={{
          ...headerOptions,
          presentation: 'modal',
          title: 'Edit Order',
        }}
      />
      <Stack.Screen
        name="modals/add-expense"
        options={{
          ...headerOptions,
          presentation: 'modal',
          title: 'Add Expense',
        }}
      />
      <Stack.Screen
        name="modals/expenses"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="modals/edit-expense"
        options={{
          presentation: 'transparentModal',
          headerShown: false,
          animation: 'fade',
        }}
      />
      <Stack.Screen
        name="modals/reports"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="modals/settings"
        options={{ headerShown: false }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <RootLayoutNav />
    </ThemeProvider>
  );
}