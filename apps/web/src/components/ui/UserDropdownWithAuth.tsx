import React from "react";
import { AuthProvider } from "@/components/auth/AuthProvider";
import UserDropdown from "./user-dropdown";

const UserDropdownWithAuth: React.FC = () => {
  return (
    <AuthProvider>
      <UserDropdown />
    </AuthProvider>
  );
};

export default UserDropdownWithAuth;


