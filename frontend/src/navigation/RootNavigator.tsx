import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Button } from 'react-native-paper';
import { useAuthStore } from '../store/authStore';
import { LoginScreen, RegisterScreen, ForgotPasswordScreen } from '../screens/AuthScreens';
import { EmployeeDashboard, TimeEntryForm, TimeEntryList } from '../screens/EmployeeScreens';
import { AdminApprovals, AdminDashboard, CompanySettings, ComplianceAlerts, PositionsAdmin, Reports, UsersAdmin, WorkRules } from '../screens/AdminScreens';
const Stack = createNativeStackNavigator();
function HeaderLogout() { const logout=useAuthStore(s=>s.logout); return <Button onPress={logout}>Logg ut</Button>; }
export function RootNavigator() { const user=useAuthStore(s=>s.user); if(!user) return <Stack.Navigator><Stack.Screen name="Login" component={LoginScreen} options={{title:'TimeTrack'}}/><Stack.Screen name="Registrer" component={RegisterScreen}/><Stack.Screen name="GlemtPassord" component={ForgotPasswordScreen} options={{title:'Glemt passord'}}/></Stack.Navigator>;
  const admin=user.role==='ADMIN'; return <Stack.Navigator screenOptions={{headerRight:()=> <HeaderLogout />}}>
    {admin ? <><Stack.Screen name="Admin" component={AdminDashboard}/><Stack.Screen name="Ansatte" component={UsersAdmin}/><Stack.Screen name="Stillinger" component={PositionsAdmin}/><Stack.Screen name="Bedrift" component={CompanySettings}/><Stack.Screen name="Arbeidsregler" component={WorkRules}/><Stack.Screen name="Godkjenning" component={AdminApprovals}/><Stack.Screen name="Rapporter" component={Reports}/><Stack.Screen name="Varsler" component={ComplianceAlerts}/><Stack.Screen name="Timeliste" component={TimeEntryList}/><Stack.Screen name="NyTime" component={TimeEntryForm}/></> : <><Stack.Screen name="Oversikt" component={EmployeeDashboard}/><Stack.Screen name="Timeliste" component={TimeEntryList}/><Stack.Screen name="NyTime" component={TimeEntryForm}/><Stack.Screen name="Rapporter" component={Reports}/></>}
  </Stack.Navigator>; }
