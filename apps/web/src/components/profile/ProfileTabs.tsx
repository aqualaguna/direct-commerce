import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ProfileTab from './ProfileTab';
import PreferencesTab from './PreferencesTab';
import PrivacyTab from './PrivacyTab';

const ProfileTabs: React.FC = () => {
  return (
    <Tabs defaultValue="profile" className="w-full">
      <TabsList className="grid w-full grid-cols-3 mb-6">
        <TabsTrigger value="profile">Profile</TabsTrigger>
        <TabsTrigger value="preferences">Preferences</TabsTrigger>
        <TabsTrigger value="privacy">Privacy</TabsTrigger>
      </TabsList>
      <TabsContent value="profile">
        <ProfileTab />
      </TabsContent>
      <TabsContent value="preferences">
        <PreferencesTab />
      </TabsContent>
      <TabsContent value="privacy">
        <PrivacyTab />
      </TabsContent>
    </Tabs>
  );
};

export default ProfileTabs;

