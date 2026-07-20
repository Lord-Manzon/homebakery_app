import { Stack } from 'expo-router';
import { ThemeProvider } from '../contexts/ThemeContext';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

export default function RootLayout() {
  return (
    <ThemeProvider>
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
          presentation: 'modal',
          headerShown: true,
          title: 'Add Product',
          headerTintColor: '#E07B39',
        }}
      />
      <Stack.Screen
        name="modals/edit-product"
        options={{
          presentation: 'modal',
          headerShown: true,
          title: 'Edit Product',
          headerTintColor: '#E07B39',
        }}
      />
      <Stack.Screen
        name="modals/product-detail"
        options={{
          presentation: 'modal',
          headerShown: true,
          title: 'Product Details',
          headerTintColor: '#E07B39',
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
          presentation: 'modal',
          headerShown: true,
          title: 'New Order',
          headerTintColor: '#E07B39',
        }}
      />
      <Stack.Screen
        name="modals/order-detail"
        options={{
          presentation: 'modal',
          headerShown: true,
          title: 'Order Details',
          headerTintColor: '#E07B39',
        }}
      />
      <Stack.Screen
        name="modals/edit-order"
        options={{
          presentation: 'modal',
          headerShown: true,
          title: 'Edit Order',
          headerTintColor: '#E07B39',
        }}
      />
      <Stack.Screen
        name="modals/add-expense"
        options={{
          presentation: 'modal',
          headerShown: true,
          title: 'Add Expense',
          headerTintColor: '#E07B39',
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
    </ThemeProvider>
  );
}