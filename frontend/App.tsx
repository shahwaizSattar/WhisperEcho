import React, { useEffect, useState } from 'react';
import { StatusBar, View, Platform, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { navigationRef } from './src/navigation/navigationRef';
import { createStackNavigator } from '@react-navigation/stack';
import Toast from 'react-native-toast-message';

// Import aggressive web styles to force scrolling
if (Platform.OS === 'web') {
  require('./force-scroll.css');
}

// Providers
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { MessageNotificationProvider } from './src/context/MessageNotificationContext';

// Screens
import SplashScreen from './src/screens/SplashScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import LoginScreen from './src/screens/auth/LoginScreen';
import SignupScreen from './src/screens/auth/SignupScreen';
import PreferenceScreen from './src/screens/auth/PreferenceScreen';
import AvatarSelectionScreen from './src/screens/auth/AvatarSelectionScreen';
import ForgotPasswordScreen from './src/screens/auth/ForgotPasswordScreen';
import MainNavigator from './src/navigation/MainNavigator';

// Components
import SignInAnimation from './src/components/SignInAnimation';

// Utils
import { initializeApp } from './src/utils/AppInitializer';
import { forceWebScrolling } from './src/utils/forceWebScrolling';

const Stack = createStackNavigator();

const AppContent = () => {
  const { user, isLoading, isFirstLaunch } = useAuth();
  const { theme } = useTheme();
  const [isInitialized, setIsInitialized] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [showSignInAnimation, setShowSignInAnimation] = useState(false);
  const [previousUser, setPreviousUser] = useState<any>(null);
  const [isFirstRender, setIsFirstRender] = useState(true);

  useEffect(() => {
    const initApp = async () => {
      try {
        await initializeApp();
        setIsInitialized(true);
      } catch (error) {
        console.error('App initialization error:', error);
        setHasError(true);
      }
    };
    
    initApp();
    
    // Force web scrolling to work
    const cleanup = forceWebScrolling();
    
    return cleanup;
  }, []);

  // Detect when user logs in (transitions from null to user)
  useEffect(() => {
    // Skip on first render to avoid showing animation on app load
    if (isFirstRender) {
      setIsFirstRender(false);
      setPreviousUser(user);
      return;
    }
    
    // Only show animation if user just logged in (was null, now has user)
    // and we're not in initial loading state
    if (!isLoading && isInitialized && !previousUser && user) {
      setShowSignInAnimation(true);
    }
    setPreviousUser(user);
  }, [user, isLoading, isInitialized, isFirstRender]);

  if (hasError) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
        <Text style={{ color: '#fff', fontSize: 18 }}>App initialization failed</Text>
        <Text style={{ color: '#fff', fontSize: 14, marginTop: 10 }}>Please restart the app</Text>
      </View>
    );
  }

  if (!isInitialized || isLoading) {
    return <SplashScreen />;
  }

  return (
    <View style={[
      { flex: 1, backgroundColor: theme.colors.background },
      Platform.OS === 'web' && { height: '100vh' as any, overflow: 'hidden' as any }
    ]}>
      <StatusBar
        barStyle={theme.dark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.background}
        translucent={false}
      />
      <NavigationContainer
        ref={navigationRef}
        theme={{
          dark: theme.dark,
          colors: {
            primary: theme.colors.primary,
            background: theme.colors.background,
            card: theme.colors.surface,
            text: theme.colors.text,
            border: theme.colors.border,
            notification: theme.colors.accent,
          },
          fonts: {
            regular: { fontFamily: 'System', fontWeight: '400' },
            medium: { fontFamily: 'System', fontWeight: '500' },
            bold: { fontFamily: 'System', fontWeight: '700' },
            heavy: { fontFamily: 'System', fontWeight: '900' },
          },
        }}
      >
        <MessageNotificationProvider>
          <Stack.Navigator
            screenOptions={{
              headerShown: false,
              cardStyle: { backgroundColor: theme.colors.background },
            }}
          >
            {user ? (
              // User is authenticated
              <Stack.Screen name="Main" component={MainNavigator} />
            ) : (
              // User is not authenticated
              <>
                {isFirstLaunch && (
                  <Stack.Screen name="Onboarding" component={OnboardingScreen} />
                )}
                <Stack.Screen name="Login" component={LoginScreen} />
                <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
                <Stack.Screen name="Signup" component={SignupScreen} />
                <Stack.Screen name="Preference" component={PreferenceScreen} />
                <Stack.Screen name="AvatarSelection" component={AvatarSelectionScreen} />
              </>
            )}
          </Stack.Navigator>
        </MessageNotificationProvider>
      </NavigationContainer>
      <SignInAnimation
        visible={showSignInAnimation}
        onComplete={() => {
          setShowSignInAnimation(false);
        }}
        avatar={user?.avatar}
        username={user?.username}
      />
      <Toast />
    </View>
  );
};

const App = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
