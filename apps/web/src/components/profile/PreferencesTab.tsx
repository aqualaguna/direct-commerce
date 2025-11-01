import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { api } from '@/utils/api';

interface PreferencesData {
  // Communication
  emailMarketing?: boolean;
  smsNotifications?: boolean;
  orderUpdates?: boolean;
  promotionalEmails?: boolean;
  
  // Notifications
  orderStatusNotifications?: boolean;
  promotionalNotifications?: boolean;
  securityNotifications?: boolean;
  notificationFrequency?: 'immediate' | 'daily' | 'weekly' | 'disabled';
  
  // Security
  twoFactorEnabled?: boolean;
  sessionTimeout?: number;
  deviceTracking?: boolean;
  loginNotifications?: boolean;
  
  // Localization
  language?: string;
  currency?: string;
  timezone?: string;
  theme?: 'light' | 'dark' | 'auto';
}

const PreferencesTab: React.FC = () => {
  const [preferences, setPreferences] = useState<PreferencesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [formData, setFormData] = useState<PreferencesData>({});

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      setLoading(true);
      const response = await api.preferences.getPreferences();
      const prefsData = response.data;
      setPreferences(prefsData);
      setFormData(prefsData);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to load preferences');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await api.preferences.updatePreferences(formData);
      setPreferences(response.data);
      setSuccess('Preferences updated successfully!');
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to update preferences');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('Are you sure you want to reset all preferences to defaults?')) return;

    try {
      setSaving(true);
      setError(null);
      const response = await api.preferences.reset();
      setPreferences(response.data);
      setFormData(response.data);
      setSuccess('Preferences reset to defaults!');
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to reset preferences');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">Loading preferences...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit}>
        <Tabs defaultValue="communication" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="communication">Communication</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="localization">Localization</TabsTrigger>
          </TabsList>

          {/* Communication Tab */}
          <TabsContent value="communication">
            <Card>
              <CardHeader>
                <CardTitle>Communication Preferences</CardTitle>
                <CardDescription>Manage how we communicate with you</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="emailMarketing">Email Marketing</Label>
                    <p className="text-sm text-muted-foreground">Receive marketing emails</p>
                  </div>
                  <input
                    type="checkbox"
                    id="emailMarketing"
                    checked={formData.emailMarketing || false}
                    onChange={(e) => setFormData({ ...formData, emailMarketing: e.target.checked })}
                    className="h-4 w-4"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="smsNotifications">SMS Notifications</Label>
                    <p className="text-sm text-muted-foreground">Receive SMS notifications</p>
                  </div>
                  <input
                    type="checkbox"
                    id="smsNotifications"
                    checked={formData.smsNotifications || false}
                    onChange={(e) => setFormData({ ...formData, smsNotifications: e.target.checked })}
                    className="h-4 w-4"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="orderUpdates">Order Updates</Label>
                    <p className="text-sm text-muted-foreground">Receive order update emails</p>
                  </div>
                  <input
                    type="checkbox"
                    id="orderUpdates"
                    checked={formData.orderUpdates !== false}
                    onChange={(e) => setFormData({ ...formData, orderUpdates: e.target.checked })}
                    className="h-4 w-4"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="promotionalEmails">Promotional Emails</Label>
                    <p className="text-sm text-muted-foreground">Receive promotional emails</p>
                  </div>
                  <input
                    type="checkbox"
                    id="promotionalEmails"
                    checked={formData.promotionalEmails || false}
                    onChange={(e) => setFormData({ ...formData, promotionalEmails: e.target.checked })}
                    className="h-4 w-4"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>Configure your notification settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="orderStatusNotifications">Order Status Notifications</Label>
                    <p className="text-sm text-muted-foreground">Notify about order status changes</p>
                  </div>
                  <input
                    type="checkbox"
                    id="orderStatusNotifications"
                    checked={formData.orderStatusNotifications !== false}
                    onChange={(e) => setFormData({ ...formData, orderStatusNotifications: e.target.checked })}
                    className="h-4 w-4"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="promotionalNotifications">Promotional Notifications</Label>
                    <p className="text-sm text-muted-foreground">Receive promotional notifications</p>
                  </div>
                  <input
                    type="checkbox"
                    id="promotionalNotifications"
                    checked={formData.promotionalNotifications || false}
                    onChange={(e) => setFormData({ ...formData, promotionalNotifications: e.target.checked })}
                    className="h-4 w-4"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="securityNotifications">Security Notifications</Label>
                    <p className="text-sm text-muted-foreground">Notify about security events</p>
                  </div>
                  <input
                    type="checkbox"
                    id="securityNotifications"
                    checked={formData.securityNotifications !== false}
                    onChange={(e) => setFormData({ ...formData, securityNotifications: e.target.checked })}
                    className="h-4 w-4"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notificationFrequency">Notification Frequency</Label>
                  <select
                    id="notificationFrequency"
                    value={formData.notificationFrequency || 'immediate'}
                    onChange={(e) => setFormData({ ...formData, notificationFrequency: e.target.value as any })}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                  >
                    <option value="immediate">Immediate</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="disabled">Disabled</option>
                  </select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle>Security Preferences</CardTitle>
                <CardDescription>Manage your security settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="twoFactorEnabled">Two-Factor Authentication</Label>
                    <p className="text-sm text-muted-foreground">Enable 2FA for extra security</p>
                  </div>
                  <input
                    type="checkbox"
                    id="twoFactorEnabled"
                    checked={formData.twoFactorEnabled || false}
                    onChange={(e) => setFormData({ ...formData, twoFactorEnabled: e.target.checked })}
                    className="h-4 w-4"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="deviceTracking">Device Tracking</Label>
                    <p className="text-sm text-muted-foreground">Track login devices</p>
                  </div>
                  <input
                    type="checkbox"
                    id="deviceTracking"
                    checked={formData.deviceTracking !== false}
                    onChange={(e) => setFormData({ ...formData, deviceTracking: e.target.checked })}
                    className="h-4 w-4"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="loginNotifications">Login Notifications</Label>
                    <p className="text-sm text-muted-foreground">Notify on new login</p>
                  </div>
                  <input
                    type="checkbox"
                    id="loginNotifications"
                    checked={formData.loginNotifications !== false}
                    onChange={(e) => setFormData({ ...formData, loginNotifications: e.target.checked })}
                    className="h-4 w-4"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sessionTimeout">Session Timeout (seconds)</Label>
                  <Input
                    id="sessionTimeout"
                    type="number"
                    min="300"
                    max="86400"
                    value={formData.sessionTimeout || 3600}
                    onChange={(e) => setFormData({ ...formData, sessionTimeout: parseInt(e.target.value) })}
                  />
                  <p className="text-xs text-muted-foreground">Between 300 and 86400 seconds</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Localization Tab */}
          <TabsContent value="localization">
            <Card>
              <CardHeader>
                <CardTitle>Localization Preferences</CardTitle>
                <CardDescription>Configure language, currency, and display settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="language">Language</Label>
                  <Input
                    id="language"
                    value={formData.language || 'en'}
                    onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                    placeholder="en"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Input
                    id="currency"
                    value={formData.currency || 'USD'}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value.toUpperCase() })}
                    placeholder="USD"
                    maxLength={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Input
                    id="timezone"
                    value={formData.timezone || ''}
                    onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                    placeholder="America/New_York"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="theme">Theme</Label>
                  <select
                    id="theme"
                    value={formData.theme || 'auto'}
                    onChange={(e) => setFormData({ ...formData, theme: e.target.value as any })}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                  >
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                    <option value="auto">Auto</option>
                  </select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {error && (
          <Card>
            <CardContent className="pt-6">
              <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                {error}
              </div>
            </CardContent>
          </Card>
        )}
        {success && (
          <Card>
            <CardContent className="pt-6">
              <div className="p-3 text-sm text-green-600 bg-green-50 border border-green-200 rounded-md">
                {success}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardFooter className="flex justify-between">
            <Button type="button" variant="outline" onClick={handleReset} disabled={saving}>
              Reset to Defaults
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Save Preferences'}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
};

export default PreferencesTab;

