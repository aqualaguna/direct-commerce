import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { api } from '@/utils/api';

interface PrivacyData {
  profileVisibility?: 'public' | 'private' | 'friends';
  showEmail?: boolean;
  showPhone?: boolean;
  showLocation?: boolean;
  dataSharing?: boolean;
  analyticsConsent?: boolean;
  marketingConsent?: boolean;
  thirdPartySharing?: boolean;
  gdprConsent?: boolean;
  dataRetentionConsent?: boolean;
  dataProcessingConsent?: boolean;
  cookieConsent?: 'necessary' | 'analytics' | 'marketing' | 'all';
  consentSource?: string;
  lastConsentUpdate?: string;
  consentVersion?: string;
}

const PrivacyTab: React.FC = () => {
  const [privacy, setPrivacy] = useState<PrivacyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [formData, setFormData] = useState<PrivacyData>({});

  useEffect(() => {
    loadPrivacySettings();
  }, []);

  const loadPrivacySettings = async () => {
    try {
      setLoading(true);
      const response = await api.privacy.getPrivacySettings();
      const privacyData = response.data;
      setPrivacy(privacyData);
      setFormData(privacyData);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to load privacy settings');
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
      const response = await api.privacy.updatePrivacySettings({
        ...formData,
        lastConsentUpdate: new Date().toISOString(),
      });
      setPrivacy(response.data);
      setSuccess('Privacy settings updated successfully!');
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to update privacy settings');
    } finally {
      setSaving(false);
    }
  };

  const handleConsentUpdate = async () => {
    if (!confirm('Are you sure you want to update your consent preferences?')) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const consentData = {
        gdprConsent: formData.gdprConsent,
        marketingConsent: formData.marketingConsent,
        analyticsConsent: formData.analyticsConsent,
        dataSharing: formData.dataSharing,
        consentSource: 'profile-update',
        lastConsentUpdate: new Date().toISOString(),
        consentVersion: formData.consentVersion || '1.0',
      };

      const response = await api.privacy.updateConsent(consentData);
      setPrivacy(response.data);
      setFormData(response.data);
      setSuccess('Consent preferences updated successfully!');
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to update consent preferences');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('Are you sure you want to reset all privacy settings to defaults?')) return;

    try {
      setSaving(true);
      setError(null);
      const response = await api.privacy.reset();
      setPrivacy(response.data);
      setFormData(response.data);
      setSuccess('Privacy settings reset to defaults!');
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to reset privacy settings');
    } finally {
      setSaving(false);
    }
  };

  const handleDataExport = async () => {
    try {
      setSaving(true);
      setError(null);
      const response = await api.privacy.export();
      // Create a download link for the exported data
      const dataStr = JSON.stringify(response.data, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `privacy-data-export-${new Date().toISOString()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setSuccess('Data exported successfully!');
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to export data');
    } finally {
      setSaving(false);
    }
  };

  const handleRequestDeletion = async () => {
    if (!confirm('Are you sure you want to request deletion of your data? This action cannot be undone.')) return;

    try {
      setSaving(true);
      setError(null);
      const response = await api.privacy.requestDeletion({
        reason: 'User requested deletion',
        confirmationRequired: true,
      });
      setSuccess('Deletion request submitted successfully. We will process your request within 30 days.');
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to submit deletion request');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">Loading privacy settings...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit}>
        {/* Profile Visibility */}
        <Card>
          <CardHeader>
            <CardTitle>Profile Visibility</CardTitle>
            <CardDescription>Control who can see your profile information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="profileVisibility">Profile Visibility</Label>
              <select
                id="profileVisibility"
                value={formData.profileVisibility || 'private'}
                onChange={(e) => setFormData({ ...formData, profileVisibility: e.target.value as any })}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              >
                <option value="private">Private</option>
                <option value="public">Public</option>
                <option value="friends">Friends Only</option>
              </select>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="showEmail">Show Email</Label>
                  <p className="text-sm text-muted-foreground">Make your email visible to others</p>
                </div>
                <input
                  type="checkbox"
                  id="showEmail"
                  checked={formData.showEmail || false}
                  onChange={(e) => setFormData({ ...formData, showEmail: e.target.checked })}
                  className="h-4 w-4"
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="showPhone">Show Phone</Label>
                  <p className="text-sm text-muted-foreground">Make your phone number visible to others</p>
                </div>
                <input
                  type="checkbox"
                  id="showPhone"
                  checked={formData.showPhone || false}
                  onChange={(e) => setFormData({ ...formData, showPhone: e.target.checked })}
                  className="h-4 w-4"
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="showLocation">Show Location</Label>
                  <p className="text-sm text-muted-foreground">Make your location visible to others</p>
                </div>
                <input
                  type="checkbox"
                  id="showLocation"
                  checked={formData.showLocation || false}
                  onChange={(e) => setFormData({ ...formData, showLocation: e.target.checked })}
                  className="h-4 w-4"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Consent Management */}
        <Card>
          <CardHeader>
            <CardTitle>Consent Management</CardTitle>
            <CardDescription>Manage your data consent preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="gdprConsent">GDPR Consent</Label>
                <p className="text-sm text-muted-foreground">Consent to GDPR data processing</p>
              </div>
              <input
                type="checkbox"
                id="gdprConsent"
                checked={formData.gdprConsent || false}
                onChange={(e) => setFormData({ ...formData, gdprConsent: e.target.checked })}
                className="h-4 w-4"
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="marketingConsent">Marketing Consent</Label>
                <p className="text-sm text-muted-foreground">Receive marketing communications</p>
              </div>
              <input
                type="checkbox"
                id="marketingConsent"
                checked={formData.marketingConsent || false}
                onChange={(e) => setFormData({ ...formData, marketingConsent: e.target.checked })}
                className="h-4 w-4"
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="analyticsConsent">Analytics Consent</Label>
                <p className="text-sm text-muted-foreground">Allow analytics tracking</p>
              </div>
              <input
                type="checkbox"
                id="analyticsConsent"
                checked={formData.analyticsConsent || false}
                onChange={(e) => setFormData({ ...formData, analyticsConsent: e.target.checked })}
                className="h-4 w-4"
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="dataSharing">Data Sharing</Label>
                <p className="text-sm text-muted-foreground">Allow data sharing with partners</p>
              </div>
              <input
                type="checkbox"
                id="dataSharing"
                checked={formData.dataSharing || false}
                onChange={(e) => setFormData({ ...formData, dataSharing: e.target.checked })}
                className="h-4 w-4"
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="thirdPartySharing">Third Party Sharing</Label>
                <p className="text-sm text-muted-foreground">Allow sharing with third parties</p>
              </div>
              <input
                type="checkbox"
                id="thirdPartySharing"
                checked={formData.thirdPartySharing || false}
                onChange={(e) => setFormData({ ...formData, thirdPartySharing: e.target.checked })}
                className="h-4 w-4"
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="dataProcessingConsent">Data Processing Consent</Label>
                <p className="text-sm text-muted-foreground">Consent to data processing</p>
              </div>
              <input
                type="checkbox"
                id="dataProcessingConsent"
                checked={formData.dataProcessingConsent || false}
                onChange={(e) => setFormData({ ...formData, dataProcessingConsent: e.target.checked })}
                className="h-4 w-4"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cookieConsent">Cookie Consent</Label>
              <select
                id="cookieConsent"
                value={formData.cookieConsent || 'necessary'}
                onChange={(e) => setFormData({ ...formData, cookieConsent: e.target.value as any })}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              >
                <option value="necessary">Necessary Only</option>
                <option value="analytics">Analytics</option>
                <option value="marketing">Marketing</option>
                <option value="all">All Cookies</option>
              </select>
            </div>
            <div className="pt-4 border-t">
              <Button type="button" variant="outline" onClick={handleConsentUpdate} disabled={saving}>
                Update Consent Preferences
              </Button>
            </div>
          </CardContent>
        </Card>

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

        {/* Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Data Management</CardTitle>
            <CardDescription>Export or delete your data</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-2">
              <Button type="button" variant="outline" onClick={handleDataExport} disabled={saving}>
                Export My Data
              </Button>
              <Button type="button" variant="destructive" onClick={handleRequestDeletion} disabled={saving}>
                Request Data Deletion
              </Button>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button type="button" variant="outline" onClick={handleReset} disabled={saving}>
              Reset to Defaults
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Save Privacy Settings'}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
};

export default PrivacyTab;

