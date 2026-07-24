import { PlusJakartaSans_400Regular, PlusJakartaSans_500Medium, PlusJakartaSans_700Bold, useFonts } from '@expo-google-fonts/plus-jakarta-sans';
import { Stack } from 'expo-router';
import { View } from 'react-native';
import { ThemeProvider, useTheme } from '../contexts/ThemeContext';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};



function RootLayoutNav() {
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_700Bold,
  });
  const Colors = useTheme();

  if (!fontsLoaded) {
    return null;
  }
 

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
    // Wrapping the Stack in a themed View closes the gap that flashes white
    // during slide transitions — without this, the space "behind" the
    // navigator (revealed for a frame while a screen slides across it)
    // falls back to the native default background instead of your theme.
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Colors.background },
        }}
      >
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
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="modals/recipe"
          options={{
            presentation: 'modal',
            headerShown: false,
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
          name="modals/edit-variant"
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
    </View>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <RootLayoutNav />
    </ThemeProvider>
  );
}